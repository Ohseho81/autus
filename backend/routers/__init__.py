"""
AUTUS Routers
=============

FastAPI 라우터 모듈

v4.0.0:
  - task_router: 570개 업무 K/I/r 개인화 API

v4.1.0:
  - ki_router: K/I Physics 통합 API
  - oauth_router: OAuth 연동 API

v5.0.0:
  - task_570_router: 8그룹 570개 업무 + K/I/Ω 물리 엔진 API
"""

from .ki_router import router as ki_router
from .oauth_router import router as oauth_router
from .task_router import router as task_router
from .task_570_router import router as task_570_router

__all__ = ["ki_router", "oauth_router", "task_router", "task_570_router"]
