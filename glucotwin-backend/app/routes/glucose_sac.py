from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.schemas.glucose import (
    GlucosePredictionRequest,
    GlucosePredictionResponse,
)
import sys
import os

sys.path.append(os.path.abspath(".."))

from ai.model3.inference import get_inference_engine
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Doctor, Patient
from app.utils.auth import get_current_patient, get_current_doctor
from app.models.glucose_reading import GlucoseReading
from app.schemas.glucose import GlucoseReadingCreate, GlucoseReadingResponse

router = APIRouter()

# Initialize SAC inference only
sac_inference = None

def get_sac_model():
    global sac_inference
    if sac_inference is None:
        sac_inference = get_inference_engine()
    return sac_inference


# ==================== MODEL 3 (SAC) ENDPOINTS ====================

@router.post("/predict/sac-dose")
def predict_sac_insulin_dose(
    current_glucose: float = Query(...),
    carbs_intake: float = Query(0.0),
    glucose_history: list = Query(None)
):
    """
    Predict insulin dose using SAC Model 3
    
    Args:
        current_glucose: Current blood glucose (mg/dL)
        carbs_intake: Carbohydrates to consume (grams)
        glucose_history: Optional historical glucose readings
    
    Returns:
        Insulin recommendation with dose info
    """
    try:
        model = get_sac_model()
        result = model.predict(
            current_glucose=current_glucose,
            carbs_intake=carbs_intake,
            glucose_history=glucose_history
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAC prediction failed: {str(e)}")


# ==================== GLUCOSE LOGGING & HISTORY ====================

@router.post("/log", response_model=GlucoseReadingResponse, status_code=status.HTTP_201_CREATED)
def log_glucose(
    data: GlucoseReadingCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Log a glucose reading for the current patient"""
    reading = GlucoseReading(
        patient_id=patient.id,
        glucose_value=data.glucose_value,
        recorded_at=data.recorded_at,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/history/me", response_model=list[GlucoseReadingResponse])
def get_my_glucose_history(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Get glucose history for current patient"""
    readings = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient.id)
        .order_by(GlucoseReading.recorded_at.desc())
        .all()
    )
    return readings


@router.get("/latest/me", response_model=GlucoseReadingResponse)
def get_my_latest_glucose(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Get latest glucose reading for current patient"""
    reading = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient.id)
        .order_by(GlucoseReading.recorded_at.desc())
        .first()
    )

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No glucose readings found"
        )

    return reading


@router.get("/history/{patient_id}", response_model=list[GlucoseReadingResponse])
def get_patient_glucose_history_for_doctor(
    patient_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Get glucose history for a patient (doctor only)"""
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.doctor_id == doctor.id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found or not assigned to this doctor"
        )

    readings = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient_id)
        .order_by(GlucoseReading.recorded_at.desc())
        .all()
    )

    return readings


@router.get("/latest/{patient_id}", response_model=GlucoseReadingResponse)
def get_patient_latest_glucose_for_doctor(
    patient_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Get latest glucose reading for a patient (doctor only)"""
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.doctor_id == doctor.id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found or not assigned to this doctor"
        )

    reading = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient_id)
        .order_by(GlucoseReading.recorded_at.desc())
        .first()
    )

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No glucose readings found"
        )

    return reading