#!/usr/bin/env python3
"""
AUTUS Loss Function
===================
물리 기반 손실 함수

핵심 수식:
    L = ∫ (P + R × S) dt
    
    L = Loss (손실)
    P = Pressure = E / t² (압력)
    R = Resistance (저항)
    S = Entropy (엔트로피)
    t = time_to_pnr (PNR까지 남은 시간)

물리적 해석:
    1. Pressure(P): 시간이 줄수록 기하급수적 증가 → "미루기 = 파산"
    2. R × S: 저항과 불확실성의 곱 → "확인 없는 확신 = 모래바람"
"""

import time
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# LOSS STATES
# ═══════════════════════════════════════════════════════════════════════════════

class LossState(Enum):
    """손실 상태"""
    STABLE = "STABLE"           # 안정 (손실 속도 < 10원/초)
    WARNING = "WARNING"         # 경고 (10 ≤ 손실 속도 < 100원/초)
    DANGER = "DANGER"           # 위험 (100 ≤ 손실 속도 < 1000원/초)
    CRITICAL = "CRITICAL"       # 임계 (손실 속도 ≥ 1000원/초)
    BANKRUPT = "BANKRUPT"       # 파산 (PNR 초과)


# ═══════════════════════════════════════════════════════════════════════════════
# LOSS RESULT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LossResult:
    """손실 계산 결과"""
    
    # 핵심 지표
    loss_velocity: float          # 손실 속도 (원/초)
    loss_per_day: float           # 일일 손실 (원)
    loss_per_month: float         # 월간 손실 (원)
    
    # 구성 요소
    pressure: float               # 압력 (P)
    friction_loss: float          # 마찰 손실 (R × S)
    
    # 상태
    state: LossState
    entropy_status: str           # STABLE / WARNING / CRITICAL
    
    # PNR
    pnr_remaining_sec: float      # PNR까지 남은 시간(초)
    pnr_remaining_days: float     # PNR까지 남은 시간(일)
    
    # 경고 메시지
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "loss_velocity_won_sec": self.loss_velocity,
            "loss_per_day": self.loss_per_day,
            "loss_per_month": self.loss_per_month,
            "pressure": self.pressure,
            "friction_loss": self.friction_loss,
            "state": self.state.value,
            "entropy_status": self.entropy_status,
            "pnr_remaining_sec": self.pnr_remaining_sec,
            "pnr_remaining_days": self.pnr_remaining_days,
            "warnings": self.warnings
        }


# ═══════════════════════════════════════════════════════════════════════════════
# LOSS FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

class LossFunction:
    """
    AUTUS 손실 함수
    
    L = ∫ (P + R × S × E / T) dt
    
    Where:
        P = E / t²  (Pressure, 시간 압력)
        R = resistance (저항)
        S = entropy (엔트로피)
        E = energy (투입 에너지)
        T = total_pnr_time (총 PNR 기간)
        t = time_to_pnr (남은 시간)
    
    물리적 의미:
        - 손실 속도 = 시간 압력 + 마찰 손실
        - 마찰 손실 = 저항 × 엔트로피 × 일일 에너지 소모율
    """
    
    # 에너지 → 원화 변환 계수
    ENERGY_TO_WON = 1e8  # 1 Energy = 1억원
    
    # 시간 상수
    DAY_SEC = 86400
    MONTH_SEC = DAY_SEC * 30
    
    def __init__(
        self,
        entropy_threshold: float = 0.8,
        pressure_exponent: float = 2.0,
        base_burn_rate: float = 0.01  # 일일 기본 소모율 1%
    ):
        """
        Args:
            entropy_threshold: 엔트로피 임계값 (기본 0.8)
            pressure_exponent: 압력 지수 (기본 2.0, 제곱)
            base_burn_rate: 일일 기본 소모율 (기본 1%)
        """
        self.entropy_threshold = entropy_threshold
        self.pressure_exponent = pressure_exponent
        self.base_burn_rate = base_burn_rate
    
    def calculate(
        self,
        energy: float,
        resistance: float,
        entropy: float,
        pnr_timestamp: float
    ) -> LossResult:
        """
        손실 계산
        
        Args:
            energy: 투입 에너지 (AUTUS 단위, 1 = 1억원)
            resistance: 저항 (0.0 ~ 1.0)
            entropy: 엔트로피 (0.0 ~ 1.0)
            pnr_timestamp: PNR 타임스탬프 (Unix timestamp)
        
        Returns:
            LossResult: 손실 계산 결과
        """
        now = time.time()
        time_to_pnr = pnr_timestamp - now
        warnings = []
        state = LossState.STABLE
        
        # ─────────────────────────────────────────────────────────────────────
        # 1. Pressure 계산: P = E × burn_rate / (t/T)²
        # 시간이 줄수록 압력은 기하급수적 증가
        # ─────────────────────────────────────────────────────────────────────
        if time_to_pnr <= 0:
            pressure = float('inf')
            state = LossState.BANKRUPT
            warnings.append("🚨 PNR 초과! 시스템 파산 상태")
        else:
            # 정규화된 시간 비율 (남은 비율)
            # 30일 기준으로 정규화
            time_ratio = time_to_pnr / self.MONTH_SEC
            if time_ratio < 0.01:
                time_ratio = 0.01  # 최소값 설정
            
            # 압력 = 에너지 × 기본소모율 / 시간비율²
            # 시간이 줄수록 압력 급증
            pressure = energy * self.base_burn_rate / (time_ratio ** self.pressure_exponent)
            
            # 시간 경고
            if time_to_pnr < self.DAY_SEC:
                warnings.append(f"⚠️ PNR까지 {time_to_pnr/3600:.1f}시간 남음!")
            elif time_to_pnr < self.DAY_SEC * 3:
                warnings.append(f"⚠️ PNR까지 {time_to_pnr/self.DAY_SEC:.1f}일 남음")
        
        # ─────────────────────────────────────────────────────────────────────
        # 2. Friction Loss 계산: F = R × S × E × burn_rate
        # 저항이 클수록, 엔트로피가 높을수록 손실 가속
        # ─────────────────────────────────────────────────────────────────────
        friction_loss = resistance * entropy * energy * self.base_burn_rate
        
        # 엔트로피 상태 판정
        if entropy >= self.entropy_threshold:
            entropy_status = "CRITICAL"
            warnings.append(f"🔴 엔트로피 임계 초과: {entropy:.2f}")
        elif entropy >= self.entropy_threshold * 0.75:
            entropy_status = "WARNING"
            warnings.append(f"🟡 엔트로피 경고: {entropy:.2f}")
        else:
            entropy_status = "STABLE"
        
        # ─────────────────────────────────────────────────────────────────────
        # 3. Total Loss Velocity 계산: L = P + F (일일 손실)
        # ─────────────────────────────────────────────────────────────────────
        if state == LossState.BANKRUPT:
            loss_velocity_day = float('inf')
        else:
            loss_velocity_day = pressure + friction_loss
        
        # 원화 변환
        loss_per_day_won = loss_velocity_day * self.ENERGY_TO_WON
        loss_per_month_won = loss_per_day_won * 30
        loss_velocity_won = loss_per_day_won / self.DAY_SEC  # 원/초
        
        pressure_won = pressure * self.ENERGY_TO_WON
        friction_won = friction_loss * self.ENERGY_TO_WON
        
        # ─────────────────────────────────────────────────────────────────────
        # 4. 상태 판정 (일일 손실 기준)
        # ─────────────────────────────────────────────────────────────────────
        if state != LossState.BANKRUPT:
            if loss_per_day_won >= 100_000_000:  # 1억원/일
                state = LossState.CRITICAL
                warnings.append("🔴 손실 속도 임계!")
            elif loss_per_day_won >= 10_000_000:  # 1천만원/일
                state = LossState.DANGER
                warnings.append("🟠 손실 속도 위험")
            elif loss_per_day_won >= 1_000_000:   # 백만원/일
                state = LossState.WARNING
            else:
                state = LossState.STABLE
        
        return LossResult(
            loss_velocity=round(loss_velocity_won, 2),
            loss_per_day=round(loss_per_day_won, 0),
            loss_per_month=round(loss_per_month_won, 0),
            pressure=round(pressure_won / self.DAY_SEC, 2),  # 원/초
            friction_loss=round(friction_won / self.DAY_SEC, 2),  # 원/초
            state=state,
            entropy_status=entropy_status,
            pnr_remaining_sec=round(max(0, time_to_pnr), 0),
            pnr_remaining_days=round(max(0, time_to_pnr / self.DAY_SEC), 2),
            warnings=warnings
        )
    
    def calculate_from_business(
        self,
        capital_won: float,
        resistance: float,
        entropy: float,
        pnr_days: int
    ) -> LossResult:
        """
        비즈니스 데이터로부터 손실 계산 (편의 메서드)
        
        Args:
            capital_won: 투입 자본 (원)
            resistance: 저항 (0.0 ~ 1.0)
            entropy: 엔트로피 (0.0 ~ 1.0)
            pnr_days: PNR까지 남은 일수
        
        Returns:
            LossResult: 손실 계산 결과
        """
        # 원화 → 에너지 변환
        energy = capital_won / self.ENERGY_TO_WON
        
        # PNR 타임스탬프 계산
        pnr_timestamp = time.time() + (pnr_days * 86400)
        
        return self.calculate(energy, resistance, entropy, pnr_timestamp)


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def quick_loss_check(
    capital_억: float,
    resistance: float,
    entropy: float,
    pnr_days: int
) -> Dict:
    """
    빠른 손실 체크 (단축 함수)
    
    Args:
        capital_억: 투입 자본 (억 단위)
        resistance: 저항 (0.0 ~ 1.0)
        entropy: 엔트로피 (0.0 ~ 1.0)
        pnr_days: PNR까지 남은 일수
    
    Returns:
        Dict: 손실 결과 딕셔너리
    
    Example:
        >>> quick_loss_check(5, 0.7, 0.9, 30)
    """
    func = LossFunction()
    result = func.calculate_from_business(
        capital_won=capital_억 * 1e8,
        resistance=resistance,
        entropy=entropy,
        pnr_days=pnr_days
    )
    return result.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("🔬 AUTUS Loss Function Test")
    print("=" * 60)
    
    # 테스트 케이스: 15번 학교 B2B 프로젝트
    # 에너지(자본): 5억, 저항(기관협의): 0.7, 엔트로피(조사부족): 0.9, PNR: 30일
    
    func = LossFunction()
    result = func.calculate_from_business(
        capital_won=500_000_000,  # 5억
        resistance=0.7,
        entropy=0.9,
        pnr_days=30
    )
    
    print(f"\n📊 Input:")
    print(f"   자본: 5억원")
    print(f"   저항: 0.7 (기관 협의)")
    print(f"   엔트로피: 0.9 (조사부족)")
    print(f"   PNR: 30일")
    
    print(f"\n📈 Result:")
    print(f"   손실 속도: ₩{result.loss_velocity:,.4f}/초")
    print(f"   일일 손실: ₩{result.loss_per_day:,.0f}")
    print(f"   월간 손실: ₩{result.loss_per_month:,.0f}")
    print(f"   압력(P): ₩{result.pressure:,.4f}")
    print(f"   마찰손실(R×S): ₩{result.friction_loss:,.4f}")
    print(f"   상태: {result.state.value}")
    print(f"   엔트로피: {result.entropy_status}")
    print(f"   PNR: {result.pnr_remaining_days}일")
    
    if result.warnings:
        print(f"\n⚠️ Warnings:")
        for w in result.warnings:
            print(f"   {w}")
    
    print("\n" + "=" * 60)
