"""AUTUS Galaxy Router - Multi-Solar API"""
from fastapi import APIRouter
from pydantic import BaseModel
from core.galaxy.galaxy_entity import get_galaxy

router = APIRouter(prefix="/autus/galaxy", tags=["galaxy"])

class TransferRequest(BaseModel):
    from_id: str
    to_id: str
    delta: float = 0.1

@router.get("/status")
def galaxy_status():
    """Galaxy overview"""
    return get_galaxy().status()

@router.post("/solar/{solar_id}")
def add_solar(solar_id: str):
    """Add Solar to Galaxy"""
    return get_galaxy().add_solar(solar_id)

@router.get("/solar/{solar_id}/status")
def solar_status(solar_id: str):
    """Get Solar status"""
    return get_galaxy().get_solar(solar_id).status()

@router.post("/solar/{solar_id}/pressure")
def solar_pressure(solar_id: str):
    """Apply PRESSURE to Solar"""
    return get_galaxy().get_solar(solar_id).pressure()

@router.post("/solar/{solar_id}/decision")
def solar_decision(solar_id: str):
    """Apply DECISION to Solar"""
    return get_galaxy().get_solar(solar_id).decision()

@router.post("/transfer")
def transfer_entropy(req: TransferRequest):
    """Transfer entropy between Solars"""
    return get_galaxy().transfer_entropy(req.from_id, req.to_id, req.delta)

print("✅ Galaxy Router loaded")
