from dataclasses import dataclass, field
from typing import Dict, List
from .energy_field import EnergyField

@dataclass
class SolarEntity:
    id: str
    name: str
    energy: EnergyField = field(default_factory=EnergyField)
    cycle: int = 0
    blocked: bool = False
    block_reason: str = ""
    
    def tick(self) -> Dict:
        self.cycle += 1
        if self.energy.boundary > 0.8:
            self.blocked = True
            self.block_reason = "Boundary pressure too high"
        elif self.energy.core < 0.2:
            self.blocked = True
            self.block_reason = "Core integrity low"
        else:
            self.blocked = False
            self.block_reason = ""
        return self.snapshot()
    
    def apply_input(self, slot: str, value: float):
        self.energy.apply_input(slot, value)
    
    def snapshot(self) -> Dict:
        return {
            "id": self.id, "name": self.name, "cycle": self.cycle,
            "energy": self.energy.to_dict(),
            "blocked": self.blocked, "block_reason": self.block_reason
        }
