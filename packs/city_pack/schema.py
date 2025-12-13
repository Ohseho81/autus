from pydantic import BaseModel
from typing import Literal

class CityEvent(BaseModel):
    kind: Literal["incident", "policy", "investment"]
    intensity: float  # 0~1
    duration: Literal["short", "mid", "long"]
    
    def duration_factor(self) -> float:
        return {"short": 0.5, "mid": 1.0, "long": 1.5}[self.duration]

class InfraEvent(BaseModel):
    domain: Literal["traffic", "safety", "energy"]
    kind: Literal["incident", "load", "investment"]
    intensity: float  # 0~1
    duration: Literal["short", "mid", "long"]
    
    def duration_factor(self) -> float:
        return {"short": 0.5, "mid": 1.0, "long": 1.5}[self.duration]
