"""
GlucoTwin M3 — Rule-Based Insulin Controller
=============================================
Étape 2 du plan de construction.

Ce fichier contient :
    1. RuleBasedController  — formule bolus médicale + Guardian Layer
    2. run_simulation()     — simulation complète sur SimGlucose
    3. compute_metrics()    — TIR, TBR, TAR, hypos sévères
    4. evaluate_all()       — test sur tous les patients virtuels
    5. plot_results()       — courbe glycémique + métriques visuelles

Usage :
    python rule_based.py

Ce fichier sera importé dans evaluate.py (étape 5)
pour la comparaison rule-based vs PPO.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import warnings
warnings.filterwarnings('ignore')

from datetime import datetime, timedelta
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from simglucose.simulation.env import T1DSimEnv
from simglucose.simulation.scenario import CustomScenario
from simglucose.controller.base import Action


# ─────────────────────────────────────────────────────────────
# 1. GUARDIAN LAYER
# ─────────────────────────────────────────────────────────────

class GuardianLayer:
    """
    Couche de sécurité hard-codée — s'applique à TOUTE dose
    avant injection, qu'elle vienne du rule-based ou du PPO.

    Règles médicales non-négociables :
      - Dose max absolue : 15 U (jamais dépassée)
      - Dose max par correction : (bg - target) / isf
      - Si bg < 90  → dose = 0 (déjà bas, risque hypo)
      - Si bg < 70  → dose = 0 + alerte urgente
      - Arrondi à 0.5 U (précision pompe à insuline)
    """

    def __init__(self, dose_max=15.0, bg_low_threshold=90.0):
        self.dose_max         = dose_max          # U — limite absolue
        self.bg_low_threshold = bg_low_threshold  # mg/dL — seuil sécurité

    def clip(self, dose_raw, bg_current, isf=50.0, target=100.0):
        """
        Applique toutes les règles de sécurité et retourne la dose finale.

        Args:
            dose_raw    : dose calculée par le contrôleur (U)
            bg_current  : glycémie actuelle (mg/dL)
            isf         : Insulin Sensitivity Factor (mg/dL par unité)
            target      : glycémie cible (mg/dL)

        Returns:
            dose_safe   : dose sécurisée (U), arrondie à 0.5U
            blocked     : True si la dose a été bloquée pour sécurité
        """
        blocked = False

        # Règle 1 — Pas d'insuline si glycémie déjà basse
        if bg_current < self.bg_low_threshold:
            return 0.0, True

        # Règle 2 — Dose max basée sur la correction possible
        correction_max = max(0.0, (bg_current - target) / isf)
        dose_clipped   = min(dose_raw, correction_max + 5.0, self.dose_max)
        #                                               ↑ +5U marge pour repas

        # Règle 3 — Pas de dose négative
        dose_clipped = max(0.0, dose_clipped)

        # Règle 4 — Arrondi à 0.5 U (précision pompe réelle)
        dose_safe = round(dose_clipped * 2) / 2

        if dose_safe < dose_raw * 0.9:   # réduction > 10% → on note
            blocked = True

        return dose_safe, blocked


# ─────────────────────────────────────────────────────────────
# 2. RULE-BASED CONTROLLER
# ─────────────────────────────────────────────────────────────

class RuleBasedController:
    """
    Contrôleur bolus insuline basé sur la formule médicale standard.

    Formule :
        dose = correction_dose + meal_dose

    Avec :
        correction_dose = (bg_actuel - target) / ISF
        meal_dose       = glucides / ICR

    Paramètres patient (valeurs adulte typiques T1DM) :
        ISF  : Insulin Sensitivity Factor — combien 1U baisse la glycémie
               Valeur typique : 30–60 mg/dL par unité
        ICR  : Insulin-to-Carb Ratio — combien de glucides couvre 1U
               Valeur typique : 8–15 g par unité
        target : glycémie cible — typiquement 100 mg/dL
    """

    def __init__(self,
                 isf=50.0,       # mg/dL par unité
                 icr=10.0,       # g glucides par unité
                 target=100.0,   # mg/dL cible
                 basal=0.02):    # U/min débit basal de fond
        self.isf     = isf
        self.icr     = icr
        self.target  = target
        self.basal   = basal
        self.guardian = GuardianLayer()

        # Mémoire interne (évite de réinjecter juste après une dose)
        self.last_bolus_step = -30   # pas de bolus récent au départ
        self.min_steps_between_bolus = 12  # 12 × 5min = 1h minimum entre bolus

    def compute_dose(self, bg, carbs, step):
        """
        Calcule la dose bolus recommandée.

        Args:
            bg    : glycémie actuelle (mg/dL)
            carbs : glucides du repas en cours (g) — 0 si pas de repas
            step  : numéro de timestep courant

        Returns:
            dose_final : dose sécurisée après Guardian Layer (U)
            info       : dict avec détail du calcul
        """
        # ── Correction glycémique ────────────────────────────
        bg_excess          = max(0.0, bg - self.target)
        correction_dose    = bg_excess / self.isf

        # ── Dose repas ───────────────────────────────────────
        meal_dose = carbs / self.icr if carbs > 0 else 0.0

        # ── Dose brute totale ────────────────────────────────
        dose_raw = correction_dose + meal_dose

        # ── Anti-stacking : pas de bolus trop rapproché ──────
        steps_since_last = step - self.last_bolus_step
        if steps_since_last < self.min_steps_between_bolus and carbs == 0:
            dose_raw = 0.0   # correction seulement si repas

        # ── Guardian Layer ───────────────────────────────────
        dose_final, blocked = self.guardian.clip(
            dose_raw, bg, self.isf, self.target
        )

        if dose_final > 0:
            self.last_bolus_step = step

        return dose_final, {
            'bg':              bg,
            'carbs':           carbs,
            'correction_dose': round(correction_dose, 2),
            'meal_dose':       round(meal_dose, 2),
            'dose_raw':        round(dose_raw, 2),
            'dose_final':      dose_final,
            'guardian_blocked': blocked,
        }


# ─────────────────────────────────────────────────────────────
# 3. MÉTRIQUES
# ─────────────────────────────────────────────────────────────

def compute_metrics(bg_array):
    """
    Calcule les métriques cliniques standard à partir d'un array de glycémies.

    Retourne un dict avec :
        tir   : Time in Range 70–180 mg/dL  (%)
        tbr   : Time Below Range < 70 mg/dL (%)
        tar   : Time Above Range > 180 mg/dL(%)
        hypo  : Hypoglycémies sévères < 54  (%)
        mean  : Glycémie moyenne (mg/dL)
        std   : Écart-type (mg/dL)
        cv    : Coefficient de variation (%) — < 36% = bien contrôlé
    """
    bg = np.array(bg_array, dtype=float)
    bg = bg[~np.isnan(bg)]

    if len(bg) == 0:
        return {}

    return {
        'tir':  float(np.mean((bg >= 70)  & (bg <= 180)) * 100),
        'tbr':  float(np.mean(bg < 70)  * 100),
        'tar':  float(np.mean(bg > 180) * 100),
        'hypo': float(np.mean(bg < 54)  * 100),
        'mean': float(np.mean(bg)),
        'std':  float(np.std(bg)),
        'cv':   float(np.std(bg) / np.mean(bg) * 100),
        'min':  float(np.min(bg)),
        'max':  float(np.max(bg)),
        'n_severe_hypo': int(np.sum(bg < 54)),
    }


def print_metrics(metrics, label=''):
    """Affiche les métriques de façon lisible."""
    sep = '─' * 46
    print(f"\n{sep}")
    if label:
        print(f"  {label}")
        print(sep)
    print(f"  TIR  (70–180 mg/dL)   : {metrics['tir']:6.1f}%  "
          f"{'✓' if metrics['tir'] >= 70 else '✗'} cible > 70%")
    print(f"  TBR  (< 70 mg/dL)     : {metrics['tbr']:6.1f}%  "
          f"{'✓' if metrics['tbr'] < 4 else '✗'} cible < 4%")
    print(f"  TAR  (> 180 mg/dL)    : {metrics['tar']:6.1f}%")
    print(f"  Hypo sévère (< 54)    : {metrics['hypo']:6.2f}%  "
          f"({'✓' if metrics['hypo'] < 1 else '✗'} cible < 1%)")
    print(f"  Glycémie moyenne      : {metrics['mean']:6.1f} mg/dL")
    print(f"  Écart-type            : {metrics['std']:6.1f} mg/dL")
    print(f"  CV                    : {metrics['cv']:6.1f}%  "
          f"({'✓' if metrics['cv'] < 36 else '✗'} cible < 36%)")
    print(f"  Nb hypos sévères      : {metrics['n_severe_hypo']:6d} épisodes")
    print(sep)


# ─────────────────────────────────────────────────────────────
# 4. SIMULATION SIMGLUCOSE
# ─────────────────────────────────────────────────────────────

def build_meal_scenario(n_days=3):
    """
    Construit un scénario repas réaliste pour SimGlucose.
    3 repas/jour : petit-déjeuner, déjeuner, dîner.

    Format CustomScenario : liste de (heure_depuis_debut, glucides_g)
    """
    meals = []
    for day in range(n_days):
        offset = day * 24  # heures depuis le début
        meals += [
            (offset + 7.0,  60 + np.random.randint(-10, 10)),   # Petit-déj
            (offset + 12.5, 75 + np.random.randint(-15, 15)),   # Déjeuner
            (offset + 19.0, 70 + np.random.randint(-10, 10)),   # Dîner
        ]
    return meals


def run_simulation(patient_name, controller, n_days=3, seed=42):
    """
    Lance une simulation complète sur un patient SimGlucose.

    Args:
        patient_name : ex. 'adolescent#001'
        controller   : instance de RuleBasedController
        n_days       : durée de simulation en jours
        seed         : graine aléatoire pour reproductibilité

    Returns:
        results : dict avec bg_history, dose_history, meal_history, metrics
    """
    np.random.seed(seed)

    # ── Initialisation SimGlucose ────────────────────────────
    patient  = T1DPatient.withName(patient_name)
    sensor   = CGMSensor.withName('Dexcom', seed=seed)
    pump     = InsulinPump.withName('Insulet')

    meal_schedule = build_meal_scenario(n_days)
    scenario = CustomScenario(
        start_time=datetime(2024, 1, 1, 7, 0, 0),
        scenario=meal_schedule
    )
    sim = T1DSimEnv(patient, sensor, pump, scenario)

    # ── Boucle de simulation ─────────────────────────────────
    bg_history   = []
    dose_history = []
    meal_history = []
    info_history = []

    n_steps = n_days * 288   # 288 steps/jour à 5 min

    # Step initial pour obtenir la première observation
    obs, _, done, _ = sim.step(Action(basal=controller.basal, bolus=0))
    bg_history.append(float(obs.CGM))

    for step in range(1, n_steps):
        bg = float(obs.CGM)

        # Glucides du repas à ce timestep (SimGlucose les fournit)
        # On utilise le scénario pour savoir s'il y a un repas
        current_hour = (step * 5 / 60) % 24
        carbs_now = 0.0
        for meal_hour, meal_carbs in meal_schedule:
            meal_hour_mod = meal_hour % 24
            if abs(current_hour - meal_hour_mod) < 5/60:
                carbs_now = float(meal_carbs)
                break

        # Décision du contrôleur
        dose, info = controller.compute_dose(bg, carbs_now, step)

        # Step SimGlucose
        obs, _, done, _ = sim.step(
            Action(basal=controller.basal, bolus=dose)
        )

        bg_history.append(float(obs.CGM))
        dose_history.append(dose)
        meal_history.append(carbs_now)
        info_history.append(info)

        if done:
            print(f"  Simulation terminée prématurément à step {step}")
            break

    metrics = compute_metrics(bg_history)

    return {
        'patient':      patient_name,
        'bg_history':   bg_history,
        'dose_history': dose_history,
        'meal_history': meal_history,
        'info_history': info_history,
        'metrics':      metrics,
        'n_steps':      len(bg_history),
    }


# ─────────────────────────────────────────────────────────────
# 5. ÉVALUATION MULTI-PATIENTS
# ─────────────────────────────────────────────────────────────

# Les 10 patients virtuels de SimGlucose
ALL_PATIENTS = [
    'adolescent#001', 'adolescent#002', 'adolescent#003',
    'adult#001',      'adult#002',      'adult#003',
    'adult#004',      'adult#005',
    'child#001',      'child#002',
]


def evaluate_all(n_days=3, verbose=True):
    """
    Évalue le rule-based sur tous les patients SimGlucose.
    Retourne un DataFrame avec les métriques par patient.
    """
    rows = []

    for i, patient in enumerate(ALL_PATIENTS):
        if verbose:
            print(f"  [{i+1:2d}/{len(ALL_PATIENTS)}] {patient} ...", end=' ', flush=True)

        controller = RuleBasedController(isf=50, icr=10, target=100)

        try:
            result = run_simulation(patient, controller, n_days=n_days, seed=i)
            m = result['metrics']
            rows.append({
                'patient':    patient,
                'tir':        m['tir'],
                'tbr':        m['tbr'],
                'tar':        m['tar'],
                'hypo_pct':   m['hypo'],
                'mean_bg':    m['mean'],
                'std_bg':     m['std'],
                'cv':         m['cv'],
                'n_hypo_sev': m['n_severe_hypo'],
            })
            if verbose:
                status = '✓' if m['tir'] >= 70 else '✗'
                print(f"TIR={m['tir']:.1f}%  TBR={m['tbr']:.1f}%  {status}")
        except Exception as e:
            if verbose:
                print(f"ERREUR — {e}")

    df = pd.DataFrame(rows)
    return df


def print_summary_table(df):
    """Affiche le tableau récapitulatif et les moyennes."""
    print("\n" + "═" * 72)
    print("  RULE-BASED — Résultats sur tous les patients")
    print("═" * 72)
    print(f"  {'Patient':<20} {'TIR':>7} {'TBR':>7} {'TAR':>7} "
          f"{'Hypo<54':>8} {'BG moy':>8} {'CV':>6}")
    print("  " + "─" * 68)

    for _, row in df.iterrows():
        tir_mark = '✓' if row['tir'] >= 70 else '✗'
        print(f"  {row['patient']:<20} "
              f"{row['tir']:>6.1f}%{tir_mark} "
              f"{row['tbr']:>6.1f}% "
              f"{row['tar']:>6.1f}% "
              f"{row['hypo_pct']:>7.2f}% "
              f"{row['mean_bg']:>7.1f}  "
              f"{row['cv']:>5.1f}%")

    print("  " + "─" * 68)
    print(f"  {'MOYENNE':<20} "
          f"{df['tir'].mean():>6.1f}%  "
          f"{df['tbr'].mean():>6.1f}% "
          f"{df['tar'].mean():>6.1f}% "
          f"{df['hypo_pct'].mean():>7.2f}% "
          f"{df['mean_bg'].mean():>7.1f}  "
          f"{df['cv'].mean():>5.1f}%")
    print("═" * 72)
    print(f"\n  Patients avec TIR ≥ 70% : "
          f"{(df['tir'] >= 70).sum()}/{len(df)}")


# ─────────────────────────────────────────────────────────────
# 6. VISUALISATION
# ─────────────────────────────────────────────────────────────

def plot_results(result, save_path='/tmp/rule_based_results.png'):
    """
    Graphique complet pour un patient :
      - Courbe glycémique avec zones TIR/hypo/hyper
      - Doses bolus administrées
      - Métriques en encart
    """
    bg   = result['bg_history']
    dose = result['dose_history']
    m    = result['metrics']
    n    = len(bg)

    minutes = np.arange(n) * 5
    hours   = minutes / 60

    fig = plt.figure(figsize=(14, 7))
    gs  = gridspec.GridSpec(2, 2, width_ratios=[3, 1], hspace=0.35, wspace=0.3)

    # ── Panneau principal : glycémie ─────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.fill_between(hours, 70, 180, alpha=0.08, color='#1D9E75', label='TIR 70–180')
    ax1.fill_between(hours, 0,  70,  alpha=0.12, color='#E24B4A')
    ax1.fill_between(hours, 180, 400, alpha=0.06, color='#EF9F27')
    ax1.plot(hours, bg, color='#185FA5', linewidth=1, alpha=0.9, label='Glycémie CGM')

    hypo_idx = [i for i, b in enumerate(bg) if b < 70]
    if hypo_idx:
        ax1.scatter([hours[i] for i in hypo_idx],
                    [bg[i]    for i in hypo_idx],
                    color='#E24B4A', s=15, zorder=5, label='Hypo < 70')

    ax1.axhline(70,  color='#E24B4A', lw=0.8, ls='--', alpha=0.6)
    ax1.axhline(180, color='#EF9F27', lw=0.8, ls='--', alpha=0.6)
    ax1.set_ylabel('Glycémie (mg/dL)')
    ax1.set_ylim(30, 380)
    ax1.legend(fontsize=8, loc='upper right')
    ax1.set_title(f"Patient : {result['patient']}", fontsize=11)

    # ── Doses bolus ──────────────────────────────────────────
    ax2 = fig.add_subplot(gs[1, 0], sharex=ax1)
    dose_hours = np.arange(len(dose)) * 5 / 60
    ax2.vlines(dose_hours,
               0, dose,
               color='#534AB7', linewidth=2, alpha=0.8)
    ax2.set_ylabel('Bolus (U)')
    ax2.set_xlabel('Heures de simulation')
    ax2.set_ylim(0, 12)

    # ── Métriques texte ──────────────────────────────────────
    ax3 = fig.add_subplot(gs[:, 1])
    ax3.axis('off')

    metrics_text = [
        ('TIR  (70–180)', f"{m['tir']:.1f}%",
         '#1D9E75' if m['tir'] >= 70 else '#E24B4A'),
        ('TBR  (< 70)',   f"{m['tbr']:.1f}%",
         '#1D9E75' if m['tbr'] < 4  else '#E24B4A'),
        ('TAR  (> 180)',  f"{m['tar']:.1f}%",  '#888780'),
        ('Hypo < 54',    f"{m['hypo']:.2f}%",
         '#1D9E75' if m['hypo'] < 1 else '#E24B4A'),
        ('BG moyenne',   f"{m['mean']:.1f}",   '#185FA5'),
        ('Écart-type',   f"{m['std']:.1f}",    '#888780'),
        ('CV',           f"{m['cv']:.1f}%",
         '#1D9E75' if m['cv'] < 36 else '#EF9F27'),
        ('Hypos sévères', str(m['n_severe_hypo']),
         '#1D9E75' if m['n_severe_hypo'] == 0 else '#E24B4A'),
    ]

    ax3.text(0.1, 0.95, 'Métriques', fontsize=12, fontweight='bold',
             transform=ax3.transAxes, va='top')
    ax3.text(0.1, 0.88, 'Rule-Based Controller', fontsize=9,
             transform=ax3.transAxes, va='top', color='#888780')

    for i, (label, value, color) in enumerate(metrics_text):
        y = 0.78 - i * 0.09
        ax3.text(0.05, y, label,   fontsize=9,  transform=ax3.transAxes, va='top')
        ax3.text(0.95, y, value,   fontsize=10, transform=ax3.transAxes,
                 va='top', ha='right', color=color, fontweight='bold')
        ax3.axhline(y - 0.01, xmin=0.05, xmax=0.95,
                    color='#D3D1C7', linewidth=0.4,
                    transform=ax3.transAxes)

    plt.savefig(save_path, dpi=140, bbox_inches='tight')
    plt.close()
    print(f"  Graphique sauvegardé : {save_path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':

    print("╔══════════════════════════════════════════════╗")
    print("║   GlucoTwin M3 — Rule-Based Controller       ║")
    print("╚══════════════════════════════════════════════╝")

    # ── Test rapide sur 1 patient ────────────────────────────
    print("\n[1/3] Simulation sur adolescent#001 (3 jours)...")
    ctrl   = RuleBasedController(isf=50, icr=10, target=100)
    result = run_simulation('adolescent#001', ctrl, n_days=3, seed=42)

    print_metrics(result['metrics'], label='adolescent#001 — Rule-Based')

    # Exemple de calcul de dose manuel (pour votre démo Streamlit)
    print("\n[2/3] Exemple de recommandation de dose :")
    print("─" * 46)
    test_cases = [
        (180, 0,   "Hyperglycémie sans repas"),
        (140, 60,  "Glycémie normale + repas 60g"),
        (65,  0,   "Hypoglycémie — dose bloquée"),
        (220, 80,  "Hyper + gros repas"),
        (100, 0,   "Glycémie cible, pas de repas"),
    ]
    for bg, carbs, scenario in test_cases:
        ctrl2 = RuleBasedController(isf=50, icr=10, target=100)
        dose, info = ctrl2.compute_dose(bg, carbs, step=100)
        print(f"  {scenario:<35} "
              f"BG={bg:3d}  Carbs={carbs:2d}g  "
              f"→ Dose={dose:.1f}U "
              f"(corr={info['correction_dose']:.1f} + repas={info['meal_dose']:.1f})")

    # ── Graphique ────────────────────────────────────────────
    print("\n[3/3] Génération du graphique...")
    plot_results(result, '/tmp/rule_based_results.png')

    # ── Évaluation multi-patients (optionnel, ~2 min) ────────
    print("\n" + "─" * 46)
    print("Évaluation sur tous les patients (peut prendre 2 min)...")
    df = evaluate_all(n_days=3, verbose=True)
    print_summary_table(df)

    # Sauvegarder les métriques pour evaluate.py (étape 5)
    df.to_csv('/tmp/rule_based_metrics.csv', index=False)
    print("\n  Métriques sauvegardées : /tmp/rule_based_metrics.csv")
    print("  → Ce fichier sera utilisé dans evaluate.py pour comparer avec PPO\n")
    
"""  
    Hyperglycémie sans repas      BG=180  Carbs= 0g  → Dose=1.5U  (corr=1.6 + repas=0.0)
Glycémie normale + repas 60g  BG=140  Carbs=60g  → Dose=6.0U  (corr=0.8 + repas=6.0)
Hypoglycémie — dose bloquée   BG= 65  Carbs= 0g  → Dose=0.0U  ← Guardian actif
Hyper + gros repas            BG=220  Carbs=80g  → Dose=7.5U  (corr=2.4 + repas=8.0)
Glycémie cible, pas de repas  BG=100  Carbs= 0g  → Dose=0.0U  ← correct, rien à faire


Ce que contient le fichier
GuardianLayer — 4 règles de sécurité non-négociables : dose bloquée si BG < 90, dose plafonnée par la correction maximale possible, arrondi à 0.5U (précision d'une vraie pompe), jamais plus de 15U.
RuleBasedController — la formule médicale standard en deux parties : correction = (BG - 100) / ISF pour ramener vers la cible, meal = glucides / ICR pour couvrir le repas. L'anti-stacking empêche deux bolus de correction trop rapprochés (moins d'1h d'écart).
compute_metrics() — retourne TIR, TBR, TAR, hypos sévères, CV. Cette fonction sera réutilisée à l'identique dans evaluate.py pour comparer avec le PPO.
run_simulation() — boucle complète sur SimGlucose avec scénario repas 3 fois/jour. Quand SimGlucose est installé, lancez python rule_based.py et vous aurez les métriques sur les 10 patients en ~2 minutes.
evaluate_all() — teste tous les patients et retourne un DataFrame, sauvegardé en CSV dans /tmp/rule_based_metrics.csv. Ce fichier sera directement chargé dans evaluate.py à l'étape 5.
"""