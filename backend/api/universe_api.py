"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS Universe API v3.0 (유니버스 API)
═══════════════════════════════════════════════════════════════════════════════

80억 인류의 살아있는 우주를 위한 API

엔드포인트:
- GET /universe/snapshot: 전체 상태 스냅샷
- GET /universe/archetypes: 10개 아키타입 정보
- POST /universe/onboarding: 온보딩 아키타입 매칭
- GET /universe/sync-number: 동기화 번호 생성

"5%의 완벽한 틀이 100%의 살아있는 우주를 만든다"
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Archetype imports
from archetypes.global_simulator import (
    GlobalSimulator,
    ArchetypeMatcher,
    get_global_simulator,
    ARCHETYPES,
    REGIONS,
    NODES,
    GLOBAL_POPULATION,
)
from archetypes import ARCHETYPES_DATA


router = APIRouter(prefix="/universe", tags=["Universe"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class OnboardingAnswer(BaseModel):
    """온보딩 응답"""
    archetypes: Dict[str, float] = Field(..., description="아키타입 가중치")


class OnboardingRequest(BaseModel):
    """온보딩 요청"""
    answers: List[OnboardingAnswer] = Field(..., min_items=3, max_items=3, description="3개 질문 응답")


class UserArchetypeResult(BaseModel):
    """사용자 아키타입 결과"""
    sync_number: int
    archetypes: List[Dict]
    message: str


# ═══════════════════════════════════════════════════════════════════════════════
# Universe Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/snapshot")
async def get_universe_snapshot():
    """
    🌍 전체 우주 상태 스냅샷
    
    실시간 글로벌 동기화 상태를 반환합니다.
    """
    simulator = get_global_simulator()
    snapshot = simulator.get_snapshot()
    
    return {
        "success": True,
        "snapshot": snapshot,
    }


@router.get("/live")
async def get_live_stats():
    """
    ⚡ 실시간 통계 (경량)
    
    대시보드 업데이트용 경량 데이터
    """
    simulator = get_global_simulator()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "stats": {
            "total_synced": simulator.get_live_sync_count(),
            "active_now": simulator.get_active_users(),
            "resonance": simulator.get_resonance_value(),
            "sync_per_second": round(simulator.get_sync_per_second(), 2),
        },
    }


@router.get("/regions")
async def get_regional_stats():
    """
    🌐 지역별 통계
    """
    simulator = get_global_simulator()
    
    return {
        "success": True,
        "regions": simulator.get_regional_sync(),
        "total_population": GLOBAL_POPULATION,
    }


@router.get("/nodes")
async def get_node_pressures():
    """
    📊 노드별 압력 현황
    """
    simulator = get_global_simulator()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "nodes": {
            node_id: {
                **node_data,
                "pressure": round(simulator.get_global_node_pressure(node_id), 4),
            }
            for node_id, node_data in NODES.items()
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Archetype Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/archetypes")
async def get_archetypes():
    """
    🎭 10개 아키타입 정보
    """
    simulator = get_global_simulator()
    
    return {
        "success": True,
        "archetypes": simulator.get_archetype_distribution(),
        "total": GLOBAL_POPULATION,
        "definition": ARCHETYPES_DATA,
    }


@router.get("/archetypes/{archetype_id}")
async def get_archetype_detail(archetype_id: str):
    """
    🔍 개별 아키타입 상세 정보
    """
    archetype = None
    for arch in ARCHETYPES_DATA["archetypes"]:
        if arch["id"] == archetype_id:
            archetype = arch
            break
    
    if not archetype:
        raise HTTPException(status_code=404, detail=f"Archetype {archetype_id} not found")
    
    simulator = get_global_simulator()
    synced_count = int(simulator.get_live_sync_count() * archetype["population_ratio"])
    
    return {
        "success": True,
        "archetype": archetype,
        "synced_count": synced_count,
        "global_count": int(GLOBAL_POPULATION * archetype["population_ratio"]),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Onboarding Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/onboarding/questions")
async def get_onboarding_questions():
    """
    ❓ 온보딩 질문 목록
    
    3개의 질문으로 아키타입 조합을 결정합니다.
    """
    return {
        "success": True,
        "questions": ArchetypeMatcher.get_questions(),
        "instruction": "각 질문에 하나의 옵션을 선택하세요. 선택한 옵션의 archetypes를 answers 배열에 담아 POST /universe/onboarding으로 보내세요.",
    }


@router.post("/onboarding")
async def complete_onboarding(request: OnboardingRequest):
    """
    🎯 온보딩 완료 - 아키타입 매칭
    
    3개의 응답을 기반으로 아키타입 조합을 계산합니다.
    """
    simulator = get_global_simulator()
    
    # 응답 변환
    answers = [{"archetypes": a.archetypes} for a in request.answers]
    
    # 아키타입 계산
    user_archetypes = ArchetypeMatcher.calculate_archetypes(answers)
    
    # 동기화 번호 생성
    sync_number = ArchetypeMatcher.generate_sync_number(simulator)
    
    # 조합 설명 생성
    archetype_names = [f"{a['emoji']} {a['name']}({a['weight']})" for a in user_archetypes]
    message = f"당신은 {' + '.join(archetype_names)} 조합입니다"
    
    return {
        "success": True,
        "result": {
            "sync_number": sync_number,
            "archetypes": user_archetypes,
            "message": message,
        },
        "welcome": f"🌌 당신은 {sync_number:,}번째로 AUTUS Universe에 동기화되었습니다!",
    }


@router.get("/sync-number")
async def get_next_sync_number():
    """
    🔢 다음 동기화 번호 조회
    """
    simulator = get_global_simulator()
    next_number = simulator.get_live_sync_count() + 1
    
    return {
        "success": True,
        "next_sync_number": next_number,
        "message": f"다음 사용자는 {next_number:,}번째로 동기화됩니다",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/constants")
async def get_universe_constants():
    """
    📐 유니버스 상수 정보
    """
    return {
        "success": True,
        "constants": {
            "global_population": GLOBAL_POPULATION,
            "regions": {
                name: {
                    "population": data["population"],
                    "timezone_offset": data["timezone_offset"],
                    "flag": data["flag"],
                }
                for name, data in REGIONS.items()
            },
            "archetypes": {
                aid: {
                    "name": data["name"],
                    "emoji": data["emoji"],
                    "ratio": data["ratio"],
                    "count": int(GLOBAL_POPULATION * data["ratio"]),
                }
                for aid, data in ARCHETYPES.items()
            },
            "nodes": {
                nid: {
                    "name": data["name"],
                    "layer": data["layer"],
                }
                for nid, data in NODES.items()
            },
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def universe_health():
    """
    💚 유니버스 헬스 체크
    """
    simulator = get_global_simulator()
    
    return {
        "status": "healthy",
        "service": "AUTUS Living Universe",
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "total_synced": simulator.get_live_sync_count(),
            "resonance": simulator.get_resonance_value(),
            "archetypes_count": len(ARCHETYPES),
            "regions_count": len(REGIONS),
            "nodes_count": len(NODES),
        },
    }
