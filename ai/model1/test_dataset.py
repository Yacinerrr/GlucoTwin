import pandas as pd
from pathlib import Path

from ai.model1.config import PROCESSED_DATA_DIR
from ai.model1.dataset import create_sequences


def main():
    input_path = PROCESSED_DATA_DIR / "processed_glucose_data.csv"
    df = pd.read_csv(input_path)

    X, y = create_sequences(df)

    print("Sequence generation successful.")
    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")

    print("\nExample first input sequence shape:", X[0].shape)
    print("Example first target shape:", y[0].shape)

    print("\nFirst input first timestep:")
    print(X[0][0])

    print("\nFirst target first 5 glucose values:")
    print(y[0][:5])


if __name__ == "__main__":
    main()