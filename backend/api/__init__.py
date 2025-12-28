"""
AUTUS API Routes
================

FastAPI API 라우터 모음

Modules:
- autopilot_routes: 자동화 시스템 API
- scheduler_routes: 스케줄러 및 알림 API
"""

from .autopilot_routes import router as autopilot_router
from .scheduler_routes import router as scheduler_router

__all__ = [
    "autopilot_router",
    "scheduler_router",
]
