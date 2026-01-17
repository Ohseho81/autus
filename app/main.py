"""
AUTUS Role FSM API
==================

결정 OS: 인간의 역할·책임·불안을 재배치

- 대신 결정 ❌
- 대신 실행 ❌
- 결정이 필요한 순간만 정확히 드러냄 ⭕
"""

from fastapi import FastAPI
from app.core.schemas import RoleUpdateRequest, RoleUpdateResponse
from app.engine.role_fsm import determine_role, apply_transition
from app.engine.card_builder import build_top1_card

app = FastAPI(
    title="AUTUS Role FSM",
    version="1.0.0",
    description="Decision Operating System - One Decision at a Time",
)


@app.get("/")
def root():
    return {
        "name": "AUTUS Role FSM",
        "version": "1.0.0",
        "principle": "One Decision at a Time",
        "roles": ["EXECUTOR", "OPERATOR", "DECIDER"],
    }


@app.post("/role/update", response_model=RoleUpdateResponse)
def role_update(req: RoleUpdateRequest):
    """
    역할 업데이트 엔드포인트
    
    입력: 현재 시간, 압력 신호, 현재 상태
    출력: 새 역할, 전환 이유, 새 상태, Top-1 카드
    """
    # 1. 역할 결정
    new_role, reason = determine_role(
        now_ts=req.now_ts,
        signals=req.signals,
        state=req.state,
        cfg=req.config,
        decision_completed=req.decision_completed,
    )
    
    # 2. 상태 전환 적용
    new_state = apply_transition(req.now_ts, req.state, new_role, reason)
    
    # 3. Top-1 카드 생성
    card = build_top1_card(new_role, req.signals, reason)
    
    return RoleUpdateResponse(
        role=new_role,
        reason=reason,
        state=new_state,
        card=card,
    )


@app.get("/health")
def health():
    return {"status": "healthy", "service": "autus-role-fsm"}
