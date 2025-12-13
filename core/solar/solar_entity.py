"""
AUTUS Solar Entity - Gravity Physics v1.1
중력 기반 물리 엔진 + Pressure Loop
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
    talent: float = 0.5      # T: 고정 성향 (천천히 변화)
    effort: float = 0.0      # E: 누적 노력
    context: float = 0.5     # C: 환경/조건
    
    # 가중치 (LOCKED)
    W1: float = 0.4  # Talent
    W2: float = 0.4  # Effort (log)
    W3: float = 0.2  # Context
    KAPPA: float = 1.0  # 스케일 상수
    
    def compute_mass(self) -> float:
        """중력 질량: M = w1·T + w2·log(1+E) + w3·C"""
        return (self.W1 * self.talent + 
                self.W2 * math.log(1 + self.effort) + 
                self.W3 * self.context)
    
    def compute_gravity(self) -> float:
        """중력장: G = κ · M"""
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
class TwinState:
    """핵심 상태 변수"""
    P: float = 0.0      # Pressure
    E: float = 1.0      # Energy
    K: float = 0.5      # Engines
    C: int = 0          # Cycle
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
    """AUTUS Solar - Gravity Physics v1.1"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    gravity: InnerGravity = field(default_factory=InnerGravity)
    
    logs: List[EventLog] = field(default_factory=list)
    tick_count: int = 0
    
    # Physics Constants (LOCKED)
    ALPHA: float = 1.0
    BETA: float = 0.8
    GAMMA: float = 0.05
    P_TH: float = 1.0
    DELTA: float = 0.2
    P_STABLE: float = 0.20
    E_MIN: float = 0.40
    
    # Gravity Constants (LOCKED)
    EFFORT_GAIN: float = 0.1      # PRESSURE 시 노력 증가
    EFFORT_DECAY: float = 0.01   # 자연 감소
    CONTEXT_GAIN: float = 0.05   # 안정 시 환경 개선
    CONTEXT_LOSS: float = 0.1    # 실패 시 환경 악화
    
    def _log(self, event_type: str, data: Dict):
        self.logs.append(EventLog(time.time(), self.tick_count, event_type, data))
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]
    
    def apply_input(self, slot: str, value: float):
        """외력 입력"""
        if slot.lower() == "boundary":
            load = 1.0 if value > 0.5 else -1.0
            
            # 중력 영향: PRESSURE → Effort 증가
            if load > 0:
                self.gravity.effort += self.EFFORT_GAIN
                self._log("GRAVITY_EFFORT", {
                    "cause": "PRESSURE",
                    "effort_delta": self.EFFORT_GAIN,
                    "effort_new": self.gravity.effort
                })
            
            self._log("INPUT", {"slot": slot, "value": value, "load": load})
            self._tick(load)
        else:
            slot_lower = slot.lower()
            if hasattr(self.energy, slot_lower):
                current = getattr(self.energy, slot_lower)
                new_value = max(0, min(1, current + (value - current) * 0.3))
                setattr(self.energy, slot_lower, new_value)
    
    def tick(self) -> Dict:
        self._tick(0.0)
        return self.snapshot()
    
    def _tick(self, load: float):
        """Physics + Gravity Loop"""
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
                self._log("AUTO_INTERVENTION", {
                    "trigger": "P >= P_TH",
                    "P": new_P,
                    "K_old": self.twin.K,
                    "K_new": new_K
                })
            self.twin.K = new_K
            self.twin.was_unstable = True
            
            # 중력 영향: 과압 → Context 감소
            self.gravity.context = max(0, self.gravity.context - self.CONTEXT_LOSS * 0.5)
        
        # 전이 감지
        is_stable = (new_P <= self.P_STABLE) and (new_E >= self.E_MIN)
        if is_stable and self.twin.was_unstable:
            self.twin.C += 1
            
            # 중력 영향: 안정화 성공 → Context 증가
            self.gravity.context = min(1, self.gravity.context + self.CONTEXT_GAIN)
            
            self._log("TRANSITION", {
                "type": "unstable→stable",
                "P": new_P,
                "E": new_E,
                "cycle": self.twin.C,
                "gravity": self.gravity.to_dict()
            })
            self.twin.was_unstable = False
        
        # === GRAVITY PHYSICS ===
        # 노력 자연 감소
        if load == 0 and self.gravity.effort > 0:
            self.gravity.effort = max(0, self.gravity.effort - self.EFFORT_DECAY)
        
        # 중력 기반 궤도 계산
        G = self.gravity.compute_gravity()
        
        # 계기판 갱신 (중력 반영)
        self._update_dashboard(G)
        
        self._log("TICK", {
            "load": load,
            "P": round(new_P, 3),
            "E": round(new_E, 3),
            "K": round(self.twin.K, 3),
            "C": self.twin.C,
            "gravity": self.gravity.to_dict()
        })
    
    def _update_dashboard(self, G: float):
        """계기판 갱신 (P + 중력 기반)"""
        p_factor = 1 - min(1, self.twin.P)
        g_factor = min(1, G)  # 중력 영향
        
        # Brain/Sensors/Heart: P가 낮고 G가 높을수록 안정
        self.energy.brain = 0.50 + 0.10 * p_factor + 0.10 * g_factor
        self.energy.sensors = 0.50 + 0.10 * p_factor + 0.08 * g_factor
        self.energy.heart = 0.50 + 0.10 * p_factor + 0.05 * g_factor
        
        self.energy.engines = self.twin.K
        self.energy.boundary = min(1, self.twin.P)
        
        # Base: 중력 기반
        self.energy.base = 0.40 + 0.30 * g_factor
        
        self.energy.core = 1.0
    
    def compute_orbit_radius(self, planet_index: int = 0) -> float:
        """궤도 반경: R = R_base / (1 + G)"""
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
            "twin": {
                "P": round(self.twin.P, 3),
                "E": round(self.twin.E, 3),
                "K": round(self.twin.K, 3),
                "C": self.twin.C
            },
            "gravity": self.gravity.to_dict(),
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
        self.logs = []
        self.tick_count = 0

_sun = SolarEntity()

def get_sun() -> SolarEntity:
    return _sun
