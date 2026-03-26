import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

from ai.model1.config import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    INPUT_WINDOW,
    FORECAST_HORIZON,
)


def create_sequences(
    df: pd.DataFrame,
    input_window: int = INPUT_WINDOW,
    forecast_horizon: int = FORECAST_HORIZON,
):
    """
    Convert processed dataframe into supervised sequences.
    If patient_id exists, sequences are built separately per patient.
    """
    X, y = [], []

    if "patient_id" in df.columns:
        grouped = df.groupby("patient_id")
    else:
        grouped = [(None, df)]

    for _, group_df in grouped:
        group_df = group_df.sort_values("timestamp").reset_index(drop=True)

        feature_array = group_df[FEATURE_COLUMNS].values.astype(np.float32)
        target_array = group_df[TARGET_COLUMN].values.astype(np.float32)

        total_length = len(group_df)

        for i in range(total_length - input_window - forecast_horizon + 1):
            x_seq = feature_array[i:i + input_window]
            y_seq = target_array[i + input_window:i + input_window + forecast_horizon]

            X.append(x_seq)
            y.append(y_seq)

    if len(X) == 0:
        raise ValueError(
            "Not enough data to create sequences."
        )

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)

    return X, y


class GlucoseSequenceDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]