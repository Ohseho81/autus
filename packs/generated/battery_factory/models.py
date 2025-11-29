"""
Auto-generated Pydantic models for battery_factory
Generated: 2025-11-29T12:40:05.059701
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime, timedelta

class Line(BaseModel):
    """생산 라인"""
    line_id: str = Field(..., description="Primary key")
    name: Optional[str] = None
    type: Optional[Literal['ELECTRODE', 'ASSEMBLY', 'FORMATION', 'PACKING']] = None
    status: Optional[Literal['RUNNING', 'STOPPED', 'MAINTENANCE']] = None

class Equipment(BaseModel):
    """생산 설비"""
    equipment_id: str = Field(..., description="Primary key")
    line_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[Literal['MIXER', 'COATER', 'PRESS', 'STACKER', 'WELDER', 'TESTER']] = None
    status: Optional[Literal['OK', 'WARNING', 'DOWN']] = None

class Batch(BaseModel):
    """생산 배치"""
    batch_id: str = Field(..., description="Primary key")
    line_id: Optional[str] = None
    product_code: Optional[str] = None
    quantity: Optional[int] = None
    status: Optional[Literal['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']] = None

class QualityCheck(BaseModel):
    """품질 검사"""
    check_id: str = Field(..., description="Primary key")
    batch_id: Optional[str] = None
    type: Optional[Literal['VISUAL', 'ELECTRICAL', 'CAPACITY', 'SAFETY']] = None
    result: Optional[Literal['PASS', 'FAIL', 'PENDING']] = None
