#!/usr/bin/env python3
"""
AUTUS Decision Log
==================
삶의 모든 결정을 물리량으로 기록

핵심 원칙:
1. 모든 결정은 Before → Action → After (Decision Trinity)
2. 감정/의견 배제, 오직 벡터만 기록
3. 예측과 실제의 차이(ε)를 누적 학습
4. 삶의 근본 방정식: dS/dt = F - R - λH
"""

import time
import uuid
import json
import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# 기본 물리량 정의
# ═══════════════════════════════════════════════════════════════

@dataclass
class StateVector:
    """
    상태 벡터 S(t) = [Energy, Flow, Risk]
    
    - Energy: 자원 (시간, 돈, 건강, 관계) [0, 1]
    - Flow: 흐름/진행 속도 [0, 1]
    - Risk: 리스크/불확실성 [0, 1]
    """
    energy: float
    flow: float
    risk: float
    
    def __post_init__(self):
        # 범위 제한
        self.energy = max(0.0, min(1.0, self.energy))
        self.flow = max(0.0, min(1.0, self.flow))
        self.risk = max(0.0, min(1.0, self.risk))
    
    def to_list(self) -> List[float]:
        return [self.energy, self.flow, self.risk]
    
    def magnitude(self) -> float:
        """상태 벡터의 크기 (전체 상태 점수)"""
        # Energy와 Flow는 높을수록 좋고, Risk는 낮을수록 좋음
        return math.sqrt(self.energy**2 + self.flow**2 + (1-self.risk)**2) / math.sqrt(3)
    
    def __sub__(self, other: 'StateVector') -> 'StateVector':
        """두 상태의 차이 (Δ)"""
        return StateVector(
            energy=self.energy - other.energy,
            flow=self.flow - other.flow,
            risk=self.risk - other.risk
        )
    
    def __add__(self, other: 'StateVector') -> 'StateVector':
        return StateVector(
            energy=self.energy + other.energy,
            flow=self.flow + other.flow,
            risk=self.risk + other.risk
        )
    
    def to_dict(self) -> Dict:
        return {
            "energy": round(self.energy, 4),
            "flow": round(self.flow, 4),
            "risk": round(self.risk, 4),
            "magnitude": round(self.magnitude(), 4)
        }


class ActionType(Enum):
    """행동 유형 (힘의 방향)"""
    THROTTLE = "throttle"   # 가속 - 에너지 투입하여 전진
    DETOUR = "detour"       # 우회 - 저항 회피
    BRAKE = "brake"         # 감속 - 리스크 감소
    PAUSE = "pause"         # 정지 - 에너지 보존
    PIVOT = "pivot"         # 전환 - 방향 변경


@dataclass
class ForceVector:
    """
    힘 벡터 F = (type, magnitude, direction)
    
    - type: 행동 유형
    - magnitude: 힘의 크기 [0, 1]
    - direction: 방향 벡터 (Energy, Flow, Risk 방향)
    """
    action_type: ActionType
    magnitude: float
    direction: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    
    def __post_init__(self):
        self.magnitude = max(0.0, min(1.0, self.magnitude))
        
        # 기본 방향 설정 (행동 유형별)
        if self.direction == (0.0, 0.0, 0.0):
            self.direction = {
                ActionType.THROTTLE: (0.3, 0.6, 0.1),   # Flow 중심
                ActionType.DETOUR: (0.2, 0.3, -0.5),    # Risk 감소
                ActionType.BRAKE: (-0.1, -0.2, -0.7),   # Risk 대폭 감소
                ActionType.PAUSE: (0.1, -0.3, -0.2),    # 에너지 보존
                ActionType.PIVOT: (0.0, 0.0, 0.0),      # 방향 재설정
            }.get(self.action_type, (0.0, 0.0, 0.0))
    
    def apply_to_state(self, state: StateVector, resistance: float = 0.1) -> StateVector:
        """힘을 상태에 적용 → 새로운 상태"""
        effective = self.magnitude * (1 - resistance)
        
        return StateVector(
            energy=state.energy + self.direction[0] * effective,
            flow=state.flow + self.direction[1] * effective,
            risk=state.risk + self.direction[2] * effective
        )
    
    def to_dict(self) -> Dict:
        return {
            "type": self.action_type.value,
            "magnitude": round(self.magnitude, 4),
            "direction": [round(d, 4) for d in self.direction]
        }


@dataclass
class Intention:
    """
    의도 (목표 상태)
    - goal_state: 도달하고자 하는 상태
    - urgency: 긴급도 [0, 1]
    """
    goal_state: StateVector
    urgency: float = 0.5
    description: str = ""  # 선택적 메모 (물리량 아님)
    
    def distance_from(self, current: StateVector) -> float:
        """현재 상태에서 목표까지의 거리"""
        diff = self.goal_state - current
        return math.sqrt(diff.energy**2 + diff.flow**2 + diff.risk**2)
    
    def to_dict(self) -> Dict:
        return {
            "goal": self.goal_state.to_dict(),
            "urgency": round(self.urgency, 4),
            "distance": None  # 계산 시 채움
        }


# ═══════════════════════════════════════════════════════════════
# Decision Log (결정 기록)
# ═══════════════════════════════════════════════════════════════

@dataclass
class PhysicsMetrics:
    """물리 메트릭스 - 결정의 효율성 측정"""
    efficiency: float = 0.0        # 효율 (실제Δ / 예상Δ)
    resistance_actual: float = 0.0 # 실제 저항
    entropy_loss: float = 0.0      # 엔트로피 손실
    prediction_error: float = 0.0  # 예측 오차 (ε)
    
    def to_dict(self) -> Dict:
        return {
            "efficiency": round(self.efficiency, 4),
            "resistance": round(self.resistance_actual, 4),
            "entropy_loss": round(self.entropy_loss, 4),
            "prediction_error": round(self.prediction_error, 4)
        }


@dataclass
class DecisionLog:
    """
    결정 로그 - Decision Trinity
    
    ① BEFORE: 결정 전 상태
    ② ACTION: 선택한 행동 (힘)
    ③ AFTER: 결정 후 상태 + Δ + 물리 메트릭스
    """
    # 식별자
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: float = field(default_factory=time.time)
    
    # ① BEFORE
    state_before: Optional[StateVector] = None
    momentum: Optional[StateVector] = None  # 변화 추세
    intention: Optional[Intention] = None
    
    # ② ACTION
    action: Optional[ForceVector] = None
    context: Dict = field(default_factory=dict)  # 비물리적 컨텍스트 (최소화)
    
    # ③ AFTER
    state_after: Optional[StateVector] = None
    delta: Optional[StateVector] = None
    delta_t: float = 0.0  # 소요 시간 (초)
    
    # 물리 메트릭스
    physics: PhysicsMetrics = field(default_factory=PhysicsMetrics)
    
    # 예측값 (사전)
    predicted_delta: Optional[StateVector] = None
    
    def complete(self, state_after: StateVector, delta_t: float):
        """결정 완료 - AFTER 상태 기록 및 메트릭스 계산"""
        self.state_after = state_after
        self.delta_t = delta_t
        
        if self.state_before:
            self.delta = state_after - self.state_before
        
        # 물리 메트릭스 계산
        if self.predicted_delta and self.delta:
            pred_mag = math.sqrt(sum(x**2 for x in self.predicted_delta.to_list()))
            actual_mag = math.sqrt(sum(x**2 for x in self.delta.to_list()))
            
            if pred_mag > 0:
                self.physics.efficiency = actual_mag / pred_mag
            
            # 예측 오차
            error = self.delta - self.predicted_delta
            self.physics.prediction_error = math.sqrt(sum(x**2 for x in error.to_list()))
        
        # 엔트로피 손실 (시간에 비례)
        self.physics.entropy_loss = 0.001 * delta_t  # λ = 0.001
    
    def to_dict(self) -> Dict:
        return {
            "decision_id": self.decision_id,
            "ts": self.timestamp,
            "ts_human": datetime.fromtimestamp(self.timestamp).isoformat(),
            
            "before": {
                "state": self.state_before.to_dict() if self.state_before else None,
                "momentum": self.momentum.to_dict() if self.momentum else None
            },
            
            "intention": self.intention.to_dict() if self.intention else None,
            
            "action": self.action.to_dict() if self.action else None,
            
            "after": {
                "state": self.state_after.to_dict() if self.state_after else None,
                "delta": self.delta.to_dict() if self.delta else None,
                "delta_t": round(self.delta_t, 2)
            },
            
            "physics": self.physics.to_dict()
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════════
# Decision Engine (결정 엔진)
# ═══════════════════════════════════════════════════════════════

class LifePhysicsEngine:
    """
    삶의 물리 엔진
    
    - 상태 예측
    - 필요한 힘 계산
    - 결정 시뮬레이션
    """
    
    # 물리 상수
    ENTROPY_DECAY = 0.001  # λ: 초당 엔트로피 증가율
    BASE_RESISTANCE = 0.1  # 기본 저항
    
    def __init__(self):
        self.decision_history: List[DecisionLog] = []
        self.current_state = StateVector(0.5, 0.5, 0.5)
    
    def predict_state(
        self, 
        current: StateVector, 
        action: ForceVector, 
        delta_t: float,
        resistance: float = None
    ) -> StateVector:
        """
        상태 예측: dS/dt = F - R - λH
        
        Args:
            current: 현재 상태
            action: 적용할 힘
            delta_t: 시간 간격 (초)
            resistance: 저항 (없으면 기본값)
        
        Returns:
            예측 상태
        """
        if resistance is None:
            resistance = self.BASE_RESISTANCE
        
        # 힘 적용
        new_state = action.apply_to_state(current, resistance)
        
        # 엔트로피 손실 (Risk 자연 증가)
        entropy_loss = self.ENTROPY_DECAY * delta_t
        new_state.risk = min(1.0, new_state.risk + entropy_loss)
        
        return new_state
    
    def calculate_required_force(
        self,
        current: StateVector,
        goal: StateVector,
        max_time: float
    ) -> Tuple[ForceVector, float]:
        """
        필요한 힘 계산
        
        Args:
            current: 현재 상태
            goal: 목표 상태
            max_time: 최대 허용 시간 (초)
        
        Returns:
            (필요한 힘, 예상 도달 시간)
        """
        diff = goal - current
        distance = math.sqrt(sum(x**2 for x in diff.to_list()))
        
        # 필요한 힘 크기
        required_magnitude = distance / (max_time * (1 - self.BASE_RESISTANCE))
        required_magnitude = min(1.0, required_magnitude)
        
        # 방향
        if distance > 0:
            direction = (
                diff.energy / distance,
                diff.flow / distance,
                diff.risk / distance
            )
        else:
            direction = (0.0, 0.0, 0.0)
        
        # 행동 유형 결정
        if diff.flow > abs(diff.energy) and diff.flow > abs(diff.risk):
            action_type = ActionType.THROTTLE
        elif diff.risk < -0.1:
            action_type = ActionType.BRAKE
        elif diff.energy < -0.1:
            action_type = ActionType.PAUSE
        else:
            action_type = ActionType.DETOUR
        
        force = ForceVector(
            action_type=action_type,
            magnitude=required_magnitude,
            direction=direction
        )
        
        # 예상 도달 시간
        if required_magnitude > 0:
            eta = distance / (required_magnitude * (1 - self.BASE_RESISTANCE))
        else:
            eta = float('inf')
        
        return force, eta
    
    def can_reach_goal(
        self,
        current: StateVector,
        goal: StateVector,
        available_force: float,
        max_time: float
    ) -> Tuple[bool, str]:
        """
        AUTUS의 유일한 질문:
        "이 힘(Action)으로 저 상태(Goal)에 도달할 수 있는가?"
        """
        required_force, eta = self.calculate_required_force(current, goal, max_time)
        
        if available_force >= required_force.magnitude:
            return True, f"Proceed. ETA: {eta:.1f}s, Required force: {required_force.magnitude:.2f}"
        else:
            deficit = required_force.magnitude - available_force
            return False, f"Insufficient. Required: +{deficit:.2f} force OR reduce resistance"
    
    def start_decision(
        self,
        intention: Intention,
        action: ForceVector
    ) -> DecisionLog:
        """결정 시작 - BEFORE + ACTION 기록"""
        log = DecisionLog(
            state_before=StateVector(
                self.current_state.energy,
                self.current_state.flow,
                self.current_state.risk
            ),
            intention=intention,
            action=action
        )
        
        # 예측
        log.predicted_delta = self.predict_state(
            self.current_state, 
            action, 
            delta_t=3600  # 1시간 가정
        ) - self.current_state
        
        return log
    
    def complete_decision(
        self,
        log: DecisionLog,
        actual_state: StateVector,
        delta_t: float
    ) -> DecisionLog:
        """결정 완료 - AFTER 기록"""
        log.complete(actual_state, delta_t)
        
        # 현재 상태 업데이트
        self.current_state = actual_state
        
        # 히스토리 저장
        self.decision_history.append(log)
        
        return log
    
    def get_learning_summary(self) -> Dict:
        """학습 요약 - 예측 정확도 등"""
        if not self.decision_history:
            return {"decisions": 0, "avg_efficiency": 0, "avg_error": 0}
        
        efficiencies = [d.physics.efficiency for d in self.decision_history if d.physics.efficiency > 0]
        errors = [d.physics.prediction_error for d in self.decision_history]
        
        return {
            "decisions": len(self.decision_history),
            "avg_efficiency": sum(efficiencies) / len(efficiencies) if efficiencies else 0,
            "avg_error": sum(errors) / len(errors) if errors else 0,
            "total_entropy_loss": sum(d.physics.entropy_loss for d in self.decision_history)
        }


# ═══════════════════════════════════════════════════════════════
# CLI 테스트
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("🌌 AUTUS Life Physics Engine - Decision Log Test")
    print("=" * 70)
    
    engine = LifePhysicsEngine()
    engine.current_state = StateVector(energy=0.72, flow=0.45, risk=0.18)
    
    print(f"\n📍 Current State: {engine.current_state.to_dict()}")
    
    # 목표 설정
    goal = StateVector(energy=0.85, flow=0.75, risk=0.10)
    intention = Intention(goal_state=goal, urgency=0.8, description="Q1 매출 목표")
    
    print(f"🎯 Goal State: {goal.to_dict()}")
    print(f"📏 Distance to Goal: {intention.distance_from(engine.current_state):.4f}")
    
    # AUTUS의 질문
    print("\n" + "-" * 70)
    print("❓ AUTUS Question: Can you reach the goal with force=0.5?")
    can_reach, message = engine.can_reach_goal(
        engine.current_state, goal, 
        available_force=0.5, 
        max_time=86400  # 1일
    )
    print(f"   {'✅' if can_reach else '❌'} {message}")
    
    # 결정 시작
    print("\n" + "-" * 70)
    print("🚀 Starting Decision: THROTTLE (magnitude=0.7)")
    
    action = ForceVector(ActionType.THROTTLE, magnitude=0.7)
    log = engine.start_decision(intention, action)
    
    print(f"   Decision ID: {log.decision_id}")
    print(f"   Predicted Δ: {log.predicted_delta.to_dict() if log.predicted_delta else 'N/A'}")
    
    # 시뮬레이션: 3시간 후 결과
    import random
    simulated_state = StateVector(
        energy=0.78 + random.uniform(-0.02, 0.02),
        flow=0.58 + random.uniform(-0.03, 0.03),
        risk=0.14 + random.uniform(-0.01, 0.01)
    )
    
    log = engine.complete_decision(log, simulated_state, delta_t=10800)  # 3시간
    
    print("\n" + "-" * 70)
    print("✅ Decision Complete")
    print(f"\n{log.to_json()}")
    
    # 학습 요약
    print("\n" + "-" * 70)
    print("📊 Learning Summary")
    summary = engine.get_learning_summary()
    for k, v in summary.items():
        print(f"   {k}: {v:.4f}" if isinstance(v, float) else f"   {k}: {v}")
    
    print("\n" + "=" * 70)
    print("🌌 Life Physics: Every decision is a force vector in state space.")
    print("=" * 70)
