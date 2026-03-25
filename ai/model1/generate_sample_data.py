import numpy as np
import pandas as pd
from pathlib import Path

from ai.model1.config import RAW_DATA_DIR


def generate_sample_glucose_data(num_rows: int = 220):
    np.random.seed(42)

    timestamps = pd.date_range(
        start="2025-03-01 00:00:00",
        periods=num_rows,
        freq="10min"
    )

    glucose = []
    insulin = []
    carbs = []
    activity = []

    current_glucose = 120.0

    for i in range(num_rows):
        hour = timestamps[i].hour + timestamps[i].minute / 60

        # simulate meal events
        carb = 0.0
        if i in [30, 80, 140, 190]:
            carb = np.random.choice([20, 30, 50, 70, 90])

        # simulate insulin events
        ins = 0.0
        if i in [28, 78, 138, 188]:
            ins = np.random.choice([2, 4, 6, 8])

        # simulate activity events
        act = 0.0
        if i in range(100, 110):
            act = 1.0
        elif i in range(160, 170):
            act = 2.0

        # meal raises glucose
        meal_effect = carb * 0.35

        # insulin lowers glucose
        insulin_effect = ins * 7.5

        # activity lowers glucose a bit
        activity_effect = act * 2.0

        # circadian drift
        circadian = 5 * np.sin(2 * np.pi * hour / 24)

        noise = np.random.normal(0, 2)

        current_glucose = (
            current_glucose
            + meal_effect
            - insulin_effect
            - activity_effect
            + circadian * 0.1
            + noise
        )

        current_glucose = max(70, min(260, current_glucose))

        glucose.append(round(current_glucose, 1))
        insulin.append(ins)
        carbs.append(carb)
        activity.append(act)

    df = pd.DataFrame({
        "timestamp": timestamps,
        "glucose": glucose,
        "insulin": insulin,
        "carbs": carbs,
        "activity": activity,
    })

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_DATA_DIR / "sample_glucose_data.csv"
    df.to_csv(output_path, index=False)

    print(f"Generated sample data at: {output_path}")
    print(df.head())
    print(df.tail())


if __name__ == "__main__":
    generate_sample_glucose_data()