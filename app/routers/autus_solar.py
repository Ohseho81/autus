from fastapi import APIRouter
from pydantic import BaseModel
import sys
sys.path.insert(0, '.')

from core.solar.solar_entity import SolarEntity

router = APIRouter(prefix="/autus/solar", tags=["autus-solar"])
_sun = SolarEntity(id="SUN_001", name="Demo Solar")

class EnergyInput(BaseModel):
    slot: str
    value: float

@router.get("/status")
def get_status():
    return _sun.snapshot()

@router.post("/tick")
def run_tick():
    return _sun.tick()

@router.post("/input")
def apply_input(req: EnergyInput):
    _sun.apply_input(req.slot, req.value)
    return _sun.snapshot()

@router.post("/reset")
def reset():
    global _sun
    _sun = SolarEntity(id="SUN_001", name="Demo Solar")
    return _sun.snapshot()
