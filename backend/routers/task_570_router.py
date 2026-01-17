"""
AUTUS 570개 업무 솔루션 엔진 API 라우터
K/I/Ω 물리 엔진 기반 업무 자동화 API
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Path, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import hashlib


# =============================================================================
# 라우터 설정
# =============================================================================

router = APIRouter(
    prefix="/v2/tasks",
    tags=["570 Tasks Engine"],
    responses={404: {"description": "Not found"}}
)


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class TaskGroup(str, Enum):
    HIGH_REPEAT_STRUCTURED = "고반복_정형"
    SEMI_STRUCTURED_DOC = "반구조화_문서"
    APPROVAL_WORKFLOW = "승인_워크플로"
    CUSTOMER_SALES = "고객_영업"
    FINANCE_ACCOUNTING = "재무_회계"
    HR_PERSONNEL = "HR_인사"
    IT_OPERATIONS = "IT_운영"
    STRATEGY_JUDGMENT = "전략_판단"


class TaskLayer(str, Enum):
    COMMON_ENGINE = "공통엔진"
    DOMAIN_LOGIC = "도메인로직"
    EDGE_CONNECTOR = "엣지커넥터"


class TaskStatus(str, Enum):
    ACTIVE = "active"
    OPTIMIZING = "optimizing"
    DECLINING = "declining"
    ELIMINATED = "eliminated"


class TriggerType(str, Enum):
    TIME_BASED = "time"
    EVENT_BASED = "event"
    CONDITION_BASED = "condition"
    MANUAL = "manual"


# Request/Response Models
class TypeParameterModel(BaseModel):
    type_code: str
    type_name: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    thresholds: dict[str, float] = Field(default_factory=dict)


class PhysicsMetricsModel(BaseModel):
    k_efficiency: float = Field(1.0, ge=0, le=3, description="효율 지표")
    i_interaction: float = Field(0.0, ge=-1, le=1, description="상호작용 강도")
    omega_entropy: float = Field(0.5, ge=0, le=1, description="엔트로피")
    timestamp: datetime = Field(default_factory=datetime.now)
    
    @property
    def health_score(self) -> float:
        k_score = min(self.k_efficiency / 2, 1) * 40
        i_score = (self.i_interaction + 1) / 2 * 30
        o_score = (1 - self.omega_entropy) * 30
        return k_score + i_score + o_score


class TaskRegistrationRequest(BaseModel):
    task_id: str
    task_name: str
    task_name_en: str
    group: str
    layer: str
    types: list[dict] = Field(default_factory=list)
    trigger_type: str = "event"
    trigger_conditions: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    current_metrics: dict = Field(default_factory=dict)


class TaskExecutionRequest(BaseModel):
    task_id: str
    type_code: str
    input_data: dict = Field(default_factory=dict)
    context: dict = Field(default_factory=dict)
    async_mode: bool = False


class TaskExecutionResponse(BaseModel):
    execution_id: str
    task_id: str
    success: bool
    status: str
    output_data: dict = Field(default_factory=dict)
    metrics: Optional[PhysicsMetricsModel] = None
    duration_ms: float = 0
    timestamp: datetime = Field(default_factory=datetime.now)


class WorkflowStartRequest(BaseModel):
    workflow_type: str
    data: dict = Field(default_factory=dict)
    requester: str = ""


class WorkflowActionRequest(BaseModel):
    workflow_id: str
    action: str  # approve, reject, escalate
    comment: str = ""
    approver: str = ""


class EngineCallRequest(BaseModel):
    engine_name: str
    input_data: dict = Field(default_factory=dict)


class MetricsUpdateRequest(BaseModel):
    task_id: str
    actual_output: float = 1.0
    expected_output: float = 1.0
    resource_input: float = 1.0
    time_input: float = 1.0
    response_rate: float = 0.5
    cycle_time: float = 1.0
    collaboration_score: float = 0.0
    error_count: int = 0
    backlog_count: int = 0
    rework_count: int = 0
    total_volume: int = 1


class DashboardResponse(BaseModel):
    total_tasks: int
    by_status: dict[str, int]
    by_group: dict[str, int]
    by_layer: dict[str, int]
    avg_metrics: dict[str, float]
    health_distribution: dict[str, int]
    recent_executions: list[dict]
    alerts: list[dict]


# =============================================================================
# IN-MEMORY STORAGE
# =============================================================================

class InMemoryStorage:
    """인메모리 저장소"""
    
    def __init__(self):
        self.tasks: dict[str, dict] = {}
        self.pipelines: dict[str, dict] = {}
        self.executions: list[dict] = []
        self.workflows: dict[str, dict] = {}
        self.metrics_history: dict[str, list] = {}
        self.alerts: list[dict] = []
        self.sse_subscribers: list[asyncio.Queue] = []
    
    def add_task(self, task: dict):
        self.tasks[task["task_id"]] = task
    
    def get_task(self, task_id: str) -> Optional[dict]:
        return self.tasks.get(task_id)
    
    def add_execution(self, execution: dict):
        self.executions.append(execution)
        if len(self.executions) > 1000:
            self.executions = self.executions[-1000:]
    
    def add_alert(self, alert: dict):
        self.alerts.append(alert)
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]
    
    async def broadcast_sse(self, event: str, data: dict):
        message = {"event": event, "data": data, "timestamp": datetime.now().isoformat()}
        for queue in self.sse_subscribers:
            await queue.put(message)


storage = InMemoryStorage()


# =============================================================================
# MOCK ENGINES
# =============================================================================

class MockPhysicsEngine:
    """물리 엔진 Mock"""
    
    def calculate_k(self, actual: float, expected: float, resource: float, time: float) -> float:
        if expected == 0 or resource == 0 or time == 0:
            return 1.0
        import math
        output_ratio = actual / expected
        k = output_ratio * math.sqrt(1 / (resource * time + 0.01))
        return max(0.1, min(3.0, k))
    
    def calculate_i(self, response_rate: float, cycle_time: float, collab: float) -> float:
        time_factor = 1 / (cycle_time + 1)
        i = (response_rate * 0.4 + time_factor * 0.3 + (collab + 1) / 2 * 0.3) * 2 - 1
        return max(-1.0, min(1.0, i))
    
    def calculate_omega(self, errors: int, backlog: int, rework: int, total: int) -> float:
        if total == 0:
            return 0.5
        omega = (errors / total * 0.4 + backlog / (total + 1) * 0.35 + rework / total * 0.25)
        return max(0.0, min(1.0, omega))


class MockTaskEngine:
    """태스크 엔진 Mock"""
    
    def __init__(self):
        self.physics = MockPhysicsEngine()
    
    async def execute_task(self, task_id: str, type_code: str, input_data: dict) -> dict:
        import random
        
        execution_id = hashlib.md5(f"{task_id}{datetime.now()}".encode()).hexdigest()[:12]
        await asyncio.sleep(random.uniform(0.1, 0.5))
        success = random.random() > 0.1
        
        return {
            "execution_id": execution_id,
            "task_id": task_id,
            "type_code": type_code,
            "success": success,
            "status": "completed" if success else "failed",
            "output_data": {"processed": True, "result": "Sample output"} if success else {"error": "Simulated failure"},
            "duration_ms": random.uniform(100, 2000),
            "timestamp": datetime.now().isoformat()
        }


class MockWorkflowEngine:
    """워크플로 엔진 Mock"""
    
    async def start_workflow(self, workflow_type: str, data: dict) -> dict:
        workflow_id = hashlib.md5(f"{workflow_type}{datetime.now()}".encode()).hexdigest()[:12]
        value = data.get("value", 0)
        
        if value < 500:
            steps = ["auto"]
            sla = 24
        elif value < 5000:
            steps = ["manager"]
            sla = 48
        else:
            steps = ["manager", "director"]
            sla = 72
        
        workflow = {
            "workflow_id": workflow_id,
            "type": workflow_type,
            "status": "pending",
            "current_step": 0,
            "steps": steps,
            "data": data,
            "created_at": datetime.now().isoformat(),
            "sla_hours": sla
        }
        
        storage.workflows[workflow_id] = workflow
        return workflow
    
    async def process_action(self, workflow_id: str, action: str, comment: str) -> dict:
        workflow = storage.workflows.get(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        if action == "approve":
            workflow["current_step"] += 1
            if workflow["current_step"] >= len(workflow["steps"]):
                workflow["status"] = "approved"
            else:
                workflow["status"] = "pending"
        elif action == "reject":
            workflow["status"] = "rejected"
            workflow["rejection_reason"] = comment
        elif action == "escalate":
            workflow["status"] = "escalated"
        
        return workflow


# 엔진 인스턴스
physics_engine = MockPhysicsEngine()
task_engine = MockTaskEngine()
workflow_engine = MockWorkflowEngine()


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def _calculate_health_score(metrics: dict) -> float:
    k = metrics.get("k_efficiency", 1.0)
    i = metrics.get("i_interaction", 0.0)
    omega = metrics.get("omega_entropy", 0.5)
    
    k_score = min(k / 2, 1) * 40
    i_score = (i + 1) / 2 * 30
    o_score = (1 - omega) * 30
    
    return round(k_score + i_score + o_score, 2)


def _determine_status(metrics: dict) -> str:
    k = metrics.get("k_efficiency", 1.0)
    omega = metrics.get("omega_entropy", 0.5)
    
    if k < 0.3 or omega > 0.8:
        return "eliminated"
    elif k < 0.7:
        return "declining"
    elif k < 1.0:
        return "optimizing"
    return "active"


# =============================================================================
# API ENDPOINTS
# =============================================================================

# Health & Info
@router.get("/info")
async def get_info():
    """시스템 정보"""
    return {
        "total_tasks": len(storage.tasks),
        "total_executions": len(storage.executions),
        "active_workflows": len([w for w in storage.workflows.values() if w["status"] == "pending"]),
        "groups": [g.value for g in TaskGroup],
        "layers": [l.value for l in TaskLayer]
    }


# Task Management
@router.get("/")
async def list_tasks(
    group: Optional[str] = Query(None, description="그룹 필터"),
    layer: Optional[str] = Query(None, description="레이어 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """업무 목록 조회"""
    tasks = list(storage.tasks.values())
    
    if group:
        tasks = [t for t in tasks if t.get("group") == group]
    if layer:
        tasks = [t for t in tasks if t.get("layer") == layer]
    if status:
        tasks = [t for t in tasks if t.get("metrics", {}).get("status") == status]
    
    total = len(tasks)
    tasks = tasks[offset:offset + limit]
    
    return {"total": total, "limit": limit, "offset": offset, "tasks": tasks}


@router.get("/{task_id}")
async def get_task(task_id: str = Path(..., description="업무 ID")):
    """업무 상세 조회"""
    task = storage.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/")
async def register_task(request: TaskRegistrationRequest):
    """업무 등록"""
    task = {
        "task_id": request.task_id,
        "task_name": request.task_name,
        "task_name_en": request.task_name_en,
        "group": request.group,
        "layer": request.layer,
        "types": request.types,
        "trigger_type": request.trigger_type,
        "trigger_conditions": request.trigger_conditions,
        "inputs": request.inputs,
        "outputs": request.outputs,
        "metrics": {
            "k_efficiency": 1.0,
            "i_interaction": 0.0,
            "omega_entropy": 0.5,
            "status": "active"
        },
        "created_at": datetime.now().isoformat()
    }
    
    storage.add_task(task)
    await storage.broadcast_sse("task_registered", {"task_id": request.task_id})
    
    return {"status": "registered", "task": task}


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """업무 삭제"""
    if task_id not in storage.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del storage.tasks[task_id]
    await storage.broadcast_sse("task_deleted", {"task_id": task_id})
    
    return {"status": "deleted", "task_id": task_id}


@router.post("/bulk")
async def bulk_register_tasks(tasks: list[TaskRegistrationRequest]):
    """대량 업무 등록"""
    registered = []
    for req in tasks:
        task = {
            "task_id": req.task_id,
            "task_name": req.task_name,
            "task_name_en": req.task_name_en,
            "group": req.group,
            "layer": req.layer,
            "types": req.types,
            "trigger_type": req.trigger_type,
            "inputs": req.inputs,
            "outputs": req.outputs,
            "metrics": {"k_efficiency": 1.0, "i_interaction": 0.0, "omega_entropy": 0.5, "status": "active"},
            "created_at": datetime.now().isoformat()
        }
        storage.add_task(task)
        registered.append(req.task_id)
    
    return {"status": "registered", "count": len(registered), "task_ids": registered}


# Task Execution
@router.post("/execute")
async def execute_task(request: TaskExecutionRequest, background_tasks: BackgroundTasks):
    """업무 실행"""
    task = storage.get_task(request.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if request.async_mode:
        background_tasks.add_task(
            _execute_task_async,
            request.task_id,
            request.type_code,
            request.input_data
        )
        return {"status": "queued", "task_id": request.task_id, "message": "Execution started in background"}
    
    result = await task_engine.execute_task(request.task_id, request.type_code, request.input_data)
    storage.add_execution(result)
    
    await storage.broadcast_sse("task_executed", {
        "task_id": request.task_id,
        "execution_id": result["execution_id"],
        "success": result["success"]
    })
    
    return TaskExecutionResponse(
        execution_id=result["execution_id"],
        task_id=result["task_id"],
        success=result["success"],
        status=result["status"],
        output_data=result.get("output_data", {}),
        duration_ms=result.get("duration_ms", 0)
    )


async def _execute_task_async(task_id: str, type_code: str, input_data: dict):
    """비동기 실행 백그라운드 태스크"""
    result = await task_engine.execute_task(task_id, type_code, input_data)
    storage.add_execution(result)
    await storage.broadcast_sse("task_executed", {
        "task_id": task_id,
        "execution_id": result["execution_id"],
        "success": result["success"]
    })


@router.get("/executions/list")
async def list_executions(
    task_id: Optional[str] = None,
    success: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """실행 이력 조회"""
    executions = storage.executions.copy()
    executions.reverse()
    
    if task_id:
        executions = [e for e in executions if e.get("task_id") == task_id]
    if success is not None:
        executions = [e for e in executions if e.get("success") == success]
    
    total = len(executions)
    executions = executions[offset:offset + limit]
    
    return {"total": total, "limit": limit, "offset": offset, "executions": executions}


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """실행 상세 조회"""
    for execution in storage.executions:
        if execution.get("execution_id") == execution_id:
            return execution
    raise HTTPException(status_code=404, detail="Execution not found")


# Physics Metrics
@router.get("/metrics/{task_id}")
async def get_task_metrics(task_id: str):
    """업무 메트릭 조회"""
    task = storage.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    metrics = task.get("metrics", {})
    history = storage.metrics_history.get(task_id, [])
    
    return {
        "task_id": task_id,
        "current": metrics,
        "health_score": _calculate_health_score(metrics),
        "status": _determine_status(metrics),
        "history": history[-50:]
    }


@router.post("/metrics/update")
async def update_metrics(request: MetricsUpdateRequest):
    """메트릭 업데이트"""
    task = storage.get_task(request.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_k = physics_engine.calculate_k(request.actual_output, request.expected_output, request.resource_input, request.time_input)
    new_i = physics_engine.calculate_i(request.response_rate, request.cycle_time, request.collaboration_score)
    new_omega = physics_engine.calculate_omega(request.error_count, request.backlog_count, request.rework_count, request.total_volume)
    
    current = task.get("metrics", {"k_efficiency": 1.0, "i_interaction": 0.0, "omega_entropy": 0.5})
    
    alpha = 0.3
    updated_metrics = {
        "k_efficiency": alpha * new_k + (1 - alpha) * current.get("k_efficiency", 1.0),
        "i_interaction": alpha * new_i + (1 - alpha) * current.get("i_interaction", 0.0),
        "omega_entropy": alpha * new_omega + (1 - alpha) * current.get("omega_entropy", 0.5),
        "updated_at": datetime.now().isoformat()
    }
    updated_metrics["status"] = _determine_status(updated_metrics)
    
    task["metrics"] = updated_metrics
    
    if request.task_id not in storage.metrics_history:
        storage.metrics_history[request.task_id] = []
    storage.metrics_history[request.task_id].append({**updated_metrics, "timestamp": datetime.now().isoformat()})
    
    if updated_metrics["k_efficiency"] < 0.5:
        alert = {
            "type": "low_efficiency",
            "task_id": request.task_id,
            "message": f"K < 0.5 ({updated_metrics['k_efficiency']:.2f})",
            "timestamp": datetime.now().isoformat()
        }
        storage.add_alert(alert)
        await storage.broadcast_sse("alert", alert)
    
    await storage.broadcast_sse("metrics_updated", {"task_id": request.task_id, "metrics": updated_metrics})
    
    return {"task_id": request.task_id, "metrics": updated_metrics, "health_score": _calculate_health_score(updated_metrics)}


# Workflow Management
@router.post("/workflows")
async def start_workflow(request: WorkflowStartRequest):
    """워크플로 시작"""
    workflow = await workflow_engine.start_workflow(request.workflow_type, request.data)
    await storage.broadcast_sse("workflow_started", {"workflow_id": workflow["workflow_id"], "type": request.workflow_type})
    return workflow


@router.get("/workflows/list")
async def list_workflows(
    status: Optional[str] = None,
    workflow_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100)
):
    """워크플로 목록 조회"""
    workflows = list(storage.workflows.values())
    
    if status:
        workflows = [w for w in workflows if w.get("status") == status]
    if workflow_type:
        workflows = [w for w in workflows if w.get("type") == workflow_type]
    
    return {"total": len(workflows), "workflows": workflows[:limit]}


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """워크플로 상세 조회"""
    workflow = storage.workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.post("/workflows/{workflow_id}/action")
async def workflow_action(workflow_id: str, request: WorkflowActionRequest):
    """워크플로 액션"""
    try:
        workflow = await workflow_engine.process_action(workflow_id, request.action, request.comment)
        await storage.broadcast_sse("workflow_action", {"workflow_id": workflow_id, "action": request.action, "status": workflow["status"]})
        return workflow
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Engine Direct Call
@router.post("/engines/{engine_name}/call")
async def call_engine(engine_name: str, request: EngineCallRequest):
    """엔진 직접 호출"""
    if engine_name == "ocr":
        return {"engine": "ocr", "result": {"text": "Extracted text...", "confidence": 0.95, "tables": [], "forms": []}}
    elif engine_name == "ml_scoring":
        return {"engine": "ml_scoring", "result": {"score": 75.5, "grade": "B", "confidence": 0.85}}
    elif engine_name == "notification":
        return {"engine": "notification", "result": {"sent": True, "channel": request.input_data.get("channel", "email"), "recipients": 1}}
    else:
        raise HTTPException(status_code=404, detail=f"Engine not found: {engine_name}")


@router.get("/engines/list")
async def list_engines():
    """등록된 엔진 목록"""
    return {
        "engines": [
            {"name": "ocr", "status": "ok", "provider": "textract"},
            {"name": "ml_scoring", "status": "ok", "models": ["lead_scoring", "ticket_classification", "risk_assessment"]},
            {"name": "notification", "status": "ok", "channels": ["email", "slack", "sms", "webhook"]},
            {"name": "workflow", "status": "ok", "types": ["expense", "purchase", "leave"]},
            {"name": "integration", "status": "ok", "connectors": ["crm", "erp", "hrms"]}
        ]
    }


# Dashboard & Analytics
@router.get("/dashboard")
async def get_dashboard():
    """대시보드 데이터"""
    tasks = list(storage.tasks.values())
    
    by_status = {}
    by_group = {}
    by_layer = {}
    health_dist = {"critical": 0, "warning": 0, "healthy": 0}
    
    k_sum = i_sum = omega_sum = 0
    
    for task in tasks:
        metrics = task.get("metrics", {})
        status = metrics.get("status", "active")
        group = task.get("group", "unknown")
        layer = task.get("layer", "unknown")
        
        by_status[status] = by_status.get(status, 0) + 1
        by_group[group] = by_group.get(group, 0) + 1
        by_layer[layer] = by_layer.get(layer, 0) + 1
        
        health = _calculate_health_score(metrics)
        if health < 40:
            health_dist["critical"] += 1
        elif health < 70:
            health_dist["warning"] += 1
        else:
            health_dist["healthy"] += 1
        
        k_sum += metrics.get("k_efficiency", 1.0)
        i_sum += metrics.get("i_interaction", 0.0)
        omega_sum += metrics.get("omega_entropy", 0.5)
    
    total = len(tasks) or 1
    
    return DashboardResponse(
        total_tasks=len(tasks),
        by_status=by_status,
        by_group=by_group,
        by_layer=by_layer,
        avg_metrics={"k": round(k_sum / total, 3), "i": round(i_sum / total, 3), "omega": round(omega_sum / total, 3)},
        health_distribution=health_dist,
        recent_executions=storage.executions[-10:][::-1],
        alerts=storage.alerts[-10:][::-1]
    )


@router.get("/dashboard/realtime")
async def dashboard_realtime_sse():
    """실시간 대시보드 SSE 스트림"""
    async def event_generator():
        queue = asyncio.Queue()
        storage.sse_subscribers.append(queue)
        
        try:
            yield f"data: {json.dumps({'event': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
            
            while True:
                message = await queue.get()
                yield f"data: {json.dumps(message)}\n\n"
        finally:
            storage.sse_subscribers.remove(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


@router.get("/analytics/trends")
async def get_trends(task_id: Optional[str] = None, days: int = Query(7, ge=1, le=30)):
    """트렌드 분석"""
    import random
    
    trends = []
    base_date = datetime.now()
    
    for i in range(days):
        date = base_date - timedelta(days=days - i - 1)
        trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "executions": random.randint(50, 200),
            "success_rate": random.uniform(0.85, 0.98),
            "avg_k": random.uniform(0.8, 1.2),
            "avg_omega": random.uniform(0.3, 0.6)
        })
    
    return {"task_id": task_id, "period_days": days, "trends": trends}


@router.get("/analytics/elimination-candidates")
async def get_elimination_candidates():
    """삭제 후보 업무 조회"""
    candidates = []
    
    for task in storage.tasks.values():
        metrics = task.get("metrics", {})
        k = metrics.get("k_efficiency", 1.0)
        omega = metrics.get("omega_entropy", 0.5)
        
        if k < 0.5 or omega > 0.7:
            candidates.append({
                "task_id": task["task_id"],
                "task_name": task["task_name"],
                "k_efficiency": k,
                "omega_entropy": omega,
                "health_score": _calculate_health_score(metrics),
                "recommendation": "eliminate" if k < 0.3 else "optimize"
            })
    
    candidates.sort(key=lambda x: x["health_score"])
    
    return {"count": len(candidates), "candidates": candidates[:20]}


# Batch Operations
@router.post("/batch/elimination-cycle")
async def run_elimination_cycle(background_tasks: BackgroundTasks):
    """삭제 사이클 실행"""
    background_tasks.add_task(_run_elimination_cycle)
    return {"status": "started", "message": "Elimination cycle started in background"}


async def _run_elimination_cycle():
    """삭제 사이클 백그라운드 실행"""
    eliminated = []
    
    for task_id, task in list(storage.tasks.items()):
        metrics = task.get("metrics", {})
        k = metrics.get("k_efficiency", 1.0)
        omega = metrics.get("omega_entropy", 0.5)
        
        if k < 0.3 and omega > 0.7:
            task["metrics"]["status"] = "eliminated"
            eliminated.append(task_id)
            await storage.broadcast_sse("task_eliminated", {"task_id": task_id, "reason": f"K={k:.2f}, Ω={omega:.2f}"})
    
    if eliminated:
        storage.add_alert({
            "type": "elimination_cycle",
            "message": f"{len(eliminated)} tasks eliminated",
            "task_ids": eliminated,
            "timestamp": datetime.now().isoformat()
        })


@router.post("/batch/recalculate-metrics")
async def recalculate_all_metrics(background_tasks: BackgroundTasks):
    """전체 메트릭 재계산"""
    background_tasks.add_task(_recalculate_metrics)
    return {"status": "started", "message": "Metrics recalculation started"}


async def _recalculate_metrics():
    """메트릭 재계산 백그라운드"""
    import random
    
    for task_id, task in storage.tasks.items():
        new_k = physics_engine.calculate_k(random.uniform(0.8, 1.2), 1.0, random.uniform(0.5, 1.5), random.uniform(0.5, 2.0))
        new_i = physics_engine.calculate_i(random.uniform(0.6, 1.0), random.uniform(0.5, 2.0), random.uniform(-0.3, 0.5))
        new_omega = physics_engine.calculate_omega(random.randint(0, 5), random.randint(0, 10), random.randint(0, 3), random.randint(50, 200))
        
        task["metrics"] = {
            "k_efficiency": new_k,
            "i_interaction": new_i,
            "omega_entropy": new_omega,
            "status": _determine_status({"k_efficiency": new_k, "omega_entropy": new_omega}),
            "updated_at": datetime.now().isoformat()
        }
    
    await storage.broadcast_sse("metrics_recalculated", {"count": len(storage.tasks), "timestamp": datetime.now().isoformat()})


# Load 570 Tasks on Startup
def load_570_tasks():
    """570개 업무 로드"""
    import random
    
    try:
        from backend.task_engine.task_definitions_570 import get_all_tasks
        all_tasks = get_all_tasks()
        
        for t in all_tasks:
            task = {
                "task_id": t["id"],
                "task_name": t["name"],
                "task_name_en": t["name_en"],
                "group": t["group"],
                "layer": t["layer"],
                "types": [{"code": typ, "name": typ} for typ in t.get("types", [])],
                "metrics": {
                    "k_efficiency": random.uniform(0.7, 1.3),
                    "i_interaction": random.uniform(-0.2, 0.4),
                    "omega_entropy": random.uniform(0.3, 0.6),
                    "status": "active"
                },
                "created_at": datetime.now().isoformat()
            }
            storage.add_task(task)
        
        return len(storage.tasks)
    except Exception as e:
        print(f"Failed to load 570 tasks: {e}")
        return 0
