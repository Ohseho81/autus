"""
Planet (행성) - 에너지의 결과물
Planet = f(EnergyField, Time)
"""
from dataclasses import dataclass
from typing import Optional
from .energy_field import EnergyField

@dataclass
class Planet:
    """행성 = 태양 에너지의 결과물"""
    id: str
    name: str
    progress: float = 0.0  # 0~1
    status: str = "forming"  # forming / stable / decaying
    orbit_radius: float = 1.0
    
    @classmethod
    def compute_work(cls, energy: EnergyField, time: float) -> "Planet":
        """
        Planet_Work = f(Brain, Engines, Time) - BoundaryPressure
        """
        raw = (energy.brain * 0.4 + energy.engines * 0.5 + energy.heart * 0.1) * time
        progress = max(0, min(1, raw - energy.boundary * 0.5))
        
        status = "forming"
        if progress >= 0.8:
            status = "stable"
        elif progress <= 0.2:
            status = "decaying"
        
        orbit_radius = 1.0 + progress * 2.0  # 진행도에 따라 궤도 확장
        
        return cls(
            id="planet_work",
            name="Work",
            progress=round(progress, 4),
            status=status,
            orbit_radius=round(orbit_radius, 2)
        )
    
    @classmethod
    def compute_growth(cls, energy: EnergyField, time: float) -> "Planet":
        """
        Planet_Growth = f(Base, Core, Time)
        """
        raw = (energy.base * 0.6 + energy.core * 0.4) * time
        progress = max(0, min(1, raw))
        
        return cls(
            id="planet_growth",
            name="Growth",
            progress=round(progress, 4),
            status="stable" if progress >= 0.5 else "forming",
            orbit_radius=round(1.5 + progress * 1.5, 2)
        )
