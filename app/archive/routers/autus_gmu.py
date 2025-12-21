from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
import sys
sys.path.insert(0, '.')

router = APIRouter(prefix="/autus/gmu", tags=["autus-gmu"])

# 메모리 저장소
gmus = {}

class CreateGMU(BaseModel):
    id: str

class CommitInputs(BaseModel):
    tasks: Dict[str, float]
    pressure: float
    resource_efficiency: float

@router.post("/create")
def create_gmu(body: CreateGMU):
    if body.id in gmus:
        raise HTTPException(status_code=400, detail="GMU already exists")
    gmus[body.id] = {
        "id": body.id,
        "slots": {},
        "grove_state": "normal",
        "ledger_size": 1
    }
    return gmus[body.id]

@router.get("/list")
def list_gmus():
    return {"gmus": list(gmus.keys())}

@router.get("/{gmu_id}")
def get_gmu(gmu_id: str):
    if gmu_id not in gmus:
        raise HTTPException(status_code=404, detail="GMU not found")
    return gmus[gmu_id]
