"""
AUTUS Collection API
=====================

데이터 수집 경로 체계 API

Endpoints:
- GET  /collection/summary          - 수집 체계 요약
- GET  /collection/channels         - 채널 목록
- GET  /collection/domains          - 도메인 목록
- GET  /collection/sources          - 소스 카탈로그
- GET  /collection/source/{id}      - 소스 상세
- GET  /collection/node/{node_id}   - 노드별 소스
- GET  /collection/setup            - 추천 초기 설정
- GET  /collection/priority         - 수집 우선순위
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collection import (
    CHANNELS,
    DOMAINS,
    SOURCE_CATALOG,
    COLLECTION_PRIORITY,
    get_node_sources,
    get_domain_sources,
    get_channel_sources,
    get_recommended_setup,
    get_collection_summary,
)


# ============================================
# Router
# ============================================

router = APIRouter(prefix="/collection", tags=["Data Collection"])


# ============================================
# Summary Endpoints
# ============================================

@router.get("/summary")
async def get_summary():
    """수집 체계 요약"""
    return get_collection_summary()


@router.get("/priority")
async def get_priority():
    """수집 우선순위"""
    return {
        "priority_levels": COLLECTION_PRIORITY,
        "description": {
            "critical": "반드시 수집 (생존 필수)",
            "important": "주기적 수집 (성장 필수)",
            "supportive": "가능하면 수집 (인사이트)",
            "optional": "있으면 좋음 (상세 분석)",
        },
    }


# ============================================
# Channel Endpoints
# ============================================

@router.get("/channels")
async def list_channels():
    """채널 목록"""
    channels = []
    for ch_id, ch in CHANNELS.items():
        channels.append({
            "id": ch_id,
            **ch.to_dict(),
            "source_count": len(get_channel_sources(ch_id)),
        })
    
    return {
        "count": len(channels),
        "channels": channels,
    }


@router.get("/channel/{channel_id}")
async def get_channel_detail(channel_id: str):
    """채널 상세"""
    if channel_id not in CHANNELS:
        raise HTTPException(status_code=404, detail=f"Channel '{channel_id}' not found")
    
    ch = CHANNELS[channel_id]
    sources = get_channel_sources(channel_id)
    
    return {
        "id": channel_id,
        **ch.to_dict(),
        "sources": sources,
    }


# ============================================
# Domain Endpoints
# ============================================

@router.get("/domains")
async def list_domains():
    """도메인 목록"""
    domains = []
    for dm_id, dm in DOMAINS.items():
        domains.append({
            "id": dm_id,
            **dm.to_dict(),
            "source_count": len(get_domain_sources(dm_id)),
        })
    
    return {
        "count": len(domains),
        "domains": domains,
    }


@router.get("/domain/{domain_id}")
async def get_domain_detail(domain_id: str):
    """도메인 상세"""
    if domain_id not in DOMAINS:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_id}' not found")
    
    dm = DOMAINS[domain_id]
    sources = get_domain_sources(domain_id)
    
    return {
        "id": domain_id,
        **dm.to_dict(),
        "sources": sources,
    }


# ============================================
# Source Endpoints
# ============================================

@router.get("/sources")
async def list_sources(
    channel: Optional[str] = None,
    domain: Optional[str] = None,
    effort: Optional[str] = None,
):
    """소스 카탈로그"""
    sources = []
    
    for src_id, src in SOURCE_CATALOG.items():
        # 필터링
        if channel and src.channel != channel:
            continue
        if domain and domain not in src.domain:
            continue
        if effort and src.setup_effort != effort:
            continue
        
        sources.append({
            "id": src_id,
            **src.to_dict(),
        })
    
    return {
        "count": len(sources),
        "sources": sources,
        "filters": {
            "channel": channel,
            "domain": domain,
            "effort": effort,
        },
    }


@router.get("/source/{source_id}")
async def get_source_detail(source_id: str):
    """소스 상세"""
    if source_id not in SOURCE_CATALOG:
        raise HTTPException(status_code=404, detail=f"Source '{source_id}' not found")
    
    src = SOURCE_CATALOG[source_id]
    
    # 채널 정보
    channel_info = None
    if src.channel in CHANNELS:
        ch = CHANNELS[src.channel]
        channel_info = {"id": src.channel, "name": ch.name_ko}
    
    # 도메인 정보
    domain_info = []
    for dm_id in src.domain.split(","):
        dm_id = dm_id.strip()
        if dm_id in DOMAINS:
            domain_info.append({"id": dm_id, "name": DOMAINS[dm_id].name_ko})
    
    return {
        "id": source_id,
        **src.to_dict(),
        "channel_info": channel_info,
        "domain_info": domain_info,
    }


# ============================================
# Node-based Endpoints
# ============================================

@router.get("/node/{node_id}")
async def get_node_collection_paths(node_id: str):
    """노드별 수집 경로"""
    sources = get_node_sources(node_id)
    
    if not sources:
        return {
            "node_id": node_id,
            "sources": [],
            "message": "이 노드에 대한 수집 경로가 없습니다",
        }
    
    # 채널별 그룹화
    by_channel = {}
    for src in sources:
        ch = src["channel"]
        if ch not in by_channel:
            by_channel[ch] = []
        by_channel[ch].append(src)
    
    return {
        "node_id": node_id,
        "source_count": len(sources),
        "sources": sources,
        "by_channel": by_channel,
    }


@router.get("/nodes/coverage")
async def get_node_coverage():
    """노드별 커버리지"""
    coverage = {}
    
    for src_id, src in SOURCE_CATALOG.items():
        for node in src.provides_nodes:
            if node not in coverage:
                coverage[node] = {"sources": [], "count": 0}
            coverage[node]["sources"].append(src_id)
            coverage[node]["count"] += 1
    
    # 정렬
    sorted_coverage = dict(sorted(
        coverage.items(),
        key=lambda x: x[1]["count"],
        reverse=True
    ))
    
    return {
        "total_nodes": len(coverage),
        "coverage": sorted_coverage,
    }


# ============================================
# Setup Endpoints
# ============================================

@router.get("/setup")
async def get_setup_recommendations():
    """추천 초기 설정"""
    setup = get_recommended_setup()
    
    # 상세 정보 추가
    for level in ["essential", "recommended", "advanced"]:
        for item in setup[level]:
            src_id = item["source"]
            if src_id in SOURCE_CATALOG:
                src = SOURCE_CATALOG[src_id]
                item["name"] = src.name_ko
                item["channel"] = src.channel
                item["effort"] = src.setup_effort
                item["nodes"] = src.provides_nodes[:5]
    
    return {
        "setup": setup,
        "description": {
            "essential": "최소 설정 (3개 소스)",
            "recommended": "권장 설정 (6개 소스)",
            "advanced": "고급 설정 (9개 소스)",
        },
    }


@router.get("/setup/quick")
async def get_quick_setup():
    """빠른 시작 설정"""
    return {
        "steps": [
            {
                "step": 1,
                "action": "일일 로그 시작",
                "source": "S001",
                "description": "매일 핵심 지표 입력",
                "nodes": ["n01", "n09", "n10", "n41"],
                "effort": "5분/일",
            },
            {
                "step": 2,
                "action": "은행 명세서 업로드",
                "source": "S010",
                "description": "재무 데이터 자동 추출",
                "nodes": ["n01", "n09", "n10", "n53"],
                "effort": "10분/월",
            },
            {
                "step": 3,
                "action": "캘린더 연동",
                "source": "S020",
                "description": "일정 자동 추적",
                "nodes": ["n06", "n15", "n44"],
                "effort": "5분 (1회)",
            },
        ],
        "estimated_time": "20분",
        "coverage": "핵심 노드 70% 커버",
    }


# ============================================
# Integration Status
# ============================================

@router.get("/integrations")
async def list_integrations():
    """연동 가능한 서비스"""
    api_sources = []
    
    for src_id, src in SOURCE_CATALOG.items():
        if src.channel == "C3":  # API 연동만
            api_sources.append({
                "id": src_id,
                "name": src.name_ko,
                "integration_type": src.integration_type,
                "effort": src.setup_effort,
                "nodes_count": len(src.provides_nodes),
                "available": src.available,
            })
    
    return {
        "count": len(api_sources),
        "integrations": api_sources,
        "by_type": {
            "oauth": len([s for s in api_sources if s["integration_type"] == "oauth"]),
            "api_key": len([s for s in api_sources if s["integration_type"] == "api_key"]),
        },
    }
