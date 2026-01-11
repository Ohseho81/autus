"""
═══════════════════════════════════════════════════════════════════════════════
🧠 AUTUS Agent - Decision Filter (인지 에너지 방벽)
═══════════════════════════════════════════════════════════════════════════════

Zero-Draft Decision, Information Triage, Top-1 Protection
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .types import (
    DecisionFilterConfig, DecisionAction, Decision, InformationItem,
    DecisionCategory,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 기본 설정
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_DECISION_CONFIG = DecisionFilterConfig(
    id='decision_filter_default',
    type='decision',
    enabled=True,
    permission_level='execute',
    execution_hours={'start': 0, 'end': 24},
    require_confirmation_above=0.7,
    learning_enabled=True,
    info_filter_enabled=True,
    blocked_categories=['celebrity', 'gossip', 'viral', 'clickbait'],
    allowed_sources=[],
    top_n_relevance_filter=5,
    auto_decide_threshold=0.3,
    learning_from_history=True,
    notification_batching=True,
    batch_interval_minutes=60,
    quiet_hours={'start': 22, 'end': 8},
    current_top_one_node='n15',
    top_one_protection=True,
)

# 노드별 키워드
NODE_KEYWORDS = {
    'n01': ['현금', '잔고', '계좌', '입금', '출금', '돈'],
    'n05': ['런웨이', '버틸', '기간', '자금', '여유'],
    'n09': ['수면', '잠', '피로', '휴식', '밤'],
    'n10': ['HRV', '심박', '스트레스', '건강'],
    'n12': ['작업', '업무', '연속', '휴식'],
    'n15': ['마감', '데드라인', '기한', '납기'],
    'n16': ['지연', '미룸', '늦음', '연기'],
    'n18': ['태스크', '할일', '과제', '업무'],
    'n23': ['고객', '사용자', '회원', '구독'],
    'n24': ['이탈', '취소', '해지', '탈퇴'],
}

# 노드 간 관계
NODE_RELATIONS = {
    'n01': ['n02', 'n03', 'n05', 'n06'],
    'n05': ['n01', 'n03', 'n04'],
    'n09': ['n10', 'n12', 'n13'],
    'n15': ['n16', 'n18', 'n17'],
    'n23': ['n24', 'n25', 'n29'],
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 정보 필터링
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_relevance(
    item: Dict,
    top_one_node: str,
    nodes: Dict
) -> InformationItem:
    """정보 관련도 계산"""
    top_node = nodes.get(top_one_node)
    
    # 관련도 계산 (0-1)
    relevance_score = 0.0
    content = f"{item.get('title', '')} {item.get('content', '')}".lower()
    
    # Top-1 관련 키워드 포함
    keywords = NODE_KEYWORDS.get(top_one_node, [])
    for keyword in keywords:
        if keyword.lower() in content:
            relevance_score += 0.2
    
    # 관련 노드 언급
    related_nodes = NODE_RELATIONS.get(top_one_node, [])
    for node_id in related_nodes:
        node = nodes.get(node_id)
        if node and hasattr(node, 'name') and node.name.lower() in content:
            relevance_score += 0.15
    
    relevance_score = min(1.0, relevance_score)
    
    # 중요도 계산
    importance_score = _calculate_importance(item, top_node)
    
    # 액션 필요 여부
    action_required = importance_score > 0.7 or (relevance_score > 0.5 and importance_score > 0.5)
    
    return InformationItem(
        id=item.get('id', ''),
        source=item.get('source', ''),
        title=item.get('title', ''),
        content=item.get('content', ''),
        timestamp=item.get('timestamp', datetime.now()),
        relevance_score=relevance_score,
        importance_score=importance_score,
        action_required=action_required,
        status='passed',
    )


def _calculate_importance(item: Dict, top_node) -> float:
    """중요도 계산"""
    score = 0.3  # 기본
    
    urgent_words = ['긴급', '즉시', '지금', 'urgent', 'asap', '오늘까지', '마감']
    content = f"{item.get('title', '')} {item.get('content', '')}".lower()
    
    for word in urgent_words:
        if word in content:
            score += 0.2
    
    # Top 노드 압력 높으면 관련 정보 중요도 증가
    if top_node and hasattr(top_node, 'pressure') and top_node.pressure > 0.6:
        score += 0.2
    
    return min(1.0, score)


def filter_information(
    items: List[Dict],
    config: DecisionFilterConfig,
    nodes: Dict
) -> Tuple[List[InformationItem], List[InformationItem], List[DecisionAction]]:
    """정보 필터링 실행"""
    passed: List[InformationItem] = []
    filtered: List[InformationItem] = []
    actions: List[DecisionAction] = []
    
    for item in items:
        # 차단 카테고리 체크
        source_lower = item.get('source', '').lower()
        title_lower = item.get('title', '').lower()
        
        is_blocked = any(
            cat in source_lower or cat in title_lower 
            for cat in config.blocked_categories
        )
        
        if is_blocked:
            filtered.append(InformationItem(
                id=item.get('id', ''),
                source=item.get('source', ''),
                title=item.get('title', ''),
                content=item.get('content', ''),
                timestamp=item.get('timestamp', datetime.now()),
                relevance_score=0,
                importance_score=0,
                action_required=False,
                status='filtered',
                filter_reason='차단 카테고리',
            ))
            continue
        
        # 관련도 계산
        analyzed = calculate_relevance(item, config.current_top_one_node, nodes)
        
        # Top-N 필터
        if analyzed.relevance_score < 0.3 and not analyzed.action_required:
            analyzed.status = 'filtered'
            analyzed.filter_reason = 'Top-1과 무관'
            filtered.append(analyzed)
            continue
        
        passed.append(analyzed)
    
    # 필터링 결과 액션
    if filtered:
        actions.append(DecisionAction(
            id=f'dec_filter_{datetime.now().timestamp()}',
            agent_type='decision',
            timestamp=datetime.now(),
            action_type='info_filter',
            description=f'{len(filtered)}개 정보 필터링 (Top-1 집중)',
            target_nodes=[config.current_top_one_node],
            status='executed',
            requires_approval=False,
            estimated_time_saved=len(filtered) * 2,
            estimated_energy_saved=len(filtered) * 0.002,
            reasoning=f'Top-1 노드({config.current_top_one_node})와 무관한 정보 차단',
            confidence=0.9,
            category='information',
            filtered_count=len(filtered),
        ))
    
    # Top-N만 반환
    top_n = sorted(passed, key=lambda x: x.relevance_score, reverse=True)[:config.top_n_relevance_filter]
    
    return top_n, filtered, actions


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 의사결정
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DecisionResult:
    """의사결정 결과"""
    decision: Decision
    selected_option: str
    reasoning: str
    confidence: float
    was_automated: bool


def auto_decide(
    decision: Decision,
    config: DecisionFilterConfig,
    history: List[Dict] = None
) -> DecisionResult:
    """자동 의사결정"""
    history = history or []
    
    # 중요도가 임계값 이하면 자동 결정
    can_automate = decision.importance <= config.auto_decide_threshold
    
    if not can_automate:
        return DecisionResult(
            decision=decision,
            selected_option='',
            reasoning='중요한 결정입니다. 직접 선택해주세요.',
            confidence=0,
            was_automated=False,
        )
    
    # 히스토리에서 유사 결정 찾기
    if config.learning_from_history and history:
        similar = _find_similar_decision(decision, history)
        if similar:
            return DecisionResult(
                decision=decision,
                selected_option=similar['choice'],
                reasoning=f'이전 유사 결정을 참고하여 "{similar["choice"]}" 선택',
                confidence=0.85,
                was_automated=True,
            )
    
    # 카테고리별 기본 규칙
    default = _get_default_choice(decision)
    
    return DecisionResult(
        decision=decision,
        selected_option=default['option'],
        reasoning=default['reasoning'],
        confidence=default['confidence'],
        was_automated=True,
    )


def _find_similar_decision(decision: Decision, history: List[Dict]) -> Optional[Dict]:
    """유사 결정 찾기"""
    for past in history:
        similarity = _calculate_string_similarity(
            decision.question.lower(),
            past.get('question', '').lower()
        )
        if similarity > 0.7:
            return past
    return None


def _calculate_string_similarity(a: str, b: str) -> float:
    """문자열 유사도 계산"""
    set_a = set(a.split())
    set_b = set(b.split())
    
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    
    return intersection / union if union > 0 else 0


def _get_default_choice(decision: Decision) -> Dict:
    """기본 선택 규칙"""
    category = decision.category
    options = decision.options
    
    if category == 'food':
        # 건강 우선
        healthy = [o for o in options if any(k in o for k in ['샐러드', '과일', '저칼로리'])]
        if healthy:
            return {'option': healthy[0], 'reasoning': '건강 우선 규칙 적용', 'confidence': 0.75}
    
    elif category == 'transport':
        # 시간 효율 우선
        fast = [o for o in options if any(k in o for k in ['택시', '빠른', '직행'])]
        if fast:
            return {'option': fast[0], 'reasoning': '시간 효율 우선 규칙 적용', 'confidence': 0.8}
    
    elif category == 'schedule':
        # 집중 시간 보호
        later = [o for o in options if any(k in o for k in ['오후', '저녁', '나중'])]
        if later:
            return {'option': later[0], 'reasoning': '오전 집중 시간 보호', 'confidence': 0.7}
    
    # 기본: 첫 번째 옵션
    return {'option': options[0] if options else '', 'reasoning': '기본 옵션 선택', 'confidence': 0.5}


def batch_decisions(
    decisions: List[Decision],
    config: DecisionFilterConfig,
    history: List[Dict] = None
) -> Tuple[List[DecisionResult], List[DecisionAction]]:
    """배치 의사결정"""
    history = history or []
    results: List[DecisionResult] = []
    actions: List[DecisionAction] = []
    
    automated_count = 0
    total_time_saved = 0
    
    for decision in decisions:
        result = auto_decide(decision, config, history)
        results.append(result)
        
        if result.was_automated:
            automated_count += 1
            total_time_saved += 3  # 결정당 3분
    
    if automated_count > 0:
        actions.append(DecisionAction(
            id=f'dec_auto_{datetime.now().timestamp()}',
            agent_type='decision',
            timestamp=datetime.now(),
            action_type='auto_decide',
            description=f'{automated_count}개 사소한 결정 자동 처리',
            target_nodes=[],
            status='executed',
            requires_approval=False,
            estimated_time_saved=total_time_saved,
            estimated_energy_saved=automated_count * 0.005,
            reasoning=f'중요도 {config.auto_decide_threshold} 이하 결정 자동화',
            confidence=0.8,
            category='work',
        ))
    
    return results, actions


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Decision Filter 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_decision_filter(
    nodes: Dict,
    information: List[Dict],
    decisions: List[Decision],
    decision_history: List[Dict],
    config: DecisionFilterConfig
) -> Dict:
    """Decision Filter 실행"""
    if not config.enabled:
        return {
            'filtered_info': [],
            'decision_results': [],
            'actions': [],
            'deleted_brain_fog': [],
        }
    
    all_actions: List[DecisionAction] = []
    deleted_brain_fog: List[str] = []
    
    # 1. 정보 필터링
    filtered_info, filtered_out, filter_actions = filter_information(
        information, config, nodes
    )
    all_actions.extend(filter_actions)
    
    if filtered_out:
        deleted_brain_fog.append(f'"이 뉴스/정보 봐야 하나?" × {len(filtered_out)}개 → 자동 필터링')
    
    # 2. 자동 의사결정
    decision_results, decision_actions = batch_decisions(
        decisions, config, decision_history
    )
    all_actions.extend(decision_actions)
    
    automated = [r for r in decision_results if r.was_automated]
    if automated:
        deleted_brain_fog.append(f'"뭘 선택하지?" × {len(automated)}개 → 자동 결정')
    
    return {
        'filtered_info': filtered_info,
        'decision_results': decision_results,
        'actions': all_actions,
        'deleted_brain_fog': deleted_brain_fog,
    }
