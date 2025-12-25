"""
AUTUS Kernel - Decision Physics OS
Bezos × Thiel × Musk = Core Engine

"인간 결정의 물리법칙"
"""

from .physics import PhysicsConstants, PhysicsConverter
from .engine import Engine
from .titans_engine import PhysicsEngine as TitansEngine
from .decision_log import DecisionLog, LifePhysicsEngine
from .noise import NoiseIndicators
from .loss_function import LossFunction
from .local_distiller import LocalDistiller
from .hud import HUDRenderer

__all__ = [
    'PhysicsConstants',
    'PhysicsConverter', 
    'Engine',
    'TitansEngine',
    'DecisionLog',
    'LifePhysicsEngine',
    'NoiseIndicators',
    'LossFunction',
    'LocalDistiller',
    'HUDRenderer'
]

__version__ = '2.0.0'
