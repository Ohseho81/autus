from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.style_analyzer_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/style_analyzer")
async def run_style_analyzer(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
