"""
AUTUS Reliance Architecture
============================

No Addiction, Guaranteed Dependence

중독을 설계하지 않고 의존을 만든다.
"""

from .architecture import (
    # 원칙
    CORE_PRINCIPLES,
    FORBIDDEN_MECHANISMS,
    ALLOWED_MECHANISMS,
    GUARDRAILS,
    INTERVENTION_LIMITS,
    
    # 클래스
    MechanismType,
    Mechanism,
    InterventionGuardrail,
    InterventionLimit,
    MessageValidator,
    ExternalityCalculator,
    InterventionManager,
    TrustAccumulator,
    SafeFeedbackGenerator,
    ViolationDetector,
    RelianceEngine,
)

__all__ = [
    # 원칙
    "CORE_PRINCIPLES",
    "FORBIDDEN_MECHANISMS",
    "ALLOWED_MECHANISMS",
    "GUARDRAILS",
    "INTERVENTION_LIMITS",
    
    # 클래스
    "MechanismType",
    "Mechanism",
    "InterventionGuardrail",
    "InterventionLimit",
    "MessageValidator",
    "ExternalityCalculator",
    "InterventionManager",
    "TrustAccumulator",
    "SafeFeedbackGenerator",
    "ViolationDetector",
    "RelianceEngine",
]
