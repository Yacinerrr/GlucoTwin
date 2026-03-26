import numpy as np
import pandas as pd
import torch
import joblib

from ai.model1.config import (
    FEATURE_COLUMNS,
    FORECAST_HORIZON,
    PROCESSED_DATA_DIR,
    SAVED_MODELS_DIR,
)
from ai.model1.model import GlucoseLSTM


class GlucoseModelInference:
    def __init__(self):
        self.model = GlucoseLSTM()
        self.model_path = SAVED_MODELS_DIR / "glucose_lstm.pt"
        self.glucose_scaler = joblib.load(PROCESSED_DATA_DIR / "scalers" / "glucose_scaler.pkl")
        self.glucose_diff_scaler = joblib.load(PROCESSED_DATA_DIR / "scalers" / "glucose_diff_scaler.pkl")
        self.insulin_scaler = joblib.load(PROCESSED_DATA_DIR / "scalers" / "insulin_scaler.pkl")
        self.carbs_scaler = joblib.load(PROCESSED_DATA_DIR / "scalers" / "carbs_scaler.pkl")
        self.activity_scaler = joblib.load(PROCESSED_DATA_DIR / "scalers" / "activity_scaler.pkl")

        self.model.load_state_dict(torch.load(self.model_path, map_location="cpu"))
        self.model.eval()

    def _build_features(
        self,
        glucose_history,
        insulin_history,
        carbs_history,
        activity_history,
        timestamps,
    ):
        df = pd.DataFrame({
            "glucose": glucose_history,
            "insulin": insulin_history,
            "carbs": carbs_history,
            "activity": activity_history,
            "timestamp": pd.to_datetime(timestamps),
        })

        df["glucose_diff"] = df["glucose"].diff().fillna(0.0)

        hour = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

        df["glucose"] = self.glucose_scaler.transform(df[["glucose"]])
        df["glucose_diff"] = self.glucose_diff_scaler.transform(df[["glucose_diff"]])
        df["insulin"] = self.insulin_scaler.transform(df[["insulin"]])
        df["carbs"] = self.carbs_scaler.transform(df[["carbs"]])
        df["activity"] = self.activity_scaler.transform(df[["activity"]])

        return df[FEATURE_COLUMNS].values.astype(np.float32)

    def predict(
        self,
        glucose_history,
        insulin_history,
        carbs_history,
        activity_history,
        timestamps,
    ):
        features = self._build_features(
            glucose_history,
            insulin_history,
            carbs_history,
            activity_history,
            timestamps,
        )

        x = torch.tensor(features[np.newaxis, :, :], dtype=torch.float32)

        with torch.no_grad():
            pred = self.model(x).numpy()[0]

        pred = self.glucose_scaler.inverse_transform(pred.reshape(-1, 1)).flatten()

        pred = np.clip(pred, 40, 400)

# Round nicely and convert to Python float (not numpy float)
        pred = [round(float(x), 1) for x in pred]
        

        peak_glucose = round(float(np.max(pred)), 1)

        peak_index = int(np.argmax(pred))
        peak_time_hours = round((peak_index + 1) * 10 / 60, 2)

        nadir_glucose = round(float(np.min(pred)), 1)
        nadir_index = int(np.argmin(pred))
        nadir_time_hours = round((nadir_index + 1) * 10 / 60, 2)

        return {
            "glucose_curve": pred,
            "peak_glucose": peak_glucose,
            "peak_time_hours": peak_time_hours,
            "nadir_glucose": nadir_glucose,
            "nadir_time_hours": nadir_time_hours,
            "confidence_interval": 15.0,
        }