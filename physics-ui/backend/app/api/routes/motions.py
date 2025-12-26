from fastapi import APIRouter
from app.models.motion import MotionsResponse
from app.core.state import get_motions

router = APIRouter()


@router.get("/physics/motions", response_model=MotionsResponse)
def physics_motions():
    return get_motions()
