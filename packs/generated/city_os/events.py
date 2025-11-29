"""
Auto-generated events for city_os
Generated: 2025-11-29T12:40:05.055639
"""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class SensorReadingEvent(BaseModel):
    """"""
    event_type: str = "sensor_reading"
    timestamp: datetime = None
    sensor_id: Optional[str] = None
    value: Optional[float] = None

class ThresholdExceededEvent(BaseModel):
    """"""
    event_type: str = "threshold_exceeded"
    timestamp: datetime = None
    sensor_id: Optional[str] = None
    metric: Optional[str] = None
    value: Optional[float] = None

class IncidentReportedEvent(BaseModel):
    """"""
    event_type: str = "incident_reported"
    timestamp: datetime = None
    incident_id: Optional[str] = None
    severity: Optional[Any] = None
