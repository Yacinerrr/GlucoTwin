"""
SAC Model Test Script with Realistic Scenarios
Test the trained model with various blood glucose and meal combinations
"""

import numpy as np
import logging
from datetime import datetime
from typing import List, Tuple
import pandas as pd

from stable_baselines3 import SAC
from glucose_env import T1DSimulationEnv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


class ScenarioTester:
    """Test SAC model with predefined scenarios"""
    
    # Define test scenarios: (blood_glucose, meal_carbs, scenario_name)
    SCENARIOS = [
        # Morning scenarios
        (70, 0, "Morning - Low BG, No meal (Fasting)"),
        (100, 30, "Breakfast - Normal BG, Small meal (30g carbs)"),
        (120, 50, "Breakfast - Normal BG, Medium meal (50g carbs)"),
        (150, 60, "Breakfast - High BG, Large meal (60g carbs)"),
        
        # Lunch scenarios
        (85, 40, "Lunch - Low-Normal BG, Medium meal (40g carbs)"),
        (110, 70, "Lunch - Normal BG, Large meal (70g carbs)"),
        (180, 80, "Lunch - High BG, Large meal (80g carbs)"),
        (200, 50, "Lunch - High BG, Medium meal (50g carbs)"),
        
        # Dinner scenarios
        (95, 55, "Dinner - Normal BG, Large meal (55g carbs)"),
        (140, 75, "Dinner - High BG, Large meal (75g carbs)"),
        (160, 60, "Dinner - High BG, Medium meal (60g carbs)"),
        (220, 40, "Dinner - Very High BG, Small meal (40g carbs)"),
        
        # Snack scenarios
        (65, 15, "Snack - Low BG, Small snack (15g carbs)"),
        (90, 20, "Snack - Normal BG, Light snack (20g carbs)"),
        (130, 25, "Snack - High BG, Light snack (25g carbs)"),
        
        # Edge cases
        (50, 0, "CRITICAL - Severe Hypoglycemia (BG=50, No meal)"),
        (300, 100, "CRITICAL - Severe Hyperglycemia (BG=300, Large meal)"),
        (75, 80, "URGENT - Low BG with Large Meal (Risk scenario)"),
        (280, 10, "WARNING - Very High BG with Minimal Carbs"),
        
        # Normal fasting states
        (100, 0, "Fasting - Normal BG, No meal"),
        (110, 0, "Fasting - Slightly Elevated, No meal"),
        (85, 0, "Fasting - Slightly Low, No meal"),
    ]
    
    def __init__(self, model_path: str):
        """Initialize tester with trained model"""
        self.model_path = model_path
        self.model = None
        self.results = []
        self.load_model()
    
    def load_model(self):
        """Load the trained SAC model"""
        try:
            self.model = SAC.load(self.model_path)
            logger.info(f"✓ Model loaded successfully from: {self.model_path}")
        except FileNotFoundError:
            logger.error(f"✗ Model not found at: {self.model_path}")
            raise
        except Exception as e:
            logger.error(f"✗ Error loading model: {e}")
            raise
    
    def test_scenario(self, bg: float, meal_carbs: float, scenario_name: str) -> dict:
        """
        Test model on a single scenario
        
        Args:
            bg: Blood glucose level (mg/dL)
            meal_carbs: Meal carbohydrates (grams)
            scenario_name: Description of the scenario
            
        Returns:
            Dictionary with model output and analysis
        """
        # Create environment
        env = T1DSimulationEnv()
        obs, _ = env.reset()
        
        # Manually set the scenario condition
        env.cgm_true = bg
        env.cgm_history[:] = bg / 400.0  # Normalize
        env.meal_carbs = meal_carbs
        
        # Get observation vector
        obs = env._get_observation()
        
        # Get model prediction
        action, _states = self.model.predict(obs, deterministic=True)
        
        # Extract insulin recommendation
        insulin_dose = float(action[0]) if isinstance(action, np.ndarray) else float(action)
        
        # Apply Guardian Layer safety rules
        if bg < 90:
            guardian_blocked = True
            safe_dose = 0.0
        else:
            guardian_blocked = False
            safe_dose = np.clip(insulin_dose, 0.0, 15.0)
        
        # Estimate BG change
        # Simplified: insulin lowers BG by (dose * ISF), carbs raise by (carbs * 5)
        insulin_effect = -safe_dose * 50  # ISF = 50
        carb_effect = meal_carbs * 5
        estimated_bg_change = insulin_effect + carb_effect
        estimated_final_bg = bg + estimated_bg_change
        
        # Categorize BG level
        if bg < 70:
            bg_category = "🔴 LOW (Hypoglycemia)"
        elif bg < 100:
            bg_category = "🟢 NORMAL (Low-Normal)"
        elif bg < 140:
            bg_category = "🟡 NORMAL (Acceptable)"
        elif bg < 180:
            bg_category = "🟠 ELEVATED"
        elif bg < 250:
            bg_category = "🔴 HIGH (Hyperglycemia)"
        else:
            bg_category = "🔴 CRITICAL (Severe Hyperglycemia)"
        
        # Categorize recommendation
        if safe_dose == 0.0 and guardian_blocked:
            dose_category = "⚠️  BLOCKED (Safety)"
        elif safe_dose == 0.0:
            dose_category = "✓ No insulin needed"
        elif safe_dose < 1.0:
            dose_category = "✓ Minimal dose"
        elif safe_dose < 3.0:
            dose_category = "✓ Low dose"
        elif safe_dose < 5.0:
            dose_category = "✓ Medium dose"
        else:
            dose_category = "✓ High dose"
        
        result = {
            "scenario": scenario_name,
            "bg": bg,
            "bg_category": bg_category,
            "meal_carbs": meal_carbs,
            "raw_insulin": round(insulin_dose, 3),
            "safe_insulin": round(safe_dose, 3),
            "guardian_blocked": guardian_blocked,
            "dose_category": dose_category,
            "insulin_effect": round(insulin_effect, 1),
            "carb_effect": round(carb_effect, 1),
            "estimated_bg_change": round(estimated_bg_change, 1),
            "estimated_final_bg": round(estimated_final_bg, 1),
        }
        
        return result
    
    def run_all_scenarios(self) -> List[dict]:
        """Run all test scenarios"""
        logger.info("\n" + "="*100)
        logger.info("SAC MODEL SCENARIO TESTING")
        logger.info("="*100)
        logger.info(f"Total Scenarios: {len(self.SCENARIOS)}\n")
        
        for i, (bg, carbs, name) in enumerate(self.SCENARIOS, 1):
            logger.info(f"[{i}/{len(self.SCENARIOS)}] Testing: {name}")
            result = self.test_scenario(bg, carbs, name)
            self.results.append(result)
            self.print_result(result)
        
        return self.results
    
    def print_result(self, result: dict):
        """Print formatted result for a single scenario"""
        logger.info(f"  BG: {result['bg']:.0f} mg/dL | {result['bg_category']}")
        logger.info(f"  Meal: {result['meal_carbs']:.0f}g carbs")
        logger.info(f"  💉 Model Recommendation: {result['safe_insulin']:.2f} U → {result['dose_category']}")
        
        if result['guardian_blocked']:
            logger.info(f"  🛡️  Guardian Layer: BLOCKED (BG too low for insulin)")
        
        logger.info(f"  Estimated BG Change: {result['estimated_bg_change']:+.1f} mg/dL")
        logger.info(f"  Estimated Final BG: {result['estimated_final_bg']:.0f} mg/dL")
        logger.info("-" * 100)
    
    def print_summary_table(self):
        """Print summary table of all results"""
        if not self.results:
            logger.warning("No results to display!")
            return
        
        logger.info("\n" + "="*150)
        logger.info("SUMMARY TABLE - ALL SCENARIOS")
        logger.info("="*150)
        
        # Print header
        logger.info(f"{'Scenario':<55} | {'BG':<8} | {'Carbs':<6} | {'Insulin (U)':<12} | {'Est. Final BG':<15}")
        logger.info("-" * 150)
        
        # Print each result
        for row in self.results:
            logger.info(
                f"{row['scenario']:<55} | "
                f"{row['bg']:>6.0f}   | "
                f"{row['meal_carbs']:>4.0f}g  | "
                f"{row['safe_insulin']:>10.2f} U | "
                f"{row['estimated_final_bg']:>6.0f} mg/dL"
            )
        
        logger.info("="*150)
    
    def export_csv(self, filename: str = "test_scenarios_results.csv"):
        """Export results to CSV file"""
        if not self.results:
            logger.warning("No results to export!")
            return
        
        df = pd.DataFrame(self.results)
        df.to_csv(filename, index=False)
        logger.info(f"✓ Results exported to: {filename}")
    
    def get_statistics(self):
        """Print statistics about the test results"""
        if not self.results:
            return
        
        df = pd.DataFrame(self.results)
        
        logger.info("\n" + "="*60)
        logger.info("TEST STATISTICS")
        logger.info("="*60)
        
        logger.info(f"Total Scenarios Tested: {len(self.results)}")
        logger.info(f"\nDose Statistics:")
        logger.info(f"  Mean Insulin: {df['safe_insulin'].mean():.2f} U")
        logger.info(f"  Min Insulin: {df['safe_insulin'].min():.2f} U")
        logger.info(f"  Max Insulin: {df['safe_insulin'].max():.2f} U")
        logger.info(f"  Std Dev: {df['safe_insulin'].std():.2f} U")
        
        logger.info(f"\nBlood Glucose Statistics:")
        logger.info(f"  Mean Input BG: {df['bg'].mean():.1f} mg/dL")
        logger.info(f"  Mean Est. Final BG: {df['estimated_final_bg'].mean():.1f} mg/dL")
        
        logger.info(f"\nMeal Statistics:")
        logger.info(f"  Average Carbs: {df['meal_carbs'].mean():.1f}g")
        logger.info(f"  Max Carbs: {df['meal_carbs'].max():.0f}g")
        
        logger.info(f"\nSafety:")
        blocked_count = df['guardian_blocked'].sum()
        logger.info(f"  Guardian Blocks: {blocked_count} scenarios")
        logger.info(f"  Zero Dose (No Insulin): {(df['safe_insulin'] == 0.0).sum()} scenarios")
        
        logger.info("="*60)


def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test SAC model with scenarios")
    parser.add_argument(
        "--model",
        type=str,
        default="models_sac/sac_final.zip",
        help="Path to trained SAC model"
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Export results to CSV"
    )
    
    args = parser.parse_args()
    
    # Create tester and run scenarios
    tester = ScenarioTester(args.model)
    results = tester.run_all_scenarios()
    
    # Print summary table
    tester.print_summary_table()
    
    # Print statistics
    tester.get_statistics()
    
    # Export if requested
    if args.export:
        tester.export_csv()


if __name__ == "__main__":
    main()