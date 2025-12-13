"""
AUTUS Kernel API - 물리 엔진 엔드포인트
"""
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
    """렌더 스냅샷"""
    return kernel.get_state()

@router.post("/cycle")
def run_cycle():
    """유일한 상태 갱신"""
    kernel.cycle()
    return kernel.get_state()

@router.post("/energy")
def apply_energy(req: EnergyInput):
    """에너지 입력"""
    kernel.apply_energy(req.slot, req.value)
    return kernel.get_state()

@router.post("/constraints/{cid}/toggle")
def toggle_constraint(cid: str, req: ConstraintToggle):
    """제약 토글"""
    kernel.toggle_constraint(cid, req.active)
    return kernel.get_state()

@router.get("/constraints")
def list_constraints():
    """제약 목록"""
    return kernel.get_state()["constraints"]

@router.post("/reset")
def reset():
    """초기화"""
    kernel.reset()
    return kernel.get_state()
