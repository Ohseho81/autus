"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS Unified API v3.0
═══════════════════════════════════════════════════════════════════════════════

모든 AUTUS 기능의 단일 진입점 API

엔드포인트:
- GET  /autus/                    시스템 정보
- GET  /autus/snapshot            전체 상태
- GET  /autus/nodes               48노드 전체
- GET  /autus/nodes/{id}          개별 노드
- GET  /autus/domains             16도메인
- GET  /autus/meta                4메타
- GET  /autus/regions             지역별 통계
- GET  /autus/archetypes          아키타입 분포
- GET  /autus/onboarding          온보딩 플로우
- POST /autus/profile             프로필 생성
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from backend.core.autus_unified import (
    get_simulator,
    AUTUS_VERSION,
    TOTAL_NODES,
    TOTAL_DOMAINS,
    TOTAL_META,
    ARCHETYPE_COMBINATIONS,
    META_INFO,
    DOMAIN_INFO,
    NODE_TYPE_INFO,
    CORE_INFO,
    ROLE_INFO,
    format_number,
    get_pressure_state,
)

router = APIRouter(prefix="/autus", tags=["AUTUS Unified"])


# ═══════════════════════════════════════════════════════════════════════════════
# 모델
# ═══════════════════════════════════════════════════════════════════════════════

class ProfileRequest(BaseModel):
    """프로필 생성 요청"""
    core: str = Field(..., description="Core 아키타입")
    roles: List[str] = Field(default=[], description="Role 수정자 (최대 2개)")


class Response(BaseModel):
    """표준 응답"""
    success: bool = True
    data: Any
    message: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def get_info():
    """시스템 정보"""
    return Response(
        data={
            "name": "AUTUS",
            "version": AUTUS_VERSION,
            "philosophy": "이해할 수 없으면 변화할 수 없다",
            "structure": {
                "meta": TOTAL_META,
                "domains": TOTAL_DOMAINS,
                "nodes": TOTAL_NODES,
                "archetypes": ARCHETYPE_COMBINATIONS,
            },
            "endpoints": {
                "snapshot": "/autus/snapshot",
                "nodes": "/autus/nodes",
                "domains": "/autus/domains",
                "meta": "/autus/meta",
                "archetypes": "/autus/archetypes",
                "onboarding": "/autus/onboarding",
                "profile": "/autus/profile",
            },
        },
        message="AUTUS Unified System v3.0"
    )


@router.get("/snapshot")
async def get_snapshot():
    """전체 상태 스냅샷"""
    sim = get_simulator()
    return Response(data=sim.get_snapshot(), message="글로벌 스냅샷")


@router.get("/nodes")
async def get_all_nodes():
    """48노드 전체"""
    sim = get_simulator()
    nodes = sim.get_all_nodes()
    return Response(
        data={"total": len(nodes), "nodes": nodes},
        message=f"{len(nodes)}개 노드"
    )


@router.get("/nodes/{node_id}")
async def get_node(node_id: str):
    """개별 노드"""
    sim = get_simulator()
    node = sim.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node not found: {node_id}")
    
    return Response(
        data={
            "id": node.id,
            "domain": node.domain,
            "domain_name": node.domain_name,
            "meta": node.meta,
            "type": node.type,
            "type_name": node.type_name,
            "type_emoji": node.type_emoji,
            "name": node.name,
            "pressure": round(node.pressure, 4),
            **node.get_state(),
        },
        message=f"노드 {node_id}"
    )


@router.get("/domains")
async def get_domains():
    """16개 도메인"""
    sim = get_simulator()
    domains = []
    for key, info in DOMAIN_INFO.items():
        pressure = sim.get_domain_pressure(key)
        state = get_pressure_state(pressure)
        domains.append({
            "id": key,
            **info,
            "pressure": round(pressure, 4),
            **state,
        })
    return Response(
        data={"total": len(domains), "domains": domains},
        message="16개 도메인"
    )


@router.get("/meta")
async def get_meta():
    """4개 메타 카테고리"""
    sim = get_simulator()
    meta = []
    for key, info in META_INFO.items():
        pressure = sim.get_meta_pressure(key)
        state = get_pressure_state(pressure)
        meta.append({
            "id": key,
            **info,
            "pressure": round(pressure, 4),
            **state,
        })
    return Response(
        data={"total": len(meta), "meta": meta},
        message="4개 메타 카테고리"
    )


@router.get("/regions")
async def get_regions():
    """지역별 통계"""
    sim = get_simulator()
    regions = sim.get_regional_stats()
    return Response(
        data={"total": len(regions), "regions": regions},
        message="지역별 통계"
    )


@router.get("/archetypes")
async def get_archetypes():
    """아키타입 분포"""
    sim = get_simulator()
    return Response(
        data={
            "core": list(CORE_INFO.values()),
            "roles": list(ROLE_INFO.values()),
            "combinations": ARCHETYPE_COMBINATIONS,
            "distribution": sim.get_archetype_distribution(),
        },
        message="아키타입 분포"
    )


@router.get("/onboarding")
async def get_onboarding():
    """온보딩 플로우"""
    return Response(
        data={
            "steps": [
                {
                    "step": 1,
                    "question": "지금 당신의 주된 상태는?",
                    "type": "single",
                    "options": [
                        {"id": k, "label": f"{v['emoji']} {v['name']}"} 
                        for k, v in CORE_INFO.items()
                    ],
                },
                {
                    "step": 2,
                    "question": "추가로 해당되는 역할이 있나요?",
                    "type": "multi",
                    "max_select": 2,
                    "options": [
                        {"id": k, "label": f"{v['emoji']} {v['name']}"} 
                        for k, v in ROLE_INFO.items()
                    ] + [{"id": None, "label": "⬜ 해당 없음"}],
                },
            ],
        },
        message="온보딩 플로우"
    )


@router.post("/profile")
async def create_profile(request: ProfileRequest):
    """프로필 생성"""
    if request.core not in CORE_INFO:
        raise HTTPException(status_code=400, detail=f"Invalid core: {request.core}")
    
    sim = get_simulator()
    profile = sim.create_profile(request.core, request.roles)
    
    if "error" in profile:
        raise HTTPException(status_code=400, detail=profile["error"])
    
    return Response(
        data={
            **profile,
            "sync_number_formatted": format_number(profile["sync_number"]),
            "message": f"당신은 {format_number(profile['sync_number'])}번째로 동기화되었습니다",
        },
        message=f"프로필: {profile['display_name']}"
    )


@router.get("/stats")
async def get_stats():
    """글로벌 통계"""
    sim = get_simulator()
    return Response(
        data={
            "total_synced": sim.get_total_synced(),
            "active_now": sim.get_active_users(),
            "resonance": sim.get_resonance(),
            "sync_per_second": round(sim.get_sync_per_second(), 2),
        },
        message="글로벌 통계"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = ["router"]
