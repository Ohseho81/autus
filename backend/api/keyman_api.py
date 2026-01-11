"""
AUTUS Keyman API

KI = C × 0.30 + F × 0.50 + RV × 0.20

Keyman 유형:
- Hub: 연결수 Top 10%
- Sink: 유입 Top 10%
- Source: 유출 Top 10%
- Broker: Hub AND (Sink OR Source)
- Bottleneck: 제거 시 영향도 > 0.3
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from engine.keyman_engine import (
    KeymanEngine,
    KeymanScore,
    KeymanType,
    create_keyman_engine,
)
from engine.person_model import PersonRegistry, Person, PsiVector, Sector
from engine.params_loader import SovereignParams

router = APIRouter(prefix="/api/keyman", tags=["keyman"])

# ═══════════════════════════════════════════════════════════════
# 글로벌 상태
# ═══════════════════════════════════════════════════════════════

_engine: Optional[KeymanEngine] = None
_last_calculated: Optional[datetime] = None


def get_engine() -> KeymanEngine:
    """Engine 조회 (없으면 샘플 생성)"""
    global _engine, _last_calculated
    if _engine is None:
        registry, motions = create_sample_data()
        _engine = create_keyman_engine(registry, motions=motions)
        _engine.calculate_all_ki()
        _last_calculated = datetime.now()
    return _engine


def create_sample_data():
    """테스트용 샘플 데이터"""
    registry = PersonRegistry()
    
    # Physics Map 스타일 샘플 노드
    samples = [
        # T0 Sovereign급
        {"id": "xi", "name": "Xi Jinping", "sector": "government", "rv": 20e12},
        {"id": "trump", "name": "Donald Trump", "sector": "government", "rv": 8e12},
        {"id": "powell", "name": "Jerome Powell", "sector": "central_bank", "rv": 9e12},
        {"id": "kuroda", "name": "Haruhiko Kuroda", "sector": "central_bank", "rv": 5e12},
        {"id": "lagarde", "name": "Christine Lagarde", "sector": "central_bank", "rv": 7e12},
        
        # T1 Archon급 - Finance
        {"id": "fink", "name": "Larry Fink", "sector": "finance", "rv": 500e9},
        {"id": "dimon", "name": "Jamie Dimon", "sector": "finance", "rv": 400e9},
        {"id": "buffett", "name": "Warren Buffett", "sector": "finance", "rv": 350e9},
        {"id": "soros", "name": "George Soros", "sector": "finance", "rv": 250e9},
        
        # T1 - Royal/SWF
        {"id": "mbs", "name": "Mohammed bin Salman", "sector": "royal", "rv": 700e9},
        {"id": "cic", "name": "CIC (China)", "sector": "finance", "rv": 1.2e12},
        {"id": "gic", "name": "GIC (Singapore)", "sector": "finance", "rv": 700e9},
        {"id": "adia", "name": "ADIA (Abu Dhabi)", "sector": "finance", "rv": 900e9},
        
        # T2 Validator급 - Tech
        {"id": "cook", "name": "Tim Cook", "sector": "tech", "rv": 100e9},
        {"id": "nadella", "name": "Satya Nadella", "sector": "tech", "rv": 80e9},
        {"id": "pichai", "name": "Sundar Pichai", "sector": "tech", "rv": 60e9},
        {"id": "zuckerberg", "name": "Mark Zuckerberg", "sector": "tech", "rv": 120e9},
        {"id": "musk", "name": "Elon Musk", "sector": "tech", "rv": 250e9},
        {"id": "huang", "name": "Jensen Huang", "sector": "tech", "rv": 70e9},
        
        # T3 Operator급
        {"id": "son", "name": "Masayoshi Son", "sector": "finance", "rv": 20e9},
        {"id": "ma", "name": "Jack Ma", "sector": "tech", "rv": 30e9},
        {"id": "bezos", "name": "Jeff Bezos", "sector": "tech", "rv": 150e9},
        {"id": "jobs_estate", "name": "Jobs Estate", "sector": "tech", "rv": 25e9},
    ]
    
    for s in samples:
        try:
            sector = Sector(s.get("sector", "other"))
        except ValueError:
            sector = Sector.OTHER
            
        person = Person(
            id=s["id"],
            name=s["name"],
            sector=sector,
            rv=s.get("rv", 0),
        )
        registry.add(person)
    
    # 모션 데이터 (자금 흐름)
    motions = [
        # T0 간 거래
        {"source": "xi", "target": "trump", "amount": 500e9},
        {"source": "xi", "target": "powell", "amount": 300e9},
        {"source": "trump", "target": "powell", "amount": 200e9},
        {"source": "powell", "target": "lagarde", "amount": 150e9},
        {"source": "lagarde", "target": "kuroda", "amount": 100e9},
        
        # T0 → T1 Finance
        {"source": "powell", "target": "fink", "amount": 400e9},
        {"source": "powell", "target": "dimon", "amount": 350e9},
        {"source": "lagarde", "target": "fink", "amount": 200e9},
        {"source": "kuroda", "target": "buffett", "amount": 100e9},
        
        # T1 Finance 간
        {"source": "fink", "target": "dimon", "amount": 80e9},
        {"source": "fink", "target": "buffett", "amount": 60e9},
        {"source": "dimon", "target": "soros", "amount": 40e9},
        {"source": "buffett", "target": "soros", "amount": 30e9},
        
        # SWF 네트워크
        {"source": "mbs", "target": "fink", "amount": 100e9},
        {"source": "mbs", "target": "musk", "amount": 50e9},
        {"source": "cic", "target": "fink", "amount": 150e9},
        {"source": "cic", "target": "cook", "amount": 80e9},
        {"source": "gic", "target": "nadella", "amount": 60e9},
        {"source": "adia", "target": "buffett", "amount": 90e9},
        {"source": "adia", "target": "bezos", "amount": 70e9},
        
        # T1 → T2 Tech
        {"source": "fink", "target": "cook", "amount": 150e9},
        {"source": "fink", "target": "nadella", "amount": 120e9},
        {"source": "fink", "target": "pichai", "amount": 100e9},
        {"source": "fink", "target": "zuckerberg", "amount": 90e9},
        {"source": "fink", "target": "musk", "amount": 200e9},
        {"source": "fink", "target": "huang", "amount": 80e9},
        {"source": "dimon", "target": "cook", "amount": 80e9},
        {"source": "buffett", "target": "cook", "amount": 70e9},
        
        # Tech 간
        {"source": "cook", "target": "nadella", "amount": 30e9},
        {"source": "nadella", "target": "huang", "amount": 50e9},
        {"source": "pichai", "target": "huang", "amount": 40e9},
        {"source": "musk", "target": "huang", "amount": 60e9},
        {"source": "zuckerberg", "target": "nadella", "amount": 25e9},
        {"source": "bezos", "target": "huang", "amount": 35e9},
        
        # T3
        {"source": "son", "target": "ma", "amount": 20e9},
        {"source": "son", "target": "fink", "amount": 15e9},
        {"source": "ma", "target": "fink", "amount": 10e9},
        {"source": "bezos", "target": "fink", "amount": 50e9},
    ]
    
    # 연결 추가
    for motion in motions:
        registry.add_connection(motion["source"], motion["target"], 0.5)
    
    registry.calculate_eigenvector_centrality()
    
    return registry, motions


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class KeymanItem(BaseModel):
    person_id: str
    name: str
    sector: str
    ki_score: float
    ki_rank: int
    connections: int
    total_flow: float
    real_value: float
    keyman_types: List[str]
    network_impact: float


class TopKeymanResponse(BaseModel):
    total: int
    keyman: List[KeymanItem]
    calculated_at: str


class KeymanDetailResponse(BaseModel):
    person_id: str
    name: str
    sector: str
    ki_score: float
    ki_rank: int
    connections: int
    total_flow: float
    inflow: float
    outflow: float
    real_value: float
    c_norm: float
    f_norm: float
    rv_norm: float
    keyman_types: List[str]
    network_impact: float
    unique_partners: int
    top_partners: List
    formula: str
    calculation: str


class ImpactResponse(BaseModel):
    person_id: str
    name: str
    network_impact: float
    broken_connections: int
    broken_with: List[str]
    isolated_nodes: List[str]
    flow_impact: Dict
    keyman_types: List[str]
    impact_rating: str


class PathBottleneckResponse(BaseModel):
    source: str
    target: str
    bottleneck_nodes: List[str]
    path_count: int
    critical_level: str


class RemovalSimulationRequest(BaseModel):
    person_id: str


class RemovalSimulationResponse(BaseModel):
    removed_person: Dict
    broken_connections: int
    broken_with: List[str]
    isolated_nodes: List[str]
    flow_impact: Dict
    network_impact: float
    keyman_types: List[str]
    recommendation: str


# ═══════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════

@router.get("/formula")
async def get_formula():
    """KI 수식 설명"""
    engine = get_engine()
    return engine.get_formula_explanation()


@router.get("/top/{n}", response_model=TopKeymanResponse)
async def get_top_keyman(n: int = 20):
    """
    TOP N KEYMAN
    
    KI = C × 0.30 + F × 0.50 + RV × 0.20
    """
    engine = get_engine()
    top = engine.get_top_keyman(n)
    
    items = [
        KeymanItem(
            person_id=ks.person_id,
            name=ks.name,
            sector=ks.sector,
            ki_score=round(ks.ki_score, 4),
            ki_rank=ks.ki_rank,
            connections=ks.connections,
            total_flow=ks.total_flow,
            real_value=round(ks.real_value, 4),
            keyman_types=ks.keyman_types,
            network_impact=round(ks.network_impact, 4),
        )
        for ks in top
    ]
    
    return TopKeymanResponse(
        total=len(items),
        keyman=items,
        calculated_at=_last_calculated.isoformat() if _last_calculated else "",
    )


@router.get("/{person_id}", response_model=KeymanDetailResponse)
async def get_keyman_detail(person_id: str):
    """개인 KI 상세"""
    engine = get_engine()
    ks = engine.get_keyman_score(person_id)
    
    if not ks:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    
    # 계산 과정
    calc_str = (
        f"KI = {ks.c_norm:.4f} × 0.30 + {ks.f_norm:.4f} × 0.50 + {ks.rv_norm:.4f} × 0.20 "
        f"= {ks.c_norm * 0.30:.4f} + {ks.f_norm * 0.50:.4f} + {ks.rv_norm * 0.20:.4f} "
        f"= {ks.ki_score:.4f}"
    )
    
    return KeymanDetailResponse(
        person_id=ks.person_id,
        name=ks.name,
        sector=ks.sector,
        ki_score=round(ks.ki_score, 4),
        ki_rank=ks.ki_rank,
        connections=ks.connections,
        total_flow=ks.total_flow,
        inflow=ks.inflow,
        outflow=ks.outflow,
        real_value=round(ks.real_value, 4),
        c_norm=round(ks.c_norm, 4),
        f_norm=round(ks.f_norm, 4),
        rv_norm=round(ks.rv_norm, 4),
        keyman_types=ks.keyman_types,
        network_impact=round(ks.network_impact, 4),
        unique_partners=ks.unique_partners,
        top_partners=[(p, round(f, 2)) for p, f in ks.top_partners[:5]],
        formula="KI = C × 0.30 + F × 0.50 + RV × 0.20",
        calculation=calc_str,
    )


@router.get("/{person_id}/impact", response_model=ImpactResponse)
async def get_keyman_impact(person_id: str):
    """제거 시 영향도"""
    engine = get_engine()
    result = engine.simulate_removal(person_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    # 영향도 등급
    impact = result.get("network_impact", 0)
    if impact >= 0.5:
        rating = "Critical"
    elif impact >= 0.3:
        rating = "High"
    elif impact >= 0.1:
        rating = "Medium"
    else:
        rating = "Low"
    
    return ImpactResponse(
        person_id=person_id,
        name=result["removed_person"]["name"],
        network_impact=round(impact, 4),
        broken_connections=result["broken_connections"],
        broken_with=result["broken_with"],
        isolated_nodes=result["isolated_nodes"],
        flow_impact=result["flow_impact"],
        keyman_types=result.get("keyman_types", []),
        impact_rating=rating,
    )


@router.get("/type/{keyman_type}")
async def get_by_type(keyman_type: str):
    """
    유형별 Keyman
    
    유형: Hub, Sink, Source, Broker, Bottleneck
    """
    engine = get_engine()
    
    # 유효한 유형 확인
    valid_types = [t.value for t in KeymanType]
    if keyman_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Valid types: {valid_types}"
        )
    
    keyman_list = engine.get_by_type(keyman_type)
    
    return {
        "type": keyman_type,
        "count": len(keyman_list),
        "keyman": [
            {
                "person_id": ks.person_id,
                "name": ks.name,
                "ki_score": round(ks.ki_score, 4),
                "ki_rank": ks.ki_rank,
                "keyman_types": ks.keyman_types,
            }
            for ks in sorted(keyman_list, key=lambda x: x.ki_score, reverse=True)
        ],
    }


@router.get("/sector/{sector}")
async def get_by_sector(sector: str, limit: int = Query(default=10, ge=1, le=50)):
    """섹터별 TOP Keyman"""
    engine = get_engine()
    
    keyman_list = engine.get_by_sector(sector)
    
    return {
        "sector": sector,
        "total": len(keyman_list),
        "top": [
            {
                "person_id": ks.person_id,
                "name": ks.name,
                "ki_score": round(ks.ki_score, 4),
                "ki_rank": ks.ki_rank,
                "keyman_types": ks.keyman_types,
            }
            for ks in keyman_list[:limit]
        ],
    }


@router.get("/path/{from_id}/{to_id}", response_model=PathBottleneckResponse)
async def get_path_bottleneck(from_id: str, to_id: str):
    """
    경로 상 필수 노드 (Bottleneck)
    
    A→B 경로에서 반드시 거쳐야 하는 노드
    """
    engine = get_engine()
    
    bottlenecks = engine.find_bottleneck_nodes(from_id, to_id)
    
    # 크리티컬 레벨
    if len(bottlenecks) >= 3:
        level = "High"
    elif len(bottlenecks) >= 1:
        level = "Medium"
    else:
        level = "Low"
    
    # 경로 수 (간접 추정)
    path_count = max(1, 5 - len(bottlenecks))
    
    return PathBottleneckResponse(
        source=from_id,
        target=to_id,
        bottleneck_nodes=bottlenecks,
        path_count=path_count,
        critical_level=level,
    )


@router.post("/simulate-removal", response_model=RemovalSimulationResponse)
async def simulate_removal(request: RemovalSimulationRequest):
    """
    제거 시뮬레이션
    
    특정 노드를 제거했을 때 네트워크에 미치는 영향
    """
    engine = get_engine()
    result = engine.simulate_removal(request.person_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    # 추천
    impact = result.get("network_impact", 0)
    if impact >= 0.3:
        recommendation = "⚠️ Critical: 이 노드 제거 시 네트워크에 심각한 영향. 대체 경로 확보 필요."
    elif impact >= 0.1:
        recommendation = "⚡ Warning: 상당한 영향 예상. 연결된 노드들의 대안 마련 권장."
    else:
        recommendation = "✅ Safe: 네트워크 영향 미미. 제거 가능."
    
    return RemovalSimulationResponse(
        removed_person=result["removed_person"],
        broken_connections=result["broken_connections"],
        broken_with=result["broken_with"],
        isolated_nodes=result["isolated_nodes"],
        flow_impact=result["flow_impact"],
        network_impact=round(result.get("network_impact", 0), 4),
        keyman_types=result.get("keyman_types", []),
        recommendation=recommendation,
    )


@router.get("/stats")
async def get_stats():
    """전체 통계"""
    engine = get_engine()
    
    if not engine._keyman_scores:
        engine.calculate_all_ki()
    
    scores = list(engine._keyman_scores.values())
    
    # 유형별 분포
    type_dist = {t.value: 0 for t in KeymanType}
    for ks in scores:
        for t in ks.keyman_types:
            type_dist[t] += 1
    
    # 섹터별 분포
    sector_dist = {}
    for ks in scores:
        sector_dist[ks.sector] = sector_dist.get(ks.sector, 0) + 1
    
    return {
        "total_nodes": len(scores),
        "type_distribution": type_dist,
        "sector_distribution": sector_dist,
        "average_ki": round(sum(ks.ki_score for ks in scores) / len(scores), 4) if scores else 0,
        "max_ki": round(max(ks.ki_score for ks in scores), 4) if scores else 0,
        "min_ki": round(min(ks.ki_score for ks in scores), 4) if scores else 0,
        "high_impact_count": sum(1 for ks in scores if ks.network_impact >= 0.3),
    }

