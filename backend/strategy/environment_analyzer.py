# ═══════════════════════════════════════════════════════════════════════════
# AUTUS Environment Analyzer - 환경 분석 엔진
# ═══════════════════════════════════════════════════════════════════════════
#
# 환경 결정:
# - ADAPT: 적응 (Deep Dive)
# - MIGRATE: 전이 (Exit)
# - HOLD: 유지 (현상 유지)
# - OPTIMIZE: 최적화 (미세 조정)
#
# ═══════════════════════════════════════════════════════════════════════════

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
from datetime import datetime, timezone
import math


class EnvironmentDecision(str, Enum):
    """환경 결정"""
    ADAPT = "adapt"           # 적응 (Deep Dive)
    MIGRATE = "migrate"       # 전이 (Exit)
    HOLD = "hold"             # 유지 (현상 유지)
    OPTIMIZE = "optimize"     # 최적화 (미세 조정)


class MigrationTarget(str, Enum):
    """전이 대상 산업"""
    UNMANNED_LOGISTICS = "unmanned_logistics"   # 무인 물류/창고
    DATA_CENTER = "data_center"                 # 데이터 센터
    UNMANNED_RETAIL = "unmanned_retail"         # 무인 리테일
    CREATIVE_STUDIO = "creative_studio"         # 크리에이터 스튜디오
    HEALTH_WELLNESS = "health_wellness"         # 헬스/웰니스
    EDUCATION_TECH = "education_tech"           # 에듀테크


@dataclass
class EnvironmentMetrics:
    """환경 지표"""
    # 에너지 지표
    energy_density: float         # 에너지 밀도 (ρ) - 단위 면적당 수익
    potential_mass: float         # 잠재 질량 - 미흡수 고객 비율
    
    # 마찰 지표
    competition_friction: float   # 경쟁 마찰력 (R)
    regulation_friction: float    # 규제 마찰력
    operational_friction: float   # 운영 마찰력
    
    # 가속 지표
    growth_velocity: float        # 성장 속도 (V)
    market_saturation: float      # 시장 포화도 (0-1)
    
    # 엔트로피 지표
    entropy_level: float          # 엔트로피 수준 (E)
    entropy_trend: float          # 엔트로피 추세 (-1 ~ +1)


@dataclass
class EnvironmentAnalysis:
    """환경 분석 결과"""
    entity_id: str
    entity_name: str
    
    # 현재 상태
    current_metrics: EnvironmentMetrics
    
    # 결정
    decision: EnvironmentDecision
    confidence: float
    
    # 이유
    decision_factors: List[str]
    
    # 예상 효과
    projected_improvement: float  # 예상 개선율
    
    # 적응 시 액션 (Optional - 기본값 있음)
    adaptation_actions: Optional[List[str]] = None
    
    # 전이 시 대상 (Optional - 기본값 있음)
    migration_target: Optional[MigrationTarget] = None
    migration_reasoning: Optional[str] = None
    
    # 메타 (기본값 있음)
    analyzed_at: str = ""


class EnvironmentAnalyzer:
    """환경 분석 엔진"""
    
    # 임계값
    THRESHOLDS = {
        "entropy_critical": 0.7,          # 엔트로피 임계
        "saturation_critical": 0.85,      # 포화도 임계
        "friction_critical": 0.6,         # 마찰력 임계
        "potential_mass_min": 0.2,        # 최소 잠재 질량
        "growth_velocity_min": 0.05,      # 최소 성장 속도
    }
    
    # 전이 조건 매트릭스
    MIGRATION_CONDITIONS = {
        MigrationTarget.UNMANNED_LOGISTICS: {
            "required_signals": ["high_physical_independence", "low_solution_dependency"],
            "suitable_from": ["retail", "storage", "office"],
        },
        MigrationTarget.DATA_CENTER: {
            "required_signals": ["high_automation", "stable_demand"],
            "suitable_from": ["office", "storage"],
        },
        MigrationTarget.UNMANNED_RETAIL: {
            "required_signals": ["high_traffic", "impulse_purchase"],
            "suitable_from": ["retail", "food"],
        },
        MigrationTarget.CREATIVE_STUDIO: {
            "required_signals": ["high_scarcity", "creative_demand"],
            "suitable_from": ["office", "education"],
        },
        MigrationTarget.HEALTH_WELLNESS: {
            "required_signals": ["recurring_demand", "premium_willingness"],
            "suitable_from": ["sports", "education"],
        },
        MigrationTarget.EDUCATION_TECH: {
            "required_signals": ["outcome_focus", "digital_readiness"],
            "suitable_from": ["education", "consulting"],
        },
    }
    
    def __init__(self):
        self.analyses: Dict[str, EnvironmentAnalysis] = {}
    
    def analyze(self, entity_id: str, entity_name: str,
                metrics: EnvironmentMetrics,
                current_industry: str = None) -> EnvironmentAnalysis:
        """환경 분석"""
        
        # 결정 계산
        decision, confidence, factors = self._make_decision(metrics)
        
        # 적응 액션 생성
        adaptation_actions = None
        if decision in [EnvironmentDecision.ADAPT, EnvironmentDecision.OPTIMIZE]:
            adaptation_actions = self._generate_adaptation_actions(metrics)
        
        # 전이 대상 선정
        migration_target = None
        migration_reasoning = None
        if decision == EnvironmentDecision.MIGRATE:
            migration_target, migration_reasoning = self._select_migration_target(
                metrics, current_industry
            )
        
        # 예상 개선율
        projected_improvement = self._project_improvement(decision, metrics)
        
        analysis = EnvironmentAnalysis(
            entity_id=entity_id,
            entity_name=entity_name,
            current_metrics=metrics,
            decision=decision,
            confidence=confidence,
            decision_factors=factors,
            projected_improvement=projected_improvement,
            adaptation_actions=adaptation_actions,
            migration_target=migration_target,
            migration_reasoning=migration_reasoning,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
        )
        
        self.analyses[entity_id] = analysis
        
        return analysis
    
    def _make_decision(self, metrics: EnvironmentMetrics) -> Tuple[EnvironmentDecision, float, List[str]]:
        """결정 생성"""
        factors = []
        scores = {
            EnvironmentDecision.ADAPT: 0,
            EnvironmentDecision.MIGRATE: 0,
            EnvironmentDecision.HOLD: 0,
            EnvironmentDecision.OPTIMIZE: 0,
        }
        
        # 엔트로피 분석
        if metrics.entropy_level >= self.THRESHOLDS["entropy_critical"]:
            scores[EnvironmentDecision.MIGRATE] += 30
            factors.append(f"엔트로피 임계 초과 ({metrics.entropy_level:.2f})")
        elif metrics.entropy_level >= self.THRESHOLDS["entropy_critical"] * 0.7:
            scores[EnvironmentDecision.OPTIMIZE] += 20
            factors.append(f"엔트로피 경고 수준 ({metrics.entropy_level:.2f})")
        else:
            scores[EnvironmentDecision.ADAPT] += 15
            factors.append(f"엔트로피 안정 ({metrics.entropy_level:.2f})")
        
        # 시장 포화도 분석
        if metrics.market_saturation >= self.THRESHOLDS["saturation_critical"]:
            scores[EnvironmentDecision.MIGRATE] += 25
            factors.append(f"시장 포화 ({metrics.market_saturation:.0%})")
        elif metrics.market_saturation >= 0.6:
            scores[EnvironmentDecision.OPTIMIZE] += 15
            factors.append(f"시장 성숙 ({metrics.market_saturation:.0%})")
        else:
            scores[EnvironmentDecision.ADAPT] += 20
            factors.append(f"시장 성장 여력 ({1-metrics.market_saturation:.0%})")
        
        # 잠재 질량 분석
        if metrics.potential_mass >= self.THRESHOLDS["potential_mass_min"]:
            scores[EnvironmentDecision.ADAPT] += 25
            factors.append(f"미흡수 고객 충분 ({metrics.potential_mass:.0%})")
        else:
            scores[EnvironmentDecision.MIGRATE] += 15
            factors.append(f"미흡수 고객 부족 ({metrics.potential_mass:.0%})")
        
        # 경쟁 마찰 분석
        total_friction = (
            metrics.competition_friction * 0.5 +
            metrics.regulation_friction * 0.3 +
            metrics.operational_friction * 0.2
        )
        
        if total_friction >= self.THRESHOLDS["friction_critical"]:
            scores[EnvironmentDecision.MIGRATE] += 20
            factors.append(f"마찰력 과다 ({total_friction:.2f})")
        elif total_friction >= 0.4:
            scores[EnvironmentDecision.OPTIMIZE] += 15
            factors.append(f"마찰력 주의 ({total_friction:.2f})")
        else:
            scores[EnvironmentDecision.ADAPT] += 15
            factors.append(f"마찰력 양호 ({total_friction:.2f})")
        
        # 성장 속도 분석
        if metrics.growth_velocity >= self.THRESHOLDS["growth_velocity_min"]:
            scores[EnvironmentDecision.ADAPT] += 20
            factors.append(f"성장 속도 양호 ({metrics.growth_velocity:.1%})")
        else:
            scores[EnvironmentDecision.MIGRATE] += 10
            factors.append(f"성장 정체 ({metrics.growth_velocity:.1%})")
        
        # 엔트로피 추세 분석
        if metrics.entropy_trend > 0.1:
            scores[EnvironmentDecision.MIGRATE] += 15
            factors.append(f"엔트로피 상승 추세 (+{metrics.entropy_trend:.1%})")
        elif metrics.entropy_trend < -0.1:
            scores[EnvironmentDecision.ADAPT] += 15
            factors.append(f"엔트로피 하락 추세 ({metrics.entropy_trend:.1%})")
        
        # 최종 결정
        best_decision = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_decision] / total_score if total_score > 0 else 0
        
        return best_decision, confidence, factors
    
    def _generate_adaptation_actions(self, metrics: EnvironmentMetrics) -> List[str]:
        """적응 액션 생성"""
        actions = []
        
        # 에너지 밀도 낮으면
        if metrics.energy_density < 0.5:
            actions.append("슬롯 세분화 (30분 → 15분)로 에너지 밀도 증가")
            actions.append("다이내믹 프라이싱 공격적 적용")
        
        # 잠재 질량 높으면
        if metrics.potential_mass > 0.3:
            actions.append("미흡수 고객층 타겟 마케팅 강화")
            actions.append("신규 고객 전용 프로모션 설계")
        
        # 운영 마찰 높으면
        if metrics.operational_friction > 0.3:
            actions.append("운영 프로세스 추가 자동화")
            actions.append("예외 상황 매뉴얼 고도화")
        
        # 기본 액션
        actions.extend([
            "키맨 솔루션 품질 업그레이드",
            "고객 피드백 기반 서비스 개선",
            "가동률 최적화 알고리즘 튜닝",
        ])
        
        return actions[:5]
    
    def _select_migration_target(self, metrics: EnvironmentMetrics,
                                  current_industry: str) -> Tuple[Optional[MigrationTarget], str]:
        """전이 대상 선정"""
        candidates = []
        
        for target, conditions in self.MIGRATION_CONDITIONS.items():
            # 현재 산업에서 전이 가능한지 확인
            if current_industry and current_industry not in conditions["suitable_from"]:
                continue
            
            # 점수 계산
            score = 0
            reasons = []
            
            if "high_physical_independence" in conditions["required_signals"]:
                if metrics.operational_friction < 0.3:
                    score += 30
                    reasons.append("물리적 독립성 확보")
            
            if "high_automation" in conditions["required_signals"]:
                if metrics.operational_friction < 0.2:
                    score += 25
                    reasons.append("자동화 기반 확보")
            
            if "stable_demand" in conditions["required_signals"]:
                if metrics.energy_density > 0.5:
                    score += 25
                    reasons.append("안정적 수요 기반")
            
            if "recurring_demand" in conditions["required_signals"]:
                if metrics.energy_density > 0.4:
                    score += 20
                    reasons.append("반복 수요 확인")
            
            if "outcome_focus" in conditions["required_signals"]:
                if metrics.energy_density > 0.3:
                    score += 20
                    reasons.append("결과 중심 환경")
            
            if score > 0:
                candidates.append((target, score, reasons))
        
        if not candidates:
            return None, "적합한 전이 대상 없음"
        
        # 최고 점수 대상 선택
        best = max(candidates, key=lambda x: x[1])
        reasoning = f"전이 추천: {best[0].value} - {', '.join(best[2])}"
        
        return best[0], reasoning
    
    def _project_improvement(self, decision: EnvironmentDecision,
                              metrics: EnvironmentMetrics) -> float:
        """예상 개선율"""
        base_improvements = {
            EnvironmentDecision.ADAPT: 0.15,      # 15% 개선
            EnvironmentDecision.MIGRATE: 0.30,    # 30% 개선 (새 환경)
            EnvironmentDecision.OPTIMIZE: 0.08,   # 8% 개선
            EnvironmentDecision.HOLD: 0.0,        # 현상 유지
        }
        
        base = base_improvements.get(decision, 0)
        
        # 현재 상태에 따른 조정
        if metrics.entropy_level < 0.3:
            base *= 1.2  # 상태 양호 시 더 큰 개선
        elif metrics.entropy_level > 0.6:
            base *= 0.8  # 상태 불량 시 개선 제한
        
        return round(base, 3)
    
    def scan_dead_nodes(self) -> List[EnvironmentAnalysis]:
        """데드 노드 스캔"""
        dead_nodes = []
        
        for entity_id, analysis in self.analyses.items():
            if analysis.decision == EnvironmentDecision.MIGRATE:
                dead_nodes.append(analysis)
        
        # 엔트로피 높은 순 정렬
        dead_nodes.sort(
            key=lambda a: a.current_metrics.entropy_level,
            reverse=True
        )
        
        return dead_nodes
    
    def get_summary(self) -> Dict:
        """분석 요약"""
        summary = {decision: [] for decision in EnvironmentDecision}
        
        for entity_id, analysis in self.analyses.items():
            summary[analysis.decision].append({
                "id": entity_id,
                "name": analysis.entity_name,
                "confidence": analysis.confidence,
                "projected_improvement": analysis.projected_improvement,
            })
        
        return {
            decision.value: {
                "count": len(entities),
                "entities": entities,
            }
            for decision, entities in summary.items()
        }
    
    def get_analysis(self, entity_id: str) -> Optional[EnvironmentAnalysis]:
        """특정 개체 분석 결과 조회"""
        return self.analyses.get(entity_id)
    
    def clear_analyses(self):
        """분석 결과 초기화"""
        self.analyses.clear()


# 전역 인스턴스
_analyzer: Optional[EnvironmentAnalyzer] = None


def get_analyzer() -> EnvironmentAnalyzer:
    """분석기 인스턴스 반환"""
    global _analyzer
    if _analyzer is None:
        _analyzer = EnvironmentAnalyzer()
    return _analyzer
