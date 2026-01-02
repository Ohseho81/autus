#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()


















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()








#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK API - Human Network Endpoints                         ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 관계 네트워크 조회                                                                     ║
║  ✅ PageRank 영향력 계산                                                                   ║
║  ✅ 여왕벌(Hub) 탐지                                                                       ║
║  ✅ 이탈 영향 시뮬레이션                                                                   ║
║  ✅ 시너지(S) 점수 계산                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# 엔진 임포트
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.human_network_engine import (
    HumanNetworkEngine,
    Person,
    Relationship,
    RelationType,
    GroupActivity,
    create_test_network,
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1/network", tags=["Human Network"])

# 전역 엔진 인스턴스 (실제로는 DB와 연동)
_engine: Optional[HumanNetworkEngine] = None


def get_engine() -> HumanNetworkEngine:
    """엔진 인스턴스 가져오기 (싱글톤)"""
    global _engine
    if _engine is None:
        _engine = create_test_network()  # 데모 데이터로 초기화
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PersonCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    name: str = Field(..., description="이름")
    phone: str = Field("", description="전화번호")
    m_score: float = Field(0, description="매출 점수")
    t_score: float = Field(0, description="리스크 점수")
    total_spent: int = Field(0, description="총 매출")
    is_vip: bool = Field(False, description="VIP 여부")
    is_risk: bool = Field(False, description="주의 고객 여부")


class RelationshipCreate(BaseModel):
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    rel_type: str = Field(..., description="관계 유형 (FAMILY, REFERRAL, FRIEND, GROUP, COUPLE)")
    strength: float = Field(1.0, ge=1, le=5, description="관계 강도 (1~5)")


class ActivityCreate(BaseModel):
    activity_id: str = Field(..., description="활동 ID")
    members: List[str] = Field(..., description="참여자 ID 목록")
    station_id: str = Field(..., description="매장 ID")
    activity_type: str = Field(..., description="활동 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def network_overview():
    """네트워크 개요"""
    engine = get_engine()
    stats = engine.get_stats()
    
    return {
        "status": "online",
        "version": "2.0",
        "stats": stats,
        "endpoints": [
            "/api/v1/network/persons",
            "/api/v1/network/relationships",
            "/api/v1/network/pagerank",
            "/api/v1/network/queen-bees",
            "/api/v1/network/churn-impact/{user_id}",
            "/api/v1/network/synergy/{user_id}",
            "/api/v1/network/graph",
        ]
    }


# ─── 사람(노드) 관리 ───

@router.get("/persons")
async def list_persons(limit: int = Query(50, ge=1, le=200)):
    """사람 목록 조회"""
    engine = get_engine()
    
    persons = [p.to_dict() for p in engine.persons.values()][:limit]
    
    return {
        "count": len(persons),
        "persons": persons,
    }


@router.get("/persons/{user_id}")
async def get_person(user_id: str):
    """사람 상세 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    person = engine.persons[user_id]
    connections = engine.get_hub_connections(user_id)
    synergy = engine.calculate_synergy(user_id)
    
    return {
        "person": person.to_dict(),
        "connections": connections,
        "synergy": synergy,
    }


@router.post("/persons")
async def create_person(data: PersonCreate):
    """사람 추가"""
    engine = get_engine()
    
    if data.user_id in engine.persons:
        raise HTTPException(status_code=400, detail="Person already exists")
    
    person = Person(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        m_score=data.m_score,
        t_score=data.t_score,
        total_spent=data.total_spent,
        is_vip=data.is_vip,
        is_risk=data.is_risk,
    )
    
    engine.add_person(person)
    
    return {"status": "created", "person": person.to_dict()}


# ─── 관계(엣지) 관리 ───

@router.get("/relationships")
async def list_relationships(limit: int = Query(100, ge=1, le=500)):
    """관계 목록 조회"""
    engine = get_engine()
    
    relationships = [
        {
            "source_id": r.source_id,
            "target_id": r.target_id,
            "rel_type": r.rel_type.value,
            "strength": r.strength,
            "weight": r.weight,
        }
        for r in engine.relationships[:limit]
    ]
    
    return {
        "count": len(relationships),
        "relationships": relationships,
    }


@router.post("/relationships")
async def create_relationship(data: RelationshipCreate):
    """관계 추가"""
    engine = get_engine()
    
    # 유효성 검사
    if data.source_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Source person '{data.source_id}' not found")
    if data.target_id not in engine.persons:
        raise HTTPException(status_code=400, detail=f"Target person '{data.target_id}' not found")
    
    try:
        rel_type = RelationType(data.rel_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relation type: {data.rel_type}")
    
    relationship = Relationship(
        source_id=data.source_id,
        target_id=data.target_id,
        rel_type=rel_type,
        strength=data.strength,
        created_at=datetime.now().isoformat(),
    )
    
    engine.add_relationship(relationship)
    
    return {"status": "created", "weight": relationship.weight}


# ─── 분석 API ───

@router.get("/pagerank")
async def get_pagerank():
    """PageRank 영향력 순위"""
    engine = get_engine()
    pagerank = engine.calculate_pagerank()
    
    # 정렬된 결과
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for uid, score in sorted_pr:
        person = engine.persons.get(uid)
        results.append({
            "user_id": uid,
            "name": person.name if person else "Unknown",
            "pagerank": round(score, 2),
            "is_vip": person.is_vip if person else False,
        })
    
    return {
        "count": len(results),
        "ranking": results,
    }


@router.get("/queen-bees")
async def get_queen_bees(top_n: int = Query(10, ge=1, le=50)):
    """여왕벌(영향력자) 탐지"""
    engine = get_engine()
    queens = engine.find_queen_bees(top_n)
    
    results = []
    for i, (person, score) in enumerate(queens, 1):
        connections = len(engine.adjacency.get(person.user_id, []))
        results.append({
            "rank": i,
            "user_id": person.user_id,
            "name": person.name,
            "influence_score": round(score, 2),
            "connections": connections,
            "total_spent": person.total_spent,
            "is_vip": person.is_vip,
            "strategy": f"이 사람에게 단체 혜택을 주면 {connections}명이 따라옵니다." if connections > 0 else None,
        })
    
    return {
        "count": len(results),
        "queen_bees": results,
    }


@router.get("/synergy/{user_id}")
async def get_synergy(user_id: str):
    """시너지(S) 점수 조회"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    synergy = engine.calculate_synergy(user_id)
    person = engine.persons[user_id]
    
    return {
        "user_id": user_id,
        "name": person.name,
        "synergy": synergy,
        "components": {
            "s_blood": {"score": synergy["s_blood"], "description": "가족 관계 점수"},
            "s_referral": {"score": synergy["s_referral"], "description": "소개 기여 점수"},
            "s_group": {"score": synergy["s_group"], "description": "그룹 활동 점수"},
        }
    }


@router.get("/churn-impact/{user_id}")
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    engine = get_engine()
    
    if user_id not in engine.persons:
        raise HTTPException(status_code=404, detail="Person not found")
    
    impact = engine.simulate_churn_impact(user_id)
    
    return impact


@router.get("/clusters")
async def get_clusters(min_size: int = Query(3, ge=2, le=20)):
    """클러스터(커뮤니티) 탐지"""
    engine = get_engine()
    clusters = engine.detect_clusters(min_size)
    
    results = []
    for cluster in clusters:
        hub_person = engine.persons.get(cluster.hub_id)
        results.append({
            "cluster_id": cluster.cluster_id,
            "name": cluster.name,
            "member_count": len(cluster.members),
            "members": cluster.members,
            "hub": {
                "user_id": cluster.hub_id,
                "name": hub_person.name if hub_person else "Unknown",
            },
            "total_value": cluster.total_value,
            "cohesion": round(cluster.cohesion, 3),
        })
    
    return {
        "count": len(results),
        "clusters": results,
    }


@router.get("/graph")
async def get_graph_data():
    """시각화용 그래프 데이터"""
    engine = get_engine()
    
    # PageRank 계산 (노드 크기용)
    engine.calculate_pagerank()
    
    return engine.export_graph_data()


# ─── 그룹 활동 ───

@router.post("/activities")
async def create_activity(data: ActivityCreate):
    """그룹 활동 추가"""
    engine = get_engine()
    
    # 멤버 유효성 검사
    for member_id in data.members:
        if member_id not in engine.persons:
            raise HTTPException(status_code=400, detail=f"Member '{member_id}' not found")
    
    activity = GroupActivity(
        activity_id=data.activity_id,
        members=data.members,
        station_id=data.station_id,
        activity_type=data.activity_type,
        timestamp=datetime.now().isoformat(),
    )
    
    engine.add_activity(activity)
    
    return {
        "status": "created",
        "activity_id": data.activity_id,
        "auto_relationships": len(data.members) * (len(data.members) - 1) // 2,
    }


# ─── 유틸리티 ───

@router.post("/reset")
async def reset_network():
    """네트워크 초기화 (데모 데이터로 리셋)"""
    global _engine
    _engine = create_test_network()
    
    return {"status": "reset", "message": "Network reset to demo data"}


@router.get("/stats")
async def get_stats():
    """네트워크 통계"""
    engine = get_engine()
    return engine.get_stats()























