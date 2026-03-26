from datetime import datetime, timedelta
from ai.model1.inference import GlucoseModelInference


def main():
    model = GlucoseModelInference()

    now = datetime.now()
    timestamps = [now - timedelta(minutes=10 * (47 - i)) for i in range(48)]

    glucose_history = [120 + (i % 6) * 2 for i in range(48)]
    insulin_history = [0.0] * 48
    carbs_history = [0.0] * 48
    activity_history = [0.0] * 48

    carbs_history[-6] = 60.0
    insulin_history[-8] = 4.0
    activity_history[-3] = 1.0

    result = model.predict(
        glucose_history=glucose_history,
        insulin_history=insulin_history,
        carbs_history=carbs_history,
        activity_history=activity_history,
        timestamps=timestamps,
    )

    print("Inference successful.")
    print("Peak glucose:", result["peak_glucose"])
    print("Peak time hours:", result["peak_time_hours"])
    print("First 10 predicted values:", result["glucose_curve"][:10])


if __name__ == "__main__":
    main()