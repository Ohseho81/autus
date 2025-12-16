from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func
import json

from app.database import get_db

router = APIRouter(prefix="/decision", tags=["decision-logger"])

Base = declarative_base()

class DecisionLogTable(Base):
    """Database table for decision logs"""
    __tablename__ = "decision_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    context = Column(Text, nullable=False)
    options = Column(Text, nullable=False)  # JSON string
    chosen = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    outcome = Column(String, nullable=True)
    cycle_increment = Column(Integer, default=1)
    
    # Relationship to outcomes
    outcomes = relationship("DecisionOutcomeTable", back_populates="decision")

class DecisionOutcomeTable(Base):
    """Database table for decision outcomes"""
    __tablename__ = "decision_outcomes"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("decision_logs.id"), nullable=False)
    actual_result = Column(String, nullable=False)
    predicted_result = Column(String, nullable=False)
    accuracy = Column(Float, nullable=False)
    quality_score = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to decision
    decision = relationship("DecisionLogTable", back_populates="outcomes")

# Pydantic models
class DecisionLogCreate(BaseModel):
    """Request model for creating a decision log"""
    context: str = Field(..., description="Context in which the decision was made")
    options: List[str] = Field(..., description="Available options for the decision")
    chosen: str = Field(..., description="The chosen option")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0.0-1.0)")
    outcome: Optional[str] = Field(None, description="Expected outcome")

class DecisionLog(BaseModel):
    """Response model for decision log"""
    id: int
    timestamp: datetime
    context: str
    options: List[str]
    chosen: str
    confidence: float
    outcome: Optional[str]
    cycle_increment: int
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm_with_options(cls, obj):
        """Convert ORM object to Pydantic model with JSON parsing"""
        return cls(
            id=obj.id,
            timestamp=obj.timestamp,
            context=obj.context,
            options=json.loads(obj.options),
            chosen=obj.chosen,
            confidence=obj.confidence,
            outcome=obj.outcome,
            cycle_increment=obj.cycle_increment
        )

class DecisionOutcomeCreate(BaseModel):
    """Request model for creating a decision outcome"""
    decision_id: int = Field(..., description="ID of the related decision")
    actual_result: str = Field(..., description="What actually happened")
    predicted_result: str = Field(..., description="What was predicted to happen")

class DecisionOutcome(BaseModel):
    """Response model for decision outcome"""
    id: int
    decision_id: int
    actual_result: str
    predicted_result: str
    accuracy: float
    quality_score: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

class DecisionHistory(BaseModel):
    """Response model for decision history"""
    total_decisions: int
    average_confidence: float
    average_quality_score: Optional[float]
    decisions: List[DecisionLog]

def calculate_decision_quality_score(confidence: float, accuracy: float, cycle_increment: int) -> float:
    """
    Calculate decision quality score based on confidence, accuracy, and cycle impact
    
    Args:
        confidence: Original confidence level (0.0-1.0)
        accuracy: Actual accuracy of the decision (0.0-1.0)
        cycle_increment: Impact on development cycle
        
    Returns:
        Quality score (0.0-1.0)
    """
    # Base score from confidence vs accuracy alignment
    confidence_accuracy_alignment = 1.0 - abs(confidence - accuracy)
    
    # Cycle impact factor (higher cycle increment reduces quality)
    cycle_factor = max(0.1, 1.0 - (cycle_increment - 1) * 0.1)
    
    # Combined quality score
    quality_score = (confidence_accuracy_alignment * 0.7 + accuracy * 0.3) * cycle_factor
    
    return min(1.0, max(0.0, quality_score))

def calculate_accuracy(actual: str, predicted: str) -> float:
    """
    Calculate accuracy between actual and predicted results
    
    Args:
        actual: Actual result
        predicted: Predicted result
        
    Returns:
        Accuracy score (0.0-1.0)
    """
    if actual.lower() == predicted.lower():
        return 1.0
    
    # Simple similarity check based on common words
    actual_words = set(actual.lower().split())
    predicted_words = set(predicted.lower().split())
    
    if not actual_words and not predicted_words:
        return 1.0
    
    if not actual_words or not predicted_words:
        return 0.0
    
    intersection = actual_words.intersection(predicted_words)
    union = actual_words.union(predicted_words)
    
    return len(intersection) / len(union)

@router.post("/log", response_model=DecisionLog, status_code=status.HTTP_201_CREATED)
async def log_decision(decision: DecisionLogCreate, db: Session = Depends(get_db)):
    """
    Log a new decision with context and options
    
    Args:
        decision: Decision data to log
        db: Database session
        
    Returns:
        Created decision log
    """
    try:
        # Create decision log entry
        db_decision = DecisionLogTable(
            context=decision.context,
            options=json.dumps(decision.options),
            chosen=decision.chosen,
            confidence=decision.confidence,
            outcome=decision.outcome,
            cycle_increment=1  # Default cycle increment
        )
        
        db.add(db_decision)
        db.commit()
        db.refresh(db_decision)
        
        return DecisionLog.from_orm_with_options(db_decision)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log decision: {str(e)}"
        )

@router.get("/history", response_model=DecisionHistory)
async def get_decision_history(
    limit: int = 50, 
    offset: int = 0, 
    db: Session = Depends(get_db)
):
    """
    Get decision history with statistics
    
    Args:
        limit: Maximum number of decisions to return
        offset: Number of decisions to skip
        db: Database session
        
    Returns:
        Decision history with statistics
    """
    try:
        # Get total count
        total_count = db.query(DecisionLogTable).count()
        
        # Get decisions with pagination
        decisions_query = db.query(DecisionLogTable)\
            .order_by(DecisionLogTable.timestamp.desc())\
            .offset(offset)\
            .limit(limit)
        
        decisions = decisions_query.all()
        
        # Calculate statistics
        if decisions:
            avg_confidence = db.query(func.avg(DecisionLogTable.confidence)).scalar() or 0.0
            
            # Calculate average quality score from outcomes
            avg_quality_score = db.query(func.avg(DecisionOutcomeTable.quality_score))\
                .join(DecisionLogTable)\
                .scalar()
        else:
            avg_confidence = 0.0
            avg_quality_score = None
        
        # Convert to response models
        decision_logs = [DecisionLog.from_orm_with_options(d) for d in decisions]
        
        return DecisionHistory(
            total_decisions=total_count,
            average_confidence=float(avg_confidence),
            average_quality_score=float(avg_quality_score) if avg_quality_score else None,
            decisions=decision_logs
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve decision history: {str(e)}"
        )

@router.get("/outcome/{decision_id}", response_model=List[DecisionOutcome])
async def get_decision_outcome(decision_id: int, db: Session = Depends(get_db)):
    """
    Get outcomes for a specific decision
    
    Args:
        decision_id: ID of the decision
        db: Database session
        
    Returns:
        List of decision outcomes
    """
    try:
        # Check if decision exists
        decision = db.query(DecisionLogTable).filter(DecisionLogTable.id == decision_id).first()
        if not decision:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Decision with ID {decision_id} not found"
            )
        
        # Get outcomes
        outcomes = db.query(DecisionOutcomeTable)\
            .filter(DecisionOutcomeTable.decision_id == decision_id)\
            .order_by(DecisionOutcomeTable.timestamp.desc())\
            .all()
        
        return [DecisionOutcome.from_orm(outcome) for outcome in outcomes]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve decision outcome: {str(e)}"
        )

@router.post("/outcome", response_model=DecisionOutcome, status_code=status.HTTP_201_CREATED)
async def create_decision_outcome(
    outcome_data: DecisionOutcomeCreate, 
    db: Session = Depends(get_db)
):
    """
    Create an outcome record for a decision
    
    Args:
        outcome_data: Outcome data
        db: Database session
        
    Returns:
        Created decision outcome
    """
    try:
        # Check if decision exists
        decision = db.query(DecisionLogTable)\
            .filter(DecisionLogTable.id == outcome_data.decision_id)\
            .first()
        
        if not decision:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Decision with ID {outcome_data.decision_id} not found"
            )
        
        # Calculate accuracy and quality score
        accuracy = calculate_accuracy(outcome_data.actual_result, outcome_data.predicted_result)
        quality_score = calculate_decision_quality_score(
            decision.confidence, 
            accuracy, 
            decision.cycle_increment
        )
        
        # Create outcome record
        db_outcome = DecisionOutcomeTable(
            decision_id=outcome_data.decision_id,
            actual_result=outcome_data.actual_result,
            predicted_result=outcome_data.predicted_result,
            accuracy=accuracy,
            quality_score=quality_score
        )
        
        db.add(db_outcome)
        db.commit()
        db.refresh(db_outcome)
        
        return DecisionOutcome.from_orm(db_outcome)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create decision outcome: {str(e)}"
        )

@router.get("/stats")
async def get_decision_stats(db: Session = Depends(get_db)):
    """
    Get overall decision statistics
    
    Args:
        db: Database session
        
    Returns:
        Decision statistics
    """
    try:
        # Basic stats
        total_decisions = db.query(DecisionLogTable).count()
        total_outcomes = db.query(DecisionOutcomeTable).count()
        
        # Confidence stats
        avg_confidence = db.query(func.avg(DecisionLogTable.confidence)).scalar() or 0.0
        max_confidence = db.query(func.max(DecisionLogTable.confidence)).scalar() or 0.0
        min_confidence = db.query(func.min(DecisionLogTable.confidence)).scalar() or 0.0
        
        # Quality stats
        avg_quality = db.query(func.avg(DecisionOutcomeTable.quality_score)).scalar()
        max_quality = db.query(func.max(DecisionOutcomeTable.quality_score)).scalar()
        min_quality = db.query(func.min(DecisionOutcomeTable.quality_score)).scalar()
        
        # Accuracy stats
        avg_accuracy = db.query(func.avg(DecisionOutcomeTable.accuracy)).scalar()
        
        return {
            "total_decisions": total_decisions,
            "total_outcomes": total_outcomes,
            "confidence_stats": {
                "average": float(avg_confidence),
                "maximum": float(max_confidence),
                "minimum": float(min_confidence)
            },
            "quality_stats": {
                "average": float(avg_quality) if avg_quality else None,
                "maximum": float(max_quality) if max_quality else None,
                "minimum": float(min_quality) if min_quality else None
            },
            "average_accuracy": float(avg_accuracy) if avg_accuracy else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve decision statistics: {str(e)}"
        )

# Create tables
def create_tables(engine):
    """Create database tables"""
    Base.metadata.create_all(bind=engine)