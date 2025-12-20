"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS TIME–MONEY PHYSICS (CANONICAL)

"AUTUS에서 돈은 '얼마'가 아니라
 '얼마나 오래, 얼마나 자주, 얼마나 안전하게' 흐르느냐로 계산된다."
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum
import time


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

GRAVITY_BASE = 180  # 중력 기준일 (6개월)
SURVIVAL_THRESHOLD = 180  # 최소 생존일 (6개월)
FLOAT_GREEN_THRESHOLD = 0.7
FLOAT_RED_THRESHOLD = 1.0
ALPHA_SAFETY = 1.3  # 확장 안전 계수


class FloatState(Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


# ═══════════════════════════════════════════════════════════════════════════════
# 기본 단위 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class CommitData:
    """Commit 데이터 (시간-돈 물리 기반)"""
    id: str
    amount: float  # Mass (₩)
    start_date: float  # timestamp
    end_date: float  # timestamp
    payments_per_period: int = 1  # 지급 빈도 (월 기준)
    regulatory_risk: float = 0.0  # 0.0 ~ 1.0
    operational_risk: float = 0.0  # 0.0 ~ 1.0
    direction: str = "in"  # "in" | "out"
    status: str = "active"


# ═══════════════════════════════════════════════════════════════════════════════
# 핵심 물리 변수 계산
# ═══════════════════════════════════════════════════════════════════════════════

def calc_mass(commit: CommitData) -> float:
    """
    Mass (질량): 이 Commit이 얼마나 무거운가
    Mass_i = Amount_i
    """
    return commit.amount


def calc_velocity(commit: CommitData, period_days: int = 30) -> float:
    """
    Velocity (속도): 돈이 얼마나 자주 움직이는가
    Velocity_i = Payments_per_period / T
    
    - 월급(월 1회): 낮은 속도
    - 일급/주급: 높은 속도
    """
    return commit.payments_per_period / period_days


def calc_gravity(commit: CommitData, current_timestamp: float = None) -> float:
    """
    Gravity (중력): 이 Commit이 얼마나 오래 붙잡고 있는가
    Gravity_i = D / 180
    
    - 180일 = 1.0 기준
    - 6개월 미만 → 중력 약함
    """
    if current_timestamp is None:
        current_timestamp = time.time()
    
    duration_days = (commit.end_date - commit.start_date) / 86400
    return duration_days / GRAVITY_BASE


def calc_friction(commit: CommitData) -> float:
    """
    Friction (마찰): 돈이 움직이기 어려운 정도
    Friction_i = Regulatory_Risk × Operational_Risk
    
    - 비자, 학사, 노동 규정 등
    - 0.0 ~ 1.0
    """
    # 곱셈 대신 최대값 사용 (더 보수적)
    return max(commit.regulatory_risk, commit.operational_risk)


def calc_shock(commit: CommitData, delta_mass: float = 0) -> float:
    """
    Shock (충격): 예상치 못한 단절
    Shock_i = |ΔMass| / Mass
    
    - 갑작스러운 계약 종료
    - 급여 중단
    """
    mass = calc_mass(commit)
    if mass <= 0:
        return 0
    return abs(delta_mass) / mass


# ═══════════════════════════════════════════════════════════════════════════════
# Commit Energy (핵심)
# ═══════════════════════════════════════════════════════════════════════════════

def calc_commit_energy(
    commit: CommitData,
    current_timestamp: float = None
) -> float:
    """
    Commit Energy: 돈 + 시간이 만들어내는 실제 유지력
    
    Commit_Energy_i = Mass_i × Velocity_i × Gravity_i × (1 − Friction_i)
    
    📌 이 값이 0이면 그 Commit은 '존재하지 않는 것'과 동일
    """
    if commit.status != "active":
        return 0.0
    
    mass = calc_mass(commit)
    velocity = calc_velocity(commit)
    gravity = calc_gravity(commit, current_timestamp)
    friction = calc_friction(commit)
    
    energy = mass * velocity * gravity * (1 - friction)
    return max(0, energy)


def calc_commit_energy_breakdown(
    commit: CommitData,
    current_timestamp: float = None
) -> Dict[str, float]:
    """Commit Energy 상세 분해"""
    mass = calc_mass(commit)
    velocity = calc_velocity(commit)
    gravity = calc_gravity(commit, current_timestamp)
    friction = calc_friction(commit)
    energy = mass * velocity * gravity * (1 - friction)
    
    return {
        "mass": mass,
        "velocity": velocity,
        "gravity": gravity,
        "friction": friction,
        "energy": max(0, energy)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 개인 생존 시간 (Human Continuity)
# ═══════════════════════════════════════════════════════════════════════════════

def calc_survival_time(
    commits_in: List[CommitData],
    commits_out: List[CommitData],
    daily_burn: float,
    current_timestamp: float = None
) -> Dict[str, Any]:
    """
    개인 생존 시간: 이 사람이 지금 상태로 몇 일 버티는가
    
    Survival_Time = (Σ Commit_Energy_in − Σ Commit_Energy_out) / Daily_Burn
    
    조건: Survival_Time ≥ 180 days → 미만 시 SYSTEM RED
    """
    energy_in = sum(calc_commit_energy(c, current_timestamp) for c in commits_in)
    energy_out = sum(calc_commit_energy(c, current_timestamp) for c in commits_out)
    
    net_energy = energy_in - energy_out
    
    if daily_burn <= 0:
        survival_days = float('inf') if net_energy >= 0 else 0
    else:
        survival_days = net_energy / daily_burn
    
    is_safe = survival_days >= SURVIVAL_THRESHOLD
    
    if survival_days < SURVIVAL_THRESHOLD * 0.5:  # 3개월 미만
        state = "RED"
    elif survival_days < SURVIVAL_THRESHOLD:  # 6개월 미만
        state = "YELLOW"
    else:
        state = "GREEN"
    
    return {
        "energy_in": energy_in,
        "energy_out": energy_out,
        "net_energy": net_energy,
        "daily_burn": daily_burn,
        "survival_days": survival_days,
        "threshold": SURVIVAL_THRESHOLD,
        "is_safe": is_safe,
        "state": state
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Float (시간이 만들어내는 돈) — Bezos 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PaymentEvent:
    """지급 이벤트"""
    id: str
    amount: float
    received_date: float  # 수령일 timestamp
    paid_date: float  # 지급일 timestamp


def calc_float_time(event: PaymentEvent) -> float:
    """
    Float Time = Payment_Received_Date − Payment_Paid_Date
    
    - Float_Time > 0 → 시스템 이득
    - Float_Time < 0 → 시스템 손실
    """
    return (event.received_date - event.paid_date) / 86400  # 일 단위


def calc_float_value(events: List[PaymentEvent]) -> Dict[str, Any]:
    """
    Float Value = Σ (Mass × Float_Time)
    """
    total_positive = 0
    total_negative = 0
    
    for event in events:
        float_time = calc_float_time(event)
        value = event.amount * float_time
        
        if value >= 0:
            total_positive += value
        else:
            total_negative += abs(value)
    
    net_float = total_positive - total_negative
    
    return {
        "positive_float": total_positive,
        "negative_float": total_negative,
        "net_float": net_float,
        "is_healthy": net_float >= 0
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Float Pressure (붕괴 압력)
# ═══════════════════════════════════════════════════════════════════════════════

def calc_float_pressure(
    commits_out: List[CommitData],
    commits_in: List[CommitData],
    current_timestamp: float = None
) -> Dict[str, Any]:
    """
    Float Pressure = Outgoing_Commit_Energy / Incoming_Commit_Energy
    
    판정:
    - < 0.7 → GREEN
    - 0.7–1.0 → YELLOW
    - > 1.0 → RED
    
    📌 RED 상태에서는 신규 Commit 생성 금지
    """
    outgoing_energy = sum(calc_commit_energy(c, current_timestamp) for c in commits_out)
    incoming_energy = sum(calc_commit_energy(c, current_timestamp) for c in commits_in)
    
    if incoming_energy <= 0:
        pressure = float('inf') if outgoing_energy > 0 else 0
    else:
        pressure = outgoing_energy / incoming_energy
    
    if pressure < FLOAT_GREEN_THRESHOLD:
        state = FloatState.GREEN
    elif pressure <= FLOAT_RED_THRESHOLD:
        state = FloatState.YELLOW
    else:
        state = FloatState.RED
    
    can_create_commit = state != FloatState.RED
    
    return {
        "outgoing_energy": outgoing_energy,
        "incoming_energy": incoming_energy,
        "pressure": pressure,
        "state": state,
        "can_create_commit": can_create_commit,
        "thresholds": {
            "green": FLOAT_GREEN_THRESHOLD,
            "red": FLOAT_RED_THRESHOLD
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Survival Mass (확장 허용 질량)
# ═══════════════════════════════════════════════════════════════════════════════

def calc_survival_mass(
    active_commits: List[CommitData],
    current_timestamp: float = None
) -> float:
    """
    Survival Mass = Σ Commit_Energy × D
    """
    if current_timestamp is None:
        current_timestamp = time.time()
    
    total_mass = 0
    
    for commit in active_commits:
        if commit.status != "active":
            continue
        
        energy = calc_commit_energy(commit, current_timestamp)
        duration = (min(current_timestamp, commit.end_date) - commit.start_date) / 86400
        duration = max(0, duration)
        
        total_mass += energy * duration
    
    return total_mass


def can_expand(
    active_commits: List[CommitData],
    required_mass: float,
    current_timestamp: float = None
) -> Dict[str, Any]:
    """
    확장 조건: Survival_Mass ≥ α × Required_Mass
    α = 1.3 (안전 계수)
    """
    survival_mass = calc_survival_mass(active_commits, current_timestamp)
    threshold = ALPHA_SAFETY * required_mass
    
    can_do = survival_mass >= threshold
    gap = max(0, threshold - survival_mass)
    
    return {
        "survival_mass": survival_mass,
        "required_mass": required_mass,
        "threshold": threshold,
        "alpha": ALPHA_SAFETY,
        "can_expand": can_do,
        "gap": gap
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 시간 기반 붕괴 방정식
# ═══════════════════════════════════════════════════════════════════════════════

def calc_time_to_collapse(
    survival_time: float,
    float_pressure: float
) -> Dict[str, Any]:
    """
    Time to Collapse: 아무 조치 안 하면 언제 무너지는가
    
    Time_to_Collapse = Survival_Time / Float_Pressure
    
    - 이 값이 0으로 수렴 → 즉시 개입 필요
    """
    if float_pressure <= 0:
        collapse_time = float('inf')
    else:
        collapse_time = survival_time / float_pressure
    
    urgency = "CRITICAL" if collapse_time < 30 else \
              "HIGH" if collapse_time < 90 else \
              "MEDIUM" if collapse_time < 180 else "LOW"
    
    return {
        "survival_time": survival_time,
        "float_pressure": float_pressure,
        "collapse_time_days": collapse_time,
        "urgency": urgency,
        "needs_immediate_action": urgency == "CRITICAL"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Action 선택 함수 (시간·돈 통합)
# ═══════════════════════════════════════════════════════════════════════════════

def select_action(
    shock: float,
    friction: float,
    gravity: float,
    system_state: str = "GREEN"
) -> Dict[str, Any]:
    """
    Action 선택 함수:
    
    if Shock_i > Friction_i:
        Action = SHOCK_DAMP
    elif Friction_i > Shock_i:
        Action = DEFRICTION
    elif Gravity_i < 1.0:
        Action = RECOVER
    else:
        Action = NONE
    """
    # SYSTEM RED → ACTION 없음
    if system_state == "RED":
        return {
            "action": None,
            "reason": "SYSTEM_RED_BLOCKED",
            "factors": {"shock": shock, "friction": friction, "gravity": gravity}
        }
    
    if shock > friction:
        action = "SHOCK_DAMP"
        reason = f"SHOCK({shock:.2f}) > FRICTION({friction:.2f})"
    elif friction > shock:
        action = "DEFRICTION"
        reason = f"FRICTION({friction:.2f}) > SHOCK({shock:.2f})"
    elif gravity < 1.0:
        action = "RECOVER"
        reason = f"GRAVITY({gravity:.2f}) < 1.0"
    else:
        action = None
        reason = "STABLE_NO_ACTION_NEEDED"
    
    return {
        "action": action,
        "reason": reason,
        "factors": {
            "shock": shock,
            "friction": friction,
            "gravity": gravity
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 분석 함수
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_time_money_physics(
    commits_in: List[CommitData],
    commits_out: List[CommitData],
    daily_burn: float,
    required_expansion_mass: float = 0,
    current_timestamp: float = None
) -> Dict[str, Any]:
    """
    전체 시간-돈 물리 분석
    """
    if current_timestamp is None:
        current_timestamp = time.time()
    
    # 개인 생존 시간
    survival = calc_survival_time(
        commits_in, commits_out, daily_burn, current_timestamp
    )
    
    # Float Pressure
    pressure_result = calc_float_pressure(
        commits_out, commits_in, current_timestamp
    )
    
    # 붕괴 시간
    collapse = calc_time_to_collapse(
        survival["survival_days"],
        pressure_result["pressure"]
    )
    
    # 확장 가능 여부
    all_commits = commits_in + commits_out
    expansion = can_expand(all_commits, required_expansion_mass, current_timestamp)
    
    # 대표 물리값 계산 (첫 번째 commit 기준)
    if commits_in:
        sample_commit = commits_in[0]
        shock = calc_shock(sample_commit)
        friction = calc_friction(sample_commit)
        gravity = calc_gravity(sample_commit, current_timestamp)
    else:
        shock = friction = 0
        gravity = 1.0
    
    # Action 선택
    system_state = survival["state"]
    action_result = select_action(shock, friction, gravity, system_state)
    
    return {
        "survival": survival,
        "float_pressure": pressure_result,
        "collapse": collapse,
        "expansion": expansion,
        "recommended_action": action_result,
        "summary": {
            "system_state": system_state,
            "survival_days": survival["survival_days"],
            "pressure": pressure_result["pressure"],
            "collapse_days": collapse["collapse_time_days"],
            "can_expand": expansion["can_expand"],
            "action": action_result["action"]
        }
    }
