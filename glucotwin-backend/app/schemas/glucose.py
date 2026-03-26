from pydantic import BaseModel, Field
from typing import List


class GlucosePredictionRequest(BaseModel):
    glucose_history: List[float] = Field(..., min_length=48, max_length=48)
    insulin_history: List[float] = Field(..., min_length=48, max_length=48)
    carbs_history: List[float] = Field(..., min_length=48, max_length=48)
    activity_history: List[float] = Field(..., min_length=48, max_length=48)
    timestamps: List[str] = Field(..., min_length=48, max_length=48)


class GlucosePredictionResponse(BaseModel):
    glucose_curve: List[float]
    peak_glucose: float
    peak_time_hours: float
    nadir_glucose: float
    nadir_time_hours: float
    confidence_interval: float
    risk_score: float
    risk_level: str

from pydantic import BaseModel, Field
from datetime import datetime


class GlucoseReadingCreate(BaseModel):
    glucose_value: float = Field(..., ge=40, le=400)
    recorded_at: datetime


class GlucoseReadingResponse(BaseModel):
    id: int
    patient_id: int
    glucose_value: float
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True