from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.database import get_db
from app.models.insulin_dose import InsulinDose
from app.models.user import Patient, Doctor
from app.schemas.insulin import (
    InsulinDoseCreate,
    InsulinDoseResponse,
    InsulinDoseUpdate,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/insulin", tags=["insulin"])


@router.post("/log", response_model=InsulinDoseResponse)
def log_insulin_dose(
    dose_data: InsulinDoseCreate,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log an insulin dose (patient only)
    """
    # Verify user is a patient
    if not isinstance(current_user, Patient):
        raise HTTPException(status_code=403, detail="Only patients can log insulin doses")

    # Create insulin dose record
    insulin_dose = InsulinDose(
        patient_id=current_user.id,
        dose_amount=dose_data.dose_amount,
        dose_type=dose_data.dose_type,
        current_glucose=dose_data.current_glucose,
        carbs_intake=dose_data.carbs_intake,
        notes=dose_data.notes,
        is_recommended=dose_data.is_recommended,
        recorded_at=dose_data.recorded_at,
    )

    db.add(insulin_dose)
    db.commit()
    db.refresh(insulin_dose)

    return insulin_dose


@router.get("/history/me", response_model=List[InsulinDoseResponse])
def get_insulin_history(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 7,
):
    """
    Get patient's insulin history (last N days)
    """
    from datetime import timedelta

    # Verify user is a patient
    if not isinstance(current_user, Patient):
        raise HTTPException(status_code=403, detail="Only patients have insulin history")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    doses = (
        db.query(InsulinDose)
        .filter(
            InsulinDose.patient_id == current_user.id,
            InsulinDose.recorded_at >= cutoff_date,
        )
        .order_by(InsulinDose.recorded_at.desc())
        .all()
    )

    return doses


@router.get("/history/{patient_id}", response_model=List[InsulinDoseResponse])
def get_patient_insulin_history(
    patient_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 7,
):
    """
    Get patient's insulin history (doctor access only)
    """
    from datetime import timedelta

    # Verify current user is a doctor with access to this patient
    if not isinstance(current_user, Doctor):
        raise HTTPException(status_code=403, detail="Only doctors can view patient history")
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient or patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this patient's history"
        )

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    doses = (
        db.query(InsulinDose)
        .filter(
            InsulinDose.patient_id == patient_id,
            InsulinDose.recorded_at >= cutoff_date,
        )
        .order_by(InsulinDose.recorded_at.desc())
        .all()
    )

    return doses


@router.get("/stats/me")
def get_insulin_stats(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 7,
):
    """
    Get insulin statistics for the patient
    """
    from datetime import timedelta
    from sqlalchemy import func

    # Verify user is a patient
    if not isinstance(current_user, Patient):
        raise HTTPException(status_code=403, detail="Only patients have insulin stats")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    doses = (
        db.query(InsulinDose)
        .filter(
            InsulinDose.patient_id == current_user.id,
            InsulinDose.recorded_at >= cutoff_date,
        )
        .all()
    )

    if not doses:
        return {
            "total_doses": 0,
            "total_units": 0.0,
            "average_dose": 0.0,
            "dose_count_by_type": {},
            "recommended_doses_count": 0,
        }

    total_units = sum(d.dose_amount for d in doses)
    dose_count_by_type = {}
    recommended_count = 0

    for dose in doses:
        dose_count_by_type[dose.dose_type] = dose_count_by_type.get(dose.dose_type, 0) + 1
        if dose.is_recommended:
            recommended_count += 1

    return {
        "total_doses": len(doses),
        "total_units": round(total_units, 2),
        "average_dose": round(total_units / len(doses), 2) if doses else 0.0,
        "dose_count_by_type": dose_count_by_type,
        "recommended_doses_count": recommended_count,
    }


@router.get("/daily-summary/me")
def get_daily_insulin_summary(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 7,
):
    """
    Get daily insulin dose summary for the last N days (total units per day)
    """
    from datetime import timedelta
    from sqlalchemy import func

    # Verify user is a patient
    if not isinstance(current_user, Patient):
        raise HTTPException(status_code=403, detail="Only patients can view summary")

    # Calculate cutoff - using a more lenient date range with timezone handling
    cutoff_date = datetime.utcnow() - timedelta(days=days + 1)  # Add 1 day buffer for timezone issues

    # Query doses and group by date
    doses = (
        db.query(InsulinDose)
        .filter(
            InsulinDose.patient_id == current_user.id,
            InsulinDose.recorded_at >= cutoff_date,
        )
        .order_by(InsulinDose.recorded_at)
        .all()
    )

    print(f"[DEBUG] User {current_user.id}: cutoff_date={cutoff_date}, found {len(doses)} doses")

    # Group doses by day
    daily_summary = {}
    for dose in doses:
        # Convert to date string (YYYY-MM-DD)
        # Handle both datetime objects and strings
        if isinstance(dose.recorded_at, str):
            dose_date = dose.recorded_at.split('T')[0]  # Extract date portion
        else:
            dose_date = dose.recorded_at.date().isoformat()
        
        if dose_date not in daily_summary:
            daily_summary[dose_date] = {
                "date": dose_date,
                "total_dose": 0.0,
                "count": 0,
                "dose_types": {}
            }
        
        daily_summary[dose_date]["total_dose"] += dose.dose_amount
        daily_summary[dose_date]["count"] += 1
        
        dose_type = dose.dose_type
        if dose_type not in daily_summary[dose_date]["dose_types"]:
            daily_summary[dose_date]["dose_types"][dose_type] = 0.0
        daily_summary[dose_date]["dose_types"][dose_type] += dose.dose_amount

    # Convert to sorted list (oldest to newest)
    result = sorted(daily_summary.values(), key=lambda x: x["date"])
    
    # Round totals
    for item in result:
        item["total_dose"] = round(item["total_dose"], 2)
        # Round dose types
        for dose_type in item["dose_types"]:
            item["dose_types"][dose_type] = round(item["dose_types"][dose_type], 2)

    print(f"[DEBUG] Grouped into {len(result)} days: {[d['date'] for d in result]}")

    return result


@router.get("/debug/all-doses")
def get_all_insulin_doses_debug(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DEBUG ENDPOINT: Get all insulin doses for current patient (no date filtering)
    """
    if not isinstance(current_user, Patient):
        raise HTTPException(status_code=403, detail="Only patients can view doses")

    doses = (
        db.query(InsulinDose)
        .filter(InsulinDose.patient_id == current_user.id)
        .order_by(InsulinDose.recorded_at.desc())
        .all()
    )

    return {
        "total_count": len(doses),
        "patient_id": current_user.id,
        "doses": [
            {
                "id": d.id,
                "dose_amount": d.dose_amount,
                "dose_type": d.dose_type,
                "recorded_at": d.recorded_at.isoformat() if hasattr(d.recorded_at, 'isoformat') else str(d.recorded_at),
                "created_at": d.created_at.isoformat() if hasattr(d.created_at, 'isoformat') else str(d.created_at),
            }
            for d in doses
        ],
    }
