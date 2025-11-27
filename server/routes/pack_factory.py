from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.pack_factory_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/pack_factory")
async def run_pack_factory(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
