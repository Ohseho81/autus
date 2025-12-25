#!/usr/bin/env python3
"""
AUTUS Core - Physics Engine
===========================
물리 손실 함수: L = ∫(P + R×S)dt
"""

import time
from dataclasses import dataclass
from typing import Dict

@dataclass
class LossResult:
    """손실 계산 결과"""
    loss_velocity: float      # 원/초
    loss_per_day: float       # 억/일
    loss_per_month: float     # 억/월
    pressure: float
    friction: float
    state: str
    pnr_days: float


class PhysicsEngine:
    """물리 엔진"""
    
    # 상수
    DAY_SEC = 86400
    MONTH_SEC = DAY_SEC * 30
    억 = 1e8
    
    def __init__(self, burn_rate: float = 0.01):
        self.burn_rate = burn_rate  # 일일 기본 소모율
    
    def calculate_loss(
        self,
        capital: float,           # 자본 (억)
        resistance: float,        # 저항 (0~1)
        entropy: float,           # 엔트로피 (0~1)
        pnr_days: int = 30        # PNR까지 일수
    ) -> LossResult:
        """
        손실 계산
        
        L = P + R×S×E
        P = E × burn / (t/T)²
        """
        time_ratio = max(pnr_days / 30, 0.01)
        
        # Pressure
        pressure = capital * self.burn_rate / (time_ratio ** 2)
        
        # Friction
        friction = resistance * entropy * capital * self.burn_rate
        
        # Total
        daily_loss = pressure + friction
        monthly_loss = daily_loss * 30
        loss_per_sec = (daily_loss * self.억) / self.DAY_SEC
        
        # State
        if daily_loss >= 1.0:
            state = "CRITICAL"
        elif daily_loss >= 0.3:
            state = "DANGER"
        elif daily_loss >= 0.1:
            state = "WARNING"
        else:
            state = "STABLE"
        
        return LossResult(
            loss_velocity=round(loss_per_sec, 2),
            loss_per_day=round(daily_loss, 4),
            loss_per_month=round(monthly_loss, 2),
            pressure=round(pressure, 4),
            friction=round(friction, 4),
            state=state,
            pnr_days=pnr_days
        )


class LossFunction:
    """손실 함수 (편의 래퍼)"""
    
    def __init__(self):
        self.engine = PhysicsEngine()
    
    def __call__(self, capital, resistance, entropy, pnr_days=30) -> Dict:
        result = self.engine.calculate_loss(capital, resistance, entropy, pnr_days)
        return {
            "loss_velocity": result.loss_velocity,
            "loss_per_day": result.loss_per_day,
            "loss_per_month": result.loss_per_month,
            "pressure": result.pressure,
            "friction": result.friction,
            "state": result.state,
            "pnr_days": result.pnr_days
        }
