from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.local_memory_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/local_memory")
async def run_local_memory(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
