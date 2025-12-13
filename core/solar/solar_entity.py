"""
AUTUS Solar Entity - Physics v1.3
Boundary Violation + Entropy + Collapse Detection
"""
from dataclasses import dataclass, field
from typing import Dict, List
import time
import math

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
    entropy: float = 0.0  # NEW: 엔트로피
    
    W1: float = 0.4
    W2: float = 0.4
    W3: float = 0.2
    KAPPA: float = 1.0
    
    # Entropy Constants
    LAMBDA: float = 0.1    # Boundary Loss 계수
    SIGMA: float = 0.02    # 자연 엔트로피 증가
    RHO: float = 0.05      # Engines 엔트로피 감소
    ETA: float = 0.3       # Loss → Gravity 효율 감소
    
    def compute_loss(self, boundary: float) -> float:
        """Loss = λ · (1 - Boundary)"""
        return self.LAMBDA * (1 - boundary)
    
    def compute_mass(self) -> float:
        return (self.W1 * self.talent + 
                self.W2 * math.log(1 + self.effort) + 
                self.W3 * self.context)
    
    def compute_gravity(self, loss: float = 0) -> float:
        """G_eff = G · (1 - η·Loss)"""
        G = self.KAPPA * self.compute_mass()
        return G * (1 - self.ETA * loss)
    
    def to_dict(self) -> Dict:
        return {
            "talent": round(self.talent, 3),
            "effort": round(self.effort, 3),
            "context": round(self.context, 3),
            "entropy": round(self.entropy, 3),
            "mass": round(self.compute_mass(), 3),
            "gravity": round(self.compute_gravity(), 3)
        }

@dataclass
class BrainState:
    focus: float = 0.5
    clarity: float = 0.5
    load: float = 0.0
    
    FOCUS_DECAY: float = 0.02
    CLARITY_GAIN: float = 0.05
    LOAD_THRESHOLD: float = 0.7
    
    def to_dict(self) -> Dict:
        return {
            "focus": round(self.focus, 3),
            "clarity": round(self.clarity, 3),
            "load": round(self.load, 3)
        }

@dataclass
class TwinState:
    P: float = 0.0
    E: float = 1.0
    K: float = 0.5
    C: int = 0
    was_unstable: bool = False

@dataclass 
class EnergyField:
    brain: float = 0.5
    sensors: float = 0.5
    heart: float = 0.5
    core: float = 1.0
    engines: float = 0.5
    base: float = 0.5
    boundary: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
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
    """AUTUS Solar - Physics v1.3 (Boundary Violation)"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    brain: BrainState = field(default_factory=BrainState)
    
    logs: List[EventLog] = field(default_factory=list)
    tick_count: int = 0
    
    # Orbit State
    orbit_stable: bool = True
    orbit_status: str = "STABLE"
    
    # Constants
    ALPHA: float = 1.0
    BETA: float = 0.8
    GAMMA: float = 0.05
    P_TH: float = 1.0
    DELTA: float = 0.2
    P_STABLE: float = 0.20
    E_MIN: float = 0.40
    
    EFFORT_GAIN: float = 0.1
    EFFORT_DECAY: float = 0.01
    CONTEXT_GAIN: float = 0.05
    CONTEXT_LOSS: float = 0.1
    
    BRAIN_FOCUS_GAIN: float = 0.1
    BRAIN_LOAD_FACTOR: float = 0.3
    
    # Entropy Thresholds
    ENTROPY_WARNING: float = 0.5
    ENTROPY_CRITICAL: float = 1.0
    ENTROPY_COLLAPSE: float = 1.5
    
    def _log(self, event_type: str, data: Dict):
        self.logs.append(EventLog(time.time(), self.tick_count, event_type, data))
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]
    
    def apply_input(self, slot: str, value: float):
        slot_lower = slot.lower()
        
        if slot_lower == "boundary":
            load = 1.0 if value > 0.5 else -1.0
            
            if load > 0:
                self.gravity.effort += self.EFFORT_GAIN
                self._log("GRAVITY_EFFORT", {"cause": "PRESSURE", "effort_delta": self.EFFORT_GAIN, "effort_new": self.gravity.effort})
            
            self._log("INPUT", {"slot": slot, "value": value, "load": load})
            self._tick(load)
            
        elif slot_lower == "brain":
            self.brain.focus = min(1.0, self.brain.focus + self.BRAIN_FOCUS_GAIN)
            self.brain.load = min(1.0, self.brain.load + self.BRAIN_LOAD_FACTOR)
            
            if self.brain.focus > 0.7:
                self.gravity.talent = min(1.0, self.gravity.talent + 0.02)
            
            self._log("BRAIN_INPUT", {"focus": self.brain.focus, "load": self.brain.load, "talent_effect": self.gravity.talent})
            self._tick(0)
            
        elif slot_lower == "sensors":
            self.brain.clarity = min(1.0, self.brain.clarity + 0.1)
            
            if self.brain.clarity > 0.6:
                self.gravity.context = min(1.0, self.gravity.context + 0.02)
            
            self._log("SENSORS_INPUT", {"clarity": self.brain.clarity, "context_effect": self.gravity.context})
            self._tick(0)
            
        else:
            if hasattr(self.energy, slot_lower):
                current = getattr(self.energy, slot_lower)
                new_value = max(0, min(1, current + (value - current) * 0.3))
                setattr(self.energy, slot_lower, new_value)
    
    def tick(self) -> Dict:
        self._tick(0.0)
        return self.snapshot()
    
    def _tick(self, load: float):
        """Physics v1.3 - Boundary Violation + Entropy"""
        self.tick_count += 1
        
        # === BOUNDARY PHYSICS (NEW) ===
        boundary_value = self.energy.boundary
        loss = self.gravity.compute_loss(boundary_value)
        
        # Entropy 계산: S(t+1) = S(t) + σ + Loss - ρ·K
        entropy_delta = self.gravity.SIGMA + loss - self.gravity.RHO * self.twin.K
        self.gravity.entropy = max(0, self.gravity.entropy + entropy_delta)
        
        # Boundary Violation 감지
        if boundary_value < 0.1 and loss > 0.05:
            self._log("BOUNDARY_VIOLATION", {
                "boundary": boundary_value,
                "loss": round(loss, 3),
                "entropy": round(self.gravity.entropy, 3),
                "reason": "Boundary too low"
            })
        
        # === ORBIT STABILITY ===
        if self.gravity.entropy >= self.ENTROPY_COLLAPSE:
            self.orbit_stable = False
            self.orbit_status = "COLLAPSED"
            self._log("ORBIT_COLLAPSE", {"entropy": self.gravity.entropy, "reason": "Entropy exceeded collapse threshold"})
        elif self.gravity.entropy >= self.ENTROPY_CRITICAL:
            self.orbit_stable = False
            self.orbit_status = "UNSTABLE"
            self._log("ORBIT_UNSTABLE", {"entropy": self.gravity.entropy})
        elif self.gravity.entropy >= self.ENTROPY_WARNING:
            self.orbit_status = "WARNING"
        else:
            self.orbit_stable = True
            self.orbit_status = "STABLE"
        
        # === PRESSURE PHYSICS ===
        new_P = max(0, self.twin.P + self.ALPHA * load - self.BETA * self.twin.K)
        self.twin.P = new_P
        
        new_E = max(0, self.twin.E - self.GAMMA * new_P)
        self.twin.E = new_E
        
        if new_P >= self.P_TH:
            new_K = min(1.0, self.twin.K + self.DELTA)
            if new_K != self.twin.K:
                self._log("AUTO_INTERVENTION", {"trigger": "P >= P_TH", "P": new_P, "K_old": self.twin.K, "K_new": new_K})
            self.twin.K = new_K
            self.twin.was_unstable = True
            self.gravity.context = max(0, self.gravity.context - self.CONTEXT_LOSS * 0.5)
            self.brain.load = min(1.0, self.brain.load + 0.2)
        
        is_stable = (new_P <= self.P_STABLE) and (new_E >= self.E_MIN)
        if is_stable and self.twin.was_unstable:
            self.twin.C += 1
            self.gravity.context = min(1, self.gravity.context + self.CONTEXT_GAIN)
            self.brain.clarity = min(1.0, self.brain.clarity + 0.1)
            
            self._log("TRANSITION", {
                "type": "unstable→stable",
                "P": new_P,
                "E": new_E,
                "cycle": self.twin.C,
                "gravity": self.gravity.to_dict(),
                "brain": self.brain.to_dict()
            })
            self.twin.was_unstable = False
        
        # === BRAIN LOOP ===
        if self.brain.focus > 0.3:
            self.brain.focus = max(0.3, self.brain.focus - self.brain.FOCUS_DECAY)
        
        if self.brain.load > 0:
            self.brain.load = max(0, self.brain.load - 0.03)
        
        if self.brain.load >= self.brain.LOAD_THRESHOLD:
            self.brain.focus *= 0.9
            self._log("BRAIN_OVERLOAD", {"load": self.brain.load, "focus_drop": self.brain.focus})
        
        if self.brain.clarity > 0.5:
            self.brain.clarity = max(0.3, self.brain.clarity - 0.01)
        
        # === GRAVITY PHYSICS ===
        if load == 0 and self.gravity.effort > 0:
            self.gravity.effort = max(0, self.gravity.effort - self.EFFORT_DECAY)
        
        G_eff = self.gravity.compute_gravity(loss)
        self._update_dashboard(G_eff, loss)
        
        # Inner Trace (1줄 요약)
        self._log("TICK", {
            "t": self.tick_count,
            "B": round(boundary_value, 2),
            "Loss": round(loss, 3),
            "S": round(self.gravity.entropy, 3),
            "G_eff": round(G_eff, 3),
            "Orbit": self.orbit_status,
            "P": round(new_P, 3),
            "K": round(self.twin.K, 3)
        })
    
    def _update_dashboard(self, G: float, loss: float):
        p_factor = 1 - min(1, self.twin.P)
        g_factor = min(1, G)
        entropy_factor = 1 - min(1, self.gravity.entropy / 2)
        
        self.energy.brain = 0.40 + 0.30 * self.brain.focus + 0.20 * self.brain.clarity
        self.energy.sensors = 0.40 + 0.30 * self.brain.clarity + 0.10 * g_factor
        self.energy.heart = 0.50 + 0.10 * p_factor + 0.05 * g_factor - 0.1 * loss
        self.energy.engines = self.twin.K
        self.energy.boundary = min(1, self.twin.P)
        self.energy.base = 0.40 + 0.30 * g_factor * entropy_factor
        self.energy.core = max(0.3, 1.0 - self.gravity.entropy * 0.3)
    
    def compute_orbit_radius(self, planet_index: int = 0) -> float:
        loss = self.gravity.compute_loss(self.energy.boundary)
        G_eff = self.gravity.compute_gravity(loss)
        R_base = 2.0 + planet_index * 0.5
        
        # Entropy → 궤도 불안정 (확대)
        entropy_effect = 1 + self.gravity.entropy * 0.5
        return (R_base / (1 + G_eff * 0.5)) * entropy_effect
    
    def snapshot(self) -> Dict:
        loss = self.gravity.compute_loss(self.energy.boundary)
        G_eff = self.gravity.compute_gravity(loss)
        
        return {
            "id": self.id,
            "name": self.name,
            "cycle": self.twin.C,
            "tick": self.tick_count,
            "twin": {"P": round(self.twin.P, 3), "E": round(self.twin.E, 3), "K": round(self.twin.K, 3), "C": self.twin.C},
            "gravity": self.gravity.to_dict(),
            "brain": self.brain.to_dict(),
            "entropy": {
                "value": round(self.gravity.entropy, 3),
                "loss": round(loss, 3),
                "G_eff": round(G_eff, 3)
            },
            "orbit": {
                "radius": round(self.compute_orbit_radius(), 3),
                "stable": self.orbit_stable,
                "status": self.orbit_status
            },
            "energy": self.energy.to_dict(),
            "blocked": self.twin.P >= self.P_TH or not self.orbit_stable,
            "block_reason": f"Orbit {self.orbit_status}" if not self.orbit_stable else (f"Pressure critical: {self.twin.P:.2f}" if self.twin.P >= self.P_TH else ""),
            "planet_progress": max(0, min(1, self.twin.K - self.twin.P * 0.3))
        }
    
    def get_logs(self, limit: int = 20) -> List[Dict]:
        return [{"tick": l.tick, "type": l.event_type, "data": l.data} for l in self.logs[-limit:]]
    
    def reset(self):
        self.twin = TwinState()
        self.energy = EnergyField()
        self.gravity = InnerGravity()
        self.brain = BrainState()
        self.orbit_stable = True
        self.orbit_status = "STABLE"
        self.logs = []
        self.tick_count = 0

_sun = SolarEntity()

def get_sun() -> SolarEntity:
    return _sun
