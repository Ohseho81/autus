"""
AUTUS Solar Router - Physics v1.0
Events: PRESSURE | RELEASE | RESET | DECISION
"""
from fastapi import APIRouter
from core.solar.solar_entity import get_solar

router = APIRouter(prefix="/autus/solar", tags=["solar"])

# === SINGLE TRUTH ===
@router.get("/status")
def status():
    """GET /status → State Vector S"""
    return get_solar().status()

# === 4 EVENTS ONLY ===
@router.post("/pressure")
def pressure():
    """PRESSURE: tick+1, entropy+α"""
    return get_solar().pressure()

@router.post("/release")
def release():
    """RELEASE: tick+1, entropy-β"""
    return get_solar().release()

@router.post("/reset")
def reset():
    """RESET: tick+1, entropy=e0, cycle UNCHANGED"""
    return get_solar().reset()

@router.post("/decision")
def decision():
    """DECISION: tick+1, cycle+1, entropy×γ (Human Only)"""
    return get_solar().decision()

# === TESTING ===
@router.post("/full-reset")
def full_reset():
    """FULL RESET: all=0 (Testing)"""
    return get_solar().full_reset()

print("✅ Solar Physics v1.0 LOCKED")
