from dataclasses import dataclass, field
from typing import Dict

@dataclass
class EnergyField:
    brain: float = 0.5
    sensors: float = 0.5
    heart: float = 0.5
    core: float = 0.5
    engines: float = 0.5
    base: float = 0.5
    boundary: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "Brain": self.brain, "Sensors": self.sensors, "Heart": self.heart,
            "Core": self.core, "Engines": self.engines, "Base": self.base, "Boundary": self.boundary
        }
    
    def apply_input(self, slot: str, value: float):
        current = getattr(self, slot.lower(), 0.5)
        new_value = max(0, min(1, current + (value - current) * 0.3))
        setattr(self, slot.lower(), new_value)
        return new_value
