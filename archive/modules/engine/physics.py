"""물리 수식 (중력/엔트로피/궤도)"""
from engine.state import SolarState

WEIGHTS = {
    "brain": 1.0,
    "heart": 1.0,
    "sensors": 1.0,
    "engines": 1.0,
    "core": 1.2,
    "base": 0.8,
    "boundary": -1.0
}

def total_energy(s: SolarState) -> float:
    return sum(getattr(s, k) * v for k, v in WEIGHTS.items())

def entropy(prev: float, unresolved: float, resolution: float) -> float:
    return max(0.0, min(1.0, prev + unresolved - resolution))

def gravity(total_e: float, ent: float, trust: float = 1.0) -> float:
    stability = 1.0 - ent
    return max(0, total_e * stability * trust / 5.0)

def effective_gravity(grav: float, pressure: float, base: float, boundary: float) -> float:
    vulnerability = (1 - base) + boundary
    return max(0, grav - pressure * vulnerability)

def orbit_radius(mass: float, grav: float) -> float:
    return mass / max(grav, 0.0001)

def orbit_stability(grav: float, ent: float, pressure: float, noise: float = 0.1) -> float:
    denom = ent + pressure + noise
    return grav / denom if denom > 0 else 2.0
