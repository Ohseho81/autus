"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Turnkey Solution Framework
═══════════════════════════════════════════════════════════════════════════════

핵심 철학:
- 기존: 파편화된 업무들이 릴레이/중복 실행
- AUTUS: 단일 트리거가 모든 연쇄 작업을 완료, 개별 업무는 "삭제"됨
- 삭제 = 자동화조차 필요 없는 상태 (로직에 흡수)

4단계 프레임워크:
- Stage 1: 수집 (Collection) - 기존 파편화된 업무 전체 파악
- Stage 2: 재정의 (Redesign) - 트리거-체인 구조로 통합
- Stage 3: 자동화 (Automate) - 체인 액션 구현
- Stage 4: 삭제화 (Eliminate) - 개별 업무 자연소멸

산업별 핵심 트리거:
- 교육: 결제 + 수업
- 의료: 예약 + 진료
- 물류: 주문 + 배송
- 호텔: 예약 + 체크인
- 제조: 수주 + 생산
- 유통: 발주 + 판매
"""

from .models import (
    TriggerType,
    ChainResult,
    LegacyTask,
    ChainAction,
    TriggerChain,
    TurnkeySolution,
    TurnkeyFramework,
)

from .builder import TurnkeyBuilder

from .templates import (
    INDUSTRY_TEMPLATES,
    create_education_turnkey,
    create_medical_turnkey,
    create_logistics_turnkey,
)

from .executor import TurnkeyExecutor

__all__ = [
    # Models
    "TriggerType",
    "ChainResult",
    "LegacyTask",
    "ChainAction",
    "TriggerChain",
    "TurnkeySolution",
    "TurnkeyFramework",
    # Builder
    "TurnkeyBuilder",
    # Templates
    "INDUSTRY_TEMPLATES",
    "create_education_turnkey",
    "create_medical_turnkey",
    "create_logistics_turnkey",
    # Executor
    "TurnkeyExecutor",
]
