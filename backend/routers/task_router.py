"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS - 570개 업무 API 라우터
═══════════════════════════════════════════════════════════════════════════════

K/I/r 기반 개인화 업무 관리 API
"""

from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import json
import asyncio

# Safe imports with fallback
try:
    from task_engine import (
        TaskEngine,
        TaskLayer,
        UserType,
        TaskStatus,
        TaskDefinition,
        UserTask,
        KIRSnapshot,
    )
    from task_engine.models import (
        TaskExecuteRequest,
        TaskExecuteResponse,
        TaskSummary,
        PersonalizationRecommendation,
        KIRInput,
    )
    from task_engine.common_tasks import COMMON_ENGINE_50, CATEGORY_SUMMARY
    TASK_ENGINE_AVAILABLE = True
except ImportError:
    # Fallback mock implementations
    TASK_ENGINE_AVAILABLE = False
    from pydantic import BaseModel
    from enum import Enum
    from dataclasses import dataclass
    from typing import Any
    
    class TaskLayer(str, Enum):
        CORE = "core"
        DOMAIN = "domain"
        EDGE = "edge"
    
    class UserType(str, Enum):
        INDIVIDUAL = "individual"
        TEAM = "team"
        ENTERPRISE = "enterprise"
    
    class TaskStatus(str, Enum):
        PENDING = "pending"
        RUNNING = "running"
        COMPLETED = "completed"
        FAILED = "failed"
    
    @dataclass
    class TaskDefinition:
        id: str
        name: str
        layer: TaskLayer = TaskLayer.CORE
        
    @dataclass
    class UserTask:
        task_id: str
        user_id: str
        status: TaskStatus = TaskStatus.PENDING
    
    @dataclass
    class KIRSnapshot:
        K: float = 0.5
        I: float = 0.5
        r: float = 0.0
    
    class TaskExecuteRequest(BaseModel):
        task_id: str
        user_id: str
    
    class TaskExecuteResponse(BaseModel):
        success: bool = True
        message: str = "Mock response"
    
    class TaskSummary(BaseModel):
        total: int = 0
        completed: int = 0
    
    class PersonalizationRecommendation(BaseModel):
        recommendations: list = []
    
    class KIRInput(BaseModel):
        K: float = 0.5
        I: float = 0.5
    
    class TaskEngine:
        def __init__(self):
            pass
        def get_tasks(self, **kwargs):
            return []
        def execute_task(self, task_id: str, user_id: str):
            return {"success": True, "message": "Mock execution"}
    
    COMMON_ENGINE_50 = []
    CATEGORY_SUMMARY = {}

router = APIRouter(prefix="/api/tasks", tags=["570 Tasks"])

# 글로벌 엔진 인스턴스
_engine: Optional[TaskEngine] = None


def get_engine() -> TaskEngine:
    """TaskEngine 의존성"""
    global _engine
    if _engine is None:
        _engine = TaskEngine()
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 정의 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/definitions", response_model=Dict[str, Any])
async def list_task_definitions(
    layer: Optional[TaskLayer] = None,
    category: Optional[str] = None,
    engine: TaskEngine = Depends(get_engine)
):
    """
    업무 정의 목록 조회
    
    570개 업무를 레이어/카테고리로 필터링
    """
    definitions = engine.get_all_definitions(layer)
    
    if category:
        definitions = [d for d in definitions if d.category == category]
    
    return {
        "total": len(definitions),
        "layer": layer.value if layer else "ALL",
        "category": category or "ALL",
        "definitions": [d.model_dump() for d in definitions]
    }


@router.get("/definitions/{task_id}", response_model=TaskDefinition)
async def get_task_definition(
    task_id: str,
    engine: TaskEngine = Depends(get_engine)
):
    """업무 정의 상세 조회"""
    definition = engine.get_task_definition(task_id)
    if not definition:
        raise HTTPException(404, f"Task not found: {task_id}")
    return definition


@router.get("/categories")
async def list_categories():
    """카테고리 목록 (공통 엔진 50개)"""
    return {
        "layer": "COMMON",
        "total_tasks": 50,
        "categories": CATEGORY_SUMMARY
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 사용자 업무 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/initialize/{entity_id}")
async def initialize_user_tasks(
    entity_id: UUID,
    user_type: UserType = Query(UserType.INDIVIDUAL),
    engine: TaskEngine = Depends(get_engine)
):
    """
    사용자용 업무 초기화
    
    타입에 맞는 업무만 활성화하고 개인화된 K/I/r 설정
    """
    tasks = engine.initialize_user_tasks(entity_id, user_type)
    
    return {
        "entity_id": str(entity_id),
        "user_type": user_type.value,
        "initialized_tasks": len(tasks),
        "message": f"{len(tasks)}개 업무 초기화 완료"
    }


@router.get("/{entity_id}")
async def list_user_tasks(
    entity_id: UUID,
    status: Optional[TaskStatus] = None,
    category: Optional[str] = None,
    engine: TaskEngine = Depends(get_engine)
):
    """사용자 업무 목록 조회"""
    tasks = []
    
    for (eid, tid), task in engine._user_tasks.items():
        if eid != entity_id:
            continue
        
        if status and task.status != status:
            continue
        
        task_def = engine.get_task_definition(tid)
        if category and task_def and task_def.category != category:
            continue
        
        task_dict = task.model_dump()
        task_dict["entity_id"] = str(task_dict["entity_id"])
        
        # 상태 정보 추가
        from task_engine.engine import KIRCalculator
        status_info = KIRCalculator.get_status(
            task.personal_k,
            task.personal_i,
            task.personal_r
        )
        task_dict["kir_status"] = status_info
        
        if task_def:
            task_dict["definition"] = {
                "name_ko": task_def.name_ko,
                "category": task_def.category,
                "layer": task_def.layer.value,
            }
        
        tasks.append(task_dict)
    
    return {
        "entity_id": str(entity_id),
        "total": len(tasks),
        "tasks": tasks
    }


@router.get("/{entity_id}/{task_id}")
async def get_user_task(
    entity_id: UUID,
    task_id: str,
    engine: TaskEngine = Depends(get_engine)
):
    """사용자 업무 상세 조회"""
    task = engine.get_user_task(entity_id, task_id)
    if not task:
        raise HTTPException(404, f"Task not found: {task_id}")
    
    task_def = engine.get_task_definition(task_id)
    
    from task_engine.engine import KIRCalculator
    status_info = KIRCalculator.get_status(
        task.personal_k,
        task.personal_i,
        task.personal_r
    )
    
    return {
        "task": task.model_dump(),
        "definition": task_def.model_dump() if task_def else None,
        "kir_status": status_info
    }


# ═══════════════════════════════════════════════════════════════════════════════
# K/I/r API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{entity_id}/{task_id}/kir")
async def get_kir(
    entity_id: UUID,
    task_id: str,
    engine: TaskEngine = Depends(get_engine)
):
    """K/I/r 상수 조회"""
    task = engine.get_user_task(entity_id, task_id)
    if not task:
        raise HTTPException(404, f"Task not found: {task_id}")
    
    from task_engine.engine import KIRCalculator
    status = KIRCalculator.get_status(
        task.personal_k,
        task.personal_i,
        task.personal_r
    )
    
    return {
        "entity_id": str(entity_id),
        "task_id": task_id,
        "k": {
            "value": round(task.personal_k, 4),
            "status": status["k_status"],
            "description": "에너지 투입 대비 출력 효율"
        },
        "i": {
            "value": round(task.personal_i, 4),
            "status": status["i_status"],
            "description": "노드 간 시너지/갈등"
        },
        "r": {
            "value": round(task.personal_r, 5),
            "status": status["r_status"],
            "description": "쇠퇴/성장율"
        }
    }


@router.post("/{entity_id}/{task_id}/kir")
async def update_kir(
    entity_id: UUID,
    task_id: str,
    inputs: KIRInput,
    engine: TaskEngine = Depends(get_engine)
):
    """K/I/r 수동 업데이트"""
    try:
        snapshot = engine.update_kir(
            entity_id=entity_id,
            task_id=task_id,
            inputs=inputs,
            reason="manual"
        )
        
        return {
            "success": True,
            "snapshot": snapshot.model_dump()
        }
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{entity_id}/{task_id}/kir/history")
async def get_kir_history(
    entity_id: UUID,
    task_id: str,
    limit: int = Query(30, ge=1, le=100),
    engine: TaskEngine = Depends(get_engine)
):
    """K/I/r 히스토리 조회"""
    history = [
        s for s in engine._kir_history
        if s.entity_id == entity_id and s.task_id == task_id
    ][-limit:]
    
    return {
        "entity_id": str(entity_id),
        "task_id": task_id,
        "count": len(history),
        "history": [s.model_dump() for s in history]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 실행 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/execute", response_model=TaskExecuteResponse)
async def execute_task(
    request: TaskExecuteRequest,
    background_tasks: BackgroundTasks,
    engine: TaskEngine = Depends(get_engine)
):
    """
    업무 실행
    
    K/I/r 기반으로 자동화 레벨에 따라 실행
    외부 툴 트리거 포함
    """
    try:
        result = await engine.execute_task(request)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/execute/batch")
async def execute_batch(
    entity_id: UUID,
    task_ids: List[str],
    engine: TaskEngine = Depends(get_engine)
):
    """업무 일괄 실행"""
    results = []
    
    for task_id in task_ids:
        try:
            request = TaskExecuteRequest(
                entity_id=entity_id,
                task_id=task_id,
                execution_type="batch"
            )
            result = await engine.execute_task(request)
            results.append({
                "task_id": task_id,
                "success": result.success,
                "new_k": result.new_k
            })
        except Exception as e:
            results.append({
                "task_id": task_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "entity_id": str(entity_id),
        "total": len(task_ids),
        "success": sum(1 for r in results if r["success"]),
        "results": results
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 분석 & 추천 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{entity_id}/summary", response_model=TaskSummary)
async def get_summary(
    entity_id: UUID,
    engine: TaskEngine = Depends(get_engine)
):
    """업무 요약 조회"""
    return engine.get_summary(entity_id)


@router.get("/{entity_id}/recommendations")
async def get_recommendations(
    entity_id: UUID,
    engine: TaskEngine = Depends(get_engine)
):
    """
    개인화 추천 조회
    
    K/I/r 기반으로 각 업무에 대한 최적화 추천
    """
    recommendations = engine.get_recommendations(entity_id)
    
    return {
        "entity_id": str(entity_id),
        "total": len(recommendations),
        "recommendations": [r.model_dump() for r in recommendations]
    }


@router.get("/{entity_id}/decaying")
async def get_decaying_tasks(
    entity_id: UUID,
    engine: TaskEngine = Depends(get_engine)
):
    """쇠퇴 중인 업무 조회 (r < 0)"""
    decaying = []
    
    for (eid, tid), task in engine._user_tasks.items():
        if eid != entity_id:
            continue
        if task.status == TaskStatus.DECAYING or task.personal_r < -0.02:
            task_def = engine.get_task_definition(tid)
            decaying.append({
                "task_id": tid,
                "name_ko": task_def.name_ko if task_def else tid,
                "status": task.status.value,
                "r": round(task.personal_r, 5),
                "k": round(task.personal_k, 4),
                "estimated_elimination_days": int(abs(task.personal_k / task.personal_r)) if task.personal_r < 0 else None
            })
    
    # r 기준 정렬 (가장 쇠퇴 중인 것 먼저)
    decaying.sort(key=lambda x: x["r"])
    
    return {
        "entity_id": str(entity_id),
        "total": len(decaying),
        "decaying_tasks": decaying
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 자동화 규칙 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/rules")
async def list_automation_rules(
    engine: TaskEngine = Depends(get_engine)
):
    """자동화 규칙 목록"""
    rules = engine.orchestrator.rules
    
    return {
        "total": len(rules),
        "rules": [
            {
                "condition_type": r.condition_type.value,
                "condition": f"{r.condition_operator} {r.condition_value}",
                "action_type": r.action_type.value,
                "action_params": r.action_params,
                "priority": r.priority,
                "enabled": r.enabled
            }
            for r in rules
        ]
    }


@router.post("/{entity_id}/{task_id}/evaluate-rules")
async def evaluate_rules(
    entity_id: UUID,
    task_id: str,
    engine: TaskEngine = Depends(get_engine)
):
    """규칙 평가 (시뮬레이션)"""
    task = engine.get_user_task(entity_id, task_id)
    if not task:
        raise HTTPException(404, f"Task not found: {task_id}")
    
    results = engine.orchestrator.evaluate_rules(
        k=task.personal_k,
        i=task.personal_i,
        r=task.personal_r,
        entity_id=entity_id,
        task_id=task_id
    )
    
    triggered = [r for r in results if r["triggered"]]
    
    return {
        "entity_id": str(entity_id),
        "task_id": task_id,
        "k": task.personal_k,
        "i": task.personal_i,
        "r": task.personal_r,
        "rules_evaluated": len(results),
        "rules_triggered": len(triggered),
        "actions": [
            {
                "action_type": r["action"]["type"],
                "description": r["action"].get("description", ""),
                "params": r["action"]["params"]
            }
            for r in triggered
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SSE 스트림
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{entity_id}/stream")
async def stream_task_updates(
    entity_id: UUID,
    engine: TaskEngine = Depends(get_engine)
):
    """
    SSE 실시간 업데이트 스트림
    
    K/I/r 변화, 업무 상태 변경, 추천 등
    """
    async def generate():
        while True:
            # 요약 정보
            summary = engine.get_summary(entity_id)
            
            data = {
                "type": "summary",
                "timestamp": datetime.now().isoformat(),
                "data": summary.model_dump()
            }
            
            yield f"data: {json.dumps(data)}\n\n"
            
            # 5초 대기
            await asyncio.sleep(5)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
