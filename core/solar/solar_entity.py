"""
AUTUS Solar Entity - Physics v1.0 Final Lock
"""
from dataclasses import dataclass, field
from typing import Dict

# LOCKED CONSTANTS
ALPHA = 0.12    # PRESSURE entropy gain
BETA = 0.25     # RELEASE entropy reduction  
GAMMA = 0.9     # CYCLE entropy decay
E0 = 0.0        # Initial entropy
B1 = 0.20       # WARNING threshold
B2 = 0.80       # COLLAPSE threshold

@dataclass
class SolarState:
    """State Vector S = {t, c, e, b, σ}"""
    t: int = 0      # tick
    c: int = 0      # cycle
    e: float = E0   # entropy
    b: float = B2   # boundary
    sigma: str = "STABLE"  # stability
    
    def _compute_stability(self) -> str:
        """Stability Function"""
        if self.e >= B2:
            return "COLLAPSE"
        elif self.e >= B1:
            return "WARNING"
        return "STABLE"
    
    def _update_sigma(self):
        self.sigma = self._compute_stability()
    
    def pressure(self) -> 'SolarState':
        """PRESSURE: t+1, e+α, c unchanged"""
        self.t += 1
        self.e += ALPHA
        self._update_sigma()
        return self
    
    def release(self) -> 'SolarState':
        """RELEASE: t+1, e-β, c unchanged"""
        self.t += 1
        self.e = max(0, self.e - BETA)
        self._update_sigma()
        return self
    
    def reset(self) -> 'SolarState':
        """RESET: t+1, e=e0, c UNCHANGED"""
        self.t += 1
        self.e = E0
        # c unchanged (Invariant I3)
        self._update_sigma()
        return self
    
    def cycle(self) -> 'SolarState':
        """CYCLE: t+1, c+1, e×γ"""
        self.t += 1
        self.c += 1
        self.e = self.e * GAMMA
        self._update_sigma()
        return self
    
    def full_reset(self) -> 'SolarState':
        """FULL RESET: all state = 0 (for testing)"""
        self.t = 0
        self.c = 0
        self.e = E0
        self.sigma = "STABLE"
        return self
    
    def snapshot(self) -> Dict:
        """Single Source of Truth"""
        return {
            "tick": self.t,
            "cycle": self.c,
            "entropy": round(self.e, 4),
            "boundary": self.b,
            "status": self.sigma,
            # Invariant check
            "invariants": {
                "I1_c_le_t": self.c <= self.t,
                "valid": self.c <= self.t
            }
        }

# Singleton
_state = SolarState()

def get_sun() -> SolarState:
    return _state
