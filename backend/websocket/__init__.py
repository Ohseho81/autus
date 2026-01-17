"""
AUTUS WebSocket 모듈

- Physics Map WebSocket
- Dashboard WebSocket
- Flywheel WebSocket
- K/I Physics WebSocket (NEW)
"""

from .api import router as ws_router, http_router as ws_http_router
from .ki_server import (
    ki_ws_router,
    ki_http_router,
    ki_manager,
    ki_store,
    ki_heartbeat_task,
    init_ki_demo_data
)

__all__ = [
    # 기존 WebSocket
    "ws_router",
    "ws_http_router",
    # K/I WebSocket
    "ki_ws_router",
    "ki_http_router",
    "ki_manager",
    "ki_store",
    "ki_heartbeat_task",
    "init_ki_demo_data",
]
