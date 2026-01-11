"""
AUTUS Person Score API

S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from engine import (
    PersonRegistry,
    SovereignParams,
    PersonScore,
    Rank,
    calculate_person_score,
    calculate_all_scores,
)
from engine.person_score_v2 import (
    get_ranking,
    get_rank_distribution,
    get_formula_explanation,
)
from engine.person_model import Person, PsiVector, Sector, Region

router = APIRouter(prefix="/api/score", tags=["person_score"])

# ═══════════════════════════════════════════════════════════════
# 글로벌 상태 (실제 서비스에서는 DB 사용)
# ═══════════════════════════════════════════════════════════════

_registry: Optional[PersonRegistry] = None
_params: SovereignParams = SovereignParams()
_scores: Dict[str, PersonScore] = {}
_last_calculated: Optional[datetime] = None


def get_registry() -> PersonRegistry:
    """Registry 조회 (없으면 샘플 생성)"""
    global _registry
    if _registry is None:
        _registry = create_sample_registry()
    return _registry


def create_sample_registry() -> PersonRegistry:
    """테스트용 샘플 데이터"""
    registry = PersonRegistry()
    
    # 샘플 노드
    samples = [
        # Sovereign급
        {"id": "xi", "name": "Xi Jinping", "sector": "government", "rv": 20e12, "G": 0.95, "R": 0.7, "E": 0.4, "T": 0.8, "N": 0.9, "L": 0.3},
        {"id": "trump", "name": "Donald Trump", "sector": "government", "rv": 8e12, "G": 0.88, "R": 0.5, "E": 0.6, "T": 0.9, "N": 0.85, "L": 0.5},
        {"id": "powell", "name": "Jerome Powell", "sector": "central_bank", "rv": 9e12, "G": 0.92, "R": 0.8, "E": 0.2, "T": 0.7, "N": 0.8, "L": 0.9},
        
        # Archon급
        {"id": "fink", "name": "Larry Fink", "sector": "finance", "rv": 500e9, "G": 0.7, "R": 0.75, "E": 0.25, "T": 0.8, "N": 0.85, "L": 0.8},
        {"id": "mbs", "name": "Mohammed bin Salman", "sector": "royal", "rv": 700e9, "G": 0.75, "R": 0.4, "E": 0.5, "T": 0.6, "N": 0.7, "L": 0.4},
        
        # Validator급
        {"id": "cook", "name": "Tim Cook", "sector": "tech", "rv": 100e9, "G": 0.6, "R": 0.9, "E": 0.15, "T": 0.8, "N": 0.6, "L": 0.7},
        {"id": "nadella", "name": "Satya Nadella", "sector": "tech", "rv": 80e9, "G": 0.55, "R": 0.85, "E": 0.1, "T": 0.85, "N": 0.55, "L": 0.75},
        
        # Operator급
        {"id": "son", "name": "Masayoshi Son", "sector": "finance", "rv": 20e9, "G": 0.4, "R": 0.5, "E": 0.6, "T": 0.9, "N": 0.5, "L": 0.6},
        {"id": "huang", "name": "Jensen Huang", "sector": "tech", "rv": 70e9, "G": 0.5, "R": 0.8, "E": 0.2, "T": 0.9, "N": 0.45, "L": 0.65},
        
        # Terminal급
        {"id": "user1", "name": "Kim Director", "sector": "other", "rv": 1e6, "G": 0.1, "R": 0.5, "E": 0.2, "T": 0.5, "N": 0.3, "L": 0.4},
        {"id": "user2", "name": "Parent Lee", "sector": "other", "rv": 0.5e6, "G": 0.05, "R": 0.4, "E": 0.1, "T": 0.3, "N": 0.1, "L": 0.2},
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
            psi=PsiVector(
                G=s.get("G", 0.5),
                R=s.get("R", 0.5),
                E=s.get("E", 0.3),
                T=s.get("T", 0.5),
                N=s.get("N", 0.3),
                L=s.get("L", 0.5),
            ),
        )
        registry.add(person)
    
    # 연결 추가
    connections = [
        ("xi", "trump", 0.3),
        ("xi", "powell", 0.5),
        ("trump", "powell", 0.7),
        ("trump", "fink", 0.6),
        ("powell", "fink", 0.8),
        ("fink", "cook", 0.5),
        ("fink", "nadella", 0.5),
        ("cook", "nadella", 0.7),
        ("nadella", "huang", 0.8),
        ("son", "fink", 0.4),
        ("mbs", "trump", 0.6),
        ("mbs", "fink", 0.5),
    ]
    
    for src, tgt, chi in connections:
        registry.add_connection(src, tgt, chi)
    
    registry.calculate_eigenvector_centrality()
    
    return registry


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class FormulaResponse(BaseModel):
    formula: str
    variables: Dict
    ranks: Dict[str, str]


class RankingItem(BaseModel):
    rank_position: int
    person_id: str
    name: str
    score: float
    normalized_score: float
    rank: str
    percentile: float


class RankingResponse(BaseModel):
    total: int
    ranking: List[RankingItem]
    calculated_at: str


class PersonScoreResponse(BaseModel):
    person_id: str
    name: str
    score: float
    normalized_score: float
    rank: str
    percentile: float
    breakdown: Dict


class RankDistributionResponse(BaseModel):
    total: int
    distribution: Dict[str, int]
    percentages: Dict[str, float]


class RecalculateRequest(BaseModel):
    time_years: float = 0.0


class RecalculateResponse(BaseModel):
    success: bool
    total_calculated: int
    calculated_at: str
    top_10: List[RankingItem]


# ═══════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════

@router.get("/formula", response_model=FormulaResponse)
async def get_formula():
    """
    수식 설명 반환
    
    S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)
    """
    explanation = get_formula_explanation()
    return FormulaResponse(
        formula=explanation["formula"],
        variables=explanation["variables"],
        ranks=explanation["ranks"],
    )


@router.get("/ranking", response_model=RankingResponse)
async def get_ranking_list(
    limit: int = Query(default=50, ge=1, le=500),
    recalculate: bool = Query(default=False),
):
    """
    전체 순위 조회
    """
    global _scores, _last_calculated
    
    registry = get_registry()
    
    if recalculate or not _scores:
        _scores = calculate_all_scores(registry, _params)
        _last_calculated = datetime.now()
    
    ranking = get_ranking(_scores, limit)
    
    items = [
        RankingItem(
            rank_position=i + 1,
            person_id=ps.person_id,
            name=ps.name,
            score=round(ps.score, 4),
            normalized_score=round(ps.normalized_score, 2),
            rank=ps.rank.value,
            percentile=round(ps.percentile, 4),
        )
        for i, ps in enumerate(ranking)
    ]
    
    return RankingResponse(
        total=len(_scores),
        ranking=items,
        calculated_at=_last_calculated.isoformat() if _last_calculated else "",
    )


@router.get("/{person_id}", response_model=PersonScoreResponse)
async def get_person_score(person_id: str):
    """
    개인 점수 조회
    """
    global _scores
    
    if not _scores:
        registry = get_registry()
        _scores = calculate_all_scores(registry, _params)
    
    if person_id not in _scores:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    
    ps = _scores[person_id]
    
    return PersonScoreResponse(
        person_id=ps.person_id,
        name=ps.name,
        score=round(ps.score, 4),
        normalized_score=round(ps.normalized_score, 2),
        rank=ps.rank.value,
        percentile=round(ps.percentile, 4),
        breakdown=ps.breakdown.to_dict(),
    )


@router.get("/{person_id}/breakdown")
async def get_person_breakdown(person_id: str):
    """
    점수 분해 상세
    
    - psi_score: Σ W_k × Ψ_k
    - interference_score: Σ χ_ij × S_i × S_j
    - centrality_factor: ν
    - decay_factor: e^(-λt)
    - inertia: I = G / (L + 1)
    """
    global _scores
    
    if not _scores:
        registry = get_registry()
        _scores = calculate_all_scores(registry, _params)
    
    if person_id not in _scores:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    
    ps = _scores[person_id]
    person = get_registry().get(person_id)
    
    return {
        "person_id": ps.person_id,
        "name": ps.name,
        "final_score": round(ps.score, 4),
        "normalized_score": round(ps.normalized_score, 2),
        "rank": ps.rank.value,
        "breakdown": ps.breakdown.to_dict(),
        "psi_vector": person.psi.to_dict() if person else {},
        "eigenvector_centrality": person.eigenvector_centrality if person else 0,
        "formula": "S = [(Ψ·W) + Interference] × ν × e^(-λt) / (I + ε)",
        "calculation_steps": [
            f"1. Ψ·W = {ps.breakdown.psi_score:.4f}",
            f"2. Interference = {ps.breakdown.interference_score:.4f}",
            f"3. Base = {ps.breakdown.psi_score + ps.breakdown.interference_score:.4f}",
            f"4. × Centrality ({ps.breakdown.centrality_factor:.4f}) = {(ps.breakdown.psi_score + ps.breakdown.interference_score) * ps.breakdown.centrality_factor:.4f}",
            f"5. × Decay ({ps.breakdown.decay_factor:.4f})",
            f"6. ÷ Inertia ({ps.breakdown.inertia:.4f} + ε)",
            f"7. Final = {ps.score:.4f}",
        ],
    }


@router.get("/ranks/distribution", response_model=RankDistributionResponse)
async def get_ranks_distribution():
    """
    계급별 분포
    """
    global _scores
    
    if not _scores:
        registry = get_registry()
        _scores = calculate_all_scores(registry, _params)
    
    distribution = get_rank_distribution(_scores)
    total = len(_scores)
    
    percentages = {
        rank: (count / total * 100) if total > 0 else 0
        for rank, count in distribution.items()
    }
    
    return RankDistributionResponse(
        total=total,
        distribution=distribution,
        percentages={k: round(v, 2) for k, v in percentages.items()},
    )


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate_scores(request: RecalculateRequest):
    """
    전체 점수 재계산
    """
    global _scores, _last_calculated
    
    registry = get_registry()
    _scores = calculate_all_scores(registry, _params, time_years=request.time_years)
    _last_calculated = datetime.now()
    
    ranking = get_ranking(_scores, 10)
    
    top_10 = [
        RankingItem(
            rank_position=i + 1,
            person_id=ps.person_id,
            name=ps.name,
            score=round(ps.score, 4),
            normalized_score=round(ps.normalized_score, 2),
            rank=ps.rank.value,
            percentile=round(ps.percentile, 4),
        )
        for i, ps in enumerate(ranking)
    ]
    
    return RecalculateResponse(
        success=True,
        total_calculated=len(_scores),
        calculated_at=_last_calculated.isoformat(),
        top_10=top_10,
    )


@router.get("/params/current")
async def get_current_params():
    """현재 파라미터 조회"""
    return _params.to_dict()


@router.get("/params/formula-text")
async def get_formula_text():
    """수식 텍스트 설명"""
    return {"formula_text": _params.get_formula_text()}

