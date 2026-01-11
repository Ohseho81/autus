"""
═══════════════════════════════════════════════════════════════════════════════
⚡ AUTUS v2.5+ - Work Processing Engine
═══════════════════════════════════════════════════════════════════════════════

사용자 노드 상태 기반 업무 처리 전략 결정 및 실행
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .taxonomy import (
    WorkCategory, WorkStrategy, WorkDomain, ALL_WORK_CATEGORIES
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 인스턴스 타입
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WorkInstance:
    """업무 인스턴스"""
    id: str
    category_id: str
    category: WorkCategory
    
    # 업무 내용
    title: str
    description: str
    
    # 시간
    estimated_duration: int = 30  # 분
    deadline: Optional[datetime] = None
    urgency: float = 0.5  # 0-1
    
    # 중요도
    importance: float = 0.5  # 0-1
    related_node_ids: List[str] = field(default_factory=list)
    
    # 처리 상태
    status: str = 'pending'  # pending, processing, delegated, eliminated, completed
    assigned_to: str = 'human'  # human, ai, parallel, eliminated
    
    # 실행 결과
    actual_duration: Optional[int] = None
    saved_time: Optional[int] = None
    saved_energy: Optional[float] = None


@dataclass
class ExecutionStep:
    """실행 단계"""
    order: int
    action: str
    actor: str  # ai, human, system, crowd
    duration: int  # 분
    automated: bool


@dataclass
class ExecutionPlan:
    """실행 계획"""
    strategy: WorkStrategy
    steps: List[ExecutionStep]
    estimated_time_saved: int = 0  # 분
    estimated_energy_saved: float = 0.0
    tools: List[str] = field(default_factory=list)
    requirements: List[str] = field(default_factory=list)


@dataclass
class ProcessingDecision:
    """처리 전략 결정 결과"""
    work: WorkInstance
    recommended_strategy: WorkStrategy
    confidence: float
    reasoning: str
    
    # 상세 점수
    elimination_score: float = 0.0
    automation_score: float = 0.0
    parallelization_score: float = 0.0
    humanization_score: float = 0.0
    
    # 실행 계획
    execution_plan: ExecutionPlan = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 사용자 선호도
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UserWorkPreferences:
    """사용자 업무 선호도"""
    automation_tolerance: float = 0.7      # 자동화 수용도 (0-1)
    delegation_comfort: float = 0.6        # 위임 편안함 (0-1)
    quality_priority: float = 0.5          # 품질 우선도 vs 속도 (0-1)
    control_preference: float = 0.5        # 통제 선호도 (0-1)
    risk_tolerance: float = 0.5            # 위험 감수도 (0-1)
    
    # 도메인별 선호
    domain_preferences: Dict[str, Dict[str, bool]] = field(default_factory=dict)


DEFAULT_USER_PREFERENCES = UserWorkPreferences(
    automation_tolerance=0.7,
    delegation_comfort=0.6,
    quality_priority=0.5,
    control_preference=0.5,
    risk_tolerance=0.5,
    domain_preferences={
        'administrative': {'automate': True, 'delegate': True},
        'financial': {'automate': True, 'delegate': False},
        'creative': {'automate': False, 'delegate': False},
        'relational': {'automate': False, 'delegate': False},
    },
)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 처리 전략 결정 엔진
# ═══════════════════════════════════════════════════════════════════════════════

def decide_processing_strategy(
    work: WorkInstance,
    nodes: Dict,
    energy_state: Optional[object] = None,
    preferences: UserWorkPreferences = None
) -> ProcessingDecision:
    """업무 처리 전략 결정"""
    preferences = preferences or DEFAULT_USER_PREFERENCES
    category = work.category
    
    # 1. 기본 점수 (카테고리 특성)
    elimination_score = category.elimination_potential
    automation_score = category.automation_potential
    parallelization_score = category.parallelization_potential
    humanization_score = category.human_essential
    
    # 2. 사용자 상태 기반 조정
    state_adj = _calculate_state_adjustment(nodes, energy_state, work)
    elimination_score *= state_adj['elimination']
    automation_score *= state_adj['automation']
    parallelization_score *= state_adj['parallelization']
    humanization_score *= state_adj['humanization']
    
    # 3. 긴급도 기반 조정
    urgency_adj = _calculate_urgency_adjustment(work)
    automation_score *= urgency_adj
    
    # 4. 사용자 선호도 적용
    pref_adj = _apply_preferences(preferences)
    elimination_score *= pref_adj['elimination']
    automation_score *= pref_adj['automation']
    parallelization_score *= pref_adj['parallelization']
    
    # 5. 최종 전략 결정
    scores = {
        'ELIMINATE': elimination_score,
        'AUTOMATE': automation_score,
        'PARALLELIZE': parallelization_score,
        'HUMANIZE': humanization_score,
    }
    
    strategy = max(scores, key=scores.get)
    max_score = scores[strategy]
    
    # 6. 실행 계획 생성
    execution_plan = _generate_execution_plan(work, strategy, category)
    
    # 7. 근거 생성
    reasoning = _generate_reasoning(work, strategy, scores, nodes, energy_state)
    
    return ProcessingDecision(
        work=work,
        recommended_strategy=strategy,
        confidence=max_score,
        reasoning=reasoning,
        elimination_score=elimination_score,
        automation_score=automation_score,
        parallelization_score=parallelization_score,
        humanization_score=humanization_score,
        execution_plan=execution_plan,
    )


def _calculate_state_adjustment(
    nodes: Dict,
    energy_state: Optional[object],
    work: WorkInstance
) -> Dict[str, float]:
    """상태 기반 조정"""
    adjustment = {
        'elimination': 1.0,
        'automation': 1.0,
        'parallelization': 1.0,
        'humanization': 1.0,
    }
    
    # 에너지 기반 조정
    if energy_state:
        net_energy = getattr(energy_state, 'net_available_energy', 0.7)
        if net_energy < 0.3:
            adjustment['elimination'] *= 1.5
            adjustment['automation'] *= 1.4
            adjustment['humanization'] *= 0.6
        elif net_energy > 0.7:
            adjustment['humanization'] *= 1.2
            adjustment['elimination'] *= 0.8
    
    # 관련 노드 압력 기반 조정
    for node_id in work.related_node_ids:
        node = nodes.get(node_id)
        if not node:
            continue
        
        pressure = getattr(node, 'pressure', 0)
        state = getattr(node, 'state', None)
        
        if pressure > 0.7:
            adjustment['automation'] *= 1.3
            adjustment['elimination'] *= 1.2
            adjustment['humanization'] *= 0.7
        
        if state == 'IRREVERSIBLE':
            adjustment['parallelization'] *= 1.5
    
    # 마감 압박 (n15)
    deadline_node = nodes.get('n15')
    if deadline_node and getattr(deadline_node, 'pressure', 0) > 0.6:
        adjustment['automation'] *= 1.3
        adjustment['parallelization'] *= 1.4
        adjustment['humanization'] *= 0.7
    
    # 번아웃 위험 (n09, n12)
    sleep_pressure = getattr(nodes.get('n09'), 'pressure', 0) if nodes.get('n09') else 0
    work_pressure = getattr(nodes.get('n12'), 'pressure', 0) if nodes.get('n12') else 0
    
    if sleep_pressure > 0.5 or work_pressure > 0.6:
        adjustment['elimination'] *= 1.4
        adjustment['automation'] *= 1.3
        adjustment['humanization'] *= 0.5
    
    return adjustment


def _calculate_urgency_adjustment(work: WorkInstance) -> float:
    """긴급도 기반 조정"""
    if work.urgency > 0.8:
        return 1.4
    if work.urgency > 0.5:
        return 1.2
    return 1.0


def _apply_preferences(prefs: UserWorkPreferences) -> Dict[str, float]:
    """선호도 적용"""
    return {
        'elimination': 1.0,
        'automation': 0.5 + prefs.automation_tolerance * 0.8,
        'parallelization': 0.5 + prefs.delegation_comfort * 0.7,
        'humanization': 0.5 + prefs.control_preference * 0.5,
    }


def _generate_execution_plan(
    work: WorkInstance,
    strategy: WorkStrategy,
    category: WorkCategory
) -> ExecutionPlan:
    """실행 계획 생성"""
    steps: List[ExecutionStep] = []
    estimated_time_saved = 0
    estimated_energy_saved = 0.0
    
    if strategy == 'ELIMINATE':
        steps = [
            ExecutionStep(1, '업무 필요성 재평가', 'ai', 1, True),
            ExecutionStep(2, '이해관계자 통보 (필요시)', 'ai', 2, True),
            ExecutionStep(3, '업무 목록에서 제거', 'system', 0, True),
        ]
        estimated_time_saved = work.estimated_duration
        estimated_energy_saved = 0.05
    
    elif strategy == 'AUTOMATE':
        steps = [
            ExecutionStep(1, '자동화 도구 선택', 'ai', 1, True),
            ExecutionStep(2, '파라미터 설정', 'ai', 2, True),
            ExecutionStep(3, '자동 실행', 'system', int(work.estimated_duration * 0.1), True),
            ExecutionStep(4, '결과 검증 (필요시)', 'human', 5, False),
        ]
        estimated_time_saved = int(work.estimated_duration * 0.85)
        estimated_energy_saved = 0.03
    
    elif strategy == 'PARALLELIZE':
        steps = [
            ExecutionStep(1, '업무 분할', 'ai', 2, True),
            ExecutionStep(2, '적합한 실행자 매칭', 'ai', 3, True),
            ExecutionStep(3, '분산 실행', 'crowd', int(work.estimated_duration * 0.3), False),
            ExecutionStep(4, '결과 통합', 'ai', 5, True),
        ]
        estimated_time_saved = int(work.estimated_duration * 0.6)
        estimated_energy_saved = 0.02
    
    elif strategy == 'HUMANIZE':
        steps = [
            ExecutionStep(1, 'AI 지원 도구 준비', 'ai', 2, True),
            ExecutionStep(2, '컨텍스트 및 자료 정리', 'ai', 5, True),
            ExecutionStep(3, '인간 창의적 작업', 'human', work.estimated_duration, False),
            ExecutionStep(4, '품질 검토 지원', 'ai', 3, True),
        ]
        estimated_time_saved = int(work.estimated_duration * 0.2)
        estimated_energy_saved = 0.01
    
    return ExecutionPlan(
        strategy=strategy,
        steps=steps,
        estimated_time_saved=estimated_time_saved,
        estimated_energy_saved=estimated_energy_saved,
        tools=category.current_tools[:3],
        requirements=[],
    )


def _generate_reasoning(
    work: WorkInstance,
    strategy: WorkStrategy,
    scores: Dict[str, float],
    nodes: Dict,
    energy_state: Optional[object]
) -> str:
    """근거 생성"""
    reasons = []
    
    if strategy == 'ELIMINATE':
        reasons.append(f'"{work.title}"은(는) 현재 생존 목표에 직접 기여하지 않습니다.')
        if scores['ELIMINATE'] > 0.8:
            reasons.append('이 업무의 가치 대비 비용이 매우 낮습니다.')
    
    elif strategy == 'AUTOMATE':
        reasons.append(f'"{work.title}"은(는) {scores["AUTOMATE"] * 100:.0f}% 자동화 가능합니다.')
        if energy_state and getattr(energy_state, 'net_available_energy', 1) < 0.5:
            reasons.append('현재 에너지 수준이 낮아 자동화가 권장됩니다.')
    
    elif strategy == 'PARALLELIZE':
        reasons.append(f'"{work.title}"은(는) 분할 실행으로 시간을 {scores["PARALLELIZE"] * 60:.0f}% 단축할 수 있습니다.')
        deadline_node = nodes.get('n15')
        if deadline_node and getattr(deadline_node, 'pressure', 0) > 0.6:
            reasons.append('마감 압박이 높아 병렬 처리가 권장됩니다.')
    
    elif strategy == 'HUMANIZE':
        reasons.append(f'"{work.title}"은(는) 인간의 창의성/판단이 필수입니다.')
        reasons.append('AI는 보조 역할로 효율을 높입니다.')
    
    # 에너지 상태 언급
    if energy_state and getattr(energy_state, 'net_available_energy', 1) < 0.3:
        net = getattr(energy_state, 'net_available_energy', 0) * 100
        reasons.append(f'⚠️ 에너지 {net:.0f}% - 인지 부하 최소화 필요')
    
    return ' '.join(reasons)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 배치 처리
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WorkBatchSummary:
    """배치 처리 요약"""
    total: int = 0
    by_strategy: Dict[str, int] = field(default_factory=dict)
    total_time_saveable: int = 0
    total_energy_saveable: float = 0.0
    priority_order: List[str] = field(default_factory=list)
    elimination_candidates: List[str] = field(default_factory=list)
    automation_candidates: List[str] = field(default_factory=list)
    requires_human: List[str] = field(default_factory=list)


def analyze_work_batch(
    works: List[WorkInstance],
    nodes: Dict,
    energy_state: Optional[object] = None,
    preferences: UserWorkPreferences = None
) -> Tuple[List[ProcessingDecision], WorkBatchSummary]:
    """다수의 업무 일괄 분석"""
    preferences = preferences or DEFAULT_USER_PREFERENCES
    
    decisions = [
        decide_processing_strategy(work, nodes, energy_state, preferences)
        for work in works
    ]
    
    # 요약 생성
    by_strategy = {'ELIMINATE': 0, 'AUTOMATE': 0, 'PARALLELIZE': 0, 'HUMANIZE': 0}
    total_time = 0
    total_energy = 0.0
    elimination_candidates = []
    automation_candidates = []
    requires_human = []
    
    for d in decisions:
        by_strategy[d.recommended_strategy] += 1
        total_time += d.execution_plan.estimated_time_saved if d.execution_plan else 0
        total_energy += d.execution_plan.estimated_energy_saved if d.execution_plan else 0
        
        if d.recommended_strategy == 'ELIMINATE':
            elimination_candidates.append(d.work.id)
        elif d.recommended_strategy == 'AUTOMATE':
            automation_candidates.append(d.work.id)
        elif d.recommended_strategy == 'HUMANIZE':
            requires_human.append(d.work.id)
    
    # 우선순위 정렬
    priority_order = [
        d.work.id for d in sorted(
            decisions,
            key=lambda x: x.work.urgency * x.work.importance * (1 - x.automation_score),
            reverse=True
        )
    ]
    
    summary = WorkBatchSummary(
        total=len(decisions),
        by_strategy=by_strategy,
        total_time_saveable=total_time,
        total_energy_saveable=total_energy,
        priority_order=priority_order,
        elimination_candidates=elimination_candidates,
        automation_candidates=automation_candidates,
        requires_human=requires_human,
    )
    
    return decisions, summary


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 생성 헬퍼
# ═══════════════════════════════════════════════════════════════════════════════

def create_work_instance(
    category_id: str,
    title: str,
    description: str,
    estimated_duration: int = 30,
    deadline: Optional[datetime] = None,
    urgency: float = 0.5,
    importance: float = 0.5,
) -> Optional[WorkInstance]:
    """카테고리에서 업무 인스턴스 생성"""
    category = next((c for c in ALL_WORK_CATEGORIES if c.id == category_id), None)
    if not category:
        return None
    
    import random
    
    return WorkInstance(
        id=f'work_{datetime.now().timestamp()}_{random.randint(1000, 9999)}',
        category_id=category_id,
        category=category,
        title=title,
        description=description,
        estimated_duration=estimated_duration,
        deadline=deadline,
        urgency=urgency,
        importance=importance,
        related_node_ids=category.related_nodes,
        status='pending',
        assigned_to='human',
    )
