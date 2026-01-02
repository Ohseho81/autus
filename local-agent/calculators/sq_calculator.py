"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")




















"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")










"""
AUTUS Local Agent - SQ Calculator
==================================

시너지 지수(SQ) 계산 엔진

핵심 원칙:
- 모든 계산은 유저 기기의 CPU에서 실행
- 가중치(W)는 서버에서 암호화 전송, 동적 조정 가능
- 서버는 결과 벡터만 수신 (개인정보 없음)

공식:
    SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)

    M_norm = Money / Normalizer (입금액 정규화)
    S_norm = Synergy / Normalizer (성적/등원율 정규화)  
    T_norm = Entropy / Normalizer (통화시간+부정키워드 정규화)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics
import numpy as np
import sys
import os

# 상위 디렉토리 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import (
    Node, NodeTier, SQWeights, TierBoundaries,
    CallRecord, SmsRecord, KeywordAlert, LmsRecord,
    SentimentType, AnonymousVector
)


# ═══════════════════════════════════════════════════════════════════════════
#                              SQ CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

class SynergyCalculator:
    """
    시너지 지수(SQ) 계산기
    
    로컬 기기에서 실행, 가중치만 서버 제어
    """
    
    def __init__(
        self,
        weights: Optional[SQWeights] = None,
        tier_boundaries: Optional[TierBoundaries] = None,
    ):
        self.weights = weights or SQWeights()
        self.tier_boundaries = tier_boundaries or TierBoundaries()
        
        # 계산 캐시
        self._node_cache: Dict[str, float] = {}
        self._last_calculation: Optional[datetime] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         CORE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_sq(self, node: Node) -> float:
        """
        단일 노드의 SQ 계산
        
        SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
        """
        # 1. Money 정규화 (입금액)
        m_normalized = min(1.0, node.money_total / self.weights.money_normalizer)
        
        # 2. Synergy 정규화 (성적/등원율)
        s_normalized = min(1.0, node.synergy_score / self.weights.synergy_normalizer)
        
        # 3. Entropy 정규화 (통화시간 + 부정 키워드)
        t_normalized = min(1.0, node.entropy_score / self.weights.entropy_normalizer)
        
        # 4. SQ 계산
        sq = (
            self.weights.w_money * m_normalized +
            self.weights.w_synergy * s_normalized -
            self.weights.w_entropy * t_normalized
        )
        
        # 5. 0~100 스케일로 변환
        sq_scaled = max(0, min(100, sq * 100))
        
        return round(sq_scaled, 2)
    
    def calculate_money_score(
        self,
        sms_records: List[SmsRecord],
        lookback_days: int = 90,
    ) -> float:
        """
        Money(M) 점수 계산
        
        SMS 결제 알림에서 입금액 파싱
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        total_amount = 0.0
        for sms in sms_records:
            if sms.timestamp >= cutoff and sms.is_payment_notification:
                total_amount += sms.parsed_amount or 0
        
        return total_amount
    
    def calculate_synergy_score(
        self,
        lms_records: List[LmsRecord],
        call_records: List[CallRecord],
    ) -> float:
        """
        Synergy(S) 점수 계산
        
        성적 변화율 + 출석률 + 긍정적 통화 패턴
        """
        score = 0.0
        
        # 1. 성적 변화 (최대 40점)
        if lms_records:
            score_changes = [r.score_change for r in lms_records if r.score_change]
            if score_changes:
                avg_change = statistics.mean(score_changes)
                score += min(40, max(0, avg_change * 4))  # 10점 향상 = 40점
        
        # 2. 출석률 (최대 30점)
        if lms_records:
            attendance_rates = [r.attendance_rate for r in lms_records]
            avg_attendance = statistics.mean(attendance_rates)
            score += avg_attendance * 30  # 100% = 30점
        
        # 3. 긍정적 통화 패턴 (최대 30점)
        # 짧은 통화 = 효율적 소통 = 긍정
        if call_records:
            short_calls = sum(1 for c in call_records if c.duration_minutes < 3)
            total_calls = len(call_records)
            if total_calls > 0:
                efficiency_ratio = short_calls / total_calls
                score += efficiency_ratio * 30
        
        return round(score, 2)
    
    def calculate_entropy_score(
        self,
        call_records: List[CallRecord],
        keyword_alerts: List[KeywordAlert],
        lookback_days: int = 30,
    ) -> float:
        """
        Entropy(T) 점수 계산
        
        긴 통화 시간 + 부정 키워드 빈도
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        entropy = 0.0
        
        # 1. 긴 통화 (5분 이상)
        long_calls = [
            c for c in call_records 
            if c.timestamp >= cutoff and c.duration_minutes >= 5
        ]
        total_long_minutes = sum(c.duration_minutes for c in long_calls)
        entropy += total_long_minutes  # 분 단위 그대로
        
        # 2. 부정 키워드
        negative_alerts = [
            a for a in keyword_alerts
            if a.timestamp >= cutoff and a.sentiment == SentimentType.NEGATIVE
        ]
        
        for alert in negative_alerts:
            keyword_weight = self.weights.negative_keywords.get(alert.keyword, 0.1)
            entropy += keyword_weight * 10  # 키워드당 가중치 × 10분
        
        return round(entropy, 2)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         BATCH CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_all_nodes(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        전체 노드의 SQ 계산 및 티어 할당
        """
        # 1. 각 노드 SQ 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. 백분위 계산
        all_scores = [n.sq_score for n in nodes]
        
        for node in nodes:
            percentile = self._calculate_percentile(node.sq_score, all_scores)
            node.tier = self.tier_boundaries.get_tier(percentile)
        
        self._last_calculation = datetime.now()
        
        return nodes
    
    def _calculate_percentile(self, score: float, all_scores: List[float]) -> float:
        """백분위 계산"""
        if not all_scores:
            return 50.0
        
        below_count = sum(1 for s in all_scores if s < score)
        return (below_count / len(all_scores)) * 100
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         Z-SCORE RELATIVE EVALUATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_batch_with_zscore(
        self,
        nodes: List[Node],
        force_recalculate: bool = False,
    ) -> List[Node]:
        """
        Z-Score 기반 상대평가
        
        1. 절대 SQ 계산 후
        2. 전체 집단 내 상대 위치(Z-Score) 산출
        3. 티어를 Z-Score 기준으로 재배정
        
        Returns:
            Z-Score 높은 순으로 정렬된 노드 리스트
        """
        if not nodes:
            return []
        
        # 1. 기존 절대평가 계산
        for node in nodes:
            if force_recalculate or node.id not in self._node_cache:
                node.sq_score = self.calculate_sq(node)
                self._node_cache[node.id] = node.sq_score
            else:
                node.sq_score = self._node_cache[node.id]
        
        # 2. Z-Score 계산
        scores = np.array([n.sq_score for n in nodes])
        mean = np.mean(scores)
        std = np.std(scores) if np.std(scores) > 0 else 1  # 0 방지
        
        # 3. 상대평가 티어 재배정
        for node in nodes:
            node.z_score = float((node.sq_score - mean) / std)
            node.cluster = self._classify_by_zscore(node.z_score)
            node.tier = self._get_tier_by_zscore(node.z_score)
        
        self._last_calculation = datetime.now()
        
        # Z-Score 높은 순 정렬
        return sorted(nodes, key=lambda x: x.z_score or 0, reverse=True)
    
    def _classify_by_zscore(self, z: float) -> str:
        """
        Z-Score 기반 클러스터 분류
        
        클러스터 정의:
        - ELITE:    z >= 2.0   (상위 2.3%)
        - STRONG:   1.0 <= z < 2.0   (상위 15.9%)
        - AVERAGE:  -1.0 <= z < 1.0  (중간 68.2%)
        - WEAK:     -2.0 <= z < -1.0 (하위 15.9%)
        - AT_RISK:  z < -2.0   (하위 2.3%)
        """
        if z >= 2.0:
            return "ELITE"
        elif z >= 1.0:
            return "STRONG"
        elif z >= -1.0:
            return "AVERAGE"
        elif z >= -2.0:
            return "WEAK"
        else:
            return "AT_RISK"
    
    def _get_tier_by_zscore(self, z: float) -> NodeTier:
        """
        Z-Score 기반 티어 할당
        
        정규분포 기준:
        - SOVEREIGN:  z >= 2.33   (상위 1%)
        - DIAMOND:    z >= 1.28   (상위 10%)
        - PLATINUM:   z >= 0.67   (상위 25%)
        - GOLD:       z >= 0.0    (상위 50%)
        - STEEL:      z >= -0.52  (상위 70%)
        - IRON:       나머지       (하위 30%)
        """
        if z >= 2.33:
            return NodeTier.SOVEREIGN
        elif z >= 1.28:
            return NodeTier.DIAMOND
        elif z >= 0.67:
            return NodeTier.PLATINUM
        elif z >= 0.0:
            return NodeTier.GOLD
        elif z >= -0.52:
            return NodeTier.STEEL
        else:
            return NodeTier.IRON
    
    def get_zscore_statistics(self, nodes: List[Node]) -> Dict[str, Any]:
        """
        Z-Score 기반 통계 요약
        """
        if not nodes:
            return {"error": "No nodes provided"}
        
        z_scores = [n.z_score for n in nodes if n.z_score is not None]
        sq_scores = [n.sq_score for n in nodes]
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster or "UNKNOWN"
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        return {
            "total_nodes": len(nodes),
            "sq_mean": round(float(np.mean(sq_scores)), 2),
            "sq_std": round(float(np.std(sq_scores)), 2),
            "sq_min": round(min(sq_scores), 2),
            "sq_max": round(max(sq_scores), 2),
            "z_score_range": {
                "min": round(min(z_scores), 3) if z_scores else None,
                "max": round(max(z_scores), 3) if z_scores else None,
            },
            "cluster_distribution": cluster_dist,
            "percentile_benchmarks": {
                "top_1%": round(float(np.percentile(sq_scores, 99)), 2),
                "top_10%": round(float(np.percentile(sq_scores, 90)), 2),
                "top_25%": round(float(np.percentile(sq_scores, 75)), 2),
                "median": round(float(np.median(sq_scores)), 2),
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         TIER ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_tier_distribution(self, nodes: List[Node]) -> Dict[str, int]:
        """티어별 분포"""
        distribution = {tier.value: 0 for tier in NodeTier}
        
        for node in nodes:
            distribution[node.tier.value] += 1
        
        return distribution
    
    def get_tier_statistics(self, nodes: List[Node]) -> Dict[str, Dict]:
        """티어별 통계"""
        tier_stats = {}
        
        for tier in NodeTier:
            tier_nodes = [n for n in nodes if n.tier == tier]
            
            if tier_nodes:
                scores = [n.sq_score for n in tier_nodes]
                money = [n.money_total for n in tier_nodes]
                
                tier_stats[tier.value] = {
                    "count": len(tier_nodes),
                    "avg_sq": round(statistics.mean(scores), 2),
                    "avg_money": round(statistics.mean(money), 0),
                    "min_sq": min(scores),
                    "max_sq": max(scores),
                }
            else:
                tier_stats[tier.value] = {
                    "count": 0,
                    "avg_sq": 0,
                    "avg_money": 0,
                    "min_sq": 0,
                    "max_sq": 0,
                }
        
        return tier_stats
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         GOLDEN PATH RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_upgrade_candidates(
        self,
        nodes: List[Node],
        top_n: int = 10,
    ) -> List[Tuple[Node, str]]:
        """
        티어 상승 가능성 높은 노드 추천
        
        Returns: [(노드, 추천 이유), ...]
        """
        candidates = []
        
        for node in nodes:
            # 다음 티어까지 필요한 점수 계산
            current_percentile = self._calculate_percentile(
                node.sq_score,
                [n.sq_score for n in nodes]
            )
            
            # 티어 경계에 가까운 노드 찾기
            if node.tier == NodeTier.IRON and current_percentile >= 25:
                candidates.append((node, "Steel 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.STEEL and current_percentile >= 45:
                candidates.append((node, "Gold 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.GOLD and current_percentile >= 70:
                candidates.append((node, "Platinum 승급까지 5% 이내"))
            
            elif node.tier == NodeTier.PLATINUM and current_percentile >= 85:
                candidates.append((node, "Diamond 승급까지 5% 이내"))
        
        # SQ 점수 높은 순 정렬
        candidates.sort(key=lambda x: x[0].sq_score, reverse=True)
        
        return candidates[:top_n]
    
    def get_churn_risks(
        self,
        nodes: List[Node],
        threshold: float = -0.3,
    ) -> List[Tuple[Node, str]]:
        """
        이탈 위험 노드 식별
        
        엔트로피 높고, 시너지 낮은 노드
        """
        risks = []
        
        for node in nodes:
            # 엔트로피 비율
            e_ratio = node.entropy_score / self.weights.entropy_normalizer
            s_ratio = node.synergy_score / self.weights.synergy_normalizer
            
            risk_score = e_ratio - s_ratio
            
            if risk_score >= threshold:
                if e_ratio > 0.5:
                    reason = f"통화 시간 과다 ({node.entropy_score:.0f}분)"
                elif s_ratio < 0.3:
                    reason = f"시너지 저하 (출석/성적 하락)"
                else:
                    reason = "부정 키워드 감지"
                
                risks.append((node, reason))
        
        # 위험도 높은 순 정렬
        risks.sort(
            key=lambda x: x[0].entropy_score - x[0].synergy_score,
            reverse=True
        )
        
        return risks
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         WEIGHT UPDATE
    # ═══════════════════════════════════════════════════════════════════════
    
    def update_weights(self, new_weights: SQWeights):
        """
        서버에서 새 가중치 수신 시 업데이트
        
        캐시 무효화 → 재계산 필요
        """
        self.weights = new_weights
        self._node_cache.clear()  # 캐시 무효화
        self._last_calculation = None


# ═══════════════════════════════════════════════════════════════════════════
#                              CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_calculate(
    money: float,
    synergy: float,
    entropy: float,
    weights: Optional[SQWeights] = None,
) -> float:
    """
    빠른 SQ 계산 (테스트용)
    """
    w = weights or SQWeights()
    
    m_norm = min(1.0, money / w.money_normalizer)
    s_norm = min(1.0, synergy / w.synergy_normalizer)
    t_norm = min(1.0, entropy / w.entropy_normalizer)
    
    sq = (w.w_money * m_norm + w.w_synergy * s_norm - w.w_entropy * t_norm)
    
    return max(0, min(100, sq * 100))


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 데이터
    test_nodes = [
        Node(id="1", name="김철수", phone="010-1234-5678", 
             money_total=500000, synergy_score=80, entropy_score=10),
        Node(id="2", name="이영희", phone="010-2345-6789",
             money_total=300000, synergy_score=60, entropy_score=30),
        Node(id="3", name="박민수", phone="010-3456-7890",
             money_total=100000, synergy_score=40, entropy_score=50),
        Node(id="4", name="최지연", phone="010-4567-8901",
             money_total=800000, synergy_score=90, entropy_score=5),
        Node(id="5", name="정수현", phone="010-5678-9012",
             money_total=50000, synergy_score=20, entropy_score=70),
    ]
    
    # 계산기 생성
    calculator = SynergyCalculator()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Z-Score 기반 상대평가 테스트
    # ═══════════════════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("AUTUS SQ Calculator Test - Z-Score 상대평가")
    print("=" * 70)
    
    # Z-Score 기반 계산 (높은 순 정렬)
    ranked_nodes = calculator.calculate_batch_with_zscore(test_nodes)
    
    print("\n📊 Z-Score 기반 순위 (상대평가)")
    print("-" * 70)
    print(f"{'순위':<4} {'이름':<10} {'SQ점수':<10} {'Z-Score':<12} {'클러스터':<12} {'티어':<10}")
    print("-" * 70)
    
    for rank, node in enumerate(ranked_nodes, 1):
        z_str = f"{node.z_score:+.3f}" if node.z_score else "N/A"
        print(f"{rank:<4} {node.name:<10} {node.sq_score:<10.2f} {z_str:<12} {node.cluster:<12} {node.tier.value:<10}")
    
    # Z-Score 통계
    print("\n" + "=" * 70)
    print("📈 Z-Score 통계 요약")
    print("=" * 70)
    
    stats = calculator.get_zscore_statistics(ranked_nodes)
    
    print(f"\n총 노드 수: {stats['total_nodes']}")
    print(f"SQ 평균: {stats['sq_mean']} (표준편차: {stats['sq_std']})")
    print(f"SQ 범위: {stats['sq_min']} ~ {stats['sq_max']}")
    
    print(f"\n클러스터 분포:")
    for cluster, count in stats['cluster_distribution'].items():
        print(f"  {cluster}: {count}명")
    
    print(f"\n백분위 벤치마크:")
    for key, value in stats['percentile_benchmarks'].items():
        print(f"  {key}: {value}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 기존 백분위 방식 비교
    # ═══════════════════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("📊 기존 백분위 방식 비교")
    print("=" * 70)
    
    calculated = calculator.calculate_all_nodes(test_nodes, force_recalculate=True)
    print(f"\nTier Distribution: {calculator.get_tier_distribution(calculated)}")
    
    print("\n" + "=" * 70)
    print("🚀 Upgrade Candidates:")
    for node, reason in calculator.get_upgrade_candidates(calculated):
        print(f"  {node.name}: {reason}")
    
    print("\n⚠️ Churn Risks:")
    for node, reason in calculator.get_churn_risks(calculated):
        print(f"  {node.name}: {reason}")

























