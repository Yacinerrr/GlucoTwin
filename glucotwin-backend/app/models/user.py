from sqlalchemy import (
    Column, Integer, String, Boolean,
    Float, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import secrets


class UserRole(str, enum.Enum):
    patient = "patient"
    doctor  = "doctor"


class Doctor(Base):
    __tablename__ = "doctors"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Professional info
    specialty     = Column(String, nullable=True)
    hospital      = Column(String, nullable=True)
    phone         = Column(String, nullable=True)

    # This is the code a doctor shares with their patients
    # so patients can link themselves to this doctor
    # secrets.token_hex(6) generates something like "a3f9c2b1d4e7"
    invite_code   = Column(
        String,
        unique=True,
        nullable=False,
        default=lambda: secrets.token_hex(6)
    )

    # SQLAlchemy relationship — lets us do doctor.patients
    # to get all patients linked to this doctor
    # back_populates="doctor" means Patient also has a .doctor attribute
    patients = relationship(
        "Patient",
        back_populates="doctor",
        cascade="all, delete-orphan"
    )


class Patient(Base):
    __tablename__ = "patients"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Medical profile
    age           = Column(Integer, nullable=True)
    weight_kg     = Column(Float, nullable=True)
    diabetes_type = Column(String, nullable=True)    # "type1" or "type2"
    insulin_ratio = Column(Float, default=10.0)      # grams carbs per unit
    sensitivity   = Column(Float, default=42.0)      # mg/dL drop per unit
    target_glucose = Column(Float, default=110.0)    # mg/dL
    is_ramadan_mode = Column(Boolean, default=False)

    # Foreign key — this column stores the doctor's ID
    # nullable=True means a patient can exist without a doctor yet
    doctor_id     = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=True
    )

    # SQLAlchemy relationship — lets us do patient.doctor
    # to get the full doctor object
    doctor = relationship("Doctor", back_populates="patients")