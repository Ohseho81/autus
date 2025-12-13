"""AUTUS Solar - Physics v2.2"""
from dataclasses import dataclass, field
from typing import Dict, List
import time, math

@dataclass
class EventLog:
    timestamp: float
    tick: int
    event_type: str
    data: Dict

@dataclass
class InnerGravity:
    talent: float = 0.5
    effort: float = 0.0
    context: float = 0.5
    entropy: float = 0.0
    
    S_CRIT: float = 0.20
    S_FAIL: float = 0.40
    G_MIN: float = 0.25
    
    LAMBDA: float = 0.05
    SIGMA: float = 0.03  # 증가
    
    def compute_mass(self) -> float:
        return 0.4 * self.talent + 0.4 * math.log(1 + self.effort) + 0.2 * self.context
    
    def compute_gravity(self) -> float:
        return max(0, self.compute_mass() - self.entropy * 0.3)
    
    def to_dict(self) -> Dict:
        return {"talent": round(self.talent, 3), "effort": round(self.effort, 3), "context": round(self.context, 3), "entropy": round(self.entropy, 3), "gravity": round(self.compute_gravity(), 3)}

@dataclass
class TwinState:
    E: float = 1.0
    K: float = 0.5
    C: int = 0
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
        return {"Brain": round(self.brain, 3), "Sensors": round(self.sensors, 3), "Heart": round(self.heart, 3), "Core": round(self.core, 3), "Engines": round(self.engines, 3), "Base": round(self.base, 3), "Boundary": round(self.boundary, 3)}

@dataclass
class SolarEntity:
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    logs: List[EventLog] = field(default_factory=list)
    tick_count: int = 0
    orbit_stable: bool = True
    orbit_status: str = "STABLE"
    
    T_HOLD: int = 10
    ENGINE_S_REDUCE: float = 0.20
    
    def _log(self, t: str, d: Dict):
        self.logs.append(EventLog(time.time(), self.tick_count, t, d))
        if len(self.logs) > 200: self.logs = self.logs[-200:]
    
    def _check_stability(self):
        S = self.gravity.entropy
        if S > self.gravity.S_FAIL: return False, "UNSTABLE"
        if S > self.gravity.S_CRIT: return False, "WARNING"
        return True, "STABLE"
    
    def apply_input(self, slot: str, value: float):
        s = slot.lower()
        if s == "boundary":
            self.gravity.effort += 0.1
            self._log("PRESSURE", {"effort": round(self.gravity.effort, 3)})
            self._tick()
        elif s == "engines":
            old_S = self.gravity.entropy
            self.gravity.entropy = max(0, self.gravity.entropy - self.ENGINE_S_REDUCE)
            self.twin.E = max(0, self.twin.E - 0.03)
            self._log("ENGINES", {"S": f"{old_S:.3f}→{self.gravity.entropy:.3f}"})
    
    def tick(self) -> Dict:
        self._tick()
        return self.snapshot()
    
    def _tick(self):
        self.tick_count += 1
        
        # Entropy 증가
        self.gravity.entropy += self.gravity.SIGMA + self.gravity.LAMBDA * (1 - self.energy.boundary)
        
        # Effort 감쇠
        self.gravity.effort = max(0, self.gravity.effort - 0.005)
        
        # 안정성
        was = self.orbit_stable
        self.orbit_stable, self.orbit_status = self._check_stability()
        
        # Cycle 전이
        if self.orbit_stable:
            self.twin.stable_ticks += 1
            if self.twin.was_unstable and self.twin.stable_ticks >= self.T_HOLD:
                self.twin.C += 1
                self.twin.was_unstable = False
                self._log("CYCLE_UP", {"cycle": self.twin.C})
        else:
            self.twin.stable_ticks = 0
            self.twin.was_unstable = True
        
        # 계기판
        self.energy.engines = self.twin.K
        self.energy.boundary = min(1, self.gravity.entropy)
        self.energy.core = max(0.3, 1 - self.gravity.entropy * 0.4)
        
        self._log("TICK", {"t": self.tick_count, "S": round(self.gravity.entropy, 3), "st": self.orbit_status})
    
    def snapshot(self) -> Dict:
        G = self.gravity.compute_gravity()
        return {
            "id": self.id, "name": self.name, "cycle": self.twin.C, "tick": self.tick_count,
            "twin": {"E": round(self.twin.E, 3), "K": round(self.twin.K, 3), "C": self.twin.C, "stable_ticks": self.twin.stable_ticks},
            "gravity": self.gravity.to_dict(),
            "entropy": {"value": round(self.gravity.entropy, 3), "S_crit": self.gravity.S_CRIT, "S_fail": self.gravity.S_FAIL},
            "orbit": {"radius": round((2 / (1 + G * 0.5)) * (1 + self.gravity.entropy * 0.8), 3), "stable": self.orbit_stable, "status": self.orbit_status},
            "energy": self.energy.to_dict(),
            "blocked": not self.orbit_stable,
            "block_reason": f"Orbit {self.orbit_status}" if not self.orbit_stable else ""
        }
    
    def get_logs(self, limit: int = 50) -> List[Dict]:
        return [{"tick": l.tick, "type": l.event_type, "data": l.data} for l in self.logs[-limit:]]
    
    def reset(self):
        self.twin = TwinState()
        self.energy = EnergyField()
        self.gravity = InnerGravity()
        self.orbit_stable = True
        self.orbit_status = "STABLE"
        self.logs = []
        self.tick_count = 0

_sun = SolarEntity()
def get_sun() -> SolarEntity: return _sun
