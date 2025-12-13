"""
AUTUS Physics Engine - Universal Action Equation

단일 공식:
S(t+1) = S(t) + α·PRESSURE - β·RELEASE - k·e + D·(-γ·e + ΔStructure)

이벤트:
- PRESSURE: tick+1, entropy+α (자동 물리)
- RELEASE:  tick+1, entropy-β (자동 물리)  
- RESET:    tick+1, entropy=e0 (안정 회복)
- DECISION: tick+1, cycle+1, entropy×γ (구조 전이 - 인간만)
"""
import math
from typing import Dict
from core.solar.models import StateVector, StabilityType
from core.solar.constants import (
    ALPHA, BETA, GAMMA, K, E0, B0,
    B1_RATIO, B2_RATIO,
    W_TALENT, W_EFFORT, W_CONTEXT
)

def calc_gravity(talent: float, effort: float, context: float) -> float:
    """
    Gravity = f(Talent, Effort, Context)
    우주: 질량/중력
    인간: 능력·재능·노력·환경의 합
    """
    return (W_TALENT * talent + 
            W_EFFORT * math.log(1 + effort) + 
            W_CONTEXT * context)

def calc_stability(entropy: float, boundary: float) -> StabilityType:
    """
    Stability Function
    우주: 상전이
    인간: 안정/경고/붕괴
    """
    b1 = boundary * B1_RATIO
    b2 = boundary * B2_RATIO
    
    if entropy >= b2:
        return "COLLAPSE"
    elif entropy >= b1:
        return "WARNING"
    return "STABLE"

def apply_natural_decay(entropy: float) -> float:
    """
    열역학 제2법칙: 아무것도 안 하면 엔트로피는 자연 증가
    (여기선 감쇠로 구현 - 시스템이 자연히 안정화되는 방향)
    """
    return max(0, entropy - K)

class SolarEngine:
    """
    AUTUS Solar State Engine
    
    Universal Action Equation 구현:
    ΔS = Φ(S, E, D)
    """
    
    def __init__(self):
        self.state = StateVector()
    
    def _update_derived(self):
        """Update derived state values"""
        self.state.gravity = calc_gravity(
            self.state.talent,
            self.state.effort,
            self.state.context
        )
        self.state.stability = calc_stability(
            self.state.entropy,
            self.state.boundary
        )
    
    def _check_invariants(self) -> bool:
        """
        Invariants (불변식):
        I1. cycle <= tick
        I2. cycle increases ONLY on DECISION
        I3. RESET never changes cycle
        """
        return self.state.cycle <= self.state.tick
    
    # === EVENTS (자동 물리) ===
    
    def pressure(self) -> Dict:
        """
        PRESSURE: tick+1, entropy+α
        우주: 외력/에너지 유입
        인간: 업무/자극/스트레스
        
        대부분의 인간은 이 항만 산다:
        + α·PRESSURE - β·RELEASE - k·e
        """
        self.state.tick += 1
        self.state.entropy += ALPHA
        self.state.effort += 0.05  # 노력 축적
        self.state.entropy = apply_natural_decay(self.state.entropy)
        self._update_derived()
        return self.status()
    
    def release(self) -> Dict:
        """
        RELEASE: tick+1, entropy-β
        우주: 에너지 방출
        인간: 휴식/회복
        """
        self.state.tick += 1
        self.state.entropy = max(0, self.state.entropy - BETA)
        self.state.entropy = apply_natural_decay(self.state.entropy)
        self._update_derived()
        return self.status()
    
    def reset(self) -> Dict:
        """
        RESET: tick+1, entropy=e0, cycle UNCHANGED
        열역학 제3법칙: 절대영도로 돌아감
        인간: 안정 회복 (구조는 유지)
        """
        self.state.tick += 1
        self.state.entropy = E0
        # cycle unchanged (Invariant I3)
        self._update_derived()
        return self.status()
    
    # === DECISION (인간 자유의지) ===
    
    def decision(self) -> Dict:
        """
        DECISION: tick+1, cycle+1, entropy×γ
        
        상위 3%만 이 항을 쓴다:
        + D · (-γ·e + ΔStructure)
        
        우주: 특이점/상전이
        인간: 구조를 바꾸는 결정
        
        "노력은 상태를 조금 바꾸고, 결정은 구조를 바꾼다."
        """
        self.state.tick += 1
        self.state.cycle += 1  # Structure change
        self.state.entropy = self.state.entropy * GAMMA  # Entropy damping
        self.state.entropy = apply_natural_decay(self.state.entropy)
        self._update_derived()
        return self.status()
    
    # === FULL RESET (Testing) ===
    
    def full_reset(self) -> Dict:
        """FULL RESET: all=0 (Testing Only)"""
        self.state = StateVector()
        return self.status()
    
    # === SINGLE SOURCE OF TRUTH ===
    
    def status(self) -> Dict:
        """
        GET /status → S
        
        홀로그래픽 원리: /status = 전체 요약
        """
        valid = self._check_invariants()
        return {
            # Core State Vector
            "tick": self.state.tick,
            "cycle": self.state.cycle,
            "entropy": round(self.state.entropy, 4),
            "boundary": self.state.boundary,
            "stability": self.state.stability,
            
            # Gravity Components
            "gravity": round(self.state.gravity, 4),
            "talent": self.state.talent,
            "effort": round(self.state.effort, 4),
            "context": self.state.context,
            
            # Thresholds
            "b1": round(self.state.boundary * B1_RATIO, 4),
            "b2": round(self.state.boundary * B2_RATIO, 4),
            
            # Invariant Check
            "valid": valid,
            "error": None if valid else "INVARIANT_VIOLATION"
        }

# Singleton
_engine = SolarEngine()

def get_engine() -> SolarEngine:
    return _engine
