"""
═══════════════════════════════════════════════════════════════════════════════
👥 AUTUS Agent - Social Buffer (커뮤니케이션 자동화)
═══════════════════════════════════════════════════════════════════════════════

Adaptive Reply Proxy, Social Energy Management, Auto Decline
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .types import (
    SocialBufferConfig, SocialAction, IncomingMessage, MeetingRequest,
    ReplyTemplate, DeclineReason, EnergyState,
)
from .energy_tracker import ENERGY_CONSTANTS

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 기본 템플릿
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_REPLY_TEMPLATES = [
    ReplyTemplate(
        id='ack_received',
        name='수신 확인',
        trigger=r'확인.*부탁|받았.*확인|전달.*드립니다',
        response='네, 확인했습니다. 감사합니다.',
        tone='professional',
        use_case='acknowledge',
    ),
    ReplyTemplate(
        id='ack_thanks',
        name='감사 응답',
        trigger=r'감사|고맙|수고',
        response='별말씀을요. 감사합니다!',
        tone='friendly',
        use_case='acknowledge',
    ),
    ReplyTemplate(
        id='decline_meeting',
        name='미팅 거절',
        trigger=r'미팅|회의|만남|약속',
        response='제안 감사드립니다. 현재 일정이 빠듯하여 참석이 어려울 것 같습니다. 다음 기회에 꼭 뵙겠습니다.',
        tone='professional',
        use_case='decline',
    ),
    ReplyTemplate(
        id='decline_favor',
        name='부탁 거절',
        trigger=r'부탁|도움|해줄 수',
        response='요청해주셔서 감사합니다. 현재 진행 중인 프로젝트로 여력이 없어 죄송합니다. 다른 분께 문의해보시는 건 어떨까요?',
        tone='professional',
        use_case='decline',
    ),
    ReplyTemplate(
        id='defer_busy',
        name='바쁨 알림',
        trigger=r'급한|빠른.*답변|언제.*가능',
        response='현재 다른 업무로 바빠서 자세한 답변이 늦어질 수 있습니다. 가능한 빨리 연락드리겠습니다.',
        tone='professional',
        use_case='defer',
    ),
]

DEFAULT_DECLINE_REASONS = [
    DeclineReason(
        id='energy_low',
        condition='energy < 0.3',
        template='죄송합니다. 현재 컨디션이 좋지 않아 참석이 어렵습니다. 양해 부탁드립니다.',
        auto_apply=True,
    ),
    DeclineReason(
        id='deadline_pressure',
        condition='n15.pressure > 0.7',
        template='죄송합니다. 급한 마감 건으로 일정 조율이 어렵습니다. 다음 기회에 뵙겠습니다.',
        auto_apply=True,
    ),
    DeclineReason(
        id='overwork',
        condition='n12.pressure > 0.6',
        template='연속 업무로 피로가 누적되어 오늘은 어렵습니다. 조금 회복되면 연락드리겠습니다.',
        auto_apply=True,
    ),
]

DEFAULT_SOCIAL_CONFIG = SocialBufferConfig(
    id='social_buffer_default',
    type='social',
    enabled=True,
    permission_level='suggest',
    execution_hours={'start': 9, 'end': 22},
    require_confirmation_above=0.5,
    learning_enabled=True,
    auto_reply_enabled=True,
    reply_templates=DEFAULT_REPLY_TEMPLATES,
    personality_mirroring=True,
    priority_contacts=[],
    low_priority_patterns=['newsletter', 'promotion', 'survey', 'noreply'],
    energy_based_scheduling=True,
    min_energy_for_social=0.4,
    auto_decline_enabled=False,
    decline_reasons=DEFAULT_DECLINE_REASONS,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 메시지 분석
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MessageAnalysis:
    """메시지 분석 결과"""
    message: IncomingMessage
    priority: str  # vip, high, medium, low, spam
    intent: str  # request, info, social, urgent, spam
    requires_personal_response: bool
    suggested_template: Optional[ReplyTemplate] = None
    suggested_reply: Optional[str] = None


def analyze_message(
    message: IncomingMessage,
    config: SocialBufferConfig
) -> MessageAnalysis:
    """메시지 분석"""
    content = f"{message.subject or ''} {message.body}".lower()
    
    # VIP 체크
    if message.from_id in config.priority_contacts or message.from_name in config.priority_contacts:
        return MessageAnalysis(
            message=message,
            priority='vip',
            intent=_detect_intent(content),
            requires_personal_response=True,
        )
    
    # 스팸/저우선순위 체크
    is_low_priority = any(
        pattern in message.from_id.lower() or pattern in content
        for pattern in config.low_priority_patterns
    )
    
    if is_low_priority:
        return MessageAnalysis(
            message=message,
            priority='spam',
            intent='spam',
            requires_personal_response=False,
        )
    
    # 의도 분석
    intent = _detect_intent(content)
    
    # 우선순위 결정
    if intent == 'urgent' or '긴급' in content or 'urgent' in content:
        priority = 'high'
    elif intent in ('social', 'info'):
        priority = 'low'
    else:
        priority = 'medium'
    
    # 매칭 템플릿 찾기
    template = _find_matching_template(content, config.reply_templates)
    
    # 자동 응답 가능 여부
    requires_personal = priority == 'high' or intent == 'urgent' or template is None
    
    return MessageAnalysis(
        message=message,
        priority=priority,
        intent=intent,
        requires_personal_response=requires_personal,
        suggested_template=template,
        suggested_reply=template.response if template else None,
    )


def _detect_intent(content: str) -> str:
    """의도 감지"""
    if any(w in content for w in ['긴급', '급한', 'asap']):
        return 'urgent'
    if any(w in content for w in ['부탁', '요청', '해줄']):
        return 'request'
    if any(w in content for w in ['안녕', '잘 지내', '오랜만']):
        return 'social'
    return 'info'


def _find_matching_template(content: str, templates: List[ReplyTemplate]) -> Optional[ReplyTemplate]:
    """매칭 템플릿 찾기"""
    for template in templates:
        if re.search(template.trigger, content, re.IGNORECASE):
            return template
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 응답 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_auto_reply(
    analysis: MessageAnalysis,
    config: SocialBufferConfig,
    personality_data: Optional[Dict] = None
) -> Optional[SocialAction]:
    """자동 응답 생성"""
    if not config.auto_reply_enabled:
        return None
    if analysis.requires_personal_response:
        return None
    if not analysis.suggested_template:
        return None
    
    reply = analysis.suggested_template.response
    
    # 개인화
    if config.personality_mirroring and personality_data:
        reply = _personalize_reply(reply, personality_data)
    
    can_auto_execute = config.permission_level in ('execute', 'autonomous')
    
    return SocialAction(
        id=f'soc_reply_{analysis.message.id}_{datetime.now().timestamp()}',
        agent_type='social',
        timestamp=datetime.now(),
        action_type='auto_reply',
        description=f'{analysis.message.from_name}에게 자동 응답 ({analysis.suggested_template.use_case})',
        target_nodes=[],
        status='executed' if can_auto_execute else 'pending',
        requires_approval=not can_auto_execute,
        estimated_time_saved=5,
        estimated_energy_saved=0.02,
        reasoning=f'"{analysis.suggested_template.name}" 템플릿 매칭',
        confidence=0.85,
        contact_id=analysis.message.from_id,
        contact_name=analysis.message.from_name,
        message_type=analysis.message.type,
        original_message=analysis.message.body[:100],
        generated_reply=reply,
    )


def _personalize_reply(reply: str, personality: Dict) -> str:
    """응답 개인화"""
    style = personality.get('style', 'default')
    
    if style == 'formal':
        return reply.replace('네,', '네, 알겠습니다.').replace('!', '.')
    elif style == 'casual':
        return reply.replace('감사합니다.', '감사해요~').replace('죄송합니다.', '미안해요!')
    elif style == 'minimal':
        return reply.split('.')[0] + '.'
    
    return reply


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 미팅 요청 분석
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_meeting_request(
    request: MeetingRequest,
    energy_state: EnergyState,
    config: SocialBufferConfig,
    nodes: Dict
) -> SocialAction:
    """미팅 요청 분석"""
    net_energy = energy_state.net_available_energy
    is_vip = (request.organizer in config.priority_contacts or 
              request.organizer_name in config.priority_contacts)
    
    # 에너지 체크
    has_energy = net_energy >= config.min_energy_for_social
    
    # 마감 압박 체크
    deadline_node = nodes.get('n15')
    has_deadline_pressure = deadline_node and getattr(deadline_node, 'pressure', 0) > 0.6
    
    # 결정
    should_decline = False
    decline_reason_id = ''
    
    if not is_vip:
        if not has_energy:
            should_decline = True
            decline_reason_id = 'energy_low'
        elif has_deadline_pressure and request.type != 'required':
            should_decline = True
            decline_reason_id = 'deadline_pressure'
    
    # 거절 템플릿 찾기
    decline_reason = None
    if should_decline:
        decline_reason = next(
            (d for d in config.decline_reasons if d.id == decline_reason_id),
            None
        )
    
    if should_decline and decline_reason and config.auto_decline_enabled:
        return SocialAction(
            id=f'soc_decline_{request.id}_{datetime.now().timestamp()}',
            agent_type='social',
            timestamp=datetime.now(),
            action_type='decline_request',
            description=f'"{request.title}" 미팅 거절 ({decline_reason_id})',
            target_nodes=['n12', 'n15'],
            status='executed' if decline_reason.auto_apply and config.permission_level != 'observe' else 'pending',
            requires_approval=not decline_reason.auto_apply,
            estimated_time_saved=request.duration + 15,
            estimated_energy_saved=0.03 * (request.duration / 60),
            reasoning=decline_reason.template,
            confidence=0.9,
            contact_name=request.organizer_name,
            message_type='meeting',
            generated_reply=decline_reason.template,
        )
    
    # 승인 또는 조정 제안
    return SocialAction(
        id=f'soc_schedule_{request.id}_{datetime.now().timestamp()}',
        agent_type='social',
        timestamp=datetime.now(),
        action_type='schedule_adjust',
        description=f'"{request.title}" 미팅 {"조정 필요" if should_decline else "승인 가능"}',
        target_nodes=[],
        status='pending',
        requires_approval=True,
        estimated_time_saved=0,
        estimated_energy_saved=0,
        reasoning='에너지 또는 마감 압박으로 조정 권장' if should_decline else '일정 및 에너지 상태 적합',
        confidence=0.8,
        contact_name=request.organizer_name,
        message_type='meeting',
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Social Buffer 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_social_buffer(
    nodes: Dict,
    energy_state: EnergyState,
    messages: List[IncomingMessage],
    meeting_requests: List[MeetingRequest],
    config: SocialBufferConfig,
    personality_data: Optional[Dict] = None
) -> Dict:
    """Social Buffer 실행"""
    if not config.enabled:
        return {'analyses': [], 'actions': [], 'deleted_guilt': []}
    
    actions: List[SocialAction] = []
    deleted_guilt: List[str] = []
    
    # 1. 메시지 분석 및 자동 응답
    analyses = [analyze_message(msg, config) for msg in messages]
    
    for analysis in analyses:
        reply_action = generate_auto_reply(analysis, config, personality_data)
        if reply_action:
            actions.append(reply_action)
            if reply_action.status == 'executed':
                deleted_guilt.append(
                    f'"{analysis.message.from_name}에게 뭐라고 답하지?" → 자동 응답 완료'
                )
    
    # 스팸 처리
    spam_count = len([a for a in analyses if a.priority == 'spam'])
    if spam_count > 0:
        actions.append(SocialAction(
            id=f'soc_spam_{datetime.now().timestamp()}',
            agent_type='social',
            timestamp=datetime.now(),
            action_type='priority_filter',
            description=f'{spam_count}개 저우선순위 메시지 필터링',
            target_nodes=[],
            status='executed',
            requires_approval=False,
            estimated_time_saved=spam_count * 2,
            estimated_energy_saved=spam_count * 0.005,
            reasoning='뉴스레터/프로모션 등 자동 필터링',
            confidence=0.95,
        ))
        deleted_guilt.append(f'"이 메일들 읽어야 하나?" × {spam_count}개 → 자동 필터링')
    
    # 2. 미팅 요청 처리
    for request in meeting_requests:
        meeting_action = analyze_meeting_request(request, energy_state, config, nodes)
        actions.append(meeting_action)
        
        if meeting_action.action_type == 'decline_request' and meeting_action.status == 'executed':
            deleted_guilt.append(
                f'"{request.organizer_name}의 미팅 거절해도 될까?" → 물리적 근거로 자동 거절'
            )
    
    # 3. 에너지 보호
    if energy_state.net_available_energy < ENERGY_CONSTANTS['LOW_ENERGY_THRESHOLD']:
        actions.append(SocialAction(
            id=f'soc_protect_{datetime.now().timestamp()}',
            agent_type='social',
            timestamp=datetime.now(),
            action_type='energy_protection',
            description='에너지 부족으로 방해 금지 모드 활성화',
            target_nodes=['n10', 'n12'],
            status='executed' if config.permission_level != 'observe' else 'pending',
            requires_approval=config.permission_level == 'observe',
            estimated_time_saved=30,
            estimated_energy_saved=0.1,
            reasoning=f'순수 가용 에너지 {energy_state.net_available_energy * 100:.0f}% (임계값 {config.min_energy_for_social * 100}% 미만)',
            confidence=0.95,
        ))
        deleted_guilt.append('"지금 연락 받아야 하나?" → 에너지 부족으로 자동 보호 모드')
    
    return {'analyses': analyses, 'actions': actions, 'deleted_guilt': deleted_guilt}
