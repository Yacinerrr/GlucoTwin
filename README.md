<div align="center">

<img src="https://img.shields.io/badge/GlucoTwin-Digital%20Twin%20AI-0F6E56?style=for-the-badge&logoColor=white" />

# GlucoTwin
### Deep Learning Digital Twin for Personalized Diabetes Management

> *Predict. Protect. Personalize.*

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Solution Architecture](#-solution-architecture)
- [AI Models](#-ai-models)
- [Dataset](#-dataset)
- [Training Metrics](#-training-metrics)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Reference](#-api-reference)
- [Model Weights](#-model-weights)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Team](#-team)
- [Limitations](#-limitations)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🧬 Overview

**GlucoTwin** is an AI-powered web application that builds a personalized **digital twin** of each diabetic patient's metabolism. Unlike generic glucose calculators that use population averages, GlucoTwin learns how *your specific body* responds to food, insulin, and activity — then predicts your glucose curve for the next 8 hours and warns you before dangerous situations occur.

The system is built specifically for the **Algerian and Arab world diabetic population** — 4+ million patients in Algeria alone — who have zero access to commercial CGM tools like Dexcom or Abbott FreeStyle Libre.

**Key capabilities:**
- 🔮 Predict blood glucose for the next 8 hours with clinical accuracy
- 📸 Estimate meal carbohydrates from a single phone photo
- 🚨 Score hypoglycemia risk continuously — especially overnight
- 💉 Recommend personalized insulin doses with timing
- 👨‍⚕️ Connect patients to their endocrinologist in real time
- 🌙 Dedicated Ramadan fasting mode
- 📱 Full offline functionality as a PWA

---

## 🩺 The Problem

Algeria has **4+ million diabetic patients** but:

| Challenge | Reality |
|-----------|---------|
| Physician access | 1 doctor per 1,000 patients — endocrinologists see 50–80 patients/day |
| Smart glucose tools | Dexcom / Abbott not commercially available in Algeria |
| Cost | Commercial CGM systems cost 10–30× the average monthly salary |
| Personalization | Generic insulin dosing rules ignore individual metabolic differences |
| Language | No Arabic-language glucose management tools exist |
| Ramadan | 0 tools adapt insulin protocols for fasting |

Every day, millions of patients make life-or-death insulin dosing decisions based on guesswork. GlucoTwin changes that.

---

## 🏗️ Solution Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PATIENT / DOCTOR                      │
│              Next.js 14 PWA (TypeScript)                 │
│   Dashboard │ Meal Scanner │ Twin Simulator │ Doctor Portal │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JSON)
                       │ JWT Authentication
┌──────────────────────▼──────────────────────────────────┐
│                   FASTAPI BACKEND                        │
│  /predict/glucose │ /predict/meal │ /recommend/insulin   │
│  /predict/risk    │ /twin/*       │ /auth/*              │
└──────┬───────────────────────────────────┬──────────────┘
       │                                   │
┌──────▼──────┐                   ┌────────▼────────┐
│  AI ENGINE  │                   │    SUPABASE      │
│  PyTorch    │                   │   PostgreSQL     │
│  XGBoost    │                   │  doctors table   │
│  EfficientNet│                  │  patients table  │
│  ONNX       │                   │  readings table  │
└─────────────┘                   └─────────────────┘
```

---

## 🤖 AI Models

GlucoTwin uses **4 interconnected AI models**:

### Model 1 — Glucose Forecaster (LSTM)
> *The digital twin engine — predicts the next 8 hours*

| Property | Value |
|----------|-------|
| Architecture | 3-layer LSTM, hidden_size=128 |
| Input | Last 24 timesteps × 5 features (4h of history at 10-min intervals) |
| Input features | Glucose, carbs, insulin dose, activity level, hour of day |
| Output | 48 predicted glucose values (one every 10 min for 8h) |
| Parameters | ~280,000 trainable |
| Loss function | Mean Squared Error (MSE) |
| Optimizer | Adam (lr=0.001) + ReduceLROnPlateau scheduler |
| Gradient clipping | Max norm 1.0 (prevents LSTM exploding gradients) |
| Training | Google Colab T4 GPU — ~2 hours |

**Why LSTM?** Glucose dynamics are deeply sequential — what you ate 2 hours ago, the insulin you injected 90 minutes ago, and the exercise you did this morning all affect your current trajectory. LSTM's gated memory cells learn exactly these multi-hour dependencies.

---

### Model 2 — Meal Carbohydrate Scanner (EfficientNet-B0)
> *Photo → carbohydrate grams in under 3 seconds*

| Property | Value |
|----------|-------|
| Architecture | EfficientNet-B0 (ImageNet pre-trained, fine-tuned) |
| Input | RGB image 224×224 px |
| Output | Food category (101 classes) + carbs in grams |
| Dataset | Food-101 (101,000 images) |
| Nutrition mapping | USDA FoodData Central API |
| Target accuracy | Top-1 > 75% on Food-101 validation |

---

### Model 3 — Hypoglycemia Risk Scorer (XGBoost)
> *Continuous overnight danger assessment — 0% to 100%*

| Property | Value |
|----------|-------|
| Algorithm | XGBoost gradient-boosted trees (200 estimators) |
| Input features | Current glucose, trend slope, last insulin dose, hours since meal, hour of day, activity level |
| Output | Risk probability 0.0–1.0 → Safe / Warning / Danger |
| Alert thresholds | Warning: >40% \| Danger: >70% |
| Target AUC-ROC | >0.85 |
| Target sensitivity | >80% (misses no true hypoglycemia events) |
| Inference time | <50ms |

**Why XGBoost?** Fast, interpretable, excellent on small tabular datasets with only 6 features. Runs on CPU in under 50ms — perfect for background monitoring every 10 minutes.

---

### Model 4 — Insulin Dose Recommender
> *Personalized dose + timing recommendation*

| Property | Value |
|----------|-------|
| Current implementation | Clinically validated rule-based algorithm |
| Correction dose | (Current glucose − Target) / Sensitivity factor |
| Carb dose | Planned carbs / Insulin-to-carb ratio |
| Total dose | Correction + carb dose, rounded to 0.5u |
| Safety cap | Patient historical maximum + 15% |
| Ramadan mode | 15% conservative reduction during fasting state |
| RL upgrade | PPO agent on SimGlucose — in development |

---

## 📊 Dataset

### Primary Dataset
The glucose forecaster was trained on a **real-world clinical CGM dataset** from Type 1 diabetic patients containing:
- Continuous glucose readings every 5–10 minutes
- Insulin pump dose logs
- Meal logs with carbohydrate estimates
- Physical activity records
- Multiple weeks of continuous per-patient monitoring

### SimGlucose Supplementary Data
To augment training, **SimGlucose** (implements the FDA-accepted UVA/Padova T1D metabolic simulator) was used to generate synthetic data:
- 10 virtual patient profiles (adolescent + adult)
- 60 days simulated per patient
- ~86,400 additional glucose readings
- Includes realistic dawn effect, meal responses, activity perturbations

### Food Dataset (Model 2)
- **Food-101**: 101,000 images across 101 food categories
- **USDA FoodData Central**: Carbohydrate content per serving
- Custom extension for Algerian dishes in progress

### Data Preprocessing
```python
# Sliding window approach
input_steps  = 24   # 4 hours of history
output_steps = 48   # 8 hours of prediction
features     = ['glucose', 'carbs', 'insulin', 'activity', 'hour']

# Normalization — fit on train only (no leakage)
scaler = MinMaxScaler(feature_range=(0, 1))

# Split — temporal order preserved (no shuffling)
train: 80% | val: 10% | test: 10%
```

---

## 📈 Training Metrics

### Model 1 — Glucose Forecaster

| Metric | Target | Clinical Significance |
|--------|--------|-----------------------|
| MAE (Mean Absolute Error) | < 20 mg/dL | Average prediction deviation |
| RMSE | < 30 mg/dL | Penalizes large dangerous errors |
| Clarke Zone A | > 70% | Clinically accurate predictions |
| Training | Smooth convergence | No overfitting (early stopping ~epoch 38) |

> A MAE of 15–20 mg/dL is considered clinically acceptable. For reference, the FDA-cleared Dexcom G7 sensor itself has a MARD of ~8% (~10 mg/dL at 120 mg/dL).

### Model 3 — Risk Scorer

| Metric | Target |
|--------|--------|
| AUC-ROC | > 0.85 |
| Sensitivity (Recall) | > 80% |
| Specificity | > 75% |
| Inference time | < 50ms |

> **Clinical note:** We deliberately prioritize sensitivity over specificity — a missed hypoglycemia event is far more dangerous than a false alarm.

---

## 🛠️ Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| API Framework | FastAPI (Python 3.11) |
| AI / ML | PyTorch 2.2, XGBoost, scikit-learn |
| Computer Vision | EfficientNet, torchvision |
| Model Export | ONNX (offline inference) |
| Authentication | JWT (python-jose) + bcrypt (passlib) |
| Database ORM | SQLAlchemy |
| Server | Uvicorn ASGI |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| HTTP Client | Axios |
| PWA | next-pwa |
| State | React Context + Zustand |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Database | Supabase (PostgreSQL) |
| Hosting DB | Supabase cloud (SSL enforced) |
| Containerization | Docker (production-ready) |
| Model serving | FastAPI + PyTorch CPU inference |

---

## 📁 Project Structure

```
GlucoTwin/
│
├── glucotwin-backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS + router registration
│   │   ├── config.py               # Settings from .env via pydantic-settings
│   │   ├── database.py             # SQLAlchemy engine + session + get_db()
│   │   ├── models/
│   │   │   ├── user.py             # Doctor + Patient SQLAlchemy models
│   │   │   └── glucose_model.py    # LSTM architecture + GlucosePredictor class
│   │   ├── schemas/
│   │   │   ├── user.py             # Pydantic schemas: register, login, response
│   │   │   ├── glucose.py          # GlucoseInput + GlucosePrediction
│   │   │   ├── meal.py             # MealAnalysis schema
│   │   │   ├── insulin.py          # InsulinInput + InsulinRecommendation
│   │   │   └── risk.py             # RiskInput + RiskAssessment
│   │   ├── routes/
│   │   │   ├── auth.py             # /auth/* — register, login, me, link-doctor
│   │   │   ├── predict.py          # /predict/glucose + /predict/risk
│   │   │   ├── meal.py             # /predict/meal
│   │   │   ├── insulin.py          # /recommend/insulin
│   │   │   └── twin.py             # /twin/profile + /twin/update
│   │   └── utils/
│   │       └── auth.py             # JWT, bcrypt, get_current_user, role guards
│   ├── saved_models/               # Trained model weights (see Model Weights section)
│   │   ├── glucose_lstm_final.pt
│   │   ├── model_config.json
│   │   ├── scaler_X.pkl
│   │   └── scaler_y.pkl
│   ├── .env                        # Environment variables (not committed)
│   ├── run.py                      # Uvicorn entry point
│   └── requirements.txt
│
├── front end/                      # Next.js frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/              # Login page
│   │   │   └── register/           # Registration (patient / doctor)
│   │   ├── dashboard/              # Main patient dashboard
│   │   ├── meal/                   # Meal scanner + food log
│   │   ├── twin/                   # Digital twin simulator
│   │   ├── alerts/                 # Alert history
│   │   ├── doctor/                 # Doctor portal
│   │   │   └── patient/[id]/       # Individual patient detail
│   │   └── settings/               # Patient profile settings
│   ├── components/
│   │   ├── GlucoseChart.tsx        # Recharts real-time glucose curve
│   │   ├── RiskMeter.tsx           # Visual risk 0–100% indicator
│   │   ├── MealScanner.tsx         # Camera + upload component
│   │   └── DoseCard.tsx            # Insulin recommendation card
│   ├── lib/
│   │   └── api.ts                  # Axios client + all API call functions
│   └── package.json
│
└── ai/                             # Training notebooks + model artifacts
    ├── GlucoTwin_Model1_Training.ipynb   # Google Colab training notebook
    ├── glucose_lstm_final.pt             # Trained LSTM weights
    ├── model_config.json                 # Architecture config
    ├── scaler_X.pkl                      # Input normalizer
    └── scaler_y.pkl                      # Output denormalizer
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- Git

### Backend Setup

```bash
# 1. Clone the repo
git clone https://github.com/Yacinerrr/GlucoTwin.git
cd GlucoTwin/glucotwin-backend

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# 3. Install dependencies
pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary
pip install python-jose[cryptography] passlib[bcrypt]
pip install pydantic[email] pydantic-settings python-dotenv
pip install torch torchvision xgboost scikit-learn
pip install pillow efficientnet_pytorch

# 4. Set up environment variables (see section below)
cp .env.example .env
# Edit .env with your Supabase credentials

# 5. Download model weights (see Model Weights section)
# Place in glucotwin-backend/saved_models/

# 6. Run the server
python run.py
```

The API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
# From the repo root
cd "front end"

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your FastAPI backend URL

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

**Backend `.env`:**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
SECRET_KEY=your_super_secret_key_minimum_32_characters_long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=GlucoTwin
```

---

## 📡 API Reference

All endpoints except `/health` and `/auth/login` and `/auth/*/register` require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/auth/doctor/register` | `{email, full_name, password, specialty?, hospital?}` | Register doctor — generates invite code |
| POST | `/auth/patient/register` | `{email, full_name, password, diabetes_type?, doctor_invite_code?}` | Register patient |
| POST | `/auth/login` | `{email, password}` | Login — returns JWT token |
| GET | `/auth/doctor/me` | — | Doctor profile + all linked patients |
| GET | `/auth/patient/me` | — | Patient profile + doctor info |
| POST | `/auth/patient/link-doctor` | `{invite_code}` | Link patient to doctor |
| GET | `/auth/doctor/patients` | — | All patients of this doctor |
| GET | `/auth/doctor/invite-code` | — | Get/share invite code |

### AI Predictions

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/predict/glucose` | `{glucose_history, last_meal_carbs, last_insulin_dose, activity_level, hour_of_day}` | `{glucose_curve[48], risk_score, risk_level, peak_glucose, peak_time_hours, alert_message}` |
| POST | `/predict/risk` | `{current_glucose, trend_slope, last_insulin_dose, hours_since_meal, hour_of_day, activity_level}` | `{risk_score, risk_level, risk_window, recommended_action}` |
| POST | `/predict/meal` | `file: image/*` (multipart) | `{food_name, estimated_carbs, glycemic_index, glucose_risk, confidence, recommended_action}` |
| POST | `/recommend/insulin` | `{current_glucose, planned_meal_carbs, insulin_ratio, sensitivity, target_glucose, is_ramadan?, activity_planned?}` | `{total_dose, correction_dose, carb_dose, inject_timing, bedtime_correction?, warning?}` |

### Example Request — Glucose Prediction

```bash
curl -X POST http://localhost:8000/predict/glucose \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "glucose_history": [118, 122, 125, 128, 132, 138, 145, 152],
    "last_meal_carbs": 90,
    "last_insulin_dose": 4.5,
    "activity_level": 1,
    "hour_of_day": 20
  }'
```

### Example Response

```json
{
  "glucose_curve": [155, 163, 175, 192, 215, 238, 255, 261, 258, 248, ...],
  "risk_score": 0.71,
  "risk_level": "danger",
  "peak_glucose": 261.3,
  "peak_time_hours": 2.17,
  "nadir_glucose": 128.4,
  "nadir_time_hours": 6.83,
  "confidence_interval": 15.0,
  "alert_message": "DANGER: Glucose predicted to reach 261 mg/dL in 2.2h. Take action now."
}
```

---

## 🧠 Model Weights

The trained model weights are **not included in the repository** due to file size. Download them from the links below and place them in `glucotwin-backend/saved_models/`.

### Required Files

| File | Size | Description | Download |
|------|------|-------------|----------|
| `glucose_lstm_final.pt` | ~4 MB | LSTM glucose forecaster weights | [Download ⬇️](https://drive.google.com/drive/folders/YOUR_FOLDER_ID) |
| `model_config.json` | <1 KB | LSTM architecture configuration | [Download ⬇️](https://drive.google.com/drive/folders/YOUR_FOLDER_ID) |
| `scaler_X.pkl` | <1 KB | Input feature normalizer (MinMaxScaler) | [Download ⬇️](https://drive.google.com/drive/folders/YOUR_FOLDER_ID) |
| `scaler_y.pkl` | <1 KB | Output glucose denormalizer | [Download ⬇️](https://drive.google.com/drive/folders/YOUR_FOLDER_ID) |

> **Note:** If model weights are unavailable, the API automatically falls back to a physiologically realistic mock predictor based on pharmacokinetic equations. All endpoints remain functional.

### Download All at Once

```bash
# From glucotwin-backend/
mkdir -p saved_models
cd saved_models

# Replace with your actual Google Drive folder link
# or use the direct download script:
python ../scripts/download_models.py
```

### Retrain the Model Yourself

If you want to retrain Model 1 from scratch:

1. Open `ai/GlucoTwin_Model1_Training.ipynb` in Google Colab
2. Set runtime to **T4 GPU** (Runtime → Change runtime type)
3. Run all cells sequentially
4. Download the 4 output files from the last cell
5. Place them in `glucotwin-backend/saved_models/`

Training time: approximately 2 hours on a free Colab T4 GPU.

---

## ✨ Features

### Patient Features
- **Real-time glucose prediction** — 8-hour curve with confidence interval
- **Meal photo scanner** — point camera at plate, get carbs instantly
- **Hypoglycemia risk score** — continuous 0–100% danger assessment
- **Insulin dose recommendation** — personalized correction + carb coverage
- **Overnight alert system** — alarm if dangerous glucose drop predicted during sleep
- **Digital twin simulator** — adjust sliders to see "what if I eat this?"
- **Weekly report** — TIR, HbA1c estimate, episode count, doctor-ready PDF
- **Ramadan mode** — adapted insulin schedule for fasting hours
- **Offline mode** — full functionality without internet (PWA)
- **Arabic + French language** — accessible to all Algerian patients

### Doctor Features
- **Patient portal** — all linked patients ranked by risk score
- **Color-coded dashboard** — green (stable), orange (attention), red (urgent)
- **Unique invite code** — share with patients to link them to your account
- **Clinical notes** — add timestamped notes to patient records
- **Direct messaging** — contact patients from within the app
- **Auto-alerts** — notified immediately when a patient enters danger zone

### Technical Features
- JWT authentication with role-based access (patient / doctor)
- Doctor–patient relationship via invite code system
- Row-level security in Supabase
- ONNX model export for offline CPU inference
- Progressive Web App — installable on iOS and Android

---

## 📱 Screenshots

> Screenshots of the running application:

| Dashboard | Meal Scanner | Doctor Portal |
|-----------|-------------|---------------|
| Real-time glucose curve + alerts | Photo → carbs analysis | Patient risk overview |

| Twin Simulator | Settings | Alert History |
|----------------|----------|---------------|
| Interactive prediction | Ramadan + offline modes | Full alert log |

---

## 👥 Team

| Member | Role | Responsibilities |
|--------|------|-----------------|
| **Member 1** | AI Engineer | LSTM model, EfficientNet scanner, XGBoost risk scorer, FastAPI inference server |
| **Member 2** | Full-Stack Developer | Next.js frontend, Supabase schema, authentication system, API integration |
| **Member 3** | Medical Expert | Clinical validation, alert messages, Ramadan protocols, insulin formula verification, pitch |

---

## ⚠️ Limitations

- **Not a medical device.** GlucoTwin is an AI-powered decision support tool. All recommendations are advisory and must be reviewed by your physician.
- **No CGM hardware integration.** Glucose data must be entered manually in this version.
- **Cold start.** The digital twin requires ~7 days of data before predictions become meaningfully personalized.
- **Food coverage.** Meal scanner accuracy is lower for traditional Algerian dishes not in the Food-101 dataset (in progress).
- **Model 4.** The insulin recommender uses a rule-based algorithm — the RL-trained PPO agent is in development.
- **Not clinically validated.** No formal clinical trial has been conducted. Metrics are based on retrospective dataset evaluation.

---

## 🗺️ Roadmap

- [ ] Complete PPO reinforcement learning insulin recommender
- [ ] Expand food database with 200+ Algerian dishes
- [ ] Full frontend ↔ backend API integration
- [ ] CGM hardware integration (Dexcom, Abbott FreeStyle Libre)
- [ ] Production deployment with domain + SSL
- [ ] Clinical validation study (50 patients, partnering hospital)
- [ ] Native Android + iOS app (React Native)
- [ ] Federated learning — local model updates, no raw data sharing
- [ ] Expansion to Tunisia, Morocco, Egypt

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with purpose for 4 million Algerian diabetics.**

*GlucoTwin — AI Hackathon 2026*

⭐ Star this repo if you believe AI can save lives in underserved markets.

</div>