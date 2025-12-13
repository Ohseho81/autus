from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.insert(0, '.')

from core.solar.solar_entity import SolarEntity

router = APIRouter(prefix="/autus/solar", tags=["autus-solar"])

# 글로벌 태양 인스턴스 (데모용)
_sun = SolarEntity(id="SUN_001", name="Demo Solar")

class EnergyInput(BaseModel):
    slot: str
    value: float

@router.get("/status")
def get_status():
    """태양 상태"""
    return _sun.snapshot()

@router.post("/tick")
def run_tick():
    """한 사이클 실행"""
    return _sun.tick()

@router.post("/input")
def apply_input(req: EnergyInput):
    """에너지 입력"""
    _sun.apply_input(req.slot, req.value)
    return _sun.snapshot()

@router.post("/reset")
def reset():
    """초기화"""
    global _sun
    _sun = SolarEntity(id="SUN_001", name="Demo Solar")
    return _sun.snapshot()
