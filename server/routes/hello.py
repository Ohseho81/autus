from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.hello_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/hello")
async def run_hello(payload: Dict[str, Any]) -> Dict[str, Any]:
  controller = RuntimeController()
  return pack_run(controller, payload)
