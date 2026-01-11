"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS Distribution API v2.0.0 (배포 API)
═══════════════════════════════════════════════════════════════════════════════

144,000 마스터 → 8억 배포 → 80억 앰비언트

엔드포인트:
- POST /distribution/process: 사용자 입력 처리 (FSD)
- POST /distribution/align: 마스터 정렬
- GET /distribution/consensus: 글로벌 합의 조회
- GET /distribution/stats: 시스템 통계

"80억 명의 노이즈를 삭제하고 144,000명의 정수를 배치하는 지능의 주소록"
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import numpy as np

from core.master_hub import (
    get_master_registry,
    Domain,
    DOMAINS,
    SECTORS,
    MASTERS_PER_SECTOR,
    TOTAL_MASTERS,
    VECTOR_DIM,
)
from core.fsd_engine import (
    get_fsd_engine,
    ENTROPY_THRESHOLD,
)


router = APIRouter(prefix="/distribution", tags=["Distribution"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class ProcessRequest(BaseModel):
    """처리 요청"""
    vector: List[float] = Field(..., min_items=512, max_items=512, description="512차원 입력 벡터")
    user_id: Optional[str] = Field(None, description="사용자 ID")


class AlignMasterRequest(BaseModel):
    """마스터 정렬 요청"""
    vector: List[float] = Field(..., min_items=512, max_items=512, description="512차원 마스터 벡터")
    domain_id: int = Field(..., ge=0, lt=12, description="도메인 ID (0-11)")
    sector_id: int = Field(..., ge=0, lt=12, description="섹터 ID (0-11)")
    experience_years: int = Field(30, ge=10, description="경력 연수")
    expertise_level: str = Field("veteran", description="전문성 레벨")
    master_id: Optional[str] = Field(None, description="마스터 ID")


class BatchProcessRequest(BaseModel):
    """배치 처리 요청"""
    vectors: List[List[float]] = Field(..., description="벡터 리스트")
    user_ids: Optional[List[str]] = Field(None, description="사용자 ID 리스트")


# ═══════════════════════════════════════════════════════════════════════════════
# FSD 처리 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/process")
async def process_input(request: ProcessRequest):
    """
    🧠 사용자 입력 처리 (FSD 파이프라인)
    
    모으기 → 삭제하기 → 정리하기 → 공명 → 고요
    """
    engine = get_fsd_engine()
    
    # 벡터 변환
    vector = np.array(request.vector, dtype=np.float32)
    
    # FSD 처리
    result = engine.process_human_input(vector, request.user_id)
    
    if not result.success:
        return {
            "success": False,
            "stage": result.stage.value,
            "message": f"처리 중단: {result.stage.value} 단계에서 실패",
            "metrics": {
                "noise_removed": result.noise_removed,
                "signal_strength": result.signal_strength,
            },
        }
    
    return {
        "success": True,
        "result": result.to_dict(),
        "optimal_trajectory": {
            "provided": result.optimal_trajectory is not None,
            "vector_norm": float(np.linalg.norm(result.optimal_trajectory)) if result.optimal_trajectory is not None else 0,
        },
        "guidance": {
            "domain": result.matched_domain,
            "nodes": result.matched_nodes,
            "resonance": result.resonance_score,
            "entropy_reduction": -result.entropy_delta if result.entropy_delta < 0 else 0,
        },
    }


@router.post("/process/batch")
async def process_batch(request: BatchProcessRequest):
    """
    📦 배치 처리 (대규모 트래픽용)
    """
    engine = get_fsd_engine()
    
    if len(request.vectors) > 1000:
        raise HTTPException(status_code=400, detail="최대 1000개까지 배치 처리 가능")
    
    # 벡터 변환
    vectors = [np.array(v, dtype=np.float32) for v in request.vectors]
    
    # 배치 처리
    results = engine.process_batch(vectors, request.user_ids)
    
    success_count = sum(1 for r in results if r.success)
    
    return {
        "success": True,
        "total": len(results),
        "success_count": success_count,
        "failure_count": len(results) - success_count,
        "results": [r.to_dict() for r in results],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 마스터 레지스트리 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/align")
async def align_master(request: AlignMasterRequest):
    """
    🏛️ 마스터 정렬 (144,000 슬롯에 배치)
    
    베테랑의 노하우를 1:12:144 격자에 정렬합니다.
    """
    registry = get_master_registry()
    
    # 벡터 변환
    vector = np.array(request.vector, dtype=np.float32)
    
    # 정렬 시도
    success, profile = registry.align_master(
        master_vector=vector,
        domain_id=request.domain_id,
        sector_id=request.sector_id,
        experience_years=request.experience_years,
        expertise_level=request.expertise_level,
        master_id=request.master_id,
    )
    
    if not success:
        return {
            "success": False,
            "message": "정렬 실패: 교차 검증 통과 못함 또는 슬롯 부족",
        }
    
    return {
        "success": True,
        "profile": profile.to_dict(),
        "message": f"마스터 {profile.master_id}가 도메인 {request.domain_id}, 섹터 {request.sector_id}에 정렬되었습니다",
    }


@router.get("/master/{master_id}")
async def get_master(master_id: str):
    """
    🔍 마스터 조회
    """
    registry = get_master_registry()
    profile = registry.get_master(master_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail=f"마스터 {master_id}를 찾을 수 없습니다")
    
    return {
        "success": True,
        "profile": profile.to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 합의 (Consensus) 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/consensus")
async def get_global_consensus():
    """
    🌍 글로벌 합의 조회
    
    144,000 마스터들의 평균 벡터 (정답)
    """
    registry = get_master_registry()
    consensus_info = registry.export_consensus()
    
    return {
        "success": True,
        "consensus": consensus_info,
        "description": "각 도메인/섹터별 마스터들의 합의 벡터 정보",
    }


@router.get("/consensus/domain/{domain_id}")
async def get_domain_consensus(domain_id: int):
    """
    🎯 도메인별 합의 조회
    """
    if domain_id < 0 or domain_id >= DOMAINS:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 도메인 ID: {domain_id}")
    
    registry = get_master_registry()
    consensus = registry.get_domain_consensus(domain_id)
    
    domain_enum = list(Domain)[domain_id]
    
    return {
        "success": True,
        "domain": {
            "id": domain_id,
            "code": domain_enum.code,
            "name_en": domain_enum.name_en,
            "name_kr": domain_enum.name_kr,
        },
        "consensus": {
            "vector_norm": float(np.linalg.norm(consensus)),
            "has_consensus": float(np.linalg.norm(consensus)) > 0.1,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 통계 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_distribution_stats():
    """
    📊 시스템 통계
    """
    registry = get_master_registry()
    engine = get_fsd_engine()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "registry": registry.get_registry_stats(),
        "engine": engine.get_stats(),
        "constants": {
            "total_capacity": TOTAL_MASTERS,
            "domains": DOMAINS,
            "sectors_per_domain": SECTORS,
            "masters_per_sector": MASTERS_PER_SECTOR,
            "vector_dimension": VECTOR_DIM,
            "entropy_threshold": ENTROPY_THRESHOLD,
        },
    }


@router.get("/stats/domains")
async def get_domain_stats():
    """
    📊 도메인별 통계
    """
    registry = get_master_registry()
    stats = registry.get_registry_stats()
    
    domains_list = []
    for d in range(DOMAINS):
        domain_enum = list(Domain)[d]
        domain_stats = stats["domains"].get(domain_enum.code, {})
        domains_list.append({
            "id": d,
            "code": domain_enum.code,
            "name_en": domain_enum.name_en,
            "name_kr": domain_enum.name_kr,
            "filled": domain_stats.get("filled", 0),
            "total": domain_stats.get("total", SECTORS * MASTERS_PER_SECTOR),
            "fill_rate": domain_stats.get("fill_rate", 0),
        })
    
    return {
        "success": True,
        "domains": domains_list,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 노드 조회 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/nodes")
async def get_all_nodes():
    """
    📍 36개 노드 전체 조회
    """
    import json
    from pathlib import Path
    
    nodes_path = Path(__file__).parent.parent / "core" / "nodes.json"
    
    if not nodes_path.exists():
        raise HTTPException(status_code=500, detail="nodes.json 파일을 찾을 수 없습니다")
    
    with open(nodes_path, "r", encoding="utf-8") as f:
        nodes_data = json.load(f)
    
    return {
        "success": True,
        "version": nodes_data.get("system_version", "2.0.0"),
        "total_nodes": nodes_data.get("total_nodes", 36),
        "fractal_structure": nodes_data.get("fractal_structure", "1:12:144"),
        "domains": nodes_data.get("domains", []),
    }


@router.get("/nodes/{node_id}")
async def get_node(node_id: str):
    """
    📍 특정 노드 조회
    """
    import json
    from pathlib import Path
    
    nodes_path = Path(__file__).parent.parent / "core" / "nodes.json"
    
    if not nodes_path.exists():
        raise HTTPException(status_code=500, detail="nodes.json 파일을 찾을 수 없습니다")
    
    with open(nodes_path, "r", encoding="utf-8") as f:
        nodes_data = json.load(f)
    
    # 노드 찾기
    for domain in nodes_data.get("domains", []):
        for node in domain.get("nodes", []):
            if node.get("id") == node_id:
                return {
                    "success": True,
                    "domain": {
                        "id": domain.get("id"),
                        "name": domain.get("name"),
                        "name_kr": domain.get("name_kr"),
                    },
                    "node": node,
                }
    
    raise HTTPException(status_code=404, detail=f"노드 {node_id}를 찾을 수 없습니다")


# ═══════════════════════════════════════════════════════════════════════════════
# 헬스 체크
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def distribution_health():
    """
    💚 배포 시스템 헬스 체크
    """
    registry = get_master_registry()
    stats = registry.get_registry_stats()
    
    return {
        "status": "healthy",
        "service": "AUTUS Distribution Engine",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "capacity": {
            "total": TOTAL_MASTERS,
            "filled": stats["total_filled"],
            "available": TOTAL_MASTERS - stats["total_filled"],
            "fill_rate": f"{stats['fill_rate']:.2f}%",
        },
    }
