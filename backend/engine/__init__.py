"""
AUTUS Engine - Physics-based Scoring & Multi-Scale System

S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)
KI = C × 0.30 + F × 0.50 + RV × 0.20

Scale Levels:
| L0 | World    | 국가/기관  |
| L1 | Country  | 도시/재벌  |
| L2 | City     | 구역/기업  |
| L3 | District | 건물/인물  |
| L4 | Block    | 개인      |
"""

from .person_model import Person, PersonRegistry
from .params_loader import SovereignParams
from .person_score_v2 import (
    PersonScore,
    Rank,
    calculate_person_score,
    calculate_all_scores,
    assign_rank,
)
from .keyman_engine import (
    KeymanEngine,
    KeymanScore,
    KeymanType,
    create_keyman_engine,
)
from .scale_engine import (
    MultiScaleEngine,
    ScaleLevel,
    ScaleNode,
    ScaleFlow,
    Bounds,
    create_sample_multiscale_data,
)
from .flow_engine import (
    FlowEngine,
    Flow,
    FlowType,
    FlowPath,
    FlowStats,
    BottleneckInfo,
    create_sample_flow_data,
)

__all__ = [
    # Person Score
    "Person",
    "PersonRegistry", 
    "SovereignParams",
    "PersonScore",
    "Rank",
    "calculate_person_score",
    "calculate_all_scores",
    "assign_rank",
    # Keyman
    "KeymanEngine",
    "KeymanScore",
    "KeymanType",
    "create_keyman_engine",
    # Multi-Scale
    "MultiScaleEngine",
    "ScaleLevel",
    "ScaleNode",
    "ScaleFlow",
    "Bounds",
    "create_sample_multiscale_data",
    # Flow
    "FlowEngine",
    "Flow",
    "FlowType",
    "FlowPath",
    "FlowStats",
    "BottleneckInfo",
    "create_sample_flow_data",
]

