"""
AUTUS LangGraph API Router
==========================
Agentic Workflow 실행 및 모니터링 API

v7.0: TypeDB + Pinecone + DeepSeek-R1/Llama 3.3 + GRPO
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)

# Import from integrations (new unified module)
try:
    from ..integrations import (
        run_hybrid_workflow,
        LLMSelector,
        TaskType,
        TypeDBClient,
        PineconeClient,
    )
    INTEGRATIONS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Integrations not fully available: {e}")
    INTEGRATIONS_AVAILABLE = False

# Import from langgraph
try:
    from ..langgraph.workflow import AutusWorkflow, create_workflow
    from ..langgraph.state import WorkflowConfig
    LANGGRAPH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LangGraph workflow not available: {e}")
    LANGGRAPH_AVAILABLE = False
    
    # Fallback classes
    class WorkflowConfig:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    
    class AutusWorkflow:
        async def run(self, **kwargs):
            return {"status": "mock", "message": "LangGraph not installed"}
    
    def create_workflow(config=None):
        return AutusWorkflow()


router = APIRouter(prefix="/api/langgraph", tags=["LangGraph"])


# ============================================================
# Models
# ============================================================

class WorkflowCreateRequest(BaseModel):
    """워크플로우 생성 요청"""
    user_k_scale: Literal["K2", "K4", "K6", "K10"] = "K2"
    user_constants: dict | None = None
    data_sources: list[str] = Field(default=["calendar", "email", "slack"])
    max_iterations: int = Field(default=1, ge=1, le=100)
    
    # Safety config
    delta_s_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    inertia_debt_threshold: float = Field(default=5.0, ge=0.0, le=10.0)


class WorkflowResponse(BaseModel):
    """워크플로우 응답"""
    workflow_id: str
    status: str
    current_stage: str
    metrics: dict
    messages: list
    started_at: str
    completed_at: str | None = None


class WorkflowStatusResponse(BaseModel):
    """워크플로우 상태 응답"""
    workflow_id: str
    status: str
    current_stage: str
    loop_count: int
    delta_s_dot: float
    inertia_debt: float
    gate_result: str
    safety_status: str


# ============================================================
# In-Memory Storage (for demo)
# ============================================================

workflows: dict[str, dict] = {}


# ============================================================
# Endpoints
# ============================================================

@router.post("/workflows", response_model=WorkflowResponse)
async def create_and_run_workflow(
    request: WorkflowCreateRequest,
    background_tasks: BackgroundTasks,
):
    """
    새 워크플로우 생성 및 실행
    
    LangGraph 기반 5단계 순환 워크플로우:
    Collection → Analysis → Automation → Deletion → Feedback
    """
    
    workflow_id = f"wf_{uuid.uuid4().hex[:12]}"
    
    # Config 생성
    config = WorkflowConfig(
        delta_s_threshold=request.delta_s_threshold,
        inertia_debt_threshold=request.inertia_debt_threshold,
        max_loop_count=request.max_iterations,
    )
    
    # 워크플로우 생성
    workflow = create_workflow(config)
    
    # 초기 상태 저장
    workflows[workflow_id] = {
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "request": request.model_dump(),
        "state": None,
    }
    
    # 백그라운드 실행
    background_tasks.add_task(
        run_workflow_task,
        workflow_id,
        workflow,
        request,
    )
    
    return WorkflowResponse(
        workflow_id=workflow_id,
        status="running",
        current_stage="collection",
        metrics={
            "delta_s_dot": 0.0,
            "inertia_debt": 0.0,
            "loop_count": 0,
        },
        messages=[{"role": "system", "content": "워크플로우 시작됨"}],
        started_at=workflows[workflow_id]["started_at"],
    )


async def run_workflow_task(
    workflow_id: str,
    workflow: AutusWorkflow,
    request: WorkflowCreateRequest,
):
    """백그라운드 워크플로우 실행"""
    try:
        final_state = await workflow.run(
            workflow_id=workflow_id,
            user_k_scale=request.user_k_scale,
            user_constants=request.user_constants,
            max_iterations=request.max_iterations,
        )
        
        workflows[workflow_id].update({
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "state": final_state,
        })
        
    except Exception as e:
        workflows[workflow_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.now().isoformat(),
        })


@router.get("/workflows/{workflow_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(workflow_id: str):
    """워크플로우 상태 조회"""
    
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf = workflows[workflow_id]
    state = wf.get("state", {}) or {}
    
    return WorkflowStatusResponse(
        workflow_id=workflow_id,
        status=wf["status"],
        current_stage=state.get("current_stage", "unknown"),
        loop_count=state.get("loop_count", 0),
        delta_s_dot=state.get("delta_s_dot", 0.0),
        inertia_debt=state.get("inertia_debt", 0.0),
        gate_result=state.get("gate_result", "PASS"),
        safety_status=state.get("safety_status", "continue"),
    )


@router.get("/workflows/{workflow_id}/logs")
async def get_workflow_logs(workflow_id: str):
    """워크플로우 로그 조회"""
    
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf = workflows[workflow_id]
    state = wf.get("state", {}) or {}
    
    return {
        "workflow_id": workflow_id,
        "messages": state.get("messages", []),
        "execution_logs": state.get("execution_logs", []),
    }


@router.delete("/workflows/{workflow_id}")
async def cancel_workflow(workflow_id: str):
    """워크플로우 취소"""
    
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflows[workflow_id]["status"] = "cancelled"
    
    return {"message": "Workflow cancelled", "workflow_id": workflow_id}


@router.get("/workflows")
async def list_workflows(
    status: str | None = None,
    limit: int = 20,
):
    """워크플로우 목록 조회"""
    
    result = []
    for wf_id, wf in workflows.items():
        if status and wf["status"] != status:
            continue
        
        result.append({
            "workflow_id": wf_id,
            "status": wf["status"],
            "started_at": wf["started_at"],
            "completed_at": wf.get("completed_at"),
        })
    
    return {
        "workflows": result[-limit:],
        "total": len(result),
    }


# ============================================================
# Graph Visualization
# ============================================================

@router.get("/graph/dot")
async def get_graph_dot():
    """LangGraph DOT 포맷 내보내기"""
    
    from ..langgraph.workflow import export_graph_viz
    
    workflow = create_workflow()
    dot = export_graph_viz(workflow)
    
    return {
        "format": "dot",
        "content": dot,
    }


@router.get("/graph/nodes")
async def get_graph_nodes():
    """그래프 노드 정보"""
    
    return {
        "nodes": [
            {"id": "collection", "label": "📥 Collection", "type": "stage"},
            {"id": "analysis", "label": "🔍 Analysis", "type": "stage"},
            {"id": "planning", "label": "📋 Planning", "type": "stage"},
            {"id": "safety_check", "label": "🛡️ Safety Check", "type": "guard"},
            {"id": "execution", "label": "🤖 Execution", "type": "stage"},
            {"id": "deletion", "label": "🗑️ Deletion", "type": "stage"},
            {"id": "feedback", "label": "📊 Feedback", "type": "stage"},
            {"id": "throttle", "label": "⏳ Throttle", "type": "control"},
            {"id": "human_escalation", "label": "👤 Human Escalation", "type": "control"},
            {"id": "halt", "label": "🛑 HALT", "type": "terminal"},
        ],
        "edges": [
            {"from": "collection", "to": "analysis"},
            {"from": "analysis", "to": "planning"},
            {"from": "planning", "to": "safety_check"},
            {"from": "safety_check", "to": "execution", "condition": "PASS/RING"},
            {"from": "safety_check", "to": "throttle", "condition": "BOUNCE"},
            {"from": "safety_check", "to": "human_escalation", "condition": "ΔṠ > 0.7"},
            {"from": "safety_check", "to": "halt", "condition": "LOCK"},
            {"from": "throttle", "to": "execution"},
            {"from": "execution", "to": "deletion"},
            {"from": "deletion", "to": "feedback"},
            {"from": "feedback", "to": "collection", "condition": "Loop"},
        ],
    }


# ============================================================
# v7.0 Hybrid Workflow (TypeDB + Pinecone + LLM)
# ============================================================

class HybridWorkflowRequest(BaseModel):
    """하이브리드 워크플로우 요청"""
    user_id: str = "user_ohseho_001"
    goal: str = "HR 온보딩 프로세스 최적화"


class HybridWorkflowResponse(BaseModel):
    """하이브리드 워크플로우 응답"""
    success: bool
    safety_route: str
    coefficients: Optional[dict] = None
    report: Optional[str] = None
    messages: list[str] = []


@router.post("/hybrid", response_model=HybridWorkflowResponse)
async def run_hybrid(request: HybridWorkflowRequest):
    """
    하이브리드 워크플로우 실행
    
    TypeDB (그래프 추론) + Pinecone (벡터 검색) + LLM (DeepSeek/Llama) 통합
    """
    # Mock 모드에서도 동작
    if not INTEGRATIONS_AVAILABLE:
        import random
        # Mock 응답 생성
        mock_coefficients = {
            "K": round(random.uniform(0.4, 0.8), 3),
            "I": round(random.uniform(0.3, 0.7), 3),
            "r": round(random.uniform(-0.1, 0.1), 3),
            "delta_s_dot": round(random.uniform(0.1, 0.5), 3),
            "inertia_debt": round(random.uniform(0.0, 2.0), 3),
        }
        
        return HybridWorkflowResponse(
            success=True,
            safety_route="PASS",
            coefficients=mock_coefficients,
            report=f"[MOCK] 목표 '{request.goal}' 분석 완료. 사용자 {request.user_id}의 K/I 계수 기반 최적화 권장.",
            messages=[
                "📥 데이터 수집 완료 (Mock)",
                "🔍 TypeDB 계수 조회 완료",
                "🔎 Pinecone 유사 사례 검색 완료",
                "🤖 LLM 분석 완료",
                "🛡️ Safety Guard: PASS",
                "✅ 워크플로우 완료",
            ],
        )
    
    try:
        result = run_hybrid_workflow(
            user_id=request.user_id,
            goal=request.goal,
            verbose=False,
        )
        
        return HybridWorkflowResponse(
            success=result.get("success", False),
            safety_route=result.get("safety_route", "unknown"),
            coefficients=result.get("typedb_coefficients"),
            report=result.get("final_report"),
            messages=result.get("messages", []),
        )
    except Exception as e:
        logger.error(f"Hybrid workflow error: {e}")
        raise HTTPException(500, str(e))


@router.get("/integrations/status")
async def get_integrations_status():
    """통합 모듈 상태 확인"""
    
    status = {
        "integrations_available": INTEGRATIONS_AVAILABLE,
        "langgraph_available": LANGGRAPH_AVAILABLE,
        "typedb": {"connected": False, "mock_mode": True},
        "pinecone": {"connected": False, "mock_mode": True},
        "llm": {"available_providers": []},
    }
    
    if INTEGRATIONS_AVAILABLE:
        try:
            # TypeDB 상태
            client = TypeDBClient()
            client.connect()
            status["typedb"]["mock_mode"] = client._use_mock
            status["typedb"]["connected"] = True
            client.close()
        except Exception as e:
            status["typedb"]["error"] = str(e)
        
        try:
            # Pinecone 상태
            pc = PineconeClient()
            pc.connect()
            status["pinecone"]["mock_mode"] = pc._use_mock
            status["pinecone"]["connected"] = True
            status["pinecone"]["stats"] = pc.get_stats()
        except Exception as e:
            status["pinecone"]["error"] = str(e)
        
        try:
            # LLM 상태
            selector = LLMSelector()
            status["llm"]["available_providers"] = selector.get_available_providers()
        except Exception as e:
            status["llm"]["error"] = str(e)
    
    return status
