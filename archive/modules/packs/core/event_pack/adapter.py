from dataclasses import dataclass, field
from typing import Any, Dict, List
from datetime import datetime
from enum import Enum
import uuid

class EventDirection(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

@dataclass
class Event:
    event_code: str
    entity_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    event_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    domain: str = "GENERAL"
    direction: EventDirection = EventDirection.NEUTRAL
    
    def to_dict(self):
        return {"event_id": self.event_id, "event_code": self.event_code, "entity_id": self.entity_id,
                "timestamp": self.timestamp.isoformat(), "direction": self.direction.value}

class EventRegistry:
    _DELTA_MAP = {
        "HUM.APPLICATION.SUBMITTED": {"DIR": 0.10, "FOR": 0.05, "GAP": -0.05, "UNC": 0.05, "TEM": 0.10, "INT": 0.05},
        "HUM.DOCUMENT.SUBMITTED": {"DIR": 0.05, "FOR": 0.05, "GAP": -0.05, "UNC": -0.03, "TEM": -0.05, "INT": 0.03},
        "HUM.DOCUMENT.APPROVED": {"DIR": 0.05, "FOR": 0.05, "GAP": -0.10, "UNC": -0.10, "TEM": -0.05, "INT": 0.05},
        "HUM.DOCUMENT.REJECTED": {"DIR": -0.05, "FOR": -0.03, "GAP": 0.10, "UNC": 0.10, "TEM": 0.05, "INT": -0.03},
        "HUM.VISA.APPROVED": {"DIR": 0.15, "FOR": 0.10, "GAP": -0.20, "UNC": -0.15, "TEM": -0.10, "INT": 0.15},
        "HUM.VISA.REJECTED": {"DIR": -0.15, "FOR": -0.10, "GAP": 0.15, "UNC": 0.20, "TEM": 0.10, "INT": -0.10},
        "HUM.EMPLOYMENT.MATCHED": {"DIR": 0.15, "FOR": 0.10, "GAP": -0.15, "UNC": -0.10, "TEM": -0.10, "INT": 0.15},
        "HUM.EMPLOYMENT.STARTED": {"DIR": 0.15, "FOR": 0.15, "GAP": -0.20, "UNC": -0.15, "TEM": -0.10, "INT": 0.20},
        "HUM.TRAINING.COMPLETED": {"DIR": 0.10, "FOR": 0.15, "GAP": -0.15, "UNC": -0.10, "TEM": -0.10, "INT": 0.10},
        "HUM.SETTLEMENT.COMPLETE": {"DIR": 0.15, "FOR": 0.15, "GAP": -0.25, "UNC": -0.15, "TEM": -0.15, "INT": 0.20},
        "HUM.SCREENING.PASSED": {"DIR": 0.05, "FOR": 0.05, "GAP": -0.10, "UNC": -0.10, "TEM": -0.05, "INT": 0.05},
        "HUM.MEDICAL.CLEARED": {"DIR": 0.05, "FOR": 0.10, "GAP": -0.10, "UNC": -0.10, "TEM": -0.05, "INT": 0.05},
    }
    
    @classmethod
    def get_delta(cls, code: str) -> Dict[str, float]:
        return cls._DELTA_MAP.get(code, {"DIR":0,"FOR":0,"GAP":0,"UNC":0,"TEM":0,"INT":0})
    
    @classmethod
    def get_direction(cls, code: str) -> EventDirection:
        d = cls._DELTA_MAP.get(code, {})
        score = d.get("DIR",0) + d.get("FOR",0) - d.get("GAP",0) - d.get("UNC",0)
        if score > 0.1: return EventDirection.POSITIVE
        if score < -0.1: return EventDirection.NEGATIVE
        return EventDirection.NEUTRAL

class EventPack:
    def __init__(self):
        self.pack_id = "event_pack"
        self._log: List[Event] = []
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "process")
        
        if action == "process":
            code = input_data.get("event_code")
            eid = input_data.get("entity_id")
            event = Event(code, eid, domain=input_data.get("domain", "GENERAL"))
            event.direction = EventRegistry.get_direction(code)
            self._log.append(event)
            return {"status": "success", "event": event.to_dict(), "delta": EventRegistry.get_delta(code)}
        
        elif action == "get_delta":
            return {"status": "success", "delta": EventRegistry.get_delta(input_data.get("event_code"))}
        
        return {"status": "error", "error": "Unknown action"}
