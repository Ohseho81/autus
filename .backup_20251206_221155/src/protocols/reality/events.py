"""
AUTUS Reality Events Protocol
Loop A: Reality → Twin (Information Layer)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Dict, Any, Optional, List
from datetime import datetime, timezone
from enum import Enum


class EventSource(str, Enum):
    """Source of reality events."""
    DEVICE = "device"
    USER = "user"
    SYSTEM = "system"
    PACK = "pack"
    EXTERNAL = "external"


class RealityEvent(BaseModel):
    """
    Standard reality event format.
    Every event from the real world flows through this.
    """
    id: str = Field(..., description="Unique event ID")
    source: Literal["device", "user", "system", "pack", "external"]
    type: str = Field(..., description="Event type (e.g., 'sensor.temperature', 'user.login')")
    
    # Actor identification
    device_id: Optional[str] = None
    actor_zero_id: Optional[str] = None
    
    # Event data
    payload: Dict[str, Any] = {}
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = "1.0.0"
    
    # Context
    city_id: Optional[str] = None
    location_id: Optional[str] = None
    tags: List[str] = []
    
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()}
    )


class EventBatch(BaseModel):
    """Batch of reality events for bulk processing."""
    events: List[RealityEvent]
    batch_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EventError(Exception):
    """Base error for Reality Events."""
    def __init__(self, message: str, event_id: Optional[str] = None):
        self.message = message
        self.event_id = event_id
        super().__init__(self.message)


class ValidationError(EventError):
    """Invalid event data."""
    def __init__(self, message: str, field: str, event_id: Optional[str] = None):
        self.field = field
        super().__init__(f"Validation error on '{field}': {message}", event_id)


class ProcessingError(EventError):
    """Error during event processing."""
    pass

