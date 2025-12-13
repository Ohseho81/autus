from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from core.solar.solar_entity import get_sun

router = APIRouter(prefix="/autus/solar", tags=["autus-solar"])

class EnergyInput(BaseModel):
    slot: str
    value: float

@router.get("/status")
def get_status():
    return get_sun().snapshot()

@router.post("/tick")
def run_tick():
    return get_sun().tick()

@router.post("/input")
def apply_input(req: EnergyInput):
    sun = get_sun()
    sun.apply_input(req.slot, req.value)
    return sun.snapshot()

@router.get("/logs")
def get_logs(limit: int = 20):
    return get_sun().get_logs(limit)

@router.post("/reset")
def reset():
    sun = get_sun()
    sun.reset()
    return sun.snapshot()

@router.get("/physics")
def get_physics():
    """Physics Constants (LOCKED)"""
    sun = get_sun()
    return {
        "version": "v1.0",
        "constants": {
            "ALPHA": sun.ALPHA,
            "BETA": sun.BETA,
            "GAMMA": sun.GAMMA,
            "P_TH": sun.P_TH,
            "DELTA": sun.DELTA,
            "P_STABLE": sun.P_STABLE,
            "E_MIN": sun.E_MIN
        }
    }
