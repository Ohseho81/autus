from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.meta_tester_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/meta_tester")
async def run_meta_tester(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
