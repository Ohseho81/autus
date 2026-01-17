"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS K/I 물리 엔진
                    
    K-지수 (Karma): 개인/집단 고유 특성 (-1 ~ +1)
    I-지수 (Interaction): 노드 간 상호작용 (-1 ~ +1)
    
    설계자: 전지적 관점에서 모든 행동과 상호작용을 관측
    사용자: 결과만 경험, 법칙의 존재 모름
    
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Tuple, Optional, Callable
from datetime import datetime
import math
import json


# ═══════════════════════════════════════════════════════════════════════════════
# 행동/상호작용 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════

class ActionType(Enum):
    """K-지수에 영향을 주는 행동 유형"""
    # 양심적 행동 (+)
    PROMISE_KEPT = ("약속 이행", +0.3, 1.0)
    VOLUNTARY_HELP = ("자발적 도움", +0.4, 1.0)
    TRANSPARENT_COMM = ("투명한 소통", +0.2, 0.8)
    RESPONSIBILITY_ACCEPT = ("책임 수용", +0.3, 1.0)
    SACRIFICE_FOR_OTHER = ("타인 위한 희생", +0.5, 1.2)
    HONEST_FEEDBACK = ("정직한 피드백", +0.2, 0.9)
    ADMIT_MISTAKE = ("실수 인정", +0.3, 1.1)
    
    # 비양심적 행동 (-)
    PROMISE_BROKEN = ("약속 파기", -0.5, 1.2)
    FREE_RIDING = ("무임승차", -0.3, 1.1)
    DECEPTION = ("기만/거짓", -0.6, 1.5)
    RESPONSIBILITY_AVOID = ("책임 회피", -0.4, 1.3)
    BLAME_OTHERS = ("남 탓", -0.4, 1.2)
    MANIPULATION = ("조종/이용", -0.5, 1.4)
    BETRAYAL = ("배신", -0.8, 1.8)
    
    # 중립
    NEUTRAL = ("중립 행동", 0.0, 1.0)
    
    def __init__(self, description: str, score: float, weight: float):
        self.description = description
        self.score = score
        self.weight = weight


class InteractionType(Enum):
    """I-지수에 영향을 주는 상호작용 유형"""
    # 협력 (+)
    COOPERATION_SUCCESS = ("협력 성공", +0.4)
    CONFLICT_RESOLVED = ("갈등 해결", +0.3)
    MUTUAL_SUPPORT = ("상호 지원", +0.3)
    WIN_WIN = ("윈윈 결과", +0.5)
    TRUST_BUILT = ("신뢰 구축", +0.4)
    
    # 갈등 (-)
    COOPERATION_FAILED = ("협력 실패", -0.1)
    CONFLICT_STUCK = ("갈등 고착", -0.3)
    ONE_SIDED_SACRIFICE = ("일방적 희생", -0.2)
    BETRAYAL = ("배신", -0.7)
    ZERO_SUM = ("제로섬 경쟁", -0.2)
    COMMUNICATION_BREAKDOWN = ("소통 단절", -0.4)
    
    # 무관심
    NO_INTERACTION = ("무관심", -0.05)
    
    def __init__(self, description: str, score: float):
        self.description = description
        self.score = score


class PhaseState(Enum):
    """임계점 상태"""
    NORMAL = "정상"
    SYNERGY = "시너지 폭발"       # I > +0.7
    DESTRUCTIVE = "자멸 궤도"     # I < -0.7
    EXPLOSIVE = "폭발 성장"       # K > +0.9
    DANGEROUS = "위험 상태"       # K < -0.7
    CRITICAL = "임계점 접근"      # 경계선 근처


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ActionEvent:
    """행동 이벤트 기록"""
    node_id: str
    action_type: ActionType
    timestamp: datetime = field(default_factory=datetime.now)
    context: str = ""
    magnitude: float = 1.0  # 행동 강도 (0.1 ~ 2.0)
    
    @property
    def effective_score(self) -> float:
        return self.action_type.score * self.action_type.weight * self.magnitude


@dataclass
class InteractionEvent:
    """상호작용 이벤트 기록"""
    node_a: str
    node_b: str
    interaction_type: InteractionType
    timestamp: datetime = field(default_factory=datetime.now)
    context: str = ""
    magnitude: float = 1.0
    
    @property
    def pair_key(self) -> Tuple[str, str]:
        return tuple(sorted([self.node_a, self.node_b]))
    
    @property
    def effective_score(self) -> float:
        return self.interaction_type.score * self.magnitude


@dataclass
class NodeState:
    """노드 상태"""
    node_id: str
    k_index: float = 0.0
    k_history: List[Tuple[datetime, float]] = field(default_factory=list)
    action_history: List[ActionEvent] = field(default_factory=list)
    phase: PhaseState = PhaseState.NORMAL
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class InteractionState:
    """상호작용 상태"""
    node_a: str
    node_b: str
    i_index: float = 0.0
    i_history: List[Tuple[datetime, float]] = field(default_factory=list)
    interaction_history: List[InteractionEvent] = field(default_factory=list)
    phase: PhaseState = PhaseState.NORMAL
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    
    @property
    def pair_key(self) -> Tuple[str, str]:
        return tuple(sorted([self.node_a, self.node_b]))


# ═══════════════════════════════════════════════════════════════════════════════
# K-지수 물리 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class KarmaEngine:
    """
    K-지수 계산 엔진
    
    물리법칙:
    1. ΔK = α × (행동점수) × (1 - |K|)    # 극단값 저항
    2. K(t) = K(t-1) × λ + K_base × (1-λ)  # 시간 감쇠
    """
    
    def __init__(
        self,
        alpha: float = 0.05,      # 학습률
        decay_lambda: float = 0.995,  # 감쇠율 (하루 기준)
        k_base: float = 0.0,      # 기본값 (중립)
        history_limit: int = 1000  # 히스토리 제한
    ):
        self.alpha = alpha
        self.decay_lambda = decay_lambda
        self.k_base = k_base
        self.history_limit = history_limit
        
        self.nodes: Dict[str, NodeState] = {}
        self.event_log: List[ActionEvent] = []
    
    def get_or_create_node(self, node_id: str) -> NodeState:
        """노드 조회 또는 생성"""
        if node_id not in self.nodes:
            self.nodes[node_id] = NodeState(node_id=node_id)
        return self.nodes[node_id]
    
    def apply_action(self, event: ActionEvent) -> float:
        """
        행동 적용 → K-지수 변화
        
        ΔK = α × (행동점수) × (1 - |K|)
        """
        node = self.get_or_create_node(event.node_id)
        
        # 현재 K
        k_old = node.k_index
        
        # 극단값 저항 계수
        resistance = 1.0 - abs(k_old)
        
        # ΔK 계산
        delta_k = self.alpha * event.effective_score * resistance
        
        # 새 K (범위 제한)
        k_new = max(-1.0, min(1.0, k_old + delta_k))
        
        # 상태 업데이트
        node.k_index = k_new
        node.k_history.append((event.timestamp, k_new))
        node.action_history.append(event)
        node.last_updated = event.timestamp
        
        # 히스토리 제한
        if len(node.k_history) > self.history_limit:
            node.k_history = node.k_history[-self.history_limit:]
        if len(node.action_history) > self.history_limit:
            node.action_history = node.action_history[-self.history_limit:]
        
        # 이벤트 로그
        self.event_log.append(event)
        
        # 임계점 체크
        self._check_phase(node)
        
        return delta_k
    
    def apply_time_decay(self, node_id: str, days_elapsed: float = 1.0) -> float:
        """
        시간 감쇠 적용
        
        K(t) = K(t-1) × λ^days + K_base × (1 - λ^days)
        """
        node = self.get_or_create_node(node_id)
        
        k_old = node.k_index
        decay_factor = self.decay_lambda ** days_elapsed
        
        k_new = k_old * decay_factor + self.k_base * (1 - decay_factor)
        
        node.k_index = k_new
        node.last_updated = datetime.now()
        
        return k_new - k_old
    
    def _check_phase(self, node: NodeState):
        """임계점 상태 체크"""
        k = node.k_index
        
        if k > 0.9:
            node.phase = PhaseState.EXPLOSIVE
        elif k < -0.7:
            node.phase = PhaseState.DANGEROUS
        elif k > 0.7 or k < -0.5:
            node.phase = PhaseState.CRITICAL
        else:
            node.phase = PhaseState.NORMAL
    
    def get_k(self, node_id: str) -> float:
        """K-지수 조회"""
        if node_id in self.nodes:
            return self.nodes[node_id].k_index
        return self.k_base
    
    def get_phase(self, node_id: str) -> PhaseState:
        """임계점 상태 조회"""
        if node_id in self.nodes:
            return self.nodes[node_id].phase
        return PhaseState.NORMAL


# ═══════════════════════════════════════════════════════════════════════════════
# I-지수 물리 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class InteractionEngine:
    """
    I-지수 계산 엔진
    
    물리법칙:
    1. ΔI = β × (상호작용점수) × (K_a + K_b)/2 × (1 - |I|)
    2. 전파: I(a,c) += γ × I(a,b) × I(b,c)
    """
    
    def __init__(
        self,
        karma_engine: KarmaEngine,
        beta: float = 0.08,       # 학습률
        gamma: float = 0.1,       # 전파율
        decay_lambda: float = 0.99,  # 감쇠율
        i_base: float = 0.0,      # 기본값
        history_limit: int = 1000
    ):
        self.karma_engine = karma_engine
        self.beta = beta
        self.gamma = gamma
        self.decay_lambda = decay_lambda
        self.i_base = i_base
        self.history_limit = history_limit
        
        self.interactions: Dict[Tuple[str, str], InteractionState] = {}
        self.event_log: List[InteractionEvent] = []
    
    def _pair_key(self, node_a: str, node_b: str) -> Tuple[str, str]:
        return tuple(sorted([node_a, node_b]))
    
    def get_or_create_interaction(self, node_a: str, node_b: str) -> InteractionState:
        """상호작용 상태 조회 또는 생성"""
        key = self._pair_key(node_a, node_b)
        if key not in self.interactions:
            self.interactions[key] = InteractionState(
                node_a=key[0], 
                node_b=key[1]
            )
        return self.interactions[key]
    
    def apply_interaction(self, event: InteractionEvent) -> float:
        """
        상호작용 적용 → I-지수 변화
        
        ΔI = β × (상호작용점수) × (K_a + K_b)/2 × (1 - |I|)
        """
        state = self.get_or_create_interaction(event.node_a, event.node_b)
        
        # 현재 I
        i_old = state.i_index
        
        # 양측 K-지수 평균 (K가 높을수록 상호작용 영향 큼)
        k_a = self.karma_engine.get_k(event.node_a)
        k_b = self.karma_engine.get_k(event.node_b)
        k_factor = (k_a + k_b) / 2
        
        # K가 음수면 상호작용 효과 감소 (불신)
        # K가 양수면 상호작용 효과 증가 (신뢰)
        k_multiplier = 1.0 + k_factor * 0.5  # 0.5 ~ 1.5
        
        # 극단값 저항
        resistance = 1.0 - abs(i_old)
        
        # ΔI 계산
        delta_i = self.beta * event.effective_score * k_multiplier * resistance
        
        # 새 I (범위 제한)
        i_new = max(-1.0, min(1.0, i_old + delta_i))
        
        # 상태 업데이트
        state.i_index = i_new
        state.i_history.append((event.timestamp, i_new))
        state.interaction_history.append(event)
        state.last_updated = event.timestamp
        
        # 히스토리 제한
        if len(state.i_history) > self.history_limit:
            state.i_history = state.i_history[-self.history_limit:]
        if len(state.interaction_history) > self.history_limit:
            state.interaction_history = state.interaction_history[-self.history_limit:]
        
        # 이벤트 로그
        self.event_log.append(event)
        
        # 임계점 체크
        self._check_phase(state)
        
        # 네트워크 전파
        self._propagate(event.node_a, event.node_b)
        
        return delta_i
    
    def _propagate(self, node_a: str, node_b: str):
        """
        네트워크 전파 효과
        
        I(a,c) += γ × I(a,b) × I(b,c)
        
        a-b 상호작용이 발생하면, a와 b의 다른 연결에도 영향
        """
        i_ab = self.get_i(node_a, node_b)
        
        # node_a의 다른 연결들
        for key, state in self.interactions.items():
            if node_a in key and node_b not in key:
                node_c = key[0] if key[1] == node_a else key[1]
                i_bc = self.get_i(node_b, node_c)
                
                if i_bc != 0:
                    # 전파 효과
                    delta = self.gamma * i_ab * i_bc
                    state_ac = self.get_or_create_interaction(node_a, node_c)
                    state_ac.i_index = max(-1.0, min(1.0, state_ac.i_index + delta))
        
        # node_b의 다른 연결들
        for key, state in self.interactions.items():
            if node_b in key and node_a not in key:
                node_c = key[0] if key[1] == node_b else key[1]
                i_ac = self.get_i(node_a, node_c)
                
                if i_ac != 0:
                    delta = self.gamma * i_ab * i_ac
                    state_bc = self.get_or_create_interaction(node_b, node_c)
                    state_bc.i_index = max(-1.0, min(1.0, state_bc.i_index + delta))
    
    def _check_phase(self, state: InteractionState):
        """임계점 상태 체크"""
        i = state.i_index
        
        if i > 0.7:
            state.phase = PhaseState.SYNERGY
        elif i < -0.7:
            state.phase = PhaseState.DESTRUCTIVE
        elif i > 0.5 or i < -0.5:
            state.phase = PhaseState.CRITICAL
        else:
            state.phase = PhaseState.NORMAL
    
    def get_i(self, node_a: str, node_b: str) -> float:
        """I-지수 조회"""
        key = self._pair_key(node_a, node_b)
        if key in self.interactions:
            return self.interactions[key].i_index
        return self.i_base
    
    def get_phase(self, node_a: str, node_b: str) -> PhaseState:
        """임계점 상태 조회"""
        key = self._pair_key(node_a, node_b)
        if key in self.interactions:
            return self.interactions[key].phase
        return PhaseState.NORMAL


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 K/I 물리 시스템
# ═══════════════════════════════════════════════════════════════════════════════

class KIPhysicsSystem:
    """
    K/I 물리 시스템 통합 인터페이스
    
    설계자만 접근 가능
    """
    
    def __init__(self, master_key: str = None):
        # 인증 (Genesis 키)
        self._authenticated = master_key is not None
        
        # 엔진 초기화
        self.karma_engine = KarmaEngine()
        self.interaction_engine = InteractionEngine(self.karma_engine)
        
        # 콜백
        self._phase_callbacks: List[Callable] = []
    
    # ─────────────────────────────────────────────────────────────────────────
    # K-지수 API
    # ─────────────────────────────────────────────────────────────────────────
    
    def record_action(
        self,
        node_id: str,
        action: ActionType,
        context: str = "",
        magnitude: float = 1.0
    ) -> Dict:
        """행동 기록 → K-지수 변화"""
        event = ActionEvent(
            node_id=node_id,
            action_type=action,
            context=context,
            magnitude=magnitude
        )
        
        k_before = self.karma_engine.get_k(node_id)
        delta = self.karma_engine.apply_action(event)
        k_after = self.karma_engine.get_k(node_id)
        phase = self.karma_engine.get_phase(node_id)
        
        result = {
            'node_id': node_id,
            'action': action.description,
            'k_before': round(k_before, 4),
            'k_after': round(k_after, 4),
            'delta_k': round(delta, 4),
            'phase': phase.value
        }
        
        # 임계점 콜백
        if phase in [PhaseState.EXPLOSIVE, PhaseState.DANGEROUS]:
            self._trigger_phase_callback('K', node_id, phase, k_after)
        
        return result
    
    def get_k(self, node_id: str) -> float:
        """K-지수 조회"""
        return round(self.karma_engine.get_k(node_id), 4)
    
    # ─────────────────────────────────────────────────────────────────────────
    # I-지수 API
    # ─────────────────────────────────────────────────────────────────────────
    
    def record_interaction(
        self,
        node_a: str,
        node_b: str,
        interaction: InteractionType,
        context: str = "",
        magnitude: float = 1.0
    ) -> Dict:
        """상호작용 기록 → I-지수 변화"""
        event = InteractionEvent(
            node_a=node_a,
            node_b=node_b,
            interaction_type=interaction,
            context=context,
            magnitude=magnitude
        )
        
        i_before = self.interaction_engine.get_i(node_a, node_b)
        delta = self.interaction_engine.apply_interaction(event)
        i_after = self.interaction_engine.get_i(node_a, node_b)
        phase = self.interaction_engine.get_phase(node_a, node_b)
        
        result = {
            'nodes': [node_a, node_b],
            'interaction': interaction.description,
            'i_before': round(i_before, 4),
            'i_after': round(i_after, 4),
            'delta_i': round(delta, 4),
            'phase': phase.value
        }
        
        # 임계점 콜백
        if phase in [PhaseState.SYNERGY, PhaseState.DESTRUCTIVE]:
            self._trigger_phase_callback('I', (node_a, node_b), phase, i_after)
        
        return result
    
    def get_i(self, node_a: str, node_b: str) -> float:
        """I-지수 조회"""
        return round(self.interaction_engine.get_i(node_a, node_b), 4)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 분석 API
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_node_status(self, node_id: str) -> Dict:
        """노드 전체 상태"""
        node = self.karma_engine.get_or_create_node(node_id)
        
        # 이 노드의 모든 상호작용
        interactions = []
        for key, state in self.interaction_engine.interactions.items():
            if node_id in key:
                other = key[0] if key[1] == node_id else key[1]
                interactions.append({
                    'with': other,
                    'i_index': round(state.i_index, 4),
                    'phase': state.phase.value
                })
        
        return {
            'node_id': node_id,
            'k_index': round(node.k_index, 4),
            'k_phase': node.phase.value,
            'action_count': len(node.action_history),
            'interactions': interactions,
            'last_updated': node.last_updated.isoformat()
        }
    
    def find_anomalies(self) -> Dict[str, List]:
        """이상 징후 탐지"""
        anomalies = {
            'explosive': [],      # K > 0.9
            'dangerous': [],      # K < -0.7
            'synergy': [],        # I > 0.7
            'destructive': []     # I < -0.7
        }
        
        # K 이상
        for node_id, node in self.karma_engine.nodes.items():
            if node.k_index > 0.9:
                anomalies['explosive'].append({
                    'node': node_id,
                    'k': round(node.k_index, 4)
                })
            elif node.k_index < -0.7:
                anomalies['dangerous'].append({
                    'node': node_id,
                    'k': round(node.k_index, 4)
                })
        
        # I 이상
        for key, state in self.interaction_engine.interactions.items():
            if state.i_index > 0.7:
                anomalies['synergy'].append({
                    'nodes': list(key),
                    'i': round(state.i_index, 4)
                })
            elif state.i_index < -0.7:
                anomalies['destructive'].append({
                    'nodes': list(key),
                    'i': round(state.i_index, 4)
                })
        
        return anomalies
    
    def predict_trajectory(self, node_id: str, days: int = 30) -> Dict:
        """궤적 예측"""
        node = self.karma_engine.get_or_create_node(node_id)
        k = node.k_index
        
        # 최근 추세 계산
        if len(node.k_history) >= 2:
            recent = node.k_history[-10:]
            k_values = [h[1] for h in recent]
            trend = (k_values[-1] - k_values[0]) / len(k_values) if len(k_values) > 1 else 0
        else:
            trend = 0
        
        # 미래 K 예측 (현재 추세 유지 가정)
        predictions = []
        k_pred = k
        for day in range(1, days + 1):
            # 감쇠 + 추세
            k_pred = k_pred * self.karma_engine.decay_lambda + trend
            k_pred = max(-1.0, min(1.0, k_pred))
            predictions.append({
                'day': day,
                'k_predicted': round(k_pred, 4)
            })
        
        # 임계점 도달 예측
        eta_explosive = None
        eta_dangerous = None
        
        for p in predictions:
            if p['k_predicted'] > 0.9 and eta_explosive is None:
                eta_explosive = p['day']
            if p['k_predicted'] < -0.7 and eta_dangerous is None:
                eta_dangerous = p['day']
        
        return {
            'node_id': node_id,
            'current_k': round(k, 4),
            'trend': round(trend, 6),
            'eta_explosive': eta_explosive,
            'eta_dangerous': eta_dangerous,
            'predictions': predictions[:7]  # 1주일만 반환
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 콜백
    # ─────────────────────────────────────────────────────────────────────────
    
    def on_phase_change(self, callback: Callable):
        """임계점 도달 시 콜백 등록"""
        self._phase_callbacks.append(callback)
    
    def _trigger_phase_callback(self, index_type: str, target, phase: PhaseState, value: float):
        for cb in self._phase_callbacks:
            try:
                cb(index_type, target, phase, value)
            except:
                pass
    
    # ─────────────────────────────────────────────────────────────────────────
    # 직렬화
    # ─────────────────────────────────────────────────────────────────────────
    
    def export_state(self) -> Dict:
        """전체 상태 내보내기"""
        return {
            'nodes': {
                node_id: {
                    'k_index': round(node.k_index, 4),
                    'phase': node.phase.value,
                    'action_count': len(node.action_history)
                }
                for node_id, node in self.karma_engine.nodes.items()
            },
            'interactions': {
                f"{key[0]}-{key[1]}": {
                    'i_index': round(state.i_index, 4),
                    'phase': state.phase.value
                }
                for key, state in self.interaction_engine.interactions.items()
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CLI 인터페이스
# ═══════════════════════════════════════════════════════════════════════════════

def print_dashboard(system: KIPhysicsSystem):
    """대시보드 출력"""
    print("\n" + "═" * 70)
    print("                    K/I PHYSICS DASHBOARD")
    print("═" * 70)
    
    state = system.export_state()
    
    # 노드 테이블
    print("\n┌─ NODES (K-Index) ─────────────────────────────────────────────────┐")
    print(f"│ {'Node ID':<15} │ {'K-Index':>10} │ {'Phase':<15} │ {'Actions':>8} │")
    print("├─────────────────┼────────────┼─────────────────┼──────────┤")
    
    for node_id, data in state['nodes'].items():
        k = data['k_index']
        k_color = "🟢" if k > 0.5 else "🔴" if k < -0.5 else "🟡"
        print(f"│ {node_id:<15} │ {k_color}{k:>+8.4f} │ {data['phase']:<15} │ {data['action_count']:>8} │")
    
    print("└─────────────────┴────────────┴─────────────────┴──────────┘")
    
    # 상호작용 테이블
    print("\n┌─ INTERACTIONS (I-Index) ───────────────────────────────────────────┐")
    print(f"│ {'Pair':<25} │ {'I-Index':>10} │ {'Phase':<20} │")
    print("├───────────────────────────┼────────────┼──────────────────────┤")
    
    for pair, data in state['interactions'].items():
        i = data['i_index']
        i_color = "🟢" if i > 0.5 else "🔴" if i < -0.5 else "🟡"
        print(f"│ {pair:<25} │ {i_color}{i:>+8.4f} │ {data['phase']:<20} │")
    
    print("└───────────────────────────┴────────────┴──────────────────────┘")
    
    # 이상 징후
    anomalies = system.find_anomalies()
    has_anomaly = any(len(v) > 0 for v in anomalies.values())
    
    if has_anomaly:
        print("\n┌─ ⚠️  ANOMALIES ──────────────────────────────────────────────────────┐")
        for atype, items in anomalies.items():
            if items:
                print(f"│ {atype.upper()}: {items}")
        print("└──────────────────────────────────────────────────────────────────────┘")
    
    print()


def run_demo():
    """데모 실행"""
    print("\n🔬 K/I Physics Engine Demo\n")
    
    system = KIPhysicsSystem(master_key="genesis")
    
    # 콜백 등록
    def on_phase(index_type, target, phase, value):
        print(f"⚠️  ALERT: {index_type} {target} → {phase.value} ({value:.4f})")
    
    system.on_phase_change(on_phase)
    
    # 시나리오: User_A, User_B, Corp_X
    print("[ 시나리오 시작 ]\n")
    
    # 1. User_A: 좋은 행동들
    print("1️⃣  User_A: 좋은 행동들")
    print(system.record_action("User_A", ActionType.PROMISE_KEPT, "프로젝트 납기 준수"))
    print(system.record_action("User_A", ActionType.VOLUNTARY_HELP, "팀원 멘토링"))
    print(system.record_action("User_A", ActionType.TRANSPARENT_COMM, "이슈 공유"))
    print()
    
    # 2. User_B: 나쁜 행동들
    print("2️⃣  User_B: 나쁜 행동들")
    print(system.record_action("User_B", ActionType.PROMISE_BROKEN, "미팅 펑크"))
    print(system.record_action("User_B", ActionType.BLAME_OTHERS, "실패 남탓"))
    print(system.record_action("User_B", ActionType.DECEPTION, "보고서 조작"))
    print()
    
    # 3. Corp_X: 배신
    print("3️⃣  Corp_X: 극악 행동")
    print(system.record_action("Corp_X", ActionType.BETRAYAL, "파트너사 배신", magnitude=1.5))
    print(system.record_action("Corp_X", ActionType.MANIPULATION, "계약 조건 조작"))
    print()
    
    # 4. 상호작용
    print("4️⃣  상호작용")
    print(system.record_interaction("User_A", "User_B", InteractionType.COOPERATION_SUCCESS, "프로젝트 완료"))
    print(system.record_interaction("User_A", "Corp_X", InteractionType.BETRAYAL, "계약 파기"))
    print(system.record_interaction("User_B", "Corp_X", InteractionType.CONFLICT_STUCK, "협상 결렬"))
    print()
    
    # 5. 대시보드
    print_dashboard(system)
    
    # 6. 궤적 예측
    print("📈 User_A 궤적 예측:")
    pred = system.predict_trajectory("User_A")
    print(f"   현재 K: {pred['current_k']}, 추세: {pred['trend']}")
    print()
    
    print("📉 Corp_X 궤적 예측:")
    pred = system.predict_trajectory("Corp_X")
    print(f"   현재 K: {pred['current_k']}, 추세: {pred['trend']}")
    if pred['eta_dangerous']:
        print(f"   ⚠️  위험 임계점 도달 예상: {pred['eta_dangerous']}일 후")


if __name__ == "__main__":
    run_demo()
