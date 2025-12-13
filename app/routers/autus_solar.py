"""AUTUS Solar Router - Tick Equation v1.0"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.solar.solar_entity import get_sun

router = APIRouter(prefix="/autus/solar", tags=["solar"])

class InputRequest(BaseModel):
    slot: str
    value: float = 1.0

@router.get("/status")
def get_status():
    """Single Source of Truth"""
    return get_sun().snapshot()

@router.post("/tick")
def do_tick():
    """CYCLE: tick += 1"""
    return get_sun().do_tick()

@router.post("/input")
def do_input(req: InputRequest):
    """PRESSURE or ENGINES"""
    sun = get_sun()
    slot = req.slot.lower()
    
    if slot in ["boundary", "pressure"]:
        return sun.do_pressure()
    elif slot == "engines":
        return sun.do_engines()
    else:
        raise HTTPException(400, f"Unknown slot: {req.slot}")

@router.post("/reset")
def do_reset():
    """RESET: tick = 0"""
    return get_sun().do_reset()

print("✅ Solar Router - Tick Equation v1.0 LOCKED")
