"""
AUTUS Observer API v2
Chrome Extension → Server → Solar Engine
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

router = APIRouter(prefix="/observer", tags=["observer"])

events_buffer = []

class BrowserEvent(BaseModel):
    source: str = "browser"
    type: str
    url: Optional[str] = None
    title: Optional[str] = None
    duration: Optional[int] = None
    intensity: Optional[float] = None
    data: Optional[Dict[str, Any]] = None

@router.post("/event")
async def receive_event(event: BrowserEvent):
    event_dict = event.model_dump()
    event_dict["ts"] = datetime.utcnow().isoformat() + "Z"
    events_buffer.append(event_dict)
    
    if len(events_buffer) >= 5:
        result = process_events()
        return {"status": "ok", "processed": True, "solar": result}
    
    return {"status": "ok", "buffered": len(events_buffer)}

@router.post("/batch")
async def receive_batch(events: List[BrowserEvent]):
    for event in events:
        event_dict = event.model_dump()
        event_dict["ts"] = datetime.utcnow().isoformat() + "Z"
        events_buffer.append(event_dict)
    
    result = process_events()
    return {"status": "ok", "processed": len(events), "solar": result}

@router.get("/status")
async def observer_status():
    from core.solar.observer_bridge import get_realtime_state
    return {
        "buffered_events": len(events_buffer),
        "status": "active",
        "solar": get_realtime_state()
    }

def process_events():
    global events_buffer
    
    if not events_buffer:
        return None
    
    from observer.action_observer import observe_action
    from core.solar.observer_bridge import apply_delta_to_solar
    
    deltas = []
    for event in events_buffer:
        delta = observe_action(event)
        if delta:
            deltas.append(delta)
    
    events_buffer = []
    
    # 모든 delta 합산
    if deltas:
        total_delta = {
            "focus_delta": sum(d.get("focus_delta", 0) for d in deltas),
            "energy_delta": sum(d.get("energy_delta", 0) for d in deltas),
            "entropy_delta": sum(d.get("entropy_delta", 0) for d in deltas),
        }
        result = apply_delta_to_solar(total_delta)
        print(f"[Observer] {len(deltas)} deltas → Solar: entropy={result['entropy']}")
        return result
    
    return None
