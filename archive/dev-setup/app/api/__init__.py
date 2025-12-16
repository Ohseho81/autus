# app/api/__init__.py
"""
AUTUS API Routers
"""

from app.api.events import router as events_router
from app.api.shadow import router as shadow_router
from app.api.orbit import router as orbit_router
from app.api.sim import router as sim_router
from app.api.replay import router as replay_router

__all__ = [
    "events_router",
    "shadow_router",
    "orbit_router",
    "sim_router",
    "replay_router",
]
