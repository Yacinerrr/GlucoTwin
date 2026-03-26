"""
GlucoTwin M3 — Entraînement PPO
================================
Étape 4 du plan de construction.

Usage :
    python train_ppo.py                    # entraînement complet
    python train_ppo.py --steps 50000      # entraînement rapide (test)
    python train_ppo.py --patient adult#001 # patient fixe

Sorties :
    models/glucotwin_m3_best/   → meilleur modèle (EvalCallback)
    models/glucotwin_m3_final   → modèle final après entraînement
    logs/ppo_glucose/           → logs TensorBoard
    results/training_curve.png  → courbe d'apprentissage

TensorBoard :
    tensorboard --logdir logs/ppo_glucose
"""

import os
import argparse
import warnings
import numpy as np
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import (
    EvalCallback,
    CheckpointCallback,
    BaseCallback,
)
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import VecNormalize

from glucose_env import GlucoseEnv


# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    # Entraînement
    'total_timesteps': 500_000,    # steps totaux (~17h simulation)
    'eval_freq':        10_000,    # évaluer toutes les 10k steps
    'n_eval_episodes':       5,    # épisodes par évaluation
    'n_envs':                4,    # envs parallèles (accélère x4)
    'seed':                 42,

    # Environnement
    'n_days_train':          1,    # durée épisode entraînement
    'n_days_eval':           3,    # durée épisode évaluation (plus long)
    'patient_train':      None,    # None = rotation aléatoire
    'patient_eval': 'adult#001',   # patient fixe pour comparaisons stables

    # Hyperparamètres PPO
    # Ces valeurs sont un bon point de départ pour les séries temporelles.
    # Si la reward stagne → augmenter learning_rate ou n_steps.
    # Si l'agent est instable → réduire learning_rate ou clip_range.
    'learning_rate':    3e-4,
    'n_steps':          2048,      # steps par env avant update
    'batch_size':        256,
    'n_epochs':           10,      # passes sur les données collectées
    'gamma':            0.99,      # discount factor
    'gae_lambda':       0.95,      # GAE lambda
    'clip_range':       0.20,      # PPO clipping
    'ent_coef':         0.01,      # bonus entropie (exploration)
    'vf_coef':          0.50,      # poids value function loss
    'max_grad_norm':    0.50,      # gradient clipping

    # Chemins
    'log_dir':      'logs/ppo_glucose',
    'model_dir':    'models',
    'model_name':   'glucotwin_m3',
}


# ─────────────────────────────────────────────────────────────
# CALLBACK : métriques glycémiques dans TensorBoard
# ─────────────────────────────────────────────────────────────

class GlucoseMetricsCallback(BaseCallback):
    """
    Callback custom qui logue TIR, TBR et reward dans TensorBoard
    à chaque fin d'épisode.

    SB3 logue automatiquement ep_rew_mean, mais pas TIR/TBR.
    Ce callback comble ce manque.
    """

    def __init__(self, verbose=0):
        super().__init__(verbose)
        self.episode_tirs    = []
        self.episode_tbrs    = []
        self.episode_rewards = []
        self._episode_reward = 0.0

    def _on_step(self) -> bool:
        # Accumuler reward step par step
        rewards = self.locals.get('rewards', [])
        if rewards is not None:
            self._episode_reward += float(np.mean(rewards))

        # À chaque fin d'épisode dans n'importe quel env
        dones = self.locals.get('dones', [])
        infos = self.locals.get('infos', [])

        for done, info in zip(dones, infos):
            if done and 'episode_metrics' in info:
                m = info['episode_metrics']
                tir = m.get('tir', 0.0)
                tbr = m.get('tbr', 0.0)

                self.episode_tirs.append(tir)
                self.episode_tbrs.append(tbr)

                # Logger dans TensorBoard
                self.logger.record('glucose/TIR_pct',        tir)
                self.logger.record('glucose/TBR_pct',        tbr)
                self.logger.record('glucose/mean_bg',        m.get('mean_bg', 0))
                self.logger.record('glucose/guardian_blocks',
                                   m.get('guardian_blocks', 0))

        return True   # True = continuer l'entraînement

    def _on_rollout_end(self):
        """Appelé après chaque collecte de rollout."""
        if self.episode_tirs:
            self.logger.record(
                'glucose/TIR_mean_rollout',
                float(np.mean(self.episode_tirs[-10:]))
            )


# ─────────────────────────────────────────────────────────────
# CONSTRUCTION DES ENVIRONNEMENTS
# ─────────────────────────────────────────────────────────────

def make_train_env(config, rank=0):
    """Crée un environnement d'entraînement wrappé dans Monitor."""
    def _init():
        env = GlucoseEnv(
            patient_name=config['patient_train'],
            n_days=config['n_days_train'],
            seed=config['seed'] + rank,
        )
        # Monitor enregistre ep_rew_mean, ep_len_mean dans TensorBoard
        env = Monitor(env)
        return env
    return _init


def make_eval_env(config):
    """Crée l'environnement d'évaluation (patient fixe, épisodes longs)."""
    env = GlucoseEnv(
        patient_name=config['patient_eval'],
        n_days=config['n_days_eval'],
        seed=config['seed'] + 999,
    )
    return Monitor(env)


# ─────────────────────────────────────────────────────────────
# CONSTRUCTION DU MODÈLE PPO
# ─────────────────────────────────────────────────────────────

def build_ppo_model(vec_env, config):
    """
    Instancie PPO avec un réseau MLP adapté aux séries temporelles.

    Architecture réseau :
        Input (18) → Dense(256) → ReLU → Dense(256) → ReLU → Output

    Deux têtes partagent le même tronc :
        - Actor  : μ et σ de la distribution gaussienne (action continue)
        - Critic : valeur V(s)
    """
    policy_kwargs = dict(
        # Deux couches de 256 neurones
        # Augmentez à [512, 512] si TIR stagne après 200k steps
        net_arch=dict(pi=[256, 256], vf=[256, 256]),
        # tanh est plus stable que relu pour PPO sur données normalisées
        activation_fn=__import__('torch').nn.Tanh,
    )

    model = PPO(
        policy           = 'MlpPolicy',
        env              = vec_env,
        learning_rate    = config['learning_rate'],
        n_steps          = config['n_steps'],
        batch_size       = config['batch_size'],
        n_epochs         = config['n_epochs'],
        gamma            = config['gamma'],
        gae_lambda       = config['gae_lambda'],
        clip_range       = config['clip_range'],
        ent_coef         = config['ent_coef'],
        vf_coef          = config['vf_coef'],
        max_grad_norm    = config['max_grad_norm'],
        policy_kwargs    = policy_kwargs,
        tensorboard_log  = config['log_dir'],
        verbose          = 1,
        seed             = config['seed'],
    )

    return model


# ─────────────────────────────────────────────────────────────
# CALLBACKS
# ─────────────────────────────────────────────────────────────

def build_callbacks(eval_env, config):
    """
    Construit la liste des callbacks pour l'entraînement.

    EvalCallback      — évalue toutes les eval_freq steps,
                        sauvegarde le meilleur modèle
    CheckpointCallback — sauvegarde toutes les 50k steps
                        (protection contre les crashes)
    GlucoseMetricsCallback — TIR/TBR dans TensorBoard
    """
    best_model_path = os.path.join(config['model_dir'],
                                   f"{config['model_name']}_best")
    ckpt_path       = os.path.join(config['model_dir'], 'checkpoints')

    os.makedirs(best_model_path, exist_ok=True)
    os.makedirs(ckpt_path,       exist_ok=True)

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path = best_model_path,
        log_path             = config['log_dir'],
        eval_freq            = config['eval_freq'],
        n_eval_episodes      = config['n_eval_episodes'],
        deterministic        = True,   # pas d'exploration pendant eval
        render               = False,
        verbose              = 1,
    )

    checkpoint_callback = CheckpointCallback(
        save_freq  = 50_000,
        save_path  = ckpt_path,
        name_prefix= config['model_name'],
        verbose    = 0,
    )

    glucose_callback = GlucoseMetricsCallback(verbose=0)

    return [eval_callback, checkpoint_callback, glucose_callback]


# ─────────────────────────────────────────────────────────────
# COURBE D'APPRENTISSAGE
# ─────────────────────────────────────────────────────────────

def plot_training_curve(log_dir, save_path='results/training_curve.png'):
    """
    Trace la courbe d'apprentissage depuis les logs Monitor.
    Appelée automatiquement après l'entraînement.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    # Chercher les fichiers monitor .csv
    monitor_files = []
    for root, _, files in os.walk(log_dir):
        for f in files:
            if f.endswith('.monitor.csv'):
                monitor_files.append(os.path.join(root, f))

    if not monitor_files:
        print("  Pas de fichiers monitor trouvés pour la courbe.")
        return

    # Charger et concatener
    dfs = []
    for mf in monitor_files:
        try:
            df = __import__('pandas').read_csv(mf, skiprows=1)
            dfs.append(df)
        except Exception:
            continue

    if not dfs:
        return

    df = __import__('pandas').concat(dfs).sort_values('t').reset_index(drop=True)

    # Smoothing : moyenne mobile sur 20 épisodes
    window = min(20, len(df) // 5)
    if window < 2:
        return

    df['reward_smooth'] = df['r'].rolling(window, min_periods=1).mean()

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6), sharex=False)
    fig.suptitle('GlucoTwin M3 — Courbe d\'apprentissage PPO', fontsize=12)

    # Reward par épisode
    ax1.fill_between(range(len(df)), df['r'], alpha=0.15, color='#534AB7')
    ax1.plot(df['reward_smooth'], color='#534AB7', linewidth=2,
             label=f'Reward (lissé {window} ep)')
    ax1.axhline(0, color='#888780', linewidth=0.7, linestyle='--')
    ax1.set_ylabel('Reward épisode')
    ax1.legend(fontsize=9)
    ax1.set_title('Reward par épisode (entraînement)')

    # Durée épisode
    ax2.plot(df['l'], color='#1D9E75', linewidth=1, alpha=0.6)
    ax2.set_ylabel('Longueur épisode (steps)')
    ax2.set_xlabel('Épisode')
    ax2.set_title('Longueur des épisodes')

    plt.tight_layout()
    plt.savefig(save_path, dpi=130, bbox_inches='tight')
    plt.close()
    print(f"  Courbe sauvegardée : {save_path}")


# ─────────────────────────────────────────────────────────────
# ÉVALUATION RAPIDE APRÈS ENTRAÎNEMENT
# ─────────────────────────────────────────────────────────────

def quick_eval(model, config, n_episodes=3):
    """
    Évalue le modèle chargé sur n_episodes et affiche TIR/TBR.
    Utilisé juste après l'entraînement pour un bilan rapide.
    """
    print(f"\n  Évaluation rapide ({n_episodes} épisodes, "
          f"patient={config['patient_eval']}) ...")

    tirs, tbrs, rewards = [], [], []

    for ep in range(n_episodes):
        env = GlucoseEnv(
            patient_name=config['patient_eval'],
            n_days=config['n_days_eval'],
            seed=ep * 17,
        )
        obs, _ = env.reset(seed=ep * 17)
        total_reward = 0.0
        done = False

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, term, trunc, info = env.step(action)
            total_reward += reward
            done = term or trunc

        m = env.get_episode_metrics()
        tirs.append(m.get('tir', 0))
        tbrs.append(m.get('tbr', 0))
        rewards.append(total_reward)

        print(f"    Ep {ep+1} : TIR={m['tir']:.1f}%  "
              f"TBR={m['tbr']:.1f}%  "
              f"BG={m['mean_bg']:.0f} mg/dL  "
              f"Reward={total_reward:.0f}")

    print(f"\n  Résultats moyens sur {n_episodes} épisodes :")
    print(f"    TIR moyen  : {np.mean(tirs):.1f}%"
          f"  {'✓' if np.mean(tirs) >= 70 else '✗'} (cible > 70%)")
    print(f"    TBR moyen  : {np.mean(tbrs):.1f}%"
          f"  {'✓' if np.mean(tbrs) < 4  else '✗'} (cible < 4%)")
    print(f"    Reward moy : {np.mean(rewards):.0f}")

    return {'tir': np.mean(tirs), 'tbr': np.mean(tbrs)}


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

def train(config):
    print("\n╔══════════════════════════════════════════════╗")
    print("║   GlucoTwin M3 — Entraînement PPO            ║")
    print("╚══════════════════════════════════════════════╝\n")

    # Créer les dossiers
    os.makedirs(config['log_dir'],   exist_ok=True)
    os.makedirs(config['model_dir'], exist_ok=True)

    # ── Environnements ───────────────────────────────────────
    print(f"[1/4] Construction des environnements ...")
    print(f"  Entraînement : {config['n_envs']} envs parallèles "
          f"× {config['n_days_train']} jour(s) | patient=aléatoire")
    print(f"  Évaluation   : 1 env "
          f"× {config['n_days_eval']} jour(s) | patient={config['patient_eval']}")

    vec_env = make_vec_env(
        make_train_env(config, rank=0),
        n_envs=config['n_envs'],
        seed=config['seed'],
    )
    eval_env = make_eval_env(config)

    # ── Modèle PPO ───────────────────────────────────────────
    print(f"\n[2/4] Construction du modèle PPO ...")
    model = build_ppo_model(vec_env, config)

    # Afficher les paramètres clés
    total_params = sum(p.numel()
                       for p in model.policy.parameters())
    print(f"  Réseau : [18] → [256] → [256] → [1]")
    print(f"  Paramètres total : {total_params:,}")
    print(f"  Learning rate    : {config['learning_rate']}")
    print(f"  Batch size       : {config['batch_size']}")
    print(f"  Steps par update : {config['n_steps']} × {config['n_envs']} envs"
          f" = {config['n_steps'] * config['n_envs']:,} steps")

    # ── Callbacks ────────────────────────────────────────────
    print(f"\n[3/4] Configuration callbacks ...")
    callbacks = build_callbacks(eval_env, config)
    print(f"  EvalCallback      : toutes les {config['eval_freq']:,} steps")
    print(f"  CheckpointCallback: toutes les 50,000 steps")
    print(f"  GlucoseMetrics    : TIR/TBR dans TensorBoard")
    print(f"\n  TensorBoard : tensorboard --logdir {config['log_dir']}")

    # ── Entraînement ─────────────────────────────────────────
    print(f"\n[4/4] Entraînement ({config['total_timesteps']:,} steps) ...")
    print("─" * 52)

    model.learn(
        total_timesteps   = config['total_timesteps'],
        callback          = callbacks,
        tb_log_name       = 'PPO',
        reset_num_timesteps= True,
        progress_bar      = True,
    )

    print("─" * 52)
    print("  Entraînement terminé.")

    # ── Sauvegarde modèle final ──────────────────────────────
    final_path = os.path.join(config['model_dir'], config['model_name'] + '_final')
    model.save(final_path)
    print(f"\n  Modèle final sauvegardé : {final_path}.zip")

    best_path = os.path.join(config['model_dir'],
                             f"{config['model_name']}_best", 'best_model')
    print(f"  Meilleur modèle      : {best_path}.zip")

    # ── Courbe d'apprentissage ───────────────────────────────
    plot_training_curve(config['log_dir'])

    # ── Évaluation rapide ────────────────────────────────────
    best_model_zip = best_path + '.zip'
    if os.path.exists(best_model_zip):
        print(f"\n  Chargement du meilleur modèle pour évaluation ...")
        best_model = PPO.load(best_path, env=vec_env)
        quick_eval(best_model, config, n_episodes=3)
    else:
        quick_eval(model, config, n_episodes=3)

    vec_env.close()
    eval_env.close()

    print("\n╔══════════════════════════════════════════════╗")
    print("║   Entraînement complet.                      ║")
    print("║   Prochaine étape : evaluate.py              ║")
    print("╚══════════════════════════════════════════════╝\n")

    return model


# ─────────────────────────────────────────────────────────────
# CHARGEMENT D'UN MODÈLE EXISTANT
# ─────────────────────────────────────────────────────────────

def load_model(model_path, config):
    """
    Charge un modèle sauvegardé pour reprendre l'entraînement
    ou faire une inférence.

    Usage :
        model = load_model('models/glucotwin_m3_best/best_model', config)
        action, _ = model.predict(obs, deterministic=True)
    """
    env = GlucoseEnv(
        patient_name=config['patient_eval'],
        n_days=config['n_days_eval'],
    )
    model = PPO.load(model_path, env=env)
    print(f"  Modèle chargé : {model_path}")
    return model, env


# ─────────────────────────────────────────────────────────────
# GUIDE DE DÉBOGAGE
# ─────────────────────────────────────────────────────────────

TROUBLESHOOTING = """
═══════════════════════════════════════════════════════════════
  Guide de débogage — PPO qui n'apprend pas
═══════════════════════════════════════════════════════════════

① Reward stagne à -2000 après 100k steps
  → Reward trop négative, agent découragé
  Fixes :
    - Réduire la pénalité hypo : -10 → -5
    - Augmenter ent_coef : 0.01 → 0.05  (plus d'exploration)
    - Réduire learning_rate : 3e-4 → 1e-4

② TIR < 30% même après 300k steps
  → Agent ne comprend pas le lien dose → glycémie
  Fixes :
    - Augmenter n_steps : 2048 → 4096
    - Vérifier que bg_history est bien dans le state
    - Ajouter reward shaping : récompenser la tendance vers TIR

③ Agent injecte toujours 0U (politique triviale)
  → Explorer/exploiter déséquilibré
  Fixes :
    - Augmenter ent_coef : 0.01 → 0.1
    - Vérifier que Guardian Layer ne bloque pas tout
    - Initialiser avec action_noise (SAC plutôt que PPO)

④ Crash "out of memory"
  → Trop d'envs parallèles
  Fix : réduire n_envs : 4 → 2

⑤ NaN dans les logs TensorBoard
  → Instabilité du gradient
  Fixes :
    - Réduire learning_rate : 3e-4 → 5e-5
    - Réduire clip_range : 0.2 → 0.1
    - Augmenter max_grad_norm : 0.5 → 1.0

⑥ TIR oscille sans progresser
  → Hyperparamètres sous-optimaux
  Fixes :
    - Augmenter batch_size : 256 → 512
    - Augmenter n_epochs : 10 → 20
    - Essayer SAC (mieux pour actions continues)

Commande TensorBoard :
    tensorboard --logdir logs/ppo_glucose
    Ouvrir : http://localhost:6006

Métriques à surveiller dans TensorBoard :
    train/reward_mean        → doit augmenter
    glucose/TIR_mean_rollout → doit dépasser 70%
    glucose/TBR_pct          → doit rester < 4%
    train/entropy_loss       → ne doit pas tomber à 0
    train/approx_kl          → doit rester < 0.1
═══════════════════════════════════════════════════════════════
"""


# ─────────────────────────────────────────────────────────────
# POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='GlucoTwin M3 — PPO Training')
    parser.add_argument('--steps',   type=int,   default=DEFAULT_CONFIG['total_timesteps'],
                        help='Nombre total de steps (défaut 500k)')
    parser.add_argument('--patient', type=str,   default=None,
                        help='Patient fixe pour entraînement (défaut aléatoire)')
    parser.add_argument('--lr',      type=float, default=DEFAULT_CONFIG['learning_rate'],
                        help='Learning rate (défaut 3e-4)')
    parser.add_argument('--n-envs',  type=int,   default=DEFAULT_CONFIG['n_envs'],
                        help='Envs parallèles (défaut 4)')
    parser.add_argument('--debug',   action='store_true',
                        help='Mode debug : 5000 steps seulement')
    parser.add_argument('--help-debug', action='store_true',
                        help='Afficher le guide de débogage')
    args = parser.parse_args()

    if args.help_debug:
        print(TROUBLESHOOTING)
        exit(0)

    config = DEFAULT_CONFIG.copy()
    config['total_timesteps'] = 5_000 if args.debug else args.steps
    config['patient_train']   = args.patient
    config['learning_rate']   = args.lr
    config['n_envs']          = args.n_envs

    if args.debug:
        print("  Mode debug : 5 000 steps (résultats non représentatifs)")

    train(config)