from fastapi import APIRouter
from .service import TestPackDemoService

router = APIRouter(prefix="/pack/test_pack_demo")

@router.post("/run")
def run(payload: dict):
    return TestPackDemoService().run(payload)
