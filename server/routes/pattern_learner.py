from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.pattern_learner_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/pattern_learner")
async def run_pattern_learner(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
