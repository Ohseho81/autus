"""
AUTUS Solar - Physics v1.0 Final Lock
Single Truth. Determinism. Human Decision Only.
"""
from dataclasses import dataclass
from typing import Dict

# LOCKED CONSTANTS (DO NOT MODIFY)
ALPHA = 0.12    # PRESSURE: entropy gain
BETA = 0.25     # RELEASE: entropy reduction
GAMMA = 0.9     # DECISION: entropy decay
E0 = 0.0        # Initial entropy
B1 = 0.20       # WARNING threshold
B2 = 0.80       # COLLAPSE threshold

@dataclass
class Solar:
    """
    State Vector: S = {tick, cycle, entropy, boundary, stability}
    
    Invariants (MUST HOLD):
      I1. cycle <= tick
      I2. cycle increases ONLY on DECISION
      I3. RESET never changes cycle
    """
    tick: int = 0
    cycle: int = 0
    entropy: float = E0
    boundary: float = B2
    
    @property
    def stability(self) -> str:
        """Stability Function"""
        if self.entropy >= B2:
            return "COLLAPSE"
        if self.entropy >= B1:
            return "WARNING"
        return "STABLE"
    
    def _check_invariants(self) -> bool:
        """Invariant I1: cycle <= tick"""
        return self.cycle <= self.tick
    
    # === EVENTS ===
    
    def pressure(self) -> Dict:
        """PRESSURE: tick+1, entropy+α, cycle UNCHANGED"""
        self.tick += 1
        self.entropy += ALPHA
        return self.status()
    
    def release(self) -> Dict:
        """RELEASE: tick+1, entropy-β, cycle UNCHANGED"""
        self.tick += 1
        self.entropy = max(0, self.entropy - BETA)
        return self.status()
    
    def reset(self) -> Dict:
        """RESET: tick+1, entropy=e0, cycle UNCHANGED (I3)"""
        self.tick += 1
        self.entropy = E0
        # cycle unchanged (Invariant I3)
        return self.status()
    
    def decision(self) -> Dict:
        """DECISION: tick+1, cycle+1, entropy×γ (Human Choice)"""
        self.tick += 1
        self.cycle += 1
        self.entropy = self.entropy * GAMMA
        return self.status()
    
    def full_reset(self) -> Dict:
        """FULL RESET: all=0 (Testing Only)"""
        self.tick = 0
        self.cycle = 0
        self.entropy = E0
        return self.status()
    
    # === SINGLE SOURCE OF TRUTH ===
    
    def status(self) -> Dict:
        """GET /status → S (Single Truth)"""
        valid = self._check_invariants()
        return {
            "tick": self.tick,
            "cycle": self.cycle,
            "entropy": round(self.entropy, 4),
            "boundary": self.boundary,
            "stability": self.stability,
            "valid": valid,
            "error": None if valid else "INVARIANT_VIOLATION: cycle > tick"
        }

# Singleton (Global State)
_solar = Solar()

def get_solar() -> Solar:
    return _solar
