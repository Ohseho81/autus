"""
AUTUS Solar Entity - Gravity Physics v1.2
Brain Loop + Pressure Loop + Gravity
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
    """내면 중력 상태"""
    talent: float = 0.5
    effort: float = 0.0
    context: float = 0.5
    
    W1: float = 0.4
    W2: float = 0.4
    W3: float = 0.2
    KAPPA: float = 1.0
    
    def compute_mass(self) -> float:
        return (self.W1 * self.talent + 
                self.W2 * math.log(1 + self.effort) + 
                self.W3 * self.context)
    
    def compute_gravity(self) -> float:
        return self.KAPPA * self.compute_mass()
    
    def to_dict(self) -> Dict:
        return {
            "talent": round(self.talent, 3),
            "effort": round(self.effort, 3),
            "context": round(self.context, 3),
            "mass": round(self.compute_mass(), 3),
            "gravity": round(self.compute_gravity(), 3)
        }

@dataclass
class BrainState:
    """Brain Loop 상태"""
    focus: float = 0.5      # 집중도
    clarity: float = 0.5    # 명확도
    load: float = 0.0       # 인지 부하
    
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
    """핵심 상태 변수"""
    P: float = 0.0
    E: float = 1.0
    K: float = 0.5
    C: int = 0
    was_unstable: bool = False

@dataclass 
class EnergyField:
    """계기판"""
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
    """AUTUS Solar - Gravity Physics v1.2 + Brain Loop"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    brain: BrainState = field(default_factory=BrainState)
    
    logs: List[EventLog] = field(default_factory=list)
    tick_count: int = 0
    
    # Pressure Constants
    ALPHA: float = 1.0
    BETA: float = 0.8
    GAMMA: float = 0.05
    P_TH: float = 1.0
    DELTA: float = 0.2
    P_STABLE: float = 0.20
    E_MIN: float = 0.40
    
    # Gravity Constants
    EFFORT_GAIN: float = 0.1
    EFFORT_DECAY: float = 0.01
    CONTEXT_GAIN: float = 0.05
    CONTEXT_LOSS: float = 0.1
    
    # Brain Constants
    BRAIN_FOCUS_GAIN: float = 0.1
    BRAIN_LOAD_FACTOR: float = 0.3
    
    def _log(self, event_type: str, data: Dict):
        self.logs.append(EventLog(time.time(), self.tick_count, event_type, data))
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]
    
    def apply_input(self, slot: str, value: float):
        """외력 입력"""
        slot_lower = slot.lower()
        
        if slot_lower == "boundary":
            load = 1.0 if value > 0.5 else -1.0
            
            # Gravity: PRESSURE → Effort 증가
            if load > 0:
                self.gravity.effort += self.EFFORT_GAIN
                self._log("GRAVITY_EFFORT", {"cause": "PRESSURE", "effort_delta": self.EFFORT_GAIN, "effort_new": self.gravity.effort})
            
            self._log("INPUT", {"slot": slot, "value": value, "load": load})
            self._tick(load)
            
        elif slot_lower == "brain":
            # Brain Loop: Focus 증가, Load 증가
            self.brain.focus = min(1.0, self.brain.focus + self.BRAIN_FOCUS_GAIN)
            self.brain.load = min(1.0, self.brain.load + self.BRAIN_LOAD_FACTOR)
            
            # Focus → Talent 영향
            if self.brain.focus > 0.7:
                self.gravity.talent = min(1.0, self.gravity.talent + 0.02)
            
            self._log("BRAIN_INPUT", {
                "focus": self.brain.focus,
                "load": self.brain.load,
                "talent_effect": self.gravity.talent
            })
            self._tick(0)
            
        elif slot_lower == "sensors":
            # Sensors → Clarity 증가
            self.brain.clarity = min(1.0, self.brain.clarity + 0.1)
            
            # Clarity → Context 영향
            if self.brain.clarity > 0.6:
                self.gravity.context = min(1.0, self.gravity.context + 0.02)
            
            self._log("SENSORS_INPUT", {
                "clarity": self.brain.clarity,
                "context_effect": self.gravity.context
            })
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
        """Physics + Gravity + Brain Loop"""
        self.tick_count += 1
        
        # === PRESSURE PHYSICS ===
        new_P = max(0, self.twin.P + self.ALPHA * load - self.BETA * self.twin.K)
        self.twin.P = new_P
        
        new_E = max(0, self.twin.E - self.GAMMA * new_P)
        self.twin.E = new_E
        
        # 자동개입
        if new_P >= self.P_TH:
            new_K = min(1.0, self.twin.K + self.DELTA)
            if new_K != self.twin.K:
                self._log("AUTO_INTERVENTION", {"trigger": "P >= P_TH", "P": new_P, "K_old": self.twin.K, "K_new": new_K})
            self.twin.K = new_K
            self.twin.was_unstable = True
            self.gravity.context = max(0, self.gravity.context - self.CONTEXT_LOSS * 0.5)
            
            # Brain: 압력 → Load 증가
            self.brain.load = min(1.0, self.brain.load + 0.2)
        
        # 전이 감지
        is_stable = (new_P <= self.P_STABLE) and (new_E >= self.E_MIN)
        if is_stable and self.twin.was_unstable:
            self.twin.C += 1
            self.gravity.context = min(1, self.gravity.context + self.CONTEXT_GAIN)
            
            # Brain: 안정화 → Clarity 증가
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
        # Focus 자연 감쇠
        if self.brain.focus > 0.3:
            self.brain.focus = max(0.3, self.brain.focus - self.brain.FOCUS_DECAY)
        
        # Load 자연 회복
        if self.brain.load > 0:
            self.brain.load = max(0, self.brain.load - 0.03)
        
        # Load 과부하 → Focus 급락
        if self.brain.load >= self.brain.LOAD_THRESHOLD:
            self.brain.focus *= 0.9
            self._log("BRAIN_OVERLOAD", {"load": self.brain.load, "focus_drop": self.brain.focus})
        
        # Clarity → Sensors 영향
        if self.brain.clarity > 0.5:
            self.brain.clarity = max(0.3, self.brain.clarity - 0.01)
        
        # === GRAVITY PHYSICS ===
        if load == 0 and self.gravity.effort > 0:
            self.gravity.effort = max(0, self.gravity.effort - self.EFFORT_DECAY)
        
        G = self.gravity.compute_gravity()
        self._update_dashboard(G)
        
        self._log("TICK", {
            "load": load,
            "P": round(new_P, 3),
            "E": round(new_E, 3),
            "K": round(self.twin.K, 3),
            "C": self.twin.C,
            "gravity": self.gravity.to_dict(),
            "brain": self.brain.to_dict()
        })
    
    def _update_dashboard(self, G: float):
        """계기판 갱신"""
        p_factor = 1 - min(1, self.twin.P)
        g_factor = min(1, G)
        
        # Brain: Focus + Clarity 반영
        self.energy.brain = 0.40 + 0.30 * self.brain.focus + 0.20 * self.brain.clarity
        self.energy.sensors = 0.40 + 0.30 * self.brain.clarity + 0.10 * g_factor
        self.energy.heart = 0.50 + 0.10 * p_factor + 0.05 * g_factor
        self.energy.engines = self.twin.K
        self.energy.boundary = min(1, self.twin.P)
        self.energy.base = 0.40 + 0.30 * g_factor
        self.energy.core = 1.0
    
    def compute_orbit_radius(self, planet_index: int = 0) -> float:
        G = self.gravity.compute_gravity()
        R_base = 2.0 + planet_index * 0.5
        return R_base / (1 + G * 0.5)
    
    def snapshot(self) -> Dict:
        G = self.gravity.compute_gravity()
        return {
            "id": self.id,
            "name": self.name,
            "cycle": self.twin.C,
            "tick": self.tick_count,
            "twin": {"P": round(self.twin.P, 3), "E": round(self.twin.E, 3), "K": round(self.twin.K, 3), "C": self.twin.C},
            "gravity": self.gravity.to_dict(),
            "brain": self.brain.to_dict(),
            "orbit_radius": round(self.compute_orbit_radius(), 3),
            "energy": self.energy.to_dict(),
            "blocked": self.twin.P >= self.P_TH,
            "block_reason": f"Pressure critical: {self.twin.P:.2f}" if self.twin.P >= self.P_TH else "",
            "planet_progress": max(0, min(1, self.twin.K - self.twin.P * 0.3))
        }
    
    def get_logs(self, limit: int = 20) -> List[Dict]:
        return [{"tick": l.tick, "type": l.event_type, "data": l.data} for l in self.logs[-limit:]]
    
    def reset(self):
        self.twin = TwinState()
        self.energy = EnergyField()
        self.gravity = InnerGravity()
        self.brain = BrainState()
        self.logs = []
        self.tick_count = 0

_sun = SolarEntity()

def get_sun() -> SolarEntity:
    return _sun
