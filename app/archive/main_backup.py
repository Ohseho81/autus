from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

app = FastAPI(title="AUTUS OS", description="Zero-Action Operating System for Human Civilization", version="1.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

from app.api.gov_national import router as gov_router
from app.api.kernel_router import router as kernel_router
from app.api.e2e_router import router as e2e_router
from app.api.hum_routes import router as hum_router
from app.api.simulation_router import router as sim_router

app.include_router(hum_router)
app.include_router(sim_router)
app.include_router(gov_router)
app.include_router(kernel_router)
app.include_router(e2e_router)

@app.get("/")
def root():
    return {
        "name": "AUTUS OS",
        "version": "1.2.0",
        "tagline": "Zero-Action Operating System for Human Civilization",
        "core_apis": {
            "hum_status": "/hum/status/{hum_id}",
            "hum_event": "/hum/event",
            "simulation": "/sim/run/{scenario_id}",
        },
        "endpoints": {
            "/hum": "Human OS (2-API)",
            "/sim": "Twin Simulation Engine",
            "/gov/national": "National Layer",
            "/kernel": "CORE Packs",
            "/e2e": "E2E Pipeline",
            "/docs": "Swagger",
        },
    }

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.2.0"}

# Static files
from fastapi.staticfiles import StaticFiles
import os
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

# Lime Kernel v3 Router
from kernel.lime.v3.router import router as lime_v3_router
app.include_router(lime_v3_router)
