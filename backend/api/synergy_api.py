"""
AUTUS Monte Carlo API Endpoints
================================

FastAPI 라우터 - Monte Carlo 시너지 엔진

Endpoints:
- GET  /api/synergy/monte-carlo/{user_id}     - 전체 시너지 스캔
- GET  /api/synergy/golden/{user_id}          - 골든 볼륨 조회
- GET  /api/synergy/entropy/{user_id}         - 엔트로피 노드 조회
- GET  /api/synergy/top-5/{user_id}           - 상위 5인
- GET  /api/synergy/bottom-5/{user_id}        - 하위 5인
- GET  /api/synergy/actions/{user_id}         - 액션 카드
- POST /api/synergy/scan                      - 스캔 실행 (with data)
- GET  /api/synergy/daily-report/{user_id}    - 일일 리포트

Performance: < 5ms per request
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncio
import random

from ..core.monte_carlo_fast import FastMonteCarloEngine, get_mc_engine, initialize_engine
from ..core.revenue_projection import generate_full_projection_report


# ================================================================
# ROUTER
# ================================================================

router = APIRouter(prefix="/api/synergy", tags=["Monte Carlo Synergy"])


# ================================================================
# PYDANTIC MODELS
# ================================================================

class NodeData(BaseModel):
    """노드 데이터"""
    id: str
    name: str
    revenue: float = 0.0
    time_spent: float = 0.0


class EdgeData(BaseModel):
    """엣지 데이터"""
    source: str
    target: str
    weight: float = 1.0


class ScanRequest(BaseModel):
    """스캔 요청"""
    seed_id: str
    nodes: List[NodeData]
    edges: List[EdgeData]


class GoldenNodeModel(BaseModel):
    """골든 노드"""
    rank: int
    id: str
    name: str
    synergy: float
    ppr: float
    revenue: float
    grade: str


class EntropyNodeModel(BaseModel):
    """엔트로피 노드"""
    rank: int
    id: str
    name: str
    synergy: float
    grade: str


class ActionCard(BaseModel):
    """액션 카드"""
    id: str
    type: str
    target_id: str
    target_name: str
    priority: int
    synergy: float
    reason: str
    message: Optional[str]


class SynergyReport(BaseModel):
    """시너지 리포트"""
    scan_id: str
    timestamp: str
    seed: str
    execution_time_ms: float
    total_nodes: int
    golden_count: int
    entropy_count: int
    system_entropy: float
    system_efficiency: float


class DailyReport(BaseModel):
    """일일 리포트"""
    date: str
    seed: str
    golden_volume: List[Dict]
    entropy_nodes: List[Dict]
    top_actions: List[Dict]
    system_status: Dict[str, Any]
    recommendations: List[str]


# ================================================================
# GLOBAL ENGINE
# ================================================================

# 싱글톤 엔진
_engine: Optional[FastMonteCarloEngine] = None


def get_engine() -> FastMonteCarloEngine:
    """엔진 의존성"""
    global _engine
    
    if _engine is None:
        _engine = FastMonteCarloEngine()
    
    return _engine


def ensure_initialized():
    """엔진 초기화 확인"""
    engine = get_engine()
    
    if len(engine.node_ids) == 0:
        # 샘플 데이터로 초기화 (실제로는 DB에서 로드)
        n = 150
        ids = [f"node_{i:03d}" for i in range(n)]
        names = [f"Person_{i}" for i in range(n)]
        revenues = [random.randint(-500000, 5000000) for _ in range(n)]
        times = [random.randint(10, 180) for _ in range(n)]
        
        engine.load_nodes(ids, names, revenues, times)
        
        edges = []
        for _ in range(300):
            a = random.randint(0, n-1)
            b = random.randint(0, n-1)
            if a != b:
                edges.append((ids[a], ids[b], random.uniform(0.5, 2.0)))
        
        engine.add_edges_batch(edges)
        engine.build_transition_matrix()
    
    return engine


# ================================================================
# ENDPOINTS
# ================================================================

@router.get("/monte-carlo/{user_id}")
async def get_mc_synergy(user_id: str):
    """
    Monte Carlo 시너지 전체 스캔
    
    10만 번 시뮬레이션 결과 반환 (< 5ms)
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id, use_power_iteration=True)
    
    return {
        "status": "success",
        "data": result,
    }


@router.get("/golden/{user_id}")
async def get_golden_volume(user_id: str, limit: int = 10):
    """
    골든 볼륨 조회
    
    상위 20% 중 시너지 >= 0.8 노드들
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    
    return result["golden_volume"][:limit]


@router.get("/entropy/{user_id}")
async def get_entropy_nodes(user_id: str, limit: int = 10):
    """
    엔트로피 노드 조회
    
    하위 10% 중 시너지 < -0.3 노드들
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    
    return result["entropy_nodes"][:limit]


@router.get("/top-5/{user_id}")
async def get_top_5(user_id: str):
    """
    상위 5인 조회
    
    시너지 기준 Top 5
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    
    return {
        "seed": user_id,
        "top_5": result["top_5"],
        "execution_time_ms": result["meta"]["execution_time_ms"],
    }


@router.get("/bottom-5/{user_id}")
async def get_bottom_5(user_id: str):
    """
    하위 5인 조회
    
    시너지 기준 Bottom 5
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    
    return {
        "seed": user_id,
        "bottom_5": result["bottom_5"],
        "execution_time_ms": result["meta"]["execution_time_ms"],
    }


@router.get("/actions/{user_id}")
async def get_action_cards(user_id: str, limit: int = 10):
    """
    액션 카드 조회
    
    우선순위별 추천 액션
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    cards = engine.get_action_cards(user_id, limit=limit)
    
    return cards


@router.post("/scan")
async def run_scan(request: ScanRequest):
    """
    커스텀 데이터로 스캔 실행
    
    노드/엣지 데이터와 함께 스캔
    """
    engine = FastMonteCarloEngine()
    
    # 데이터 로드
    ids = [n.id for n in request.nodes]
    names = [n.name for n in request.nodes]
    revenues = [n.revenue for n in request.nodes]
    times = [n.time_spent for n in request.nodes]
    
    engine.load_nodes(ids, names, revenues, times)
    
    edges = [(e.source, e.target, e.weight) for e in request.edges]
    engine.add_edges_batch(edges)
    engine.build_transition_matrix()
    
    # 스캔 실행
    result = engine.run_full_analysis(request.seed_id)
    
    return {
        "status": "success",
        "data": result,
    }


@router.get("/z-values/{user_id}")
async def get_z_values(user_id: str):
    """
    전체 z축 값 조회
    
    프론트엔드 3D Map 투영용
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    
    return {
        "seed": user_id,
        "z_values": result["z_values"],
        "execution_time_ms": result["meta"]["execution_time_ms"],
    }


@router.get("/daily-report/{user_id}")
async def get_daily_report(user_id: str):
    """
    일일 시너지 리포트
    
    매일 아침 9시 자동 생성되는 리포트
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    cards = engine.get_action_cards(user_id, limit=5)
    
    # 추천 메시지 생성
    recommendations = []
    
    if result["system"]["entropy"] > 2.0:
        recommendations.append("⚠️ 시스템 엔트로피 높음 - 하위 노드 정리 권장")
    
    if result["system"]["golden_count"] < 5:
        recommendations.append("📈 골든 볼륨 확대 필요 - 상위 노드 시너지 부스트 권장")
    
    if result["system"]["efficiency"] < 0.5:
        recommendations.append("⚡ 효율성 저하 - 마찰 노드 연결 빈도 축소 권장")
    
    if not recommendations:
        recommendations.append("✅ 시스템 최적 상태 유지 중")
    
    return DailyReport(
        date=datetime.now().strftime("%Y-%m-%d"),
        seed=user_id,
        golden_volume=result["golden_volume"][:5],
        entropy_nodes=result["entropy_nodes"][:3],
        top_actions=cards,
        system_status={
            "entropy": result["system"]["entropy"],
            "efficiency": result["system"]["efficiency"],
            "golden_count": result["system"]["golden_count"],
            "entropy_count": result["system"]["entropy_count"],
        },
        recommendations=recommendations,
    )


@router.get("/health")
async def health_check():
    """Monte Carlo 엔진 상태"""
    engine = get_engine()
    
    return {
        "status": "healthy",
        "nodes_loaded": len(engine.node_ids),
        "matrix_built": engine.transition_matrix is not None,
    }


@router.get("/revenue-projection/{user_id}")
async def get_revenue_projection(user_id: str, months: int = 1):
    """
    수익 예측 리포트
    
    1/3/6개월 수익 예측 + 가치 수확 기회 + n^n 폭발 감지
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    # Monte Carlo 분석 실행
    result = engine.run_full_analysis(user_id)
    
    # 골든 볼륨 데이터 추출
    golden_volume = result.get("golden_volume", [])
    
    if not golden_volume:
        return {
            "status": "error",
            "message": "골든 볼륨이 비어있습니다. 네트워크 데이터를 확인하세요.",
        }
    
    # 수익 예측 리포트 생성
    report = generate_full_projection_report(
        golden_volume=golden_volume,
        system_entropy=result["system"]["entropy"],
        system_efficiency=result["system"]["efficiency"],
    )
    
    return {
        "status": "success",
        "seed": user_id,
        "report": report,
    }


@router.get("/value-harvest/{user_id}")
async def get_value_harvest_opportunities(user_id: str):
    """
    가치 수확 기회 조회
    
    최적의 수익 실현 타이밍과 액션 제안
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    golden_volume = result.get("golden_volume", [])
    
    report = generate_full_projection_report(
        golden_volume=golden_volume,
        system_entropy=result["system"]["entropy"],
        system_efficiency=result["system"]["efficiency"],
    )
    
    return {
        "status": "success",
        "opportunities": report["harvest_opportunities"],
        "nn_explosion": report["nn_explosion"],
        "recommendations": report["recommendations"],
    }


@router.get("/nn-explosion/{user_id}")
async def check_nn_explosion(user_id: str):
    """
    n^n 폭발 상태 체크
    
    가치 폭발 조건 충족 여부 확인
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    result = engine.run_full_analysis(user_id)
    golden_volume = result.get("golden_volume", [])
    
    report = generate_full_projection_report(
        golden_volume=golden_volume,
        system_entropy=result["system"]["entropy"],
        system_efficiency=result["system"]["efficiency"],
    )
    
    nn_data = report["nn_explosion"]
    
    return {
        "status": "success",
        "explosion_detected": nn_data["detected"],
        "details": nn_data.get("details"),
        "action_required": "다자간 시너지 프로젝트 즉시 발의" if nn_data["detected"] else "조건 미충족",
    }


# ================================================================
# SCHEDULED SCAN (for scheduler integration)
# ================================================================

async def scheduled_synergy_scan(user_id: str) -> Dict:
    """
    스케줄러용 시너지 스캔
    
    매일 9시 자동 실행
    """
    engine = ensure_initialized()
    
    if user_id not in engine.id_to_idx:
        return {"error": f"User {user_id} not found"}
    
    result = engine.run_full_analysis(user_id)
    
    # 경고 체크
    warnings = []
    
    # 골든 볼륨 노드 시너지 하락 체크
    for node in result["golden_volume"]:
        if node["synergy"] < 0.8:
            warnings.append({
                "type": "SYNERGY_DROP",
                "node": node["name"],
                "synergy": node["synergy"],
                "message": f"골든 임계값(0.8) 미달: {node['synergy']:.3f}",
            })
    
    # 새로운 엔트로피 유입 체크
    if result["system"]["entropy"] > 3.0:
        warnings.append({
            "type": "HIGH_ENTROPY",
            "value": result["system"]["entropy"],
            "message": "시스템 엔트로피 위험 수준",
        })
    
    return {
        "scan_id": f"scheduled_{user_id}_{datetime.now().strftime('%Y%m%d%H%M')}",
        "timestamp": datetime.now().isoformat(),
        "result": result,
        "warnings": warnings,
        "requires_action": len(warnings) > 0,
    }


# ================================================================
# UTILITY FUNCTIONS
# ================================================================

def reload_engine_from_db(db_session):
    """
    데이터베이스에서 엔진 리로드
    
    실제 구현에서는 DB 쿼리로 대체
    """
    global _engine
    
    # nodes = db_session.query(NodeModel).filter(NodeModel.is_active == True).all()
    # edges = db_session.query(EntanglementModel).all()
    
    # engine = FastMonteCarloEngine()
    # engine.load_nodes(...)
    # engine.add_edges_batch(...)
    # engine.build_transition_matrix()
    
    # _engine = engine
    
    pass


def invalidate_cache():
    """캐시 무효화"""
    global _engine
    
    if _engine:
        _engine._ppr_cache.clear()

