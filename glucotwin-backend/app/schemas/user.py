from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ────────────────────────────────────────────────
# DOCTOR SCHEMAS
# ────────────────────────────────────────────────

class DoctorRegister(BaseModel):
    email:     EmailStr
    full_name: str   = Field(..., min_length=2, max_length=100)
    password:  str   = Field(..., min_length=6)
    specialty: Optional[str] = None
    hospital:  Optional[str] = None
    phone:     Optional[str] = None


class DoctorResponse(BaseModel):
    id:          int
    email:       str
    full_name:   str
    specialty:   Optional[str]
    hospital:    Optional[str]
    phone:       Optional[str]
    invite_code: str           # doctor shares this with patients
    is_active:   bool
    created_at:  datetime
    # How many patients are linked to this doctor
    patient_count: Optional[int] = 0

    class Config:
        from_attributes = True


# A minimal patient summary shown in doctor's patient list
class PatientSummary(BaseModel):
    id:            int
    full_name:     str
    email:         str
    age:           Optional[int]
    diabetes_type: Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True


# Full doctor profile including list of all their patients
class DoctorWithPatients(BaseModel):
    id:          int
    email:       str
    full_name:   str
    specialty:   Optional[str]
    hospital:    Optional[str]
    invite_code: str
    patients:    List[PatientSummary] = []

    class Config:
        from_attributes = True


# ────────────────────────────────────────────────
# PATIENT SCHEMAS
# ────────────────────────────────────────────────

class PatientRegister(BaseModel):
    email:         EmailStr
    full_name:     str   = Field(..., min_length=2, max_length=100)
    password:      str   = Field(..., min_length=6)
    age:           Optional[int]   = None
    weight_kg:     Optional[float] = None
    diabetes_type: Optional[str]   = None   # "type1" or "type2"

    # Patient enters this code to link themselves to a doctor
    # Optional — they can register without a doctor first
    doctor_invite_code: Optional[str] = None


class PatientResponse(BaseModel):
    id:             int
    email:          str
    full_name:      str
    age:            Optional[int]
    weight_kg:      Optional[float]
    diabetes_type:  Optional[str]
    insulin_ratio:  float
    sensitivity:    float
    target_glucose: float
    is_ramadan_mode: bool
    is_active:      bool
    created_at:     datetime
    # Show minimal doctor info to the patient
    doctor:         Optional[DoctorResponse] = None

    class Config:
        from_attributes = True


class PatientUpdateProfile(BaseModel):
    full_name:      Optional[str]   = None
    age:            Optional[int]   = None
    weight_kg:      Optional[float] = None
    diabetes_type:  Optional[str]   = None
    insulin_ratio:  Optional[float] = None
    sensitivity:    Optional[float] = None
    target_glucose: Optional[float] = None
    is_ramadan_mode: Optional[bool] = None


# ────────────────────────────────────────────────
# SHARED AUTH SCHEMAS
# ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str   # "patient" or "doctor"
    user_id:      int
    full_name:    str