"""
AUTUS Solar Entity - Physics v2.3
Tick Equation v1.0 LOCKED
"""
from dataclasses import dataclass, field
from typing import Dict, List
import time, math

@dataclass
class InnerGravity:
    talent: float = 0.5
    effort: float = 0.0
    context: float = 0.5
    entropy: float = 0.0
    
    # LOCKED Constants
    S_CRIT: float = 0.20
    S_FAIL: float = 0.40
    G_MIN: float = 0.25
    S_GAIN: float = 0.06
    S_REDUCE: float = 0.20
    
    def compute_gravity(self) -> float:
        M = 0.4 * self.talent + 0.4 * math.log(1 + self.effort) + 0.2 * self.context
        return max(0, M - self.entropy * 0.3)
    
    def to_dict(self) -> Dict:
        return {
            "talent": round(self.talent, 3),
            "effort": round(self.effort, 3),
            "context": round(self.context, 3),
            "entropy": round(self.entropy, 3),
            "gravity": round(self.compute_gravity(), 3)
        }

@dataclass
class TwinState:
    E: float = 1.0
    K: float = 0.5
    B: float = 0.0
    C: int = 0  # cycle
    was_unstable: bool = False
    stable_ticks: int = 0

@dataclass
class EnergyField:
    brain: float = 0.5
    sensors: float = 0.5
    heart: float = 0.5
    core: float = 1.0
    engines: float = 0.5
    base: float = 0.5
    boundary: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "Brain": round(self.brain, 3),
            "Sensors": round(self.sensors, 3),
            "Heart": round(self.heart, 3),
            "Core": round(self.core, 3),
            "Engines": round(self.engines, 3),
            "Base": round(self.base, 3),
            "Boundary": round(self.boundary, 3)
        }

@dataclass
class SolarEntity:
    """AUTUS Solar - Tick Equation v1.0 LOCKED"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    
    tick: int = 0  # Tick Equation: single source
    
    orbit_stable: bool = True
    orbit_status: str = "STABLE"
    
    # LOCKED Constants
    T_HOLD: int = 10
    B_DECAY: float = 0.02
    
    def _check_stability(self) -> tuple:
        S = self.gravity.entropy
        if S > self.gravity.S_FAIL:
            return False, "UNSTABLE"
        if S > self.gravity.S_CRIT:
            return False, "WARNING"
        return True, "STABLE"
    
    def _process_tick(self):
        """Core tick processing - called after tick increment"""
        # Entropy gain (when B is low)
        entropy_gain = self.gravity.S_GAIN * (1 - self.twin.B)
        self.gravity.entropy = max(0, self.gravity.entropy + entropy_gain)
        
        # Boundary decay
        self.twin.B = max(0, self.twin.B - self.B_DECAY)
        
        # Effort decay
        self.gravity.effort = max(0, self.gravity.effort - 0.005)
        
        # Stability check
        self.orbit_stable, self.orbit_status = self._check_stability()
        
        # Cycle transition: UNSTABLE → STABLE sustained
        if self.orbit_stable:
            self.twin.stable_ticks += 1
            if self.twin.was_unstable and self.twin.stable_ticks >= self.T_HOLD:
                self.twin.C += 1  # Cycle Equation
                self.twin.was_unstable = False
        else:
            self.twin.stable_ticks = 0
            self.twin.was_unstable = True
        
        # Update energy display
        self.energy.engines = self.twin.K
        self.energy.boundary = self.twin.B
        self.energy.core = max(0.3, 1 - self.gravity.entropy * 0.4)
    
    def do_tick(self) -> Dict:
        """CYCLE event: tick += 1"""
        self.tick += 1
        self._process_tick()
        return self.snapshot()
    
    def do_pressure(self) -> Dict:
        """PRESSURE event: tick += 1, effort += 0.1, B -= 0.1"""
        self.tick += 1
        self.gravity.effort += 0.1
        self.twin.B = max(0, self.twin.B - 0.1)
        self._process_tick()
        return self.snapshot()
    
    def do_engines(self) -> Dict:
        """ENGINES event: NO tick (instant), S -= 0.20, B += 0.15"""
        # No tick increment - instant effect
        self.gravity.entropy = max(0, self.gravity.entropy - self.gravity.S_REDUCE)
        self.twin.B = min(1.0, self.twin.B + 0.15)
        self.twin.E = max(0, self.twin.E - 0.02)
        # Re-check stability without processing
        self.orbit_stable, self.orbit_status = self._check_stability()
        return self.snapshot()
    
    def do_reset(self) -> Dict:
        """RESET event: tick = 0, all state reset"""
        self.tick = 0
        self.twin = TwinState()
        self.energy = EnergyField()
        self.gravity = InnerGravity()
        self.orbit_stable = True
        self.orbit_status = "STABLE"
        return self.snapshot()
    
    def snapshot(self) -> Dict:
        """Single Source of Truth"""
        G = self.gravity.compute_gravity()
        return {
            "id": self.id,
            "name": self.name,
            "tick": self.tick,  # Invariant 1: this is THE tick
            "cycle": self.twin.C,  # Invariant 2: cycle <= tick
            "twin": {
                "E": round(self.twin.E, 3),
                "K": round(self.twin.K, 3),
                "B": round(self.twin.B, 3),
                "C": self.twin.C,
                "stable_ticks": self.twin.stable_ticks
            },
            "gravity": self.gravity.to_dict(),
            "entropy": {
                "value": round(self.gravity.entropy, 3),
                "S_crit": self.gravity.S_CRIT,
                "S_fail": self.gravity.S_FAIL
            },
            "orbit": {
                "radius": round((2 / (1 + G * 0.5)) * (1 + self.gravity.entropy * 0.8), 3),
                "stable": self.orbit_stable,
                "status": self.orbit_status
            },
            "energy": self.energy.to_dict()
        }

# Singleton
_sun = SolarEntity()
def get_sun() -> SolarEntity:
    return _sun
