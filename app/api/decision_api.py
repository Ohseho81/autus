# app/models/decision.py
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

Base = declarative_base()

class DecisionLog(Base):
    """Decision log database model"""
    __tablename__ = "decision_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    context = Column(Text, nullable=False)
    options = Column(Text, nullable=False)  # JSON string
    chosen = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    outcome = Column(String, nullable=True)
    cycle_count = Column(Integer, default=0)
    quality_score = Column(Float, nullable=True)
    
    # Relationship to outcomes
    outcomes = relationship("DecisionOutcome", back_populates="decision")

class DecisionOutcome(Base):
    """Decision outcome database model"""
    __tablename__ = "decision_outcomes"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("decision_logs.id"), nullable=False)
    actual_result = Column(Text, nullable=False)
    predicted_result = Column(Text, nullable=False)
    accuracy = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship back to decision
    decision = relationship("DecisionLog", back_populates="outcomes")

# Pydantic models for API
class DecisionLogCreate(BaseModel):
    """Schema for creating a decision log"""
    context: str
    options: List[str]
    chosen: str
    confidence: float
    outcome: Optional[str] = None

class DecisionLogResponse(BaseModel):
    """Schema for decision log response"""
    id: int
    timestamp: datetime
    context: str
    options: List[str]
    chosen: str
    confidence: float
    outcome: Optional[str]
    cycle_count: int
    quality_score: Optional[float]
    
    class Config:
        from_attributes = True

class DecisionOutcomeCreate(BaseModel):
    """Schema for creating a decision outcome"""
    decision_id: int
    actual_result: str
    predicted_result: str

class DecisionOutcomeResponse(BaseModel):
    """Schema for decision outcome response"""
    id: int
    decision_id: int
    actual_result: str
    predicted_result: str
    accuracy: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

class DecisionHistoryResponse(BaseModel):
    """Schema for decision history response"""
    total: int
    decisions: List[DecisionLogResponse]
    average_quality_score: Optional[float]
    total_cycles: int