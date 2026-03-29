from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InsulinDoseCreate(BaseModel):
    dose_amount: float
    dose_type: str  # "bolus", "correction", "basal"
    current_glucose: Optional[float] = None
    carbs_intake: Optional[float] = None
    notes: Optional[str] = None
    is_recommended: bool = False
    recorded_at: datetime


class InsulinDoseUpdate(BaseModel):
    dose_amount: Optional[float] = None
    dose_type: Optional[str] = None
    current_glucose: Optional[float] = None
    carbs_intake: Optional[float] = None
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class InsulinDoseResponse(BaseModel):
    id: int
    patient_id: int
    dose_amount: float
    dose_type: str
    current_glucose: Optional[float]
    carbs_intake: Optional[float]
    notes: Optional[str]
    is_recommended: bool
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
