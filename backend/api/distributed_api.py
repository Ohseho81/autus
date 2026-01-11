"""
AUTUS Distributed API v2.1
===========================

분산 아키텍처 API 엔드포인트

Endpoints:
- POST /distributed/engine/create - 로컬 엔진 생성
- POST /distributed/sync/upstream - Local → Cloud
- POST /distributed/sync/downstream - Cloud → Local
- POST /distributed/cycle - 전체 사이클
- GET /distributed/status - 시스템 상태
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from distributed import (
    AUTUSDistributedSystem,
    LocalPhysicsEngine,
    CloudCalibrationEngine,
    Cohort,
    UpstreamPacket,
    DownstreamPacket
)
from distributed.orchestrator import get_distributed_system


router = APIRouter(prefix="/distributed", tags=["Distributed Engine v2.1"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateEngineRequest(BaseModel):
    """로컬 엔진 생성 요청"""
    device_id: Optional[str] = Field(None, description="디바이스 ID (없으면 자동 생성)")
    cohort: str = Field(
        default="entrepreneur_early_stage",
        description="코호트: entrepreneur_early_stage, entrepreneur_growth_stage, employee_junior, employee_senior, freelancer, executive"
    )


class CreateEngineResponse(BaseModel):
    """로컬 엔진 생성 응답"""
    success: bool
    device_id: str
    cohort: str
    message: str


class UpdateNodeRequest(BaseModel):
    """노드 값 업데이트 요청"""
    device_id: str
    node_values: Dict[str, float] = Field(
        ...,
        description="노드 ID와 값 (예: {'n01': 25000000, 'n09': 6.5})"
    )
    days_since_action: Dict[str, int] = Field(
        default={},
        description="노드별 방치 일수"
    )


class CycleRequest(BaseModel):
    """전체 사이클 요청"""
    device_id: str
    node_values: Optional[Dict[str, float]] = None


class CycleResponse(BaseModel):
    """전체 사이클 응답"""
    success: bool
    device_id: str
    equilibrium: float
    stability: float
    top1: Optional[Dict] = None
    critical_nodes: List[Dict]
    sync_performed: bool


class SystemStatusResponse(BaseModel):
    """시스템 상태 응답"""
    version: str
    local_engines_count: int
    total_syncs: int
    last_sync_time: Optional[str]
    cloud_stats: Dict


class UpstreamResponse(BaseModel):
    """Upstream 응답 (익명화된 데이터)"""
    device_id: str
    timestamp: str
    cohort: str
    node_count: int
    edge_count: int
    system_stability: float


class DownstreamResponse(BaseModel):
    """Downstream 응답"""
    version: str
    timestamp: str
    global_constants_count: int
    cohort_constants_count: int
    early_warning_count: int


class ExternalFactorsRequest(BaseModel):
    """외부 환경 업데이트 요청"""
    interest_rate: Optional[float] = Field(None, description="기준금리 (%)")
    market_volatility: Optional[float] = Field(None, description="시장 변동성 (0~1)")
    inflation_rate: Optional[float] = Field(None, description="인플레이션 (%)")
    unemployment_rate: Optional[float] = Field(None, description="실업률 (%)")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/engine/create", response_model=CreateEngineResponse)
async def create_local_engine(request: CreateEngineRequest):
    """
    로컬 물리 엔진 생성
    
    실제 환경에서는 각 디바이스에서 개별 생성
    """
    system = get_distributed_system()
    
    # 코호트 파싱
    try:
        cohort = Cohort(request.cohort)
    except ValueError:
        cohort = Cohort.ENTREPRENEUR_EARLY
    
    # 엔진 생성
    engine = system.create_local_engine(
        device_id=request.device_id,
        cohort=cohort
    )
    
    return CreateEngineResponse(
        success=True,
        device_id=engine.device_id,
        cohort=cohort.value,
        message=f"로컬 엔진 생성 완료 (익명 ID: {engine.device_id[:8]}...)"
    )


@router.post("/engine/update")
async def update_node_values(request: UpdateNodeRequest):
    """
    노드 값 업데이트 (Raw Data - 로컬에서만)
    
    데이터는 절대 외부로 전송되지 않습니다.
    """
    system = get_distributed_system()
    engine = system.get_local_engine(request.device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {request.device_id}")
    
    # 값 업데이트
    for node_id, value in request.node_values.items():
        days = request.days_since_action.get(node_id, 0)
        engine.update_node_value(node_id, value, days)
    
    return {
        "success": True,
        "device_id": request.device_id,
        "updated_nodes": len(request.node_values)
    }


@router.post("/cycle", response_model=CycleResponse)
async def run_full_cycle(request: CycleRequest):
    """
    전체 사이클 실행
    
    1. 데이터 입력 (로컬)
    2. 물리 계산 (로컬)
    3. Upstream (익명화된 메타데이터만)
    4. 분석 (클라우드)
    5. Downstream (물리 상수만)
    6. 출력 생성 (로컬)
    """
    system = get_distributed_system()
    engine = system.get_local_engine(request.device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {request.device_id}")
    
    # 전체 사이클 실행
    result = system.full_cycle(engine, request.node_values)
    
    # 응답 포맷팅
    output = result.get("output")
    critical = engine.get_critical_nodes(limit=5)
    
    return CycleResponse(
        success=True,
        device_id=request.device_id,
        equilibrium=round(engine.calculate_equilibrium(), 4),
        stability=round(engine.system_stability(), 4),
        top1={
            "node_id": output["node_id"],
            "node_name": output["node_name"],
            "state": output["state"],
            "message": output["message"]
        } if output else None,
        critical_nodes=[
            {
                "node_id": n.id,
                "node_name": n.name,
                "pressure": round(n.pressure, 4),
                "state": n.state.name
            }
            for n in critical
        ],
        sync_performed=True
    )


@router.post("/sync/upstream", response_model=UpstreamResponse)
async def sync_upstream(device_id: str):
    """
    Local → Cloud 동기화
    
    익명화된 메타데이터만 전송:
    - 압력 (정규화된 0~1)
    - 상관관계 강도
    - 상태 분포
    - 회로 활성화 빈도
    
    절대 포함되지 않는 것:
    - 실제 금액
    - 실제 시간
    - 개인 식별 정보
    """
    system = get_distributed_system()
    engine = system.get_local_engine(device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {device_id}")
    
    upstream = system.sync_local_to_cloud(engine)
    
    return UpstreamResponse(
        device_id=upstream.device_id[:8] + "...",  # 익명화 표시
        timestamp=upstream.timestamp,
        cohort=upstream.cohort,
        node_count=len(upstream.node_stats),
        edge_count=len(upstream.edge_correlations),
        system_stability=round(upstream.system_stability, 4)
    )


@router.post("/sync/downstream", response_model=DownstreamResponse)
async def sync_downstream(device_id: str):
    """
    Cloud → Local 동기화
    
    물리 상수만 전송:
    - calibrated_k: 보정된 전도도
    - target_W: 목표 가중치
    - epsilon: 엔트로피 변화
    """
    system = get_distributed_system()
    engine = system.get_local_engine(device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {device_id}")
    
    downstream = system.sync_cloud_to_local(engine)
    
    return DownstreamResponse(
        version=downstream.version,
        timestamp=downstream.timestamp,
        global_constants_count=len(downstream.global_constants.get("physics", {})),
        cohort_constants_count=len(downstream.cohort_constants.get("physics", {})),
        early_warning_count=len(downstream.early_warning.get("patterns", []))
    )


@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """시스템 전체 상태 조회"""
    system = get_distributed_system()
    status = system.get_system_status()
    
    return SystemStatusResponse(
        version=status["version"],
        local_engines_count=status["local_engines_count"],
        total_syncs=status["total_syncs"],
        last_sync_time=status["last_sync_time"],
        cloud_stats=status["cloud_stats"]
    )


@router.get("/engine/{device_id}")
async def get_engine_state(device_id: str):
    """로컬 엔진 상태 조회"""
    system = get_distributed_system()
    engine = system.get_local_engine(device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {device_id}")
    
    return {
        "device_id": engine.device_id,
        "cohort": engine.cohort.value,
        "equilibrium": round(engine.calculate_equilibrium(), 4),
        "stability": round(engine.system_stability(), 4),
        "critical_count": len(engine.get_critical_nodes()),
        "circuit_activations": engine.circuit_activations,
        "calibration_weights": engine.calibration_weights.to_dict()
    }


@router.get("/engine/{device_id}/pressures")
async def get_engine_pressures(device_id: str):
    """엔진 전체 압력 조회"""
    system = get_distributed_system()
    engine = system.get_local_engine(device_id)
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {device_id}")
    
    return {
        "device_id": device_id,
        "pressures": {
            nid: {
                "name": node.name,
                "layer": node.layer.value,
                "pressure": round(node.pressure, 4),
                "state": node.state.name
            }
            for nid, node in engine.nodes.items()
        }
    }


@router.delete("/engine/{device_id}")
async def delete_engine(device_id: str):
    """로컬 엔진 삭제"""
    system = get_distributed_system()
    
    if system.remove_local_engine(device_id):
        return {"success": True, "message": f"Engine {device_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail=f"Engine not found: {device_id}")


@router.post("/cloud/external-factors")
async def update_external_factors(request: ExternalFactorsRequest):
    """
    외부 환경 데이터 업데이트
    
    금리, 시장 변동성 등 외부 요인 반영
    """
    system = get_distributed_system()
    
    factors = {}
    if request.interest_rate is not None:
        factors["interest_rate"] = request.interest_rate
    if request.market_volatility is not None:
        factors["market_volatility"] = request.market_volatility
    if request.inflation_rate is not None:
        factors["inflation_rate"] = request.inflation_rate
    if request.unemployment_rate is not None:
        factors["unemployment_rate"] = request.unemployment_rate
    
    system.cloud.update_external_factors(factors)
    
    return {
        "success": True,
        "updated_factors": list(factors.keys()),
        "current_factors": system.cloud.external_factors
    }


@router.get("/cloud/analysis/{node_id}")
async def get_node_analysis(node_id: str):
    """노드별 클라우드 분석 결과 조회"""
    system = get_distributed_system()
    
    analysis = system.cloud.get_node_analysis(node_id)
    
    if not analysis:
        raise HTTPException(status_code=404, detail=f"No analysis for node: {node_id}")
    
    return analysis


@router.post("/simulate")
async def simulate_multi_user(
    user_count: int = Query(default=10, ge=1, le=100),
    cohort: str = Query(default="entrepreneur_early_stage")
):
    """
    다중 사용자 시뮬레이션
    
    테스트 및 검증용
    """
    system = get_distributed_system()
    
    try:
        cohort_enum = Cohort(cohort)
    except ValueError:
        cohort_enum = Cohort.ENTREPRENEUR_EARLY
    
    result = system.simulate_multi_user(user_count, cohort_enum)
    
    return {
        "success": True,
        **result
    }


# ============================================================================
# 3-TIER CALIBRATION 정보 엔드포인트
# ============================================================================

@router.get("/calibration/info")
async def get_calibration_info():
    """
    3-Tier Calibration 정보
    
    W_effective = α × W_global + β × W_cohort + γ × W_personal
    """
    return {
        "formula": "W_effective = α × W_global + β × W_cohort + γ × W_personal",
        "default_weights": {
            "α (Global)": 0.2,
            "β (Cohort)": 0.3,
            "γ (Personal)": 0.5
        },
        "description": {
            "Global": "전체 사용자 평균 (Tier 1) - 새 사용자 초기값",
            "Cohort": "유사 프로필 그룹 평균 (Tier 2) - 창업자/직장인/프리랜서 등",
            "Personal": "개인 실측 데이터 기반 보정 (Tier 3) - 가장 강함"
        },
        "privacy_note": "Personal 값이 가장 강해 '특이 체질' 문제 해결",
        "fallback": "데이터 없으면 global/cohort fallback"
    }
