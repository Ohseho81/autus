from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.preference_vector_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/preference_vector")
async def run_preference_vector(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
