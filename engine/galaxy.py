"""Galaxy 집계 로직"""
from typing import List, Dict
from engine.state import SolarState, Planet
from engine.physics import total_energy, gravity, orbit_radius, orbit_stability, effective_gravity
from engine.systems import systems_count

def galaxy_snapshot(state: SolarState, planets: List[Planet]) -> Dict:
    te = total_energy(state)
    ent = state.entropy
    grav = gravity(te, ent)
    eff_grav = effective_gravity(grav, state.pressure, state.base, state.boundary)
    
    return {
        "systems": systems_count(),
        "pressure": round(state.pressure, 4),
        "entropy": round(ent, 4),
        "gravity": round(eff_grav, 4),
        "total_energy": round(te, 4),
        "tick": state.tick,
        "planets": [
            {
                "id": p.id,
                "name": p.name,
                "orbit": round(orbit_radius(p.mass, eff_grav), 4),
                "stability": round(orbit_stability(eff_grav, ent, state.pressure), 4),
                "category": p.category
            }
            for p in planets
        ]
    }

def get_status(ent: float, grav: float) -> str:
    if ent >= 0.70 or (grav <= 0.15 and ent >= 0.55):
        return "RED"
    elif ent >= 0.45 or grav <= 0.30:
        return "YELLOW"
    return "GREEN"
