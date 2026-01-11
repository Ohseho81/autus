"""
═══════════════════════════════════════════════════════════════════════════════
🤖 AUTUS v2.5+ - Agent Protocol Type Definitions
═══════════════════════════════════════════════════════════════════════════════

AGI 대리인 시스템: 삶의 짐 삭제 및 자율 실행
- Financial Agent: 금융 자율 주행
- Decision Filter: 인지 에너지 방벽
- Social Buffer: 커뮤니케이션 자동화
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Literal
from datetime import datetime
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 AGENT CORE TYPES
# ═══════════════════════════════════════════════════════════════════════════════

AgentType = Literal['financial', 'decision', 'social', 'location']
AgentPermissionLevel = Literal['observe', 'suggest', 'execute', 'autonomous']


@dataclass
class AgentConfig:
    """Agent 기본 설정"""
    id: str
    type: AgentType
    enabled: bool = True
    permission_level: AgentPermissionLevel = 'suggest'
    
    # 실행 조건
    execution_hours: Dict[str, int] = field(default_factory=lambda: {'start': 9, 'end': 21})
    require_confirmation_above: float = 0.5
    
    # 학습
    persona_id: Optional[str] = None
    learning_enabled: bool = True
    
    # 통계
    total_executions: int = 0
    success_rate: float = 0.0
    saved_time: int = 0  # 분
    saved_energy: float = 0.0


@dataclass
class AgentAction:
    """Agent 액션"""
    id: str
    agent_type: AgentType
    timestamp: datetime
    
    # 액션 내용
    action_type: str
    description: str
    target_nodes: List[str]
    
    # 실행 상태
    status: Literal['pending', 'approved', 'executed', 'rejected', 'failed'] = 'pending'
    requires_approval: bool = False
    
    # 효과
    estimated_time_saved: int = 0  # 분
    estimated_energy_saved: float = 0.0
    actual_time_saved: Optional[int] = None
    actual_energy_saved: Optional[float] = None
    
    # 메타
    reasoning: str = ""
    confidence: float = 0.0
    related_persona: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ENERGY TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EnergyState:
    """에너지 상태"""
    # 현재 상태
    cognitive_energy: float = 0.7      # 인지 에너지 (0-1)
    physical_energy: float = 0.7       # 신체 에너지 (0-1)
    emotional_energy: float = 0.8      # 감정 에너지 (0-1)
    
    # 계산된 지표
    net_available_energy: float = 0.7  # 순수 가용 에너지
    burn_rate: float = 0.04            # 소모율 (/시간)
    recovery_rate: float = 0.0         # 회복율 (/시간)
    
    # 예측
    estimated_depletion_time: float = 0.0  # 고갈 예상 시간 (분)
    optimal_rest_time: str = ""            # 최적 휴식 시간
    
    # 히스토리
    last_updated: datetime = field(default_factory=datetime.now)
    daily_peak: float = 0.7
    daily_low: float = 0.7


@dataclass
class EnergyDrain:
    """에너지 소모원"""
    id: str
    source: str
    node_id: Optional[str] = None
    
    drain_type: Literal['decision', 'emotion', 'physical', 'social', 'cognitive'] = 'cognitive'
    amount: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    was_necessary: bool = True
    could_be_automated: bool = False
    was_automated: bool = False


@dataclass
class EnergySaved:
    """절약된 에너지"""
    id: str
    agent_type: AgentType
    action_id: str
    
    energy_type: Literal['cognitive', 'emotional', 'physical'] = 'cognitive'
    amount: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    description: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 FINANCIAL AGENT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class FinancialAgentConfig(AgentConfig):
    """금융 에이전트 설정"""
    # 자동 결제
    auto_pay_bills: bool = True
    bill_payment_buffer: int = 3  # 납부일 며칠 전
    
    # 자산 관리
    auto_rebalance: bool = False
    rebalance_threshold: float = 5.0  # 이탈 %
    risk_tolerance: Literal['conservative', 'moderate', 'aggressive'] = 'moderate'
    
    # 예산 관리
    budget_enforcement: bool = True
    category_limits: Dict[str, int] = field(default_factory=dict)


@dataclass
class Bill:
    """청구서"""
    id: str
    name: str
    amount: int
    due_date: datetime
    recurrence: Literal['monthly', 'quarterly', 'yearly', 'once'] = 'monthly'
    category: str = ""
    auto_pay: bool = True
    linked_account: Optional[str] = None
    last_paid: Optional[datetime] = None
    status: Literal['pending', 'scheduled', 'paid', 'overdue'] = 'pending'


@dataclass
class Expense:
    """지출"""
    id: str
    amount: int
    category: str
    description: str
    timestamp: datetime
    account: str = ""


@dataclass
class FinancialAction(AgentAction):
    """금융 액션"""
    amount: Optional[int] = None
    from_account: Optional[str] = None
    to_account: Optional[str] = None
    category: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 DECISION FILTER
# ═══════════════════════════════════════════════════════════════════════════════

DecisionCategory = Literal['food', 'shopping', 'transport', 'schedule', 
                           'information', 'entertainment', 'health', 'work']


@dataclass
class DecisionFilterConfig(AgentConfig):
    """의사결정 필터 설정"""
    # 정보 필터링
    info_filter_enabled: bool = True
    blocked_categories: List[str] = field(default_factory=lambda: ['celebrity', 'gossip', 'viral', 'clickbait'])
    allowed_sources: List[str] = field(default_factory=list)
    top_n_relevance_filter: int = 5
    
    # 결정 자동화
    auto_decide_threshold: float = 0.3
    learning_from_history: bool = True
    
    # 알림 제어
    notification_batching: bool = True
    batch_interval_minutes: int = 60
    quiet_hours: Dict[str, int] = field(default_factory=lambda: {'start': 22, 'end': 8})
    
    # Top-1 집중
    current_top_one_node: str = 'n15'
    top_one_protection: bool = True


@dataclass
class Decision:
    """의사결정"""
    id: str
    category: DecisionCategory
    question: str
    options: List[str]
    context: Optional[Dict[str, Any]] = None
    importance: float = 0.5  # 0-1


@dataclass
class InformationItem:
    """정보 아이템"""
    id: str
    source: str
    title: str
    content: str
    timestamp: datetime
    
    # 분석 결과
    relevance_score: float = 0.0
    importance_score: float = 0.0
    action_required: bool = False
    
    # 필터링
    status: Literal['passed', 'filtered', 'batched'] = 'passed'
    filter_reason: Optional[str] = None


@dataclass
class DecisionAction(AgentAction):
    """의사결정 액션"""
    category: Optional[DecisionCategory] = None
    original_options: Optional[List[str]] = None
    selected_option: Optional[str] = None
    filtered_count: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SOCIAL BUFFER
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ReplyTemplate:
    """응답 템플릿"""
    id: str
    name: str
    trigger: str
    response: str
    tone: Literal['formal', 'casual', 'friendly', 'professional'] = 'professional'
    use_case: Literal['decline', 'acknowledge', 'defer', 'info'] = 'acknowledge'


@dataclass
class DeclineReason:
    """거절 사유"""
    id: str
    condition: str
    template: str
    auto_apply: bool = False


@dataclass
class SocialBufferConfig(AgentConfig):
    """소셜 버퍼 설정"""
    # 대리 응답
    auto_reply_enabled: bool = True
    reply_templates: List[ReplyTemplate] = field(default_factory=list)
    personality_mirroring: bool = True
    
    # 우선순위
    priority_contacts: List[str] = field(default_factory=list)
    low_priority_patterns: List[str] = field(default_factory=lambda: ['newsletter', 'promotion', 'survey', 'noreply'])
    
    # 에너지 기반 제어
    energy_based_scheduling: bool = True
    min_energy_for_social: float = 0.4
    
    # 거절 자동화
    auto_decline_enabled: bool = False
    decline_reasons: List[DeclineReason] = field(default_factory=list)


@dataclass
class IncomingMessage:
    """수신 메시지"""
    id: str
    from_id: str
    from_name: str
    subject: Optional[str] = None
    body: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    type: Literal['email', 'message', 'call', 'meeting_request'] = 'message'
    priority: Optional[Literal['high', 'medium', 'low']] = None


@dataclass
class MeetingRequest:
    """미팅 요청"""
    id: str
    title: str
    organizer: str
    organizer_name: str
    proposed_time: datetime
    duration: int  # 분
    type: Literal['required', 'optional', 'social'] = 'optional'
    location: Optional[str] = None


@dataclass
class SocialAction(AgentAction):
    """소셜 액션"""
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    message_type: Optional[str] = None
    original_message: Optional[str] = None
    generated_reply: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 REPORT & METRICS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LeapfrogIndex:
    """초월 지수"""
    current_efficiency: float = 1.0
    target_efficiency: float = 1.5
    days_to_target: int = 0
    percentile_rank: int = 50


@dataclass
class DailyAgentReport:
    """일일 보고서"""
    date: datetime
    
    # 실행 요약
    total_actions: int = 0
    actions_by_agent: Dict[str, int] = field(default_factory=dict)
    success_rate: float = 0.0
    
    # 절약된 자원
    time_saved: int = 0  # 분
    decisions_saved: int = 0
    energy_preserved: float = 0.0
    
    # 삭제된 엔트로피
    deleted_worries: List[str] = field(default_factory=list)
    filtered_information: int = 0
    declined_requests: int = 0
    
    # 자유 지표
    freedom_score: int = 50
    pure_will_decisions: int = 0
    total_decisions: int = 0
    
    # 초월 지수
    leapfrog_index: LeapfrogIndex = field(default_factory=LeapfrogIndex)
    
    # 상세
    actions: List[AgentAction] = field(default_factory=list)
    insights: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class FreedomMetrics:
    """자유 메트릭스"""
    # 4대 자유
    financial: Dict[str, Any] = field(default_factory=dict)
    mental: Dict[str, Any] = field(default_factory=dict)
    social: Dict[str, Any] = field(default_factory=dict)
    locational: Dict[str, Any] = field(default_factory=dict)
    
    # 종합
    total_freedom: int = 50
    freedom_trend: Literal['increasing', 'stable', 'decreasing'] = 'stable'
    next_milestone: str = ""
