"""
AUTUS - Autonomous Universal Thinking & Understanding System
Main FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

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
            "00_system": "OK",
            "01_core": "OK",
            "02_packs": "OK",
            "03_adapters": "OK",
            "04_ops": "OK",
            "05_hud": "OK",
            "06_twin": "Ready",
            "07_memory": "OK"
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
    from pathlib import Path
    cells = []
    
    cell_logs = Path("logs/cells")
    if cell_logs.exists():
        for log_file in cell_logs.glob("*.jsonl"):
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
    from pathlib import Path
    packs = []
    
    pack_dir = Path("02_packs/builtin")
    if pack_dir.exists():
        for pack_file in pack_dir.glob("*_pack.py"):
            packs.append({
                "name": pack_file.stem,
                "path": str(pack_file),
                "type": "builtin"
            })
    
    return {
        "status": "success",
        "count": len(packs),
        "packs": packs
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
