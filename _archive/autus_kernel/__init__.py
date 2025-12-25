"""
AUTUS Kernel v2.0
=================
물리 기반 의사결정 OS

Core Formula:
    L = ∫ (P + R × S) dt
    
Where:
    L = Loss (손실)
    P = Pressure = E / t² (압력 = 에너지 / 시간²)
    R = Resistance (저항)
    S = Entropy (엔트로피)
    t = time_to_pnr (불가역점까지 남은 시간)
"""

from .engine import AutusKernel
from .loss_function import LossFunction
from .physics import PhysicsConstants

__version__ = "2.0.0"
__all__ = ["AutusKernel", "LossFunction", "PhysicsConstants"]
