"""
AUTUS 역할 FSM (Finite State Machine)
=====================================

역할 자동전환 원칙:
- 기본 상태: EXECUTOR
- 압력·범위 증가 → OPERATOR
- 비가역 임계 도달 → DECIDER
- 결정 후 자동 하강

규칙:
- 한 순간, 한 역할
- 상위 역할 활성 시 하위 자동화 잠금
- 사용자에게 모드 전환 고지 ❌
"""

from app.core.roles import Role
from app.core.schemas import PressureSignals, FsmConfig, RoleState


def _cooldown_passed(role: Role, entered_at_ts: int, now_ts: int, cfg: FsmConfig) -> bool:
    """쿨다운 시간 경과 여부 확인"""
    delta_sec = max(0, now_ts - entered_at_ts)
    delta_min = delta_sec / 60.0
    
    if role == Role.DECIDER:
        return delta_min >= cfg.cooldown_dec
    if role == Role.OPERATOR:
        return delta_min >= cfg.cooldown_op
    return delta_min >= cfg.cooldown_exec


def determine_role(
    now_ts: int,
    signals: PressureSignals,
    state: RoleState,
    cfg: FsmConfig,
    decision_completed: bool,
) -> tuple[Role, str]:
    """
    역할 결정 로직
    
    Returns:
        (새 역할, 전환 이유)
    """
    
    # 0) 인터럽트는 항상 DECIDER로 상승
    if signals.interrupt:
        return Role.DECIDER, "INTERRUPT"

    # 1) 쿨다운 게이트 (최소 유지 시간)
    if not _cooldown_passed(state.current_role, state.role_entered_at_ts, now_ts, cfg):
        return state.current_role, "COOLDOWN"

    # 2) 역할별 전환 로직
    current = state.current_role

    # === EXECUTOR ===
    if current == Role.EXECUTOR:
        # 범위 확대 + 미룸 비용 증가 → OPERATOR 상승
        if (signals.scope >= cfg.scope_up) and (signals.dc >= cfg.dc_up) and (signals.authority_needed is False):
            return Role.OPERATOR, "SCOPE+DC"
        return Role.EXECUTOR, "STAY_EXECUTOR"

    # === OPERATOR ===
    if current == Role.OPERATOR:
        # 권한 필요 + 비가역성 높음 + 시간 부족 → DECIDER 상승
        if (
            (signals.authority_needed is True)
            and (signals.ir >= cfg.ir_up)
            and (signals.slack_min <= cfg.slack_up)
        ):
            return Role.DECIDER, "IR+AUTH+SLACK"

        # 히스테리시스: 안정화 시 EXECUTOR로 하강
        if (signals.scope <= cfg.scope_down) and (signals.dc <= cfg.dc_down):
            return Role.EXECUTOR, "STABLE"
        return Role.OPERATOR, "STAY_OPERATOR"

    # === DECIDER ===
    # 결정 완료 → OPERATOR로 하강
    if decision_completed:
        return Role.OPERATOR, "DECIDED"
    
    # IR 하락 → OPERATOR로 하강
    if signals.ir <= cfg.ir_down:
        return Role.OPERATOR, "IR_DOWN"
    
    return Role.DECIDER, "STAY_DECIDER"


def apply_transition(now_ts: int, state: RoleState, new_role: Role, reason: str) -> RoleState:
    """역할 전환 적용"""
    if new_role != state.current_role:
        state.current_role = new_role
        state.role_entered_at_ts = now_ts
        state.last_role_change_at_ts = now_ts
        state.last_reason = reason
    return state
