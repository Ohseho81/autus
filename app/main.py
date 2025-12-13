from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.autus_pipeline import router

app = FastAPI(title="Autus OS v3.8")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# === GUARDRAIL (ELON) ===
try:
    from app.routers.autus_guardrail import router as guardrail_router
    app.include_router(guardrail_router)
    print("✅ Guardrail (Elon) loaded")
except Exception as e:
    print(f"⚠️ Guardrail not loaded: {e}")

# === PH→KR TALENT PACK ===
try:
    from app.routers.autus_talent import router as talent_router
    app.include_router(talent_router)
    print("✅ PH→KR Talent Pack loaded")
except Exception as e:
    print(f"⚠️ Talent Pack not loaded: {e}")

# === FRONTEND STATIC ===
from fastapi.staticfiles import StaticFiles
try:
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")
    print("✅ Frontend mounted")
except Exception as e:
    print(f"⚠️ Frontend not mounted: {e}")

# === FRONTEND STATIC ===
from fastapi.staticfiles import StaticFiles
try:
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")
    print("✅ Frontend mounted")
except Exception as e:
    print(f"⚠️ Frontend not mounted: {e}")

# === FRONTEND ===
from fastapi.staticfiles import StaticFiles
import os
if os.path.exists("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")
    print("✅ Frontend mounted")

# === ELON QUEUE MONITOR ===
from app.middleware.queue_monitor import queue_monitor_middleware
app.state.active_requests = 0

@app.middleware("http")
async def active_request_counter(request, call_next):
    app.state.active_requests += 1
    try:
        return await call_next(request)
    finally:
        app.state.active_requests -= 1

# === TRUST PASSPORT ===
try:
    from app.routers.autus_passport import router as passport_router
    app.include_router(passport_router)
    print("✅ Trust Passport loaded")
except Exception as e:
    print(f"⚠️ Trust Passport not loaded: {e}")

# === SOLAR ENTITY ===
try:
    from app.routers.autus_solar import router as solar_router
    app.include_router(solar_router)
    print("✅ Solar Entity loaded")
except Exception as e:
    print(f"⚠️ Solar Entity not loaded: {e}")
