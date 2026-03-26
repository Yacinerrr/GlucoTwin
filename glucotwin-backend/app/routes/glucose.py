from fastapi import APIRouter, HTTPException
from app.schemas.glucose import (
    GlucosePredictionRequest,
    GlucosePredictionResponse,
)
import sys
import os

sys.path.append(os.path.abspath(".."))


from ai.model1.inference import GlucoseModelInference

router = APIRouter()

model_inference = GlucoseModelInference()


def compute_risk_score(predicted_curve: list[float]) -> tuple[float, str]:
    """
    Simple risk logic for MVP.
    Later this can be replaced by Model 3.
    """
    min_glucose = min(predicted_curve)
    max_glucose = max(predicted_curve)

    if min_glucose < 70:
        score = 0.9
        level = "danger"
    elif max_glucose > 180:
        score = 0.7
        level = "warning"
    elif min_glucose < 80 or max_glucose > 160:
        score = 0.4
        level = "warning"
    else:
        score = 0.1
        level = "safe"

    return score, level


@router.post("/predict/glucose", response_model=GlucosePredictionResponse)
def predict_glucose(data: GlucosePredictionRequest):
    try:
        result = model_inference.predict(
            glucose_history=data.glucose_history,
            insulin_history=data.insulin_history,
            carbs_history=data.carbs_history,
            activity_history=data.activity_history,
            timestamps=data.timestamps,
        )

        risk_score, risk_level = compute_risk_score(result["glucose_curve"])

        return GlucosePredictionResponse(
            glucose_curve=result["glucose_curve"],
            peak_glucose=result["peak_glucose"],
            peak_time_hours=result["peak_time_hours"],
            nadir_glucose=result["nadir_glucose"],
            nadir_time_hours=result["nadir_time_hours"],
            confidence_interval=result["confidence_interval"],
            risk_score=risk_score,
            risk_level=risk_level,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.glucose_reading import GlucoseReading
from app.models.user import Doctor, Patient
from app.schemas.glucose import GlucoseReadingCreate, GlucoseReadingResponse
from app.utils.auth import get_current_patient, get_current_doctor




@router.post("/glucose/log", response_model=GlucoseReadingResponse, status_code=status.HTTP_201_CREATED)
def log_glucose(
    data: GlucoseReadingCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    reading = GlucoseReading(
        patient_id=patient.id,
        glucose_value=data.glucose_value,
        recorded_at=data.recorded_at,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/glucose/history/me", response_model=list[GlucoseReadingResponse])
def get_my_glucose_history(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    readings = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient.id)
        .order_by(GlucoseReading.recorded_at.desc())
        .all()
    )
    return readings


@router.get("/glucose/latest/me", response_model=GlucoseReadingResponse)
def get_my_latest_glucose(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
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


@router.get("/glucose/history/{patient_id}", response_model=list[GlucoseReadingResponse])
def get_patient_glucose_history_for_doctor(
    patient_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
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


@router.get("/glucose/latest/{patient_id}", response_model=GlucoseReadingResponse)
def get_patient_latest_glucose_for_doctor(
    patient_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
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