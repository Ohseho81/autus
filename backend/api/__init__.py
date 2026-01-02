"""
AUTUS-PRIME API Routers
"""
from .students import router as students_router
from .analytics import router as analytics_router
from .actions import router as actions_router

__all__ = ["students_router", "analytics_router", "actions_router"]
