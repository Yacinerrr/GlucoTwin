import pandas as pd
import numpy as np
import torch
import matplotlib.pyplot as plt
import joblib

from ai.model1.config import (
    PROCESSED_DATA_DIR,
    SAVED_MODELS_DIR,
)
from ai.model1.dataset import create_sequences
from ai.model1.model import GlucoseLSTM


def denormalize_glucose(values):
    scaler_path = PROCESSED_DATA_DIR / "scalers" / "glucose_scaler.pkl"
    scaler = joblib.load(scaler_path)
    values = np.array(values).reshape(-1, 1)
    return scaler.inverse_transform(values).flatten()


def compute_metrics(pred_real, target_real):
    mae = np.mean(np.abs(pred_real - target_real))
    rmse = np.sqrt(np.mean((pred_real - target_real) ** 2))
    return mae, rmse


def plot_sample(pred_real, target_real, sample_idx, output_dir):
    plt.figure(figsize=(12, 6))
    plt.plot(target_real, label="Actual Future Glucose", linewidth=2)
    plt.plot(pred_real, label="Predicted Future Glucose", linestyle="--", linewidth=2)
    plt.title(f"Model 1 - Predicted vs Actual Glucose Curve (Sample {sample_idx})")
    plt.xlabel("Future Time Step (10 min each)")
    plt.ylabel("Glucose (mg/dL)")
    plt.legend()
    plt.grid(True)

    plot_path = output_dir / f"prediction_vs_actual_sample_{sample_idx}.png"
    plt.savefig(plot_path, bbox_inches="tight")
    plt.close()

    return plot_path


def main():
    input_path = PROCESSED_DATA_DIR / "processed_glucose_data.csv"
    df = pd.read_csv(input_path)

    X, y = create_sequences(df)

    model = GlucoseLSTM()
    model_path = SAVED_MODELS_DIR / "glucose_lstm.pt"
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    output_dir = SAVED_MODELS_DIR / "plots"
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_indices = [0, len(X) // 2, len(X) - 1]
    maes = []
    rmses = []

    for sample_idx in sample_indices:
        x_sample = torch.tensor(X[sample_idx:sample_idx + 1], dtype=torch.float32)

        with torch.no_grad():
            pred = model(x_sample).numpy()[0]

        target = y[sample_idx]

        pred_real = denormalize_glucose(pred)
        target_real = denormalize_glucose(target)

        mae, rmse = compute_metrics(pred_real, target_real)
        maes.append(mae)
        rmses.append(rmse)

        plot_path = plot_sample(pred_real, target_real, sample_idx, output_dir)
        print(f"Sample {sample_idx} - MAE: {mae:.2f} mg/dL - RMSE: {rmse:.2f} mg/dL")
        print(f"Plot saved to: {plot_path}")

    print(f"\nAverage MAE over samples: {np.mean(maes):.2f} mg/dL")
    print(f"Average RMSE over samples: {np.mean(rmses):.2f} mg/dL")


if __name__ == "__main__":
    main()