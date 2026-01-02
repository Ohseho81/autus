"""
AUTUS API - Main Application
Zero Meaning Physics Engine

V = M - T + S
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from config import settings
from database import init_db

# Configure logging
logger.remove()
logger.add(sys.stdout, colorize=True, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    # Startup
    logger.info("🚀 AUTUS API Starting...")
    await init_db()
    logger.info("✅ AUTUS API Ready!")
    logger.info(f"📍 http://{settings.HOST}:{settings.PORT}")
    logger.info(f"📚 Docs: http://{settings.HOST}:{settings.PORT}/docs")
    yield
    # Shutdown
    logger.info("👋 AUTUS API Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## AUTUS - Zero Meaning Physics Engine

### 핵심 공식
```
V = M - T + S

V = 최종 가치 (Value)
M = 직접 돈 (Money)
T = 시간 비용 (Time)  
S = 시너지 돈 (Synergy)
```

### 2버튼 시스템
- **CUT**: 노드 삭제 (V ≤ 0)
- **LINK**: 노드 연결 (모션 생성)

### Zero Meaning Lock
모든 데이터는 숫자만 (위치, 금액)
의미(이름, 역할, 국가 등)는 저장하지 않음
""",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import (
    nodes_router,
    motions_router,
    actions_router,
    auth_router,
    stats_router
)

# Include routers
app.include_router(nodes_router)
app.include_router(motions_router)
app.include_router(actions_router)
app.include_router(auth_router)
app.include_router(stats_router)


@app.get("/", tags=["root"])
async def root():
    """API 상태 확인"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "formula": "V = M - T + S",
        "docs": "/docs"
    }


@app.get("/health", tags=["root"])
async def health():
    """헬스 체크"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
