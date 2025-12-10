"""
AUTUS OS v1.0 - Main API Server
National Meaning Layer + CORE Packs + E2E Pipeline
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

app = FastAPI(
    title="AUTUS OS",
    description="Zero-Action Operating System for Human Civilization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 라우터 등록 ===
from app.api.gov_national import router as gov_router
from app.api.kernel_router import router as kernel_router
from app.api.e2e_router import router as e2e_router

app.include_router(gov_router)
app.include_router(kernel_router)
app.include_router(e2e_router)


@app.get("/")
def root():
    return {
        "name": "AUTUS OS",
        "version": "1.0.0",
        "tagline": "Zero-Action Operating System for Human Civilization",
        "endpoints": {
            "national": "/gov/national - National Meaning Layer",
            "kernel": "/kernel - CORE Packs",
            "e2e": "/e2e - End-to-End Pipeline",
            "docs": "/docs - API Documentation",
        },
    }


@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
