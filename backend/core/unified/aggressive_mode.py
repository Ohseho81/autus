"""
═══════════════════════════════════════════════════════════════════════════════
⚔️ AUTUS v3.0 - Aggressive Mode Engine (ERT 90% 최적화)
═══════════════════════════════════════════════════════════════════════════════

[Aggressive Mode: 초고속 진화 모드]

시스템이 판단한 90%를 즉시 실행하고 결과만 리포트
당신은 '수행자'가 아니라 '결과값의 수혜자'

ERT 프레임워크:
- E (Eliminate): 30% 즉시 삭제
- R (Replace/Automate): 40% AGI 대리인 실행
- T (Transform/Parallelize): 20% 병렬 고도화
- 남은 10%: 순수 의지(Will)와 전략적 직관
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

AggressiveLevel = Literal['CONSERVATIVE', 'AGGRESSIVE', 'NODE_SPECIFIC']
ERTAction = Literal['ELIMINATE', 'REPLACE', 'TRANSFORM', 'PRESERVE']
ERTStatus = Literal['PENDING', 'EXECUTING', 'COMPLETED', 'REJECTED']


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 설정 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EliminateThresholds:
    """삭제 임계값"""
    max_weight: float = 0.2              # 연결 강도 이하면 삭제
    max_pressure: float = 0.15           # 압력 이하면 불필요
    existence_proof_hours: int = 72      # N시간 내 영향 없으면 삭제


@dataclass
class ReplaceThresholds:
    """자동화 임계값"""
    min_repetition: int = 3              # 반복 횟수 이상이면 자동화
    max_complexity: float = 0.5          # 복잡도 이하면 자동화
    min_automation_score: float = 0.6    # 자동화 점수 이상이면 자동화


@dataclass
class TransformThresholds:
    """병렬화 임계값"""
    min_duration: int = 7                # 기간 이상이면 병렬화
    min_mass: float = 2.0                # 질량 이상이면 분산


@dataclass
class AggressiveConfig:
    """Aggressive Mode 설정"""
    level: AggressiveLevel = 'AGGRESSIVE'
    
    eliminate_thresholds: EliminateThresholds = field(default_factory=EliminateThresholds)
    replace_thresholds: ReplaceThresholds = field(default_factory=ReplaceThresholds)
    transform_thresholds: TransformThresholds = field(default_factory=TransformThresholds)
    
    target_node_layers: Optional[List[str]] = None  # NODE_SPECIFIC 모드용
    require_confirmation: bool = False
    auto_execute: bool = True


# 프리셋 설정
AGGRESSIVE_PRESETS: Dict[AggressiveLevel, AggressiveConfig] = {
    'CONSERVATIVE': AggressiveConfig(
        level='CONSERVATIVE',
        eliminate_thresholds=EliminateThresholds(0.1, 0.05, 168),
        replace_thresholds=ReplaceThresholds(10, 0.2, 0.9),
        transform_thresholds=TransformThresholds(30, 3.0),
        require_confirmation=True,
        auto_execute=False,
    ),
    'AGGRESSIVE': AggressiveConfig(
        level='AGGRESSIVE',
        eliminate_thresholds=EliminateThresholds(0.2, 0.15, 72),
        replace_thresholds=ReplaceThresholds(3, 0.5, 0.6),
        transform_thresholds=TransformThresholds(7, 2.0),
        require_confirmation=False,
        auto_execute=True,
    ),
    'NODE_SPECIFIC': AggressiveConfig(
        level='NODE_SPECIFIC',
        eliminate_thresholds=EliminateThresholds(0.15, 0.1, 96),
        replace_thresholds=ReplaceThresholds(5, 0.4, 0.7),
        transform_thresholds=TransformThresholds(14, 2.5),
        require_confirmation=True,
        auto_execute=True,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 모델
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Work:
    """업무 아이템"""
    id: str
    title: str
    entity: str           # CASH, PEOPLE, DATA, etc.
    relation: str         # OWN, DEPEND, EXCHANGE, etc.
    time_type: str        # POINT, DURATION, FREQUENCY, SEQUENCE
    
    # 사용자 변수
    pressure: float = 0.5
    mass: float = 1.0
    entropy: float = 0.3
    weight: float = 0.5   # 연결 강도
    
    status: str = 'pending'


@dataclass
class ERTResult:
    """ERT 분류 결과"""
    work_id: str
    title: str
    action: ERTAction
    confidence: float
    
    # 판단 근거
    reasons: List[str]
    
    # 영향
    cognitive_energy_saved: float    # 절약된 인지 에너지 (%)
    time_saved: int                  # 절약된 시간 (분)
    
    # 실행 상태
    status: ERTStatus = 'PENDING'
    executed_at: Optional[datetime] = None
    
    # 대리인 (REPLACE인 경우)
    proxy_agent: Optional[str] = None
    
    # 병렬 태스크 (TRANSFORM인 경우)
    shadow_tasks: Optional[List[str]] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Existence-Proof 필터
# ═══════════════════════════════════════════════════════════════════════════════

def existence_proof(
    work: Work,
    node_impact: Dict[str, float],
    critical_nodes: Optional[List[str]] = None,
    hours_to_check: int = 72
) -> tuple[bool, float, str]:
    """
    "이 업무를 하지 않았을 때 N시간 내에 핵심 노드에 압력이 발생하는가?"
    No → 즉시 삭제
    
    Args:
        work: 업무
        node_impact: 노드별 영향도
        critical_nodes: 핵심 노드 ID 목록
        hours_to_check: 확인 기간 (시간)
    
    Returns:
        (통과 여부, 영향 점수, 사유)
    """
    if critical_nodes is None:
        critical_nodes = ['n01', 'n03', 'n26']  # 현금, 런웨이, NPS
    
    total_impact = 0.0
    affected_critical_nodes: List[str] = []
    
    for node_id in critical_nodes:
        impact = node_impact.get(node_id, 0)
        if abs(impact) > 0.01:
            total_impact += abs(impact)
            affected_critical_nodes.append(node_id)
    
    passes = total_impact > 0.05  # 5% 이상 영향이면 통과
    
    if passes:
        reason = f'{hours_to_check}시간 내 {", ".join(affected_critical_nodes)} 노드에 {total_impact*100:.1f}% 영향'
    else:
        reason = f'{hours_to_check}시간 내 핵심 노드 영향 없음 → 삭제 가능'
    
    return passes, total_impact, reason


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ERT 분류 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class ERTClassifier:
    """ERT 업무 분류 엔진"""
    
    def __init__(self, config: Optional[AggressiveConfig] = None):
        self.config = config or AGGRESSIVE_PRESETS['AGGRESSIVE']
    
    def classify(
        self,
        work: Work,
        node_impact: Optional[Dict[str, float]] = None
    ) -> ERTResult:
        """업무 → ERT 분류"""
        reasons: List[str] = []
        action: ERTAction = 'PRESERVE'
        confidence = 0.0
        cognitive_energy_saved = 0.0
        time_saved = 0
        
        if node_impact is None:
            node_impact = {}
        
        config = self.config
        
        # 1. ELIMINATE 체크
        passes, impact_score, existence_reason = existence_proof(
            work, node_impact, 
            hours_to_check=config.eliminate_thresholds.existence_proof_hours
        )
        
        if not passes:
            action = 'ELIMINATE'
            confidence = 0.9
            cognitive_energy_saved = 0.32
            time_saved = 60
            reasons.append(existence_reason)
            reasons.append(f'연결 강도(W={work.weight:.2f}) ≤ {config.eliminate_thresholds.max_weight} → 삭제')
        
        # 연결 강도가 너무 낮음
        elif work.weight <= config.eliminate_thresholds.max_weight:
            action = 'ELIMINATE'
            confidence = 0.85
            cognitive_energy_saved = 0.28
            time_saved = 45
            reasons.append(f'연결 강도(W={work.weight:.2f}) 약함 → 존재 의미 없음')
        
        # 압력이 너무 낮음
        elif work.pressure <= config.eliminate_thresholds.max_pressure:
            action = 'ELIMINATE'
            confidence = 0.8
            cognitive_energy_saved = 0.25
            time_saved = 30
            reasons.append(f'압력(P={work.pressure:.2f}) 낮음 → 불필요')
        
        # 2. REPLACE 체크
        elif (work.entropy >= config.replace_thresholds.min_automation_score - 0.3 and 
              work.mass <= config.replace_thresholds.max_complexity + 0.5):
            action = 'REPLACE'
            confidence = 0.85
            cognitive_energy_saved = 0.45
            time_saved = 90
            reasons.append(f'엔트로피(ε={work.entropy:.2f}) 높음 + 복잡도(M={work.mass:.2f}) 낮음 → AGI 대리인')
        
        # 3. TRANSFORM 체크
        elif work.mass >= config.transform_thresholds.min_mass:
            action = 'TRANSFORM'
            confidence = 0.8
            cognitive_energy_saved = 0.18
            time_saved = 45
            reasons.append(f'질량(M={work.mass:.2f}) 높음 → 병렬 처리')
        
        # 4. PRESERVE (남은 10%)
        else:
            action = 'PRESERVE'
            confidence = 0.9
            cognitive_energy_saved = 0.0
            time_saved = 0
            reasons.append('핵심 업무 → 순수 의지(Will) 영역')
        
        return ERTResult(
            work_id=work.id,
            title=work.title,
            action=action,
            confidence=confidence,
            reasons=reasons,
            cognitive_energy_saved=cognitive_energy_saved,
            time_saved=time_saved,
            status='EXECUTING' if config.auto_execute and action != 'PRESERVE' else 'PENDING',
            proxy_agent='PersonaProxy-AGI' if action == 'REPLACE' else None,
            shadow_tasks=['DataCollection', 'Simulation', 'RiskTest'] if action == 'TRANSFORM' else None,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 배치 ERT 처리
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AggressiveDashboard:
    """Aggressive Mode 대시보드"""
    eliminate: Dict[str, str]
    replace: Dict[str, str]
    transform: Dict[str, str]


@dataclass
class BatchERTSummary:
    """배치 처리 요약"""
    total: int = 0
    eliminated: int = 0
    replaced: int = 0
    transformed: int = 0
    preserved: int = 0
    total_cognitive_energy_saved: float = 0.0
    total_time_saved: int = 0


@dataclass
class BatchERTResult:
    """배치 ERT 결과"""
    results: List[ERTResult]
    summary: BatchERTSummary
    dashboard: AggressiveDashboard


def batch_classify_ert(
    works: List[Work],
    config: Optional[AggressiveConfig] = None,
    node_impacts: Optional[Dict[str, Dict[str, float]]] = None
) -> BatchERTResult:
    """배치 ERT 처리"""
    classifier = ERTClassifier(config)
    
    if node_impacts is None:
        node_impacts = {}
    
    results: List[ERTResult] = []
    for work in works:
        result = classifier.classify(work, node_impacts.get(work.id, {}))
        results.append(result)
    
    # 요약 계산
    summary = BatchERTSummary(total=len(works))
    for r in results:
        if r.action == 'ELIMINATE':
            summary.eliminated += 1
        elif r.action == 'REPLACE':
            summary.replaced += 1
        elif r.action == 'TRANSFORM':
            summary.transformed += 1
        else:
            summary.preserved += 1
        summary.total_cognitive_energy_saved += r.cognitive_energy_saved
        summary.total_time_saved += r.time_saved
    
    # 대시보드
    processed = summary.eliminated + summary.replaced + summary.transformed
    dashboard = AggressiveDashboard(
        eliminate={
            'action': f'불필요한 인지 부하 유발 노드 {summary.eliminated}개 강제 절단',
            'savings': f'{summary.total_cognitive_energy_saved / max(len(works), 1) * 100 * 0.32:.0f}% Saving',
            'status': 'CLEAN' if config and config.auto_execute else 'PENDING',
        },
        replace={
            'action': f'재무/행정/관계 대리인 {summary.replaced}건 자율 의사결정 완료',
            'savings': f'{summary.total_cognitive_energy_saved / max(len(works), 1) * 100 * 0.45:.0f}% Saving',
            'status': 'DONE' if config and config.auto_execute else 'PENDING',
        },
        transform={
            'action': f'메인 프로젝트 수행 중 서브 태스크 {summary.transformed}종 병렬 완수',
            'savings': f'{summary.total_cognitive_energy_saved / max(len(works), 1) * 100 * 0.18:.0f}% Saving',
            'status': 'SYNCED' if config and config.auto_execute else 'PENDING',
        },
    )
    
    return BatchERTResult(
        results=results,
        summary=summary,
        dashboard=dashboard,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Ghost Report 생성
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GhostReport:
    """Ghost Report"""
    date: datetime
    essential_decisions: List[Dict[str, str]]
    completed_by_ghost: int
    saved_hours: float
    message: str


def generate_ghost_report(batch_result: BatchERTResult) -> GhostReport:
    """Ghost Report 생성"""
    preserved_works = [r for r in batch_result.results if r.action == 'PRESERVE']
    completed_count = (batch_result.summary.eliminated + 
                       batch_result.summary.replaced + 
                       batch_result.summary.transformed)
    
    return GhostReport(
        date=datetime.now(),
        essential_decisions=[{
            'title': r.title,
            'description': '순수 의지(Will)와 전략적 직관 필요',
        } for r in preserved_works],
        completed_by_ghost=completed_count,
        saved_hours=batch_result.summary.total_time_saved / 60,
        message=f"오늘 당신의 뇌가 처리해야 할 실제 업무는 '{len(preserved_works)}개'뿐입니다. 나머지 {completed_count}개의 복합 공정은 제가 이미 완료해 두었습니다.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 출력 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_aggressive_output(batch_result: BatchERTResult) -> str:
    """Aggressive Mode 출력 생성"""
    summary = batch_result.summary
    dashboard = batch_result.dashboard
    ghost_report = generate_ghost_report(batch_result)
    
    optimization_rate = ((summary.eliminated + summary.replaced + summary.transformed) 
                         / max(summary.total, 1) * 100)
    
    return f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚔️ AUTUS v3.0 - AGGRESSIVE MODE [The Silent Kill]                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ "시스템이 칼을 뽑았습니다. {optimization_rate:.0f}%를 도려냈습니다."                          ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 처리 유형        조치 내용                                  절약     상태     ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ 🗑️ Eliminate    {dashboard.eliminate['action'][:42]:<42}  {dashboard.eliminate['savings']:<8} {dashboard.eliminate['status']:<7} ║
║ 🤖 Replace      {dashboard.replace['action'][:42]:<42}  {dashboard.replace['savings']:<8} {dashboard.replace['status']:<7} ║
║ 🔀 Transform    {dashboard.transform['action'][:42]:<42}  {dashboard.transform['savings']:<8} {dashboard.transform['status']:<7} ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 📊 요약                                                                       ║
║   전체: {summary.total:>3}개 → 삭제: {summary.eliminated:>3}개 | 자동화: {summary.replaced:>3}개 | 병렬: {summary.transformed:>3}개 | 보존: {summary.preserved:>3}개   ║
║   시간 절약: {summary.total_time_saved:>4}분 ({summary.total_time_saved / 60:.1f}시간)                                       ║
║   인지 에너지 절약: {summary.total_cognitive_energy_saved * 100:.1f}%                                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 👻 GHOST REPORT                                                               ║
║                                                                               ║
║ "{ghost_report.message[:70]}"
║                                                                               ║
║ 당신의 유일한 과제: {summary.preserved}개의 핵심 결정                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚠️ The Shock of Freedom                                                       ║
║                                                                               ║
║ 아무도 당신을 찾지 않고, 처리해야 할 서류가 없으며,                            ║
║ 돈은 시스템이 알아서 불리고 있습니다.                                          ║
║ 이 10%의 고요함 속에서 무엇을 창조하시겠습니까?                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 실행 예시
# ═══════════════════════════════════════════════════════════════════════════════

def run_aggressive_example() -> str:
    """Aggressive Mode 실행 예시"""
    # 샘플 업무
    works = [
        Work('w1', '일일 잔고 확인', 'CASH', 'OWN', 'FREQUENCY', 0.05, 0.3, 0.1, 0.1),
        Work('w2', '의례적 회의', 'PEOPLE', 'INFLUENCE', 'FREQUENCY', 0.08, 0.5, 0.2, 0.15),
        Work('w3', '청구서 처리', 'CASH', 'EXCHANGE', 'SEQUENCE', 0.4, 0.4, 0.6, 0.6),
        Work('w4', '세금 신고', 'CASH', 'DEPEND', 'POINT', 0.5, 0.5, 0.5, 0.7),
        Work('w5', '팀 프로젝트 리드', 'PEOPLE', 'COOPERATE', 'DURATION', 0.6, 2.5, 0.4, 0.8),
        Work('w6', '투자자 미팅', 'PEOPLE', 'INFLUENCE', 'POINT', 0.8, 0.5, 0.2, 0.9),
        Work('w7', '뉴스레터 구독 정리', 'DATA', 'OWN', 'FREQUENCY', 0.02, 0.2, 0.05, 0.05),
        Work('w8', '경쟁사 분석', 'MARKET', 'COMPETE', 'FREQUENCY', 0.3, 0.6, 0.4, 0.5),
        Work('w9', '신제품 전략', 'KNOWLEDGE', 'OWN', 'POINT', 0.7, 0.4, 0.3, 0.85),
        Work('w10', 'SNS 알림 확인', 'DATA', 'EXCHANGE', 'FREQUENCY', 0.01, 0.1, 0.02, 0.02),
    ]
    
    # Aggressive Mode 실행
    config = AGGRESSIVE_PRESETS['AGGRESSIVE']
    result = batch_classify_ert(works, config)
    
    return generate_aggressive_output(result)
