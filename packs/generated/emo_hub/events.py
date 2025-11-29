"""
Auto-generated events for emo_hub
Generated: 2025-11-29T12:12:41.985656
"""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timedelta

class AssetStatusChangedEvent(BaseModel):
    """설비 상태 변경"""
    event_type: str = "asset_status_changed"
    timestamp: datetime = None
    asset_id: Optional[str] = None
    from_status: Optional[Any] = None
    to_status: Optional[Any] = None
    changed_at: Optional[datetime] = None

class TicketCreatedEvent(BaseModel):
    """티켓 생성됨"""
    event_type: str = "ticket_created"
    timestamp: datetime = None
    ticket_id: Optional[str] = None
    asset_id: Optional[str] = None
    priority: Optional[Any] = None

class TicketAssignedEvent(BaseModel):
    """티켓 할당됨"""
    event_type: str = "ticket_assigned"
    timestamp: datetime = None
    ticket_id: Optional[str] = None
    technician_id: Optional[str] = None

class TicketCompletedEvent(BaseModel):
    """티켓 완료됨"""
    event_type: str = "ticket_completed"
    timestamp: datetime = None
    ticket_id: Optional[str] = None
    resolution_time: Optional[timedelta] = None

class ScheduleTriggeredEvent(BaseModel):
    """정기 점검 시작"""
    event_type: str = "schedule_triggered"
    timestamp: datetime = None
    schedule_id: Optional[str] = None
    asset_id: Optional[str] = None
