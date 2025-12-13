"""
AUTUS Solar Router - Universal Action Equation API

Events:
- PRESSURE: 자동 물리 (대부분의 인간)
- RELEASE:  자동 물리
- RESET:    안정 회복
- DECISION: 구조 전이 (상위 3%)
"""
from fastapi import APIRouter
from core.solar.physics import get_engine

router = APIRouter(prefix="/autus/solar", tags=["solar"])

# === SINGLE TRUTH ===
@router.get("/status")
def status():
    """GET /status → State Vector S"""
    return get_engine().status()

# === AUTOMATIC PHYSICS (대부분의 인간) ===
@router.post("/pressure")
def pressure():
    """PRESSURE: tick+1, entropy+α (자극/업무)"""
    return get_engine().pressure()

@router.post("/release")
def release():
    """RELEASE: tick+1, entropy-β (휴식/회복)"""
    return get_engine().release()

@router.post("/reset")
def reset():
    """RESET: tick+1, entropy=e0, cycle UNCHANGED"""
    return get_engine().reset()

# === HUMAN DECISION (상위 3%) ===
@router.post("/decision")
def decision():
    """DECISION: tick+1, cycle+1, entropy×γ (구조 전이)"""
    return get_engine().decision()

# === TESTING ===
@router.post("/full-reset")
def full_reset():
    """FULL RESET: all=0"""
    return get_engine().full_reset()

print("✅ Solar Engine - Universal Action Equation LOCKED")
