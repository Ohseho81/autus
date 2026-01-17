"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 1,000 Task API Router
30개 모듈 × 1,000개 업무 생성 & Supabase 저장 API
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

# Task Generator import
try:
    from task_engine.task_generator_1000 import (
        TaskGenerator1000,
        TaskInstance,
        TaskPriority,
        TaskStatus,
        TaskFrequency,
        TASK_DOMAINS,
        TASK_PARAMETERS,
        get_task_generator,
        get_task_summary,
    )
except ImportError:
    from backend.task_engine.task_generator_1000 import (
        TaskGenerator1000,
        TaskInstance,
        TaskPriority,
        TaskStatus,
        TaskFrequency,
        TASK_DOMAINS,
        TASK_PARAMETERS,
        get_task_generator,
        get_task_summary,
    )

router = APIRouter(prefix="/tasks-1000", tags=["1000 Tasks"])

# ═══════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dcobyicibvhpwcjqkmgw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY", ""))

# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class GenerateRequest(BaseModel):
    count: int = 1000
    seed: int = 42

class TaskResponse(BaseModel):
    id: str
    name_ko: str
    domain: str
    department: str
    priority: str
    modules: List[str]
    k_value: float
    i_value: float
    automation_rate: float

class SummaryResponse(BaseModel):
    total_tasks: int
    domains: int
    by_priority: Dict[str, int]
    avg_physics: Dict[str, float]
    avg_automation_rate: float

class SupabaseUploadResponse(BaseModel):
    success: bool
    uploaded: int
    failed: int
    message: str

# ═══════════════════════════════════════════════════════════════════════════════
# 전역 상태
# ═══════════════════════════════════════════════════════════════════════════════

_cached_generator: Optional[TaskGenerator1000] = None

def get_generator() -> TaskGenerator1000:
    global _cached_generator
    if _cached_generator is None:
        _cached_generator = TaskGenerator1000()
        _cached_generator.generate_tasks(1000)
    return _cached_generator

# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", summary="1,000 Tasks 시스템 정보")
async def get_info():
    """1,000 Task Generator 시스템 정보"""
    return {
        "system": "AUTUS 1,000 Task Generator",
        "version": "1.0",
        "domains": 30,
        "target_tasks": 1000,
        "modules_base": 30,
        "endpoints": {
            "generate": "POST /tasks-1000/generate",
            "list": "GET /tasks-1000/list",
            "summary": "GET /tasks-1000/summary",
            "domains": "GET /tasks-1000/domains",
            "upload": "POST /tasks-1000/upload-supabase",
        }
    }


@router.post("/generate", summary="1,000개 업무 생성")
async def generate_tasks(request: GenerateRequest = None):
    """
    30개 모듈 × 파라미터 조합으로 1,000개 업무 생성
    
    - count: 생성할 업무 수 (기본 1000)
    - seed: 랜덤 시드 (재현 가능)
    """
    global _cached_generator
    
    count = request.count if request else 1000
    seed = request.seed if request else 42
    
    generator = TaskGenerator1000()
    generator._seed_random(seed)
    tasks = generator.generate_tasks(count)
    
    _cached_generator = generator
    
    return {
        "success": True,
        "generated": len(tasks),
        "summary": generator.get_summary(),
        "sample_tasks": [t.to_dict() for t in tasks[:10]],
    }


@router.get("/list", summary="생성된 업무 목록")
async def list_tasks(
    domain: Optional[str] = Query(None, description="도메인 필터 (예: FIN, HRM)"),
    department: Optional[str] = Query(None, description="부서 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    limit: int = Query(50, ge=1, le=500, description="반환 개수"),
    offset: int = Query(0, ge=0, description="시작 위치"),
):
    """생성된 업무 목록 조회 (필터링 지원)"""
    generator = get_generator()
    tasks = generator.tasks
    
    # 필터링
    if domain:
        tasks = [t for t in tasks if t.domain == domain.upper()]
    if department:
        tasks = [t for t in tasks if t.department == department]
    if priority:
        tasks = [t for t in tasks if t.priority.value == priority]
    
    total = len(tasks)
    tasks = tasks[offset:offset + limit]
    
    return {
        "total": total,
        "returned": len(tasks),
        "offset": offset,
        "limit": limit,
        "tasks": [t.to_dict() for t in tasks],
    }


@router.get("/summary", summary="업무 생성 요약")
async def get_tasks_summary():
    """생성된 1,000개 업무 요약 통계"""
    generator = get_generator()
    return generator.get_summary()


@router.get("/domains", summary="30개 도메인 목록")
async def get_domains():
    """30개 업무 도메인 목록"""
    return {
        "total": len(TASK_DOMAINS),
        "domains": [
            {
                "code": code,
                "name": info["name"],
                "name_ko": info["name_ko"],
                "color": info["color"],
            }
            for code, info in TASK_DOMAINS.items()
        ]
    }


@router.get("/parameters", summary="업무 파라미터 목록")
async def get_parameters():
    """업무 생성에 사용되는 파라미터 목록"""
    return TASK_PARAMETERS


@router.get("/task/{task_id}", summary="업무 상세 조회")
async def get_task_detail(task_id: str):
    """특정 업무 상세 정보 조회"""
    generator = get_generator()
    
    for task in generator.tasks:
        if task.id == task_id:
            return task.to_dict()
    
    raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")


@router.get("/by-domain/{domain}", summary="도메인별 업무 조회")
async def get_tasks_by_domain(
    domain: str,
    limit: int = Query(50, ge=1, le=200),
):
    """특정 도메인의 업무 목록"""
    generator = get_generator()
    tasks = generator.get_tasks_by_domain(domain.upper())
    
    return {
        "domain": domain.upper(),
        "domain_info": TASK_DOMAINS.get(domain.upper(), {}),
        "total": len(tasks),
        "tasks": [t.to_dict() for t in tasks[:limit]],
    }


@router.get("/high-automation", summary="고자동화 업무")
async def get_high_automation_tasks(
    threshold: float = Query(0.8, ge=0.0, le=1.0, description="자동화율 임계값"),
    limit: int = Query(50, ge=1, le=200),
):
    """자동화율이 높은 업무 목록"""
    generator = get_generator()
    tasks = generator.get_high_automation_tasks(threshold)
    
    return {
        "threshold": threshold,
        "total": len(tasks),
        "tasks": [t.to_dict() for t in tasks[:limit]],
    }


@router.post("/upload-supabase", summary="Supabase에 업로드")
async def upload_to_supabase(
    batch_size: int = Query(100, ge=10, le=500, description="배치 크기"),
    max_tasks: int = Query(1000, ge=1, le=1000, description="최대 업로드 수"),
):
    """
    생성된 1,000개 업무를 Supabase tasks 테이블에 업로드
    
    - batch_size: 한 번에 업로드할 개수
    - max_tasks: 최대 업로드 개수
    """
    if not SUPABASE_KEY:
        raise HTTPException(
            status_code=400,
            detail="SUPABASE_SERVICE_KEY 환경변수가 설정되지 않았습니다"
        )
    
    generator = get_generator()
    tasks_data = generator.to_supabase_format()[:max_tasks]
    
    uploaded = 0
    failed = 0
    errors = []
    
    async with httpx.AsyncClient() as client:
        # 배치 단위로 업로드
        for i in range(0, len(tasks_data), batch_size):
            batch = tasks_data[i:i + batch_size]
            
            try:
                response = await client.post(
                    f"{SUPABASE_URL}/rest/v1/tasks",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=batch,
                    timeout=30.0,
                )
                
                if response.status_code in [200, 201]:
                    uploaded += len(batch)
                else:
                    failed += len(batch)
                    errors.append({
                        "batch": i // batch_size,
                        "error": response.text[:200],
                    })
            except Exception as e:
                failed += len(batch)
                errors.append({
                    "batch": i // batch_size,
                    "error": str(e)[:200],
                })
    
    return {
        "success": failed == 0,
        "uploaded": uploaded,
        "failed": failed,
        "total": len(tasks_data),
        "message": f"{uploaded}개 업무가 Supabase에 업로드되었습니다" if failed == 0 else f"{uploaded}개 성공, {failed}개 실패",
        "errors": errors[:5] if errors else None,
    }


@router.get("/export-json", summary="JSON 내보내기")
async def export_json():
    """생성된 업무를 JSON 형식으로 내보내기"""
    generator = get_generator()
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "total_tasks": len(generator.tasks),
            "domains": 30,
        },
        "summary": generator.get_summary(),
        "tasks": [t.to_dict() for t in generator.tasks],
    }


@router.delete("/clear", summary="캐시 초기화")
async def clear_cache():
    """생성된 업무 캐시 초기화"""
    global _cached_generator
    _cached_generator = None
    
    return {
        "success": True,
        "message": "캐시가 초기화되었습니다. 다음 요청 시 새로 생성됩니다."
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Analytics Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/distribution", summary="업무 분포 분석")
async def get_distribution():
    """도메인, 우선순위, 부서별 업무 분포"""
    generator = get_generator()
    tasks = generator.tasks
    
    # 도메인별
    by_domain = {}
    for domain in TASK_DOMAINS:
        by_domain[domain] = len([t for t in tasks if t.domain == domain])
    
    # 우선순위별
    by_priority = {}
    for p in TaskPriority:
        by_priority[p.value] = len([t for t in tasks if t.priority == p])
    
    # 부서별
    by_department = {}
    for task in tasks:
        dept = task.department
        by_department[dept] = by_department.get(dept, 0) + 1
    
    # 주기별
    by_frequency = {}
    for f in TaskFrequency:
        by_frequency[f.value] = len([t for t in tasks if t.frequency == f])
    
    return {
        "total_tasks": len(tasks),
        "by_domain": by_domain,
        "by_priority": by_priority,
        "by_department": by_department,
        "by_frequency": by_frequency,
    }


@router.get("/analytics/physics", summary="물리 상수 분석")
async def get_physics_analysis():
    """K/I/R 물리 상수 분석"""
    generator = get_generator()
    tasks = generator.tasks
    
    if not tasks:
        return {"error": "No tasks generated"}
    
    # K 분포
    k_values = [t.k_value for t in tasks]
    # I 분포
    i_values = [t.i_value for t in tasks]
    # R 분포
    r_values = [t.r_value for t in tasks]
    # 자동화율
    auto_rates = [t.automation_rate for t in tasks]
    
    def stats(values):
        return {
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "avg": round(sum(values) / len(values), 2),
        }
    
    return {
        "total_tasks": len(tasks),
        "k_analysis": {
            "description": "자동화 가능도 (높을수록 자동화 용이)",
            **stats(k_values),
        },
        "i_analysis": {
            "description": "인간 개입 필요도 (낮을수록 자동화 가능)",
            **stats(i_values),
        },
        "r_analysis": {
            "description": "리스크 레벨",
            **stats(r_values),
        },
        "automation_analysis": {
            "description": "예상 자동화율",
            **stats(auto_rates),
            "high_automation_count": len([r for r in auto_rates if r >= 0.8]),
            "low_automation_count": len([r for r in auto_rates if r < 0.5]),
        },
    }


@router.get("/analytics/modules", summary="모듈 사용 분석")
async def get_modules_analysis():
    """30개 원자 모듈 사용 빈도 분석"""
    generator = get_generator()
    tasks = generator.tasks
    
    # 모듈 사용 빈도
    module_count = {}
    for task in tasks:
        for module in task.modules:
            module_count[module] = module_count.get(module, 0) + 1
    
    # 정렬
    sorted_modules = sorted(module_count.items(), key=lambda x: x[1], reverse=True)
    
    # 모듈 체인 패턴 분석
    chain_patterns = {}
    for task in tasks:
        chain = " → ".join(task.modules)
        chain_patterns[chain] = chain_patterns.get(chain, 0) + 1
    
    top_patterns = sorted(chain_patterns.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "total_tasks": len(tasks),
        "unique_modules": len(module_count),
        "module_frequency": dict(sorted_modules),
        "top_module_chains": [
            {"chain": chain, "count": count}
            for chain, count in top_patterns
        ],
    }
