# app/main.py
"""
AUTUS — The Operating System of Reality
"See the Future. Don't Touch It."

FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.settings import settings
from app.db import get_db, init_db, close_db
from app.schemas import HealthResponse, StatusResponse
from app.api import (
    events_router,
    shadow_router,
    orbit_router,
    sim_router,
    replay_router,
)


# ============================================
# Lifespan
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"   {settings.APP_DESCRIPTION}")
    print(f"   Debug: {settings.DEBUG}")
    
    if settings.DEBUG:
        print("   Initializing database...")
        await init_db()
    
    yield
    
    # Shutdown
    print(f"👋 Shutting down {settings.APP_NAME}")
    await close_db()


# ============================================
# Application
# ============================================

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Root Endpoints
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "tagline": "See the Future. Don't Touch It.",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check"""
    try:
        await db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False
    
    return HealthResponse(
        ok=db_connected,
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        db_connected=db_connected,
    )


@app.get("/status", response_model=StatusResponse)
async def status():
    """System status (Extension 호환)"""
    return StatusResponse(
        status="GREEN",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


# ============================================
# API Routers
# ============================================

# Core API
app.include_router(events_router, prefix="/api/v1")
app.include_router(shadow_router, prefix="/api/v1")
app.include_router(orbit_router, prefix="/api/v1")
app.include_router(sim_router, prefix="/api/v1")
app.include_router(replay_router, prefix="/api/v1")

# Extension 호환 API (prefix 없음)
app.include_router(shadow_router, prefix="/api/v1/shadow", tags=["Extension"])
app.include_router(orbit_router, prefix="/api/v1/orbit", tags=["Extension"])


# ============================================
# Run
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
