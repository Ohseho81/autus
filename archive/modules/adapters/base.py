from dataclasses import dataclass
from typing import Dict

@dataclass
class AutusInput:
    tasks: Dict[str, float]
    pressure: float
    resource: float

def clamp01(x: float) -> float:
    """0~1 범위로 클램프"""
    return max(0.0, min(1.0, x))

def neutral() -> AutusInput:
    """중립 입력 (실패 시 기본값)"""
    return AutusInput(tasks={}, pressure=0.0, resource=0.0)
