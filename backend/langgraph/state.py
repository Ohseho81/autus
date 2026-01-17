"""
AUTUS LangGraph 상태 정의
=========================

AutusState: 상수·계수·타입 통합 상태

2026년 LangGraph 1.0+ 기준:
- TypedDict 기반 상태
- Annotated 메시지 리스트
- Literal 타입 라우팅
"""

from typing import TypedDict, Annotated, Literal, Optional, Any
from datetime import datetime
from enum import Enum


class SafetyRoute(str, Enum):
    """Safety Guard 라우팅 결과"""
    CONTINUE = "continue"
    THROTTLE = "throttle"
    HUMAN_ESCALATION = "human_escalation"
    HALT = "halt"


class AutusState(TypedDict, total=False):
    """
    AUTUS 통합 상태
    
    LangGraph 워크플로우 전체에서 공유되는 상태
    
    Attributes:
        # 기본 정보
        user_id: 사용자 ID
        current_goal: 현재 목표
        
        # 사용자 타입 (현실 고증 JSON)
        user_type: dict
            - name: str
            - location: str (city, country)
            - mbti: str
            - occupation: str
            - preferences: dict
        
        # 사용자 상수 (피드백 누적)
        user_constants: dict
            - stability_score: float (0-1)
            - inertia_debt: float (0-1)
            - feedback_count: int
            - success_rate: float
        
        # 사용자 계수 (Neo4j GDS 계산)
        user_coefficients: dict
            - connectivity_density: float (degree / 12)
            - influence_score: float (PageRank)
            - value_flow_rate: float
            - betweenness_centrality: float
        
        # 물리 메트릭
        delta_s_dot: 엔트로피 변화율
        inertia_debt: Inertia Debt 현재값
        stability_score: 안정성 점수
        scale_lock_violated: Scale Lock 위반 여부
        
        # Safety Guard
        safety_route: 라우팅 결과
        safety_violations: 위반 목록
        safety_warnings: 경고 목록
        
        # 예측 결과
        predicted_future: dict
            - success_probability: float
            - uncertainty: float
            - friction_nodes: list[dict]
            - synergy_nodes: list[dict]
            - forecast: list[float]
        
        # 분석 결과
        analysis_result: dict
            - goal_parsed: dict
            - recommended_modules: list[dict]
            - estimated_effort: dict
        
        # 메타데이터
        messages: 메시지 히스토리
        created_at: 생성 시간
        completed_at: 완료 시간
        workflow_id: 워크플로우 ID
        errors: 에러 목록
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # 기본 정보
    # ─────────────────────────────────────────────────────────────────────────
    user_id: str
    current_goal: str
    
    # ─────────────────────────────────────────────────────────────────────────
    # 사용자 데이터 (3요소)
    # ─────────────────────────────────────────────────────────────────────────
    user_type: dict         # 현실 고증 JSON
    user_constants: dict    # 피드백 누적
    user_coefficients: dict # Neo4j GDS 계산
    
    # ─────────────────────────────────────────────────────────────────────────
    # 물리 메트릭
    # ─────────────────────────────────────────────────────────────────────────
    delta_s_dot: float
    inertia_debt: float
    stability_score: float
    scale_lock_violated: bool
    
    # ─────────────────────────────────────────────────────────────────────────
    # Safety Guard
    # ─────────────────────────────────────────────────────────────────────────
    safety_route: Optional[Literal["continue", "throttle", "human_escalation", "halt"]]
    safety_violations: list
    safety_warnings: list
    
    # ─────────────────────────────────────────────────────────────────────────
    # 예측 결과
    # ─────────────────────────────────────────────────────────────────────────
    predicted_future: dict
    
    # ─────────────────────────────────────────────────────────────────────────
    # 분석 결과
    # ─────────────────────────────────────────────────────────────────────────
    analysis_result: dict
    
    # ─────────────────────────────────────────────────────────────────────────
    # 메시지 (LangGraph 표준)
    # ─────────────────────────────────────────────────────────────────────────
    messages: Annotated[list, "add_messages"]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 메타데이터
    # ─────────────────────────────────────────────────────────────────────────
    created_at: str
    completed_at: str
    workflow_id: str
    errors: list


def create_initial_state(
    user_id: str,
    goal: str,
    delta_s_dot: float = 0.4,
    inertia_debt: float = 0.35,
) -> AutusState:
    """
    초기 상태 생성
    
    Args:
        user_id: 사용자 ID
        goal: 목표
        delta_s_dot: 초기 ΔṠ
        inertia_debt: 초기 Inertia Debt
        
    Returns:
        AutusState: 초기화된 상태
    """
    import uuid
    
    return AutusState(
        user_id=user_id,
        current_goal=goal,
        user_type={},
        user_constants={},
        user_coefficients={},
        delta_s_dot=delta_s_dot,
        inertia_debt=inertia_debt,
        stability_score=0.75,
        scale_lock_violated=False,
        safety_route=None,
        safety_violations=[],
        safety_warnings=[],
        predicted_future={},
        analysis_result={},
        messages=[],
        created_at=datetime.now().isoformat(),
        completed_at="",
        workflow_id=str(uuid.uuid4())[:8],
        errors=[],
    )
