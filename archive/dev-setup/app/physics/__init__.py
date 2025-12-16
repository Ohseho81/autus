# app/physics/__init__.py
"""
AUTUS Physics Engine

- shadow_to_planets: 32D → 9 Planets
- planets_to_orbit: Planets → 3D positions
- apply_forces: Force injection (sim only)
"""

from app.physics.orbit import (
    PLANETS,
    shadow_to_planets,
    planets_to_orbit,
    apply_forces,
)
from app.physics.hash import sha256_hex, verify_chain

__all__ = [
    "PLANETS",
    "shadow_to_planets",
    "planets_to_orbit",
    "apply_forces",
    "sha256_hex",
    "verify_chain",
]
