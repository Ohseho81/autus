from fastapi import APIRouter
from pydantic import BaseModel
from core.autus.pipeline import AutusPipeline
from core.autus.hassabis_v2.replay import replay_segment

router = APIRouter(prefix="/autus", tags=["autus"])
pipeline = AutusPipeline()

class Input(BaseModel): text: str
class ReplayInput(BaseModel): gmu_id: str; variation: dict

@router.post("/pipeline/process")
def process(body: Input):
    return pipeline.process(body.text)

@router.post("/hassabis/replay")
def replay(body: ReplayInput):
    return {"explanation": replay_segment([], body.variation)}
