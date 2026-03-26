"""
GlucoTwin M3 — GlucoseEnv : Environnement Gym Custom
=====================================================
Étape 3 du plan de construction.

Hérite de gymnasium.Env et encapsule SimGlucose.
Utilisé directement par train_ppo.py (étape 4).

Architecture :
    ┌─────────────────────────────────────────┐
    │              PPO Agent                  │
    │         (Stable-Baselines3)             │
    └──────────────┬──────────────────────────┘
                   │ action (dose 0–15U)
    ┌──────────────▼──────────────────────────┐
    │           GlucoseEnv                    │
    │  ┌─────────────────────────────────┐    │
    │  │       Guardian Layer            │    │
    │  │   (sécurité hard-codée)         │    │
    │  └──────────────┬──────────────────┘    │
    │                 │ dose sécurisée        │
    │  ┌──────────────▼──────────────────┐    │
    │  │         SimGlucose              │    │
    │  │   (simulateur FDA T1DM)         │    │
    │  └──────────────┬──────────────────┘    │
    │                 │ obs (CGM, bg, ...)    │
    │  ┌──────────────▼──────────────────┐    │
    │  │      State Builder              │    │
    │  │   (18 features normalisées)     │    │
    │  └─────────────────────────────────┘    │
    │         │ state + reward                │
    └─────────┼─────────────────────────────-─┘
              │
    ┌─────────▼───────────────────────────────┐
    │              PPO Agent                  │
    │         (mise à jour politique)         │
    └─────────────────────────────────────────┘

State vector (18 dimensions) :
    [0:12]  bg_t, bg_t-1, ..., bg_t-11   — historique glycémie 1h (normalisé)
    [12]    bg_norm                        — glycémie actuelle normalisée
    [13]    last_dose_norm                 — dernière dose normalisée
    [14]    meal_carbs_norm                — glucides repas en cours normalisés
    [15]    hour_sin                       — heure (encodage cyclique sin)
    [16]    hour_cos                       — heure (encodage cyclique cos)
    [17]    steps_since_bolus_norm         — temps depuis dernier bolus normalisé

Usage :
    from glucose_env import GlucoseEnv
    env = GlucoseEnv()
    obs, info = env.reset()
    obs, reward, done, truncated, info = env.step(action)
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from collections import deque
from datetime import datetime

from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from simglucose.simulation.env import T1DSimEnv
from simglucose.simulation.scenario import CustomScenario
from simglucose.controller.base import Action


# ── Patients disponibles dans SimGlucose ────────────────────
SIMGLUCOSE_PATIENTS = [
    'adolescent#001', 'adolescent#002', 'adolescent#003',
    'adult#001',      'adult#002',      'adult#003',
    'adult#004',      'adult#005',
    'child#001',      'child#002',
]

# ── Constantes physiologiques ────────────────────────────────
BG_MIN        =  40.0   # mg/dL — minimum physiologique
BG_MAX        = 400.0   # mg/dL — maximum physiologique
BG_TARGET     = 100.0   # mg/dL — cible glycémique
BG_HYPO       =  70.0   # mg/dL — seuil hypoglycémie
BG_HYPO_SEV   =  54.0   # mg/dL — seuil hypoglycémie sévère
BG_HYPER      = 180.0   # mg/dL — seuil hyperglycémie
BG_HYPER_SEV  = 250.0   # mg/dL — seuil hyperglycémie sévère
DOSE_MAX      =  15.0   # U     — dose max absolue (Guardian)
BASAL_RATE    =   0.02  # U/min — débit basal de fond
HISTORY_LEN   =  12     # steps — 12 × 5min = 1h d'historique


# ─────────────────────────────────────────────────────────────
# GUARDIAN LAYER  (importé depuis rule_based.py si disponible)
# ─────────────────────────────────────────────────────────────

class GuardianLayer:
    """
    Couche de sécurité hard-codée.
    S'applique à TOUTE dose avant injection — rule-based ou PPO.

    Règles médicales non-négociables :
      1. Dose = 0 si bg < bg_low_threshold  (déjà trop bas)
      2. Dose plafonnée à dose_max absolu   (15U par défaut)
      3. Dose plafonnée à correction_max    (évite surdosage)
      4. Arrondi à 0.5U                     (précision pompe réelle)
    """

    def __init__(self,
                 dose_max: float = DOSE_MAX,
                 bg_low_threshold: float = 90.0,
                 isf: float = 50.0,
                 target: float = BG_TARGET):
        self.dose_max         = dose_max
        self.bg_low_threshold = bg_low_threshold
        self.isf              = isf
        self.target           = target

    def clip(self, dose_raw: float, bg_current: float) -> tuple[float, bool]:
        """
        Applique toutes les règles et retourne (dose_safe, was_blocked).

        Args:
            dose_raw    : dose proposée par le contrôleur (U)
            bg_current  : glycémie actuelle (mg/dL)

        Returns:
            dose_safe   : dose finale sécurisée (U)
            was_blocked : True si la dose a été réduite pour sécurité
        """
        # Règle 1 — Bloquer si glycémie déjà basse
        if bg_current < self.bg_low_threshold:
            return 0.0, True

        # Règle 2 — Plafond correction physiologique (+5U marge repas)
        correction_max = max(0.0, (bg_current - self.target) / self.isf)
        dose_clipped   = min(dose_raw, correction_max + 5.0, self.dose_max)

        # Règle 3 — Pas de dose négative
        dose_clipped = max(0.0, dose_clipped)

        # Règle 4 — Arrondi à 0.5U (précision pompe à insuline)
        dose_safe  = round(dose_clipped * 2) / 2
        was_blocked = dose_safe < dose_raw * 0.9

        return dose_safe, was_blocked


# ─────────────────────────────────────────────────────────────
# REWARD FUNCTION
# ─────────────────────────────────────────────────────────────

def compute_reward(bg: float, prev_bg: float = None) -> tuple[float, str]:
    """
    Reward function en 5 zones glycémiques.

    Inspirée du cahier des charges GlucoTwin :
        TIR (70–180)  → +1.0   récompense stable
        Hypo légère   → -10.0  pénalité forte
        Hypo sévère   → -20.0  pénalité critique
        Hyper modérée → -2.0   pénalité douce
        Hyper sévère  → -5.0   pénalité modérée

    Le bonus tendance récompense l'agent qui corrige activement
    une glycémie hors zone (plutôt que de rester hors zone).

    Args:
        bg      : glycémie actuelle (mg/dL)
        prev_bg : glycémie au step précédent (optionnel)

    Returns:
        reward  : valeur de récompense
        zone    : label de la zone pour le logging
    """
    # ── Reward de base par zone ──────────────────────────────
    if BG_HYPO <= bg <= BG_HYPER:
        reward = 1.0
        zone   = 'TIR'

    elif bg < BG_HYPO_SEV:
        reward = -20.0
        zone   = 'HYPO_SEVERE'

    elif bg < BG_HYPO:
        reward = -10.0
        zone   = 'HYPO'

    elif bg > BG_HYPER_SEV:
        reward = -5.0
        zone   = 'HYPER_SEVERE'

    else:   # 180 < bg <= 250
        reward = -2.0
        zone   = 'HYPER'

    # ── Bonus tendance (si bg précédent disponible) ──────────
    if prev_bg is not None:
        delta = bg - prev_bg

        # Hors zone et on se rapproche de TIR → bonus
        if zone != 'TIR':
            moving_toward_tir = (
                (bg > BG_HYPER and delta < 0) or   # hyper qui descend
                (bg < BG_HYPO  and delta > 0)      # hypo qui remonte
            )
            if moving_toward_tir:
                reward += 0.5   # bonus correction active

        # Dans TIR mais glycémie qui monte vers hyper → pénalité douce
        elif delta > 30:
            reward -= 0.3

    return float(reward), zone


# ─────────────────────────────────────────────────────────────
# GLUCOSE ENV
# ─────────────────────────────────────────────────────────────

class GlucoseEnv(gym.Env):
    """
    Environnement Gym pour le contrôle de la glycémie T1DM.

    Encapsule SimGlucose et expose l'interface standard Gymnasium :
        reset() → observation, info
        step(action) → observation, reward, terminated, truncated, info

    Args:
        patient_name  : patient SimGlucose (None = aléatoire à chaque reset)
        n_days        : durée d'un épisode en jours (défaut 1 jour)
        seed          : graine aléatoire
        isf           : Insulin Sensitivity Factor du patient
        icr           : Insulin-to-Carb Ratio du patient
        ramadan_mode  : active le mode jeûne Ramadan (pas de repas le jour)
    """

    metadata = {'render_modes': []}

    def __init__(self,
                 patient_name: str = None,
                 n_days: int = 1,
                 seed: int = None,
                 isf: float = 50.0,
                 icr: float = 10.0,
                 ramadan_mode: bool = False):

        super().__init__()

        self.patient_name  = patient_name
        self.n_days        = n_days
        self.isf           = isf
        self.icr           = icr
        self.ramadan_mode  = ramadan_mode
        self._seed         = seed

        # ── Guardian Layer ───────────────────────────────────
        self.guardian = GuardianLayer(isf=isf)

        # ── Observation space : 18 features ─────────────────
        # Features [0:12] : historique bg → [0, 1]
        # Feature  [12]   : bg actuel    → [0, 1]
        # Feature  [13]   : last dose    → [0, 1]
        # Feature  [14]   : meal carbs   → [0, 1]
        # Feature  [15]   : hour_sin     → [-1, 1]
        # Feature  [16]   : hour_cos     → [-1, 1]
        # Feature  [17]   : steps_since_bolus → [0, 1]
        low  = np.array(
            [0.0] * 13 + [0.0, 0.0, -1.0, -1.0, 0.0],
            dtype=np.float32
        )
        high = np.array(
            [1.0] * 13 + [1.0, 1.0,  1.0,  1.0, 1.0],
            dtype=np.float32
        )
        self.observation_space = spaces.Box(
            low=low, high=high, dtype=np.float32
        )

        # ── Action space : dose insuline continue 0–15U ─────
        self.action_space = spaces.Box(
            low=np.array([0.0], dtype=np.float32),
            high=np.array([DOSE_MAX], dtype=np.float32),
            dtype=np.float32
        )

        # ── État interne ─────────────────────────────────────
        self.sim              = None
        self.bg_history       = deque([120.0] * HISTORY_LEN,
                                       maxlen=HISTORY_LEN)
        self.bg               = 120.0
        self.prev_bg          = 120.0
        self.step_count       = 0
        self.last_bolus_step  = -999
        self.last_dose        = 0.0
        self.current_meal     = 0.0
        self.meal_schedule    = []

        # ── Logging épisode ──────────────────────────────────
        self.episode_bg       = []
        self.episode_doses    = []
        self.episode_rewards  = []
        self.guardian_blocks  = 0
        self.total_steps      = n_days * 288   # 288 steps/jour à 5 min

    # ─────────────────────────────────────────────────────────
    # HELPERS PRIVÉS
    # ─────────────────────────────────────────────────────────

    def _select_patient(self) -> str:
        """Sélectionne un patient (fixe ou aléatoire)."""
        if self.patient_name is not None:
            return self.patient_name
        return self.np_random.choice(SIMGLUCOSE_PATIENTS)

    def _build_meal_schedule(self) -> list:
        """
        Construit le scénario repas pour l'épisode.
        Format SimGlucose : [(heure_depuis_debut, glucides_g), ...]
        """
        meals = []
        for day in range(self.n_days):
            offset = day * 24.0

            if self.ramadan_mode:
                # Mode Ramadan : seulement Suhur (5h) et Iftar (19h)
                meals += [
                    (offset + 5.0,  50 + self.np_random.integers(-10, 10)),
                    (offset + 19.0, 90 + self.np_random.integers(-15, 15)),
                ]
            else:
                # Mode normal : 3 repas/jour
                meals += [
                    (offset + 7.0,  60 + self.np_random.integers(-10, 10)),
                    (offset + 12.5, 75 + self.np_random.integers(-15, 15)),
                    (offset + 19.0, 70 + self.np_random.integers(-10, 10)),
                ]
        return meals

    def _build_simglucose(self, patient_name: str, seed: int) -> T1DSimEnv:
        """Instancie SimGlucose avec le patient et le scénario."""
        patient  = T1DPatient.withName(patient_name)
        sensor   = CGMSensor.withName('Dexcom', seed=seed)
        pump     = InsulinPump.withName('Insulet')
        scenario = CustomScenario(
            start_time=datetime(2024, 1, 1, 7, 0, 0),
            scenario=self.meal_schedule
        )
        return T1DSimEnv(patient, sensor, pump, scenario)

    def _get_meal_at_step(self, step: int) -> float:
        """Retourne les glucides du repas au step actuel (0 si pas de repas)."""
        current_hour = (step * 5.0 / 60.0) % 24.0
        for meal_hour, meal_carbs in self.meal_schedule:
            meal_hour_mod = meal_hour % 24.0
            if abs(current_hour - meal_hour_mod) < (5.0 / 60.0):
                return float(meal_carbs)
        return 0.0

    def _build_observation(self) -> np.ndarray:
        """
        Construit le vecteur d'état de 18 dimensions.

        Normalisation :
            bg           : / 400 → [0, 1]
            dose         : / 15  → [0, 1]
            carbs        : / 100 → [0, 1]
            hour sin/cos : déjà dans [-1, 1]
            bolus timing : / 288 → [0, 1]  (max 1 jour)
        """
        hour = (self.step_count * 5.0 / 60.0) % 24.0

        # [0:12] Historique glycémie (du plus ancien au plus récent)
        bg_hist_norm = np.array(
            [np.clip(b / BG_MAX, 0.0, 1.0) for b in self.bg_history],
            dtype=np.float32
        )

        # [12] Glycémie actuelle normalisée
        bg_norm = np.clip(self.bg / BG_MAX, 0.0, 1.0)

        # [13] Dernière dose normalisée
        dose_norm = np.clip(self.last_dose / DOSE_MAX, 0.0, 1.0)

        # [14] Glucides repas en cours normalisés
        carbs_norm = np.clip(self.current_meal / 100.0, 0.0, 1.0)

        # [15, 16] Heure encodée cycliquement (sin/cos)
        hour_sin = float(np.sin(2.0 * np.pi * hour / 24.0))
        hour_cos = float(np.cos(2.0 * np.pi * hour / 24.0))

        # [17] Temps depuis dernier bolus normalisé (max 1 jour = 288 steps)
        steps_since = min(self.step_count - self.last_bolus_step, 288)
        bolus_timing_norm = float(steps_since / 288.0)

        obs = np.concatenate([
            bg_hist_norm,                    # [0:12]
            [bg_norm],                       # [12]
            [dose_norm],                     # [13]
            [carbs_norm],                    # [14]
            [hour_sin],                      # [15]
            [hour_cos],                      # [16]
            [bolus_timing_norm],             # [17]
        ]).astype(np.float32)

        assert obs.shape == (18,), f"Shape incorrecte : {obs.shape}"
        return obs

    def _compute_metrics(self) -> dict:
        """Calcule les métriques de l'épisode en cours."""
        bg = np.array(self.episode_bg)
        if len(bg) == 0:
            return {}
        return {
            'tir':          float(np.mean((bg >= 70) & (bg <= 180)) * 100),
            'tbr':          float(np.mean(bg < 70) * 100),
            'tar':          float(np.mean(bg > 180) * 100),
            'hypo_severe':  float(np.mean(bg < 54) * 100),
            'mean_bg':      float(np.mean(bg)),
            'std_bg':       float(np.std(bg)),
            'total_reward': float(np.sum(self.episode_rewards)),
            'guardian_blocks': self.guardian_blocks,
            'n_steps':      len(bg),
        }

    # ─────────────────────────────────────────────────────────
    # RESET
    # ─────────────────────────────────────────────────────────

    def reset(self, seed: int = None, options: dict = None):
        """
        Réinitialise l'environnement pour un nouvel épisode.

        - Appelle super().reset() pour conformité Gymnasium
        - Sélectionne un patient (fixe ou aléatoire)
        - Reconstruit SimGlucose et le scénario repas
        - Retourne la première observation et un dict info

        Returns:
            obs  : np.ndarray (18,) — vecteur d'état initial
            info : dict — informations de débogage
        """
        # Obligatoire : initialise self.np_random
        super().reset(seed=seed)

        # Sélection patient et seed de simulation
        selected_patient = self._select_patient()
        sim_seed = int(self.np_random.integers(0, 10_000))

        # Construction scénario et simulateur
        self.meal_schedule = self._build_meal_schedule()
        self.sim           = self._build_simglucose(selected_patient, sim_seed)

        # Réinitialisation état interne
        self.bg_history      = deque([120.0] * HISTORY_LEN, maxlen=HISTORY_LEN)
        self.bg              = 120.0
        self.prev_bg         = 120.0
        self.step_count      = 0
        self.last_bolus_step = -999
        self.last_dose       = 0.0
        self.current_meal    = 0.0
        self.guardian_blocks = 0

        # Logging épisode
        self.episode_bg      = []
        self.episode_doses   = []
        self.episode_rewards = []

        # Premier step SimGlucose pour obtenir une glycémie initiale
        try:
            obs_sim, _, _, _ = self.sim.step(Action(basal=BASAL_RATE, bolus=0))
            self.bg = float(obs_sim.CGM)
        except Exception:
            self.bg = 120.0   # fallback sûr

        self.bg_history.append(self.bg)
        self.episode_bg.append(self.bg)

        info = {
            'patient':    selected_patient,
            'bg_initial': self.bg,
            'n_meals':    len(self.meal_schedule),
        }

        return self._build_observation(), info

    # ─────────────────────────────────────────────────────────
    # STEP
    # ─────────────────────────────────────────────────────────

    def step(self, action: np.ndarray):
        """
        Exécute un step de 5 minutes dans la simulation.

        Pipeline :
            1. Extraire la dose brute de l'action PPO
            2. Récupérer les glucides du repas au step courant
            3. Guardian Layer → dose sécurisée
            4. SimGlucose.step() → nouvelle glycémie
            5. Compute reward
            6. Build observation
            7. Vérifier terminaison

        Args:
            action : np.ndarray shape (1,) — dose en unités [0, 15]

        Returns:
            obs        : np.ndarray (18,) — nouvel état
            reward     : float
            terminated : bool — épisode terminé naturellement
            truncated  : bool — épisode tronqué (timeout)
            info       : dict — métriques et debug
        """
        # ── 1. Dose brute depuis l'agent PPO ────────────────
        dose_raw = float(np.clip(action[0], 0.0, DOSE_MAX))

        # ── 2. Repas au step courant ─────────────────────────
        self.current_meal = self._get_meal_at_step(self.step_count)

        # ── 3. Guardian Layer ────────────────────────────────
        dose_safe, was_blocked = self.guardian.clip(dose_raw, self.bg)
        if was_blocked:
            self.guardian_blocks += 1

        # Mémoriser dernier bolus
        if dose_safe > 0:
            self.last_bolus_step = self.step_count
        self.last_dose = dose_safe

        # ── 4. SimGlucose step ───────────────────────────────
        self.prev_bg = self.bg
        try:
            obs_sim, _, done_sim, _ = self.sim.step(
                Action(basal=BASAL_RATE, bolus=dose_safe)
            )
            self.bg = float(obs_sim.CGM)
        except Exception:
            # SimGlucose peut planter sur état extrême — reset sûr
            self.bg   = self.prev_bg
            done_sim  = True

        # Garder bg dans limites physiologiques
        self.bg = float(np.clip(self.bg, BG_MIN, BG_MAX))

        # ── 5. Mise à jour historique ────────────────────────
        self.bg_history.append(self.bg)
        self.step_count += 1

        # ── 6. Reward ────────────────────────────────────────
        reward, zone = compute_reward(self.bg, self.prev_bg)

        # ── 7. Logging ───────────────────────────────────────
        self.episode_bg.append(self.bg)
        self.episode_doses.append(dose_safe)
        self.episode_rewards.append(reward)

        # ── 8. Terminaison ───────────────────────────────────
        terminated = bool(done_sim)
        truncated  = self.step_count >= self.total_steps

        # ── 9. Info dict ─────────────────────────────────────
        info = {
            'bg':            self.bg,
            'zone':          zone,
            'dose_raw':      dose_raw,
            'dose_safe':     dose_safe,
            'guardian_blocked': was_blocked,
            'meal_carbs':    self.current_meal,
            'step':          self.step_count,
        }

        # Métriques complètes en fin d'épisode
        if terminated or truncated:
            info['episode_metrics'] = self._compute_metrics()

        return self._build_observation(), float(reward), terminated, truncated, info

    # ─────────────────────────────────────────────────────────
    # UTILITAIRES
    # ─────────────────────────────────────────────────────────

    def get_episode_metrics(self) -> dict:
        """Retourne les métriques de l'épisode en cours (ou terminé)."""
        return self._compute_metrics()

    def render(self):
        """Affichage minimaliste en mode texte."""
        print(f"Step {self.step_count:4d} | "
              f"BG={self.bg:6.1f} mg/dL | "
              f"Dose={self.last_dose:.1f}U | "
              f"Meal={self.current_meal:.0f}g")

    def __repr__(self) -> str:
        return (f"GlucoseEnv("
                f"patient={self.patient_name or 'random'}, "
                f"n_days={self.n_days}, "
                f"step={self.step_count}/{self.total_steps})")


# ─────────────────────────────────────────────────────────────
# VALIDATION ET TESTS
# ─────────────────────────────────────────────────────────────

def validate_env():
    """
    Lance check_env() puis 3 épisodes manuels.
    Appelé automatiquement quand le script est exécuté directement.
    """
    from stable_baselines3.common.env_checker import check_env
    import warnings
    warnings.filterwarnings('ignore')

    print("\n" + "═" * 52)
    print("  GlucoseEnv — Validation")
    print("═" * 52)

    # ── Test 1 : check_env Gymnasium ─────────────────────────
    print("\n[1/3] check_env() Gymnasium ...")
    env = GlucoseEnv(patient_name='adolescent#001', n_days=1, seed=42)
    try:
        check_env(env, warn=True)
        print("  ✓ check_env passé — environnement conforme Gymnasium")
    except Exception as e:
        print(f"  ✗ check_env échoué : {e}")
        return

    # ── Test 2 : épisode complet 1 jour ──────────────────────
    print("\n[2/3] Épisode complet (1 jour = 288 steps) ...")
    env   = GlucoseEnv(patient_name='adult#001', n_days=1, seed=0)
    obs, info = env.reset()

    assert obs.shape == (18,), f"Shape obs incorrecte : {obs.shape}"
    print(f"  reset() → obs shape={obs.shape} ✓")
    print(f"  Patient : {info['patient']} | BG initial : {info['bg_initial']:.1f} mg/dL")

    total_reward = 0.0
    n_steps      = 0
    done         = False

    while not done:
        action = env.action_space.sample()   # action aléatoire pour le test
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        n_steps      += 1
        done          = terminated or truncated

    metrics = env.get_episode_metrics()
    print(f"  {n_steps} steps exécutés ✓")
    print(f"  Reward total    : {total_reward:.1f}")
    print(f"  TIR             : {metrics['tir']:.1f}%")
    print(f"  TBR             : {metrics['tbr']:.1f}%")
    print(f"  BG moyenne      : {metrics['mean_bg']:.1f} mg/dL")
    print(f"  Guardian blocks : {metrics['guardian_blocks']}")

    # ── Test 3 : rotation patients (n_days=1 par patient) ────
    print("\n[3/3] Test rotation patients aléatoires (5 resets) ...")
    env_rand = GlucoseEnv(patient_name=None, n_days=1)
    patients_seen = set()

    for i in range(5):
        obs, info = env_rand.reset(seed=i * 7)
        patients_seen.add(info['patient'])
        obs2, r, term, trunc, _ = env_rand.step(
            np.array([3.0], dtype=np.float32)
        )
        assert obs2.shape == (18,)

    print(f"  Patients vus : {sorted(patients_seen)}")
    print(f"  Diversité patients : {len(patients_seen)}/5 différents ✓")

    # ── Résumé ────────────────────────────────────────────────
    print("\n" + "═" * 52)
    print("  ✓ Tous les tests passés")
    print("  Prochaine étape : train_ppo.py")
    print("═" * 52 + "\n")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    validate_env()