from fastapi import APIRouter
from pydantic import BaseModel
import sys
sys.path.insert(0, '.')

from core.kernel.physics import kernel

router = APIRouter(prefix="/autus/kernel", tags=["autus-kernel"])

class EnergyInput(BaseModel):
    slot: str
    value: float

class ConstraintToggle(BaseModel):
    active: bool

@router.get("/state")
def get_state():
    return kernel.get_state()

@router.post("/cycle")
def run_cycle():
    return kernel.cycle()

@router.post("/energy")
def apply_energy(req: EnergyInput):
    kernel.apply_energy(req.slot, req.value)
    return kernel.get_state()

@router.post("/constraints/{cid}/toggle")
def toggle_constraint(cid: str, req: ConstraintToggle):
    kernel.toggle_constraint(cid, req.active)
    return kernel.get_state()

@router.post("/reset")
def reset():
    kernel.reset()
    return kernel.get_state()
