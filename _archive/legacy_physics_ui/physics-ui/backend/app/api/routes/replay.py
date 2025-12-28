"""
Replay Endpoints
- GET /replay/events
- POST /replay/run
"""

from fastapi import APIRouter, HTTPException

from app.core.store import STORE
from app.core.replay import reduce_events, build_dashboard, build_route, build_motions
from app.core.render_mapping import build_render_payload
from app.core.noncoercive_policy import validate_noncoercive_payload, NonCoercivePolicyError
from app.models.replay import ReplayEventsResponse, ReplayEvent, ReplayRunRequest, ReplayRunResponse

router = APIRouter()


@router.get("/replay/events", response_model=ReplayEventsResponse)
def replay_events():
    """Get all stored events"""
    events = STORE.get_events()
    return ReplayEventsResponse(
        events=[ReplayEvent(**e) for e in events],
        count=len(events),
    )


@router.post("/replay/run", response_model=ReplayRunResponse)
def replay_run(req: ReplayRunRequest):
    """Run replay from events"""
    
    # Get events
    if req.use_store:
        events = STORE.get_events()
    else:
        events = req.events
    
    # Reduce events to state
    state = reduce_events(events)
    
    # Build view components
    dashboard = build_dashboard(state)
    route = build_route(state)
    motions = build_motions(state)
    render = build_render_payload(dashboard["gauges"], mode="tier0")
    
    # Build response
    response = ReplayRunResponse(
        gauges=dashboard["gauges"],
        route=route,
        motions=motions,
        render=render,
        event_count=len(events),
        action_count=state.action_count,
        selfcheck_count=state.selfcheck_count,
    )
    
    # Policy gate
    try:
        validate_noncoercive_payload(response.model_dump())
    except NonCoercivePolicyError as e:
        raise HTTPException(status_code=500, detail=f"Policy violation: {e}")
    
    return response
