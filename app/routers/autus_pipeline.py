from fastapi import APIRouter
from pydantic import BaseModel
import sys
sys.path.insert(0, '.')

router = APIRouter(prefix="/autus/pipeline", tags=["autus-pipeline"])

# 간단한 상태
state = {
    "integrity": 100.0,
    "energy": 100.0,
    "mode": "SEED",
    "gmu_count": 1,
    "cycle": 0
}

class PipelineInput(BaseModel):
    text: str

@router.post("/process")
def process_command(body: PipelineInput):
    state["cycle"] += 1
    logs = []
    
    task_type = "WORK"
    if "사람" in body.text or "채용" in body.text:
        task_type = "PEOPLE"
    elif "성장" in body.text or "확장" in body.text:
        task_type = "GROWTH"
    
    logs.append(f"MOTION: Executed {task_type}")
    state["energy"] -= 2.0
    
    return {"success": True, "state": state, "logs": logs}

@router.get("/state")
def get_state():
    return state
