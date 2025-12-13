"""
AUTUS State Vector
S = { tick, cycle, gravity, entropy, boundary, stability }
"""
from dataclasses import dataclass
from typing import Literal

StabilityType = Literal["STABLE", "WARNING", "COLLAPSE"]

@dataclass
class StateVector:
    """
    Universal State Vector
    
    우주 물리 ↔ 인간 행동 물리 1:1 대응:
    - tick: 시간 (불가역)
    - cycle: 구조 전이 횟수 (Decision에서만 증가)
    - gravity: 중력 = 능력·재능·노력·환경의 합
    - entropy: 엔트로피 = 인지적 혼란/피로
    - boundary: 경계 = 감당 가능한 한계
    - stability: 안정성 = 현재 상태
    """
    tick: int = 0
    cycle: int = 0
    gravity: float = 0.3
    entropy: float = 0.0
    boundary: float = 1.0
    stability: StabilityType = "STABLE"
    
    # Gravity components
    talent: float = 0.5
    effort: float = 0.0
    context: float = 0.5
