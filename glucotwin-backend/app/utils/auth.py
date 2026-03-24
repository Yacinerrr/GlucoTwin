from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import Doctor, Patient

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, role: str) -> str:
    """
    We store both the user ID and role in the token.
    This way we know which table to query (doctors or patients)
    without an extra DB call.
    """
    payload = {
        "sub":  str(user_id),
        "role": role,
        "exp":  datetime.utcnow() + timedelta(
                    minutes=settings.access_token_expire_minutes)
    }
    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm
    )


def decode_token(token: str) -> dict:
    """Decode and validate JWT. Raises 401 if invalid."""
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Union[Doctor, Patient]:
    payload = decode_token(token)

    sub = payload.get("sub")
    role = payload.get("role")

    if sub is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user_id = int(sub)

    if role == "doctor":
        user = db.query(Doctor).filter(Doctor.id == user_id).first()
    elif role == "patient":
        user = db.query(Patient).filter(Patient.id == user_id).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token role"
        )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return user

def get_current_doctor(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db)
) -> Doctor:
    """Use Depends(get_current_doctor) on doctor-only routes"""
    payload = decode_token(token)
    if payload.get("role") != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required"
        )
    user = db.query(Doctor).filter(
        Doctor.id == int(payload["sub"])
    ).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Doctor not found"
        )
    return user


def get_current_patient(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db)
) -> Patient:
    """Use Depends(get_current_patient) on patient-only routes"""
    payload = decode_token(token)
    if payload.get("role") != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required"
        )
    user = db.query(Patient).filter(
        Patient.id == int(payload["sub"])
    ).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Patient not found"
        )
    return user