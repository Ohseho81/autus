"""
AUTUS LangGraph 그래프 빌더
===========================

완전한 AUTUS 워크플로우 그래프

구조:
```
START
  ↓
fetch_user_data
  ↓
safety_guard
  ↓ (조건부)
  ├─ continue → fetch_coefficients → analysis_crew → fsd_laplace → END
  ├─ throttle → throttle_node → fetch_coefficients → ...
  ├─ human_escalation → human_escalation_node → END
  └─ halt → END
```
"""

import logging
import os
from datetime import datetime
from typing import Optional

from .state import AutusState, create_initial_state, SafetyRoute
from .nodes import (
    safety_guard_node,
    fetch_user_data_node,
    fetch_coefficients_node,
    analysis_crew_node,
    fsd_laplace_node,
    throttle_node,
    human_escalation_node,
)

logger = logging.getLogger(__name__)

# LangGraph 임포트 (선택적)
try:
    from langgraph.graph import StateGraph, END, START
    from langgraph.checkpoint.memory import MemorySaver
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logger.warning("LangGraph가 설치되지 않았습니다. pip install langgraph")


def route_after_safety(state: AutusState) -> str:
    """
    Safety Guard 후 라우팅 결정
    
    Args:
        state: 현재 상태
        
    Returns:
        str: 다음 노드 이름
    """
    route = state.get("safety_route", SafetyRoute.CONTINUE.value)
    
    if route == SafetyRoute.CONTINUE.value:
        return "fetch_coefficients"
    elif route == SafetyRoute.THROTTLE.value:
        return "throttle"
    elif route == SafetyRoute.HUMAN_ESCALATION.value:
        return "human_escalation"
    elif route == SafetyRoute.HALT.value:
        return "end"
    
    return "fetch_coefficients"


class AUTUSLangGraph:
    """AUTUS LangGraph 그래프 빌더"""
    
    def __init__(self, use_checkpointer: bool = True):
        """
        Args:
            use_checkpointer: 체크포인터 사용 여부
        """
        self.use_checkpointer = use_checkpointer
        self._graph = None
        self._checkpointer = None
        
        if LANGGRAPH_AVAILABLE:
            self._build_graph()
    
    def _build_graph(self):
        """LangGraph 그래프 빌드"""
        logger.info("🔧 LangGraph 그래프 빌드 중...")
        
        # StateGraph 생성
        workflow = StateGraph(AutusState)
        
        # ─────────────────────────────────────────────────────────────────────
        # 노드 추가
        # ─────────────────────────────────────────────────────────────────────
        workflow.add_node("fetch_user_data", fetch_user_data_node)
        workflow.add_node("safety_guard", safety_guard_node)
        workflow.add_node("fetch_coefficients", fetch_coefficients_node)
        workflow.add_node("analysis_crew", analysis_crew_node)
        workflow.add_node("fsd_laplace", fsd_laplace_node)
        workflow.add_node("throttle", throttle_node)
        workflow.add_node("human_escalation", human_escalation_node)
        
        # ─────────────────────────────────────────────────────────────────────
        # 엣지 추가
        # ─────────────────────────────────────────────────────────────────────
        # 시작 → 사용자 데이터 로드
        workflow.set_entry_point("fetch_user_data")
        
        # 사용자 데이터 → Safety Guard
        workflow.add_edge("fetch_user_data", "safety_guard")
        
        # Safety Guard → 조건부 라우팅
        workflow.add_conditional_edges(
            "safety_guard",
            route_after_safety,
            {
                "fetch_coefficients": "fetch_coefficients",
                "throttle": "throttle",
                "human_escalation": "human_escalation",
                "end": END,
            }
        )
        
        # Throttle → 계수 조회
        workflow.add_edge("throttle", "fetch_coefficients")
        
        # Human Escalation → 종료
        workflow.add_edge("human_escalation", END)
        
        # 메인 플로우
        workflow.add_edge("fetch_coefficients", "analysis_crew")
        workflow.add_edge("analysis_crew", "fsd_laplace")
        workflow.add_edge("fsd_laplace", END)
        
        # ─────────────────────────────────────────────────────────────────────
        # 컴파일
        # ─────────────────────────────────────────────────────────────────────
        if self.use_checkpointer:
            self._checkpointer = MemorySaver()
            self._graph = workflow.compile(checkpointer=self._checkpointer)
        else:
            self._graph = workflow.compile()
        
        logger.info("✅ LangGraph 그래프 빌드 완료")
    
    def invoke(
        self,
        user_id: str,
        goal: str,
        delta_s_dot: float = 0.4,
        inertia_debt: float = 0.35,
        config: Optional[dict] = None,
    ) -> AutusState:
        """
        워크플로우 실행
        
        Args:
            user_id: 사용자 ID
            goal: 목표
            delta_s_dot: 초기 ΔṠ
            inertia_debt: 초기 Inertia Debt
            config: LangGraph 설정
            
        Returns:
            AutusState: 최종 상태
        """
        if not LANGGRAPH_AVAILABLE or self._graph is None:
            return self._fallback_run(user_id, goal, delta_s_dot, inertia_debt)
        
        initial_state = create_initial_state(
            user_id=user_id,
            goal=goal,
            delta_s_dot=delta_s_dot,
            inertia_debt=inertia_debt,
        )
        
        # LangGraph 실행
        run_config = config or {}
        if self.use_checkpointer and "configurable" not in run_config:
            run_config["configurable"] = {"thread_id": initial_state["workflow_id"]}
        
        result = self._graph.invoke(initial_state, config=run_config)
        
        # 완료 시간 설정
        result["completed_at"] = datetime.now().isoformat()
        
        return result
    
    def _fallback_run(
        self,
        user_id: str,
        goal: str,
        delta_s_dot: float,
        inertia_debt: float,
    ) -> AutusState:
        """LangGraph 없이 실행 (폴백)"""
        logger.warning("LangGraph 사용 불가, 폴백 실행...")
        
        state = create_initial_state(user_id, goal, delta_s_dot, inertia_debt)
        
        # 순차 실행
        state.update(fetch_user_data_node(state))
        state.update(safety_guard_node(state))
        
        route = state.get("safety_route", SafetyRoute.CONTINUE.value)
        
        if route == SafetyRoute.THROTTLE.value:
            state.update(throttle_node(state))
        elif route == SafetyRoute.HUMAN_ESCALATION.value:
            state.update(human_escalation_node(state))
            state["completed_at"] = datetime.now().isoformat()
            return state
        elif route == SafetyRoute.HALT.value:
            state["completed_at"] = datetime.now().isoformat()
            return state
        
        state.update(fetch_coefficients_node(state))
        state.update(analysis_crew_node(state))
        state.update(fsd_laplace_node(state))
        
        state["completed_at"] = datetime.now().isoformat()
        return state
    
    def stream(
        self,
        user_id: str,
        goal: str,
        delta_s_dot: float = 0.4,
        inertia_debt: float = 0.35,
    ):
        """
        스트리밍 실행 (실시간 업데이트)
        
        Yields:
            dict: 노드 이름과 상태 업데이트
        """
        if not LANGGRAPH_AVAILABLE or self._graph is None:
            yield {"fallback": self._fallback_run(user_id, goal, delta_s_dot, inertia_debt)}
            return
        
        initial_state = create_initial_state(
            user_id=user_id,
            goal=goal,
            delta_s_dot=delta_s_dot,
            inertia_debt=inertia_debt,
        )
        
        config = {"configurable": {"thread_id": initial_state["workflow_id"]}}
        
        for event in self._graph.stream(initial_state, config=config):
            yield event
    
    def get_graph_visualization(self) -> Optional[bytes]:
        """그래프 시각화 (PNG)"""
        if not LANGGRAPH_AVAILABLE or self._graph is None:
            return None
        
        try:
            return self._graph.get_graph().draw_mermaid_png()
        except Exception as e:
            logger.warning(f"그래프 시각화 실패: {e}")
            return None


def create_autus_graph(use_checkpointer: bool = True) -> AUTUSLangGraph:
    """
    AUTUS LangGraph 생성 편의 함수
    
    Args:
        use_checkpointer: 체크포인터 사용 여부
        
    Returns:
        AUTUSLangGraph: 그래프 인스턴스
    """
    return AUTUSLangGraph(use_checkpointer=use_checkpointer)


def run_autus_workflow(
    user_id: str = "user_ohseho_001",
    goal: str = "HR 온보딩 프로세스 최적화",
    delta_s_dot: float = 0.4,
    inertia_debt: float = 0.35,
    verbose: bool = True,
) -> AutusState:
    """
    AUTUS 워크플로우 실행 편의 함수
    
    Args:
        user_id: 사용자 ID
        goal: 목표
        delta_s_dot: 초기 ΔṠ
        inertia_debt: 초기 Inertia Debt
        verbose: 상세 출력
        
    Returns:
        AutusState: 최종 상태
    """
    if verbose:
        logging.basicConfig(level=logging.INFO)
    
    graph = create_autus_graph()
    result = graph.invoke(user_id, goal, delta_s_dot, inertia_debt)
    
    if verbose:
        print_autus_result(result)
    
    return result


def print_autus_result(result: AutusState):
    """결과 출력"""
    print("\n" + "=" * 60)
    print("🏛️ AUTUS LangGraph 워크플로우 결과")
    print("=" * 60)
    
    # 사용자 정보
    user_type = result.get("user_type", {})
    print(f"\n👤 사용자: {user_type.get('name', 'Unknown')}")
    print(f"   위치: {user_type.get('location', 'Unknown')}")
    print(f"   MBTI: {user_type.get('mbti', 'Unknown')}")
    
    # 목표
    print(f"\n🎯 목표: {result.get('current_goal', '')}")
    
    # Safety 결과
    route = result.get("safety_route", "continue")
    route_icon = {"continue": "✅", "throttle": "⏳", "human_escalation": "🚨", "halt": "🛑"}
    print(f"\n{route_icon.get(route, '❓')} Safety: {route}")
    
    violations = result.get("safety_violations", [])
    if violations:
        print(f"   위반: {', '.join(violations)}")
    
    # 예측
    predicted = result.get("predicted_future", {})
    prob = predicted.get("success_probability", 0)
    uncertainty = predicted.get("uncertainty", 0)
    
    print(f"\n🔮 FSD 예측:")
    print(f"   성공 확률: {prob:.1%} (σ = ±{uncertainty:.1%})")
    
    # 마찰/시너지
    friction = predicted.get("friction_nodes", [])
    synergy = predicted.get("synergy_nodes", [])
    
    if friction:
        print(f"\n   ⚠️ 마찰: {', '.join(n.get('name', '') for n in friction)}")
    if synergy:
        print(f"   ✨ 시너지: {', '.join(n.get('name', '') for n in synergy)}")
    
    # 분석
    analysis = result.get("analysis_result", {})
    modules = analysis.get("recommended_modules", [])
    if modules:
        print(f"\n📦 추천 모듈: {', '.join(m.get('name', '') for m in modules[:3])}")
    
    effort = analysis.get("estimated_effort", {})
    if effort:
        print(f"⏱️ 예상 소요: {effort.get('days', '?')}일")
    
    print("\n" + "=" * 60)
