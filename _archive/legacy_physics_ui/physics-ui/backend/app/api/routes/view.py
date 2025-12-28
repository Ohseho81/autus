"""
GET /physics/view
- Single payload for complete UI
- Policy gate validation
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from app.core.state import get_dashboard, get_route, get_motions
from app.core.store import STORE
from app.core.noncoercive_policy import validate_noncoercive_payload, NonCoercivePolicyError
from app.core.render_mapping import build_render_payload
from app.models.view import PhysicsViewResponse, ActionOption, RenderParams, GaugeState

router = APIRouter()


@router.get("/physics/view", response_model=PhysicsViewResponse)
def physics_view():
    """Get complete physics view in single request"""
    
    gauges, ts = get_dashboard()
    route = get_route()
    motions = get_motions()
    
    # Actions (fixed, no dynamic recommendations)
    actions = [
        ActionOption(id="hold", label="Hold"),
        ActionOption(id="push", label="Push"),
        ActionOption(id="drift", label="Drift"),
    ]
    
    # Render params
    render_dict = build_render_payload(gauges.model_dump(), mode="tier0")
    render = RenderParams(**render_dict)
    
    # Build response
    response = PhysicsViewResponse(
        gauges=gauges,
        route=route.model_dump(),
        motions=motions.model_dump(),
        actions=actions,
        render=render,
        updated_at=datetime.now(timezone.utc),
    )
    
    # Policy gate validation
    payload_dict = response.model_dump()
    try:
        validate_noncoercive_payload(payload_dict)
    except NonCoercivePolicyError as e:
        raise HTTPException(status_code=500, detail=f"Policy violation: {e}")
    
    # Log view event
    STORE.append_event("view", {"v": "1"})
    
    return response
