from fastapi import APIRouter
from app.models.goal import GoalSetRequest, GoalResponse
from app.core.state import set_goal, get_dashboard

router = APIRouter()


@router.post("/goal/set", response_model=GoalResponse)
def goal_set(req: GoalSetRequest):
    set_goal(req.goal_text)
    gauges, ts = get_dashboard()
    return GoalResponse(goal_id="g_1", goal_state="active", stability=gauges.stability, updated_at=ts)


@router.get("/goal/get", response_model=GoalResponse)
def goal_get():
    gauges, ts = get_dashboard()
    return GoalResponse(goal_id="g_1", goal_state="active", stability=gauges.stability, updated_at=ts)
