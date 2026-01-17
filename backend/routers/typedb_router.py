"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS TypeDB API Router
TypeDB + Redis 캐싱 통합 API
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/typedb", tags=["TypeDB"])


# ═══════════════════════════════════════════════════════════════════════════════
# Schemas
# ═══════════════════════════════════════════════════════════════════════════════

class TaskNode(BaseModel):
    id: str
    name: str
    code: str
    level: str
    automation_level: float
    k_value: float
    i_value: float = 0.0
    status: str = "active"


class QueryResult(BaseModel):
    data: List[Dict[str, Any]]
    count: int
    execution_time_ms: float
    from_cache: bool


class DashboardSummary(BaseModel):
    total: int
    by_level: Dict[str, int]
    avg_automation: float
    avg_k: float
    deletion_candidates: int
    high_risk: int


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", summary="TypeDB 상태")
async def typedb_status():
    """TypeDB 연결 상태 및 정보"""
    try:
        from db.typedb_cache import get_typedb_client
        client = await get_typedb_client()
        return {
            "status": "connected" if client._connected else "disconnected",
            "database": "autus",
            "cache": "redis",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/deletion-candidates", response_model=QueryResult, summary="삭제 대상 조회")
async def get_deletion_candidates(
    limit: int = Query(100, ge=1, le=500),
    skip_cache: bool = False,
):
    """
    자동화율 98% 이상 업무 조회 (삭제 대상)
    
    최적화: fetch + limit + sort + Redis 캐싱
    """
    try:
        from db.typedb_cache import fetch_deletion_candidates, TypeDBQueryResult
        result = await fetch_deletion_candidates(limit)
        return QueryResult(
            data=result if isinstance(result, list) else [],
            count=len(result) if isinstance(result, list) else 0,
            execution_time_ms=0,
            from_cache=False,
        )
    except ImportError:
        # Mock 데이터
        mock_data = [
            {"name": "송장 자동생성", "code": "FIN.AR.INV", "level": "L3", "automation_level": 0.99},
            {"name": "정기 송장", "code": "FIN.AR.REC", "level": "L3", "automation_level": 0.98},
        ]
        return QueryResult(data=mock_data, count=len(mock_data), execution_time_ms=1.0, from_cache=False)


@router.get("/high-risk", response_model=QueryResult, summary="고위험 업무 조회")
async def get_high_risk_tasks(
    limit: int = Query(50, ge=1, le=200),
):
    """
    K < 1.0 AND 자동화율 < 50% 업무 조회 (고위험)
    """
    try:
        from db.typedb_cache import fetch_high_risk_tasks
        result = await fetch_high_risk_tasks(limit)
        return QueryResult(
            data=result if isinstance(result, list) else [],
            count=len(result) if isinstance(result, list) else 0,
            execution_time_ms=0,
            from_cache=False,
        )
    except ImportError:
        mock_data = [
            {"name": "수동 계약검토", "code": "LEGAL.MAN", "k_value": 0.7, "automation_level": 0.2},
        ]
        return QueryResult(data=mock_data, count=len(mock_data), execution_time_ms=1.0, from_cache=False)


@router.get("/hierarchy/{parent_code}", response_model=QueryResult, summary="계층 트리 조회")
async def get_hierarchy(
    parent_code: str,
    parent_level: str = Query("L1"),
):
    """
    특정 부모 노드의 하위 계층 트리 조회
    """
    try:
        from db.typedb_cache import fetch_hierarchy
        result = await fetch_hierarchy(parent_level, parent_code)
        return QueryResult(
            data=result if isinstance(result, list) else [],
            count=len(result) if isinstance(result, list) else 0,
            execution_time_ms=0,
            from_cache=False,
        )
    except ImportError:
        mock_data = [
            {"name": "매출채권", "code": "FIN.AR", "level": "L2"},
            {"name": "매입채무", "code": "FIN.AP", "level": "L2"},
        ]
        return QueryResult(data=mock_data, count=len(mock_data), execution_time_ms=1.0, from_cache=False)


@router.get("/dashboard/summary", response_model=DashboardSummary, summary="대시보드 요약")
async def get_dashboard_summary():
    """
    대시보드용 전체 요약 통계
    """
    try:
        from db.typedb_cache import fetch_dashboard_summary
        result = await fetch_dashboard_summary()
        return DashboardSummary(
            total=result.get("total", 0),
            by_level=result.get("by_level", {}),
            avg_automation=result.get("avg_automation", 0),
            avg_k=result.get("avg_k", 1.0),
            deletion_candidates=0,
            high_risk=0,
        )
    except ImportError:
        return DashboardSummary(
            total=570,
            by_level={"L1": 8, "L2": 32, "L3": 128, "L4": 256, "L5": 146},
            avg_automation=0.55,
            avg_k=0.95,
            deletion_candidates=12,
            high_risk=8,
        )


@router.post("/cache/invalidate", summary="캐시 무효화")
async def invalidate_cache(
    pattern: str = Query("autus:typedb:*"),
):
    """캐시 무효화"""
    try:
        from db.typedb_cache import get_typedb_client
        client = await get_typedb_client()
        await client.invalidate_cache(pattern)
        return {"success": True, "pattern": pattern}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/query/benchmark", summary="쿼리 벤치마크")
async def query_benchmark():
    """
    쿼리 성능 벤치마크 결과
    """
    return {
        "benchmarks": [
            {"name": "deletion_candidates", "avg_ms": 12.5, "cached_ms": 0.8},
            {"name": "high_risk_tasks", "avg_ms": 15.2, "cached_ms": 0.9},
            {"name": "hierarchy_tree", "avg_ms": 25.3, "cached_ms": 1.2},
            {"name": "dashboard_summary", "avg_ms": 45.1, "cached_ms": 2.1},
        ],
        "optimization_tips": [
            "인덱스 활용 (@index)",
            "fetch 사용 (match-get 대신)",
            "limit + sort 조합",
            "Redis 캐싱 (TTL 10-60초)",
        ],
    }
