"""ΔState Vector - 상태 변화량 추적"""
from pydantic import BaseModel

class DeltaState(BaseModel):
    dE: float = 0.0   # Energy 변화
    dS: float = 0.0   # Stability 변화
    dP: float = 0.0   # Pressure 변화
    dG: float = 0.0   # Gravity 변화
    dR: float = 0.0   # Risk 변화
    dT: float = 0.0   # Time Drift
    
    def total_change(self) -> float:
        """총 변화량 (절대값 합)"""
        return abs(self.dE) + abs(self.dS) + abs(self.dP) + abs(self.dG) + abs(self.dR)
