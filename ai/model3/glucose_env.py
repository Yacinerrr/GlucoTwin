"""
Glucose Environment for SAC Training
Type 1 Diabetes Simulator with Reinforcement Learning
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from datetime import datetime, timedelta
import math


class GuardianLayer:
    """
    Safety layer for insulin dosing.
    Ensures insulin doses are within safe bounds.
    """
    def __init__(self, isf=50, target_bg=100):
        self.isf = isf
        self.target_bg = target_bg
        self.min_dose = 0.0
        self.max_dose = 15.0
        
    def clip_dose(self, raw_dose, current_bg):
        """
        Clip and validate insulin dose.
        Blocks dosing if BG is too low (< 90 mg/dL).
        """
        # Block insulin if hypoglycemic risk
        if current_bg < 90:
            return 0.0, True  # blocked
        
        # Clip to valid range
        safe_dose = np.clip(raw_dose, self.min_dose, self.max_dose)
        return safe_dose, False


class T1DSimulationEnv(gym.Env):
    """
    Simplified T1D Simulator for SAC Training
    Continuous action space (insulin dose: 0-15 U)
    State: 18-dimensional observation vector
    """
    
    metadata = {"render_modes": ["human"], "render_fps": 1}
    
    def __init__(self, seed=None, **kwargs):
        super().__init__()
        
        # Simulation parameters
        self.cgm_true = 100.0  # Current BG (mg/dL)
        self.cgm_history = np.ones(12) * 100.0  # Last 12 observations (5-min intervals)
        self.insulin_on_board = 0.0
        self.meal_carbs = 0.0
        self.current_step = 0
        self.episode_steps = 0
        self.max_steps = 288  # 24 hours * 12 (5-min intervals)
        
        # Medical parameters
        self.isf = 50.0  # Insulin Sensitivity Factor (mg/dL per U)
        self.icr = 10.0  # Insulin Carb Ratio (g per U)
        self.target_bg = 100.0
        self.tir_min = 70.0   # Target min (mg/dL)
        self.tir_max = 180.0  # Target max (mg/dL)
        
        # Guardian Layer
        self.guardian = GuardianLayer(isf=self.isf, target_bg=self.target_bg)
        
        # Action space: continuous insulin dose [0, 15] U
        self.action_space = spaces.Box(
            low=np.array([0.0]), 
            high=np.array([15.0]), 
            dtype=np.float32
        )
        
        # Observation space: 18 features
        # [BG_history(12), current_BG, last_dose, meal_carbs, hour_sin, hour_cos, bolus_timing]
        self.observation_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(18,),
            dtype=np.float32
        )
        
        # Metrics tracking
        self.episode_bg = []
        self.episode_doses = []
        self.episode_meals = []
        
        if seed is not None:
            self.seed(seed)
            
    def seed(self, seed=None):
        self.np_random = np.random.RandomState(seed)
        return [seed]
    
    def _get_observation(self):
        """
        Build 18-dimensional observation vector
        """
        # Current hour (0-23)
        hour = (self.current_step % 288) / 12  # 288 steps per day, 12 per hour
        
        obs = np.zeros(18, dtype=np.float32)
        
        # Features 0-11: BG history (last 12 measurements, normalized by 400)
        obs[0:12] = (self.cgm_history / 400.0).astype(np.float32)
        
        # Feature 12: Current BG (normalized by 400)
        obs[12] = np.float32(self.cgm_true / 400.0)
        
        # Feature 13: Last insulin dose (normalized by 15)
        if len(self.episode_doses) > 0:
            obs[13] = np.float32(self.episode_doses[-1] / 15.0)
        else:
            obs[13] = np.float32(0.0)
        
        # Feature 14: Meal carbs (normalized by 100)
        obs[14] = np.float32(self.meal_carbs / 100.0)
        
        # Features 15-16: Hour sin/cos (cyclic encoding)
        obs[15] = np.float32(np.sin(2 * np.pi * hour / 24.0))
        obs[16] = np.float32(np.cos(2 * np.pi * hour / 24.0))
        
        # Feature 17: Bolus timing (0-288 steps, normalized)
        obs[17] = np.float32((self.current_step % 288) / 288.0)
        
        return obs
    
    def _simulate_glucose_change(self, insulin_dose):
        """
        Simulate glucose dynamics with insulin effect.
        Simplified model: 
        - Insulin decreases BG by (dose * ISF)
        - Carbs increase BG by (carbs * 5)
        - Natural drift towards baseline
        """
        # Insulin effect
        insulin_effect = -insulin_dose * self.isf
        
        # Carb effect (simplified absorption)
        carb_effect = self.meal_carbs * 5 if self.meal_carbs > 0 else 0
        
        # Natural variance (small random walk)
        noise = self.np_random.normal(0, 3)
        
        # Update glucose
        self.cgm_true = self.cgm_true + insulin_effect + carb_effect + noise
        
        # Physiological bounds
        self.cgm_true = np.clip(self.cgm_true, 40, 400)
        
        # Update history (shift and append)
        self.cgm_history = np.roll(self.cgm_history, -1)
        self.cgm_history[-1] = self.cgm_true
        
        # Decay meal carbs (simplified absorption)
        if self.meal_carbs > 0:
            self.meal_carbs *= 0.85
        else:
            self.meal_carbs = 0
    
    def _calculate_reward(self, bg, dose):
        """
        Reward function for SAC.
        Encourages:
        - Time in range (70-180 mg/dL)
        - Avoiding hypoglycemia
        - Reasonable insulin doses
        """
        reward = 0
        
        # Time in range reward
        if self.tir_min <= bg <= self.tir_max:
            reward += 5.0
        
        # Penalize hypoglycemia (BG < 70)
        if bg < 70:
            severity = max(0, 70 - bg) / 70
            reward -= 20.0 * severity
        
        # Penalize severe hyperglycemia (BG > 300)
        if bg > 300:
            severity = max(0, bg - 300) / 200
            reward -= 10.0 * severity
        
        # Small penalty for high doses (encourage efficiency)
        if dose > 5:
            reward -= 0.5 * (dose - 5)
        
        return float(reward)
    
    def reset(self, seed=None, options=None):
        """Reset environment to initial state"""
        super().reset(seed=seed)
        
        # Reset state
        self.cgm_true = 100.0 + self.np_random.normal(0, 10)
        self.cgm_history = np.ones(12) * self.cgm_true
        self.insulin_on_board = 0.0
        self.meal_carbs = 0.0
        self.current_step = 0
        self.episode_steps = 0
        
        # Metrics
        self.episode_bg = [self.cgm_true]
        self.episode_doses = []
        self.episode_meals = []
        
        return self._get_observation(), {}
    
    def step(self, action):
        """
        Execute one step:
        - Apply insulin
        - Simulate glucose change
        - Generate reward
        """
        # Extract dose from action (continuous output from SAC)
        raw_dose = float(action[0]) if isinstance(action, np.ndarray) else float(action)
        
        # Apply Guardian Layer safety
        dose, is_blocked = self.guardian.clip_dose(raw_dose, self.cgm_true)
        
        # Simulate meal at random times (simplified)
        if self.current_step > 0 and self.np_random.random() < 0.02:  # ~5% chance per step
            self.meal_carbs = self.np_random.uniform(30, 100)
        
        # Simulate glucose response
        self._simulate_glucose_change(dose)
        
        # Record metrics
        self.episode_bg.append(self.cgm_true)
        self.episode_doses.append(dose)
        self.episode_meals.append(self.meal_carbs)
        
        # Calculate reward
        reward = self._calculate_reward(self.cgm_true, dose)
        
        # Episode termination
        self.current_step += 1
        self.episode_steps += 1
        terminated = self.episode_steps >= self.max_steps
        
        # Truncation (for time limits)
        truncated = False
        
        return self._get_observation(), reward, terminated, truncated, {}
    
    def render(self, mode="human"):
        """Render current state (console output)"""
        if self.episode_steps % 12 == 0:  # Print every hour
            hour = self.current_step // 12
            print(f"Hour {hour:2d} | BG: {self.cgm_true:6.1f} | TIR: {self._calculate_tir():.1f}% | Avg Dose: {np.mean(self.episode_doses) if self.episode_doses else 0:.2f}U")
    
    def _calculate_tir(self):
        """Calculate Time In Range percentage"""
        if not self.episode_bg:
            return 0
        tir_count = sum(1 for bg in self.episode_bg if self.tir_min <= bg <= self.tir_max)
        return (tir_count / len(self.episode_bg)) * 100
    
    def get_metrics(self):
        """Return episode metrics"""
        if not self.episode_bg:
            return {"mean_bg": 0, "tir": 0, "hypoglycemia": 0, "mean_dose": 0}
        
        mean_bg = np.mean(self.episode_bg)
        tir = self._calculate_tir()
        hypoglycemia_count = sum(1 for bg in self.episode_bg if bg < 70)
        hypoglycemia = (hypoglycemia_count / len(self.episode_bg)) * 100 if self.episode_bg else 0
        mean_dose = np.mean(self.episode_doses) if self.episode_doses else 0
        
        return {
            "mean_bg": mean_bg,
            "tir": tir,
            "hypoglycemia": hypoglycemia,
            "mean_dose": mean_dose,
            "num_episodes": 1
        }


def make_env(env_id="T1DSimulation-v0"):
    """Factory function to create environment"""
    return T1DSimulationEnv()
