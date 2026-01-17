"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS v4.0 완전한 라플라스 엔진
                    
    "모든 입자의 위치, 속도, 그리고 질량을 알면 미래를 안다"
    
    구성요소:
    ─────────
    1. 4차원 상태 벡터: (K, I, K̇, İ)
    2. 8가지 천체 타입: 관성/임계점/수명/주기
    3. 144 슬롯 관계 매트릭스
    4. 5단계 운영 루프: Discovery → Analysis → Redesign → Optimize → Eliminate
    5. 연쇄 붕괴 탐지 및 δ 주입
    
    인프라:
    ───────
    - Databricks: Lakehouse + MLflow + Unity Catalog
    - Confluent: 실시간 스트리밍 (Kafka)
    - Snowflake/BigQuery: BI + 쿼리
    
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Callable, Any
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import math
import json
import random


# ═══════════════════════════════════════════════════════════════════════════════
# 1. 핵심 상수
# ═══════════════════════════════════════════════════════════════════════════════

MAX_SLOTS = 144
HISTORY_LENGTH = 90
PREDICTION_HORIZON = 365


# ═══════════════════════════════════════════════════════════════════════════════
# 2. 8가지 천체 타입 (Entity Types)
# ═══════════════════════════════════════════════════════════════════════════════

class EntityType(Enum):
    """
    8가지 천체 타입
    
    각 타입은 고유한 물리 상수를 가진다:
    - inertia: 관성 (0~1, 높을수록 변화에 저항)
    - max_k_delta: K의 최대 일일 변화율
    - max_i_delta: I의 최대 일일 변화율
    - critical_k: 붕괴 임계 K값
    - lifespan_years: 예상 수명 (년)
    - cycle_tau_days: 5단계 루프 주기 (일)
    - key_slots: 핵심 관계 슬롯
    """
    
    INDIVIDUAL = (
        "개인",
        0.1,    # 관성: 낮음 (빠르게 변함)
        0.05,   # K 최대 변화: 5%/일
        0.08,   # I 최대 변화: 8%/일
        -0.5,   # 임계 K: -0.5
        80,     # 수명: 80년
        1,      # 루프 주기: 1일
        ["BOND", "MENTOR", "BLOOD"],
        "👤",
    )
    
    STARTUP = (
        "스타트업",
        0.15,
        0.10,   # 매우 빠름
        0.15,
        -0.3,   # 쉽게 죽음
        5,      # 평균 5년
        1,
        ["SUPPLIER", "CLIENT", "PEER"],
        "🚀",
    )
    
    SMB = (
        "중소기업",
        0.35,
        0.03,
        0.05,
        -0.4,
        20,
        7,      # 주간
        ["CLIENT", "SUPPLIER", "PEER"],
        "🏢",
    )
    
    ENTERPRISE = (
        "대기업",
        0.7,
        0.01,   # 느림
        0.02,
        -0.6,
        100,
        30,     # 월간
        ["ALLY", "RIVAL", "CLIENT"],
        "🏛️",
    )
    
    CITY = (
        "도시",
        0.85,
        0.005,
        0.01,
        -0.7,
        500,
        90,     # 분기
        ["ORIGIN", "ALLY", "PROSPECT"],
        "🌆",
    )
    
    NATION = (
        "국가",
        0.92,
        0.002,
        0.005,
        -0.8,
        300,
        365,    # 연간
        ["ALLY", "ADVERSARY", "RIVAL"],
        "🏴",
    )
    
    RELIGION = (
        "종교",
        0.95,
        0.001,
        0.002,
        -0.85,
        2000,
        365,
        ["DISCIPLE", "ORIGIN", "ADVERSARY"],
        "🕊️",
    )
    
    IDEOLOGY = (
        "이념",
        0.98,
        0.0005,  # 거의 안 변함
        0.001,
        -0.9,
        500,
        365,
        ["DISCIPLE", "ADVERSARY", "ALLY"],
        "💡",
    )
    
    def __init__(self, korean: str, inertia: float, max_k_delta: float,
                 max_i_delta: float, critical_k: float, lifespan_years: int,
                 cycle_tau_days: int, key_slots: List[str], emoji: str):
        self.korean = korean
        self.inertia = inertia
        self.max_k_delta = max_k_delta
        self.max_i_delta = max_i_delta
        self.critical_k = critical_k
        self.lifespan_years = lifespan_years
        self.cycle_tau_days = cycle_tau_days
        self.key_slots = key_slots
        self.emoji = emoji
    
    def apply_inertia(self, raw_delta: float) -> float:
        """관성 적용: 실제 변화율 = 원래 변화율 / (1 + 관성)"""
        return raw_delta / (1 + self.inertia)
    
    def clamp_k_delta(self, dk: float) -> float:
        """K 변화율 제한"""
        return max(-self.max_k_delta, min(self.max_k_delta, dk))
    
    def clamp_i_delta(self, di: float) -> float:
        """I 변화율 제한"""
        return max(-self.max_i_delta, min(self.max_i_delta, di))
    
    def is_critical(self, k: float) -> bool:
        """임계점 도달 여부"""
        return k <= self.critical_k


# ═══════════════════════════════════════════════════════════════════════════════
# 3. 타입 간 상호작용 계수
# ═══════════════════════════════════════════════════════════════════════════════

# 타입 A가 타입 B에게 미치는 영향력 계수
# INTERACTION_MATRIX[A][B] = A가 B에게 미치는 영향
INTERACTION_MATRIX = {
    "INDIVIDUAL": {
        "INDIVIDUAL": 1.0,
        "STARTUP": 0.8,
        "SMB": 0.3,
        "ENTERPRISE": 0.05,
        "CITY": 0.01,
        "NATION": 0.001,
        "RELIGION": 0.01,
        "IDEOLOGY": 0.005,
    },
    "STARTUP": {
        "INDIVIDUAL": 0.5,
        "STARTUP": 1.0,
        "SMB": 0.6,
        "ENTERPRISE": 0.2,
        "CITY": 0.05,
        "NATION": 0.01,
        "RELIGION": 0.02,
        "IDEOLOGY": 0.01,
    },
    "SMB": {
        "INDIVIDUAL": 0.3,
        "STARTUP": 0.5,
        "SMB": 1.0,
        "ENTERPRISE": 0.4,
        "CITY": 0.1,
        "NATION": 0.02,
        "RELIGION": 0.03,
        "IDEOLOGY": 0.02,
    },
    "ENTERPRISE": {
        "INDIVIDUAL": 0.1,
        "STARTUP": 0.3,
        "SMB": 0.5,
        "ENTERPRISE": 1.0,
        "CITY": 0.4,
        "NATION": 0.2,
        "RELIGION": 0.1,
        "IDEOLOGY": 0.1,
    },
    "CITY": {
        "INDIVIDUAL": 0.05,
        "STARTUP": 0.1,
        "SMB": 0.2,
        "ENTERPRISE": 0.4,
        "CITY": 1.0,
        "NATION": 0.5,
        "RELIGION": 0.3,
        "IDEOLOGY": 0.2,
    },
    "NATION": {
        "INDIVIDUAL": 0.02,
        "STARTUP": 0.05,
        "SMB": 0.1,
        "ENTERPRISE": 0.3,
        "CITY": 0.6,
        "NATION": 1.0,
        "RELIGION": 0.5,
        "IDEOLOGY": 0.4,
    },
    "RELIGION": {
        "INDIVIDUAL": 0.3,
        "STARTUP": 0.1,
        "SMB": 0.1,
        "ENTERPRISE": 0.2,
        "CITY": 0.3,
        "NATION": 0.4,
        "RELIGION": 1.0,
        "IDEOLOGY": 0.8,
    },
    "IDEOLOGY": {
        "INDIVIDUAL": 0.2,
        "STARTUP": 0.1,
        "SMB": 0.1,
        "ENTERPRISE": 0.15,
        "CITY": 0.2,
        "NATION": 0.5,
        "RELIGION": 0.6,
        "IDEOLOGY": 1.0,
    },
}


def get_interaction_coefficient(type_a: EntityType, type_b: EntityType) -> float:
    """A가 B에게 미치는 영향력 계수"""
    return INTERACTION_MATRIX.get(type_a.name, {}).get(type_b.name, 0.1)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. 4차원 상태 벡터 (타입 인식)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class StateVector4D:
    """4차원 상태 벡터 (타입 인식 버전)"""
    
    k: float = 0.0
    i: float = 0.0
    dk_dt: float = 0.0
    di_dt: float = 0.0
    d2k_dt2: float = 0.0
    d2i_dt2: float = 0.0
    
    entity_type: EntityType = EntityType.INDIVIDUAL
    timestamp: datetime = field(default_factory=datetime.now)
    confidence: float = 1.0
    
    # 엔트로피 (에너지 손실)
    omega: float = 0.0
    
    @property
    def effective_dk(self) -> float:
        """타입 관성 적용된 실제 K 변화율"""
        clamped = self.entity_type.clamp_k_delta(self.dk_dt)
        return self.entity_type.apply_inertia(clamped)
    
    @property
    def effective_di(self) -> float:
        """타입 관성 적용된 실제 I 변화율"""
        clamped = self.entity_type.clamp_i_delta(self.di_dt)
        return self.entity_type.apply_inertia(clamped)
    
    @property
    def is_critical(self) -> bool:
        """임계점 도달 여부"""
        return self.entity_type.is_critical(self.k)
    
    def predict(self, days: float) -> 'StateVector4D':
        """N일 후 상태 예측 (타입 물리 적용)"""
        
        # 관성 적용된 변화율
        dk = self.effective_dk
        di = self.effective_di
        
        # 위치 예측 (등가속도)
        k_future = self.k + dk * days + 0.5 * self.d2k_dt2 * days**2
        i_future = self.i + di * days + 0.5 * self.d2i_dt2 * days**2
        
        # 범위 제한
        k_future = max(-1.0, min(1.0, k_future))
        i_future = max(-1.0, min(1.0, i_future))
        
        # 신뢰도 감소 (타입별 차등)
        decay_rate = 0.99 - (self.entity_type.inertia * 0.04)
        conf_decay = decay_rate ** (days / 7)
        
        return StateVector4D(
            k=k_future,
            i=i_future,
            dk_dt=dk + self.d2k_dt2 * days,
            di_dt=di + self.d2i_dt2 * days,
            d2k_dt2=self.d2k_dt2,
            d2i_dt2=self.d2i_dt2,
            entity_type=self.entity_type,
            timestamp=self.timestamp + timedelta(days=days),
            confidence=self.confidence * conf_decay,
            omega=self.omega
        )
    
    def time_to_critical(self) -> Optional[float]:
        """임계점 도달 예상 시간 (일)"""
        if self.dk_dt >= 0:
            return None  # 개선 중이면 도달 안 함
        
        delta_k = self.entity_type.critical_k - self.k
        if delta_k >= 0:
            return 0  # 이미 임계점 이하
        
        dk = self.effective_dk
        if dk >= 0:
            return None
        
        days = delta_k / dk
        return days if days > 0 else None
    
    def to_dict(self) -> dict:
        return {
            'k': round(self.k, 6),
            'i': round(self.i, 6),
            'dk_dt': round(self.dk_dt, 6),
            'di_dt': round(self.di_dt, 6),
            'effective_dk': round(self.effective_dk, 6),
            'effective_di': round(self.effective_di, 6),
            'entity_type': self.entity_type.name,
            'inertia': self.entity_type.inertia,
            'is_critical': self.is_critical,
            'omega': round(self.omega, 4),
            'timestamp': self.timestamp.isoformat(),
            'confidence': round(self.confidence, 4),
        }
    
    def __repr__(self):
        emoji = self.entity_type.emoji
        return f"{emoji} State(K={self.k:+.3f}, I={self.i:+.3f}, K̇={self.effective_dk:+.4f}/day)"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. 관계 유형 (12가지)
# ═══════════════════════════════════════════════════════════════════════════════

class RelationType(Enum):
    ORIGIN = ("기원", 0.55, "🌱")
    BLOOD = ("혈연", 0.75, "🩸")
    BOND = ("유대", 0.80, "💎")
    MENTOR = ("스승", 0.60, "🎓")
    DISCIPLE = ("제자", 0.50, "📚")
    PEER = ("동료", 0.50, "🤝")
    ALLY = ("동맹", 0.40, "⚔️")
    CLIENT = ("고객", 0.40, "👤")
    SUPPLIER = ("공급자", 0.40, "💰")
    RIVAL = ("경쟁자", 0.00, "🏁")
    ADVERSARY = ("적대자", -0.50, "⚡")
    PROSPECT = ("잠재", 0.10, "🔮")
    
    def __init__(self, korean: str, default_i: float, emoji: str):
        self.korean = korean
        self.default_i = default_i
        self.emoji = emoji


# ═══════════════════════════════════════════════════════════════════════════════
# 6. 5단계 운영 루프 (DAROE)
# ═══════════════════════════════════════════════════════════════════════════════

class LoopPhase(Enum):
    """5단계 운영 루프"""
    
    DISCOVERY = (
        1, "Discovery", "The Scribe", "질량 관측",
        "48노드 및 570개 업무의 초기 질량(M) 및 에너지 상태(E) 스캔",
        "📜"
    )
    
    ANALYSIS = (
        2, "Analysis", "The Demon", "궤적 판별",
        "K, I, Ω 상수를 통한 현재 궤도의 결정론적 미래 계산",
        "🔮"
    )
    
    REDESIGN = (
        3, "Redesign", "The Architect", "중력 보정",
        "비효율 노드를 방출하고 최적 궤도로 질량 재배치 및 자동화",
        "📐"
    )
    
    OPTIMIZE = (
        4, "Optimize", "The Tuner", "미세 조정",
        "실시간 피드백 루프를 통한 상수 미세 조정 및 I-지수 증폭",
        "🎛️"
    )
    
    ELIMINATE = (
        5, "Eliminate", "The Reaper", "자연 소멸",
        "임계치 미달 노드의 중력을 0으로 수렴시켜 시스템에서 영구 격리",
        "💀"
    )
    
    def __init__(self, order: int, name: str, agent: str, 
                 meaning: str, description: str, emoji: str):
        self.order = order
        self.phase_name = name
        self.agent = agent
        self.meaning = meaning
        self.description = description
        self.emoji = emoji


@dataclass
class LoopExecution:
    """루프 실행 기록"""
    entity_id: str
    phase: LoopPhase
    started_at: datetime
    completed_at: Optional[datetime] = None
    input_state: Optional[StateVector4D] = None
    output_state: Optional[StateVector4D] = None
    actions_taken: List[str] = field(default_factory=list)
    delta_injected: float = 0.0
    success: bool = True
    error_message: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# 7. 5단계 에이전트
# ═══════════════════════════════════════════════════════════════════════════════

class BaseAgent(ABC):
    """에이전트 기본 클래스"""
    
    def __init__(self, phase: LoopPhase):
        self.phase = phase
        self.name = phase.agent
    
    @abstractmethod
    def execute(self, entity: 'LaplaceEntity') -> LoopExecution:
        pass


class TheScribe(BaseAgent):
    """1단계: Discovery - 질량 관측"""
    
    def __init__(self):
        super().__init__(LoopPhase.DISCOVERY)
    
    def execute(self, entity: 'LaplaceEntity') -> LoopExecution:
        execution = LoopExecution(
            entity_id=entity.entity_id,
            phase=self.phase,
            started_at=datetime.now(),
            input_state=entity.current_state
        )
        
        # 48노드 스캔 (시뮬레이션)
        actions = []
        actions.append(f"Scanning 48 nodes for {entity.entity_name}")
        actions.append(f"Current mass (K): {entity.current_state.k:+.4f}")
        actions.append(f"Current orbit (I): {entity.current_state.i:+.4f}")
        actions.append(f"Entity type: {entity.entity_type.korean} (inertia: {entity.entity_type.inertia})")
        
        # 144 슬롯 스캔
        filled = sum(1 for s in entity.slots.values() if s.get('target_id'))
        actions.append(f"Slot fill rate: {filled}/144 ({filled/144*100:.1f}%)")
        
        execution.actions_taken = actions
        execution.completed_at = datetime.now()
        execution.output_state = entity.current_state
        
        return execution


class TheDemon(BaseAgent):
    """2단계: Analysis - 궤적 판별 (라플라스의 악마)"""
    
    def __init__(self):
        super().__init__(LoopPhase.ANALYSIS)
    
    def execute(self, entity: 'LaplaceEntity') -> LoopExecution:
        execution = LoopExecution(
            entity_id=entity.entity_id,
            phase=self.phase,
            started_at=datetime.now(),
            input_state=entity.current_state
        )
        
        state = entity.current_state
        actions = []
        
        # 궤적 계산
        pred_30 = state.predict(30)
        pred_90 = state.predict(90)
        pred_365 = state.predict(365)
        
        actions.append(f"30-day prediction: K={pred_30.k:+.4f}, I={pred_30.i:+.4f} (conf: {pred_30.confidence:.1%})")
        actions.append(f"90-day prediction: K={pred_90.k:+.4f}, I={pred_90.i:+.4f} (conf: {pred_90.confidence:.1%})")
        actions.append(f"365-day prediction: K={pred_365.k:+.4f}, I={pred_365.i:+.4f} (conf: {pred_365.confidence:.1%})")
        
        # 임계점 분석
        time_to_critical = state.time_to_critical()
        if time_to_critical:
            actions.append(f"⚠️ CRITICAL: Will reach critical K ({entity.entity_type.critical_k}) in {time_to_critical:.0f} days")
        else:
            actions.append(f"✅ Trajectory stable: No critical point in sight")
        
        # 엔트로피 계산
        omega = abs(state.dk_dt) * (1 - abs(state.i)) * 0.5
        actions.append(f"Entropy (Ω): {omega:.4f}")
        
        execution.actions_taken = actions
        execution.completed_at = datetime.now()
        execution.output_state = pred_90
        
        return execution


class TheArchitect(BaseAgent):
    """3단계: Redesign - 중력 보정"""
    
    def __init__(self):
        super().__init__(LoopPhase.REDESIGN)
    
    def execute(self, entity: 'LaplaceEntity') -> LoopExecution:
        execution = LoopExecution(
            entity_id=entity.entity_id,
            phase=self.phase,
            started_at=datetime.now(),
            input_state=entity.current_state
        )
        
        state = entity.current_state
        actions = []
        
        # 약한 슬롯 식별
        weak_slots = []
        for key, slot in entity.slots.items():
            if slot.get('target_id') and slot.get('i', 0) < 0.3:
                weak_slots.append((key, slot))
        
        if weak_slots:
            actions.append(f"Found {len(weak_slots)} weak orbital relations")
            for key, slot in weak_slots[:3]:
                actions.append(f"  - {key}: I={slot.get('i', 0):+.3f} (candidate for eviction)")
        
        # 핵심 슬롯 체크
        key_slots = entity.entity_type.key_slots
        missing_key = []
        for slot_type in key_slots:
            filled = sum(1 for k, s in entity.slots.items() 
                        if k.startswith(slot_type) and s.get('target_id'))
            if filled < 3:
                missing_key.append(f"{slot_type} ({filled}/12)")
        
        if missing_key:
            actions.append(f"⚠️ Key slots underfilled: {', '.join(missing_key)}")
            actions.append(f"Recommendation: Prioritize {key_slots[0]} relationships")
        
        # 자동화 제안
        if state.omega > 0.3:
            actions.append(f"High entropy detected (Ω={state.omega:.3f})")
            actions.append(f"Recommendation: Automate repetitive K-draining tasks")
        
        execution.actions_taken = actions
        execution.completed_at = datetime.now()
        execution.output_state = state
        
        return execution


class TheTuner(BaseAgent):
    """4단계: Optimize - 미세 조정 (δ 주입)"""
    
    def __init__(self):
        super().__init__(LoopPhase.OPTIMIZE)
    
    def execute(self, entity: 'LaplaceEntity', delta: float = 0.0) -> LoopExecution:
        execution = LoopExecution(
            entity_id=entity.entity_id,
            phase=self.phase,
            started_at=datetime.now(),
            input_state=entity.current_state
        )
        
        state = entity.current_state
        actions = []
        
        # δ 주입
        if delta != 0:
            new_k = state.k + delta
            new_k = max(-1, min(1, new_k))
            actions.append(f"Injecting δ={delta:+.4f} to K")
            actions.append(f"K: {state.k:+.4f} → {new_k:+.4f}")
            
            # 새 상태 생성
            execution.output_state = StateVector4D(
                k=new_k,
                i=state.i,
                dk_dt=state.dk_dt,
                di_dt=state.di_dt,
                entity_type=entity.entity_type,
                timestamp=datetime.now()
            )
            execution.delta_injected = delta
        else:
            # 자동 최적화 제안
            if state.dk_dt < 0:
                suggested_delta = abs(state.dk_dt) * 10  # 10일치 보정
                actions.append(f"K declining at {state.dk_dt:+.4f}/day")
                actions.append(f"Suggested δ injection: {suggested_delta:+.4f}")
            else:
                actions.append(f"K improving at {state.dk_dt:+.4f}/day")
                actions.append(f"No δ injection needed")
            
            execution.output_state = state
        
        execution.actions_taken = actions
        execution.completed_at = datetime.now()
        
        return execution


class TheReaper(BaseAgent):
    """5단계: Eliminate - 자연 소멸"""
    
    def __init__(self):
        super().__init__(LoopPhase.ELIMINATE)
    
    def execute(self, entity: 'LaplaceEntity') -> LoopExecution:
        execution = LoopExecution(
            entity_id=entity.entity_id,
            phase=self.phase,
            started_at=datetime.now(),
            input_state=entity.current_state
        )
        
        state = entity.current_state
        actions = []
        
        # 임계점 체크
        if state.is_critical:
            actions.append(f"🔴 CRITICAL STATE: K={state.k:+.4f} below threshold {entity.entity_type.critical_k}")
            actions.append(f"Initiating resource recovery protocol...")
            
            # 슬롯 정리 (약한 관계 제거)
            removed = 0
            for key, slot in entity.slots.items():
                if slot.get('target_id') and slot.get('i', 0) < 0:
                    slot['target_id'] = None
                    slot['target_name'] = None
                    removed += 1
            
            actions.append(f"Removed {removed} negative orbital relations")
            actions.append(f"Entity marked for quarantine")
            execution.success = False
            execution.error_message = "Entity reached critical state"
        else:
            # 정상 상태
            actions.append(f"✅ K={state.k:+.4f} above critical threshold {entity.entity_type.critical_k}")
            actions.append(f"No elimination required")
            
            # 잠재적 위험 체크
            time_to_critical = state.time_to_critical()
            if time_to_critical and time_to_critical < 30:
                actions.append(f"⚠️ Warning: Critical in {time_to_critical:.0f} days if trend continues")
        
        execution.actions_taken = actions
        execution.completed_at = datetime.now()
        execution.output_state = state
        
        return execution


# ═══════════════════════════════════════════════════════════════════════════════
# 8. 라플라스 엔티티 (완전체)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LaplaceEntity:
    """완전한 라플라스 관측 대상"""
    
    entity_id: str
    entity_name: str = ""
    entity_type: EntityType = EntityType.INDIVIDUAL
    
    # 상태 히스토리
    state_history: List[StateVector4D] = field(default_factory=list)
    
    # 144 슬롯
    slots: Dict[str, Dict] = field(default_factory=dict)
    
    # 루프 실행 기록
    loop_history: List[LoopExecution] = field(default_factory=list)
    
    # 메타데이터
    created_at: datetime = field(default_factory=datetime.now)
    last_loop_at: Optional[datetime] = None
    
    def __post_init__(self):
        if not self.slots:
            self._init_slots()
    
    def _init_slots(self):
        for rel_type in RelationType:
            for i in range(12):
                key = f"{rel_type.name}_{i}"
                self.slots[key] = {
                    'type': rel_type.name,
                    'index': i,
                    'target_id': None,
                    'target_name': None,
                    'i': rel_type.default_i,
                }
    
    @property
    def current_state(self) -> StateVector4D:
        if self.state_history:
            return self.state_history[-1]
        return StateVector4D(entity_type=self.entity_type)
    
    def update_state(self, k: float, i: float):
        """상태 업데이트 (속도 자동 계산)"""
        now = datetime.now()
        
        dk_dt = 0.0
        di_dt = 0.0
        d2k_dt2 = 0.0
        d2i_dt2 = 0.0
        
        if self.state_history:
            prev = self.state_history[-1]
            dt = (now - prev.timestamp).total_seconds() / 86400
            if dt > 0:
                dk_dt = (k - prev.k) / dt
                di_dt = (i - prev.i) / dt
                d2k_dt2 = (dk_dt - prev.dk_dt) / dt if dt > 0 else 0
                d2i_dt2 = (di_dt - prev.di_dt) / dt if dt > 0 else 0
        
        # 엔트로피 계산
        omega = abs(dk_dt) * (1 - abs(i)) * 0.5
        
        state = StateVector4D(
            k=k, i=i,
            dk_dt=dk_dt, di_dt=di_dt,
            d2k_dt2=d2k_dt2, d2i_dt2=d2i_dt2,
            entity_type=self.entity_type,
            timestamp=now,
            omega=omega
        )
        
        self.state_history.append(state)
        
        # 히스토리 제한
        if len(self.state_history) > HISTORY_LENGTH:
            self.state_history = self.state_history[-HISTORY_LENGTH:]
        
        return state
    
    def fill_slot(self, rel_type: RelationType, target_id: str, 
                  target_name: str = "", initial_i: float = None):
        """슬롯 채우기"""
        for i in range(12):
            key = f"{rel_type.name}_{i}"
            if not self.slots[key]['target_id']:
                self.slots[key]['target_id'] = target_id
                self.slots[key]['target_name'] = target_name or target_id
                self.slots[key]['i'] = initial_i if initial_i is not None else rel_type.default_i
                return key
        return None
    
    def should_run_loop(self) -> bool:
        """루프 실행 필요 여부"""
        if not self.last_loop_at:
            return True
        
        days_since = (datetime.now() - self.last_loop_at).total_seconds() / 86400
        return days_since >= self.entity_type.cycle_tau_days
    
    def run_full_loop(self, delta: float = 0.0) -> List[LoopExecution]:
        """5단계 루프 전체 실행"""
        executions = []
        
        # 1. Discovery
        scribe = TheScribe()
        executions.append(scribe.execute(self))
        
        # 2. Analysis
        demon = TheDemon()
        executions.append(demon.execute(self))
        
        # 3. Redesign
        architect = TheArchitect()
        executions.append(architect.execute(self))
        
        # 4. Optimize
        tuner = TheTuner()
        executions.append(tuner.execute(self, delta))
        
        # 5. Eliminate
        reaper = TheReaper()
        executions.append(reaper.execute(self))
        
        self.loop_history.extend(executions)
        self.last_loop_at = datetime.now()
        
        return executions


# ═══════════════════════════════════════════════════════════════════════════════
# 9. 완전한 라플라스 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class CompleteLaplaceEngine:
    """
    완전한 라플라스의 악마 엔진
    
    - 8가지 타입
    - 4D 상태 벡터
    - 144 슬롯
    - 5단계 루프
    - 연쇄 붕괴 탐지
    """
    
    def __init__(self):
        self.entities: Dict[str, LaplaceEntity] = {}
        self.cascade_alerts: List[Dict] = []
        self.global_loop_count: int = 0
    
    def register(self, entity_id: str, name: str = "",
                 entity_type: EntityType = EntityType.INDIVIDUAL) -> LaplaceEntity:
        """개체 등록"""
        entity = LaplaceEntity(
            entity_id=entity_id,
            entity_name=name or entity_id,
            entity_type=entity_type
        )
        self.entities[entity_id] = entity
        return entity
    
    def update(self, entity_id: str, k: float, i: float = None):
        """개체 상태 업데이트"""
        if entity_id not in self.entities:
            return None
        
        entity = self.entities[entity_id]
        if i is None:
            # 슬롯에서 평균 I 계산
            filled = [s for s in entity.slots.values() if s['target_id']]
            i = sum(s['i'] for s in filled) / len(filled) if filled else 0
        
        entity.update_state(k, i)
        self._check_cascade(entity_id)
        
        return entity.current_state
    
    def _check_cascade(self, trigger_id: str):
        """연쇄 붕괴 체크"""
        trigger = self.entities.get(trigger_id)
        if not trigger or not trigger.current_state:
            return
        
        state = trigger.current_state
        
        # 급락 감지
        if state.dk_dt < -0.02:
            affected = []
            
            for slot in trigger.slots.values():
                target_id = slot.get('target_id')
                if target_id and target_id in self.entities:
                    target = self.entities[target_id]
                    
                    # 상호작용 계수
                    coef = get_interaction_coefficient(
                        trigger.entity_type, 
                        target.entity_type
                    )
                    
                    impact = state.dk_dt * coef * slot.get('i', 0)
                    
                    if abs(impact) > 0.001:
                        affected.append({
                            'entity_id': target_id,
                            'entity_type': target.entity_type.name,
                            'relation_i': slot.get('i', 0),
                            'interaction_coef': coef,
                            'estimated_impact': impact,
                        })
            
            if affected:
                self.cascade_alerts.append({
                    'trigger_id': trigger_id,
                    'trigger_type': trigger.entity_type.name,
                    'trigger_dk_dt': state.dk_dt,
                    'affected': affected,
                    'timestamp': datetime.now().isoformat(),
                })
    
    def run_all_loops(self) -> Dict:
        """모든 개체의 루프 실행"""
        results = []
        
        for entity_id, entity in self.entities.items():
            if entity.should_run_loop():
                executions = entity.run_full_loop()
                results.append({
                    'entity_id': entity_id,
                    'entity_type': entity.entity_type.name,
                    'phases_completed': len(executions),
                    'success': all(e.success for e in executions),
                })
        
        self.global_loop_count += 1
        
        return {
            'loop_number': self.global_loop_count,
            'entities_processed': len(results),
            'results': results,
            'cascade_alerts': len(self.cascade_alerts),
        }
    
    def global_state(self) -> Dict:
        """글로벌 상태"""
        if not self.entities:
            return {}
        
        by_type = {}
        for entity in self.entities.values():
            t = entity.entity_type.name
            if t not in by_type:
                by_type[t] = {'count': 0, 'avg_k': 0, 'critical': 0}
            by_type[t]['count'] += 1
            if entity.current_state:
                by_type[t]['avg_k'] += entity.current_state.k
                if entity.current_state.is_critical:
                    by_type[t]['critical'] += 1
        
        for t in by_type:
            if by_type[t]['count'] > 0:
                by_type[t]['avg_k'] /= by_type[t]['count']
        
        return {
            'total_entities': len(self.entities),
            'by_type': by_type,
            'cascade_alerts': len(self.cascade_alerts),
            'global_loop_count': self.global_loop_count,
        }
    
    def simulate_future(self, days: int = 90) -> Dict:
        """미래 시뮬레이션"""
        predictions = {}
        
        for entity_id, entity in self.entities.items():
            state = entity.current_state
            pred = state.predict(days)
            
            predictions[entity_id] = {
                'type': entity.entity_type.name,
                'type_emoji': entity.entity_type.emoji,
                'current_k': state.k,
                'predicted_k': pred.k,
                'current_i': state.i,
                'predicted_i': pred.i,
                'confidence': pred.confidence,
                'is_critical_now': state.is_critical,
                'is_critical_future': pred.is_critical,
                'time_to_critical': state.time_to_critical(),
            }
        
        return {
            'days': days,
            'predictions': predictions,
            'entities_at_risk': sum(
                1 for p in predictions.values() 
                if p['is_critical_future'] and not p['is_critical_now']
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 10. 데모
# ═══════════════════════════════════════════════════════════════════════════════

def run_complete_demo():
    """완전한 라플라스 엔진 데모"""
    
    print("""
═══════════════════════════════════════════════════════════════════════════════
            🔮 AUTUS v4.0 완전한 라플라스 엔진
            
    "모든 입자의 위치, 속도, 그리고 질량을 알면 미래를 안다"
═══════════════════════════════════════════════════════════════════════════════
    """)
    
    engine = CompleteLaplaceEngine()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 1. 다양한 타입의 개체 등록
    # ─────────────────────────────────────────────────────────────────────────
    
    print("1️⃣  다양한 타입의 개체 등록\n")
    
    # 개인
    seho = engine.register("SEHO", "세호", EntityType.INDIVIDUAL)
    print(f"   {seho.entity_type.emoji} {seho.entity_name} ({seho.entity_type.korean})")
    print(f"      관성: {seho.entity_type.inertia}, 루프 주기: {seho.entity_type.cycle_tau_days}일")
    
    # 스타트업
    startup = engine.register("AUTUS_INC", "AUTUS Inc.", EntityType.STARTUP)
    print(f"   {startup.entity_type.emoji} {startup.entity_name} ({startup.entity_type.korean})")
    print(f"      관성: {startup.entity_type.inertia}, 루프 주기: {startup.entity_type.cycle_tau_days}일")
    
    # 대기업
    bigcorp = engine.register("MEGACORP", "MegaCorp", EntityType.ENTERPRISE)
    print(f"   {bigcorp.entity_type.emoji} {bigcorp.entity_name} ({bigcorp.entity_type.korean})")
    print(f"      관성: {bigcorp.entity_type.inertia}, 루프 주기: {bigcorp.entity_type.cycle_tau_days}일")
    
    # 국가
    nation = engine.register("NATION_X", "Nation X", EntityType.NATION)
    print(f"   {nation.entity_type.emoji} {nation.entity_name} ({nation.entity_type.korean})")
    print(f"      관성: {nation.entity_type.inertia}, 루프 주기: {nation.entity_type.cycle_tau_days}일")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 2. 초기 상태 설정 및 관계 형성
    # ─────────────────────────────────────────────────────────────────────────
    
    print("\n2️⃣  초기 상태 및 관계\n")
    
    # 상태 시뮬레이션 (30일)
    random.seed(42)
    base_time = datetime.now() - timedelta(days=30)
    
    for day in range(30):
        # 세호: 성장 중
        k_seho = 0.3 + day * 0.01 + random.uniform(-0.02, 0.02)
        seho.state_history.append(StateVector4D(
            k=max(-1, min(1, k_seho)),
            i=0.5,
            dk_dt=0.01,
            di_dt=0.005,
            entity_type=EntityType.INDIVIDUAL,
            timestamp=base_time + timedelta(days=day)
        ))
        
        # 스타트업: 급성장
        k_startup = 0.2 + day * 0.02 + random.uniform(-0.05, 0.05)
        startup.state_history.append(StateVector4D(
            k=max(-1, min(1, k_startup)),
            i=0.4,
            dk_dt=0.02,
            di_dt=0.01,
            entity_type=EntityType.STARTUP,
            timestamp=base_time + timedelta(days=day)
        ))
        
        # 대기업: 느린 변화
        k_bigcorp = 0.7 + day * 0.001 + random.uniform(-0.005, 0.005)
        bigcorp.state_history.append(StateVector4D(
            k=max(-1, min(1, k_bigcorp)),
            i=0.6,
            dk_dt=0.001,
            di_dt=0.0005,
            entity_type=EntityType.ENTERPRISE,
            timestamp=base_time + timedelta(days=day)
        ))
        
        # 국가: 거의 안 변함
        k_nation = 0.8 + day * 0.0001 + random.uniform(-0.001, 0.001)
        nation.state_history.append(StateVector4D(
            k=max(-1, min(1, k_nation)),
            i=0.3,
            dk_dt=0.0001,
            di_dt=0.00005,
            entity_type=EntityType.NATION,
            timestamp=base_time + timedelta(days=day)
        ))
    
    # 관계 설정
    seho.fill_slot(RelationType.PEER, "AUTUS_INC", "AUTUS Inc.", 0.7)
    startup.fill_slot(RelationType.ORIGIN, "SEHO", "세호", 0.85)
    startup.fill_slot(RelationType.RIVAL, "MEGACORP", "MegaCorp", -0.2)
    bigcorp.fill_slot(RelationType.PROSPECT, "AUTUS_INC", "AUTUS Inc.", 0.3)
    
    for entity in [seho, startup, bigcorp, nation]:
        state = entity.current_state
        print(f"   {state}")
        print(f"      유효 K̇: {state.effective_dk:+.6f}/day (관성 {entity.entity_type.inertia} 적용)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 3. 5단계 루프 실행
    # ─────────────────────────────────────────────────────────────────────────
    
    print("\n3️⃣  5단계 루프 실행 (세호)\n")
    
    executions = seho.run_full_loop()
    
    for exe in executions:
        print(f"   {exe.phase.emoji} {exe.phase.phase_name} ({exe.phase.agent})")
        for action in exe.actions_taken[:3]:
            print(f"      → {action}")
        print()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 4. 타입별 예측 비교
    # ─────────────────────────────────────────────────────────────────────────
    
    print("\n4️⃣  타입별 90일 예측 비교\n")
    
    print("   ┌──────────────┬────────┬────────┬────────┬──────────┬──────────┐")
    print("   │ 개체         │ 타입   │ 현재 K │ 90일후 │ 유효 K̇  │ 신뢰도   │")
    print("   ├──────────────┼────────┼────────┼────────┼──────────┼──────────┤")
    
    for entity in [seho, startup, bigcorp, nation]:
        state = entity.current_state
        pred = state.predict(90)
        emoji = entity.entity_type.emoji
        print(f"   │ {emoji} {entity.entity_name[:10]:<10} │ {entity.entity_type.korean[:4]:<4} │ {state.k:+.3f}  │ {pred.k:+.3f}  │ {state.effective_dk:+.6f} │ {pred.confidence:>6.1%}   │")
    
    print("   └──────────────┴────────┴────────┴────────┴──────────┴──────────┘")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 5. 상호작용 계수
    # ─────────────────────────────────────────────────────────────────────────
    
    print("\n5️⃣  타입 간 상호작용 계수\n")
    
    print("   A → B 영향력:")
    print("   ┌────────────┬─────────┬─────────┬─────────┬─────────┐")
    print("   │ A \\ B      │ 개인    │ 스타트업│ 대기업  │ 국가    │")
    print("   ├────────────┼─────────┼─────────┼─────────┼─────────┤")
    
    types = [EntityType.INDIVIDUAL, EntityType.STARTUP, EntityType.ENTERPRISE, EntityType.NATION]
    for t_a in types:
        row = f"   │ {t_a.emoji} {t_a.korean[:4]:<4} │"
        for t_b in types:
            coef = get_interaction_coefficient(t_a, t_b)
            row += f" {coef:>5.2f}   │"
        print(row)
    
    print("   └────────────┴─────────┴─────────┴─────────┴─────────┘")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 6. 글로벌 상태
    # ─────────────────────────────────────────────────────────────────────────
    
    print("\n6️⃣  글로벌 상태\n")
    
    global_state = engine.global_state()
    print(f"   총 개체: {global_state['total_entities']}")
    print(f"   타입별 분포:")
    for t, stats in global_state['by_type'].items():
        type_obj = EntityType[t]
        print(f"      {type_obj.emoji} {type_obj.korean}: {stats['count']}개, 평균 K={stats['avg_k']:+.3f}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 7. 요약
    # ─────────────────────────────────────────────────────────────────────────
    
    print("""
═══════════════════════════════════════════════════════════════════════════════
                        🔮 완전한 라플라스 엔진 요약
═══════════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  4차원 상태 벡터: (K, I, K̇, İ)                                         │
  │  8가지 천체 타입: 개인/스타트업/중소기업/대기업/도시/국가/종교/이념     │
  │  144 슬롯 관계 매트릭스                                                 │
  │  5단계 운영 루프: Discovery → Analysis → Redesign → Optimize → Eliminate│
  │                                                                         │
  │  운동 방정식 (타입 적용):                                               │
  │  ─────────────────────────                                              │
  │  K(t) = K₀ + (K̇ / (1 + 관성)) × t + ½ × K̈ × t²                        │
  │                                                                         │
  │  타입별 물리 상수:                                                      │
  │  ┌──────────┬────────┬──────────┬──────────┬──────────┐                │
  │  │ 타입     │ 관성   │ K변화/일 │ 임계 K   │ 루프주기 │                │
  │  ├──────────┼────────┼──────────┼──────────┼──────────┤                │
  │  │ 👤 개인  │ 0.10   │ ±5%      │ -0.50    │ 1일      │                │
  │  │ 🚀 스타트업│ 0.15   │ ±10%     │ -0.30    │ 1일      │                │
  │  │ 🏛️ 대기업 │ 0.70   │ ±1%      │ -0.60    │ 30일     │                │
  │  │ 🏴 국가  │ 0.92   │ ±0.2%    │ -0.80    │ 365일    │                │
  │  └──────────┴────────┴──────────┴──────────┴──────────┘                │
  │                                                                         │
  │  5단계 에이전트:                                                        │
  │  📜 The Scribe    (Discovery)  - 질량 관측                             │
  │  🔮 The Demon     (Analysis)   - 궤적 판별                             │
  │  📐 The Architect (Redesign)   - 중력 보정                             │
  │  🎛️ The Tuner     (Optimize)   - 미세 조정                             │
  │  💀 The Reaper    (Eliminate)  - 자연 소멸                             │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    run_complete_demo()
