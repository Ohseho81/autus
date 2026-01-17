"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Self-Running API Router
AUTUS 자율 실행 엔진 제어 API
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel

# Self-Running Engine import
try:
    from core.self_running_engine import (
        SelfRunningEngine,
        ExecutionPhase,
        get_self_running_engine,
    )
except ImportError:
    from backend.core.self_running_engine import (
        SelfRunningEngine,
        ExecutionPhase,
        get_self_running_engine,
    )

router = APIRouter(prefix="/self-run", tags=["Self-Running Engine"])

# ═══════════════════════════════════════════════════════════════════════════════
# 전역 상태
# ═══════════════════════════════════════════════════════════════════════════════

_background_task: Optional[asyncio.Task] = None

# ═══════════════════════════════════════════════════════════════════════════════
# Request Models
# ═══════════════════════════════════════════════════════════════════════════════

class StartRequest(BaseModel):
    batch_size: int = 10
    min_automation_rate: float = 0.5
    interval_seconds: int = 30

class ConfigRequest(BaseModel):
    batch_size: Optional[int] = None
    min_automation_rate: Optional[float] = None
    execution_interval: Optional[int] = None

# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", summary="Self-Running Engine 정보")
async def get_info():
    """Self-Running Engine 시스템 정보"""
    return {
        "system": "AUTUS Self-Running Engine",
        "version": "1.0",
        "description": "AUTUS가 스스로 업무를 선택하고 실행하는 자율 시스템",
        "phases": [p.value for p in ExecutionPhase],
        "loop": [
            "1. SCAN - 실행 가능한 업무 탐색",
            "2. SELECT - 자동화율 높은 업무 선택",
            "3. EXECUTE - 30개 모듈 체인 실행",
            "4. LEARN - 결과 기록 및 K/I 상수 업데이트",
            "5. EVOLVE - 패턴 학습 및 개선",
            "6. REPEAT - 무한 반복",
        ],
        "endpoints": {
            "status": "GET /self-run/status",
            "start": "POST /self-run/start",
            "stop": "POST /self-run/stop",
            "cycle": "POST /self-run/cycle",
            "history": "GET /self-run/history",
        }
    }


@router.get("/status", summary="현재 상태")
async def get_status():
    """Self-Running Engine 현재 상태"""
    engine = get_self_running_engine()
    return engine.get_status()


@router.post("/start", summary="자율 실행 시작")
async def start_engine(
    background_tasks: BackgroundTasks,
    request: StartRequest = None,
):
    """
    Self-Running Engine 무한 루프 시작
    
    - batch_size: 한 번에 실행할 업무 수
    - min_automation_rate: 최소 자동화율 (0.0 ~ 1.0)
    - interval_seconds: 사이클 간 대기 시간
    """
    global _background_task
    
    engine = get_self_running_engine()
    
    if engine.is_running:
        return {
            "success": False,
            "message": "Engine is already running",
            "status": engine.get_status(),
        }
    
    # 설정 적용
    if request:
        engine.batch_size = request.batch_size
        engine.min_automation_rate = request.min_automation_rate
        engine.execution_interval = request.interval_seconds
    
    # 백그라운드에서 실행
    async def run_in_background():
        await engine.run_forever()
    
    _background_task = asyncio.create_task(run_in_background())
    
    return {
        "success": True,
        "message": "Self-Running Engine started",
        "settings": {
            "batch_size": engine.batch_size,
            "min_automation_rate": engine.min_automation_rate,
            "interval_seconds": engine.execution_interval,
        }
    }


@router.post("/stop", summary="자율 실행 중지")
async def stop_engine():
    """Self-Running Engine 중지"""
    global _background_task
    
    engine = get_self_running_engine()
    
    if not engine.is_running:
        return {
            "success": False,
            "message": "Engine is not running",
        }
    
    engine.stop()
    
    if _background_task:
        _background_task.cancel()
        _background_task = None
    
    return {
        "success": True,
        "message": "Self-Running Engine stopped",
        "final_stats": {
            "total_executions": engine.execution_count,
            "success_count": engine.success_count,
            "fail_count": engine.fail_count,
        }
    }


@router.post("/cycle", summary="단일 사이클 실행")
async def run_single_cycle(
    batch_size: int = Query(10, ge=1, le=100, description="실행할 업무 수"),
    min_automation_rate: float = Query(0.5, ge=0.0, le=1.0, description="최소 자동화율"),
):
    """
    단일 실행 사이클 수행 (SCAN → SELECT → EXECUTE → LEARN → EVOLVE)
    
    무한 루프 없이 한 번만 실행
    """
    engine = get_self_running_engine()
    
    # 임시 설정 적용
    original_batch = engine.batch_size
    original_rate = engine.min_automation_rate
    
    engine.batch_size = batch_size
    engine.min_automation_rate = min_automation_rate
    
    try:
        result = await engine.run_cycle()
        return result
    finally:
        # 설정 복원
        engine.batch_size = original_batch
        engine.min_automation_rate = original_rate


@router.get("/history", summary="실행 이력")
async def get_history(
    limit: int = Query(50, ge=1, le=500, description="조회 개수"),
):
    """최근 실행 이력 조회"""
    engine = get_self_running_engine()
    
    history = engine.execution_history[-limit:]
    
    # 통계 계산
    if history:
        success_count = sum(1 for r in history if r.success)
        avg_duration = sum(r.duration_ms for r in history) / len(history)
        
        # 도메인별 집계
        by_domain = {}
        for r in history:
            domain = r.domain
            if domain not in by_domain:
                by_domain[domain] = {"total": 0, "success": 0}
            by_domain[domain]["total"] += 1
            if r.success:
                by_domain[domain]["success"] += 1
    else:
        success_count = 0
        avg_duration = 0
        by_domain = {}
    
    return {
        "total": len(history),
        "success_count": success_count,
        "fail_count": len(history) - success_count,
        "success_rate": round(success_count / len(history), 2) if history else 0,
        "avg_duration_ms": round(avg_duration, 2),
        "by_domain": by_domain,
        "executions": [r.to_dict() for r in reversed(history)],
    }


@router.patch("/config", summary="설정 변경")
async def update_config(request: ConfigRequest):
    """Self-Running Engine 설정 변경"""
    engine = get_self_running_engine()
    
    updated = {}
    
    if request.batch_size is not None:
        engine.batch_size = request.batch_size
        updated["batch_size"] = request.batch_size
    
    if request.min_automation_rate is not None:
        engine.min_automation_rate = request.min_automation_rate
        updated["min_automation_rate"] = request.min_automation_rate
    
    if request.execution_interval is not None:
        engine.execution_interval = request.execution_interval
        updated["execution_interval"] = request.execution_interval
    
    return {
        "success": True,
        "updated": updated,
        "current_settings": {
            "batch_size": engine.batch_size,
            "min_automation_rate": engine.min_automation_rate,
            "execution_interval": engine.execution_interval,
        }
    }


@router.get("/stats", summary="통계")
async def get_stats():
    """전체 실행 통계"""
    engine = get_self_running_engine()
    history = engine.execution_history
    
    if not history:
        return {
            "total_executions": 0,
            "message": "No executions yet",
        }
    
    # 시간별 집계
    hourly = {}
    for r in history:
        hour = r.started_at[:13]  # "2026-01-15T14"
        if hour not in hourly:
            hourly[hour] = {"total": 0, "success": 0}
        hourly[hour]["total"] += 1
        if r.success:
            hourly[hour]["success"] += 1
    
    # 모듈별 성공률
    module_stats = {}
    for r in history:
        for module in r.modules_executed:
            if module not in module_stats:
                module_stats[module] = {"total": 0, "success": 0}
            module_stats[module]["total"] += 1
            if r.success:
                module_stats[module]["success"] += 1
    
    # K/I 변화 추이
    k_changes = [r.k_after - r.k_before for r in history]
    i_changes = [r.i_after - r.i_before for r in history]
    
    return {
        "total_executions": len(history),
        "success_rate": round(sum(1 for r in history if r.success) / len(history), 2),
        "avg_duration_ms": round(sum(r.duration_ms for r in history) / len(history), 2),
        "hourly_distribution": hourly,
        "module_usage": {
            k: {**v, "success_rate": round(v["success"] / v["total"], 2)}
            for k, v in module_stats.items()
        },
        "physics_evolution": {
            "avg_k_change": round(sum(k_changes) / len(k_changes), 4) if k_changes else 0,
            "avg_i_change": round(sum(i_changes) / len(i_changes), 4) if i_changes else 0,
            "total_k_improvement": round(sum(k_changes), 4),
            "total_i_improvement": round(sum(i_changes), 4),
        }
    }


@router.post("/reset", summary="상태 초기화")
async def reset_engine():
    """실행 기록 및 상태 초기화"""
    engine = get_self_running_engine()
    
    if engine.is_running:
        return {
            "success": False,
            "message": "Cannot reset while engine is running. Stop first.",
        }
    
    engine.execution_count = 0
    engine.success_count = 0
    engine.fail_count = 0
    engine.execution_history = []
    
    return {
        "success": True,
        "message": "Engine state reset",
    }
