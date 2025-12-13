"""
Solar Entity - 태양 (사용자 개체)
모든 계산의 기준 좌표계
"""
from dataclasses import dataclass, field
from typing import List, Dict
from .energy_field import EnergyField
from .planet import Planet
from .block_state import BlockState, BlockCause, BlockCode

@dataclass
class SolarEntity:
    """태양 = 사용자 개체"""
    id: str
    name: str
    energy: EnergyField = field(default_factory=EnergyField)
    planets: List[Planet] = field(default_factory=list)
    block: BlockState = field(default_factory=BlockState)
    cycle: int = 0
    
    def tick(self, dt: float = 1.0) -> Dict:
        """한 사이클 실행"""
        self.cycle += 1
        
        # 행성 계산
        time_factor = min(1.0, self.cycle * 0.1)
        
        planet_work = Planet.compute_work(self.energy, time_factor)
        planet_growth = Planet.compute_growth(self.energy, time_factor)
        
        self.planets = [planet_work, planet_growth]
        
        # Boundary 체크 (압력이 높으면 차단)
        if self.energy.boundary > 0.8:
            self.block.block_by_boundary(
                BlockCode.BND_UNDEFINED,
                f"Boundary pressure {self.energy.boundary:.0%}",
                "Reduce boundary pressure below 80%"
            )
        # Guardrail 체크 (Core가 낮으면 차단)
        elif self.energy.core < 0.2:
            self.block.block_by_guardrail(
                BlockCode.GRD_CRITICAL,
                f"Core integrity {self.energy.core:.0%}",
                "Restore core above 20%"
            )
        else:
            self.block.unblock()
        
        return self.snapshot()
    
    def apply_input(self, slot: str, value: float):
        """에너지 입력"""
        self.energy.apply_input(slot, value)
    
    def snapshot(self) -> Dict:
        """현재 상태 스냅샷"""
        return {
            "id": self.id,
            "name": self.name,
            "cycle": self.cycle,
            "energy": self.energy.to_dict(),
            "stability": round(self.energy.compute_stability(), 4),
            "vitality": round(self.energy.compute_vitality(), 4),
            "gravity": round(self.energy.compute_gravity(), 4),
            "planets": [{"id": p.id, "name": p.name, "progress": p.progress, "status": p.status, "orbit": p.orbit_radius} for p in self.planets],
            "block": {
                "is_blocked": self.block.is_blocked,
                "level": self.block.level.value,
                "cause": self.block.cause.value,
                "code": self.block.code.value,
                "reason": self.block.reason,
                "unblock": self.block.unblock_condition
            }
        }
