"""
═══════════════════════════════════════════════════════════════════════════════
🤖 AUTUS v2.5+ - Agent Protocol
═══════════════════════════════════════════════════════════════════════════════

AGI 대리인 시스템: 삶의 짐 삭제 및 자유 확보
- Financial Agent: 금융 자율 주행
- Decision Filter: 인지 에너지 방벽
- Social Buffer: 커뮤니케이션 자동화
- Energy Tracker: 에너지 추적 및 보존

사용법:
    from backend.core.agent import (
        initialize_agent_service,
        run_all_agents,
        analyze_energy,
    )
    
    state = initialize_agent_service()
    result = run_all_agents(state, nodes=my_nodes)
    print(result['report_text'])
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Types
from .types import (
    AgentType, AgentPermissionLevel, AgentConfig, AgentAction,
    EnergyState, EnergyDrain, EnergySaved,
    FinancialAgentConfig, Bill, Expense, FinancialAction,
    DecisionFilterConfig, Decision, InformationItem, DecisionAction,
    SocialBufferConfig, IncomingMessage, MeetingRequest, SocialAction,
    ReplyTemplate, DeclineReason,
    DailyAgentReport, FreedomMetrics, LeapfrogIndex,
)

# Energy Tracker
from .energy_tracker import (
    ENERGY_CONSTANTS,
    create_initial_energy_state,
    detect_energy_drains,
    get_automatable_drains,
    calculate_total_drain,
    update_energy_state,
    analyze_energy_state,
    create_energy_saved,
    calculate_daily_energy_saved,
    DrainSource,
    EnergyAnalysis,
)

# Financial Agent
from .financial_agent import (
    DEFAULT_FINANCIAL_CONFIG,
    analyze_bills,
    analyze_budget,
    run_financial_agent,
    get_deleted_financial_worries,
)

# Decision Filter
from .decision_filter import (
    DEFAULT_DECISION_CONFIG,
    calculate_relevance,
    filter_information,
    auto_decide,
    batch_decisions,
    run_decision_filter,
    DecisionResult,
)

# Social Buffer
from .social_buffer import (
    DEFAULT_SOCIAL_CONFIG,
    DEFAULT_REPLY_TEMPLATES,
    DEFAULT_DECLINE_REASONS,
    analyze_message,
    generate_auto_reply,
    analyze_meeting_request,
    run_social_buffer,
    MessageAnalysis,
)

# Report Generator
from .report_generator import (
    generate_daily_report,
    calculate_freedom_metrics,
    format_report_text,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Agent Service State
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentServiceState:
    """Agent Service 상태"""
    # 에너지
    energy_state: EnergyState = field(default_factory=create_initial_energy_state)
    energy_saved: List[EnergySaved] = field(default_factory=list)
    
    # 설정
    financial_config: FinancialAgentConfig = field(default_factory=lambda: DEFAULT_FINANCIAL_CONFIG)
    decision_config: DecisionFilterConfig = field(default_factory=lambda: DEFAULT_DECISION_CONFIG)
    social_config: SocialBufferConfig = field(default_factory=lambda: DEFAULT_SOCIAL_CONFIG)
    
    # 히스토리
    reports: List[DailyAgentReport] = field(default_factory=list)
    decision_history: List[Dict] = field(default_factory=list)
    
    # 통계
    total_time_saved: int = 0
    total_energy_saved: float = 0.0
    total_decisions_automated: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 초기화
# ═══════════════════════════════════════════════════════════════════════════════

def initialize_agent_service(
    financial_config: Optional[Dict] = None,
    decision_config: Optional[Dict] = None,
    social_config: Optional[Dict] = None,
) -> AgentServiceState:
    """Agent Service 초기화"""
    state = AgentServiceState()
    
    # 커스텀 설정 적용
    if financial_config:
        for key, value in financial_config.items():
            if hasattr(state.financial_config, key):
                setattr(state.financial_config, key, value)
    
    if decision_config:
        for key, value in decision_config.items():
            if hasattr(state.decision_config, key):
                setattr(state.decision_config, key, value)
    
    if social_config:
        for key, value in social_config.items():
            if hasattr(state.social_config, key):
                setattr(state.social_config, key, value)
    
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_agents(
    state: AgentServiceState,
    nodes: Dict,
    bills: List[Bill] = None,
    expenses: List[Expense] = None,
    information: List[Dict] = None,
    decisions: List[Decision] = None,
    messages: List[IncomingMessage] = None,
    meeting_requests: List[MeetingRequest] = None,
    personality_data: Optional[Dict] = None,
    recent_decisions: int = 0,
    recent_social_interactions: int = 0,
    is_resting: bool = False,
) -> Dict:
    """모든 Agent 실행 및 보고서 생성"""
    bills = bills or []
    expenses = expenses or []
    information = information or []
    decisions = decisions or []
    messages = messages or []
    meeting_requests = meeting_requests or []
    
    # 1. 에너지 드레인 감지
    drains = detect_energy_drains(nodes, recent_decisions, recent_social_interactions)
    
    # 2. Financial Agent 실행
    financial_actions = run_financial_agent(
        nodes, bills, expenses, state.financial_config
    )
    
    # 3. Decision Filter 실행
    decision_result = run_decision_filter(
        nodes, information, decisions, 
        state.decision_history, state.decision_config
    )
    
    # 4. Social Buffer 실행
    social_result = run_social_buffer(
        nodes, state.energy_state, messages, meeting_requests,
        state.social_config, personality_data
    )
    
    # 5. 에너지 절약 기록
    new_energy_saved = list(state.energy_saved)
    all_actions = (
        financial_actions + 
        decision_result['actions'] + 
        social_result['actions']
    )
    
    for action in all_actions:
        if action.status == 'executed' and action.estimated_energy_saved > 0:
            new_energy_saved.append(EnergySaved(
                id=f'saved_{action.id}',
                agent_type=action.agent_type,
                action_id=action.id,
                energy_type='cognitive' if action.agent_type != 'social' else 'emotional',
                amount=action.estimated_energy_saved,
                timestamp=datetime.now(),
                description=action.description,
            ))
    
    # 6. 에너지 상태 업데이트
    new_energy_state = update_energy_state(
        state.energy_state, drains, new_energy_saved, is_resting
    )
    
    # 7. 일일 보고서 생성
    total_decisions_today = len(decisions) + recent_decisions
    
    report = generate_daily_report(
        date=datetime.now(),
        financial_actions=financial_actions,
        decision_actions=decision_result['actions'],
        social_actions=social_result['actions'],
        energy_saved=new_energy_saved,
        energy_state=new_energy_state,
        nodes=nodes,
        total_decisions_today=total_decisions_today,
        deleted_worries={
            'financial': get_deleted_financial_worries(financial_actions),
            'brain_fog': decision_result.get('deleted_brain_fog', []),
            'guilt': social_result.get('deleted_guilt', []),
        },
    )
    
    # 8. 상태 업데이트
    state.energy_state = new_energy_state
    state.energy_saved = new_energy_saved
    state.reports = (state.reports + [report])[-30:]  # 최근 30일
    
    # Decision history 업데이트
    for dr in decision_result.get('decision_results', []):
        if dr.was_automated:
            state.decision_history.append({
                'question': dr.decision.question,
                'choice': dr.selected_option,
            })
    state.decision_history = state.decision_history[-100:]
    
    state.total_time_saved += report.time_saved
    state.total_energy_saved += report.energy_preserved
    state.total_decisions_automated += report.decisions_saved
    
    # 9. 자유 메트릭스
    freedom_metrics = calculate_freedom_metrics(state.reports, nodes)
    
    # 10. 보고서 텍스트
    report_text = format_report_text(report)
    
    return {
        'state': state,
        'report': report,
        'freedom_metrics': freedom_metrics,
        'report_text': report_text,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 분석
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_energy(
    state: AgentServiceState,
    nodes: Dict,
    recent_decisions: int = 0,
    recent_social_interactions: int = 0
) -> Dict:
    """에너지 분석"""
    drains = detect_energy_drains(nodes, recent_decisions, recent_social_interactions)
    analysis = analyze_energy_state(state.energy_state, drains)
    
    return {
        'state': state.energy_state,
        'drains': drains,
        'analysis': analysis,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 버전 정보
# ═══════════════════════════════════════════════════════════════════════════════

AGENT_VERSION = '2.5+'
AGENT_PROTOCOL_VERSION = '1.0'

__all__ = [
    # Version
    'AGENT_VERSION',
    'AGENT_PROTOCOL_VERSION',
    
    # Main functions
    'initialize_agent_service',
    'run_all_agents',
    'analyze_energy',
    
    # State
    'AgentServiceState',
    
    # Types
    'AgentType', 'AgentPermissionLevel', 'AgentConfig', 'AgentAction',
    'EnergyState', 'EnergyDrain', 'EnergySaved',
    'FinancialAgentConfig', 'Bill', 'Expense', 'FinancialAction',
    'DecisionFilterConfig', 'Decision', 'InformationItem', 'DecisionAction',
    'SocialBufferConfig', 'IncomingMessage', 'MeetingRequest', 'SocialAction',
    'DailyAgentReport', 'FreedomMetrics', 'LeapfrogIndex',
    
    # Energy
    'ENERGY_CONSTANTS',
    'create_initial_energy_state',
    'detect_energy_drains',
    'analyze_energy_state',
    
    # Configs
    'DEFAULT_FINANCIAL_CONFIG',
    'DEFAULT_DECISION_CONFIG',
    'DEFAULT_SOCIAL_CONFIG',
]
