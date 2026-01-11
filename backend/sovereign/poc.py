"""
═══════════════════════════════════════════════════════════════════════════════
🏆 AUTUS Proof of Contribution (기여 증명 알고리즘)
═══════════════════════════════════════════════════════════════════════════════

노하우의 순도와 파급력을 측정하여 공정하게 보상하는 시스템

핵심 공식:
PoC = W_r × R + W_i × I + W_c × C

- R: 정제 가중치 (Refinement Weight)
- I: 공명 지수 (Resonance Index)
- C: 지속성 점수 (Consistency Score)

"기여한 만큼, 정확하게"
═══════════════════════════════════════════════════════════════════════════════
"""

import hashlib
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 및 설정
# ═══════════════════════════════════════════════════════════════════════════════

# PoC 가중치
POC_WEIGHTS = {
    "refinement": 0.4,   # 정제 가중치 (40%)
    "resonance": 0.35,   # 공명 지수 (35%)
    "consistency": 0.25, # 지속성 점수 (25%)
}

# 레벨별 보상 배율
LEVEL_MULTIPLIERS = {
    "novice": 1.0,
    "intermediate": 1.5,
    "advanced": 2.0,
    "expert": 3.0,
    "master": 5.0,      # 30-50년 베테랑
    "grandmaster": 10.0, # 50년 이상
}

# 도메인별 희소성 계수
DOMAIN_SCARCITY = {
    "bio": 1.2,         # 건강/생명
    "capital": 1.0,     # 자본
    "cognition": 1.3,   # 인지
    "relation": 1.1,    # 관계
    "environment": 1.4, # 환경 (희소)
    "legacy": 1.5,      # 유산 (매우 희소)
}


class ContributionType(Enum):
    """기여 유형"""
    KNOWLEDGE = "knowledge"       # 노하우 공유
    REFINEMENT = "refinement"     # 데이터 정제
    VALIDATION = "validation"     # 검증 참여
    RESONANCE = "resonance"       # 공명 기여
    MENTORING = "mentoring"       # 멘토링


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Contribution:
    """개별 기여"""
    id: str
    contributor_did: str
    contribution_type: ContributionType
    node_id: str
    domain: str
    timestamp: datetime
    
    # 측정값
    raw_data_size: int = 0
    refined_data_size: int = 0
    noise_removed: float = 0.0
    resonance_count: int = 0
    validation_count: int = 0
    
    # 계산된 점수
    refinement_score: float = 0.0
    resonance_score: float = 0.0
    consistency_score: float = 0.0
    total_poc: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "contributor": self.contributor_did[:16] + "...",
            "type": self.contribution_type.value,
            "node": self.node_id,
            "domain": self.domain,
            "timestamp": self.timestamp.isoformat(),
            "scores": {
                "refinement": round(self.refinement_score, 4),
                "resonance": round(self.resonance_score, 4),
                "consistency": round(self.consistency_score, 4),
                "total_poc": round(self.total_poc, 4),
            },
        }


@dataclass
class ContributorProfile:
    """기여자 프로필"""
    did: str
    level: str = "novice"
    total_contributions: int = 0
    total_poc: float = 0.0
    domains: List[str] = field(default_factory=list)
    first_contribution: Optional[datetime] = None
    last_contribution: Optional[datetime] = None
    streak_days: int = 0
    
    # 누적 점수
    cumulative_refinement: float = 0.0
    cumulative_resonance: float = 0.0
    cumulative_consistency: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "did": self.did[:16] + "...",
            "level": self.level,
            "total_contributions": self.total_contributions,
            "total_poc": round(self.total_poc, 2),
            "domains": self.domains,
            "streak_days": self.streak_days,
            "active_since": (
                self.first_contribution.isoformat()
                if self.first_contribution else None
            ),
        }


@dataclass
class RewardAllocation:
    """보상 배분"""
    contributor_did: str
    poc_amount: float
    reward_units: float
    level_multiplier: float
    scarcity_bonus: float
    final_reward: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "contributor": self.contributor_did[:16] + "...",
            "poc_amount": round(self.poc_amount, 4),
            "reward_units": round(self.reward_units, 4),
            "level_multiplier": self.level_multiplier,
            "scarcity_bonus": round(self.scarcity_bonus, 4),
            "final_reward": round(self.final_reward, 4),
            "timestamp": self.timestamp.isoformat(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# PoC 계산 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class PoCEngine:
    """
    기여 증명 엔진
    
    PoC = W_r × R + W_i × I + W_c × C
    
    여기서:
    - R: 정제 가중치 = (raw - refined) / raw × 질 계수
    - I: 공명 지수 = 공명 횟수 × 공명 강도 평균
    - C: 지속성 점수 = 연속 기여 일수 × 일관성 계수
    """
    
    def __init__(self):
        self._contributions: Dict[str, Contribution] = {}
        self._contributors: Dict[str, ContributorProfile] = {}
        self._rewards: List[RewardAllocation] = []
        self._resonance_matrix: Dict[str, Dict[str, float]] = {}
    
    # ─────────────────────────────────────────────────────────────────────────
    # 정제 가중치 (R)
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_refinement_score(
        self,
        raw_size: int,
        refined_size: int,
        quality_factor: float = 1.0,
    ) -> float:
        """
        정제 가중치 계산
        
        노이즈를 얼마나 효과적으로 제거했는가
        """
        if raw_size == 0:
            return 0.0
        
        # 기본 정제율
        noise_ratio = (raw_size - refined_size) / raw_size
        
        # 너무 많이 제거하면 페널티 (본질까지 삭제했을 수 있음)
        if noise_ratio > 0.9:
            penalty = (noise_ratio - 0.9) * 2
            noise_ratio -= penalty
        
        # 질 계수 적용
        refinement = noise_ratio * quality_factor
        
        # 0~1 범위로 클램핑
        return max(0.0, min(1.0, refinement))
    
    # ─────────────────────────────────────────────────────────────────────────
    # 공명 지수 (I)
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_resonance_score(
        self,
        contribution_id: str,
        resonance_events: List[Dict],
    ) -> float:
        """
        공명 지수 계산
        
        다른 노하우와 얼마나 많이, 강하게 공명했는가
        """
        if not resonance_events:
            return 0.0
        
        # 공명 횟수
        count = len(resonance_events)
        
        # 공명 강도 평균
        avg_strength = sum(e.get("strength", 0.5) for e in resonance_events) / count
        
        # 크로스 도메인 보너스 (다른 분야와 공명할수록 가치 높음)
        unique_domains = len(set(e.get("domain", "") for e in resonance_events))
        cross_domain_bonus = 1.0 + (unique_domains - 1) * 0.1
        
        # 공명 지수
        resonance = (count / 100) * avg_strength * cross_domain_bonus
        
        # 로그 스케일 적용 (급격한 증가 방지)
        resonance = math.log1p(resonance * 10) / 3
        
        return max(0.0, min(1.0, resonance))
    
    # ─────────────────────────────────────────────────────────────────────────
    # 지속성 점수 (C)
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_consistency_score(
        self,
        contributor_did: str,
        contribution_history: List[datetime],
    ) -> float:
        """
        지속성 점수 계산
        
        베테랑처럼 꾸준히 기여하는가
        """
        if not contribution_history:
            return 0.0
        
        # 기여 기간 (일)
        sorted_dates = sorted(contribution_history)
        total_days = (sorted_dates[-1] - sorted_dates[0]).days + 1
        
        # 활성 일수
        active_days = len(set(d.date() for d in sorted_dates))
        
        # 일관성 비율
        if total_days == 0:
            consistency_ratio = 0.0
        else:
            consistency_ratio = active_days / total_days
        
        # 연속 기여 보너스
        streak = self._calculate_streak(sorted_dates)
        streak_bonus = min(streak / 30, 1.0)  # 30일 연속 = 최대 보너스
        
        # 장기 기여 보너스 (1년 이상)
        longevity_bonus = min(total_days / 365, 1.0)
        
        # 지속성 점수
        consistency = (
            consistency_ratio * 0.5 +
            streak_bonus * 0.3 +
            longevity_bonus * 0.2
        )
        
        return max(0.0, min(1.0, consistency))
    
    def _calculate_streak(self, dates: List[datetime]) -> int:
        """연속 기여 일수 계산"""
        if not dates:
            return 0
        
        streak = 1
        max_streak = 1
        
        for i in range(1, len(dates)):
            diff = (dates[i].date() - dates[i-1].date()).days
            if diff == 1:
                streak += 1
                max_streak = max(max_streak, streak)
            elif diff > 1:
                streak = 1
        
        return max_streak
    
    # ─────────────────────────────────────────────────────────────────────────
    # 종합 PoC 계산
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_poc(
        self,
        refinement_score: float,
        resonance_score: float,
        consistency_score: float,
    ) -> float:
        """
        종합 PoC 계산
        
        PoC = W_r × R + W_i × I + W_c × C
        """
        poc = (
            POC_WEIGHTS["refinement"] * refinement_score +
            POC_WEIGHTS["resonance"] * resonance_score +
            POC_WEIGHTS["consistency"] * consistency_score
        )
        
        return round(poc, 6)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 기여 등록 및 처리
    # ─────────────────────────────────────────────────────────────────────────
    
    def register_contribution(
        self,
        contributor_did: str,
        contribution_type: ContributionType,
        node_id: str,
        domain: str,
        raw_data_size: int,
        refined_data_size: int,
        quality_factor: float = 1.0,
        resonance_events: List[Dict] = None,
    ) -> Contribution:
        """기여 등록 및 PoC 계산"""
        # 기여 ID 생성
        contribution_id = hashlib.sha256(
            f"{contributor_did}:{node_id}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]
        
        # 기여자 프로필 가져오기/생성
        if contributor_did not in self._contributors:
            self._contributors[contributor_did] = ContributorProfile(did=contributor_did)
        
        profile = self._contributors[contributor_did]
        
        # 기여 이력 수집
        contribution_history = [
            c.timestamp for c in self._contributions.values()
            if c.contributor_did == contributor_did
        ]
        contribution_history.append(datetime.utcnow())
        
        # 점수 계산
        refinement = self.calculate_refinement_score(
            raw_data_size, refined_data_size, quality_factor
        )
        resonance = self.calculate_resonance_score(
            contribution_id, resonance_events or []
        )
        consistency = self.calculate_consistency_score(
            contributor_did, contribution_history
        )
        
        # 종합 PoC
        total_poc = self.calculate_poc(refinement, resonance, consistency)
        
        # 기여 객체 생성
        contribution = Contribution(
            id=contribution_id,
            contributor_did=contributor_did,
            contribution_type=contribution_type,
            node_id=node_id,
            domain=domain,
            timestamp=datetime.utcnow(),
            raw_data_size=raw_data_size,
            refined_data_size=refined_data_size,
            noise_removed=(raw_data_size - refined_data_size) / max(raw_data_size, 1),
            resonance_count=len(resonance_events or []),
            refinement_score=refinement,
            resonance_score=resonance,
            consistency_score=consistency,
            total_poc=total_poc,
        )
        
        # 저장
        self._contributions[contribution_id] = contribution
        
        # 프로필 업데이트
        self._update_profile(profile, contribution)
        
        return contribution
    
    def _update_profile(self, profile: ContributorProfile, contribution: Contribution):
        """기여자 프로필 업데이트"""
        profile.total_contributions += 1
        profile.total_poc += contribution.total_poc
        
        if contribution.domain not in profile.domains:
            profile.domains.append(contribution.domain)
        
        if profile.first_contribution is None:
            profile.first_contribution = contribution.timestamp
        
        profile.last_contribution = contribution.timestamp
        
        # 누적 점수
        profile.cumulative_refinement += contribution.refinement_score
        profile.cumulative_resonance += contribution.resonance_score
        profile.cumulative_consistency += contribution.consistency_score
        
        # 레벨 업데이트
        profile.level = self._determine_level(profile.total_poc)
    
    def _determine_level(self, total_poc: float) -> str:
        """PoC 기반 레벨 결정"""
        if total_poc >= 1000:
            return "grandmaster"
        elif total_poc >= 500:
            return "master"
        elif total_poc >= 100:
            return "expert"
        elif total_poc >= 30:
            return "advanced"
        elif total_poc >= 10:
            return "intermediate"
        else:
            return "novice"
    
    # ─────────────────────────────────────────────────────────────────────────
    # 보상 배분
    # ─────────────────────────────────────────────────────────────────────────
    
    def allocate_reward(
        self,
        contribution_id: str,
        reward_pool: float,
    ) -> RewardAllocation:
        """보상 배분"""
        contribution = self._contributions.get(contribution_id)
        if not contribution:
            raise ValueError("Contribution not found")
        
        profile = self._contributors.get(contribution.contributor_did)
        if not profile:
            raise ValueError("Contributor not found")
        
        # 기본 보상 단위
        reward_units = contribution.total_poc
        
        # 레벨 배율
        level_mult = LEVEL_MULTIPLIERS.get(profile.level, 1.0)
        
        # 도메인 희소성 보너스
        scarcity = DOMAIN_SCARCITY.get(contribution.domain, 1.0)
        scarcity_bonus = (scarcity - 1.0) * reward_units
        
        # 최종 보상
        final_reward = (reward_units * level_mult + scarcity_bonus) * (reward_pool / 100)
        
        allocation = RewardAllocation(
            contributor_did=contribution.contributor_did,
            poc_amount=contribution.total_poc,
            reward_units=reward_units,
            level_multiplier=level_mult,
            scarcity_bonus=scarcity_bonus,
            final_reward=final_reward,
        )
        
        self._rewards.append(allocation)
        
        return allocation
    
    # ─────────────────────────────────────────────────────────────────────────
    # 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_contribution(self, contribution_id: str) -> Optional[Contribution]:
        """기여 조회"""
        return self._contributions.get(contribution_id)
    
    def get_contributor_profile(self, did: str) -> Optional[ContributorProfile]:
        """기여자 프로필 조회"""
        return self._contributors.get(did)
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """리더보드"""
        sorted_contributors = sorted(
            self._contributors.values(),
            key=lambda p: p.total_poc,
            reverse=True
        )[:limit]
        
        return [
            {
                "rank": i + 1,
                **p.to_dict(),
            }
            for i, p in enumerate(sorted_contributors)
        ]
    
    def get_domain_stats(self) -> Dict:
        """도메인별 통계"""
        stats = {}
        for c in self._contributions.values():
            domain = c.domain
            if domain not in stats:
                stats[domain] = {
                    "count": 0,
                    "total_poc": 0.0,
                    "avg_refinement": 0.0,
                    "avg_resonance": 0.0,
                }
            stats[domain]["count"] += 1
            stats[domain]["total_poc"] += c.total_poc
        
        # 평균 계산
        for domain, data in stats.items():
            contributions = [
                c for c in self._contributions.values()
                if c.domain == domain
            ]
            if contributions:
                data["avg_refinement"] = sum(c.refinement_score for c in contributions) / len(contributions)
                data["avg_resonance"] = sum(c.resonance_score for c in contributions) / len(contributions)
        
        return stats
    
    def get_stats(self) -> Dict:
        """전체 통계"""
        return {
            "total_contributions": len(self._contributions),
            "total_contributors": len(self._contributors),
            "total_poc_distributed": sum(c.total_poc for c in self._contributions.values()),
            "total_rewards_allocated": sum(r.final_reward for r in self._rewards),
            "levels": {
                level: len([p for p in self._contributors.values() if p.level == level])
                for level in LEVEL_MULTIPLIERS.keys()
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_poc_engine: Optional[PoCEngine] = None


def get_poc_engine() -> PoCEngine:
    """PoC 엔진 싱글턴"""
    global _poc_engine
    if _poc_engine is None:
        _poc_engine = PoCEngine()
    return _poc_engine


def register_contribution(
    contributor: str,
    node: str,
    domain: str,
    raw_size: int,
    refined_size: int,
) -> Dict:
    """기여 등록 (편의 함수)"""
    engine = get_poc_engine()
    contribution = engine.register_contribution(
        contributor_did=contributor,
        contribution_type=ContributionType.KNOWLEDGE,
        node_id=node,
        domain=domain,
        raw_data_size=raw_size,
        refined_data_size=refined_size,
    )
    return contribution.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "PoCEngine",
    "Contribution",
    "ContributorProfile",
    "RewardAllocation",
    # Enums
    "ContributionType",
    # Constants
    "POC_WEIGHTS",
    "LEVEL_MULTIPLIERS",
    "DOMAIN_SCARCITY",
    # Functions
    "get_poc_engine",
    "register_contribution",
]
