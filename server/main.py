"""
AUTUS - Autonomous Universal Thinking & Understanding System
Main FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path

try:
    import sys
    ROOT = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(ROOT))
    from config import (
        PACKS_DEVELOPMENT_DIR,
        PACKS_EXAMPLES_DIR,
        LOGS_DIR,
        CELL_LOGS_DIR
    )
except ImportError:
    # fallback
    PACKS_DEVELOPMENT_DIR = Path("packs/development")
    PACKS_EXAMPLES_DIR = Path("packs/examples")
    LOGS_DIR = Path("logs")
    CELL_LOGS_DIR = LOGS_DIR / "cells" if LOGS_DIR.exists() else None

# Lifespan 이벤트 핸들러
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 AUTUS 시작...")
    yield
    # Shutdown
    print("🛑 AUTUS 종료...")

app = FastAPI(
    title="AUTUS",
    description="Self-Evolving AI Operating System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception as e:
    print(f"⚠️ Static files mount 실패: {e}")

@app.get("/")
async def root():
    """AUTUS 루트 엔드포인트"""
    return {
        "message": "AUTUS - Autonomous Universal Thinking & Understanding System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    """헬스 체크"""
    return {
        "status": "healthy",
        "layers": {
            "core": "OK",
            "packs": "OK",
            "protocols": "OK",
            "server": "OK"
        },
        "features": {
            "cell_system": "active",
            "pack_generator": "active",
            "cache": "active"
        }
    }

@app.get("/api/cells")
async def list_cells():
    """Cell 목록 조회"""
    cells = []

    if CELL_LOGS_DIR and CELL_LOGS_DIR.exists():
        for log_file in CELL_LOGS_DIR.glob("*.jsonl"):
            cells.append({
                "name": log_file.stem,
                "log_file": str(log_file)
            })

    return {
        "status": "success",
        "count": len(cells),
        "cells": cells
    }

@app.get("/api/packs")
async def list_packs():
    """Pack 목록 조회"""
    packs = []

    # Development packs 스캔
    if PACKS_DEVELOPMENT_DIR.exists():
        for pack_file in PACKS_DEVELOPMENT_DIR.glob("*.yaml"):
            packs.append({
                "name": pack_file.stem,
                "path": str(pack_file),
                "type": "development"
            })

    # Example packs 스캔
    if PACKS_EXAMPLES_DIR.exists():
        for pack_file in PACKS_EXAMPLES_DIR.glob("*.yaml"):
            packs.append({
                "name": pack_file.stem,
                "path": str(pack_file),
                "type": "example"
            })

    return {
        "status": "success",
        "count": len(packs),
        "packs": packs
    }


# ============================================
# Auto-generated routers (AUTUS Meta-Circular)
# ============================================
try:
    from server.routes.hello import router as hello_router
    from server.routes.identity_core import router as identity_core_router
    from server.routes.pattern_learner import router as pattern_learner_router
    from server.routes.saas_adapter import router as saas_adapter_router
    
    app.include_router(hello_router, tags=["autogen"])
    app.include_router(identity_core_router, tags=["autogen"])
    app.include_router(pattern_learner_router, tags=["autogen"])
    app.include_router(saas_adapter_router, tags=["autogen"])
    print("✅ Autogen routers loaded")
except ImportError as e:
    print(f"⚠️ Some autogen routers not loaded: {e}")


# Project-specific routers
try:
    from server.routes.emo_cmms import router as emo_cmms_router
    from server.routes.jeju_school import router as jeju_school_router
    from server.routes.nba_atb import router as nba_atb_router
    
    app.include_router(emo_cmms_router, tags=["projects"])
    app.include_router(jeju_school_router, tags=["projects"])
    app.include_router(nba_atb_router, tags=["projects"])
    print("✅ Project routers loaded")
except ImportError as e:
    print(f"⚠️ Project routers not loaded: {e}")


# ============================================
# 6 Core Endpoints (MVP Loop)
# ============================================
try:
    from server.routes.emo_cmms import router as emo_cmms_router
    from server.routes.jeju_school import router as jeju_school_router
    from server.routes.nba_atb import router as nba_atb_router
    from server.routes.local_memory import router as local_memory_router
    from server.routes.style_analyzer import router as style_analyzer_router
    from server.routes.zero_identity import router as zero_identity_router
    
    app.include_router(emo_cmms_router, tags=["projects"])
    app.include_router(jeju_school_router, tags=["projects"])
    app.include_router(nba_atb_router, tags=["projects"])
    app.include_router(local_memory_router, tags=["core"])
    app.include_router(style_analyzer_router, tags=["core"])
    app.include_router(zero_identity_router, tags=["core"])
    print("✅ 6 Core Endpoints loaded")
except ImportError as e:
    print(f"⚠️ Some endpoints not loaded: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
