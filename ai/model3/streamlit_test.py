"""
Streamlit App for SAC Model Testing
Simple interface to test insulin dose predictions
"""

import streamlit as st
import numpy as np
from datetime import datetime, timedelta
import logging
from pathlib import Path

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import VecNormalize
from glucose_env import T1DSimulationEnv, GuardianLayer


# ────────────────────────────────────────────────
# Rule-Based Dosing
# ────────────────────────────────────────────────
def rule_based_dose(bg, carbs, isf=50.0, icr=10.0, target=100.0):
    """
    Standard medical bolus formula.
    Dose = Correction Dose + Meal Dose
    """
    # Correction dose for current glucose
    correction = max(0.0, bg - target) / isf
    
    # Meal dose for carbs
    meal = carbs / icr if carbs > 0 else 0.0
    
    # Total raw dose
    dose_raw = correction + meal
    
    # Apply Guardian safety layer
    guardian = GuardianLayer(isf=isf, target_bg=target)
    safe_dose, is_blocked = guardian.clip_dose(dose_raw, bg)
    
    return safe_dose, {
        'correction': round(correction, 2),
        'meal': round(meal, 2),
        'raw': round(dose_raw, 2),
        'blocked': is_blocked,
    }

# ────────────────────────────────────────────────
# Page Config
# ────────────────────────────────────────────────
st.set_page_config(
    page_title="SAC Model Tester",
    page_icon="💊",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🩺 SAC Model - Insulin Dose Prediction Test")
st.markdown("Test the trained SAC (Soft Actor-Critic) model for T1D insulin dosing")

# ────────────────────────────────────────────────
# Sidebar - Configuration
# ────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuration")
    
    model_dir = Path("models_sac")
    available_models = []
    if model_dir.exists():
        available_models = [
            str(f.relative_to(model_dir)) 
            for f in model_dir.rglob("*.zip") 
            if "best_model" in f.name or "sac_final" in f.name
        ]
    
    if available_models:
        selected_model = st.selectbox(
            "Select Model",
            available_models,
            index=0
        )
        model_path = model_dir / selected_model
    else:
        st.error("❌ No models found in models_sac/")
        model_path = None
    
    st.divider()
    
    # Medical parameters
    st.subheader("Medical Parameters")
    isf = st.slider("Insulin Sensitivity Factor (ISF)", 20, 100, 50, 5)
    icr = st.slider("Insulin-to-Carb Ratio (ICR)", 5, 20, 10, 1)
    target_bg = st.slider("Target Glucose (mg/dL)", 80, 150, 100, 5)
    
    st.divider()
    
    # Simulation parameters
    st.subheader("Simulation Settings")
    num_test_episodes = st.number_input("Number of Test Episodes", 1, 20, 5)
    
# ────────────────────────────────────────────────
# Main Content - Two Columns
# ────────────────────────────────────────────────
col1, col2 = st.columns(2)

with col1:
    st.header("🧪 Single Prediction Test")
    
    # Input parameters
    st.subheader("Input Values")
    current_glucose = st.number_input(
        "Current Glucose (mg/dL)",
        min_value=40,
        max_value=400,
        value=150,
        step=5,
        help="Current blood glucose reading"
    )
    
    carbs_intake = st.number_input(
        "Carbs Intake (grams)",
        min_value=0,
        max_value=200,
        value=30,
        step=5,
        help="Grams of carbohydrates to be consumed"
    )
    
    # Prediction button
    if st.button("🚀 Get Insulin Recommendation", key="predict_btn", use_container_width=True):
        if model_path and model_path.exists():
            with st.spinner("Loading model and computing predictions..."):
                try:
                    # Load model
                    model = SAC.load(str(model_path))
                    
                    # Create environment
                    env = T1DSimulationEnv()
                    
                    # Reset environment
                    obs, _ = env.reset()
                    
                    # Set custom glucose and carbs
                    env.cgm_true = current_glucose
                    env.cgm_history = np.ones(12) * current_glucose
                    env.meal_carbs = carbs_intake
                    
                    # Get updated observation
                    obs = env._get_observation()
                    
                    # ===== SAC Model Prediction =====
                    action, _states = model.predict(obs, deterministic=True)
                    sac_dose = float(action[0])  # Extract dose from action
                    
                    # Apply Guardian safety layer
                    guardian = GuardianLayer(isf=isf, target_bg=target_bg)
                    sac_safe_dose, sac_is_blocked = guardian.clip_dose(sac_dose, current_glucose)
                    
                    # Calculate correction and carb doses
                    correction_dose = max(0, (current_glucose - target_bg) / isf)
                    carb_dose = carbs_intake / icr
                    
                    # Step environment with SAC action
                    obs_next, sac_reward, terminated, truncated, info = env.step(action)
                    
                    # ===== Rule-Based Prediction =====
                    rule_dose, rule_info = rule_based_dose(
                        current_glucose, 
                        carbs_intake, 
                        isf=isf, 
                        icr=icr, 
                        target=target_bg
                    )
                    
                    # Step environment with rule-based action
                    env.cgm_true = current_glucose
                    env.cgm_history = np.ones(12) * current_glucose
                    env.meal_carbs = carbs_intake
                    obs_rule = env._get_observation()
                    obs_next_rule, rule_reward, terminated_rule, truncated_rule, info_rule = env.step(
                        np.array([rule_dose])
                    )
                    
                    # Display results
                    st.success("✅ Predictions Complete!")
                    
                    # Comparison Header
                    st.divider()
                    st.subheader("📊 SAC vs Rule-Based Comparison")
                    
                    # Side-by-side comparison
                    sac_col, divider_col, rule_col = st.columns([1, 0.15, 1])
                    
                    with sac_col:
                        st.markdown("### 🤖 SAC Model")
                        
                        metric1, metric2, metric3 = st.columns(3)
                        with metric1:
                            st.metric(
                                "Recommended",
                                f"{sac_safe_dose:.2f} U",
                                help="SAC model output"
                            )
                        with metric2:
                            st.metric(
                                "Reward",
                                f"{sac_reward:.2f}",
                                help="Episode reward signal"
                            )
                        with metric3:
                            status = "Blocked ⛔" if sac_is_blocked else "Safe ✅"
                            st.metric(
                                "Status",
                                status,
                                help="Guardian layer status"
                            )
                        
                        st.markdown("**Breakdown:**")
                        st.write(f"- Raw dose: {sac_dose:.2f} U")
                        st.write(f"- Correction: {correction_dose:.2f} U (est.)")
                        st.write(f"- Carbs: {carb_dose:.2f} U (est.)")
                        
                    with divider_col:
                        st.markdown("")
                        st.markdown("**VS**")
                    
                    with rule_col:
                        st.markdown("### 📐 Rule-Based")
                        
                        metric1, metric2, metric3 = st.columns(3)
                        with metric1:
                            st.metric(
                                "Recommended",
                                f"{rule_dose:.2f} U",
                                help="Rule-based calculation"
                            )
                        with metric2:
                            st.metric(
                                "Reward",
                                f"{rule_reward:.2f}",
                                help="Episode reward signal"
                            )
                        with metric3:
                            status = "Blocked ⛔" if rule_info['blocked'] else "Safe ✅"
                            st.metric(
                                "Status",
                                status,
                                help="Guardian layer status"
                            )
                        
                        st.markdown("**Breakdown:**")
                        st.write(f"- Correction: {rule_info['correction']:.2f} U")
                        st.write(f"- Meal: {rule_info['meal']:.2f} U")
                        st.write(f"- Raw dose: {rule_info['raw']:.2f} U")
                    
                    # Detailed Comparison
                    st.divider()
                    st.subheader("📈 Detailed Analysis")
                    
                    comparison_data = {
                        "Metric": [
                            "Recommended Dose",
                            "Correction Component",
                            "Meal Component",
                            "Episode Reward",
                            "Safety Status",
                            "Dose Difference"
                        ],
                        "SAC Model": [
                            f"{sac_safe_dose:.2f} U",
                            f"{correction_dose:.2f} U",
                            f"{carb_dose:.2f} U",
                            f"{sac_reward:.2f}",
                            "Blocked" if sac_is_blocked else "Safe",
                            "-"
                        ],
                        "Rule-Based": [
                            f"{rule_dose:.2f} U",
                            f"{rule_info['correction']:.2f} U",
                            f"{rule_info['meal']:.2f} U",
                            f"{rule_reward:.2f}",
                            "Blocked" if rule_info['blocked'] else "Safe",
                            "-"
                        ]
                    }
                    
                    # Calculate dose difference
                    dose_diff = sac_safe_dose - rule_dose
                    comparison_data["Metric"].append("RAW Dose Difference")
                    comparison_data["SAC Model"].append("-")
                    comparison_data["Rule-Based"].append("-")
                    
                    import pandas as pd
                    df_comparison = pd.DataFrame(comparison_data)
                    st.dataframe(df_comparison, use_container_width=True, hide_index=True)
                    
                    # Interpretation
                    st.divider()
                    st.subheader("💡 Interpretation")
                    
                    col_sac, col_rule = st.columns(2)
                    
                    with col_sac:
                        st.markdown("#### SAC Advantages")
                        if sac_reward > rule_reward:
                            st.success(f"✅ Higher reward ({sac_reward:.2f} vs {rule_reward:.2f})")
                        else:
                            st.warning(f"⚠️ Lower reward ({sac_reward:.2f} vs {rule_reward:.2f})")
                        
                        if not sac_is_blocked and not rule_info['blocked']:
                            if sac_dose > rule_dose:
                                st.info("More aggressive dosing strategy")
                            else:
                                st.info("More conservative dosing strategy")
                    
                    with col_rule:
                        st.markdown("#### Rule-Based Advantages")
                        st.success("✅ Transparent & interpretable")
                        st.success("✅ Based on medical standards")
                        st.info("Simple linear formula (ISF & ICR)")
                    
                except Exception as e:
                    st.error(f"❌ Error during prediction: {str(e)}")
                    st.exception(e)

with col2:
    st.header("📈 Model Testing Suite")
    
    if st.button("▶️ Run Multiple Episodes", key="test_episodes_btn", use_container_width=True):
        if model_path and model_path.exists():
            with st.spinner(f"Running {num_test_episodes} episodes for both SAC and Rule-Based..."):
                try:
                    # Load model
                    model = SAC.load(str(model_path))
                    
                    # Track metrics for both approaches
                    sac_episodes_data = []
                    rule_episodes_data = []
                    
                    progress_bar = st.progress(0)
                    
                    # ===== SAC TESTING =====
                    for episode in range(num_test_episodes):
                        # Create environment
                        env = T1DSimulationEnv()
                        obs, _ = env.reset()
                        
                        done = False
                        step = 0
                        episode_reward = 0
                        
                        while not done and step < 288:  # 24 hours
                            action, _ = model.predict(obs, deterministic=True)
                            obs, reward, terminated, truncated, _ = env.step(action)
                            episode_reward += reward
                            done = terminated or truncated
                            step += 1
                        
                        # Get metrics
                        metrics = env.get_metrics()
                        bg_values = env.episode_bg
                        doses = env.episode_doses
                        
                        # Calculate statistics
                        hypo = sum(1 for bg in bg_values if bg < 70) / len(bg_values) * 100 if bg_values else 0
                        hyper = sum(1 for bg in bg_values if bg > 250) / len(bg_values) * 100 if bg_values else 0
                        
                        sac_episodes_data.append({
                            "Episode": episode + 1,
                            "Reward": episode_reward,
                            "Mean BG": metrics.get("mean_bg", 0),
                            "TIR %": metrics.get("tir", 0),
                            "Hypo %": hypo,
                            "Hyper %": hyper,
                            "Mean Dose": np.mean(doses) if doses else 0,
                        })
                        
                        progress_bar.progress((episode + 0.5) / (num_test_episodes * 2))
                    
                    # ===== RULE-BASED TESTING =====
                    for episode in range(num_test_episodes):
                        # Create environment
                        env = T1DSimulationEnv()
                        obs, _ = env.reset()
                        
                        done = False
                        step = 0
                        episode_reward = 0
                        
                        while not done and step < 288:  # 24 hours
                            # Use rule-based dosing instead of model
                            bg = env.cgm_true
                            carbs = env.meal_carbs
                            
                            rule_safe_dose, _ = rule_based_dose(
                                bg, carbs, isf=isf, icr=icr, target=target_bg
                            )
                            
                            action = np.array([rule_safe_dose])
                            obs, reward, terminated, truncated, _ = env.step(action)
                            episode_reward += reward
                            done = terminated or truncated
                            step += 1
                        
                        # Get metrics
                        metrics = env.get_metrics()
                        bg_values = env.episode_bg
                        doses = env.episode_doses
                        
                        # Calculate statistics
                        hypo = sum(1 for bg in bg_values if bg < 70) / len(bg_values) * 100 if bg_values else 0
                        hyper = sum(1 for bg in bg_values if bg > 250) / len(bg_values) * 100 if bg_values else 0
                        
                        rule_episodes_data.append({
                            "Episode": episode + 1,
                            "Reward": episode_reward,
                            "Mean BG": metrics.get("mean_bg", 0),
                            "TIR %": metrics.get("tir", 0),
                            "Hypo %": hypo,
                            "Hyper %": hyper,
                            "Mean Dose": np.mean(doses) if doses else 0,
                        })
                        
                        progress_bar.progress(0.5 + (episode + 0.5) / (num_test_episodes * 2))
                    
                    # Display results
                    st.success("✅ Testing Complete!")
                    
                    # ===== SAC SUMMARY =====
                    st.divider()
                    st.subheader("🤖 SAC Model - Summary Statistics")
                    
                    sac_col1, sac_col2, sac_col3, sac_col4 = st.columns(4)
                    
                    sac_mean_reward = np.mean([e["Reward"] for e in sac_episodes_data])
                    sac_mean_bg = np.mean([e["Mean BG"] for e in sac_episodes_data])
                    sac_mean_tir = np.mean([e["TIR %"] for e in sac_episodes_data])
                    sac_mean_hypo = np.mean([e["Hypo %"] for e in sac_episodes_data])
                    
                    with sac_col1:
                        st.metric("Avg Reward", f"{sac_mean_reward:.2f}")
                    with sac_col2:
                        st.metric("Avg BG", f"{sac_mean_bg:.1f} mg/dL")
                    with sac_col3:
                        st.metric("Avg TIR", f"{sac_mean_tir:.1f}%")
                    with sac_col4:
                        st.metric("Avg Hypo", f"{sac_mean_hypo:.2f}%")
                    
                    # ===== RULE-BASED SUMMARY =====
                    st.divider()
                    st.subheader("📐 Rule-Based - Summary Statistics")
                    
                    rule_col1, rule_col2, rule_col3, rule_col4 = st.columns(4)
                    
                    rule_mean_reward = np.mean([e["Reward"] for e in rule_episodes_data])
                    rule_mean_bg = np.mean([e["Mean BG"] for e in rule_episodes_data])
                    rule_mean_tir = np.mean([e["TIR %"] for e in rule_episodes_data])
                    rule_mean_hypo = np.mean([e["Hypo %"] for e in rule_episodes_data])
                    
                    with rule_col1:
                        st.metric("Avg Reward", f"{rule_mean_reward:.2f}")
                    with rule_col2:
                        st.metric("Avg BG", f"{rule_mean_bg:.1f} mg/dL")
                    with rule_col3:
                        st.metric("Avg TIR", f"{rule_mean_tir:.1f}%")
                    with rule_col4:
                        st.metric("Avg Hypo", f"{rule_mean_hypo:.2f}%")
                    
                    # ===== SIDE-BY-SIDE COMPARISON TABLE =====
                    st.divider()
                    st.subheader("📊 Algorithm Comparison")
                    
                    comparison_summary = {
                        "Metric": [
                            "Average Reward",
                            "Average Glucose (mg/dL)",
                            "Time in Range (70-180)",
                            "Hypoglycemia Rate (<70)",
                            "Hyperglycemia Rate (>250)",
                            "Mean Insulin Dose (U)"
                        ],
                        "SAC Model": [
                            f"{sac_mean_reward:.2f}",
                            f"{sac_mean_bg:.1f}",
                            f"{sac_mean_tir:.1f}%",
                            f"{sac_mean_hypo:.2f}%",
                            f"{np.mean([e['Hyper %'] for e in sac_episodes_data]):.2f}%",
                            f"{np.mean([e['Mean Dose'] for e in sac_episodes_data]):.2f}"
                        ],
                        "Rule-Based": [
                            f"{rule_mean_reward:.2f}",
                            f"{rule_mean_bg:.1f}",
                            f"{rule_mean_tir:.1f}%",
                            f"{rule_mean_hypo:.2f}%",
                            f"{np.mean([e['Hyper %'] for e in rule_episodes_data]):.2f}%",
                            f"{np.mean([e['Mean Dose'] for e in rule_episodes_data]):.2f}"
                        ],
                        "Winner": [
                            "🎯 SAC" if sac_mean_reward > rule_mean_reward else "🎯 Rule-Based" if rule_mean_reward > sac_mean_reward else "🤝 Tie",
                            "🎯 SAC" if sac_mean_bg < rule_mean_bg else "🎯 Rule-Based" if rule_mean_bg < sac_mean_bg else "🤝 Tie",
                            "🎯 SAC" if sac_mean_tir > rule_mean_tir else "🎯 Rule-Based" if rule_mean_tir > sac_mean_tir else "🤝 Tie",
                            "🎯 SAC" if sac_mean_hypo < rule_mean_hypo else "🎯 Rule-Based" if rule_mean_hypo < sac_mean_hypo else "🤝 Tie",
                            "🎯 SAC" if np.mean([e['Hyper %'] for e in sac_episodes_data]) < np.mean([e['Hyper %'] for e in rule_episodes_data]) else "🎯 Rule-Based",
                            "🎯 SAC" if np.mean([e['Mean Dose'] for e in sac_episodes_data]) < np.mean([e['Mean Dose'] for e in rule_episodes_data]) else "🎯 Rule-Based"
                        ]
                    }
                    
                    import pandas as pd
                    df_comparison = pd.DataFrame(comparison_summary)
                    st.dataframe(df_comparison, use_container_width=True, hide_index=True)
                    
                    # ===== DETAILED TABLES =====
                    st.divider()
                    st.subheader("📋 Detailed Episode Logs")
                    
                    tab_sac, tab_rule, tab_both = st.tabs(["🤖 SAC Episodes", "📐 Rule-Based Episodes", "📊 Side-by-Side"])
                    
                    with tab_sac:
                        df_sac = pd.DataFrame(sac_episodes_data)
                        st.dataframe(df_sac, use_container_width=True, hide_index=True)
                    
                    with tab_rule:
                        df_rule = pd.DataFrame(rule_episodes_data)
                        st.dataframe(df_rule, use_container_width=True, hide_index=True)
                    
                    with tab_both:
                        st.write("**SAC Model:**")
                        st.dataframe(pd.DataFrame(sac_episodes_data), use_container_width=True, hide_index=True)
                        st.write("**Rule-Based:**")
                        st.dataframe(pd.DataFrame(rule_episodes_data), use_container_width=True, hide_index=True)
                    
                    # ===== PERFORMANCE CHARTS =====
                    st.divider()
                    st.subheader("📉 Performance Charts")
                    
                    chart_col1, chart_col2 = st.columns(2)
                    
                    with chart_col1:
                        st.markdown("**Mean Glucose per Episode**")
                        chart_data = pd.DataFrame({
                            "Episode": range(1, num_test_episodes + 1),
                            "SAC": [e["Mean BG"] for e in sac_episodes_data],
                            "Rule-Based": [e["Mean BG"] for e in rule_episodes_data]
                        })
                        st.line_chart(chart_data.set_index("Episode"))
                    
                    with chart_col2:
                        st.markdown("**Time in Range (%) per Episode**")
                        chart_data = pd.DataFrame({
                            "Episode": range(1, num_test_episodes + 1),
                            "SAC": [e["TIR %"] for e in sac_episodes_data],
                            "Rule-Based": [e["TIR %"] for e in rule_episodes_data]
                        })
                        st.line_chart(chart_data.set_index("Episode"))
                    
                    chart_col3, chart_col4 = st.columns(2)
                    
                    with chart_col3:
                        st.markdown("**Episode Rewards**")
                        chart_data = pd.DataFrame({
                            "Episode": range(1, num_test_episodes + 1),
                            "SAC": [e["Reward"] for e in sac_episodes_data],
                            "Rule-Based": [e["Reward"] for e in rule_episodes_data]
                        })
                        st.line_chart(chart_data.set_index("Episode"))
                    
                    with chart_col4:
                        st.markdown("**Mean Insulin Dose per Episode**")
                        chart_data = pd.DataFrame({
                            "Episode": range(1, num_test_episodes + 1),
                            "SAC": [e["Mean Dose"] for e in sac_episodes_data],
                            "Rule-Based": [e["Mean Dose"] for e in rule_episodes_data]
                        })
                        st.line_chart(chart_data.set_index("Episode"))
                    
                except Exception as e:
                    st.error(f"❌ Error during testing: {str(e)}")
                    st.exception(e)
        else:
            st.error("❌ Model path not found")

# ────────────────────────────────────────────────
# Footer
# ────────────────────────────────────────────────
st.divider()
st.markdown("""
---
**SAC Model Tester** | GlucoTwin Digital Twin Project

📌 **Tips:**
- Use realistic glucose values (40-400 mg/dL)
- Carbs typically range from 0-100g per meal
- Guardian layer blocks insulin if BG < 90 mg/dL
- Run multiple episodes to validate model consistency
""")
