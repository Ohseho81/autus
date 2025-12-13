from dataclasses import dataclass, field
from typing import Dict, Any
from datetime import datetime

@dataclass
class HumProfile:
    hum_id: str
    name: str
    route_code: str = "PH-KR"
    phase: str = "LIME"
    stage: str = "init"
    vector: Dict[str, float] = field(default_factory=lambda: {"DIR": 0.5, "FOR": 0.5, "GAP": 0.5, "UNC": 0.5, "TEM": 0.5, "INT": 0.5})
    risk: float = 0.5
    success: float = 0.5
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {"hum_id": self.hum_id, "name": self.name, "route_code": self.route_code, "phase": self.phase, "stage": self.stage, "vector": self.vector, "risk": self.risk, "success": self.success}

@dataclass
class HumEvent:
    hum_id: str
    event_code: str
    vector_before: Dict[str, float]
    vector_after: Dict[str, float]
    risk: float
    success: float
    phase: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {"event": self.event_code, "phase": self.phase, "timestamp": self.timestamp, "risk": self.risk, "success": self.success, "vector": self.vector_after}
