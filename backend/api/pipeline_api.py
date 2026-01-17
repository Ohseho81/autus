"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS Pipeline API (파이프라인 API)
═══════════════════════════════════════════════════════════════════════════════

통합 파이프라인 실행 및 관리를 위한 REST API

엔드포인트:
- POST /pipeline/execute: 파이프라인 실행
- GET /pipeline/status: 시스템 상태
- POST /pipeline/transform: 베테랑 직관 변환
- GET /pipeline/nodes: 36개 노드 상태

═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Pipeline imports
from pipeline import get_pipeline, run_pipeline, AutusPipeline
from core.compat import (
    get_node_registry,
    get_node,
    transform_intuition,
    NODE_DEFINITIONS,
)
from core.unp import create_unp_packet, validate_unp, PHYSICS_DIMENSIONS
from core.circuits import get_protection_circuit
from sovereign import get_zkp_engine, get_poc_engine


router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class PipelineExecuteRequest(BaseModel):
    """파이프라인 실행 요청"""
    data: Dict[str, Any] = Field(..., description="원시 데이터 (노하우)")
    owner_did: str = Field(..., description="소유자 DID")
    credential_hash: str = Field(default="", description="VC 해시")
    experience_years: int = Field(default=0, ge=0, le=100, description="경력 년수")
    reward_pool: float = Field(default=100.0, ge=0, description="보상 풀")


class TransformRequest(BaseModel):
    """직관 변환 요청"""
    text: str = Field(..., description="베테랑의 노하우 텍스트")
    numeric_data: Optional[Dict[str, float]] = Field(default=None, description="정량 데이터")
    experience_years: int = Field(default=0, description="경력 년수")


class NodeUpdateRequest(BaseModel):
    """노드 업데이트 요청"""
    node_id: str = Field(..., description="노드 ID (n01~n36)")
    value: float = Field(..., ge=0.0, le=1.0, description="새 값")
    force: float = Field(default=0.0, description="적용할 힘")


class UNPCreateRequest(BaseModel):
    """UNP 패킷 생성 요청"""
    data: Dict[str, Any] = Field(..., description="원시 데이터")
    owner_did: str = Field(..., description="소유자 DID")
    credential_hash: str = Field(default="", description="자격 증명 해시")


# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/execute")
async def execute_pipeline(request: PipelineExecuteRequest):
    """
    🚀 통합 파이프라인 실행
    
    모으기 → 삭제하기 → 정리하기 → 검증 → 보상
    """
    try:
        result = await run_pipeline(
            data=request.data,
            owner=request.owner_did,
            years=request.experience_years,
        )
        
        return {
            "success": True,
            "message": "Pipeline executed successfully",
            "result": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_pipeline_status():
    """
    📊 시스템 전체 상태 조회
    """
    pipeline = get_pipeline()
    state = pipeline.get_system_state()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "state": state,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Node Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/nodes")
async def get_all_nodes():
    """
    🔢 36개 노드 전체 상태 조회
    """
    registry = get_node_registry()
    
    return {
        "success": True,
        "nodes": registry.to_dict(),
        "definitions": NODE_DEFINITIONS,
    }


@router.get("/nodes/{node_id}")
async def get_single_node(node_id: str):
    """
    🔍 개별 노드 상태 조회
    """
    node = get_node(node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    return {
        "success": True,
        "node": node,
    }


@router.post("/nodes/update")
async def update_node(request: NodeUpdateRequest):
    """
    ⚡ 노드 값 업데이트
    """
    registry = get_node_registry()
    
    # 값 설정
    success = registry.set_value(request.node_id, request.value)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Node {request.node_id} not found")
    
    # 힘 적용 (선택)
    if request.force != 0:
        registry.apply_force(request.node_id, request.force)
    
    return {
        "success": True,
        "node": get_node(request.node_id),
    }


@router.get("/nodes/vector/36")
async def get_36_vector():
    """
    📈 36차원 벡터 조회
    """
    registry = get_node_registry()
    vector = registry.to_36_vector()
    
    return {
        "success": True,
        "dimensions": 36,
        "vector": vector,
    }


@router.get("/nodes/vector/144")
async def get_144_vector():
    """
    📊 144차원 벡터 조회
    """
    registry = get_node_registry()
    vector = registry.to_144_vector()
    
    return {
        "success": True,
        "dimensions": 144,
        "vector": vector,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Transform Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/transform/intuition")
async def transform_veteran_intuition(request: TransformRequest):
    """
    🧠 베테랑 직관을 48차원 벡터로 변환
    """
    from core.compat import VeteranIntuitionTransformer
    
    transformer = VeteranIntuitionTransformer()
    result = transformer.transform(
        content=request.text,
        domain="WORK",  # 기본 도메인
        experience_years=request.experience_years,
    )
    
    vector = result.get("vector", [])
    
    return {
        "success": True,
        "vector": vector,
        "result": result,
        "statistics": {
            "average": sum(vector) / len(vector) if vector else 0,
            "max_value": max(vector) if vector else 0,
            "min_value": min(vector) if vector else 0,
            "active_nodes": len([v for v in vector if abs(v) > 0.1]),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# UNP Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/unp/create")
async def create_unp(request: UNPCreateRequest):
    """
    📦 UNP 패킷 생성
    """
    packet = create_unp_packet(
        data=request.data,
        owner=request.owner_did,
        credential=request.credential_hash,
    )
    
    validation = validate_unp(packet)
    
    return {
        "success": True,
        "packet": packet.to_dict(),
        "validation": validation,
        "serialized_size": len(packet.serialize()),
    }


@router.get("/unp/schema")
async def get_unp_schema():
    """
    📐 UNP 스키마 정보
    """
    return {
        "success": True,
        "schema": {
            "version": "2.0.0",
            "fractal_structure": {
                "core": 1,
                "domains": 12,
                "indicators": 144,
                "nodes": 36,
            },
            "physics_dimensions": PHYSICS_DIMENSIONS,
            "data_types": ["scalar", "vector", "matrix", "sequence", "graph"],
            "interface_types": ["input", "output", "bidirectional", "broadcast"],
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Security Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/security/report")
async def get_security_report():
    """
    🛡️ 보안 리포트 조회
    """
    circuit = get_protection_circuit()
    report = circuit.get_security_report()
    
    return {
        "success": True,
        "report": report,
    }


@router.get("/security/nodes")
async def get_security_status():
    """
    🔐 노드 보안 상태
    """
    circuit = get_protection_circuit()
    status = circuit.get_all_status()
    
    return {
        "success": True,
        "security_status": status,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ZKP/PoC Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/zkp/stats")
async def get_zkp_stats():
    """
    🔐 영지식 증명 통계
    """
    engine = get_zkp_engine()
    stats = engine.get_stats()
    
    return {
        "success": True,
        "zkp_stats": stats,
    }


@router.get("/poc/stats")
async def get_poc_stats():
    """
    🏆 기여 증명 통계
    """
    engine = get_poc_engine()
    stats = engine.get_stats()
    
    return {
        "success": True,
        "poc_stats": stats,
    }


@router.get("/poc/leaderboard")
async def get_leaderboard(limit: int = 10):
    """
    🏅 기여자 리더보드
    """
    engine = get_poc_engine()
    leaderboard = engine.get_leaderboard(limit=limit)
    
    return {
        "success": True,
        "leaderboard": leaderboard,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def pipeline_health():
    """
    💚 파이프라인 헬스 체크
    """
    return {
        "status": "healthy",
        "service": "AUTUS Pipeline",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "nodes36": "active",
            "unp": "active",
            "circuits": "active",
            "zkp": "active",
            "poc": "active",
        },
    }
