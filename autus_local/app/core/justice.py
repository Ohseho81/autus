"""
AUTUS Justice Mechanism v1.0
Based on DEFINITION.md Final Lock

2/3 Rule:
├── 상위 1/3 손해 없이 하위 2/3 이득 ❌ 금지
├── 특정 노드 과잉 손실 (>2σ) ❌ 제한
└── 양자 터널링으로 우회 ❌ 차단

임계값 테이블:
| 메트릭              | 임계값 | 제약          |
|---------------------|--------|---------------|
| Max Single Loss     | >30%   | OR +50%       |
| Gini Coefficient    | >0.7   | 선택지 제한   |
| Contagion Risk      | >0.5   | 쿨다운 강제   |
| Cascade Depth       | >3     | 차단          |

UI 표현 규칙:
- Justice 발동 시 명시적 알림 금지
- OR 수치 상승, 선택지 감소, 회전 속도 감소로만 표현
"""

from dataclasses import dataclass
from .models import StateVector


# ============================================
# THRESHOLDS (Definition v1.0)
# ============================================

THRESHOLD_MAX_SINGLE_LOSS = 0.30
THRESHOLD_GINI_COEFFICIENT = 0.70
THRESHOLD_CONTAGION_RISK = 0.50
THRESHOLD_CASCADE_DEPTH = 3

# Derived thresholds for 2/3 rule
THRESHOLD_INFLUENCE = 0.7      # Gini-based
THRESHOLD_RECOVERY = 0.7       # Recovery constraint
THRESHOLD_OPTIONALITY = 0.5    # Contagion-based


@dataclass(frozen=True)
class JusticeMetrics:
    """
    Justice 메트릭 - UI에서 직접 표시하지 않음
    OR (Overdose Risk) 수치로만 간접 표현
    """
    influence_concentration: float  # 영향력 집중도
    recovery_half_life: float       # 회복 반감기
    optionality_loss_rate: float    # 선택지 손실률
    gini_coefficient: float         # 지니 계수 (불평등)
    contagion_risk: float           # 전염 위험
    overdose_risk: float            # OR (복합 위험 지표)


@dataclass(frozen=True)
class JusticeDecision:
    """
    Justice 결정 - 암시적으로만 표현
    
    ⚠️ 금지 표현:
    - "Justice Activated"
    - "Warning: Constraint Applied"
    
    ✅ 허용 표현:
    - OR 수치 상승
    - 선택지 수 감소 (시각적)
    - 회전 속도 감소 (암시적)
    - 쿨다운 타이머만 표시
    """
    triggered: bool
    or_level: float              # Overdose Risk level [0, 1]
    cooldown_required: bool      # 쿨다운 필요 여부
    options_reduced: int         # 감소된 선택지 수 (0-3)
    spin_slowdown: float         # 회전 속도 감소율 (1.0 = 정상)
    
    # Internal only (UI에 노출하지 않음)
    _condition_influence: bool
    _condition_recovery: bool
    _condition_optionality: bool


def compute_justice_metrics(S: StateVector) -> JusticeMetrics:
    """6축 상태에서 Justice 메트릭 계산"""
    
    # 영향력 집중도 (momentum + pressure 기반)
    influence = (S.momentum + S.pressure) / 2
    
    # 회복 반감기 (recovery 역수 + drag)
    recovery_hl = (1.0 - S.recovery + S.drag) / 2
    
    # 선택지 손실률 (volatility + stability 역수)
    optionality = (S.volatility + (1.0 - S.stability)) / 2
    
    # 지니 계수 (불평등 지표 - 6축 분산 기반)
    values = [S.stability, S.pressure, S.drag, S.momentum, S.volatility, S.recovery]
    mean_val = sum(values) / 6
    gini = sum(abs(v - mean_val) for v in values) / (6 * mean_val) if mean_val > 0 else 0
    
    # 전염 위험 (압력 + 변동성)
    contagion = (S.pressure * S.volatility) ** 0.5
    
    # Overdose Risk (복합 위험 지표)
    or_level = (influence + recovery_hl + optionality + gini + contagion) / 5
    
    return JusticeMetrics(
        influence_concentration=influence,
        recovery_half_life=recovery_hl,
        optionality_loss_rate=optionality,
        gini_coefficient=gini,
        contagion_risk=contagion,
        overdose_risk=or_level,
    )


def check_justice(S: StateVector) -> JusticeDecision:
    """
    Justice 2/3 Rule 검사
    
    세 조건 중 두 개 이상 만족 시 발동:
    - A: influence_concentration > THRESHOLD_INFLUENCE
    - B: recovery_half_life > THRESHOLD_RECOVERY
    - C: optionality_loss_rate > THRESHOLD_OPTIONALITY
    """
    m = compute_justice_metrics(S)
    
    # 2/3 Rule 조건
    cond_a = m.influence_concentration > THRESHOLD_INFLUENCE
    cond_b = m.recovery_half_life > THRESHOLD_RECOVERY
    cond_c = m.optionality_loss_rate > THRESHOLD_OPTIONALITY
    
    triggered = (cond_a and cond_b) or (cond_a and cond_c) or (cond_b and cond_c)
    
    # 쿨다운 필요 (전염 위험 초과 시)
    cooldown = m.contagion_risk > THRESHOLD_CONTAGION_RISK
    
    # 선택지 감소 (지니 계수 기반)
    options_reduced = 0
    if m.gini_coefficient > THRESHOLD_GINI_COEFFICIENT:
        options_reduced = min(3, int((m.gini_coefficient - THRESHOLD_GINI_COEFFICIENT) * 10))
    
    # 회전 속도 감소 (OR 레벨 기반)
    spin_slowdown = 1.0 - (m.overdose_risk * 0.5) if triggered else 1.0
    
    return JusticeDecision(
        triggered=triggered,
        or_level=m.overdose_risk,
        cooldown_required=cooldown,
        options_reduced=options_reduced,
        spin_slowdown=max(0.3, spin_slowdown),
        _condition_influence=cond_a,
        _condition_recovery=cond_b,
        _condition_optionality=cond_c,
    )


def get_justice_ui_effects(decision: JusticeDecision) -> dict:
    """
    Justice 결정의 UI 효과 반환
    
    명시적 알림 없이 암시적 효과만 반환
    """
    return {
        "or_display": round(decision.or_level * 100, 1),  # OR 퍼센트 표시
        "options_available": 3 - decision.options_reduced,  # 남은 선택지 수
        "spin_multiplier": round(decision.spin_slowdown, 2),  # 회전 속도 배수
        "cooldown_seconds": 5 if decision.cooldown_required else 0,  # 쿨다운 시간
    }







