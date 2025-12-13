"""
AUTUS Solar Entity - Pressure Loop v1.0 (Physics Lock)
재현 가능한 자율 안정화 루프
"""
from dataclasses import dataclass, field
from typing import Dict, List
import time

@dataclass
class EventLog:
    """이벤트 로그"""
    timestamp: float
    tick: int
    event_type: str  # INPUT, AUTO_INTERVENTION, TRANSITION, CYCLE_UP
    data: Dict

@dataclass
class TwinState:
    """핵심 상태 변수 (단일 진실)"""
    P: float = 0.0      # Pressure
    E: float = 1.0      # Energy
    K: float = 0.5      # Engines (자동개입 대상)
    C: int = 0          # Cycle
    was_unstable: bool = False  # 전이 감지용

@dataclass 
class EnergyField:
    """계기판 (결과 반영)"""
    brain: float = 0.5
    sensors: float = 0.5
    heart: float = 0.5
    core: float = 1.0
    engines: float = 0.5
    base: float = 0.5
    boundary: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "Brain": self.brain, "Sensors": self.sensors, "Heart": self.heart,
            "Core": self.core, "Engines": self.engines, "Base": self.base, 
            "Boundary": self.boundary
        }

@dataclass
class SolarEntity:
    """AUTUS Solar - Pressure Loop v1.0"""
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    
    # 핵심 상태
    twin: TwinState = field(default_factory=TwinState)
    energy: EnergyField = field(default_factory=EnergyField)
    
    # 이벤트 로그
    logs: List[EventLog] = field(default_factory=list)
    tick_count: int = 0
    
    # === Physics Constants (LOCKED) ===
    ALPHA: float = 1.0      # Load 계수
    BETA: float = 0.8       # 엔진 완화 계수
    GAMMA: float = 0.05     # Energy 감쇠 계수
    P_TH: float = 1.0       # 임계 압력 (자동개입 트리거)
    DELTA: float = 0.2      # 자동개입 증가량
    P_STABLE: float = 0.20  # 안정 판정 압력
    E_MIN: float = 0.40     # 최소 에너지 (안정 조건)
    
    def _log(self, event_type: str, data: Dict):
        """이벤트 로깅"""
        self.logs.append(EventLog(
            timestamp=time.time(),
            tick=self.tick_count,
            event_type=event_type,
            data=data
        ))
        # 최근 100개만 유지
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]
    
    def apply_input(self, slot: str, value: float):
        """외력 입력 (PRESSURE/RELEASE)"""
        if slot.lower() == "boundary":
            # PRESSURE: value > 0.5 → Load = +1
            # RELEASE: value < 0.5 → Load = -1
            load = 1.0 if value > 0.5 else -1.0
            self._log("INPUT", {"slot": slot, "value": value, "load": load})
            self._tick(load)
        else:
            # 다른 슬롯은 직접 반영 (계기판 조정)
            slot_lower = slot.lower()
            if hasattr(self.energy, slot_lower):
                current = getattr(self.energy, slot_lower)
                new_value = max(0, min(1, current + (value - current) * 0.3))
                setattr(self.energy, slot_lower, new_value)
    
    def tick(self) -> Dict:
        """수동 CYCLE (Load=0)"""
        self._tick(0.0)
        return self.snapshot()
    
    def _tick(self, load: float):
        """
        Physics Loop v1.0 (고정 수식)
        1. P(t+1) = max(0, P(t) + α·Load − β·K)
        2. E(t+1) = max(0, E(t) − γ·P(t+1))
        3. 자동개입: if P ≥ P_th → K = min(1, K + δ)
        4. 전이 감지: 불안정→안정 시 C += 1 (단발성)
        5. 계기판 갱신
        """
        self.tick_count += 1
        old_P = self.twin.P
        old_K = self.twin.K
        
        # 1. Pressure 계산
        new_P = max(0, self.twin.P + self.ALPHA * load - self.BETA * self.twin.K)
        self.twin.P = new_P
        
        # 2. Energy 감쇠
        new_E = max(0, self.twin.E - self.GAMMA * new_P)
        self.twin.E = new_E
        
        # 3. 자동개입 (임계치 도달 시)
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
        
        # 4. 전이 감지 (불안정→안정, 단발성)
        is_stable = (new_P <= self.P_STABLE) and (new_E >= self.E_MIN)
        if is_stable and self.twin.was_unstable:
            self.twin.C += 1
            self._log("TRANSITION", {
                "type": "unstable→stable",
                "P": new_P,
                "E": new_E,
                "cycle": self.twin.C
            })
            self.twin.was_unstable = False
        
        # 5. 계기판 갱신 (결과 반영)
        self._update_dashboard()
        
        self._log("TICK", {
            "load": load,
            "P": new_P,
            "E": new_E,
            "K": self.twin.K,
            "C": self.twin.C
        })
    
    def _update_dashboard(self):
        """계기판 갱신 (P 기반)"""
        p_factor = 1 - min(1, self.twin.P)
        self.energy.brain = 0.50 + 0.10 * p_factor
        self.energy.sensors = 0.50 + 0.10 * p_factor
        self.energy.heart = 0.50 + 0.10 * p_factor
        self.energy.engines = self.twin.K
        self.energy.boundary = min(1, self.twin.P)
        # Core, Base 고정
        self.energy.core = 1.0
        self.energy.base = 0.5
    
    def snapshot(self) -> Dict:
        """상태 스냅샷"""
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
            "energy": self.energy.to_dict(),
            "blocked": self.twin.P >= self.P_TH,
            "block_reason": f"Pressure critical: {self.twin.P:.2f}" if self.twin.P >= self.P_TH else "",
            "planet_progress": max(0, min(1, self.twin.K - self.twin.P * 0.3))
        }
    
    def get_logs(self, limit: int = 20) -> List[Dict]:
        """최근 로그"""
        return [
            {"tick": l.tick, "type": l.event_type, "data": l.data}
            for l in self.logs[-limit:]
        ]
    
    def reset(self):
        """초기화"""
        self.twin = TwinState()
        self.energy = EnergyField()
        self.logs = []
        self.tick_count = 0

# 싱글톤
_sun = SolarEntity()

def get_sun() -> SolarEntity:
    return _sun
