"""
Auto-generated Pydantic models for emo_hub
Generated: 2025-11-29T12:12:41.985456
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime, timedelta

class Building(BaseModel):
    """관리 대상 건물"""
    building_id: str = Field(..., description="Primary key")
    name: Optional[str] = None
    address: Optional[str] = None
    floor_count: Optional[int] = None
    total_area: Optional[float] = None
    status: Optional[Literal['ACTIVE', 'INACTIVE', 'MAINTENANCE']] = None

class Asset(BaseModel):
    """설비/자산"""
    asset_id: str = Field(..., description="Primary key")
    building_id: Optional[str] = None
    name: Optional[str] = None
    category: Optional[Literal['HVAC', 'ELEVATOR', 'FIRE', 'WATER', 'ELECTRIC', 'SECURITY']] = None
    status: Optional[Literal['OK', 'WARNING', 'DOWN', 'MAINTENANCE']] = None
    installed_at: Optional[datetime] = None
    last_check_at: Optional[datetime] = None

class Ticket(BaseModel):
    """작업 티켓"""
    ticket_id: str = Field(..., description="Primary key")
    asset_id: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']] = None
    state: Optional[Literal['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CLOSED']] = None
    created_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

class Technician(BaseModel):
    """현장 기술자"""
    technician_id: str = Field(..., description="Primary key")
    specialty: Optional[Literal['HVAC', 'ELEVATOR', 'FIRE', 'WATER', 'ELECTRIC', 'GENERAL']] = None
    status: Optional[Literal['AVAILABLE', 'BUSY', 'OFF']] = None
    current_location: Optional[str] = None

class Schedule(BaseModel):
    """정기 점검 스케줄"""
    schedule_id: str = Field(..., description="Primary key")
    asset_id: Optional[str] = None
    cron: Optional[str] = None
    checklist_id: Optional[str] = None
    next_run: Optional[datetime] = None
