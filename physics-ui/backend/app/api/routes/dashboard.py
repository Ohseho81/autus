from fastapi import APIRouter
from app.models.dashboard import DashboardStateResponse
from app.core.state import get_dashboard

router = APIRouter()


@router.get("/dashboard/state", response_model=DashboardStateResponse)
def dashboard_state():
    gauges, ts = get_dashboard()
    return DashboardStateResponse(gauges=gauges, updated_at=ts)
