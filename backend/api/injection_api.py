"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS Injection API (인젝션 API)
═══════════════════════════════════════════════════════════════════════════════

베테랑 노하우 주입 및 글로벌 싱크 API

"원기옥을 모으는 관문"
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Injection imports
from injectors.master_injection import (
    get_injection_engine,
    inject_veteran_knowledge,
    RawKnowledge,
    DataSource,
)
from core.strategic_nodes import get_strategic_matrix, PhysicsDimension


router = APIRouter(prefix="/injection", tags=["Injection"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class SingleInjectionRequest(BaseModel):
    """단일 주입 요청"""
    content: str = Field(..., min_length=20, description="노하우 내용")
    domain: str = Field(..., description="영역 (health, finance, skill 등)")
    author_id: str = Field(default="anonymous", description="작성자 ID")
    experience_years: int = Field(default=0, ge=0, le=100, description="경력 년수")
    source: str = Field(default="manual", description="데이터 소스")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="추가 메타데이터")


class BatchInjectionRequest(BaseModel):
    """배치 주입 요청"""
    items: List[SingleInjectionRequest] = Field(..., min_items=1, max_items=1000)
    parallel: bool = Field(default=True, description="병렬 처리 여부")


class VeteranKnowledgeRequest(BaseModel):
    """베테랑 지식 등록 요청"""
    content: str = Field(..., min_length=50, description="노하우 내용 (최소 50자)")
    domain: str = Field(..., description="전문 영역")
    experience_years: int = Field(..., ge=30, le=100, description="경력 (최소 30년)")
    credentials: List[str] = Field(default_factory=list, description="자격증/인증 목록")


# ═══════════════════════════════════════════════════════════════════════════════
# Injection Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/single")
async def inject_single_knowledge(request: SingleInjectionRequest):
    """
    🎯 단일 노하우 주입
    """
    result = await inject_veteran_knowledge(
        content=request.content,
        domain=request.domain,
        author_id=request.author_id,
        experience_years=request.experience_years,
    )
    
    return {
        "success": result.get("status") == "injected",
        "result": result,
    }


@router.post("/batch")
async def inject_batch_knowledge(request: BatchInjectionRequest):
    """
    📦 배치 노하우 주입
    """
    import hashlib
    
    engine = get_injection_engine()
    
    knowledge_list = [
        RawKnowledge(
            id=hashlib.sha256(f"{item.author_id}:{item.content[:50]}:{i}".encode()).hexdigest()[:16],
            source=DataSource(item.source) if item.source in [e.value for e in DataSource] else DataSource.MANUAL,
            author_id=item.author_id,
            content=item.content,
            domain=item.domain,
            experience_years=item.experience_years,
            metadata=item.metadata,
        )
        for i, item in enumerate(request.items)
    ]
    
    report = await engine.inject_batch(knowledge_list, parallel=request.parallel)
    
    return {
        "success": True,
        "report": report.to_dict(),
    }


@router.post("/veteran")
async def register_veteran_knowledge(request: VeteranKnowledgeRequest):
    """
    👨‍🏫 베테랑(30년+) 전문 지식 등록
    
    30년 이상 경력자 전용. 최대 가중치 적용.
    """
    result = await inject_veteran_knowledge(
        content=request.content,
        domain=request.domain,
        author_id=f"veteran_{datetime.utcnow().timestamp()}",
        experience_years=request.experience_years,
    )
    
    # 베테랑 보너스 정보 추가
    result["veteran_bonus"] = True
    result["weight_multiplier"] = min(request.experience_years / 50, 1.0)
    
    return {
        "success": result.get("status") == "injected",
        "message": "베테랑 지식이 성공적으로 등록되었습니다" if result.get("status") == "injected" else "주입 실패",
        "result": result,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Strategic Matrix Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/matrix")
async def get_full_matrix():
    """
    🏛️ 36개 전략 노드 매트릭스 조회
    """
    matrix = get_strategic_matrix()
    
    return {
        "success": True,
        "matrix": matrix.to_dict(),
    }


@router.get("/matrix/stats")
async def get_matrix_stats():
    """
    📊 매트릭스 통계
    """
    matrix = get_strategic_matrix()
    
    return {
        "success": True,
        "stats": matrix.get_stats(),
    }


@router.get("/matrix/resonance")
async def get_global_resonance():
    """
    🌐 글로벌 공명 지수
    """
    matrix = get_strategic_matrix()
    resonance = matrix.calculate_global_resonance()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "resonance": resonance,
    }


@router.get("/matrix/node/{node_id}")
async def get_node_detail(node_id: str):
    """
    🔍 개별 노드 상세 조회
    """
    matrix = get_strategic_matrix()
    node = matrix.get_node(node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    return {
        "success": True,
        "node": node.to_dict(),
    }


@router.get("/matrix/field/{field_id}")
async def get_field_detail(field_id: str):
    """
    📁 영역별 상세 조회
    """
    matrix = get_strategic_matrix()
    field = matrix.get_field(field_id)
    
    if not field:
        raise HTTPException(status_code=404, detail=f"Field {field_id} not found")
    
    return {
        "success": True,
        "field": field,
    }


@router.get("/matrix/physics/{physics}")
async def get_physics_nodes(physics: str):
    """
    🔬 물리 차원별 노드 조회
    """
    matrix = get_strategic_matrix()
    
    try:
        physics_enum = PhysicsDimension(physics)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid physics dimension. Valid: {[p.value for p in PhysicsDimension]}"
        )
    
    nodes = matrix.get_by_physics(physics_enum)
    
    return {
        "success": True,
        "physics": physics,
        "nodes": nodes,
        "count": len(nodes),
    }


@router.get("/matrix/vector")
async def get_36_vector():
    """
    📈 36차원 벡터 조회
    """
    matrix = get_strategic_matrix()
    vector = matrix.to_36_vector()
    
    return {
        "success": True,
        "dimensions": 36,
        "vector": vector,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Engine Status
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_injection_stats():
    """
    📊 인젝션 엔진 통계
    """
    engine = get_injection_engine()
    
    return {
        "success": True,
        "stats": engine.get_stats(),
    }


@router.get("/health")
async def injection_health():
    """
    💚 인젝션 시스템 헬스 체크
    """
    return {
        "status": "healthy",
        "service": "AUTUS Injection Engine",
        "version": "2.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "single_injection": "active",
            "batch_injection": "active",
            "veteran_mode": "active",
            "strategic_matrix": "active",
            "global_resonance": "active",
        },
    }
