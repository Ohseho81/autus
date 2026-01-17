"""
AUTUS Top-1 카드 빌더
====================

UI 원칙:
- 항상 1장 카드
- 레이아웃 불변
- 버튼 = 권한
- 문장 = 책임
- 역할명 노출 ❌
"""

from app.core.roles import Role
from app.core.schemas import PressureSignals, DecisionCard
from app.engine.locks import lock_profile


def build_top1_card(role: Role, signals: PressureSignals, reason: str) -> DecisionCard:
    """
    역할에 따른 Top-1 결정 카드 생성
    
    EXECUTOR: 실행 카드
    OPERATOR: 조율 카드
    DECIDER: 결정 카드
    """
    locks = lock_profile(role)

    if role == Role.EXECUTOR:
        return DecisionCard(
            title="실행 1건 처리",
            time="지금 시작하면 안전",
            risk="미루면: 개인 일정 충돌 가능",
            actions=["execute", "automate", "delay"],
            locks=locks,
        )

    if role == Role.OPERATOR:
        return DecisionCard(
            title="조율 1건 필요",
            time="오늘 중 조율 권고",
            risk="미루면: 팀 작업 지연/충돌 확대",
            actions=["reschedule", "reassign", "prepare"],
            locks=locks,
        )

    # DECIDER
    return DecisionCard(
        title="결정 1건 필요",
        time=f"{signals.slack_min}분 내 결정",
        risk="미루면: 비가역 비용 발생",
        actions=["approve", "hold", "reject"],
        locks=locks,
    )
