from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class InsulinDose(Base):
    __tablename__ = "insulin_doses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    dose_amount = Column(Float, nullable=False)  # Units
    dose_type = Column(String, nullable=False)  # "bolus", "correction", "basal"
    current_glucose = Column(Float)  # mg/dL at time of injection
    carbs_intake = Column(Float)  # grams
    notes = Column(String)  # User notes or source (manual, recommended, etc.)
    is_recommended = Column(Boolean, default=False)  # Whether this was AI-recommended
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient")
