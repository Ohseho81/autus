"""
AUTUS 스키마 정의
=================

압력 모델 기반 역할 전환 시스템
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from app.core.roles import Role


class PressureSignals(BaseModel):
    """압력 신호 (에너지 입력)"""
    
    # 0~1: Delay Cost (미룸 비용)
    dc: float = Field(ge=0.0, le=1.0, description="미룸 비용")
    
    # 0~1: Irreversibility (비가역성)
    ir: float = Field(ge=0.0, le=1.0, description="비가역성")

    # 0=personal, 1=team, 2=org (범위 영향)
    scope: int = Field(ge=0, le=2, description="영향 범위")

    # 남은 여유 시간 (분)
    slack_min: int = Field(ge=0, description="남은 시간(분)")

    # 권한 필요 여부
    authority_needed: bool = False

    # 인터럽트 (즉시 DECIDER 상승)
    interrupt: bool = False

    # 신뢰도 (게이트키핑 튜닝용)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)


class FsmConfig(BaseModel):
    """FSM 설정 (히스테리시스 임계값)"""
    
    # DC 상승/하강 임계값
    dc_up: float = 0.55
    dc_down: float = 0.35
    
    # IR 상승/하강 임계값
    ir_up: float = 0.70
    ir_down: float = 0.50

    # Scope 상승/하강 임계값
    scope_up: int = 1
    scope_down: int = 0

    # DECIDER 상승을 위한 slack 임계값 (분)
    slack_up: int = 90

    # 쿨다운 시간 (최소 유지 시간, 분)
    cooldown_exec: int = 5
    cooldown_op: int = 10
    cooldown_dec: int = 15


class RoleState(BaseModel):
    """현재 역할 상태"""
    current_role: Role = Role.EXECUTOR
    role_entered_at_ts: int = 0  # epoch seconds
    last_role_change_at_ts: int = 0
    last_reason: Optional[str] = None


class DecisionCard(BaseModel):
    """Top-1 결정 카드"""
    title: str
    time: str
    risk: str
    actions: List[str]
    locks: Dict[str, bool]


class RoleUpdateRequest(BaseModel):
    """역할 업데이트 요청"""
    now_ts: int
    signals: PressureSignals
    state: RoleState
    config: FsmConfig = FsmConfig()
    decision_completed: bool = False


class RoleUpdateResponse(BaseModel):
    """역할 업데이트 응답"""
    role: Role
    reason: str
    state: RoleState
    card: DecisionCard
