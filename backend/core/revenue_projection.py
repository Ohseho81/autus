"""
AUTUS Revenue Projection & Value Harvester
============================================

Monte Carlo 시너지 기반 수익 예측 엔진

Features:
- 1/3/6개월 수익 예측
- n^n 가치 폭발 시뮬레이션
- 시너지 임계점 감지
- 가치 수확 타이밍 최적화
- 골든 볼륨 ROI 계산

Physics:
- 시너지 복리 효과: V(t) = V₀ × e^(r×t)
- 중력 가속: a = G × Σm / r²
- 엔트로피 감쇠: S(t) = S₀ × e^(-λt)

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import math
import random


# ================================================================
# CONSTANTS
# ================================================================

class ProjectionConfig:
    """예측 설정"""
    
    # 시너지 복리 효과
    SYNERGY_COMPOUND_RATE = 0.15      # 월 15% 복리
    GOLDEN_BONUS_RATE = 0.25          # 골든 볼륨 보너스 25%
    
    # n^n 가치 폭발 상수
    N_N_THRESHOLD = 5                 # 5명 이상 시 발동
    N_N_MULTIPLIER = 1.5              # 기본 승수
    
    # 엔트로피 감쇠
    ENTROPY_DECAY_RATE = 0.1          # 월 10% 감쇠
    
    # 시간 가치 환산
    HOUR_VALUE_KRW = 100000           # 시간당 10만원
    
    # 협업 성공률
    BASE_COLLABORATION_RATE = 0.6
    SYNERGY_COLLABORATION_BOOST = 0.3


# ================================================================
# DATA STRUCTURES
# ================================================================

class ProjectionPeriod(Enum):
    """예측 기간"""
    ONE_MONTH = 1
    THREE_MONTHS = 3
    SIX_MONTHS = 6
    ONE_YEAR = 12


@dataclass
class GoldenNode:
    """골든 볼륨 노드"""
    id: str
    name: str
    synergy: float
    revenue: float
    time_spent: float
    grade: str
    
    @property
    def efficiency(self) -> float:
        """시간 효율"""
        if self.time_spent <= 0:
            return 0
        return self.revenue / (self.time_spent * ProjectionConfig.HOUR_VALUE_KRW)
    
    @property
    def projected_monthly_value(self) -> float:
        """월간 예상 가치"""
        base = self.revenue * (1 + self.synergy * 0.5)
        compound = base * (1 + ProjectionConfig.SYNERGY_COMPOUND_RATE)
        return compound


@dataclass
class RevenueProjection:
    """수익 예측 결과"""
    period_months: int
    base_value: float
    projected_value: float
    growth_rate: float
    
    synergy_contribution: float
    entropy_reduction_value: float
    time_savings_value: float
    collaboration_value: float
    
    n_n_multiplier: float
    golden_count: int
    
    confidence: float
    risk_factors: List[str]
    
    breakdown: Dict[str, float] = field(default_factory=dict)
    monthly_forecast: List[Dict] = field(default_factory=list)


@dataclass
class ValueHarvestOpportunity:
    """가치 수확 기회"""
    id: str
    type: str
    target_nodes: List[str]
    synergy_score: float
    probability: float
    estimated_value: float
    optimal_timing: str
    action_required: str
    message_template: str


@dataclass
class NNExplosionEvent:
    """n^n 가치 폭발 이벤트"""
    trigger_nodes: List[str]
    combined_synergy: float
    explosion_multiplier: float
    projected_value: float
    probability: float
    conditions: List[str]


# ================================================================
# REVENUE PROJECTION ENGINE
# ================================================================

class RevenueProjectionEngine:
    """
    수익 예측 엔진
    
    Monte Carlo 시너지 기반 미래 가치 예측
    """
    
    def __init__(self):
        self.golden_nodes: List[GoldenNode] = []
        self.entropy_nodes: List[Dict] = []
        self.system_entropy: float = 0.0
        self.system_efficiency: float = 1.0
    
    def load_golden_volume(self, nodes_data: List[Dict]):
        """골든 볼륨 로드"""
        self.golden_nodes = [
            GoldenNode(
                id=n["id"],
                name=n["name"],
                synergy=n["synergy"],
                revenue=n.get("revenue", 0),
                time_spent=n.get("time_spent", 0),
                grade=n.get("grade", "GOLDEN"),
            )
            for n in nodes_data
        ]
    
    def set_system_state(self, entropy: float, efficiency: float):
        """시스템 상태 설정"""
        self.system_entropy = entropy
        self.system_efficiency = efficiency
    
    def project_revenue(
        self,
        period: ProjectionPeriod,
        include_nn_explosion: bool = True
    ) -> RevenueProjection:
        """
        수익 예측 실행
        
        Args:
            period: 예측 기간
            include_nn_explosion: n^n 폭발 포함 여부
        """
        months = period.value
        
        # 기본 가치
        base_value = sum(n.revenue for n in self.golden_nodes if n.revenue > 0)
        
        # 1. 시너지 복리 효과
        avg_synergy = (
            sum(n.synergy for n in self.golden_nodes) / len(self.golden_nodes)
            if self.golden_nodes else 0
        )
        synergy_rate = ProjectionConfig.SYNERGY_COMPOUND_RATE * (1 + avg_synergy)
        synergy_contribution = base_value * ((1 + synergy_rate) ** months - 1)
        
        # 2. 엔트로피 감소 효과
        entropy_reduction = self.system_entropy * (
            1 - math.exp(-ProjectionConfig.ENTROPY_DECAY_RATE * months)
        )
        entropy_value = base_value * entropy_reduction * 0.1
        
        # 3. 시간 절약 가치
        saved_hours_per_month = self.system_entropy * 5  # 엔트로피 단위당 5시간 절약
        time_savings = (
            saved_hours_per_month * months * 
            ProjectionConfig.HOUR_VALUE_KRW
        )
        
        # 4. 협업 가치
        collaboration_value = self._calculate_collaboration_value(months)
        
        # 5. n^n 폭발 효과
        n_n_multiplier = 1.0
        if include_nn_explosion and len(self.golden_nodes) >= ProjectionConfig.N_N_THRESHOLD:
            n_n_multiplier = self._calculate_nn_multiplier()
        
        # 총 예상 가치
        projected_value = (
            (base_value + synergy_contribution + entropy_value + 
             time_savings + collaboration_value) * n_n_multiplier
        )
        
        # 성장률
        growth_rate = (projected_value / base_value - 1) if base_value > 0 else 0
        
        # 신뢰도
        confidence = self._calculate_confidence(months)
        
        # 리스크 요소
        risk_factors = self._identify_risks()
        
        # 월별 예측
        monthly_forecast = self._generate_monthly_forecast(
            base_value, synergy_rate, months
        )
        
        return RevenueProjection(
            period_months=months,
            base_value=base_value,
            projected_value=projected_value,
            growth_rate=growth_rate,
            synergy_contribution=synergy_contribution,
            entropy_reduction_value=entropy_value,
            time_savings_value=time_savings,
            collaboration_value=collaboration_value,
            n_n_multiplier=n_n_multiplier,
            golden_count=len(self.golden_nodes),
            confidence=confidence,
            risk_factors=risk_factors,
            breakdown={
                "base": base_value,
                "synergy_compound": synergy_contribution,
                "entropy_reduction": entropy_value,
                "time_savings": time_savings,
                "collaboration": collaboration_value,
                "nn_multiplier_effect": projected_value - (
                    base_value + synergy_contribution + entropy_value + 
                    time_savings + collaboration_value
                ),
            },
            monthly_forecast=monthly_forecast,
        )
    
    def _calculate_collaboration_value(self, months: int) -> float:
        """협업 가치 계산"""
        if len(self.golden_nodes) < 2:
            return 0
        
        total = 0
        
        # 상위 노드 쌍별 협업 가능성
        for i, node_a in enumerate(self.golden_nodes[:5]):
            for node_b in self.golden_nodes[i+1:5]:
                combined_synergy = (node_a.synergy + node_b.synergy) / 2
                
                # 협업 성공률
                success_rate = (
                    ProjectionConfig.BASE_COLLABORATION_RATE +
                    combined_synergy * ProjectionConfig.SYNERGY_COLLABORATION_BOOST
                )
                
                # 협업 가치 (두 노드 수익의 시너지 효과)
                collab_value = (
                    (node_a.revenue + node_b.revenue) * 
                    combined_synergy * 0.3 * 
                    success_rate
                )
                
                total += collab_value
        
        return total * months
    
    def _calculate_nn_multiplier(self) -> float:
        """n^n 승수 계산"""
        n = len(self.golden_nodes)
        
        if n < ProjectionConfig.N_N_THRESHOLD:
            return 1.0
        
        # 시너지 가중 n^n
        avg_synergy = sum(node.synergy for node in self.golden_nodes) / n
        
        # 기본 승수 + 시너지 보정
        base_multiplier = math.log(n ** n) / 10  # 스케일 조정
        synergy_boost = avg_synergy * 0.5
        
        return ProjectionConfig.N_N_MULTIPLIER + base_multiplier + synergy_boost
    
    def _calculate_confidence(self, months: int) -> float:
        """신뢰도 계산"""
        # 기본 신뢰도
        base_confidence = 0.9
        
        # 기간에 따른 감소
        time_penalty = months * 0.05
        
        # 엔트로피에 따른 감소
        entropy_penalty = self.system_entropy * 0.02
        
        # 골든 노드 수에 따른 증가
        golden_bonus = min(0.1, len(self.golden_nodes) * 0.01)
        
        confidence = base_confidence - time_penalty - entropy_penalty + golden_bonus
        return max(0.5, min(0.99, confidence))
    
    def _identify_risks(self) -> List[str]:
        """리스크 요소 식별"""
        risks = []
        
        if self.system_entropy > 3.0:
            risks.append("높은 시스템 엔트로피 - 노드 정리 필요")
        
        if len(self.golden_nodes) < 3:
            risks.append("골든 볼륨 부족 - 핵심 노드 확보 필요")
        
        # 시너지 하락 노드 체크
        declining_nodes = [
            n for n in self.golden_nodes
            if n.synergy < 0.85
        ]
        if declining_nodes:
            risks.append(f"{len(declining_nodes)}개 노드 시너지 하락 추세")
        
        # 효율성 체크
        if self.system_efficiency < 0.6:
            risks.append("시스템 효율성 저하 - 최적화 필요")
        
        return risks
    
    def _generate_monthly_forecast(
        self,
        base_value: float,
        synergy_rate: float,
        months: int
    ) -> List[Dict]:
        """월별 예측 생성"""
        forecast = []
        current_value = base_value
        
        for month in range(1, months + 1):
            current_value *= (1 + synergy_rate)
            
            forecast.append({
                "month": month,
                "projected_value": round(current_value, 0),
                "cumulative_growth": round((current_value / base_value - 1) * 100, 1),
                "synergy_effect": round(current_value - base_value, 0),
            })
        
        return forecast


# ================================================================
# VALUE HARVESTER
# ================================================================

class ValueHarvester:
    """
    가치 수확 엔진
    
    최적의 수익 실현 타이밍과 방법 제안
    """
    
    def __init__(self, golden_nodes: List[GoldenNode]):
        self.golden_nodes = golden_nodes
    
    def identify_opportunities(self) -> List[ValueHarvestOpportunity]:
        """가치 수확 기회 식별"""
        opportunities = []
        
        # 1. 고시너지 협업 기회
        for i, node_a in enumerate(self.golden_nodes[:5]):
            for node_b in self.golden_nodes[i+1:5]:
                combined = (node_a.synergy + node_b.synergy) / 2
                
                if combined >= 0.9:
                    opportunities.append(self._create_collaboration_opportunity(
                        node_a, node_b, combined
                    ))
        
        # 2. 개별 가치 수확
        for node in self.golden_nodes:
            if node.synergy >= 0.95:
                opportunities.append(self._create_individual_opportunity(node))
        
        # 3. n^n 폭발 기회
        if len(self.golden_nodes) >= 5:
            opportunities.append(self._create_nn_opportunity())
        
        # 우선순위 정렬
        opportunities.sort(key=lambda x: x.estimated_value, reverse=True)
        
        return opportunities
    
    def _create_collaboration_opportunity(
        self,
        node_a: GoldenNode,
        node_b: GoldenNode,
        combined_synergy: float
    ) -> ValueHarvestOpportunity:
        """협업 기회 생성"""
        estimated_value = (
            (node_a.revenue + node_b.revenue) * 
            combined_synergy * 0.5
        )
        
        return ValueHarvestOpportunity(
            id=f"collab_{node_a.id}_{node_b.id}",
            type="COLLABORATION",
            target_nodes=[node_a.id, node_b.id],
            synergy_score=combined_synergy,
            probability=min(0.95, 0.6 + combined_synergy * 0.3),
            estimated_value=estimated_value,
            optimal_timing="즉시 실행 권장",
            action_required="공동 프로젝트 제안",
            message_template=self._generate_collab_message(node_a, node_b),
        )
    
    def _create_individual_opportunity(
        self,
        node: GoldenNode
    ) -> ValueHarvestOpportunity:
        """개별 기회 생성"""
        estimated_value = node.revenue * node.synergy * 0.3
        
        return ValueHarvestOpportunity(
            id=f"individual_{node.id}",
            type="DEEPENING",
            target_nodes=[node.id],
            synergy_score=node.synergy,
            probability=min(0.9, node.synergy),
            estimated_value=estimated_value,
            optimal_timing="이번 주 내 실행",
            action_required="관계 심화 미팅 제안",
            message_template=self._generate_deepening_message(node),
        )
    
    def _create_nn_opportunity(self) -> ValueHarvestOpportunity:
        """n^n 기회 생성"""
        n = len(self.golden_nodes)
        avg_synergy = sum(node.synergy for node in self.golden_nodes) / n
        total_revenue = sum(node.revenue for node in self.golden_nodes if node.revenue > 0)
        
        # n^n 승수 효과
        multiplier = math.log(n ** n) / 5
        estimated_value = total_revenue * multiplier * avg_synergy
        
        return ValueHarvestOpportunity(
            id="nn_explosion",
            type="N_N_EXPLOSION",
            target_nodes=[node.id for node in self.golden_nodes[:5]],
            synergy_score=avg_synergy,
            probability=avg_synergy * 0.8,
            estimated_value=estimated_value,
            optimal_timing="골든 볼륨 5인 동시 활성화 시",
            action_required="다자간 시너지 프로젝트 발의",
            message_template="골든 5인 연합 프로젝트 킥오프 미팅 제안",
        )
    
    def _generate_collab_message(
        self,
        node_a: GoldenNode,
        node_b: GoldenNode
    ) -> str:
        """협업 메시지 생성"""
        return f"""안녕하세요 {node_a.name}님, {node_b.name}님,

두 분과의 협업이 최적의 시너지를 창출할 수 있는 타이밍입니다.
아우투스 분석 결과, 현재 결합 시너지가 {(node_a.synergy + node_b.synergy)/2:.2f}로 
임계점을 돌파했습니다.

3자 미팅을 통해 공동 프로젝트 가능성을 논의해 보시는 건 어떨까요?"""
    
    def _generate_deepening_message(self, node: GoldenNode) -> str:
        """심화 메시지 생성"""
        return f"""{node.name}님,

우리의 시너지가 {node.synergy:.2f}로 최고조에 달했습니다.
이 momentum을 장기 자산으로 고정하기 위해,
심층 협력 방안을 논의해 보고 싶습니다.

이번 주 중 30분 미팅이 가능하실까요?"""
    
    def detect_nn_explosion(self) -> Optional[NNExplosionEvent]:
        """n^n 폭발 감지"""
        if len(self.golden_nodes) < ProjectionConfig.N_N_THRESHOLD:
            return None
        
        n = len(self.golden_nodes)
        avg_synergy = sum(node.synergy for node in self.golden_nodes) / n
        
        if avg_synergy < 0.8:
            return None
        
        # 폭발 조건 체크
        conditions = []
        
        if all(node.synergy >= 0.8 for node in self.golden_nodes[:5]):
            conditions.append("상위 5인 전원 골든 상태")
        
        if avg_synergy >= 0.9:
            conditions.append("평균 시너지 0.9 이상")
        
        high_collab_pairs = sum(
            1 for i, a in enumerate(self.golden_nodes[:5])
            for b in self.golden_nodes[i+1:5]
            if (a.synergy + b.synergy) / 2 >= 0.9
        )
        if high_collab_pairs >= 3:
            conditions.append(f"고시너지 협업 쌍 {high_collab_pairs}개")
        
        if len(conditions) < 2:
            return None
        
        # 폭발 승수
        multiplier = math.log(n ** n) / 5 * (1 + avg_synergy)
        
        total_value = sum(node.revenue for node in self.golden_nodes if node.revenue > 0)
        projected_value = total_value * multiplier
        
        return NNExplosionEvent(
            trigger_nodes=[node.id for node in self.golden_nodes[:5]],
            combined_synergy=avg_synergy,
            explosion_multiplier=multiplier,
            projected_value=projected_value,
            probability=avg_synergy * 0.85,
            conditions=conditions,
        )


# ================================================================
# COMPLETE PROJECTION REPORT
# ================================================================

def generate_full_projection_report(
    golden_volume: List[Dict],
    system_entropy: float,
    system_efficiency: float
) -> Dict:
    """
    완전한 수익 예측 리포트 생성
    """
    # 엔진 초기화
    engine = RevenueProjectionEngine()
    engine.load_golden_volume(golden_volume)
    engine.set_system_state(system_entropy, system_efficiency)
    
    # 1/3/6개월 예측
    projection_1m = engine.project_revenue(ProjectionPeriod.ONE_MONTH)
    projection_3m = engine.project_revenue(ProjectionPeriod.THREE_MONTHS)
    projection_6m = engine.project_revenue(ProjectionPeriod.SIX_MONTHS)
    
    # 가치 수확 기회
    harvester = ValueHarvester(engine.golden_nodes)
    opportunities = harvester.identify_opportunities()
    
    # n^n 폭발 감지
    nn_event = harvester.detect_nn_explosion()
    
    return {
        "generated_at": datetime.now().isoformat(),
        "system_state": {
            "entropy": system_entropy,
            "efficiency": system_efficiency,
            "golden_count": len(golden_volume),
        },
        "projections": {
            "1_month": {
                "base_value": projection_1m.base_value,
                "projected_value": projection_1m.projected_value,
                "growth_rate": f"{projection_1m.growth_rate * 100:.1f}%",
                "confidence": f"{projection_1m.confidence * 100:.0f}%",
                "breakdown": projection_1m.breakdown,
            },
            "3_months": {
                "base_value": projection_3m.base_value,
                "projected_value": projection_3m.projected_value,
                "growth_rate": f"{projection_3m.growth_rate * 100:.1f}%",
                "confidence": f"{projection_3m.confidence * 100:.0f}%",
                "monthly_forecast": projection_3m.monthly_forecast,
            },
            "6_months": {
                "base_value": projection_6m.base_value,
                "projected_value": projection_6m.projected_value,
                "growth_rate": f"{projection_6m.growth_rate * 100:.1f}%",
                "confidence": f"{projection_6m.confidence * 100:.0f}%",
                "nn_multiplier": projection_6m.n_n_multiplier,
            },
        },
        "harvest_opportunities": [
            {
                "id": opp.id,
                "type": opp.type,
                "targets": opp.target_nodes,
                "synergy": opp.synergy_score,
                "probability": f"{opp.probability * 100:.0f}%",
                "estimated_value": opp.estimated_value,
                "timing": opp.optimal_timing,
                "action": opp.action_required,
            }
            for opp in opportunities[:5]
        ],
        "nn_explosion": {
            "detected": nn_event is not None,
            "details": {
                "trigger_nodes": nn_event.trigger_nodes if nn_event else [],
                "combined_synergy": nn_event.combined_synergy if nn_event else 0,
                "multiplier": nn_event.explosion_multiplier if nn_event else 1,
                "projected_value": nn_event.projected_value if nn_event else 0,
                "probability": f"{nn_event.probability * 100:.0f}%" if nn_event else "0%",
                "conditions": nn_event.conditions if nn_event else [],
            } if nn_event else None,
        },
        "risks": projection_1m.risk_factors,
        "recommendations": [
            "골든 볼륨 유지를 위해 상위 5인과의 주간 체크인 필수",
            "엔트로피 노드 정리로 확보된 시간을 고가치 활동에 재투자",
            "n^n 폭발 조건 충족 시 다자간 프로젝트 즉시 발의",
        ],
    }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Revenue Projection Engine Test")
    print("=" * 70)
    
    # 샘플 골든 볼륨
    golden_volume = [
        {"id": "K", "name": "김대표", "synergy": 0.992, "revenue": 5000000, "time_spent": 20, "grade": "CORE"},
        {"id": "Z", "name": "이사장", "synergy": 0.945, "revenue": 3000000, "time_spent": 15, "grade": "GOLDEN"},
        {"id": "P", "name": "박이사", "synergy": 0.918, "revenue": 2500000, "time_spent": 25, "grade": "GOLDEN"},
        {"id": "AH", "name": "안대리", "synergy": 0.886, "revenue": 1500000, "time_spent": 30, "grade": "GOLDEN"},
        {"id": "V", "name": "최과장", "synergy": 0.854, "revenue": 1200000, "time_spent": 20, "grade": "GOLDEN"},
    ]
    
    # 리포트 생성
    report = generate_full_projection_report(
        golden_volume=golden_volume,
        system_entropy=0.08,
        system_efficiency=0.92,
    )
    
    print("\n[1. 시스템 상태]")
    print(f"  Entropy: {report['system_state']['entropy']}")
    print(f"  Efficiency: {report['system_state']['efficiency']:.0%}")
    print(f"  Golden Count: {report['system_state']['golden_count']}")
    
    print("\n[2. 1개월 예측]")
    p1 = report['projections']['1_month']
    print(f"  Base Value: ₩{p1['base_value']:,.0f}")
    print(f"  Projected: ₩{p1['projected_value']:,.0f}")
    print(f"  Growth: {p1['growth_rate']}")
    print(f"  Confidence: {p1['confidence']}")
    
    print("\n[3. 3개월 예측]")
    p3 = report['projections']['3_months']
    print(f"  Projected: ₩{p3['projected_value']:,.0f}")
    print(f"  Growth: {p3['growth_rate']}")
    print("  Monthly Forecast:")
    for m in p3['monthly_forecast']:
        print(f"    Month {m['month']}: ₩{m['projected_value']:,.0f} (+{m['cumulative_growth']}%)")
    
    print("\n[4. 6개월 예측]")
    p6 = report['projections']['6_months']
    print(f"  Projected: ₩{p6['projected_value']:,.0f}")
    print(f"  Growth: {p6['growth_rate']}")
    print(f"  n^n Multiplier: {p6['nn_multiplier']:.2f}x")
    
    print("\n[5. 가치 수확 기회]")
    for opp in report['harvest_opportunities']:
        print(f"  [{opp['type']}] {opp['targets']}")
        print(f"    Synergy: {opp['synergy']:.2f}, Value: ₩{opp['estimated_value']:,.0f}")
        print(f"    Probability: {opp['probability']}, Timing: {opp['timing']}")
    
    print("\n[6. n^n 폭발 감지]")
    nn = report['nn_explosion']
    if nn['detected']:
        print(f"  ⚡ 폭발 감지됨!")
        print(f"  Trigger Nodes: {nn['details']['trigger_nodes']}")
        print(f"  Combined Synergy: {nn['details']['combined_synergy']:.2f}")
        print(f"  Multiplier: {nn['details']['multiplier']:.2f}x")
        print(f"  Projected Value: ₩{nn['details']['projected_value']:,.0f}")
        print(f"  Probability: {nn['details']['probability']}")
        print(f"  Conditions: {nn['details']['conditions']}")
    else:
        print("  폭발 조건 미충족")
    
    print("\n[7. 리스크]")
    for risk in report['risks']:
        print(f"  ⚠️ {risk}")
    
    print("\n" + "=" * 70)
    print("✅ Revenue Projection Test Complete")



