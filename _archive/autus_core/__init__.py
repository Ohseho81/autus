"""
AUTUS Core Engine
=================
물리 기반 의사결정 OS의 핵심 엔진

모든 Pack이 상속하는 기반 시스템:
- 물리 손실 함수: L = ∫(P + R×S)dt
- 7대 노이즈 지표
- HUD 렌더링
- 데이터 커넥터
"""

from .engine import AutusCore
from .physics import LossFunction, PhysicsEngine
from .noise import NoiseAnalyzer, NoiseType
from .hud import HUDRenderer
from .connector import DataConnector

__version__ = "1.0.0"
__all__ = [
    "AutusCore",
    "LossFunction", 
    "PhysicsEngine",
    "NoiseAnalyzer",
    "NoiseType",
    "HUDRenderer",
    "DataConnector"
]
