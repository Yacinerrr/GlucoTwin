from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
import torch
import io
import os
from torchvision import transforms
import timm  # Use timm for the models

# =========================
# ⚙️ Paths & Device
# =========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GLOBAL_MODEL_PATH = os.path.join(BASE_DIR, "ai", "mealAnalysis", "food_model_final.pth")
ALGERIAN_MODEL_PATH = os.path.join(BASE_DIR, "ai", "mealAnalysis", "food_model_algerian_v3.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================
# ⚙️ Labels
# =========================
algerian_labels1 = [
    "chakhchouka",
    "chekchoukha",
    "couscous",
    "lham hlou",
    "mtaoem",
    "rachta",
    "tajine"
]

# Load Food101 labels from Hugging Face dataset
from datasets import load_dataset
hf_dataset = load_dataset("food101", split="train[:1%]")
food101_labels = hf_dataset.features["label"].names
algerian_labels=food101_labels + algerian_labels1
# =========================
# ⚙️ Image transform
# =========================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# =========================
# ⚙️ Load Models
# =========================
# Global Food101 model
print("Loading global model...")
model_global = timm.create_model('efficientnet_b0', pretrained=False, num_classes=len(food101_labels))
state_dict_global = torch.load(GLOBAL_MODEL_PATH, map_location=device)
print(f"Global state_dict keys sample: {list(state_dict_global.keys())[:5]}")
try:
    model_global.load_state_dict(state_dict_global, strict=True)
    print(f"✓ Loaded global model (strict=True)")
except RuntimeError as e:
    error_msg = str(e)[:300]
    print(f"Strict loading failed: {error_msg}...")
    model_global.load_state_dict(state_dict_global, strict=False)
    print(f"✓ Loaded global model (strict=False)")

model_global.to(device)
model_global.eval()

# Algerian model
print("Loading algerian model...")
model_algerian = timm.create_model('efficientnet_b0', pretrained=False, num_classes=len(algerian_labels))
state_dict_algerian = torch.load(ALGERIAN_MODEL_PATH, map_location=device)
print(f"Algerian state_dict keys sample: {list(state_dict_algerian.keys())[:5]}")
try:
    model_algerian.load_state_dict(state_dict_algerian, strict=True)
    print(f"✓ Loaded algerian model (strict=True)")
except RuntimeError as e:
    error_msg = str(e)[:300]
    print(f"Strict loading failed: {error_msg}...")
    model_algerian.load_state_dict(state_dict_algerian, strict=False)
    print(f"✓ Loaded algerian model (strict=False)")

model_algerian.to(device)
model_algerian.eval()

# =========================
# ⚡ FastAPI Router
# =========================
router = APIRouter()

@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    food_type: str = Form(...)  # "algerian" or "global"
):
    # Choose model and labels
    if food_type == "algerian":
        model = model_algerian
        labels = algerian_labels
    elif food_type == "global":
        model = model_global
        labels = food101_labels
    else:
        raise HTTPException(status_code=400, detail="food_type must be 'algerian' or 'global'")

    # Read & preprocess image
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    print(f"[DEBUG] Image size before transform: {img.size}")

    img = transform(img).unsqueeze(0).to(device)
    print(f"[DEBUG] Input tensor shape: {img.shape}, device: {img.device}")
    print(f"[DEBUG] Input tensor range: [{img.min():.4f}, {img.max():.4f}]")

    # Prediction
    with torch.no_grad():
        outputs = model(img)
        print(f"[DEBUG] Raw outputs shape: {outputs.shape}")
        print(f"[DEBUG] Raw logits: {outputs}")

        probs = torch.nn.functional.softmax(outputs, dim=1)
        print(f"[DEBUG] Probabilities - min: {probs.min():.4f}, max: {probs.max():.4f}, sum: {probs.sum():.4f}")

        top1_prob, top1_idx = torch.topk(probs, 1)

    idx = top1_idx[0][0].item()
    prob = top1_prob[0][0].item()

    print(f"Prediction: {labels[idx]} → {prob*100:.2f}%")

    return {
        "food_name": labels[idx],
        "confidence": round(prob, 4),
        "food_type": food_type,
    }