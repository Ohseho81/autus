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
