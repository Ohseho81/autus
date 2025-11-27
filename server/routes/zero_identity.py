from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.zero_identity_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/zero_identity")
async def run_zero_identity(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
