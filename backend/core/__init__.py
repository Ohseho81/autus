"""
AUTUS Backend Core
==================

통합 시스템 엔진 및 핵심 모듈

Modules:
- unified_system: 통합 시스템 엔진
- quantum_variables: 양자 영감 변수
- physics_formulas: 물리 공식
"""

from .unified_system import (
    UnifiedSystemEngine,
    UnifiedNode,
    SystemState,
    ClusterType,
    OrbitType,
    create_engine,
)

from .quantum_variables import (
    QuantumState,
    Entanglement,
    UncertaintyPrinciple,
    QuantumSystem,
)

from .physics_formulas import UnifiedPhysicsFormulas

__all__ = [
    # Engine
    "UnifiedSystemEngine",
    "UnifiedNode",
    "SystemState",
    "ClusterType",
    "OrbitType",
    "create_engine",
    
    # Quantum
    "QuantumState",
    "Entanglement",
    "UncertaintyPrinciple",
    "QuantumSystem",
    
    # Physics
    "UnifiedPhysicsFormulas",
]

__version__ = "3.0.0"

