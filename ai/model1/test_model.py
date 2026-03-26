import pandas as pd
import torch

from ai.model1.config import PROCESSED_DATA_DIR
from ai.model1.dataset import create_sequences
from ai.model1.model import GlucoseLSTM


def main():
    input_path = PROCESSED_DATA_DIR / "processed_glucose_data.csv"
    df = pd.read_csv(input_path)

    X, y = create_sequences(df)

    model = GlucoseLSTM()

    x_batch = torch.tensor(X[:4], dtype=torch.float32)  # batch of 4
    preds = model(x_batch)

    print("Forward pass successful.")
    print(f"Input batch shape: {x_batch.shape}")
    print(f"Prediction shape: {preds.shape}")
    print(f"Target shape: {torch.tensor(y[:4]).shape}")

    print("\nFirst prediction first 5 values:")
    print(preds[0][:5])


if __name__ == "__main__":
    main()