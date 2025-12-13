"""AUTUS Main Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="AUTUS", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from app.routers import autus_solar, autus_galaxy

app.include_router(autus_solar.router)
app.include_router(autus_galaxy.router)

# Frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path, html=True), name="frontend")
    print("✅ Frontend mounted")

@app.get("/")
def root():
    return {"status": "AUTUS v1.0", "endpoints": ["/autus/solar", "/autus/galaxy"]}

print("✅ AUTUS v1.0 Ready")
