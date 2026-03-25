from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
SAVED_MODELS_DIR = BASE_DIR / "saved_models"

INPUT_WINDOW = 48          # last 48 time steps
FORECAST_HORIZON = 48      # next 48 time steps
FEATURE_COLUMNS = [
    "glucose",
    "insulin",
    "carbs",
    "activity",
    "hour_sin",
    "hour_cos",
]
TARGET_COLUMN = "glucose"

BATCH_SIZE = 32
LEARNING_RATE = 1e-3
EPOCHS = 20

HIDDEN_SIZE = 128
NUM_LAYERS = 2
DROPOUT = 0.2