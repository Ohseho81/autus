from fastapi import APIRouter
from app.models.route import RouteResponse
from app.core.state import get_route

router = APIRouter()


@router.get("/nav/route", response_model=RouteResponse)
def nav_route():
    return get_route()
