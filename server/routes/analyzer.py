from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.analyzer_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/analyzer")
async def run_analyzer(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
