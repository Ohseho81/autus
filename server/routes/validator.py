from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.validator_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/validator")
async def run_validator(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
