import numpy as np
import pandas as pd

from ai.model1.config import RAW_DATA_DIR


def gaussian_effect(t, peak_time, width, amplitude):
    return amplitude * np.exp(-((t - peak_time) ** 2) / (2 * width ** 2))


def generate_patient_series(
    patient_id: int,
    num_rows: int = 1000,
    seed: int = 42
) -> pd.DataFrame:
    rng = np.random.default_rng(seed + patient_id)

    timestamps = pd.date_range(
        start="2025-03-01 00:00:00",
        periods=num_rows,
        freq="10min"
    )

    glucose = []
    insulin = np.zeros(num_rows)
    carbs = np.zeros(num_rows)
    activity = np.zeros(num_rows)

    # patient-specific characteristics
    insulin_sensitivity = rng.uniform(6.0, 12.0)     # stronger = more drop per unit
    carb_sensitivity = rng.uniform(0.8, 1.5)         # stronger = more rise per carb unit
    baseline = rng.uniform(95, 125)

    current_glucose = baseline

    # create random meals
    meal_indices = sorted(rng.choice(np.arange(20, num_rows - 40), size=18, replace=False))
    for idx in meal_indices:
        carbs[idx] = rng.choice([20, 30, 45, 60, 75, 90])

    # create random insulin doses, often shortly before meals
    for idx in meal_indices:
        insulin_idx = max(0, idx - rng.integers(0, 3))
        insulin[insulin_idx] = rng.choice([2, 4, 6, 8, 10])

    # random activity blocks
    activity_blocks = sorted(rng.choice(np.arange(50, num_rows - 20), size=8, replace=False))
    for idx in activity_blocks:
        duration = rng.integers(3, 10)
        intensity = rng.choice([1, 2])
        activity[idx:idx + duration] = intensity

    for i in range(num_rows):
        ts = timestamps[i]
        hour = ts.hour + ts.minute / 60.0

        # circadian pattern
        circadian = 8 * np.sin(2 * np.pi * hour / 24)

        # meal effect spreads over future horizon
        meal_effect = 0.0
        for j in range(max(0, i - 18), i + 1):
            if carbs[j] > 0:
                dt = (i - j) * 10 / 60  # hours since meal
                meal_effect += gaussian_effect(
                    t=dt,
                    peak_time=1.3,
                    width=0.8,
                    amplitude=carbs[j] * carb_sensitivity * 0.9
                )

        # insulin effect spreads over future horizon
        insulin_effect = 0.0
        for j in range(max(0, i - 24), i + 1):
            if insulin[j] > 0:
                dt = (i - j) * 10 / 60  # hours since insulin
                insulin_effect += gaussian_effect(
                    t=dt,
                    peak_time=2.0,
                    width=1.1,
                    amplitude=insulin[j] * insulin_sensitivity
                )

        # activity effect
        activity_effect = 0.0
        for j in range(max(0, i - 12), i + 1):
            if activity[j] > 0:
                dt = (i - j) * 10 / 60
                activity_effect += gaussian_effect(
                    t=dt,
                    peak_time=0.8,
                    width=0.7,
                    amplitude=activity[j] * 5.0
                )

        noise = rng.normal(0, 2.0)

        current_glucose = (
            baseline
            + circadian
            + meal_effect
            - insulin_effect
            - activity_effect
            + noise
        )

        current_glucose = max(55, min(320, current_glucose))
        glucose.append(round(current_glucose, 1))

    df = pd.DataFrame({
        "timestamp": timestamps,
        "glucose": glucose,
        "insulin": insulin,
        "carbs": carbs,
        "activity": activity,
        "patient_id": patient_id,
    })

    return df


def main():
    all_patients = []
    for patient_id in range(1, 9):
        df = generate_patient_series(patient_id=patient_id, num_rows=1200, seed=42)
        all_patients.append(df)

    full_df = pd.concat(all_patients, ignore_index=True)

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_DATA_DIR / "realistic_glucose_data.csv"
    full_df.to_csv(output_path, index=False)

    print(f"Saved realistic dataset to: {output_path}")
    print(full_df.head())
    print(full_df.shape)


if __name__ == "__main__":
    main()