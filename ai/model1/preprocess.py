import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
import joblib

from ai.model1.config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
)

FEATURE_SCALERS = {}


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    return df


def add_glucose_features(df: pd.DataFrame) -> pd.DataFrame:
    if "patient_id" in df.columns:
        df["glucose_diff"] = df.groupby("patient_id")["glucose"].diff().fillna(0.0)
    else:
        df["glucose_diff"] = df["glucose"].diff().fillna(0.0)
    return df


def load_and_clean_data(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["patient_id", "timestamp"] if "patient_id" in df.columns else ["timestamp"]).reset_index(drop=True)

    df["glucose"] = df["glucose"].interpolate().ffill().bfill()
    df["insulin"] = df["insulin"].fillna(0.0)
    df["carbs"] = df["carbs"].fillna(0.0)
    df["activity"] = df["activity"].fillna(0.0)

    df = add_time_features(df)
    df = add_glucose_features(df)
    return df


def scale_features(df: pd.DataFrame) -> pd.DataFrame:
    scaled_df = df.copy()

    glucose_scaler = MinMaxScaler()
    glucose_diff_scaler = MinMaxScaler(feature_range=(-1, 1))
    insulin_scaler = MinMaxScaler()
    carbs_scaler = MinMaxScaler()
    activity_scaler = MinMaxScaler()

    scaled_df["glucose"] = glucose_scaler.fit_transform(df[["glucose"]])
    scaled_df["glucose_diff"] = glucose_diff_scaler.fit_transform(df[["glucose_diff"]])
    scaled_df["insulin"] = insulin_scaler.fit_transform(df[["insulin"]])
    scaled_df["carbs"] = carbs_scaler.fit_transform(df[["carbs"]])
    scaled_df["activity"] = activity_scaler.fit_transform(df[["activity"]])

    FEATURE_SCALERS["glucose"] = glucose_scaler
    FEATURE_SCALERS["glucose_diff"] = glucose_diff_scaler
    FEATURE_SCALERS["insulin"] = insulin_scaler
    FEATURE_SCALERS["carbs"] = carbs_scaler
    FEATURE_SCALERS["activity"] = activity_scaler

    scaler_dir = PROCESSED_DATA_DIR / "scalers"
    scaler_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(glucose_scaler, scaler_dir / "glucose_scaler.pkl")
    joblib.dump(glucose_diff_scaler, scaler_dir / "glucose_diff_scaler.pkl")
    joblib.dump(insulin_scaler, scaler_dir / "insulin_scaler.pkl")
    joblib.dump(carbs_scaler, scaler_dir / "carbs_scaler.pkl")
    joblib.dump(activity_scaler, scaler_dir / "activity_scaler.pkl")

    return scaled_df


def save_processed_data(df: pd.DataFrame, filename: str = "processed_glucose_data.csv") -> Path:
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DATA_DIR / filename
    df.to_csv(output_path, index=False)
    return output_path


if __name__ == "__main__":
    input_path = RAW_DATA_DIR / "realistic_glucose_data.csv"
    df = load_and_clean_data(input_path)
    scaled_df = scale_features(df)
    saved_path = save_processed_data(scaled_df)
    print(f"Processed data saved to: {saved_path}")
    print(scaled_df.head())