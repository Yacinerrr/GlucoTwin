import copy
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset

from ai.model1.config import (
    PROCESSED_DATA_DIR,
    BATCH_SIZE,
    LEARNING_RATE,
    EPOCHS,
    SAVED_MODELS_DIR,
)
from ai.model1.dataset import create_sequences, GlucoseSequenceDataset
from ai.model1.model import GlucoseLSTM


def weighted_mse_loss(preds, targets):
    """
    Penalize errors more when the target deviates strongly from local average.
    This pushes the model to care a bit more about sharper movements.
    """
    weights = 1.0 + 2.0 * torch.abs(targets - targets.mean(dim=1, keepdim=True))
    return torch.mean(weights * (preds - targets) ** 2)


def chronological_split(dataset, train_ratio=0.8):
    total_size = len(dataset)
    train_size = int(train_ratio * total_size)
    train_indices = list(range(train_size))
    val_indices = list(range(train_size, total_size))
    return Subset(dataset, train_indices), Subset(dataset, val_indices)


def main():
    input_path = PROCESSED_DATA_DIR / "processed_glucose_data.csv"
    df = pd.read_csv(input_path)

    X, y = create_sequences(df)
    dataset = GlucoseSequenceDataset(X, y)

    train_dataset, val_dataset = chronological_split(dataset, train_ratio=0.8)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    model = GlucoseLSTM()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)

    best_val_loss = float("inf")
    best_state = None
    patience = 8
    patience_counter = 0

    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0

        for xb, yb in train_loader:
            optimizer.zero_grad()
            preds = model(xb)
            loss = weighted_mse_loss(preds, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for xb, yb in val_loader:
                preds = model(xb)
                loss = weighted_mse_loss(preds, yb)
                val_loss += loss.item()

        val_loss /= len(val_loader)

        print(
            f"Epoch {epoch + 1}/{EPOCHS} - "
            f"Train Loss: {train_loss:.4f} - "
            f"Val Loss: {val_loss:.4f}"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = copy.deepcopy(model.state_dict())
            patience_counter = 0
        else:
            patience_counter += 1

        if patience_counter >= patience:
            print(f"Early stopping triggered at epoch {epoch + 1}")
            break

    if best_state is not None:
        model.load_state_dict(best_state)

    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = SAVED_MODELS_DIR / "glucose_lstm.pt"
    torch.save(model.state_dict(), model_path)

    print(f"\nBest Val Loss: {best_val_loss:.4f}")
    print(f"Model saved to: {model_path}")


if __name__ == "__main__":
    main()