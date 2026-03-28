@router.post("/predict")
async def predict_food(
    file: UploadFile = File(...),
    food_type: str = None
):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img = transform(img).unsqueeze(0).to(device)

    # 🔥 choix modèle selon frontend
    if food_type == "algerian":
        pred, conf = predict(model_algerian, img)
        label = algerian_labels[pred - 101] if pred >= 101 else algerian_labels[0]

        return {
            "food_name": label,
            "confidence": conf,
            "type": "Algerian 🇩🇿"
        }

    elif food_type == "global":
        pred, conf = predict(model_global, img)

        return {
            "food_name": food_labels[pred],
            "confidence": conf,
            "type": "Global 🌍"
        }

    else:
        return {"error": "food_type must be 'algerian' or 'global'"}