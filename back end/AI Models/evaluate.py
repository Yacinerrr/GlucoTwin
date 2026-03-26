"""
GlucoTwin M3 — Évaluation comparative PPO vs Rule-Based
========================================================
Étape 5 du plan de construction.

Usage :
    python evaluate.py                              # évaluation complète
    python evaluate.py --model models/glucotwin_m3_best/best_model
    python evaluate.py --days 3 --episodes 3        # 3 jours × 3 épisodes/patient

Sorties :
    results/comparison_table.csv   → tableau complet exportable
    results/eval_glucose_curves.png → courbes glycémiques côte à côte
    results/eval_metrics_bar.png    → graphique barres TIR comparatif
"""

import os
import argparse
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
warnings.filterwarnings('ignore')

from stable_baselines3 import PPO
from glucose_env import GlucoseEnv
from rule_based import RuleBasedController, compute_metrics


# ─────────────────────────────────────────────────────────────
# PATIENTS SIMGLUCOSE
# ─────────────────────────────────────────────────────────────

ALL_PATIENTS = [
    'adolescent#001', 'adolescent#002', 'adolescent#003',
    'adult#001',      'adult#002',      'adult#003',
    'adult#004',      'adult#005',
    'child#001',      'child#002',
]

# Couleurs
C_PPO  = '#534AB7'   # violet — PPO
C_RULE = '#1D9E75'   # vert   — rule-based
C_HYPO = '#E24B4A'   # rouge  — danger
C_TIR  = '#1D9E75'   # vert   — TIR


# ─────────────────────────────────────────────────────────────
# ÉVALUATION PPO
# ─────────────────────────────────────────────────────────────

def evaluate_ppo_patient(model, patient_name, n_days=3,
                          n_episodes=3, seed=0):
    """
    Évalue le modèle PPO sur un patient, moyenne sur n_episodes.

    Returns:
        dict avec métriques moyennées et courbe bg du dernier épisode
    """
    all_metrics = []
    last_bg     = []

    for ep in range(n_episodes):
        env = GlucoseEnv(
            patient_name=patient_name,
            n_days=n_days,
            seed=seed + ep * 100,
        )
        obs, _ = env.reset(seed=seed + ep * 100)
        done   = False
        bg_log = []

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, term, trunc, _ = env.step(action)
            bg_log.append(env.bg)
            done = term or trunc

        m = compute_metrics(bg_log)
        m['bg_curve'] = bg_log
        all_metrics.append(m)
        last_bg = bg_log

    # Moyenner sur les épisodes
    keys = ['tir', 'tbr', 'tar', 'hypo', 'mean', 'std', 'cv', 'n_severe_hypo']
    result = {}
    for k in keys:
        vals = [m[k] for m in all_metrics if k in m]
        result[k] = float(np.mean(vals)) if vals else 0.0

    result['n_severe_hypo'] = int(round(result['n_severe_hypo']))
    result['bg_curve']      = last_bg
    result['patient']       = patient_name
    return result


# ─────────────────────────────────────────────────────────────
# ÉVALUATION RULE-BASED
# ─────────────────────────────────────────────────────────────

def evaluate_rule_patient(patient_name, n_days=3,
                           n_episodes=3, seed=0,
                           isf=50.0, icr=10.0):
    """
    Évalue le contrôleur rule-based sur un patient.
    Réutilise run_simulation() de rule_based.py.
    """
    from rule_based import run_simulation

    all_metrics = []
    last_bg     = []

    for ep in range(n_episodes):
        ctrl   = RuleBasedController(isf=isf, icr=icr, target=100)
        result = run_simulation(
            patient_name, ctrl,
            n_days=n_days,
            seed=seed + ep * 100,
        )
        m = result['metrics']
        m['bg_curve'] = result['bg_history']
        all_metrics.append(m)
        last_bg = result['bg_history']

    keys = ['tir', 'tbr', 'tar', 'hypo', 'mean', 'std', 'cv', 'n_severe_hypo']
    result = {}
    for k in keys:
        vals = [m[k] for m in all_metrics if k in m]
        result[k] = float(np.mean(vals)) if vals else 0.0

    result['n_severe_hypo'] = int(round(result['n_severe_hypo']))
    result['bg_curve']      = last_bg
    result['patient']       = patient_name
    return result


# ─────────────────────────────────────────────────────────────
# TABLEAU COMPARATIF
# ─────────────────────────────────────────────────────────────

def print_comparison_table(df_ppo, df_rule):
    """
    Affiche le tableau comparatif complet dans le terminal.
    Format adapté pour copier-coller dans une présentation.
    """
    W = 82
    print("\n" + "═" * W)
    print("  GLUCOTWIN M3 — PPO vs Rule-Based : Résultats sur 10 patients SimGlucose")
    print("═" * W)

    # En-tête
    print(f"  {'Patient':<18} │ "
          f"{'── PPO ──':^28} │ "
          f"{'── Rule-Based ──':^28} │ "
          f"{'Δ TIR':>6}")
    print(f"  {'':18} │ "
          f"{'TIR':>7} {'TBR':>6} {'Hypo<54':>8} {'BG':>6} │ "
          f"{'TIR':>7} {'TBR':>6} {'Hypo<54':>8} {'BG':>6} │ "
          f"{'PPO-RB':>6}")
    print("  " + "─" * (W - 2))

    delta_tirs = []

    for pat in ALL_PATIENTS:
        ppo_row  = df_ppo[df_ppo['patient'] == pat]
        rule_row = df_rule[df_rule['patient'] == pat]

        if ppo_row.empty or rule_row.empty:
            continue

        p = ppo_row.iloc[0]
        r = rule_row.iloc[0]

        delta_tir  = p['tir'] - r['tir']
        delta_tirs.append(delta_tir)

        # Symboles de qualité
        p_tir_mark  = '✓' if p['tir'] >= 70 else '✗'
        r_tir_mark  = '✓' if r['tir'] >= 70 else '✗'
        delta_mark  = ('+' if delta_tir >= 0 else '') + f"{delta_tir:.1f}%"
        delta_color = '↑' if delta_tir > 1 else ('↓' if delta_tir < -1 else '=')

        print(f"  {pat:<18} │ "
              f"{p['tir']:>6.1f}%{p_tir_mark} "
              f"{p['tbr']:>5.1f}% "
              f"{int(p['n_severe_hypo']):>7}  "
              f"{p['mean']:>5.0f} │ "
              f"{r['tir']:>6.1f}%{r_tir_mark} "
              f"{r['tbr']:>5.1f}% "
              f"{int(r['n_severe_hypo']):>7}  "
              f"{r['mean']:>5.0f} │ "
              f"{delta_mark:>5} {delta_color}")

    print("  " + "─" * (W - 2))

    # Moyennes
    p_mean = df_ppo.mean(numeric_only=True)
    r_mean = df_rule.mean(numeric_only=True)
    delta_mean = p_mean['tir'] - r_mean['tir']
    delta_str  = ('+' if delta_mean >= 0 else '') + f"{delta_mean:.1f}%"

    print(f"  {'MOYENNE':<18} │ "
          f"{p_mean['tir']:>6.1f}%  "
          f"{p_mean['tbr']:>5.1f}% "
          f"{p_mean['n_severe_hypo']:>7.1f}  "
          f"{p_mean['mean']:>5.0f} │ "
          f"{r_mean['tir']:>6.1f}%  "
          f"{r_mean['tbr']:>5.1f}% "
          f"{r_mean['n_severe_hypo']:>7.1f}  "
          f"{r_mean['mean']:>5.0f} │ "
          f"{delta_str:>5}")

    print("═" * W)

    # Résumé
    ppo_wins  = sum(1 for d in delta_tirs if d > 1.0)
    rule_wins = sum(1 for d in delta_tirs if d < -1.0)
    ties      = len(delta_tirs) - ppo_wins - rule_wins

    print(f"\n  PPO ≥ 70% TIR   : "
          f"{(df_ppo['tir'] >= 70).sum()}/{len(df_ppo)} patients")
    print(f"  Rule ≥ 70% TIR  : "
          f"{(df_rule['tir'] >= 70).sum()}/{len(df_rule)} patients")
    print(f"\n  PPO meilleur    : {ppo_wins}/10 patients (Δ TIR > +1%)")
    print(f"  Rule meilleur   : {rule_wins}/10 patients (Δ TIR < -1%)")
    print(f"  Équivalent      : {ties}/10 patients")

    ppo_hypo_total  = int(df_ppo['n_severe_hypo'].sum())
    rule_hypo_total = int(df_rule['n_severe_hypo'].sum())
    print(f"\n  Hypos sévères totales — PPO: {ppo_hypo_total}  "
          f"Rule-Based: {rule_hypo_total}")
    if ppo_hypo_total < rule_hypo_total:
        print(f"  → PPO réduit les hypos sévères de "
              f"{rule_hypo_total - ppo_hypo_total} épisodes ✓")
    print()


# ─────────────────────────────────────────────────────────────
# VISUALISATIONS
# ─────────────────────────────────────────────────────────────

def plot_glucose_curves(ppo_results, rule_results,
                        n_patients=4,
                        save_path='results/eval_glucose_curves.png'):
    """
    Courbes glycémiques côte à côte : PPO (violet) vs Rule-Based (vert).
    Affiche les n_patients premiers patients.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    patients = ALL_PATIENTS[:n_patients]

    fig, axes = plt.subplots(n_patients, 2,
                              figsize=(14, 3 * n_patients),
                              sharex=False)
    if n_patients == 1:
        axes = [axes]

    fig.suptitle('GlucoTwin M3 — Courbes glycémiques : PPO vs Rule-Based',
                 fontsize=12, y=1.01)

    for i, pat in enumerate(patients):
        ppo_r  = next((r for r in ppo_results  if r['patient'] == pat), None)
        rule_r = next((r for r in rule_results if r['patient'] == pat), None)
        if not ppo_r or not rule_r:
            continue

        for ax, result, color, label in [
            (axes[i][0], ppo_r,  C_PPO,  'PPO'),
            (axes[i][1], rule_r, C_RULE, 'Rule-Based'),
        ]:
            bg    = result['bg_curve']
            hours = np.arange(len(bg)) * 5 / 60

            ax.fill_between(hours, 70, 180,
                            alpha=0.08, color=C_TIR)
            ax.fill_between(hours, 0, 70,
                            alpha=0.10, color=C_HYPO)
            ax.plot(hours, bg, color=color, linewidth=0.9, alpha=0.9)

            # Points hypo
            hypo_idx = [j for j, b in enumerate(bg) if b < 70]
            if hypo_idx:
                ax.scatter([hours[j] for j in hypo_idx],
                           [bg[j]    for j in hypo_idx],
                           color=C_HYPO, s=12, zorder=5)

            ax.axhline(70,  color=C_HYPO, lw=0.7, ls='--', alpha=0.5)
            ax.axhline(180, color='#EF9F27', lw=0.7, ls='--', alpha=0.5)

            m = compute_metrics(bg)
            ax.set_title(
                f"{pat} — {label}  |  "
                f"TIR={m['tir']:.0f}%  TBR={m['tbr']:.1f}%",
                fontsize=9
            )
            ax.set_ylim(30, 350)
            ax.set_ylabel('mg/dL', fontsize=8)
            if i == n_patients - 1:
                ax.set_xlabel('Heures', fontsize=8)

    plt.tight_layout()
    plt.savefig(save_path, dpi=130, bbox_inches='tight')
    plt.close()
    print(f"  Courbes sauvegardées : {save_path}")


def plot_metrics_comparison(df_ppo, df_rule,
                             save_path='results/eval_metrics_bar.png'):
    """
    Graphique à barres groupées comparant TIR, TBR, hypos sévères
    pour chaque patient.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    patients   = df_ppo['patient'].tolist()
    short_names = [p.replace('adolescent', 'adol').replace('adult', 'adu')
                   .replace('child', 'chd') for p in patients]
    x = np.arange(len(patients))
    w = 0.35   # largeur barre

    fig, axes = plt.subplots(3, 1, figsize=(14, 10))
    fig.suptitle('GlucoTwin M3 — PPO vs Rule-Based : Métriques par patient',
                 fontsize=12)

    # ── TIR ──────────────────────────────────────────────────
    ax = axes[0]
    bars_ppo  = ax.bar(x - w/2, df_ppo['tir'],  w,
                       label='PPO', color=C_PPO, alpha=0.85)
    bars_rule = ax.bar(x + w/2, df_rule['tir'], w,
                       label='Rule-Based', color=C_RULE, alpha=0.85)
    ax.axhline(70, color='#888780', lw=1, ls='--', label='Cible 70%')
    ax.set_ylabel('TIR (%)', fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels(short_names, rotation=30, ha='right', fontsize=8)
    ax.legend(fontsize=9)
    ax.set_ylim(0, 105)
    ax.set_title('Time in Range (70–180 mg/dL) — plus haut = mieux', fontsize=10)

    # Valeurs sur les barres
    for bar in bars_ppo:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, h + 0.5,
                f'{h:.0f}', ha='center', va='bottom', fontsize=7,
                color='#3C3489')
    for bar in bars_rule:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, h + 0.5,
                f'{h:.0f}', ha='center', va='bottom', fontsize=7,
                color='#085041')

    # ── TBR ──────────────────────────────────────────────────
    ax = axes[1]
    ax.bar(x - w/2, df_ppo['tbr'],  w,
           label='PPO', color=C_PPO, alpha=0.85)
    ax.bar(x + w/2, df_rule['tbr'], w,
           label='Rule-Based', color=C_RULE, alpha=0.85)
    ax.axhline(4, color=C_HYPO, lw=1, ls='--', label='Seuil 4%')
    ax.set_ylabel('TBR (%)', fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels(short_names, rotation=30, ha='right', fontsize=8)
    ax.legend(fontsize=9)
    ax.set_title('Time Below Range (< 70 mg/dL) — plus bas = mieux', fontsize=10)

    # ── Hypos sévères ─────────────────────────────────────────
    ax = axes[2]
    ax.bar(x - w/2, df_ppo['n_severe_hypo'],  w,
           label='PPO', color=C_PPO, alpha=0.85)
    ax.bar(x + w/2, df_rule['n_severe_hypo'], w,
           label='Rule-Based', color=C_RULE, alpha=0.85)
    ax.axhline(0, color='#888780', lw=0.5)
    ax.set_ylabel('Nb épisodes', fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels(short_names, rotation=30, ha='right', fontsize=8)
    ax.legend(fontsize=9)
    ax.set_title('Hypoglycémies sévères (< 54 mg/dL) — plus bas = mieux',
                 fontsize=10)

    plt.tight_layout()
    plt.savefig(save_path, dpi=130, bbox_inches='tight')
    plt.close()
    print(f"  Graphique barres sauvegardé : {save_path}")


def plot_radar(df_ppo, df_rule,
               save_path='results/eval_radar.png'):
    """
    Radar chart : profil global PPO vs Rule-Based.
    Idéal pour la slide de présentation jury.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    p = df_ppo.mean(numeric_only=True)
    r = df_rule.mean(numeric_only=True)

    # 5 axes normalisés entre 0 et 1 (1 = meilleur)
    metrics = ['TIR', 'TBR\n(inv)', 'Hypo<54\n(inv)', 'BG stable\n(CV inv)', 'BG cible']
    ppo_vals  = [
        p['tir'] / 100,
        1 - min(p['tbr'] / 10, 1),
        1 - min(p['n_severe_hypo'] / 20, 1),
        1 - min(p['cv'] / 50, 1),
        1 - abs(p['mean'] - 120) / 200,
    ]
    rule_vals = [
        r['tir'] / 100,
        1 - min(r['tbr'] / 10, 1),
        1 - min(r['n_severe_hypo'] / 20, 1),
        1 - min(r['cv'] / 50, 1),
        1 - abs(r['mean'] - 120) / 200,
    ]

    angles = np.linspace(0, 2 * np.pi, len(metrics),
                          endpoint=False).tolist()
    ppo_vals  += [ppo_vals[0]]
    rule_vals += [rule_vals[0]]
    angles    += [angles[0]]

    fig, ax = plt.subplots(figsize=(7, 7),
                            subplot_kw=dict(polar=True))
    ax.plot(angles, ppo_vals,  color=C_PPO,  lw=2, label='PPO')
    ax.fill(angles, ppo_vals,  color=C_PPO,  alpha=0.15)
    ax.plot(angles, rule_vals, color=C_RULE, lw=2, label='Rule-Based')
    ax.fill(angles, rule_vals, color=C_RULE, alpha=0.15)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(metrics, fontsize=10)
    ax.set_ylim(0, 1)
    ax.set_yticks([0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(['25%', '50%', '75%', '100%'], fontsize=7)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=10)
    ax.set_title('Profil global — PPO vs Rule-Based\n(vers l\'extérieur = meilleur)',
                 fontsize=11, pad=20)

    plt.tight_layout()
    plt.savefig(save_path, dpi=130, bbox_inches='tight')
    plt.close()
    print(f"  Radar chart sauvegardé   : {save_path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

def run_evaluation(model_path, n_days=3, n_episodes=3, seed=42):

    print("\n╔══════════════════════════════════════════════╗")
    print("║   GlucoTwin M3 — Évaluation comparative      ║")
    print("╚══════════════════════════════════════════════╝\n")

    os.makedirs('results', exist_ok=True)

    # ── Charger le modèle PPO ─────────────────────────────────
    print(f"[1/4] Chargement du modèle PPO : {model_path}")
    dummy_env = GlucoseEnv(patient_name='adult#001', n_days=1, seed=0)
    model     = PPO.load(model_path, env=dummy_env)
    print(f"  Modèle chargé. Politique : {model.policy.__class__.__name__}")

    # ── Évaluation sur tous les patients ─────────────────────
    print(f"\n[2/4] Évaluation sur {len(ALL_PATIENTS)} patients "
          f"({n_days}j × {n_episodes} épisodes chacun) ...")
    print("  Patient               PPO TIR    Rule TIR    Δ")
    print("  " + "─" * 52)

    ppo_results  = []
    rule_results = []

    for i, patient in enumerate(ALL_PATIENTS):
        pat_seed = seed + i * 37

        # PPO
        ppo_r = evaluate_ppo_patient(
            model, patient, n_days=n_days,
            n_episodes=n_episodes, seed=pat_seed
        )

        # Rule-Based
        rule_r = evaluate_rule_patient(
            patient, n_days=n_days,
            n_episodes=n_episodes, seed=pat_seed
        )

        ppo_results.append(ppo_r)
        rule_results.append(rule_r)

        delta = ppo_r['tir'] - rule_r['tir']
        arrow = '↑' if delta > 1 else ('↓' if delta < -1 else '=')
        print(f"  {patient:<22} {ppo_r['tir']:>5.1f}%    "
              f"{rule_r['tir']:>5.1f}%    "
              f"{'+' if delta >= 0 else ''}{delta:.1f}% {arrow}")

    # ── Construire DataFrames ─────────────────────────────────
    cols = ['patient', 'tir', 'tbr', 'tar', 'hypo',
            'mean', 'std', 'cv', 'n_severe_hypo']
    df_ppo  = pd.DataFrame([{c: r[c] for c in cols} for r in ppo_results])
    df_rule = pd.DataFrame([{c: r[c] for c in cols} for r in rule_results])

    # ── Tableau comparatif ────────────────────────────────────
    print(f"\n[3/4] Tableau comparatif complet")
    print_comparison_table(df_ppo, df_rule)

    # ── Sauvegarder CSV ───────────────────────────────────────
    df_ppo['controller']  = 'PPO'
    df_rule['controller'] = 'RuleBased'
    df_all = pd.concat([df_ppo, df_rule], ignore_index=True)
    csv_path = 'results/comparison_table.csv'
    df_all.to_csv(csv_path, index=False, float_format='%.2f')
    print(f"  CSV exporté : {csv_path}")

    # ── Graphiques ────────────────────────────────────────────
    print(f"\n[4/4] Génération des graphiques ...")
    plot_glucose_curves(ppo_results, rule_results, n_patients=4)
    plot_metrics_comparison(df_ppo, df_rule)
    plot_radar(df_ppo, df_rule)

    print("\n╔══════════════════════════════════════════════╗")
    print("║   Évaluation terminée.                       ║")
    print("║   Prochaine étape : app.py (Streamlit)        ║")
    print("╚══════════════════════════════════════════════╝\n")


# ─────────────────────────────────────────────────────────────
# POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='GlucoTwin M3 — Évaluation PPO vs Rule-Based'
    )
    parser.add_argument(
        '--model',
        type=str,
        default='models/glucotwin_m3_best/best_model',
        help='Chemin vers le modèle PPO sauvegardé (sans .zip)'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=3,
        help='Jours de simulation par épisode (défaut 3)'
    )
    parser.add_argument(
        '--episodes',
        type=int,
        default=3,
        help='Épisodes par patient pour moyenner (défaut 3)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Graine aléatoire (défaut 42)'
    )
    args = parser.parse_args()

    run_evaluation(
        model_path=args.model,
        n_days=args.days,
        n_episodes=args.episodes,
        seed=args.seed,
    )