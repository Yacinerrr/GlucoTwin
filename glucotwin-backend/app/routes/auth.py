from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Doctor, Patient
from app.schemas.user import (
    DoctorRegister, DoctorResponse, DoctorWithPatients,
    PatientRegister, PatientResponse, PatientUpdateProfile,
    TokenResponse
)
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app.utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_doctor, get_current_patient, get_current_user
)

router = APIRouter()


# ────────────────────────────────────────────────
# DOCTOR ROUTES
# ────────────────────────────────────────────────

@router.post("/doctor/register",
             response_model=DoctorResponse,
             status_code=status.HTTP_201_CREATED)
def register_doctor(data: DoctorRegister,
                    db: Session = Depends(get_db)):
    """
    Register a new doctor.
    An invite_code is auto-generated — the doctor
    shares it with patients so they can link up.
    """
    if db.query(Doctor).filter(Doctor.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    doctor = Doctor(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        specialty=data.specialty,
        hospital=data.hospital,
        phone=data.phone,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    # Add patient_count manually since it's not a DB column
    result = DoctorResponse.model_validate(doctor)
    result.patient_count = 0
    return result


@router.get("/doctor/me",
            response_model=DoctorWithPatients)
def get_doctor_profile(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get doctor profile including full list of their patients.
    doctor.patients automatically loads all linked patients
    thanks to the SQLAlchemy relationship.
    """
    return doctor


@router.get("/doctor/invite-code")
def get_invite_code(
    doctor: Doctor = Depends(get_current_doctor)
):
    """
    Get the doctor's invite code to share with patients.
    """
    return {
        "invite_code": doctor.invite_code,
        "message": f"Share this code with your patients so they can link to you: {doctor.invite_code}"
    }


@router.post("/doctor/regenerate-code")
def regenerate_invite_code(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Generate a new invite code — invalidates the old one.
    Useful if the code was shared accidentally.
    """
    import secrets
    doctor.invite_code = secrets.token_hex(6)
    db.commit()
    db.refresh(doctor)
    return {"new_invite_code": doctor.invite_code}


@router.get("/doctor/patients",
            response_model=list[dict])
def list_patients(
    doctor: Doctor = Depends(get_current_doctor)
):
    """
    Get all patients linked to this doctor.
    Returns a list with each patient's key info.
    """
    return [
        {
            "id":            p.id,
            "full_name":     p.full_name,
            "email":         p.email,
            "age":           p.age,
            "diabetes_type": p.diabetes_type,
            "insulin_ratio": p.insulin_ratio,
            "created_at":    p.created_at.isoformat()
        }
        for p in doctor.patients
    ]


# ────────────────────────────────────────────────
# PATIENT ROUTES
# ────────────────────────────────────────────────

@router.post("/patient/register",
             response_model=PatientResponse,
             status_code=status.HTTP_201_CREATED)
def register_patient(data: PatientRegister,
                     db: Session = Depends(get_db)):
    """
    Register a new patient.
    If they provide a doctor_invite_code, we find that
    doctor and link them automatically during registration.
    If not, they register without a doctor and can link later.
    """
    # Check email not taken in either table
    if db.query(Patient).filter(Patient.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    if db.query(Doctor).filter(Doctor.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Find doctor by invite code if provided
    doctor_id = None
    if data.doctor_invite_code:
        doctor = db.query(Doctor).filter(
            Doctor.invite_code == data.doctor_invite_code
        ).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid doctor invite code. Please check with your doctor."
            )
        doctor_id = doctor.id

    patient = Patient(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        age=data.age,
        weight_kg=data.weight_kg,
        diabetes_type=data.diabetes_type,
        doctor_id=doctor_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/patient/me",
            response_model=PatientResponse)
def get_patient_profile(
    patient: Patient = Depends(get_current_patient)
):
    """Get current patient's full profile including their doctor info."""
    return patient


@router.put("/patient/me",
            response_model=PatientResponse)
def update_patient_profile(
    updates: PatientUpdateProfile,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Update patient medical profile fields."""
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.post("/patient/link-doctor")
def link_to_doctor(
    invite_code: str,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Link an existing patient to a doctor using invite code.
    Used when a patient registered without a code first.
    """
    if patient.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already linked to a doctor. Contact support to change."
        )

    doctor = db.query(Doctor).filter(
        Doctor.invite_code == invite_code
    ).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code. Please check with your doctor."
        )

    patient.doctor_id = doctor.id
    db.commit()
    db.refresh(patient)

    return {
        "message": f"Successfully linked to Dr. {doctor.full_name}",
        "doctor_name": doctor.full_name,
        "doctor_specialty": doctor.specialty
    }


@router.get("/patient/my-doctor")
def get_my_doctor(
    patient: Patient = Depends(get_current_patient)
):
    """Get the doctor assigned to this patient."""
    if not patient.doctor:
        return {"message": "No doctor linked yet. Ask your doctor for their invite code."}

    return {
        "id":        patient.doctor.id,
        "full_name": patient.doctor.full_name,
        "specialty": patient.doctor.specialty,
        "hospital":  patient.doctor.hospital,
        "phone":     patient.doctor.phone,
    }


# ────────────────────────────────────────────────
# SHARED LOGIN ROUTE
# ────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Swagger OAuth2 sends:
    - username
    - password

    We use username as the email field.
    """
    email = form_data.username
    password = form_data.password

    # Check doctors first
    user = db.query(Doctor).filter(Doctor.email == email).first()
    role = "doctor"

    # If not a doctor, check patients
    if not user:
        user = db.query(Patient).filter(Patient.email == email).first()
        role = "patient"

    # If still not found or wrong password
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    token = create_access_token(user_id=user.id, role=role)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=role,
        user_id=user.id,
        full_name=user.full_name
    )