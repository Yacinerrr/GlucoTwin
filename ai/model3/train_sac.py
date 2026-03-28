"""
SAC (Soft Actor-Critic) Training for T1D Insulin Dosing
Replaces PPO with faster convergence and entropy regularization
"""

import os
import numpy as np
from datetime import datetime
import logging
import torch.nn as nn

from stable_baselines3 import SAC
from stable_baselines3.common.callbacks import (
    BaseCallback, 
    EvalCallback, 
    CheckpointCallback
)
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from glucose_env import T1DSimulationEnv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create directories
os.makedirs('models_sac', exist_ok=True)
os.makedirs('logs_sac', exist_ok=True)
os.makedirs('evaluations', exist_ok=True)


class GlucoseMetricsCallback(BaseCallback):
    """
    Monitor glucose metrics during training.
    Provides early warning if model is not learning properly.
    """
    
    def __init__(self, verbose=0):
        super().__init__(verbose)
        self.step_counter = 0
        self.last_mean_reward = -np.inf
        self.zero_dose_count = 0
        
    def _on_step(self) -> bool:
        self.step_counter += 1
        
        # Every 5k steps, log metrics
        if self.step_counter % 5000 == 0:
            logger.info(f"Step {self.num_timesteps:,} / Training in progress...")
            
        # Every 50k steps, detailed evaluation
        if self.step_counter % 50000 == 0:
            self._evaluate_policy()
            
        return True
    
    def _evaluate_policy(self):
        """Evaluate current policy on test trajectories"""
        env = T1DSimulationEnv()
        obs, _ = env.reset()
        
        episode_reward = 0
        episode_doses = []
        
        for step in range(288):  # 24-hour episode
            action, _ = self.model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, _ = env.step(action)
            episode_reward += reward
            
            if isinstance(action, np.ndarray):
                episode_doses.append(float(action[0]))
            else:
                episode_doses.append(float(action))
            
            if terminated or truncated:
                break
        
        metrics = env.get_metrics()
        mean_dose = np.mean(episode_doses) if episode_doses else 0
        
        logger.info(
            f"\n{'='*60}\n"
            f"Evaluation at step {self.num_timesteps:,}\n"
            f"  Episode Reward: {episode_reward:.2f}\n"
            f"  Mean BG: {metrics['mean_bg']:.1f} mg/dL\n"
            f"  Time in Range: {metrics['tir']:.1f}%\n"
            f"  Hypoglycemia Rate: {metrics['hypoglycemia']:.2f}%\n"
            f"  Mean Insulin Dose: {mean_dose:.2f} U\n"
            f"{'='*60}\n"
        )


class TrainingConfig:
    """SAC Training Configuration"""
    
    # Environment
    num_envs = 4
    total_timesteps = 500_000
    
    # SAC Hyperparameters (optimized for continuous control)
    learning_rate = 3e-4  # Higher than PPO for faster convergence
    batch_size = 256
    buffer_size = 1_000_000
    train_freq = 1  # Train after every step
    gradient_steps = 1  # Gradient updates per step
    
    # Entropy coefficient (automatic tuning)
    ent_coef = "auto"  # Automatic entropy regularization
    target_entropy = None  # Auto-computed from action space
    
    # Actor-Critic Networks
    policy = "MlpPolicy"
    net_arch = [256, 256]  # Larger networks for complex task
    activation_fn = nn.ReLU  # Use actual PyTorch activation function class
    
    # Training stability
    learning_starts = 10_000  # Steps before training starts
    gamma = 0.99  # Discount factor
    tau = 0.005  # Soft update coefficient
    target_update_interval = 1
    
    # Clipping and bounds
    use_sde = True  # Stochastic Dynamics Engine (helps with exploration)
    sde_sample_freq = -1
    
    # Checkpointing
    save_freq = 10_000
    eval_freq = 10_000
    n_eval_episodes = 5


def train_sac():
    """
    Train SAC model for insulin dosing
    """
    
    logger.info("="*60)
    logger.info("SAC Training for T1D Insulin Dosing - GlucoTwin M3")
    logger.info("="*60)
    logger.info(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Total Timesteps: {TrainingConfig.total_timesteps:,}")
    logger.info(f"Number of Parallel Environments: {TrainingConfig.num_envs}")
    logger.info(f"Learning Rate: {TrainingConfig.learning_rate}")
    logger.info(f"Batch Size: {TrainingConfig.batch_size}")
    logger.info(f"Network Architecture: {TrainingConfig.net_arch}")
    logger.info("="*60)
    
    # Create vectorized environment
    def make_env_fn():
        return T1DSimulationEnv()
    
    env = DummyVecEnv([make_env_fn for _ in range(TrainingConfig.num_envs)])
    
    # Normalize observations (improves stability)
    env = VecNormalize(env, norm_obs=True, norm_reward=False)
    
    # Create SAC model
    model = SAC(
        policy=TrainingConfig.policy,
        env=env,
        learning_rate=TrainingConfig.learning_rate,
        buffer_size=TrainingConfig.buffer_size,
        batch_size=TrainingConfig.batch_size,
        train_freq=TrainingConfig.train_freq,
        gradient_steps=TrainingConfig.gradient_steps,
        ent_coef=TrainingConfig.ent_coef,
        gamma=TrainingConfig.gamma,
        tau=TrainingConfig.tau,
        policy_kwargs={
            "net_arch": TrainingConfig.net_arch,
            "activation_fn": TrainingConfig.activation_fn,
        },
        learning_starts=TrainingConfig.learning_starts,
        use_sde=TrainingConfig.use_sde,
        verbose=1,
        tensorboard_log="logs_sac/"
    )
    
    logger.info(f"Model created with policy: {TrainingConfig.policy}")
    
    # Callbacks
    callbacks = []
    
    # Checkpoint callback
    checkpoint_callback = CheckpointCallback(
        save_freq=TrainingConfig.save_freq,
        save_path="models_sac/checkpoints/",
        name_prefix="sac_model",
        save_replay_buffer=True,
        save_vecnormalize=True,
    )
    callbacks.append(checkpoint_callback)
    
    # Evaluation callback
    eval_env = DummyVecEnv([make_env_fn for _ in range(TrainingConfig.num_envs)])
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False)
    
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path="models_sac/best/",
        log_path="logs_sac/",
        eval_freq=TrainingConfig.eval_freq,
        n_eval_episodes=TrainingConfig.n_eval_episodes,
        deterministic=True,
        render=False,
    )
    callbacks.append(eval_callback)
    
    # Metrics callback
    metrics_callback = GlucoseMetricsCallback(verbose=1)
    callbacks.append(metrics_callback)
    
    # Train
    logger.info("Starting SAC training...")
    try:
        model.learn(
            total_timesteps=TrainingConfig.total_timesteps,
            callback=callbacks,
            progress_bar=False,  # Disable progress bar (requires tqdm/rich)
        )
        logger.info("Training completed successfully!")
    except KeyboardInterrupt:
        logger.info("Training interrupted by user.")
    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        raise
    
    # Save final model
    model.save("models_sac/sac_final")
    env.save("models_sac/final_vecnormalize.pkl")
    logger.info("Final model saved to models_sac/sac_final")
    
    # Summary
    logger.info("="*60)
    logger.info(f"Training Summary:")
    logger.info(f"  Total Steps: {model.num_timesteps:,}")
    logger.info(f"  End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"  Best Model: models_sac/best/")
    logger.info(f"  Final Model: models_sac/sac_final.zip")
    logger.info("="*60)


if __name__ == "__main__":
    train_sac()
