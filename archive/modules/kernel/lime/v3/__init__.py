"""
Lime Kernel v3.0 - Advanced Mathematical Engine
================================================

15가지 고도화 요소 통합:

1. Ground Truth Calibration (실제 데이터 피드백)
2. Sequence Modeling (시계열 패턴 학습)
3. Exogenous Factors (외부 변수 통합)
4. Uncertainty Quantification (불확실성 정량화)
5. Causal Inference (인과관계 모델링)
6. Personalized Learning Rate (개인별 학습률)
7. Event Interaction (이벤트 간 상호작용)
8. Saturation Effect (포화 효과)
9. Phase Transition (임계점/상전이)
10. Network Effect (네트워크 효과)
11. Hysteresis (히스테리시스)
12. Multi-scale Temporal (멀티스케일 시간 역학)
13. Backward Propagation (역방향 전파)
14. Correlated Risk (리스크 상관관계)
15. Regime Switching (레짐 전환)

Usage:
    from kernel.lime.core import LimeKernelV3, HumProfile, ExternalContext
    
    engine = LimeKernelV3(country="KR", industry="education")
    profile = HumProfile(hum_id="PH001", experience_level=0.3)
    context = ExternalContext(economic_index=0.6, policy_stability=0.8)
    
    result = engine.apply_event(
        current_vector={"DIR": 0.3, "FOR": 0.4, "GAP": 0.7, "UNC": 0.6, "TEM": 0.5, "INT": 0.25},
        source="GOV",
        event_delta={"DIR": 0.2, "GAP": -0.2, "UNC": -0.15},
        event_code="GOV:VisaApproved",
        profile=profile,
        context=context
    )
    
    print(f"New Vector: {result.new_vector}")
    print(f"Regime: {result.regime}")
    print(f"Phase Triggered: {result.phase_triggered}")
    print(f"Correlated Risk: {result.correlated_risk}")

Version: 3.0.0
"""

from .engine import (
    LimeKernelV3,
    HumProfile,
    ExternalContext,
    UncertaintyEstimate,
    VectorUpdateV3,
    BackwardPlan,
    AXES,
    BASE_MATRIX,
    CROSS_AXIS,
    EVENT_SYNERGIES,
    PHASE_THRESHOLDS,
    TEMPORAL_SCALES,
    REGIMES,
)

# Backward compatibility
EnhancedVectorEngine = LimeKernelV3

__version__ = "3.0.0"
__all__ = [
    "LimeKernelV3",
    "EnhancedVectorEngine",  # v2 호환
    "HumProfile",
    "ExternalContext",
    "UncertaintyEstimate",
    "VectorUpdateV3",
    "BackwardPlan",
    "AXES",
    "BASE_MATRIX",
    "CROSS_AXIS",
    "EVENT_SYNERGIES",
    "PHASE_THRESHOLDS",
    "TEMPORAL_SCALES",
    "REGIMES",
]
