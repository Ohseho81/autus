from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.autogen_cells_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/autogen_cells")
async def run_autogen_cells(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
