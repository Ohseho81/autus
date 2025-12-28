"""
AUTUS Physics Model - 물리 모델 정의

## 6 Gauges 정의

1. Stability (안정성) [0-1]
   - 현재 상태의 안정도
   - 높을수록: 예측 가능, 일관성 있음
   - 낮을수록: 불확실, 변화 가능성 높음

2. Pressure (압력) [0-1]
   - 외부/내부 압박 정도
   - 높을수록: 변화 필요성, 긴장 상태
   - 낮을수록: 여유, 완화 상태

3. Drag (저항) [0-1]
   - 진행에 대한 저항
   - 높을수록: 진행 어려움, 마찰 큼
   - 낮을수록: 순조로운 진행

4. Momentum (모멘텀) [0-1]
   - 진행 추진력
   - 높을수록: 빠른 진행, 가속
   - 낮을수록: 느린 진행, 정체

5. Volatility (변동성) [0-1]
   - 상태 변화의 불확실성
   - 높을수록: 급격한 변화 가능
   - 낮을수록: 점진적 변화

6. Recovery (회복력) [0-1]
   - 이탈 후 복귀 능력
   - 높을수록: 빠른 회복, 탄성
   - 낮을수록: 느린 회복, 취약

## 상호작용 규칙

- Stability ↔ Volatility: 반비례 (안정 ↔ 변동)
- Momentum ↔ Drag: 반비례 (추진 ↔ 저항)
- Pressure → Volatility: 압력 증가 → 변동성 증가 유발
- Recovery → Stability: 회복력이 안정성 복구 지원

## Action 효과

Hold (유지):
  - Stability +Δ (안정화)
  - Pressure -Δ (압력 해소)
  - Momentum -Δ/2 (추진력 감소)
  - Volatility 자연 감소

Push (가속):
  - Momentum +Δ (추진력 증가)
  - Pressure +Δ/2 (압력 축적)
  - Stability -Δ/2 (불안정화)
  - Drag 소비됨

Drift (흐름):
  - Recovery +Δ (회복력 축적)
  - Volatility -Δ/2 (변동성 감소)
  - Pressure -Δ/2 (압력 자연 해소)
  - Drag +Δ/3 (약간 축적)

## 자연 감쇄 (매 틱)

- Pressure: -0.005 (압력은 자연히 해소)
- Volatility: -0.003 (변동성 자연 감소)
- Recovery: -0.002 (미사용시 회복력 감소)
"""

from dataclasses import dataclass
from typing import Literal

ActionType = Literal["hold", "push", "drift"]


@dataclass
class PhysicsConfig:
    """물리 계수 설정"""
    
    # Action 기본 delta
    action_delta: float = 0.04
    
    # 자연 감쇄율 (per tick)
    decay_pressure: float = 0.005
    decay_volatility: float = 0.003
    decay_recovery: float = 0.002
    
    # 상호작용 계수
    pressure_to_volatility: float = 0.15  # 압력 → 변동성 전이율
    recovery_to_stability: float = 0.10   # 회복력 → 안정성 지원율
    
    # Route 진행 임계값
    momentum_threshold: float = 0.60  # 이 이상이면 다음 스테이션으로
    drag_block_threshold: float = 0.70  # 이 이상이면 진행 정체
    
    # Clamp 범위
    min_gauge: float = 0.05
    max_gauge: float = 0.95


CONFIG = PhysicsConfig()


def clamp(value: float, min_v: float = None, max_v: float = None) -> float:
    """값을 범위 내로 제한"""
    min_v = min_v if min_v is not None else CONFIG.min_gauge
    max_v = max_v if max_v is not None else CONFIG.max_gauge
    return max(min_v, min(max_v, value))


def apply_action_effects(
    stability: float,
    pressure: float,
    drag: float,
    momentum: float,
    volatility: float,
    recovery: float,
    action: ActionType,
) -> tuple[float, float, float, float, float, float]:
    """
    Action 효과 적용
    Returns: (stability, pressure, drag, momentum, volatility, recovery)
    """
    Δ = CONFIG.action_delta
    
    if action == "hold":
        # Hold: 안정화, 압력 해소, 모멘텀 감소
        stability = clamp(stability + Δ)
        pressure = clamp(pressure - Δ)
        momentum = clamp(momentum - Δ * 0.5)
        volatility = clamp(volatility - Δ * 0.3)
        
    elif action == "push":
        # Push: 가속, 압력 축적, 불안정화
        momentum = clamp(momentum + Δ)
        pressure = clamp(pressure + Δ * 0.5)
        stability = clamp(stability - Δ * 0.5)
        drag = clamp(drag - Δ * 0.3)  # 추진으로 저항 극복
        volatility = clamp(volatility + Δ * 0.2)
        
    elif action == "drift":
        # Drift: 회복, 변동성 감소, 압력 자연 해소
        recovery = clamp(recovery + Δ)
        volatility = clamp(volatility - Δ * 0.5)
        pressure = clamp(pressure - Δ * 0.5)
        drag = clamp(drag + Δ * 0.3)  # 드리프트 중 저항 약간 축적
        
    return stability, pressure, drag, momentum, volatility, recovery


def apply_natural_decay(
    stability: float,
    pressure: float,
    drag: float,
    momentum: float,
    volatility: float,
    recovery: float,
) -> tuple[float, float, float, float, float, float]:
    """
    자연 감쇄 적용 (매 틱)
    """
    pressure = clamp(pressure - CONFIG.decay_pressure)
    volatility = clamp(volatility - CONFIG.decay_volatility)
    recovery = clamp(recovery - CONFIG.decay_recovery)
    
    return stability, pressure, drag, momentum, volatility, recovery


def apply_interactions(
    stability: float,
    pressure: float,
    drag: float,
    momentum: float,
    volatility: float,
    recovery: float,
) -> tuple[float, float, float, float, float, float]:
    """
    게이지 간 상호작용 적용
    """
    # 압력 → 변동성 전이
    if pressure > 0.5:
        overflow = (pressure - 0.5) * CONFIG.pressure_to_volatility
        volatility = clamp(volatility + overflow)
    
    # 회복력 → 안정성 지원
    if recovery > 0.5 and stability < 0.7:
        support = (recovery - 0.5) * CONFIG.recovery_to_stability
        stability = clamp(stability + support)
        recovery = clamp(recovery - support * 0.5)  # 회복력 소비
    
    # 변동성 ↔ 안정성 반비례 보정
    if volatility > 0.7:
        stability = clamp(stability - 0.01)
    if stability > 0.8:
        volatility = clamp(volatility - 0.01)
    
    # 모멘텀 ↔ 드래그 반비례 보정
    if momentum > 0.7 and drag > 0.3:
        drag = clamp(drag - 0.01)
    if drag > 0.6 and momentum > 0.3:
        momentum = clamp(momentum - 0.01)
    
    return stability, pressure, drag, momentum, volatility, recovery


def can_advance_station(momentum: float, drag: float) -> bool:
    """다음 스테이션으로 진행 가능한지 확인"""
    if drag >= CONFIG.drag_block_threshold:
        return False  # 저항이 너무 높으면 정체
    return momentum >= CONFIG.momentum_threshold


def compute_progress_score(momentum: float, drag: float, stability: float) -> float:
    """진행 점수 계산 (0-1)"""
    base = momentum * 0.6 + stability * 0.2
    penalty = drag * 0.4
    return clamp(base - penalty, 0.0, 1.0)


