"""
Test SAC Model - Validate trained model performance
"""

import numpy as np
import argparse
from datetime import datetime
import logging

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import VecNormalize
from glucose_env import T1DSimulationEnv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


def test_model(model_path, vecnormalize_path=None, num_episodes=5):
    """
    Test SAC model on multiple episodes
    """
    logger.info("="*60)
    logger.info("SAC Model Testing")
    logger.info("="*60)
    logger.info(f"Model Path: {model_path}")
    
    # Load model
    try:
        model = SAC.load(model_path)
        logger.info("✓ Model loaded successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load model: {e}")
        return
    
    # Load VecNormalize if available
    if vecnormalize_path:
        try:
            vec_normalize = VecNormalize.load(vecnormalize_path)
            logger.info("✓ VecNormalize loaded")
        except:
            vec_normalize = None
            logger.warning("⚠ VecNormalize not loaded")
    else:
        vec_normalize = None
    
    # Test episodes
    results = {
        "mean_bg": [],
        "tir": [],
        "hypoglycemia": [],
        "hyperglycemia": [],
        "mean_dose": [],
        "rewards": []
    }
    
    for episode in range(num_episodes):
        logger.info(f"\n--- Episode {episode + 1}/{num_episodes} ---")
        
        env = T1DSimulationEnv()
        obs, _ = env.reset()
        
        episode_reward = 0
        done = False
        step = 0
        
        while not done and step < 288:  # 24-hour max
            # Use model for prediction
            action, _ = model.predict(obs, deterministic=True)
            
            # Step environment
            obs, reward, terminated, truncated, _ = env.step(action)
            episode_reward += reward
            done = terminated or truncated
            step += 1
        
        # Get metrics
        metrics = env.get_metrics()
        
        # Extract dose data
        doses = env.episode_doses
        mean_dose = np.mean(doses) if doses else 0
        
        # Calculate hypoglycemia/hyperglycemia
        bg_values = env.episode_bg
        hypo_count = sum(1 for bg in bg_values if bg < 70)
        hyper_count = sum(1 for bg in bg_values if bg > 250)
        hypo_rate = (hypo_count / len(bg_values)) * 100 if bg_values else 0
        hyper_rate = (hyper_count / len(bg_values)) * 100 if bg_values else 0
        
        # Log results
        logger.info(f"  Episode Reward: {episode_reward:.2f}")
        logger.info(f"  Mean BG: {metrics['mean_bg']:.1f} mg/dL")
        logger.info(f"  Time in Range: {metrics['tir']:.1f}%")
        logger.info(f"  Hypoglycemia (<70): {hypo_rate:.2f}%")
        logger.info(f"  Hyperglycemia (>250): {hyper_rate:.2f}%")
        logger.info(f"  Mean Insulin Dose: {mean_dose:.2f} U")
        logger.info(f"  Steps: {step}")
        
        # Store results
        results["mean_bg"].append(metrics['mean_bg'])
        results["tir"].append(metrics['tir'])
        results["hypoglycemia"].append(hypo_rate)
        results["hyperglycemia"].append(hyper_rate)
        results["mean_dose"].append(mean_dose)
        results["rewards"].append(episode_reward)
    
    # Summary statistics
    logger.info("\n" + "="*60)
    logger.info("SUMMARY STATISTICS")
    logger.info("="*60)
    logger.info(f"Mean BG (avg): {np.mean(results['mean_bg']):.1f} ± {np.std(results['mean_bg']):.1f} mg/dL")
    logger.info(f"Time in Range (avg): {np.mean(results['tir']):.1f} ± {np.std(results['tir']):.1f}%")
    logger.info(f"Hypoglycemia Rate (avg): {np.mean(results['hypoglycemia']):.2f} ± {np.std(results['hypoglycemia']):.2f}%")
    logger.info(f"Hyperglycemia Rate (avg): {np.mean(results['hyperglycemia']):.2f} ± {np.std(results['hyperglycemia']):.2f}%")
    logger.info(f"Mean Insulin Dose (avg): {np.mean(results['mean_dose']):.2f} ± {np.std(results['mean_dose']):.2f} U")
    logger.info(f"Episode Reward (avg): {np.mean(results['rewards']):.2f} ± {np.std(results['rewards']):.2f}")
    logger.info("="*60)
    
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test SAC model")
    parser.add_argument(
        "--model", 
        type=str, 
        default="models_sac/sac_final.zip",
        help="Path to model file"
    )
    parser.add_argument(
        "--vecnormalize",
        type=str,
        default="models_sac/final_vecnormalize.pkl",
        help="Path to VecNormalize file"
    )
    parser.add_argument(
        "--episodes",
        type=int,
        default=5,
        help="Number of test episodes"
    )
    
    args = parser.parse_args()
    
    # Check if model exists
    import os
    model_path = args.model
    if not os.path.exists(model_path):
        # Try without .zip extension
        if os.path.exists(model_path.replace(".zip", "")):
            model_path = model_path.replace(".zip", "")
        else:
            logger.error(f"Model not found: {args.model}")
            exit(1)
    
    test_model(model_path, args.vecnormalize, args.episodes)
