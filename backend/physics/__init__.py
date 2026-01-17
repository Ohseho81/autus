"""
AUTUS K/I Physics Engine Package v4.0

K-지수 (Karma): 개인/집단 고유 특성 (-1 ~ +1)
I-지수 (Interaction): 노드 간 상호작용 (-1 ~ +1)

완전한 라플라스 엔진:
- 4차원 상태 벡터: (K, I, K̇, İ)
- 8가지 천체 타입: 관성/임계점/수명/주기
- 144 슬롯 관계 매트릭스
- 5단계 운영 루프: Discovery → Analysis → Redesign → Optimize → Eliminate
- 5명의 에이전트: Scribe, Demon, Architect, Tuner, Reaper

"모든 입자의 위치, 속도, 그리고 질량을 알면 미래를 안다"
"""

from .ki_physics import (
    KIPhysicsSystem,
    KarmaEngine,
    InteractionEngine,
    ActionType,
    InteractionType,
    PhaseState,
    ActionEvent,
    InteractionEvent,
    NodeState,
    InteractionState,
    print_dashboard as print_ki_dashboard,
)

from .galactic_ki import (
    GalacticKIEngine,
    CelestialBody,
    OrbitalRelation,
    OrbitalState,
    GravityState,
    Domain,
    NodeType,
    NodeValue,
    print_dashboard as print_galactic_dashboard,
)

from .karma_constants import (
    KarmaSystem,
    PersonalKarma,
    PersonalKarmaEngine,
    GroupKarma,
    GroupKarmaEngine,
    KarmaFactors,
    GroupAlignment,
)

from .entity_types import (
    EntityType,
    TypedEntity,
    TypedPhysicsEngine,
    LifeStage,
    INTERACTION_COEFFICIENTS,
    get_interaction_coefficient,
    get_life_stage,
    get_vitality_modifier,
    print_type_dashboard,
)

# Complete Laplace Engine (v4.0)
from .complete_laplace import (
    EntityType as LaplaceEntityType,  # 8가지 타입 (확장판)
    StateVector4D,
    RelationType,
    LoopPhase,
    LoopExecution,
    LaplaceEntity,
    CompleteLaplaceEngine,
    # 5명의 에이전트
    TheScribe,
    TheDemon,
    TheArchitect,
    TheTuner,
    TheReaper,
)

__all__ = [
    # K/I Physics
    "KIPhysicsSystem",
    "KarmaEngine",
    "InteractionEngine",
    "ActionType",
    "InteractionType",
    "PhaseState",
    "ActionEvent",
    "InteractionEvent",
    "NodeState",
    "InteractionState",
    "print_ki_dashboard",
    # Galactic K/I
    "GalacticKIEngine",
    "CelestialBody",
    "OrbitalRelation",
    "OrbitalState",
    "GravityState",
    "Domain",
    "NodeType",
    "NodeValue",
    "print_galactic_dashboard",
    # Karma System
    "KarmaSystem",
    "PersonalKarma",
    "PersonalKarmaEngine",
    "GroupKarma",
    "GroupKarmaEngine",
    "KarmaFactors",
    "GroupAlignment",
    # Entity Type System (기본)
    "EntityType",
    "TypedEntity",
    "TypedPhysicsEngine",
    "LifeStage",
    "INTERACTION_COEFFICIENTS",
    "get_interaction_coefficient",
    "get_life_stage",
    "get_vitality_modifier",
    "print_type_dashboard",
    # Complete Laplace Engine (v4.0)
    "LaplaceEntityType",
    "StateVector4D",
    "RelationType",
    "LoopPhase",
    "LoopExecution",
    "LaplaceEntity",
    "CompleteLaplaceEngine",
    "TheScribe",
    "TheDemon",
    "TheArchitect",
    "TheTuner",
    "TheReaper",
]
