import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler

from ai.model1.config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
)

FEATURE_SCALERS = {}
TARGET_SCALER = MinMaxScaler()


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    return df


def load_and_clean_data(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    # fill missing values
    df["glucose"] = df["glucose"].interpolate().ffill().bfill()
    df["insulin"] = df["insulin"].fillna(0)
    df["carbs"] = df["carbs"].fillna(0)
    df["activity"] = df["activity"].fillna(0)

    df = add_time_features(df)
    return df


def scale_features(df: pd.DataFrame) -> pd.DataFrame:
    scaled_df = df.copy()

    glucose_scaler = MinMaxScaler()
    insulin_scaler = MinMaxScaler()
    carbs_scaler = MinMaxScaler()
    activity_scaler = MinMaxScaler()

    scaled_df["glucose"] = glucose_scaler.fit_transform(df[["glucose"]])
    scaled_df["insulin"] = insulin_scaler.fit_transform(df[["insulin"]])
    scaled_df["carbs"] = carbs_scaler.fit_transform(df[["carbs"]])
    scaled_df["activity"] = activity_scaler.fit_transform(df[["activity"]])

    FEATURE_SCALERS["glucose"] = glucose_scaler
    FEATURE_SCALERS["insulin"] = insulin_scaler
    FEATURE_SCALERS["carbs"] = carbs_scaler
    FEATURE_SCALERS["activity"] = activity_scaler

    return scaled_df


def save_processed_data(df: pd.DataFrame, filename: str = "processed_glucose_data.csv") -> Path:
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DATA_DIR / filename
    df.to_csv(output_path, index=False)
    return output_path


if __name__ == "__main__":
    input_path = RAW_DATA_DIR / "sample_glucose_data.csv"
    df = load_and_clean_data(input_path)
    scaled_df = scale_features(df)
    saved_path = save_processed_data(scaled_df)
    print(f"Processed data saved to: {saved_path}")
    print(scaled_df.head())