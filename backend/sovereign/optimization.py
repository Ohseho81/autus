"""
AUTUS Sovereign - Optimization Engine
=======================================

삭제 기반 최적화 엔진: 삭제를 통한 비즈니스 최적화

핵심 원리:
- "추가보다 삭제가 더 큰 가치를 창출한다"
- "복잡성 제거가 효율의 핵심이다"
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum

from .inertia_calc import InertiaCalculator, InertiaType, InertiaSource
from .delete_scanner import DeleteScanner, DeleteCategory, get_scanner


class OptimizationStrategy(Enum):
    """최적화 전략"""
    AGGRESSIVE = "aggressive"       # 공격적: 최대 삭제
    BALANCED = "balanced"           # 균형: ROI 기반
    CONSERVATIVE = "conservative"   # 보수적: 저위험만
    QUICK_WIN = "quick_win"         # 빠른 성과: 낮은 관성
    COST_FOCUS = "cost_focus"       # 비용 중심: 비용 절감
    TIME_FOCUS = "time_focus"       # 시간 중심: 시간 절감


@dataclass
class OptimizationAction:
    """최적화 액션"""
    id: str
    target_id: str
    target_name: str
    action_type: str                # delete, automate, consolidate, outsource
    
    # 효과
    cost_impact: float = 0.0        # 비용 영향 (음수=절감)
    time_impact: float = 0.0        # 시간 영향 (음수=절감)
    efficiency_impact: float = 0.0  # 효율 영향 (양수=향상)
    
    # 실행
    priority: int = 3               # 1-5
    difficulty: float = 0.5         # 0-1
    duration_days: int = 30
    
    # 상태
    status: str = "pending"         # pending, in_progress, completed, cancelled
    
    description: str = ""
    dependencies: List[str] = field(default_factory=list)


@dataclass
class OptimizationPlan:
    """최적화 계획"""
    entity_id: str
    strategy: OptimizationStrategy
    created_at: str
    
    # 액션
    actions: List[OptimizationAction] = field(default_factory=list)
    
    # 단계
    phases: List[Dict] = field(default_factory=list)
    
    # 예상 효과
    total_cost_impact: float = 0.0
    total_time_impact: float = 0.0
    total_efficiency_gain: float = 0.0
    
    # 타임라인
    estimated_duration: int = 90    # 일
    
    # 요약
    summary: str = ""
    risks: List[str] = field(default_factory=list)


@dataclass
class OptimizationResult:
    """최적화 분석 결과"""
    entity_id: str
    industry: str
    analyzed_at: str
    
    # 현재 상태
    current_state: Dict = field(default_factory=dict)
    
    # 삭제 분석
    delete_targets: List[Dict] = field(default_factory=list)
    total_deletable: int = 0
    
    # 관성 분석
    total_inertia: float = 0.0
    inertia_score: float = 0.0
    
    # 최적화 계획
    plan: Optional[OptimizationPlan] = None
    
    # 예상 효과 (월간)
    monthly_cost_savings: float = 0.0
    monthly_time_savings: float = 0.0
    efficiency_improvement: float = 0.0
    
    # 추천
    recommendations: List[str] = field(default_factory=list)
    quick_wins: List[Dict] = field(default_factory=list)


class OptimizationEngine:
    """
    삭제 기반 최적화 엔진
    
    프로세스:
    1. 삭제 대상 스캔 (DeleteScanner)
    2. 관성 분석 (InertiaCalculator)
    3. 최적화 전략 선택
    4. 실행 계획 생성
    """
    
    def __init__(self):
        self.scanner = get_scanner()
        self.inertia_calc = InertiaCalculator()
        self.results: Dict[str, OptimizationResult] = {}
        self.plans: Dict[str, OptimizationPlan] = {}
    
    def analyze(
        self,
        entity_id: str,
        industry: str,
        current_data: Optional[Dict] = None,
        strategy: OptimizationStrategy = OptimizationStrategy.BALANCED
    ) -> OptimizationResult:
        """최적화 분석 실행"""
        
        # 1. 삭제 대상 스캔
        scan_result = self.scanner.scan_by_industry(entity_id, industry)
        
        # 2. 관성 원천 등록
        for target in scan_result.targets:
            source = InertiaSource(
                id=target.id,
                name=target.name,
                inertia_type=self._category_to_inertia_type(target.category),
                mass=target.current_cost * 12,  # 연간 비용
                friction=target.inertia,
                dependency=0.5,
                removal_cost=target.current_cost * 2,  # 2개월치 비용
                removal_time=30,
                freed_capital=target.current_cost * 12 * 0.7,
                freed_time=target.current_time * 12,
                alternative=target.replacement,
            )
            self.inertia_calc.add_source(entity_id, source)
        
        # 3. 관성 분석
        inertia_report = self.inertia_calc.analyze_entity(entity_id, entity_id)
        
        # 4. 최적화 계획 생성
        plan = self._generate_plan(entity_id, scan_result, inertia_report, strategy)
        
        # 5. 빠른 성과 식별
        quick_wins = self.scanner.get_quick_wins(entity_id, 5)
        
        result = OptimizationResult(
            entity_id=entity_id,
            industry=industry,
            analyzed_at=datetime.now().isoformat(),
            current_state=current_data or {},
            delete_targets=[
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category.value,
                    "cost": t.current_cost,
                    "time": t.current_time,
                    "roi": t.delete_roi,
                }
                for t in scan_result.targets[:10]
            ],
            total_deletable=scan_result.total_count,
            total_inertia=inertia_report.total_inertia if inertia_report else 0,
            inertia_score=inertia_report.inertia_score if inertia_report else 0,
            plan=plan,
            monthly_cost_savings=scan_result.total_cost_saved,
            monthly_time_savings=scan_result.total_time_saved,
            efficiency_improvement=scan_result.total_efficiency_gain,
            recommendations=scan_result.recommendations + self._generate_recommendations(scan_result),
            quick_wins=[
                {"id": w.id, "name": w.name, "roi": w.delete_roi}
                for w in quick_wins
            ],
        )
        
        self.results[entity_id] = result
        return result
    
    def _category_to_inertia_type(self, category: DeleteCategory) -> InertiaType:
        """카테고리 → 관성 유형 변환"""
        mapping = {
            DeleteCategory.SUBSCRIPTION: InertiaType.SUBSCRIPTION,
            DeleteCategory.SOFTWARE: InertiaType.LEGACY_SYSTEM,
            DeleteCategory.MEETING: InertiaType.HABIT,
            DeleteCategory.REPORT: InertiaType.PROCESS,
            DeleteCategory.PROCESS: InertiaType.PROCESS,
            DeleteCategory.APPROVAL: InertiaType.PROCESS,
            DeleteCategory.POSITION: InertiaType.HUMAN,
            DeleteCategory.ASSET: InertiaType.ASSET,
            DeleteCategory.VENDOR: InertiaType.CONTRACT,
            DeleteCategory.PROJECT: InertiaType.PROCESS,
        }
        return mapping.get(category, InertiaType.PROCESS)
    
    def _generate_plan(
        self,
        entity_id: str,
        scan_result,
        inertia_report,
        strategy: OptimizationStrategy
    ) -> OptimizationPlan:
        """최적화 계획 생성"""
        actions: List[OptimizationAction] = []
        
        # 전략별 타겟 필터링
        targets = scan_result.targets
        
        if strategy == OptimizationStrategy.AGGRESSIVE:
            selected = targets[:15]
        elif strategy == OptimizationStrategy.CONSERVATIVE:
            selected = [t for t in targets if t.inertia < 0.4][:10]
        elif strategy == OptimizationStrategy.QUICK_WIN:
            selected = [t for t in targets if t.inertia < 0.5 and t.delete_roi > 5][:10]
        elif strategy == OptimizationStrategy.COST_FOCUS:
            selected = sorted(targets, key=lambda t: t.current_cost, reverse=True)[:10]
        elif strategy == OptimizationStrategy.TIME_FOCUS:
            selected = sorted(targets, key=lambda t: t.current_time, reverse=True)[:10]
        else:  # BALANCED
            selected = [t for t in targets if t.delete_roi > 3][:10]
        
        # 액션 생성
        for i, target in enumerate(selected):
            action = OptimizationAction(
                id=f"opt_{entity_id}_{i}",
                target_id=target.id,
                target_name=target.name,
                action_type="delete" if target.automation_level < 0.5 else "automate",
                cost_impact=-target.current_cost * 0.7,
                time_impact=-target.current_time * 0.8,
                efficiency_impact=5.0,
                priority=target.priority,
                difficulty=target.inertia,
                duration_days=int(target.inertia * 60) + 7,
                description=target.action_plan,
            )
            actions.append(action)
        
        # 단계 구성
        phases = self._organize_phases(actions)
        
        plan = OptimizationPlan(
            entity_id=entity_id,
            strategy=strategy,
            created_at=datetime.now().isoformat(),
            actions=actions,
            phases=phases,
            total_cost_impact=sum(a.cost_impact for a in actions),
            total_time_impact=sum(a.time_impact for a in actions),
            total_efficiency_gain=sum(a.efficiency_impact for a in actions),
            estimated_duration=max([a.duration_days for a in actions], default=30),
            summary=f"{len(actions)}개 최적화 액션, 예상 절감 {abs(sum(a.cost_impact for a in actions)):,.0f}원/월",
            risks=self._identify_risks(actions),
        )
        
        self.plans[entity_id] = plan
        return plan
    
    def _organize_phases(self, actions: List[OptimizationAction]) -> List[Dict]:
        """액션을 단계로 구성"""
        if not actions:
            return []
        
        # 우선순위 + 난이도 기준 정렬
        sorted_actions = sorted(actions, key=lambda a: (a.priority, a.difficulty))
        
        phases = [
            {
                "phase": 1,
                "name": "즉시 실행 (Quick Wins)",
                "duration": "1-2주",
                "actions": [
                    {"id": a.id, "name": a.target_name, "type": a.action_type}
                    for a in sorted_actions if a.difficulty < 0.3
                ][:5],
            },
            {
                "phase": 2,
                "name": "단기 최적화",
                "duration": "1개월",
                "actions": [
                    {"id": a.id, "name": a.target_name, "type": a.action_type}
                    for a in sorted_actions if 0.3 <= a.difficulty < 0.6
                ][:5],
            },
            {
                "phase": 3,
                "name": "중기 전환",
                "duration": "2-3개월",
                "actions": [
                    {"id": a.id, "name": a.target_name, "type": a.action_type}
                    for a in sorted_actions if a.difficulty >= 0.6
                ][:5],
            },
        ]
        
        # 빈 단계 제거
        return [p for p in phases if p["actions"]]
    
    def _generate_recommendations(self, scan_result) -> List[str]:
        """추천 생성"""
        recs = []
        
        if scan_result.total_cost_saved > 500000:
            recs.append(f"월 {scan_result.total_cost_saved:,.0f}원 절감 가능")
        
        if scan_result.total_time_saved > 10:
            recs.append(f"월 {scan_result.total_time_saved:.1f}시간 절약 가능")
        
        by_cat = scan_result.by_category
        if by_cat:
            top_cat = max(by_cat.items(), key=lambda x: x[1])
            recs.append(f"'{top_cat[0]}' 카테고리 집중 정리 권장")
        
        return recs
    
    def _identify_risks(self, actions: List[OptimizationAction]) -> List[str]:
        """위험 식별"""
        risks = []
        
        high_diff = [a for a in actions if a.difficulty > 0.7]
        if high_diff:
            risks.append(f"고난이도 항목 {len(high_diff)}개: 신중한 접근 필요")
        
        total_actions = len(actions)
        if total_actions > 10:
            risks.append("동시 실행 항목 과다: 단계적 접근 권장")
        
        return risks
    
    def get_result(self, entity_id: str) -> Optional[OptimizationResult]:
        """결과 조회"""
        return self.results.get(entity_id)
    
    def get_plan(self, entity_id: str) -> Optional[OptimizationPlan]:
        """계획 조회"""
        return self.plans.get(entity_id)
    
    def update_action_status(
        self,
        entity_id: str,
        action_id: str,
        status: str
    ) -> bool:
        """액션 상태 업데이트"""
        plan = self.plans.get(entity_id)
        if not plan:
            return False
        
        for action in plan.actions:
            if action.id == action_id:
                action.status = status
                return True
        
        return False
    
    def calculate_progress(self, entity_id: str) -> Dict:
        """진행률 계산"""
        plan = self.plans.get(entity_id)
        if not plan:
            return {"entity_id": entity_id, "progress": 0, "completed": 0, "total": 0}
        
        total = len(plan.actions)
        completed = sum(1 for a in plan.actions if a.status == "completed")
        in_progress = sum(1 for a in plan.actions if a.status == "in_progress")
        
        progress = (completed / total * 100) if total > 0 else 0
        
        return {
            "entity_id": entity_id,
            "progress": round(progress, 1),
            "completed": completed,
            "in_progress": in_progress,
            "pending": total - completed - in_progress,
            "total": total,
            "realized_savings": sum(
                abs(a.cost_impact) for a in plan.actions if a.status == "completed"
            ),
        }
