from fastapi import APIRouter
from typing import Any, Dict
from packs.visualizer_autogen import run as pack_run

router = APIRouter(prefix="/api/identity", tags=["3D Identity"])

@router.get("/3d/demo")
async def get_demo(): return pack_run({"action": "demo"})

@router.get("/3d/generate")
async def generate(): return pack_run({"action": "generate"})

@router.post("/3d/run")
async def run_viz(payload: Dict[str, Any]): return pack_run(payload)
