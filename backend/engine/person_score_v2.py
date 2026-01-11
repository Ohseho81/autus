"""
AUTUS Person Score V2.0 - 물리학 기반 점수 시스템

핵심 수식:
S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)

- Ψ: 6차원 {G, R, E, T, N, L}
- W: 가중치 {G:0.25, R:0.20, E:-0.15, T:0.15, N:0.15, L:0.10}
- χ: 노드 간 결합계수 (-1.0 ~ 1.0)
- ν: 네트워크 중심성 (Eigenvector)
- λ: 시간감쇠율 (0.018)
- I: 유동성관성 = G / (L + 1)
- ε: 1e-9 (zero division 방지)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
from datetime import datetime
import math

from .person_model import Person, PersonRegistry, PsiVector
from .params_loader import SovereignParams, PsiWeights


class Rank(str, Enum):
    """계급 분류"""
    SOVEREIGN = "Sovereign"   # Top 0.01%
    ARCHON = "Archon"         # Top 1% AND ν > 0.7
    VALIDATOR = "Validator"   # Top 10% AND E < 0.3
    OPERATOR = "Operator"     # Top 30% AND L > 0.5
    TERMINAL = "Terminal"     # 나머지 70%
    
    @property
    def tier(self) -> int:
        """계급을 티어 숫자로 변환"""
        return {
            Rank.SOVEREIGN: 0,
            Rank.ARCHON: 1,
            Rank.VALIDATOR: 2,
            Rank.OPERATOR: 3,
            Rank.TERMINAL: 4,
        }.get(self, 4)


@dataclass
class ScoreBreakdown:
    """점수 분해"""
    psi_score: float = 0.0          # Σ W_k × Ψ_k
    interference_score: float = 0.0  # Σ χ_ij × S_i × S_j
    centrality_factor: float = 1.0   # ν
    decay_factor: float = 1.0        # e^(-λt)
    inertia: float = 1.0             # I = G / (L + 1)
    
    # 개별 Ψ 기여도
    psi_contributions: Dict[str, float] = field(default_factory=dict)
    
    # 상위 간섭 노드
    top_interferences: List[Tuple[str, float]] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "psi_score": round(self.psi_score, 4),
            "interference_score": round(self.interference_score, 4),
            "centrality_factor": round(self.centrality_factor, 4),
            "decay_factor": round(self.decay_factor, 4),
            "inertia": round(self.inertia, 4),
            "psi_contributions": {k: round(v, 4) for k, v in self.psi_contributions.items()},
            "top_interferences": [(n, round(s, 4)) for n, s in self.top_interferences[:5]],
        }


@dataclass
class PersonScore:
    """개인 점수 결과"""
    person_id: str
    name: str
    
    # 최종 점수
    score: float = 0.0
    normalized_score: float = 0.0  # 0-100 스케일
    
    # 계급
    rank: Rank = Rank.TERMINAL
    percentile: float = 0.0  # 상위 %
    
    # 점수 분해
    breakdown: ScoreBreakdown = field(default_factory=ScoreBreakdown)
    
    # 메타
    calculated_at: datetime = field(default_factory=datetime.now)
    time_years: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "person_id": self.person_id,
            "name": self.name,
            "score": round(self.score, 4),
            "normalized_score": round(self.normalized_score, 2),
            "rank": self.rank.value,
            "rank_tier": self.rank.tier,
            "percentile": round(self.percentile, 4),
            "breakdown": self.breakdown.to_dict(),
            "calculated_at": self.calculated_at.isoformat(),
            "time_years": self.time_years,
        }


def calculate_psi_score(person: Person, weights: PsiWeights) -> Tuple[float, Dict[str, float]]:
    """
    6차원 Ψ × 가중치 합산
    
    Returns:
        (총점, 개별 기여도 딕셔너리)
    """
    psi = person.psi
    
    contributions = {
        "G": weights.G * psi.G,
        "R": weights.R * psi.R,
        "E": weights.E * psi.E,  # 음수 가중치!
        "T": weights.T * psi.T,
        "N": weights.N * psi.N,
        "L": weights.L * psi.L,
    }
    
    total = sum(contributions.values())
    
    return total, contributions


def calculate_interference_score(
    person_id: str,
    registry: PersonRegistry,
    current_scores: Dict[str, float],
    params: SovereignParams,
) -> Tuple[float, List[Tuple[str, float]]]:
    """
    연결된 노드와의 시너지/마찰 계산
    
    Σ χ_ij × S_i × S_j
    
    Returns:
        (총 간섭 점수, [(노드ID, 기여도), ...])
    """
    person = registry.get(person_id)
    if not person:
        return 0.0, []
    
    my_score = current_scores.get(person_id, 0.0)
    if my_score <= 0:
        return 0.0, []
    
    interferences = []
    
    for neighbor_id in person.connections:
        neighbor_score = current_scores.get(neighbor_id, 0.0)
        if neighbor_score <= 0:
            continue
        
        chi = registry.get_chi(person_id, neighbor_id)
        
        # χ_ij × S_i × S_j
        interference = chi * my_score * neighbor_score * params.interference_scale
        interferences.append((neighbor_id, interference))
    
    # 정렬 (절대값 기준)
    interferences.sort(key=lambda x: abs(x[1]), reverse=True)
    
    total = sum(i[1] for i in interferences)
    
    return total, interferences


def calculate_inertia(person: Person) -> float:
    """
    유동성 관성 계산
    
    I = G / (L + 1)
    
    G가 크고 L이 작으면 → I가 큼 → 점수 감소
    (큰 자산을 가졌지만 유동성이 낮으면 불리)
    """
    g = person.psi.G
    l = person.psi.L
    
    return g / (l + 1)


def calculate_person_score(
    person_id: str,
    registry: PersonRegistry,
    params: SovereignParams,
    time_years: float = 0.0,
    current_scores: Optional[Dict[str, float]] = None,
) -> PersonScore:
    """
    최종 S_Person 산출
    
    S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)
    """
    person = registry.get(person_id)
    if not person:
        return PersonScore(person_id=person_id, name="Unknown")
    
    # 1. Ψ 점수
    psi_score, psi_contributions = calculate_psi_score(person, params.weights)
    
    # 2. 간섭 점수 (첫 패스에서는 0)
    if current_scores:
        interference_score, top_interferences = calculate_interference_score(
            person_id, registry, current_scores, params
        )
    else:
        interference_score = 0.0
        top_interferences = []
    
    # 3. 중심성 (ν)
    centrality = person.eigenvector_centrality
    # 중심성 부스트 적용
    centrality_factor = 1.0 + centrality * params.centrality_boost
    
    # 4. 시간 감쇠
    decay_factor = math.exp(-params.lambda_decay * time_years)
    
    # 5. 유동성 관성
    inertia = calculate_inertia(person)
    
    # 6. 최종 점수
    numerator = (psi_score + interference_score) * centrality_factor * decay_factor
    denominator = inertia + params.epsilon
    
    score = numerator / denominator
    
    # 정규화 (0-100)
    normalized = min(100.0, max(0.0, score * params.max_score))
    
    # Breakdown 생성
    breakdown = ScoreBreakdown(
        psi_score=psi_score,
        interference_score=interference_score,
        centrality_factor=centrality_factor,
        decay_factor=decay_factor,
        inertia=inertia,
        psi_contributions=psi_contributions,
        top_interferences=top_interferences,
    )
    
    return PersonScore(
        person_id=person_id,
        name=person.name,
        score=score,
        normalized_score=normalized,
        breakdown=breakdown,
        time_years=time_years,
    )


def assign_rank(
    person_score: PersonScore,
    all_scores: List[PersonScore],
    person: Person,
    params: SovereignParams,
) -> Rank:
    """
    백분위 + 조건으로 계급 할당
    
    | Rank | 조건 |
    |------|------|
    | Sovereign | Top 0.01% |
    | Archon | Top 1% AND ν > 0.7 |
    | Validator | Top 10% AND E < 0.3 |
    | Operator | Top 30% AND L > 0.5 |
    | Terminal | 나머지 70% |
    """
    # 백분위 계산
    higher_count = sum(1 for s in all_scores if s.score > person_score.score)
    percentile = (higher_count / len(all_scores)) * 100 if all_scores else 100.0
    
    person_score.percentile = percentile
    
    thresholds = params.rank_thresholds
    
    # Sovereign: Top 0.01%
    if percentile <= thresholds.sovereign_percentile:
        return Rank.SOVEREIGN
    
    # Archon: Top 1% AND ν > 0.7
    if percentile <= thresholds.archon_percentile:
        if person.eigenvector_centrality > thresholds.archon_min_centrality:
            return Rank.ARCHON
    
    # Validator: Top 10% AND E < 0.3
    if percentile <= thresholds.validator_percentile:
        if person.psi.E < thresholds.validator_max_exposure:
            return Rank.VALIDATOR
    
    # Operator: Top 30% AND L > 0.5
    if percentile <= thresholds.operator_percentile:
        if person.psi.L > thresholds.operator_min_liquidity:
            return Rank.OPERATOR
    
    # Terminal: 나머지
    return Rank.TERMINAL


def calculate_all_scores(
    registry: PersonRegistry,
    params: SovereignParams = None,
    time_years: float = 0.0,
) -> Dict[str, PersonScore]:
    """
    전체 인원 점수 계산 + 랭킹
    
    2-pass 알고리즘:
    1. 첫 번째 패스: 간섭 없이 기본 점수 계산
    2. 두 번째 패스: 간섭항 포함하여 재계산
    """
    if params is None:
        params = SovereignParams()
    
    persons = registry.all()
    if not persons:
        return {}
    
    # 중심성 업데이트
    registry.calculate_eigenvector_centrality()
    
    # ═══════════════════════════════════════════════
    # Pass 1: 기본 점수 (간섭 없음)
    # ═══════════════════════════════════════════════
    base_scores: Dict[str, float] = {}
    for person in persons:
        ps = calculate_person_score(
            person.id, registry, params, time_years, current_scores=None
        )
        base_scores[person.id] = ps.score
    
    # ═══════════════════════════════════════════════
    # Pass 2: 간섭 포함 최종 점수
    # ═══════════════════════════════════════════════
    final_scores: Dict[str, PersonScore] = {}
    for person in persons:
        ps = calculate_person_score(
            person.id, registry, params, time_years, current_scores=base_scores
        )
        final_scores[person.id] = ps
    
    # ═══════════════════════════════════════════════
    # Pass 3: 계급 할당
    # ═══════════════════════════════════════════════
    all_score_list = list(final_scores.values())
    
    for person_id, person_score in final_scores.items():
        person = registry.get(person_id)
        if person:
            person_score.rank = assign_rank(person_score, all_score_list, person, params)
    
    return final_scores


def get_ranking(scores: Dict[str, PersonScore], limit: int = None) -> List[PersonScore]:
    """점수 기준 정렬된 순위 반환"""
    sorted_scores = sorted(scores.values(), key=lambda x: x.score, reverse=True)
    if limit:
        return sorted_scores[:limit]
    return sorted_scores


def get_rank_distribution(scores: Dict[str, PersonScore]) -> Dict[str, int]:
    """계급별 분포"""
    distribution = {rank.value: 0 for rank in Rank}
    for ps in scores.values():
        distribution[ps.rank.value] += 1
    return distribution


def get_formula_explanation() -> Dict:
    """수식 설명 반환"""
    return {
        "formula": "S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)",
        "variables": {
            "Ψ": {
                "description": "6차원 개인 속성 벡터",
                "components": {
                    "G": "Governance (거버넌스 가치)",
                    "R": "Reputation (평판)",
                    "E": "Exposure (위험 노출)",
                    "T": "Throughput (처리량)",
                    "N": "Network (네트워크 중심성)",
                    "L": "Liquidity (유동성)",
                },
            },
            "W": {
                "description": "가중치 벡터",
                "values": {"G": 0.25, "R": 0.20, "E": -0.15, "T": 0.15, "N": 0.15, "L": 0.10},
            },
            "χ": {
                "description": "노드 간 결합계수",
                "range": "[-1.0, 1.0]",
                "positive": "시너지 (협력)",
                "negative": "마찰 (경쟁)",
            },
            "ν": {
                "description": "Eigenvector Centrality",
                "meaning": "네트워크에서의 중심성/영향력",
            },
            "λ": {
                "description": "시간 감쇠율",
                "value": 0.018,
                "half_life": "~38.5년",
            },
            "I": {
                "description": "유동성 관성",
                "formula": "G / (L + 1)",
                "meaning": "큰 자산 + 낮은 유동성 → 불리",
            },
            "ε": {
                "description": "안정화 항",
                "value": 1e-9,
            },
        },
        "ranks": {
            "Sovereign": "Top 0.01%",
            "Archon": "Top 1% AND ν > 0.7",
            "Validator": "Top 10% AND E < 0.3",
            "Operator": "Top 30% AND L > 0.5",
            "Terminal": "나머지 70%",
        },
    }

