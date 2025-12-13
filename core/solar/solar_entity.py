"""
AUTUS Solar Entity - Physics v2.4
Tick/Cycle Equation v1.1 LOCKED
"""
from dataclasses import dataclass, field
from typing import Dict, List
import math

@dataclass
class InnerGravity:
    talent: float = 0.5
    effort: float = 0.0
    context: float = 0.5
    entropy: float = 0.0
    
    S_CRIT: float = 0.20
    S_FAIL: float = 0.40
    S_GAIN: float = 0.04
    S_REDUCE: float = 0.25
    
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
    """AUTUS Solar - Tick/Cycle Equation v1.1"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    
    tick: int = 0
    cycle: int = 0  # Separate cycle counter
    
    orbit_stable: bool = True
    orbit_status: str = "STABLE"
    
    B_DECAY: float = 0.015
    
    def _check_stability(self) -> tuple:
        S = self.gravity.entropy
        if S > self.gravity.S_FAIL:
            return False, "UNSTABLE"
        if S > self.gravity.S_CRIT:
            return False, "WARNING"
        return True, "STABLE"
    
    def _update_state(self):
        """Update derived state after tick"""
        # Entropy gain (when B is low)
        entropy_gain = self.gravity.S_GAIN * (1 - self.twin.B)
        self.gravity.entropy = max(0, self.gravity.entropy + entropy_gain)
        
        # Boundary decay
        self.twin.B = max(0, self.twin.B - self.B_DECAY)
        
        # Effort decay
        self.gravity.effort = max(0, self.gravity.effort - 0.005)
        
        # Stability check
        self.orbit_stable, self.orbit_status = self._check_stability()
        
        # Update energy display
        self.energy.engines = self.twin.K
        self.energy.boundary = self.twin.B
        self.energy.core = max(0.3, 1 - self.gravity.entropy * 0.4)
    
    def do_cycle(self) -> Dict:
        """CYCLE: tick += 1, cycle += 1"""
        self.tick += 1
        self.cycle += 1
        self._update_state()
        return self.snapshot()
    
    def do_tick(self) -> Dict:
        """TICK (time only): tick += 1"""
        self.tick += 1
        self._update_state()
        return self.snapshot()
    
    def do_pressure(self) -> Dict:
        """PRESSURE: tick += 1, effort += 0.1, B -= 0.1"""
        self.tick += 1
        self.gravity.effort += 0.1
        self.twin.B = max(0, self.twin.B - 0.1)
        self._update_state()
        return self.snapshot()
    
    def do_engines(self) -> Dict:
        """ENGINES: NO tick, S -= 0.25, B += 0.2"""
        self.gravity.entropy = max(0, self.gravity.entropy - self.gravity.S_REDUCE)
        self.twin.B = min(1.0, self.twin.B + 0.2)
        self.twin.E = max(0, self.twin.E - 0.02)
        self.orbit_stable, self.orbit_status = self._check_stability()
        return self.snapshot()
    
    def do_reset(self) -> Dict:
        """RESET: all state = 0"""
        self.tick = 0
        self.cycle = 0
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
            "tick": self.tick,
            "cycle": self.cycle,
            "twin": {
                "E": round(self.twin.E, 3),
                "K": round(self.twin.K, 3),
                "B": round(self.twin.B, 3)
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

_sun = SolarEntity()
def get_sun() -> SolarEntity:
    return _sun
