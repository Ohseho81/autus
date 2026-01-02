"""AUTUS Routers"""
from .nodes import router as nodes_router
from .motions import router as motions_router
from .actions import router as actions_router
from .auth import router as auth_router
from .stats import router as stats_router

__all__ = [
    "nodes_router",
    "motions_router", 
    "actions_router",
    "auth_router",
    "stats_router"
]











