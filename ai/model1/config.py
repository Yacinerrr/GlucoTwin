from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
SAVED_MODELS_DIR = BASE_DIR / "saved_models"

INPUT_WINDOW = 48
FORECAST_HORIZON = 48

FEATURE_COLUMNS = [
    "glucose",
    "glucose_diff",
    "insulin",
    "carbs",
    "activity",
    "hour_sin",
    "hour_cos",
]

TARGET_COLUMN = "glucose"

BATCH_SIZE = 32
LEARNING_RATE = 5e-4
EPOCHS = 40

HIDDEN_SIZE = 256
NUM_LAYERS = 3
DROPOUT = 0.3