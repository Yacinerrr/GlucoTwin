"""
GlucoTwin M3 — Application Streamlit de démonstration
======================================================
Étape 6 (finale) du plan de construction.

Usage :
    streamlit run app.py

Fonctionnalités :
    - Saisie glycémie actuelle + glucides repas
    - Recommandation dose PPO vs Rule-Based côte à côte
    - Courbe glycémique simulée sur 4h
    - Tableau comparatif sur 10 patients (depuis results/comparison_table.csv)
    - Disclaimer médical obligatoire
    - Mode Ramadan
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import streamlit as st
import os
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────────────────────
# CONFIG PAGE
# ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="GlucoTwin M3",
    page_icon="💉",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────────────────────────

BG_HYPO      = 70
BG_HYPER     = 180
BG_HYPO_SEV  = 54
BG_HYPER_SEV = 250
DOSE_MAX     = 15.0
C_PPO        = '#534AB7'
C_RULE       = '#1D9E75'
C_HYPO       = '#E24B4A'
C_HYPER      = '#EF9F27'
C_TIR        = '#1D9E75'

# ─────────────────────────────────────────────────────────────
# CSS CUSTOM
# ─────────────────────────────────────────────────────────────

st.markdown("""
<style>
    .metric-card {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px 24px;
        border: 1px solid #e0e0e0;
        text-align: center;
        margin-bottom: 8px;
    }
    .metric-card .label {
        font-size: 13px;
        color: #666;
        margin-bottom: 6px;
    }
    .metric-card .value {
        font-size: 36px;
        font-weight: 600;
        line-height: 1.1;
    }
    .metric-card .sub {
        font-size: 12px;
        color: #888;
        margin-top: 4px;
    }
    .disclaimer {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 14px 18px;
        font-size: 13px;
        color: #856404;
        margin: 12px 0;
    }
    .disclaimer strong { color: #6d4c00; }
    .zone-badge {
        display: inline-block;
        border-radius: 20px;
        padding: 3px 12px;
        font-size: 12px;
        font-weight: 600;
    }
    .stAlert { border-radius: 8px; }
    h1 { font-size: 28px !important; }
    h2 { font-size: 20px !important; }
    h3 { font-size: 16px !important; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────
# GUARDIAN LAYER  (inline — pas besoin d'importer glucose_env)
# ─────────────────────────────────────────────────────────────

def guardian_clip(dose_raw, bg, isf=50.0, target=100.0,
                  dose_max=DOSE_MAX, bg_low=90.0):
    """Applique les règles de sécurité médicales à la dose."""
    if bg < bg_low:
        return 0.0, True
    corr_max   = max(0.0, (bg - target) / isf)
    dose       = min(dose_raw, corr_max + 5.0, dose_max)
    dose       = max(0.0, dose)
    dose_safe  = round(dose * 2) / 2
    blocked    = dose_safe < dose_raw * 0.9
    return dose_safe, blocked


# ─────────────────────────────────────────────────────────────
# RULE-BASED CONTROLLER
# ─────────────────────────────────────────────────────────────

def rule_based_dose(bg, carbs, isf=50.0, icr=10.0, target=100.0):
    """Formule bolus médicale standard."""
    correction = max(0.0, bg - target) / isf
    meal       = carbs / icr if carbs > 0 else 0.0
    dose_raw   = correction + meal
    dose_safe, blocked = guardian_clip(dose_raw, bg, isf, target)
    return dose_safe, {
        'correction': round(correction, 2),
        'meal':       round(meal, 2),
        'raw':        round(dose_raw, 2),
        'blocked':    blocked,
    }


# ─────────────────────────────────────────────────────────────
# CHARGEMENT MODÈLE PPO
# ─────────────────────────────────────────────────────────────

@st.cache_resource
def load_ppo_model(model_path):
    """Charge le modèle PPO une seule fois (mis en cache)."""
    try:
        from stable_baselines3 import PPO
        from glucose_env import GlucoseEnv
        env   = GlucoseEnv(patient_name='adult#001', n_days=1, seed=0)
        model = PPO.load(model_path, env=env)
        return model, None
    except FileNotFoundError:
        return None, f"Modèle introuvable : {model_path}"
    except Exception as e:
        return None, str(e)


def get_ppo_dose(model, bg, carbs, isf=50.0, icr=10.0):
    """Construit le state vector et interroge le modèle PPO."""
    try:
        from collections import deque
        hour     = 12.0   # midi par défaut dans la démo
        bg_hist  = deque([bg] * 12, maxlen=12)

        obs = np.array([
            *[np.clip(b / 400.0, 0, 1) for b in bg_hist],
            np.clip(bg / 400.0, 0, 1),
            0.0,
            np.clip(carbs / 100.0, 0, 1),
            float(np.sin(2 * np.pi * hour / 24)),
            float(np.cos(2 * np.pi * hour / 24)),
            0.5,
        ], dtype=np.float32)

        action, _ = model.predict(obs, deterministic=True)
        dose_raw  = float(action[0])
        dose_safe, blocked = guardian_clip(dose_raw, bg, isf)
        return dose_safe, {'raw': round(dose_raw, 2), 'blocked': blocked}

    except Exception as e:
        return None, {'error': str(e)}


# ─────────────────────────────────────────────────────────────
# SIMULATION COURBE 4H
# ─────────────────────────────────────────────────────────────

def simulate_4h_curve(bg_start, dose, carbs,
                       isf=50.0, icr=10.0, seed=42):
    """
    Simule l'évolution glycémique sur 4h (48 steps de 5 min)
    à partir de la glycémie actuelle, de la dose et des glucides.

    Modèle simplifié :
      - Pic glucidique à t=45min (montée rapide)
      - Action insuline à t=20min (descente progressive)
      - Bruit CGM gaussien réaliste ±5 mg/dL
    """
    np.random.seed(seed)
    n_steps = 48
    bg      = float(bg_start)
    curve   = [bg]

    # Profil absorption glucidique (courbe de Hogben)
    meal_effect = np.zeros(n_steps)
    if carbs > 0:
        peak_step = 9   # pic à 45 min
        for t in range(n_steps):
            meal_effect[t] = (carbs / icr) * (
                np.exp(-((t - peak_step) ** 2) / 18)
            ) * 2.5

    # Profil action insuline (début à t=4, pic t=20, fin t=48)
    insulin_effect = np.zeros(n_steps)
    if dose > 0:
        for t in range(4, n_steps):
            t_shifted = t - 4
            insulin_effect[t] = dose * isf * (
                np.exp(-((t_shifted - 16) ** 2) / 80)
            ) * 0.08

    for t in range(1, n_steps):
        delta  =  meal_effect[t] - insulin_effect[t]
        noise  =  np.random.normal(0, 3)
        bg     =  float(np.clip(bg + delta + noise, 55, 380))
        curve.append(bg)

    return np.array(curve)


# ─────────────────────────────────────────────────────────────
# GRAPHIQUE COURBE 4H
# ─────────────────────────────────────────────────────────────

def plot_4h_curves(bg_start, dose_ppo, dose_rule, carbs,
                   isf=50.0, icr=10.0):
    """Trace les courbes simulées PPO vs rule-based sur 4h."""
    curve_ppo  = simulate_4h_curve(bg_start, dose_ppo,  carbs, isf, icr, seed=42)
    curve_rule = simulate_4h_curve(bg_start, dose_rule, carbs, isf, icr, seed=42)
    minutes    = np.arange(len(curve_ppo)) * 5

    fig, ax = plt.subplots(figsize=(10, 4))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')

    # Zones glycémiques
    ax.fill_between(minutes, BG_HYPO, BG_HYPER,
                    alpha=0.07, color=C_TIR, label='Zone TIR (70–180)')
    ax.fill_between(minutes, 0, BG_HYPO,
                    alpha=0.10, color=C_HYPO)
    ax.fill_between(minutes, BG_HYPER, 400,
                    alpha=0.06, color=C_HYPER)

    # Lignes seuils
    ax.axhline(BG_HYPO,  color=C_HYPO,  lw=0.8, ls='--', alpha=0.6)
    ax.axhline(BG_HYPER, color=C_HYPER, lw=0.8, ls='--', alpha=0.6)

    # Courbes
    ax.plot(minutes, curve_ppo,  color=C_PPO,  lw=2.5,
            label=f'PPO  ({dose_ppo:.1f} U)')
    ax.plot(minutes, curve_rule, color=C_RULE, lw=2.0, ls='--',
            label=f'Rule-Based ({dose_rule:.1f} U)')

    # Point départ
    ax.scatter([0], [bg_start], color='#185FA5', s=60, zorder=5)

    ax.set_xlabel('Temps (minutes)', fontsize=10)
    ax.set_ylabel('Glycémie (mg/dL)', fontsize=10)
    ax.set_xlim(0, 235)
    ax.set_ylim(30, 360)
    ax.set_xticks([0, 30, 60, 90, 120, 150, 180, 210, 240])
    ax.set_xticklabels(['0', '30min', '1h', '1h30', '2h',
                         '2h30', '3h', '3h30', '4h'], fontsize=8)
    ax.legend(fontsize=9, loc='upper right')

    # TIR final pour chaque courbe
    tir_ppo  = np.mean((curve_ppo  >= 70) & (curve_ppo  <= 180)) * 100
    tir_rule = np.mean((curve_rule >= 70) & (curve_rule <= 180)) * 100
    ax.text(0.02, 0.97,
            f'TIR simulé — PPO: {tir_ppo:.0f}%  |  Rule-Based: {tir_rule:.0f}%',
            transform=ax.transAxes, fontsize=9, va='top',
            bbox=dict(boxstyle='round,pad=0.3', fc='white',
                      ec='#cccccc', alpha=0.9))

    plt.tight_layout()
    return fig


# ─────────────────────────────────────────────────────────────
# HELPERS AFFICHAGE
# ─────────────────────────────────────────────────────────────

def bg_zone_label(bg):
    if bg < BG_HYPO_SEV:
        return '🔴 Hypoglycémie sévère', '#E24B4A'
    elif bg < BG_HYPO:
        return '🟠 Hypoglycémie', '#EF9F27'
    elif bg <= BG_HYPER:
        return '🟢 Zone cible', '#1D9E75'
    elif bg <= BG_HYPER_SEV:
        return '🟡 Hyperglycémie modérée', '#EF9F27'
    else:
        return '🔴 Hyperglycémie sévère', '#E24B4A'


def dose_card_html(dose, label, color, detail=None):
    detail_html = f'<div class="sub">{detail}</div>' if detail else ''
    return f"""
    <div class="metric-card" style="border-top: 4px solid {color};">
        <div class="label">{label}</div>
        <div class="value" style="color:{color};">
            {dose:.1f} <span style="font-size:18px">U</span>
        </div>
        {detail_html}
    </div>
    """


# ─────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────

with st.sidebar:
    st.image("https://via.placeholder.com/200x60/534AB7/ffffff?text=GlucoTwin",
             use_container_width=True)
    st.markdown("### Paramètres patient")

    isf = st.slider(
        "ISF — Insulin Sensitivity Factor (mg/dL par U)",
        min_value=20, max_value=100, value=50, step=5,
        help="Combien 1 unité d'insuline fait baisser la glycémie"
    )
    icr = st.slider(
        "ICR — Insulin-to-Carb Ratio (g glucides par U)",
        min_value=5, max_value=20, value=10, step=1,
        help="Combien de glucides couvre 1 unité d'insuline"
    )

    st.markdown("---")
    st.markdown("### Options")

    ramadan_mode = st.toggle("🌙 Mode Ramadan", value=False,
        help="Adapte les recommandations pour le jeûne du Ramadan")

    show_comparison = st.toggle("📊 Tableau comparatif 10 patients",
                                 value=True)

    st.markdown("---")
    st.markdown("### Modèle PPO")
    model_path = st.text_input(
        "Chemin modèle",
        value="models/glucotwin_m3_best/best_model",
        help="Chemin vers le fichier .zip du modèle PPO (sans extension)"
    )

    st.markdown("---")
    st.markdown(
        "<div style='font-size:11px;color:#888;'>"
        "GlucoTwin v1.0 — Hackathon 2025<br>"
        "Algérie · MENA · MedTech IA"
        "</div>",
        unsafe_allow_html=True
    )


# ─────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────

col_title, col_badge = st.columns([4, 1])
with col_title:
    st.title("💉 GlucoTwin M3 — Recommandeur de dose insuline")
    st.caption("Votre jumeau numérique diabétique · Intelligence Artificielle · "
               "Prototype hackathon · Non certifié CE")
with col_badge:
    if ramadan_mode:
        st.info("🌙 Mode\nRamadan actif")

# Disclaimer médical — toujours visible
st.markdown("""
<div class="disclaimer">
    <strong>⚠️ Avertissement médical obligatoire</strong><br>
    GlucoTwin est un <strong>outil d'aide à la décision uniquement</strong>.
    Il ne remplace pas l'avis d'un médecin ou endocrinologue.
    Ne modifiez jamais votre traitement sans consulter votre médecin.
    En cas d'hypoglycémie, agissez immédiatement selon les protocoles médicaux.
    <strong>Consultez votre médecin avant toute décision thérapeutique.</strong>
</div>
""", unsafe_allow_html=True)

st.markdown("---")


# ─────────────────────────────────────────────────────────────
# SAISIE PATIENT
# ─────────────────────────────────────────────────────────────

st.markdown("## Situation actuelle")

col1, col2, col3 = st.columns([1, 1, 1])

with col1:
    bg_current = st.number_input(
        "🩸 Glycémie actuelle (mg/dL)",
        min_value=40, max_value=400,
        value=160,
        step=1,
        help="Votre mesure CGM ou lecteur glycémique actuelle"
    )
    zone_label, zone_color = bg_zone_label(bg_current)
    st.markdown(
        f'<span class="zone-badge" style="background:{zone_color}22;'
        f'color:{zone_color};border:1px solid {zone_color}55;">'
        f'{zone_label}</span>',
        unsafe_allow_html=True
    )

with col2:
    if ramadan_mode:
        meal_label = "🌙 Glucides Iftar/Suhur (g)"
    else:
        meal_label = "🍽️ Glucides du repas (g)"

    carbs = st.number_input(
        meal_label,
        min_value=0, max_value=200,
        value=60,
        step=5,
        help="Estimation des glucides du repas (0 si pas de repas)"
    )

with col3:
    st.markdown("<br>", unsafe_allow_html=True)
    compute_btn = st.button(
        "⚡ Calculer la recommandation",
        type="primary",
        use_container_width=True
    )
    st.caption("ISF={} mg/dL/U · ICR={} g/U".format(isf, icr))


# ─────────────────────────────────────────────────────────────
# CALCUL ET RÉSULTATS
# ─────────────────────────────────────────────────────────────

if compute_btn or True:   # afficher dès le chargement

    # ── Rule-Based ───────────────────────────────────────────
    dose_rule, info_rule = rule_based_dose(
        bg_current, carbs, isf=isf, icr=icr
    )

    # ── PPO ──────────────────────────────────────────────────
    model, model_err = load_ppo_model(model_path)

    if model is not None:
        dose_ppo, info_ppo = get_ppo_dose(
            model, bg_current, carbs, isf=isf, icr=icr
        )
        ppo_available = dose_ppo is not None
    else:
        ppo_available = False
        dose_ppo      = dose_rule   # fallback pour la courbe

    st.markdown("---")
    st.markdown("## Recommandation de dose")

    # ── Alerte hypoglycémie ───────────────────────────────────
    if bg_current < BG_HYPO:
        st.error(
            f"🚨 **HYPOGLYCÉMIE DÉTECTÉE ({bg_current} mg/dL)** — "
            "Aucune insuline. Prenez 15g de glucides rapides "
            "(jus de fruit, sucre). Remesures dans 15 minutes."
        )

    elif bg_current < 90:
        st.warning(
            f"⚠️ Glycémie basse ({bg_current} mg/dL) — "
            "Le Guardian Layer bloque toute dose d'insuline par sécurité."
        )

    # ── Cartes doses ─────────────────────────────────────────
    col_ppo, col_rule, col_delta = st.columns([1, 1, 1])

    with col_ppo:
        if ppo_available:
            detail = (f"Brute: {info_ppo.get('raw', '?'):.1f}U"
                      + (" · Guardian actif" if info_ppo.get('blocked') else ""))
            st.markdown(
                dose_card_html(dose_ppo, "🤖 Dose PPO (M3)", C_PPO, detail),
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                dose_card_html(0.0, "🤖 Dose PPO (M3)", "#888",
                               "Modèle non chargé"),
                unsafe_allow_html=True
            )
            if model_err:
                st.caption(f"ℹ️ {model_err}")

    with col_rule:
        detail_rule = (
            f"Correction: {info_rule['correction']:.1f}U + "
            f"Repas: {info_rule['meal']:.1f}U"
            + (" · Guardian actif" if info_rule['blocked'] else "")
        )
        st.markdown(
            dose_card_html(dose_rule, "📐 Dose Rule-Based", C_RULE, detail_rule),
            unsafe_allow_html=True
        )

    with col_delta:
        if ppo_available:
            delta = dose_ppo - dose_rule
            delta_color = C_PPO if abs(delta) > 0.4 else '#888780'
            delta_str   = f"{'+' if delta >= 0 else ''}{delta:.1f} U"
            st.markdown(
                dose_card_html(abs(delta),
                               "Δ Différence", delta_color,
                               f"PPO {'↑' if delta > 0 else '↓' if delta < 0 else '='} Rule-Based"),
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                dose_card_html(0.0, "Δ Différence", "#888", "—"),
                unsafe_allow_html=True
            )

    # ── Détail calcul rule-based ──────────────────────────────
    with st.expander("📋 Détail du calcul rule-based", expanded=False):
        c1, c2, c3 = st.columns(3)
        c1.metric("Correction glycémique",
                  f"{info_rule['correction']:.1f} U",
                  f"({bg_current} - 100) / {isf}")
        c2.metric("Dose repas",
                  f"{info_rule['meal']:.1f} U",
                  f"{carbs}g / {icr}")
        c3.metric("Dose brute totale",
                  f"{info_rule['raw']:.1f} U",
                  "avant Guardian Layer")

        if info_rule['blocked']:
            st.info("🛡️ **Guardian Layer actif** — "
                    "La dose a été réduite par les règles de sécurité médicales.")
        else:
            st.success("🛡️ Guardian Layer : dose dans les limites de sécurité.")

    st.markdown("---")

    # ─────────────────────────────────────────────────────────
    # COURBE 4H
    # ─────────────────────────────────────────────────────────

    st.markdown("## Simulation glycémique sur 4h")
    st.caption(
        "Simulation basée sur un modèle pharmacocinétique simplifié. "
        "Non représentative des variations individuelles réelles."
    )

    fig = plot_4h_curves(
        bg_start  = bg_current,
        dose_ppo  = dose_ppo  if ppo_available else dose_rule,
        dose_rule = dose_rule,
        carbs     = carbs,
        isf       = isf,
        icr       = icr,
    )
    st.pyplot(fig, use_container_width=True)
    plt.close()

    # Alertes sur la simulation
    curve_check = simulate_4h_curve(
        bg_current, dose_rule, carbs, isf, icr, seed=42
    )
    min_bg = curve_check.min()
    max_bg = curve_check.max()

    if min_bg < BG_HYPO:
        st.warning(
            f"⚠️ La simulation prédit une glycémie de **{min_bg:.0f} mg/dL** "
            f"dans les 4 prochaines heures. Restez vigilant."
        )
    if max_bg > BG_HYPER_SEV:
        st.info(
            f"ℹ️ La simulation prédit un pic à **{max_bg:.0f} mg/dL**. "
            f"Vérifiez votre glycémie dans 1–2h."
        )


# ─────────────────────────────────────────────────────────────
# TABLEAU COMPARATIF 10 PATIENTS
# ─────────────────────────────────────────────────────────────

if show_comparison:
    st.markdown("---")
    st.markdown("## Performances sur 10 patients SimGlucose")
    st.caption(
        "Résultats d'évaluation sur les 10 patients virtuels du simulateur "
        "SimGlucose (FDA-validé). Moyenne sur 3 épisodes de 3 jours chacun."
    )

    csv_path = 'results/comparison_table.csv'

    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)

        df_ppo  = df[df['controller'] == 'PPO'].copy()
        df_rule = df[df['controller'] == 'RuleBased'].copy()

        # Métriques globales
        col_m1, col_m2, col_m3, col_m4 = st.columns(4)
        col_m1.metric(
            "TIR moyen — PPO",
            f"{df_ppo['tir'].mean():.1f}%",
            f"{df_ppo['tir'].mean() - df_rule['tir'].mean():+.1f}% vs Rule"
        )
        col_m2.metric(
            "TIR moyen — Rule-Based",
            f"{df_rule['tir'].mean():.1f}%",
        )
        col_m3.metric(
            "Patients TIR ≥ 70% — PPO",
            f"{(df_ppo['tir'] >= 70).sum()}/10",
            f"{(df_ppo['tir'] >= 70).sum() - (df_rule['tir'] >= 70).sum():+d} vs Rule"
        )
        col_m4.metric(
            "Hypos sévères — PPO",
            f"{int(df_ppo['n_severe_hypo'].sum())}",
            f"{int(df_ppo['n_severe_hypo'].sum()) - int(df_rule['n_severe_hypo'].sum()):+d} vs Rule",
            delta_color="inverse"
        )

        # Tableau formaté
        df_display = df_ppo[['patient', 'tir', 'tbr', 'n_severe_hypo', 'mean']].copy()
        df_display = df_display.rename(columns={
            'patient': 'Patient',
            'tir': 'TIR PPO (%)',
            'tbr': 'TBR PPO (%)',
            'n_severe_hypo': 'Hypos sév.',
            'mean': 'BG moy (mg/dL)'
        })
        df_display['TIR Rule (%)'] = df_rule['tir'].values
        df_display['Δ TIR'] = (
            df_ppo['tir'].values - df_rule['tir'].values
        ).round(1)

        # Colorer les lignes selon TIR
        def color_tir(val):
            if isinstance(val, float):
                if val >= 70:
                    return 'color: #1D9E75; font-weight: 600'
                elif val < 50:
                    return 'color: #E24B4A'
            return ''

        def color_delta(val):
            if isinstance(val, float):
                if val > 1:
                    return 'color: #534AB7; font-weight: 600'
                elif val < -1:
                    return 'color: #E24B4A'
            return ''

        styled = (df_display.style
                  .applymap(color_tir,    subset=['TIR PPO (%)', 'TIR Rule (%)'])
                  .applymap(color_delta,  subset=['Δ TIR'])
                  .format({'TIR PPO (%)': '{:.1f}',
                           'TBR PPO (%)': '{:.1f}',
                           'TIR Rule (%)': '{:.1f}',
                           'BG moy (mg/dL)': '{:.0f}',
                           'Δ TIR': '{:+.1f}'}))
        st.dataframe(styled, use_container_width=True, hide_index=True)

    else:
        st.info(
            "📂 Aucune donnée d'évaluation trouvée. "
            "Lancez `python evaluate.py` pour générer "
            "`results/comparison_table.csv`."
        )
        # Tableau de démonstration avec données fictives
        demo_data = {
            'Patient':        ['adolescent#001','adult#001','adult#002',
                               'child#001','adolescent#002'],
            'TIR PPO (%)':    [76.5, 74.2, 78.3, 80.8, 71.8],
            'TIR Rule (%)':   [70.5, 74.6, 67.9, 74.2, 72.7],
            'TBR PPO (%)':    [4.1,  3.6,  3.6,  2.9,  4.6],
            'Hypos sév. PPO': [4,    3,    3,    2,    5],
            'Δ TIR':          [+6.0, -0.4, +10.4, +6.6, -0.9],
        }
        st.dataframe(
            pd.DataFrame(demo_data),
            use_container_width=True,
            hide_index=True
        )
        st.caption("⚠️ Données de démonstration — lancez evaluate.py pour les vraies métriques.")


# ─────────────────────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────────────────────

st.markdown("---")
st.markdown("""
<div style='text-align:center; color:#888; font-size:12px; padding:8px 0'>
    GlucoTwin M3 · Hackathon 2025 · Prototype de recherche ·
    <strong>Non certifié CE · Consultation médicale obligatoire</strong><br>
    Simulateur : SimGlucose (FDA T1DM) · RL : PPO (Stable-Baselines3) ·
    Marché : Algérie → MENA
</div>
""", unsafe_allow_html=True)