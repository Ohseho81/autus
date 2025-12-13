"""AUTUS Solar Router - Physics v1.0"""
from fastapi import APIRouter
from core.solar.solar_entity import get_sun

router = APIRouter(prefix="/autus/solar", tags=["solar"])

@router.get("/status")
def status():
    """GET /status → S"""
    return get_sun().snapshot()

@router.post("/pressure")
def pressure():
    """POST /pressure → t+1, e+α"""
    return get_sun().pressure().snapshot()

@router.post("/release")
def release():
    """POST /release → t+1, e-β"""
    return get_sun().release().snapshot()

@router.post("/reset")
def reset():
    """POST /reset → t+1, e=e0, c unchanged"""
    return get_sun().reset().snapshot()

@router.post("/cycle")
def cycle():
    """POST /cycle → t+1, c+1, e×γ"""
    return get_sun().cycle().snapshot()

@router.post("/full-reset")
def full_reset():
    """POST /full-reset → all=0 (testing)"""
    return get_sun().full_reset().snapshot()

print("✅ Physics v1.0 LOCKED - Ship It")
