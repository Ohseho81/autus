"""
Auto-generated events for battery_factory
Generated: 2025-11-29T12:40:05.059857
"""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class EquipmentStatusChangedEvent(BaseModel):
    """"""
    event_type: str = "equipment_status_changed"
    timestamp: datetime = None
    equipment_id: Optional[str] = None
    to_status: Optional[Any] = None

class BatchCompletedEvent(BaseModel):
    """"""
    event_type: str = "batch_completed"
    timestamp: datetime = None
    batch_id: Optional[str] = None
    quantity: Optional[int] = None

class QualityResultEvent(BaseModel):
    """"""
    event_type: str = "quality_result"
    timestamp: datetime = None
    check_id: Optional[str] = None
    result: Optional[Any] = None
