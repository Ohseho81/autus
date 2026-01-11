"""
═══════════════════════════════════════════════════════════════════════════════
⚡ AUTUS v2.5+ - ERT Auto-Decision Engine
═══════════════════════════════════════════════════════════════════════════════

사용자 변수(P, M, ε)와 상호작용(Edge)을 활용한 자동 판단 시스템

핵심 원칙:
- AUTUS는 "대신 결정하지 않는다"
- 오직 "제안"만 하고 최종 결정은 인간
- 사용자 변수가 임계값 도달 시 자동 제안
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional

from .ert_classification import (
    Entity, Relation, TimeType, ERTStrategy,
    ENTITIES, RELATIONS, TIME_TYPES,
    calculate_ert_strategy,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 사용자 변수 (User Variables)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UserVariables:
    """사용자 변수"""
    # P: 압력 (Pressure) - 0~1, 높을수록 긴급
    pressure: float = 0.5
    
    # M: 질량 (Mass) - 관성, 높을수록 변화 어려움
    mass: float = 1.0
    
    # ε: 엔트로피 (Entropy) - 0~1, 높을수록 혼란/방치 시 악화
    entropy: float = 0.3
    
    # W: 가중치 (Weight) - 노드 간 연결 강도
    weight: float = 0.5
    
    # V: 속도 (Velocity) - 변화 속도
    velocity: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상호작용 (Edge Types)
# ═══════════════════════════════════════════════════════════════════════════════

EdgeType = Literal['DEPENDENCY', 'AMPLIFY', 'SUPPRESS', 'FEEDBACK', 'TRIGGER']


@dataclass
class Edge:
    """상호작용 엣지"""
    from_node: str
    to_node: str
    edge_type: EdgeType
    weight: float = 0.5
    active: bool = True


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ERTWorkInstance:
    """ERT 업무 인스턴스"""
    id: str
    
    # ERT 분류
    entity: Entity
    relation: Relation
    time: TimeType
    
    # 업무 내용
    title: str
    description: str = ''
    
    # 사용자 변수
    variables: UserVariables = field(default_factory=UserVariables)
    
    # 연결 노드
    linked_node_ids: List[str] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    
    # 상태
    status: str = 'pending'  # pending, proposed, accepted, rejected, executed
    proposed_strategy: Optional[ERTStrategy] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 판단 임계값
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Thresholds:
    """임계값 설정"""
    # 삭제 제안 임계값
    delete_max_weight: float = 0.2     # W ≤ 0.2 → 연결 약함 → 삭제 제안
    delete_max_pressure: float = 0.1   # P ≤ 0.1 → 긴급도 없음 → 삭제 제안
    delete_min_entropy: float = 0.0    # ε = 0 → 혼란 없음 → 삭제해도 무방
    
    # 자동화 제안 임계값
    automate_min_entropy: float = 0.02 # ε ≥ 0.02 → 방치 시 악화 → 자동화 제안
    automate_min_frequency: float = 0.7
    automate_max_mass: float = 0.3     # M ≤ 0.3 → 관성 낮음 → 자동화 쉬움
    
    # 병렬화 제안 임계값
    parallel_min_mass: float = 2.0     # M ≥ 2.0 → 관성 강함 → 분산 필요
    parallel_min_duration: float = 0.8
    parallel_min_cooperation: float = 0.6
    
    # 인간 필수 임계값
    humanize_min_score: float = 0.7
    humanize_min_influence: float = 0.8
    
    # 긴급 대응 임계값
    critical_pressure: float = 0.78    # P ≥ 0.78 → IRREVERSIBLE 진입
    critical_entropy: float = 0.8      # ε ≥ 0.8 → 혼란 극심


DEFAULT_THRESHOLDS = Thresholds()


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 변수 분석 타입
# ═══════════════════════════════════════════════════════════════════════════════

PressureStatus = Literal['low', 'medium', 'high', 'critical']
EntropyStatus = Literal['stable', 'degrading', 'chaotic']
MassStatus = Literal['agile', 'normal', 'inert']
WeightStatus = Literal['weak', 'moderate', 'strong']


@dataclass
class VariableAnalysis:
    """변수 분석 결과"""
    pressure_status: PressureStatus
    entropy_status: EntropyStatus
    mass_status: MassStatus
    weight_status: WeightStatus


@dataclass
class ExpectedOutcome:
    """예상 결과"""
    time_saved: int = 0      # 분
    energy_saved: float = 0.0  # 0-1
    risk_reduced: float = 0.0  # 0-1


@dataclass
class DecisionActions:
    """추천 액션"""
    immediate: List[str] = field(default_factory=list)
    short_term: List[str] = field(default_factory=list)
    long_term: List[str] = field(default_factory=list)


@dataclass
class DecisionResult:
    """자동 판단 결과"""
    work: ERTWorkInstance
    
    # 제안된 전략
    proposed_strategy: ERTStrategy
    confidence: float
    
    # 근거
    reasons: List[str] = field(default_factory=list)
    
    # 변수 기반 분석
    variable_analysis: VariableAnalysis = None
    
    # 추천 액션
    actions: DecisionActions = None
    
    # 예상 결과
    expected_outcome: ExpectedOutcome = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 판단 엔진
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_variables(v: UserVariables) -> VariableAnalysis:
    """변수 분석"""
    pressure_status: PressureStatus = (
        'critical' if v.pressure >= 0.78 else
        'high' if v.pressure >= 0.5 else
        'medium' if v.pressure >= 0.3 else 'low'
    )
    
    entropy_status: EntropyStatus = (
        'chaotic' if v.entropy >= 0.8 else
        'degrading' if v.entropy >= 0.3 else 'stable'
    )
    
    mass_status: MassStatus = (
        'inert' if v.mass >= 2.0 else
        'normal' if v.mass >= 1.0 else 'agile'
    )
    
    weight_status: WeightStatus = (
        'strong' if v.weight >= 0.7 else
        'moderate' if v.weight >= 0.3 else 'weak'
    )
    
    return VariableAnalysis(
        pressure_status=pressure_status,
        entropy_status=entropy_status,
        mass_status=mass_status,
        weight_status=weight_status,
    )


def analyze_edges(edges: List[Edge]) -> Dict:
    """엣지 분석"""
    result = {
        'dependency_count': 0,
        'amplify_count': 0,
        'suppress_count': 0,
        'trigger_count': 0,
        'avg_weight': 0.0,
    }
    
    total_weight = 0.0
    for e in edges:
        if e.edge_type == 'DEPENDENCY':
            result['dependency_count'] += 1
        elif e.edge_type == 'AMPLIFY':
            result['amplify_count'] += 1
        elif e.edge_type == 'SUPPRESS':
            result['suppress_count'] += 1
        elif e.edge_type == 'TRIGGER':
            result['trigger_count'] += 1
        total_weight += e.weight
    
    if edges:
        result['avg_weight'] = total_weight / len(edges)
    
    return result


def generate_actions(
    strategy: ERTStrategy,
    work: ERTWorkInstance,
    analysis: VariableAnalysis
) -> DecisionActions:
    """액션 생성"""
    actions = DecisionActions()
    
    if strategy == 'DELETE':
        actions.immediate = [f'"{work.title}" 삭제 확인']
        actions.short_term = ['관련 업무 영향 검토']
        actions.long_term = ['유사 업무 패턴 자동 삭제 규칙 설정']
    
    elif strategy == 'AUTOMATE':
        actions.immediate = [f'"{work.title}" 자동화 도구 연결']
        actions.short_term = ['자동화 규칙 테스트 (1주)']
        actions.long_term = ['완전 자동화로 전환']
    
    elif strategy == 'PARALLELIZE':
        actions.immediate = [f'"{work.title}" 분할 계획 수립']
        actions.short_term = ['병렬 실행자 배정']
        actions.long_term = ['결과 통합 및 검증']
    
    elif strategy == 'HUMANIZE':
        actions.immediate = [f'"{work.title}" 집중 시간 블록 설정']
        actions.short_term = ['AI 보조 도구 준비']
        actions.long_term = ['창의적 산출물 검토']
    
    # 압력 높으면 즉시 액션 추가
    if analysis.pressure_status == 'critical':
        actions.immediate.insert(0, '⚠️ 즉시 조치 필요')
    
    return actions


def calculate_expected_outcome(strategy: ERTStrategy) -> ExpectedOutcome:
    """예상 결과 계산"""
    outcomes = {
        'DELETE': ExpectedOutcome(time_saved=60, energy_saved=0.05, risk_reduced=0.02),
        'AUTOMATE': ExpectedOutcome(time_saved=45, energy_saved=0.04, risk_reduced=0.03),
        'PARALLELIZE': ExpectedOutcome(time_saved=30, energy_saved=0.02, risk_reduced=0.01),
        'HUMANIZE': ExpectedOutcome(time_saved=10, energy_saved=0.01, risk_reduced=-0.01),
    }
    return outcomes.get(strategy, ExpectedOutcome())


def auto_decide(
    work: ERTWorkInstance,
    thresholds: Thresholds = None
) -> DecisionResult:
    """업무에 대한 자동 판단"""
    thresholds = thresholds or DEFAULT_THRESHOLDS
    v = work.variables
    
    # 1. ERT 기본 전략
    ert_strategy, auto_score, para_score, del_score, human_score = calculate_ert_strategy(
        work.entity, work.relation, work.time
    )
    
    # 2. 변수 상태 분석
    var_analysis = analyze_variables(v)
    
    # 3. 에지 분석
    edge_analysis = analyze_edges(work.edges)
    
    # 4. 최종 전략 결정
    proposed_strategy: ERTStrategy
    confidence: float
    reasons: List[str] = []
    
    # 삭제 판단
    if v.weight <= thresholds.delete_max_weight:
        proposed_strategy = 'DELETE'
        confidence = 0.9
        reasons.append(f'연결 강도(W={v.weight:.2f})가 약함 → 업무 존재 의미 검토')
    
    elif v.pressure <= thresholds.delete_max_pressure and v.entropy < 0.1:
        proposed_strategy = 'DELETE'
        confidence = 0.8
        reasons.append(f'압력(P={v.pressure:.2f})과 엔트로피(ε={v.entropy:.2f}) 모두 낮음 → 불필요 업무')
    
    # 자동화 판단
    elif v.entropy >= thresholds.automate_min_entropy and v.mass <= thresholds.automate_max_mass:
        proposed_strategy = 'AUTOMATE'
        confidence = 0.85
        reasons.append(f'엔트로피(ε={v.entropy:.2f}) 증가 중 + 관성(M={v.mass:.2f}) 낮음 → 자동화 권장')
    
    elif (RELATIONS[work.relation].automation_affinity > 0.8 and 
          TIME_TYPES[work.time].automation_affinity > 0.8):
        proposed_strategy = 'AUTOMATE'
        confidence = 0.9
        reasons.append(f'{RELATIONS[work.relation].name_ko} × {TIME_TYPES[work.time].name_ko} 조합 = 자동화 최적')
    
    # 병렬화 판단
    elif v.mass >= thresholds.parallel_min_mass:
        proposed_strategy = 'PARALLELIZE'
        confidence = 0.8
        reasons.append(f'질량(M={v.mass:.2f}) 높음 → 분산 처리 필요')
    
    elif edge_analysis['amplify_count'] > 2:
        proposed_strategy = 'PARALLELIZE'
        confidence = 0.75
        reasons.append(f"증폭(AMPLIFY) 에지 {edge_analysis['amplify_count']}개 → 병렬 분산 권장")
    
    # 인간 필수
    elif human_score > thresholds.humanize_min_score:
        proposed_strategy = 'HUMANIZE'
        confidence = 0.9
        reasons.append(f'인간 필수 점수({human_score * 100:.0f}%) 높음 → 창조/판단 필요')
    
    # 기본값
    else:
        proposed_strategy = ert_strategy
        confidence = 0.7
        reasons.append(f'ERT 기본 전략: {proposed_strategy}')
    
    # 긴급 상황 오버라이드
    if v.pressure >= thresholds.critical_pressure:
        reasons.insert(0, f'⚠️ 압력(P={v.pressure:.2f}) CRITICAL → 즉시 조치 필요')
        confidence = min(confidence + 0.1, 1.0)
    
    if v.entropy >= thresholds.critical_entropy:
        reasons.insert(0, f'⚠️ 엔트로피(ε={v.entropy:.2f}) CHAOTIC → 방치 시 악화')
        if proposed_strategy != 'DELETE':
            proposed_strategy = 'AUTOMATE'
    
    # 액션 생성
    actions = generate_actions(proposed_strategy, work, var_analysis)
    
    # 예상 결과
    expected_outcome = calculate_expected_outcome(proposed_strategy)
    
    return DecisionResult(
        work=work,
        proposed_strategy=proposed_strategy,
        confidence=confidence,
        reasons=reasons,
        variable_analysis=var_analysis,
        actions=actions,
        expected_outcome=expected_outcome,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 배치 처리
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BatchDecisionSummary:
    """배치 결과 요약"""
    total: int = 0
    by_strategy: Dict[str, int] = field(default_factory=dict)
    total_time_saved: int = 0
    total_energy_saved: float = 0.0
    critical_count: int = 0
    delete_recommendations: List[str] = field(default_factory=list)
    automate_recommendations: List[str] = field(default_factory=list)


@dataclass
class BatchDecisionResult:
    """배치 처리 결과"""
    decisions: List[DecisionResult]
    summary: BatchDecisionSummary


def batch_decide(
    works: List[ERTWorkInstance],
    thresholds: Thresholds = None
) -> BatchDecisionResult:
    """다수 업무 일괄 판단"""
    decisions = [auto_decide(w, thresholds) for w in works]
    
    by_strategy = {'DELETE': 0, 'AUTOMATE': 0, 'PARALLELIZE': 0, 'HUMANIZE': 0}
    total_time = 0
    total_energy = 0.0
    critical_count = 0
    delete_recs: List[str] = []
    automate_recs: List[str] = []
    
    for d in decisions:
        by_strategy[d.proposed_strategy] += 1
        total_time += d.expected_outcome.time_saved
        total_energy += d.expected_outcome.energy_saved
        
        if d.variable_analysis.pressure_status == 'critical':
            critical_count += 1
        
        if d.proposed_strategy == 'DELETE':
            delete_recs.append(d.work.title)
        elif d.proposed_strategy == 'AUTOMATE':
            automate_recs.append(d.work.title)
    
    summary = BatchDecisionSummary(
        total=len(works),
        by_strategy=by_strategy,
        total_time_saved=total_time,
        total_energy_saved=total_energy,
        critical_count=critical_count,
        delete_recommendations=delete_recs,
        automate_recommendations=automate_recs,
    )
    
    return BatchDecisionResult(decisions=decisions, summary=summary)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 제안 메시지 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_proposal_message(decision: DecisionResult) -> str:
    """제안 메시지 생성"""
    work = decision.work
    strategy = decision.proposed_strategy
    confidence = decision.confidence
    analysis = decision.variable_analysis
    reasons = decision.reasons
    outcome = decision.expected_outcome
    
    strategy_ko = {
        'DELETE': '삭제',
        'AUTOMATE': '자동화',
        'PARALLELIZE': '병렬화',
        'HUMANIZE': '직접 수행',
    }
    
    emoji = {
        'DELETE': '🗑️',
        'AUTOMATE': '🤖',
        'PARALLELIZE': '🔀',
        'HUMANIZE': '👤',
    }
    
    reasons_str = '\n'.join([f'║   • {r}' for r in reasons])
    
    return f"""
╔═══════════════════════════════════════════════════════════════════╗
║ {emoji[strategy]} 업무 처리 제안                                              
╠═══════════════════════════════════════════════════════════════════╣
║ 업무: "{work.title}"
║ 제안: {strategy_ko[strategy]} (확신도: {confidence * 100:.0f}%)
╠───────────────────────────────────────────────────────────────────╣
║ 📊 변수 상태
║   • 압력(P): {analysis.pressure_status.upper()}
║   • 엔트로피(ε): {analysis.entropy_status.upper()}
║   • 질량(M): {analysis.mass_status.upper()}
║   • 연결(W): {analysis.weight_status.upper()}
╠───────────────────────────────────────────────────────────────────╣
║ 💡 근거
{reasons_str}
╠───────────────────────────────────────────────────────────────────╣
║ 📈 예상 결과
║   • 시간 절약: {outcome.time_saved}분
║   • 에너지 보존: {outcome.energy_saved * 100:.1f}%
╠───────────────────────────────────────────────────────────────────╣
║ 이 제안을 수락하시겠습니까? [Y/N]
╚═══════════════════════════════════════════════════════════════════╝
""".strip()
