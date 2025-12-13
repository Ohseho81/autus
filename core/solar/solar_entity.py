"""
AUTUS Solar Entity - Complete Pressure Loop
"""
from dataclasses import dataclass, field
from typing import Dict

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
            "Brain": self.brain, "Sensors": self.sensors, "Heart": self.heart,
            "Core": self.core, "Engines": self.engines, "Base": self.base, "Boundary": self.boundary
        }

@dataclass
class SolarEntity:
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    energy: EnergyField = field(default_factory=EnergyField)
    cycle: int = 0
    blocked: bool = False
    block_reason: str = ""
    planet_progress: float = 0.5
    
    # Physics Constants
    BLOCK_THRESHOLD: float = 0.25
    UNBLOCK_THRESHOLD: float = 0.15
    PRESSURE_DECAY: float = 0.02
    ENGINE_DECAY: float = 0.1
    ENGINE_RECOVERY: float = 0.02
    
    def apply_input(self, slot: str, value: float):
        """에너지 입력"""
        slot_lower = slot.lower()
        if hasattr(self.energy, slot_lower):
            current = getattr(self.energy, slot_lower)
            new_value = max(0, min(1, current + (value - current) * 0.3))
            setattr(self.energy, slot_lower, new_value)
    
    def tick(self) -> Dict:
        """
        Complete Pressure Loop (자동 반응)
        1. Cycle 증가
        2. Pressure → Engines 감쇠
        3. 임계치 → BLOCKED
        4. 자동 회복
        5. Planet Progress 계산
        """
        self.cycle += 1
        
        # 1. Boundary Pressure 자연 감쇠
        if self.energy.boundary > 0:
            self.energy.boundary = max(0, self.energy.boundary - self.PRESSURE_DECAY)
        
        # 2. Pressure → Engines 감쇠
        pressure_effect = self.energy.boundary * self.ENGINE_DECAY
        self.energy.engines = max(0, self.energy.engines - pressure_effect)
        
        # 3. BLOCKED 판정 (단일 원인)
        if self.energy.boundary >= self.BLOCK_THRESHOLD:
            self.blocked = True
            self.block_reason = "Boundary pressure critical"
            # 급격한 감쇠
            self.energy.engines *= 0.8
        elif self.energy.core < 0.2:
            self.blocked = True
            self.block_reason = "Core integrity low"
        elif self.blocked and self.energy.boundary < self.UNBLOCK_THRESHOLD:
            # 4. 자동 회복
            self.blocked = False
            self.block_reason = ""
        
        # 5. 자동 회복 (ACTIVE 상태)
        if not self.blocked:
            self.energy.engines = min(1, self.energy.engines + self.ENGINE_RECOVERY)
        
        # 6. Planet Progress = Engines - Boundary
        self.planet_progress = max(0, min(1, self.energy.engines - self.energy.boundary * 0.5))
        
        # 7. Core 자연 회복
        if self.energy.core < 1.0 and not self.blocked:
            self.energy.core = min(1, self.energy.core + 0.01)
        
        return self.snapshot()
    
    def snapshot(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "cycle": self.cycle,
            "energy": self.energy.to_dict(),
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "planet_progress": self.planet_progress
        }
    
    def reset(self):
        self.energy = EnergyField()
        self.cycle = 0
        self.blocked = False
        self.block_reason = ""
        self.planet_progress = 0.5

# 싱글톤
_sun = SolarEntity()

def get_sun() -> SolarEntity:
    return _sun
