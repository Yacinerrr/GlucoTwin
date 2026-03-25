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
    Convert a processed dataframe into supervised learning sequences.

    X shape: [num_samples, input_window, num_features]
    y shape: [num_samples, forecast_horizon]
    """
    feature_array = df[FEATURE_COLUMNS].values.astype(np.float32)
    target_array = df[TARGET_COLUMN].values.astype(np.float32)

    X, y = [], []

    total_length = len(df)

    for i in range(total_length - input_window - forecast_horizon + 1):
        x_seq = feature_array[i : i + input_window]
        y_seq = target_array[i + input_window : i + input_window + forecast_horizon]

        X.append(x_seq)
        y.append(y_seq)

    if len(X) == 0:
        raise ValueError(
            "Not enough data to create sequences. "
            f"Need at least {input_window + forecast_horizon} rows, got {total_length}."
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