from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.nba_atb_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/nba_atb")
async def run_nba_atb(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
