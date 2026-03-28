"""
SAC Model 3 Inference - Simple Insulin Dose Prediction
"""

import numpy as np
from stable_baselines3 import SAC
from .glucose_env import T1DSimulationEnv, GuardianLayer
import os
from pathlib import Path





class SACInsulinInference:
    def __init__(self, model_path: str = None):
        # Use absolute path
        if model_path is None:
            model_dir = Path(__file__).parent / "models_sac" / "best"
            model_path = str(model_dir / "best_model.zip")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at: {model_path}")
        
        self.model = SAC.load(model_path)
       
        self.env = T1DSimulationEnv()
        self.guardian = GuardianLayer()
    
    def predict(
        self,
        current_glucose: float,
        carbs_intake: float = 0.0,
        glucose_history: list = None
    ) -> dict:
        """
        Predict insulin dose
        
        Args:
            current_glucose: Current BG (mg/dL)
            carbs_intake: Carbs to eat (grams)
            glucose_history: Historical BG readings (optional)
        
        Returns:
            Dict with dose recommendation
        """
        # Reset and set glucose state
        self.env.reset()
        if glucose_history is None:
            glucose_history = [current_glucose] * 12
        
        self.env.cgm_true = current_glucose
        self.env.cgm_history = np.array(glucose_history[-12:])
        self.env.meal_carbs = carbs_intake
        
        # Get observation and prediction
        obs = self.env._get_observation()
        action, _ = self.model.predict(obs, deterministic=True)
        raw_dose = float(action[0])
        
        # Apply safety layer
        safe_dose, is_blocked = self.guardian.clip_dose(raw_dose, current_glucose)
        
        return {
            "recommended_dose": round(safe_dose, 2),
            "raw_dose": round(raw_dose, 2),
            "blocked": is_blocked,
            "current_glucose": current_glucose,
            "carbs_intake": carbs_intake
        }


# FastAPI usage
def get_inference_engine():
    return SACInsulinInference()


if __name__ == "__main__":
    inference = SACInsulinInference()
    result = inference.predict(current_glucose=150, carbs_intake=45)
    print(f"BG: {result['current_glucose']} → Dose: {result['recommended_dose']}U")