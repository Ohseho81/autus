from dataclasses import dataclass, field
from typing import List
from enum import Enum

@dataclass
class Constraint:
    constraint_id: str
    pressure: float
    active: bool = False

@dataclass
class KernelState:
    cycle: int = 0
    energy: dict = field(default_factory=lambda: {
        "Brain": 0.5, "Sensors": 0.5, "Heart": 0.5,
        "Core": 1.0, "Engines": 0.5, "Base": 0.5, "Boundary": 0.0
    })
    constraints: List[Constraint] = field(default_factory=list)
    boundary_pressure: float = 0.0
    blocked: bool = False
    block_cause: str = ""
    block_code: str = ""
    planet_progress: float = 0.5

class PhysicsKernel:
    BLOCK_THRESHOLD = 0.25
    
    def __init__(self):
        self.state = KernelState()
        self.state.constraints = [
            Constraint("BND_VISA_D14", 0.30, False),
            Constraint("BND_VISA_D7", 0.50, False),
            Constraint("BND_WORK_HOUR", 0.20, False),
        ]
    
    def toggle_constraint(self, cid: str, active: bool):
        for c in self.state.constraints:
            if c.constraint_id == cid:
                c.active = active
    
    def apply_energy(self, slot: str, value: float):
        if slot in self.state.energy:
            current = self.state.energy[slot]
            self.state.energy[slot] = max(0, min(1, current + (value - current) * 0.3))
    
    def cycle(self):
        self.state.cycle += 1
        bp = sum(c.pressure for c in self.state.constraints if c.active)
        bp += self.state.energy.get("Boundary", 0)
        self.state.boundary_pressure = min(1.0, bp)
        
        if bp >= self.BLOCK_THRESHOLD:
            active = [c for c in self.state.constraints if c.active]
            self.state.block_code = active[0].constraint_id if active else "BND_PRESSURE"
            self.state.blocked = True
            self.state.block_cause = "BOUNDARY"
        else:
            self.state.blocked = False
            self.state.block_cause = ""
            self.state.block_code = ""
        
        self.state.planet_progress = max(0, min(1, self.state.energy.get("Engines", 0.5) - bp * 0.5))
        return self.get_state()
    
    def get_state(self):
        return {
            "cycle": self.state.cycle,
            "energy": self.state.energy,
            "boundary_pressure": self.state.boundary_pressure,
            "blocked": self.state.blocked,
            "block_reason": f"{self.state.block_cause}: {self.state.block_code}" if self.state.blocked else "",
            "planet_progress": self.state.planet_progress,
            "constraints": [{"id": c.constraint_id, "pressure": c.pressure, "active": c.active} for c in self.state.constraints]
        }
    
    def reset(self):
        self.__init__()

kernel = PhysicsKernel()
