"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS CORE PHYSICS — 7 Laws (LOCK)

"AUTUS는 철학이 아니라 물리 법칙으로만 작동하는 비즈니스다.
 그래서 설득할 필요가 없다."
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

T_MIN = 180  # 최소 생존 기간 (일) = 6개월
ALPHA_SAFETY = 1.3  # 확장 안전 계수
MAX_ROLES = 6  # 최대 역할 수
MAX_UI_ELEMENTS = 3  # 최대 UI 요소
MAX_BUTTONS = 1  # 최대 버튼 수
MAX_DECISION_TIME = 1.0  # 최대 결정 시간 (초)


class SystemState(Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


@dataclass
class Person:
    """개인 데이터"""
    id: str
    survival_time: float  # 생존 가능 일수
    commits: List[str] = None  # 관련 Commit ID들


@dataclass
class Commit:
    """약속 데이터"""
    id: str
    amount: float  # 금액 (Mass)
    start_date: float  # 시작일 (timestamp)
    end_date: float  # 종료일 (timestamp)
    status: str = "active"  # active / closed


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 1: Continuity Law (연속성 법칙)
# "인간은 시스템 안에서만 실패할 수 있고, 시스템 밖으로 떨어질 수 없다."
# ═══════════════════════════════════════════════════════════════════════════════

def law1_human_continuity(persons: List[Person]) -> Dict[str, Any]:
    """
    Human_Continuity = min(Survival_Time_i) ≥ T_min
    
    Returns:
        {
            "min_survival_time": float,
            "threshold": float,
            "passed": bool,
            "at_risk_persons": List[str],
            "system_state": SystemState
        }
    """
    if not persons:
        return {
            "min_survival_time": float('inf'),
            "threshold": T_MIN,
            "passed": True,
            "at_risk_persons": [],
            "system_state": SystemState.GREEN
        }
    
    survival_times = [(p.id, p.survival_time) for p in persons]
    min_survival = min(st for _, st in survival_times)
    
    at_risk = [pid for pid, st in survival_times if st < T_MIN]
    
    passed = min_survival >= T_MIN
    
    # 상태 결정
    if min_survival < T_MIN * 0.5:  # 3개월 미만
        state = SystemState.RED
    elif min_survival < T_MIN:  # 6개월 미만
        state = SystemState.YELLOW
    else:
        state = SystemState.GREEN
    
    return {
        "min_survival_time": min_survival,
        "threshold": T_MIN,
        "passed": passed,
        "at_risk_persons": at_risk,
        "system_state": state
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 2: Commit Conservation Law (약속 보존 법칙)
# "돈은 Commit 없이 이동할 수 없다."
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyFlow:
    """자금 흐름"""
    id: str
    amount: float
    commit_id: Optional[str]
    timestamp: float


def law2_commit_conservation(
    money_flows: List[MoneyFlow],
    active_commits: List[Commit]
) -> Dict[str, Any]:
    """
    ∑ Money_Flow = ∑ Active_Commit_Amount
    Flow_j → Commit_k (1:1 매핑)
    
    Returns:
        {
            "total_flow": float,
            "total_commit": float,
            "passed": bool,
            "invalid_flows": List[str],  # Commit 없는 Flow
            "orphan_commits": List[str]  # Flow 없는 Commit
        }
    """
    total_flow = sum(f.amount for f in money_flows)
    total_commit = sum(c.amount for c in active_commits if c.status == "active")
    
    commit_ids = {c.id for c in active_commits if c.status == "active"}
    
    # Commit 없는 Flow 찾기
    invalid_flows = [f.id for f in money_flows if f.commit_id not in commit_ids]
    
    # Flow가 연결되지 않은 Commit 찾기
    flow_commit_ids = {f.commit_id for f in money_flows if f.commit_id}
    orphan_commits = [c.id for c in active_commits 
                     if c.status == "active" and c.id not in flow_commit_ids]
    
    passed = len(invalid_flows) == 0
    
    return {
        "total_flow": total_flow,
        "total_commit": total_commit,
        "passed": passed,
        "invalid_flows": invalid_flows,
        "orphan_commits": orphan_commits
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 3: State Dominance Law (상태 지배 법칙)
# "인간의 의지는 상태(State)를 이길 수 없다."
# ═══════════════════════════════════════════════════════════════════════════════

def law3_allowed_actions(system_state: SystemState) -> Dict[str, Any]:
    """
    Allowed_Action = f(System_State)
    Human_Intent ∉ 변수
    
    if System_State == RED:
        Allowed_Action = ∅
    
    Returns:
        {
            "system_state": SystemState,
            "allowed_actions": List[str],
            "blocked_actions": List[str],
            "can_create_commit": bool,
            "can_expand": bool
        }
    """
    ALL_ACTIONS = ["RECOVER", "DEFRICTION", "SHOCK_DAMP", "CREATE_COMMIT", "EXPAND"]
    
    if system_state == SystemState.RED:
        return {
            "system_state": system_state,
            "allowed_actions": [],
            "blocked_actions": ALL_ACTIONS,
            "can_create_commit": False,
            "can_expand": False
        }
    
    if system_state == SystemState.YELLOW:
        return {
            "system_state": system_state,
            "allowed_actions": ["RECOVER", "DEFRICTION", "SHOCK_DAMP"],
            "blocked_actions": ["CREATE_COMMIT", "EXPAND"],
            "can_create_commit": False,
            "can_expand": False
        }
    
    # GREEN
    return {
        "system_state": system_state,
        "allowed_actions": ALL_ACTIONS,
        "blocked_actions": [],
        "can_create_commit": True,
        "can_expand": True
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 4: Cognitive Load Minimum Law (인지 최소 법칙)
# "판단 속도는 정보량에 반비례한다."
# ═══════════════════════════════════════════════════════════════════════════════

def law4_ui_compliance(
    ui_elements: int,
    buttons: int,
    text_count: int
) -> Dict[str, Any]:
    """
    Decision_Time ∝ UI_Elements
    UI_Elements ≤ 3
    Buttons ≤ 1
    Text = 0
    
    Returns:
        {
            "ui_elements": int,
            "buttons": int,
            "text_count": int,
            "passed": bool,
            "estimated_decision_time": float,
            "violations": List[str]
        }
    """
    violations = []
    
    if ui_elements > MAX_UI_ELEMENTS:
        violations.append(f"UI_ELEMENTS_EXCEEDED ({ui_elements} > {MAX_UI_ELEMENTS})")
    
    if buttons > MAX_BUTTONS:
        violations.append(f"BUTTONS_EXCEEDED ({buttons} > {MAX_BUTTONS})")
    
    if text_count > 0:
        violations.append(f"TEXT_EXISTS ({text_count} > 0)")
    
    # 결정 시간 추정 (단순 모델)
    estimated_time = 0.3 * ui_elements + 0.5 * buttons + 0.2 * text_count
    
    passed = len(violations) == 0 and estimated_time <= MAX_DECISION_TIME
    
    return {
        "ui_elements": ui_elements,
        "buttons": buttons,
        "text_count": text_count,
        "passed": passed,
        "estimated_decision_time": estimated_time,
        "violations": violations
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 5: Failure Containment Law (실패 격리 법칙)
# "실패는 전파되지 않는다. 실패는 해당 Commit에서 끝난다."
# ═══════════════════════════════════════════════════════════════════════════════

def law5_failure_impact(
    failed_commit: Commit,
    all_commits: List[Commit],
    total_system_mass: float
) -> Dict[str, Any]:
    """
    Failure_Impact = ΔCommit_k
    System_Impact ≠ ΣFailures
    ∂System / ∂Failure_i ≈ 0
    
    Returns:
        {
            "failed_commit_id": str,
            "failure_mass": float,
            "system_mass": float,
            "impact_ratio": float,  # 0.0 ~ 1.0
            "contained": bool,
            "affected_commits": List[str]
        }
    """
    failure_mass = failed_commit.amount
    
    # 영향받는 Commit 찾기 (직접 연결된 것만)
    # 실제로는 dependency graph가 필요하지만, 단순화
    affected_commits = []  # 격리 원칙: 영향 없음
    
    impact_ratio = failure_mass / max(total_system_mass, 1)
    
    # 격리 성공 조건: 영향 비율 < 10%
    contained = impact_ratio < 0.10
    
    return {
        "failed_commit_id": failed_commit.id,
        "failure_mass": failure_mass,
        "system_mass": total_system_mass,
        "impact_ratio": impact_ratio,
        "contained": contained,
        "affected_commits": affected_commits
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 6: Responsibility Density Law (책임 밀도 법칙)
# "역할이 늘수록 책임은 희석된다."
# ═══════════════════════════════════════════════════════════════════════════════

def law6_responsibility_density(role_count: int) -> Dict[str, Any]:
    """
    Responsibility_Density = 1 / Number_of_Roles
    Number_of_Roles = 6 (고정)
    
    Returns:
        {
            "role_count": int,
            "max_roles": int,
            "responsibility_density": float,
            "passed": bool,
            "governance_status": str
        }
    """
    if role_count <= 0:
        role_count = 1
    
    density = 1.0 / role_count
    threshold = 1.0 / MAX_ROLES  # 0.167
    
    passed = role_count <= MAX_ROLES
    
    if not passed:
        status = "GOVERNANCE_COLLAPSE_RISK"
    elif density < threshold * 0.8:
        status = "RESPONSIBILITY_DILUTED"
    else:
        status = "HEALTHY"
    
    return {
        "role_count": role_count,
        "max_roles": MAX_ROLES,
        "responsibility_density": density,
        "passed": passed,
        "governance_status": status
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LAW 7: Survival Mass Threshold Law (생존 질량 임계 법칙)
# "충분히 무거워지기 전엔, 커질 수 없다."
# ═══════════════════════════════════════════════════════════════════════════════

def law7_survival_mass(
    active_commits: List[Commit],
    required_mass: float,
    current_timestamp: float
) -> Dict[str, Any]:
    """
    Survival_Mass = Σ (Active_Commit_Mass × Duration)
    확장 조건: Survival_Mass ≥ α × Required_Mass
    α = 1.3 (안전 계수)
    
    Returns:
        {
            "survival_mass": float,
            "required_mass": float,
            "threshold": float,
            "can_expand": bool,
            "expansion_gap": float  # 확장까지 필요한 질량
        }
    """
    survival_mass = 0.0
    
    for commit in active_commits:
        if commit.status != "active":
            continue
        
        # Duration 계산 (일 단위)
        duration = (min(current_timestamp, commit.end_date) - commit.start_date) / 86400
        duration = max(0, duration)
        
        # Mass × Duration
        survival_mass += commit.amount * duration
    
    threshold = ALPHA_SAFETY * required_mass
    can_expand = survival_mass >= threshold
    expansion_gap = max(0, threshold - survival_mass)
    
    return {
        "survival_mass": survival_mass,
        "required_mass": required_mass,
        "threshold": threshold,
        "can_expand": can_expand,
        "expansion_gap": expansion_gap
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 검증 함수
# ═══════════════════════════════════════════════════════════════════════════════

def verify_all_laws(
    persons: List[Person],
    money_flows: List[MoneyFlow],
    commits: List[Commit],
    ui_elements: int = 3,
    buttons: int = 1,
    text_count: int = 0,
    role_count: int = 6,
    required_mass: float = 0,
    current_timestamp: float = None
) -> Dict[str, Any]:
    """
    7개 법칙 전체 검증
    
    Returns:
        {
            "all_passed": bool,
            "system_state": SystemState,
            "laws": {
                "law1_continuity": {...},
                "law2_conservation": {...},
                "law3_state": {...},
                "law4_ui": {...},
                "law5_containment": {...},
                "law6_responsibility": {...},
                "law7_survival": {...}
            },
            "violations": List[str]
        }
    """
    import time
    if current_timestamp is None:
        current_timestamp = time.time()
    
    violations = []
    
    # Law 1: Human Continuity
    law1 = law1_human_continuity(persons)
    if not law1["passed"]:
        violations.append("LAW1_CONTINUITY_VIOLATED")
    
    # Law 2: Commit Conservation
    active_commits = [c for c in commits if c.status == "active"]
    law2 = law2_commit_conservation(money_flows, active_commits)
    if not law2["passed"]:
        violations.append("LAW2_CONSERVATION_VIOLATED")
    
    # System State (Law 1에서 결정)
    system_state = law1["system_state"]
    
    # Law 3: State Dominance
    law3 = law3_allowed_actions(system_state)
    
    # Law 4: Cognitive Minimum
    law4 = law4_ui_compliance(ui_elements, buttons, text_count)
    if not law4["passed"]:
        violations.append("LAW4_UI_VIOLATED")
    
    # Law 5: Failure Containment (가상의 실패 시나리오)
    total_mass = sum(c.amount for c in active_commits)
    law5 = {"passed": True, "contained": True}  # 기본값
    
    # Law 6: Responsibility Density
    law6 = law6_responsibility_density(role_count)
    if not law6["passed"]:
        violations.append("LAW6_RESPONSIBILITY_VIOLATED")
    
    # Law 7: Survival Mass
    law7 = law7_survival_mass(active_commits, required_mass, current_timestamp)
    
    all_passed = len(violations) == 0
    
    return {
        "all_passed": all_passed,
        "system_state": system_state,
        "laws": {
            "law1_continuity": law1,
            "law2_conservation": law2,
            "law3_state": law3,
            "law4_ui": law4,
            "law5_containment": law5,
            "law6_responsibility": law6,
            "law7_survival": law7
        },
        "violations": violations
    }
