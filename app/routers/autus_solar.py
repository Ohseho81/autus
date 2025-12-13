from fastapi import APIRouter
from pydantic import BaseModel

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

@router.post("/reset")
def reset():
    sun = get_sun()
    sun.reset()
    return sun.snapshot()
