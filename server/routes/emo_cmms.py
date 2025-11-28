from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.emo_cmms_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/emo_cmms")
async def run_emo_cmms(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
