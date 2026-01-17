"""
AUTUS LangGraph Workflow
========================
5-Stage Agentic Workflow with Safety Guards
Collection → Analysis → Automation → Deletion → Feedback (Loop)
"""

from typing import Annotated, Literal
from datetime import datetime
import asyncio

# LangGraph imports (graceful fallback if not installed)
try:
    from langgraph.graph import StateGraph, START, END
    from langgraph.checkpoint.memory import MemorySaver
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    StateGraph = None
    START = "start"
    END = "end"
    MemorySaver = None

from .state import AutusState, create_initial_state, WorkflowConfig, SafetyStatus
from .agents import (
    CollectorAgent,
    AnalyzerAgent,
    PlannerAgent,
    ExecutorAgent,
    DeleterAgent,
    FeedbackAgent,
)
from .safety import SafetyGuard, check_safety, get_next_node


class AutusWorkflow:
    """
    AUTUS Agentic Workflow
    ======================
    LangGraph 기반 5단계 순환 워크플로우
    """
    
    def __init__(self, config: WorkflowConfig | None = None):
        self.config = config or WorkflowConfig()
        
        # 에이전트 초기화
        self.collector = CollectorAgent()
        self.analyzer = AnalyzerAgent()
        self.planner = PlannerAgent()
        self.executor = ExecutorAgent()
        self.deleter = DeleterAgent()
        self.feedback = FeedbackAgent()
        self.safety = SafetyGuard(self.config)
        
        # LangGraph 컴파일
        self.graph = self._build_graph() if LANGGRAPH_AVAILABLE else None
    
    def _build_graph(self):
        """LangGraph StateGraph 구축"""
        
        if not LANGGRAPH_AVAILABLE:
            return None
        
        # StateGraph 생성
        workflow = StateGraph(AutusState)
        
        # 노드 추가
        workflow.add_node("collection", self._collection_node)
        workflow.add_node("analysis", self._analysis_node)
        workflow.add_node("planning", self._planning_node)
        workflow.add_node("safety_check", self._safety_node)
        workflow.add_node("execution", self._execution_node)
        workflow.add_node("deletion", self._deletion_node)
        workflow.add_node("feedback", self._feedback_node)
        workflow.add_node("throttle", self._throttle_node)
        workflow.add_node("human_escalation", self._human_escalation_node)
        workflow.add_node("halt", self._halt_node)
        
        # 엣지 추가
        workflow.add_edge(START, "collection")
        workflow.add_edge("collection", "analysis")
        workflow.add_edge("analysis", "planning")
        workflow.add_edge("planning", "safety_check")
        
        # 조건부 엣지 (Safety 결과에 따라)
        workflow.add_conditional_edges(
            "safety_check",
            get_next_node,
            {
                "continue": "execution",
                "throttle": "throttle",
                "human_escalation": "human_escalation",
                "halt": "halt",
            }
        )
        
        workflow.add_edge("throttle", "execution")
        workflow.add_edge("execution", "deletion")
        workflow.add_edge("deletion", "feedback")
        
        # 피드백 후 조건부 루프
        workflow.add_conditional_edges(
            "feedback",
            self._should_continue,
            {
                "continue": "collection",
                "end": END,
            }
        )
        
        workflow.add_edge("human_escalation", END)
        workflow.add_edge("halt", END)
        
        # 컴파일
        checkpointer = MemorySaver()
        return workflow.compile(checkpointer=checkpointer)
    
    # === 노드 함수들 ===
    
    async def _collection_node(self, state: AutusState) -> dict:
        """Collection 노드"""
        return await self.collector.run(state)
    
    async def _analysis_node(self, state: AutusState) -> dict:
        """Analysis 노드"""
        return await self.analyzer.run(state)
    
    async def _planning_node(self, state: AutusState) -> dict:
        """Planning 노드"""
        return await self.planner.run(state)
    
    async def _safety_node(self, state: AutusState) -> dict:
        """Safety Check 노드"""
        return check_safety(state, self.config)
    
    async def _execution_node(self, state: AutusState) -> dict:
        """Execution 노드"""
        return await self.executor.run(state)
    
    async def _deletion_node(self, state: AutusState) -> dict:
        """Deletion 노드"""
        return await self.deleter.run(state)
    
    async def _feedback_node(self, state: AutusState) -> dict:
        """Feedback 노드"""
        return await self.feedback.run(state)
    
    async def _throttle_node(self, state: AutusState) -> dict:
        """Throttle 노드 (속도 제한)"""
        cooldown = state.get("cooldown_remaining", 30)
        await asyncio.sleep(min(cooldown, 5))  # 최대 5초 대기
        return {
            "messages": [{
                "role": "system",
                "content": f"[Throttle] {cooldown}초 대기 후 진행",
            }],
        }
    
    async def _human_escalation_node(self, state: AutusState) -> dict:
        """Human Escalation 노드"""
        return {
            "messages": [{
                "role": "system",
                "content": f"[Escalation] 인간 개입 필요: {state.get('escalation_reason', 'Unknown')}",
            }],
        }
    
    async def _halt_node(self, state: AutusState) -> dict:
        """Halt 노드 (완전 정지)"""
        return {
            "messages": [{
                "role": "system",
                "content": f"[HALT] 워크플로우 중단: {state.get('escalation_reason', 'Safety limit reached')}",
            }],
        }
    
    def _should_continue(self, state: AutusState) -> Literal["continue", "end"]:
        """루프 계속 여부 결정"""
        loop_count = state.get("loop_count", 0)
        safety_status = state.get("safety_status", "continue")
        
        if safety_status in [SafetyStatus.HALT.value, SafetyStatus.HUMAN_ESCALATION.value]:
            return "end"
        
        if loop_count >= self.config.max_loop_count:
            return "end"
        
        return "continue"
    
    # === 실행 메서드 ===
    
    async def run(
        self,
        workflow_id: str,
        user_k_scale: str = "K2",
        user_constants: dict | None = None,
        max_iterations: int = 1,
    ) -> AutusState:
        """
        워크플로우 실행
        
        Args:
            workflow_id: 워크플로우 ID
            user_k_scale: 사용자 K-Scale (K2, K4, K6, K10)
            user_constants: 사용자 상수 (K, Ψ, I, S, R)
            max_iterations: 최대 반복 횟수
        
        Returns:
            최종 상태
        """
        
        # 초기 상태 생성
        initial_state = create_initial_state(
            workflow_id=workflow_id,
            user_k_scale=user_k_scale,
            user_constants=user_constants,
        )
        
        if self.graph:
            # LangGraph 사용
            config = {"configurable": {"thread_id": workflow_id}}
            
            final_state = None
            async for event in self.graph.astream(initial_state, config):
                final_state = event
                # 스트리밍 이벤트 처리 가능
            
            return final_state
        else:
            # Fallback: 수동 실행
            return await self._run_manual(initial_state, max_iterations)
    
    async def _run_manual(self, state: AutusState, max_iterations: int) -> AutusState:
        """LangGraph 없이 수동 실행"""
        
        for i in range(max_iterations):
            # Collection
            state = {**state, **(await self.collector.run(state))}
            
            # Analysis
            state = {**state, **(await self.analyzer.run(state))}
            
            # Planning
            state = {**state, **(await self.planner.run(state))}
            
            # Safety Check
            safety_result = check_safety(state, self.config)
            state = {**state, **safety_result}
            
            if state.get("safety_status") == SafetyStatus.HALT.value:
                break
            
            # Execution
            state = {**state, **(await self.executor.run(state))}
            
            # Deletion
            state = {**state, **(await self.deleter.run(state))}
            
            # Feedback
            state = {**state, **(await self.feedback.run(state))}
        
        return state


def create_workflow(config: WorkflowConfig | None = None) -> AutusWorkflow:
    """워크플로우 팩토리"""
    return AutusWorkflow(config)


# === Visualization Export ===

def export_graph_viz(workflow: AutusWorkflow) -> str:
    """Graphviz DOT 포맷으로 내보내기"""
    
    dot = """
digraph AutusWorkflow {
    rankdir=TB;
    node [shape=box, style="rounded,filled", fontname="Arial"];
    
    // Stages
    collection [label="📥 Collection", fillcolor="#fef3c7"];
    analysis [label="🔍 Analysis", fillcolor="#d1fae5"];
    planning [label="📋 Planning", fillcolor="#dbeafe"];
    safety_check [label="🛡️ Safety Check", fillcolor="#fce7f3"];
    execution [label="🤖 Execution", fillcolor="#e0e7ff"];
    deletion [label="🗑️ Deletion", fillcolor="#fee2e2"];
    feedback [label="📊 Feedback", fillcolor="#f3e8ff"];
    
    // Control nodes
    throttle [label="⏳ Throttle", fillcolor="#fef9c3"];
    human_escalation [label="👤 Human Escalation", fillcolor="#fed7aa"];
    halt [label="🛑 HALT", fillcolor="#fecaca"];
    
    // Edges
    collection -> analysis;
    analysis -> planning;
    planning -> safety_check;
    
    safety_check -> execution [label="PASS/RING"];
    safety_check -> throttle [label="BOUNCE"];
    safety_check -> human_escalation [label="ΔṠ > 0.7"];
    safety_check -> halt [label="LOCK"];
    
    throttle -> execution;
    execution -> deletion;
    deletion -> feedback;
    feedback -> collection [label="Loop", style=dashed];
}
"""
    return dot
