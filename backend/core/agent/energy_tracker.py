"""
═══════════════════════════════════════════════════════════════════════════════
🔋 AUTUS Agent - Energy Tracker & Drain Detection
═══════════════════════════════════════════════════════════════════════════════

인지 에너지 추적, 낭비 감지, 보존 최적화
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime

from .types import EnergyState, EnergyDrain, EnergySaved, AgentType

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 상수
# ═══════════════════════════════════════════════════════════════════════════════

ENERGY_CONSTANTS = {
    # 기본 소모율 (시간당)
    'BASE_COGNITIVE_DRAIN': 0.04,
    'BASE_PHYSICAL_DRAIN': 0.03,
    'BASE_EMOTIONAL_DRAIN': 0.02,
    
    # 활동별 소모량
    'DRAIN_PER_DECISION': 0.005,
    'DRAIN_PER_WORRY': 0.02,
    'DRAIN_PER_SOCIAL_INTERACTION': 0.03,
    'DRAIN_PER_CONTEXT_SWITCH': 0.015,
    'DRAIN_PER_INFORMATION': 0.002,
    
    # 회복률 (시간당)
    'RECOVERY_SLEEP': 0.15,
    'RECOVERY_REST': 0.08,
    'RECOVERY_EXERCISE': 0.05,
    'RECOVERY_MEDITATION': 0.06,
    
    # 임계값
    'LOW_ENERGY_THRESHOLD': 0.3,
    'CRITICAL_ENERGY_THRESHOLD': 0.15,
    'OPTIMAL_ENERGY_THRESHOLD': 0.7,
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 상태 초기화
# ═══════════════════════════════════════════════════════════════════════════════

def create_initial_energy_state() -> EnergyState:
    """초기 에너지 상태 생성"""
    now = datetime.now()
    hour = now.hour
    
    # 시간대별 기본 에너지
    if 6 <= hour <= 10:
        time_based_energy = 0.9
    elif 11 <= hour <= 14:
        time_based_energy = 0.7
    elif 15 <= hour <= 18:
        time_based_energy = 0.6
    elif 19 <= hour <= 22:
        time_based_energy = 0.5
    else:
        time_based_energy = 0.4
    
    return EnergyState(
        cognitive_energy=time_based_energy,
        physical_energy=time_based_energy * 0.9,
        emotional_energy=0.8,
        net_available_energy=time_based_energy * 0.85,
        burn_rate=ENERGY_CONSTANTS['BASE_COGNITIVE_DRAIN'],
        recovery_rate=0,
        estimated_depletion_time=(time_based_energy / ENERGY_CONSTANTS['BASE_COGNITIVE_DRAIN']) * 60,
        optimal_rest_time=_calculate_optimal_rest_time(now, time_based_energy),
        last_updated=now,
        daily_peak=time_based_energy,
        daily_low=time_based_energy,
    )


def _calculate_optimal_rest_time(now: datetime, current_energy: float) -> str:
    """최적 휴식 시간 계산"""
    hour = now.hour
    
    if current_energy < ENERGY_CONSTANTS['LOW_ENERGY_THRESHOLD']:
        return '지금 즉시'
    
    if 13 <= hour <= 15:
        return '14:00-14:30 (파워냅)'
    
    if hour >= 20:
        return '22:00-23:00 (취침 준비)'
    
    rest_hour = min(22, hour + int((current_energy - 0.3) / 0.1) * 2)
    return f'{rest_hour}:00'


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 소모 감지
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DrainSource:
    """에너지 소모원"""
    type: str  # decision, emotion, physical, social, cognitive
    source: str
    node_id: Optional[str] = None
    base_amount: float = 0.0
    multiplier: float = 1.0
    can_automate: bool = False


def detect_energy_drains(
    nodes: Dict[str, any],
    recent_decisions: int = 0,
    recent_social_interactions: int = 0
) -> List[DrainSource]:
    """노드 상태에서 에너지 소모원 감지"""
    drains: List[DrainSource] = []
    
    # 1. 결정 피로
    if recent_decisions > 10:
        drains.append(DrainSource(
            type='decision',
            source='과다한 의사결정',
            base_amount=ENERGY_CONSTANTS['DRAIN_PER_DECISION'] * recent_decisions,
            multiplier=1 + (recent_decisions - 10) * 0.1,
            can_automate=True,
        ))
    
    # 2. 재무 스트레스 (n01, n05)
    cash_node = nodes.get('n01')
    if cash_node and getattr(cash_node, 'pressure', 0) > 0.5:
        drains.append(DrainSource(
            type='cognitive',
            source='현금 부족 걱정',
            node_id='n01',
            base_amount=ENERGY_CONSTANTS['DRAIN_PER_WORRY'],
            multiplier=cash_node.pressure,
            can_automate=True,
        ))
    
    runway_node = nodes.get('n05')
    if runway_node and getattr(runway_node, 'pressure', 0) > 0.6:
        drains.append(DrainSource(
            type='cognitive',
            source='런웨이 불안',
            node_id='n05',
            base_amount=ENERGY_CONSTANTS['DRAIN_PER_WORRY'] * 1.5,
            multiplier=runway_node.pressure,
            can_automate=True,
        ))
    
    # 3. 수면 부족 (n09)
    sleep_node = nodes.get('n09')
    if sleep_node and getattr(sleep_node, 'pressure', 0) > 0.4:
        drains.append(DrainSource(
            type='physical',
            source='수면 부족',
            node_id='n09',
            base_amount=0.05,
            multiplier=sleep_node.pressure * 2,
            can_automate=False,
        ))
    
    # 4. 연속 작업 (n12)
    work_node = nodes.get('n12')
    if work_node and getattr(work_node, 'pressure', 0) > 0.5:
        drains.append(DrainSource(
            type='cognitive',
            source='연속 작업 피로',
            node_id='n12',
            base_amount=0.03,
            multiplier=work_node.pressure * 1.5,
            can_automate=True,
        ))
    
    # 5. 마감 압박 (n15, n16)
    deadline_node = nodes.get('n15')
    if deadline_node and getattr(deadline_node, 'pressure', 0) > 0.6:
        drains.append(DrainSource(
            type='cognitive',
            source='마감 압박',
            node_id='n15',
            base_amount=ENERGY_CONSTANTS['DRAIN_PER_WORRY'],
            multiplier=deadline_node.pressure * 1.2,
            can_automate=True,
        ))
    
    delay_node = nodes.get('n16')
    if delay_node and getattr(delay_node, 'value', 0) > 0:
        drains.append(DrainSource(
            type='emotional',
            source='지연 스트레스',
            node_id='n16',
            base_amount=0.02 * delay_node.value,
            multiplier=1,
            can_automate=True,
        ))
    
    # 6. 사회적 소모
    if recent_social_interactions > 5:
        drains.append(DrainSource(
            type='social',
            source='과다한 사회적 상호작용',
            base_amount=ENERGY_CONSTANTS['DRAIN_PER_SOCIAL_INTERACTION'] * recent_social_interactions,
            multiplier=1,
            can_automate=True,
        ))
    
    return drains


def get_automatable_drains(drains: List[DrainSource]) -> List[DrainSource]:
    """자동화 가능한 소모원 필터"""
    return [d for d in drains if d.can_automate]


def calculate_total_drain(drains: List[DrainSource]) -> float:
    """총 에너지 소모량 계산"""
    return sum(d.base_amount * d.multiplier for d in drains)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 상태 업데이트
# ═══════════════════════════════════════════════════════════════════════════════

def update_energy_state(
    current: EnergyState,
    drains: List[DrainSource],
    saved_energy: List[EnergySaved],
    is_resting: bool = False
) -> EnergyState:
    """에너지 상태 업데이트"""
    now = datetime.now()
    hours_since_update = (now - current.last_updated).total_seconds() / 3600
    
    # 시간 경과에 따른 기본 소모
    cognitive_change = -ENERGY_CONSTANTS['BASE_COGNITIVE_DRAIN'] * hours_since_update
    physical_change = -ENERGY_CONSTANTS['BASE_PHYSICAL_DRAIN'] * hours_since_update
    emotional_change = -ENERGY_CONSTANTS['BASE_EMOTIONAL_DRAIN'] * hours_since_update
    
    # 드레인 적용
    for drain in drains:
        amount = drain.base_amount * drain.multiplier
        if drain.type in ('cognitive', 'decision'):
            cognitive_change -= amount
        elif drain.type == 'physical':
            physical_change -= amount
        elif drain.type in ('emotional', 'social'):
            emotional_change -= amount
    
    # 절약된 에너지 적용
    for saved in saved_energy:
        if saved.energy_type == 'cognitive':
            cognitive_change += saved.amount
        elif saved.energy_type == 'physical':
            physical_change += saved.amount
        elif saved.energy_type == 'emotional':
            emotional_change += saved.amount
    
    # 휴식 중이면 회복
    if is_resting:
        cognitive_change += ENERGY_CONSTANTS['RECOVERY_REST'] * hours_since_update
        physical_change += ENERGY_CONSTANTS['RECOVERY_REST'] * 0.5 * hours_since_update
        emotional_change += ENERGY_CONSTANTS['RECOVERY_REST'] * 0.8 * hours_since_update
    
    # 새 값 계산 (0-1 범위)
    new_cognitive = max(0, min(1, current.cognitive_energy + cognitive_change))
    new_physical = max(0, min(1, current.physical_energy + physical_change))
    new_emotional = max(0, min(1, current.emotional_energy + emotional_change))
    
    # 순수 가용 에너지 (가중 평균)
    net_available = new_cognitive * 0.5 + new_physical * 0.3 + new_emotional * 0.2
    
    # 소모율 계산
    total_drain = calculate_total_drain(drains)
    burn_rate = ENERGY_CONSTANTS['BASE_COGNITIVE_DRAIN'] + total_drain
    
    # 고갈 예상 시간
    estimated_depletion = (net_available / burn_rate) * 60 if burn_rate > 0 else float('inf')
    
    return EnergyState(
        cognitive_energy=new_cognitive,
        physical_energy=new_physical,
        emotional_energy=new_emotional,
        net_available_energy=net_available,
        burn_rate=burn_rate,
        recovery_rate=ENERGY_CONSTANTS['RECOVERY_REST'] if is_resting else 0,
        estimated_depletion_time=estimated_depletion,
        optimal_rest_time=_calculate_optimal_rest_time(now, net_available),
        last_updated=now,
        daily_peak=max(current.daily_peak, net_available),
        daily_low=min(current.daily_low, net_available),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 분석
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EnergyAnalysis:
    """에너지 분석 결과"""
    status: str  # optimal, good, low, critical
    main_drains: List[DrainSource]
    automatable_amount: float
    recommendations: List[str]
    should_rest: bool
    should_activate_protection: bool


def analyze_energy_state(
    state: EnergyState,
    drains: List[DrainSource]
) -> EnergyAnalysis:
    """에너지 상태 분석"""
    net_energy = state.net_available_energy
    automatable_drains = get_automatable_drains(drains)
    automatable_amount = calculate_total_drain(automatable_drains)
    
    # 상태 결정
    if net_energy >= ENERGY_CONSTANTS['OPTIMAL_ENERGY_THRESHOLD']:
        status = 'optimal'
    elif net_energy >= ENERGY_CONSTANTS['LOW_ENERGY_THRESHOLD']:
        status = 'good'
    elif net_energy >= ENERGY_CONSTANTS['CRITICAL_ENERGY_THRESHOLD']:
        status = 'low'
    else:
        status = 'critical'
    
    # 주요 소모원 정렬
    main_drains = sorted(
        drains, 
        key=lambda d: d.base_amount * d.multiplier, 
        reverse=True
    )[:3]
    
    # 권장 사항 생성
    recommendations: List[str] = []
    
    if status == 'critical':
        recommendations.append('즉시 휴식이 필요합니다. 모든 비필수 활동을 중단하세요.')
    
    if automatable_amount > 0.1:
        recommendations.append(f'자동화로 {automatable_amount * 100:.0f}%의 에너지를 절약할 수 있습니다.')
    
    for drain in main_drains:
        if drain.can_automate:
            recommendations.append(f'"{drain.source}"를 자동화하면 에너지를 보존할 수 있습니다.')
    
    if state.burn_rate > 0.1:
        recommendations.append('에너지 소모율이 높습니다. 컨텍스트 스위칭을 줄이세요.')
    
    return EnergyAnalysis(
        status=status,
        main_drains=main_drains,
        automatable_amount=automatable_amount,
        recommendations=recommendations,
        should_rest=status in ('critical', 'low'),
        should_activate_protection=net_energy < ENERGY_CONSTANTS['LOW_ENERGY_THRESHOLD'],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 에너지 절약 기록
# ═══════════════════════════════════════════════════════════════════════════════

def create_energy_saved(
    agent_type: AgentType,
    action_id: str,
    drain: DrainSource,
    description: str
) -> EnergySaved:
    """에너지 절약 기록 생성"""
    if drain.type == 'physical':
        energy_type = 'physical'
    elif drain.type in ('emotional', 'social'):
        energy_type = 'emotional'
    else:
        energy_type = 'cognitive'
    
    return EnergySaved(
        id=f'saved_{datetime.now().timestamp()}',
        agent_type=agent_type,
        action_id=action_id,
        energy_type=energy_type,
        amount=drain.base_amount * drain.multiplier,
        timestamp=datetime.now(),
        description=description,
    )


def calculate_daily_energy_saved(saved: List[EnergySaved]) -> Dict:
    """일일 에너지 절약 합계"""
    by_type = {'cognitive': 0.0, 'emotional': 0.0, 'physical': 0.0}
    by_agent = {'financial': 0.0, 'decision': 0.0, 'social': 0.0, 'location': 0.0}
    
    for s in saved:
        by_type[s.energy_type] = by_type.get(s.energy_type, 0) + s.amount
        by_agent[s.agent_type] = by_agent.get(s.agent_type, 0) + s.amount
    
    total = sum(s.amount for s in saved)
    
    return {'total': total, 'by_type': by_type, 'by_agent': by_agent}
