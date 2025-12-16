# app/models/outcome.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Outcome(Base):
    __tablename__ = "outcomes"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("decisions.id"), nullable=False)
    actual_value = Column(Float, nullable=False)
    predicted_value = Column(Float, nullable=False)
    delta = Column(Float, nullable=False)  # actual - predicted
    absolute_delta = Column(Float, nullable=False)  # abs(delta)
    percentage_error = Column(Float, nullable=True)  # (delta/actual) * 100 if actual != 0
    outcome_type = Column(String(50), nullable=False)  # 'financial', 'time', 'satisfaction', etc.
    measurement_unit = Column(String(20), nullable=True)  # 'USD', 'hours', 'rating', etc.
    confidence_level = Column(Float, nullable=True)  # original confidence in prediction
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    is_validated = Column(Boolean, default=False)
    
    # Relationship to decision (assuming decisions table exists)
    # decision = relationship("Decision", back_populates="outcomes")

class CalibrationData(Base):
    __tablename__ = "calibration_data"
    
    id = Column(Integer, primary_key=True, index=True)
    confidence_bucket = Column(Float, nullable=False)  # e.g., 0.8 for 80% confidence
    actual_accuracy = Column(Float, nullable=False)  # actual accuracy for this bucket
    sample_count = Column(Integer, nullable=False)
    outcome_type = Column(String(50), nullable=False)
    calculation_date = Column(DateTime, default=datetime.utcnow)
    mean_absolute_error = Column(Float, nullable=False)
    root_mean_square_error = Column(Float, nullable=False)