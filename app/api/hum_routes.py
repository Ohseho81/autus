from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.hum.models import HumProfile, HumEvent
from domain.hum.repository import get_hum_profile, save_hum_profile, create_hum_profile, get_hum_events, append_hum_event, list_all_hums
from engines.hum.phase_engine import infer_phase, get_phase_order, get_phase_index
from engines.hum.delta_engine import get_delta, apply_delta, compute_risk, compute_success, list_events

router = APIRouter(prefix="/hum", tags=["hum"])

class CreateHumRequest(BaseModel):
    hum_id: str
    name: str
    route_code: str = "PH-KR"

class HumEventRequest(BaseModel):
    hum_id: str
    event_code: str
    meta: Optional[Dict[str, Any]] = None

@router.get("/events")
def available_events():
    return {"events": list_events()}

@router.get("/phases")
def phases():
    return {"phases": get_phase_order()}

@router.get("/list")
def list_hums():
    hums = list_all_hums()
    return {"count": len(hums), "hums": [h.to_dict() for h in hums]}

@router.post("/create")
def create_hum(req: CreateHumRequest):
    if get_hum_profile(req.hum_id):
        raise HTTPException(status_code=400, detail="HUM already exists")
    profile = create_hum_profile(req.hum_id, req.name, req.route_code)
    return {"status": "created", "hum": profile.to_dict()}

@router.get("/status/{hum_id}")
def hum_status(hum_id: str):
    profile = get_hum_profile(hum_id)
    if not profile:
        raise HTTPException(status_code=404, detail="HUM not found")
    events = get_hum_events(hum_id)
    timeline = [e.to_dict() for e in events]
    radar = {"labels": ["DIR", "FOR", "GAP", "UNC", "TEM", "INT"], "values": [profile.vector.get(k, 0.5) for k in ["DIR", "FOR", "GAP", "UNC", "TEM", "INT"]]}
    gauges = {"risk": profile.risk, "success": profile.success}
    phase_order = get_phase_order()
    current_idx = get_phase_index(profile.phase)
    phase_progress = {"current": profile.phase, "index": current_idx, "total": len(phase_order), "percent": round((current_idx / max(len(phase_order) - 1, 1)) * 100), "order": phase_order}
    return {"hum": profile.to_dict(), "timeline": {"steps": timeline, "count": len(timeline)}, "radar": radar, "gauges": gauges, "phase_progress": phase_progress}

@router.post("/event")
def hum_event(req: HumEventRequest):
    profile = get_hum_profile(req.hum_id)
    if not profile:
        raise HTTPException(status_code=404, detail="HUM not found")
    delta = get_delta(req.event_code)
    old_vector = profile.vector.copy()
    new_vector = apply_delta(profile.vector, delta)
    new_risk = compute_risk(new_vector)
    new_success = compute_success(new_vector)
    new_phase = infer_phase(req.event_code, profile.phase)
    profile.vector = new_vector
    profile.risk = new_risk
    profile.success = new_success
    profile.phase = new_phase
    profile.stage = req.event_code
    save_hum_profile(profile)
    event = HumEvent(hum_id=req.hum_id, event_code=req.event_code, vector_before=old_vector, vector_after=new_vector, risk=new_risk, success=new_success, phase=new_phase)
    append_hum_event(event)
    return {"status": "ok", "hum": profile.to_dict(), "event": {"code": req.event_code, "delta": delta, "phase": new_phase}, "change": {"risk": {"before": compute_risk(old_vector), "after": new_risk}, "success": {"before": compute_success(old_vector), "after": new_success}}}

@router.post("/journey/{hum_id}")
def run_journey(hum_id: str, events: List[str]):
    profile = get_hum_profile(hum_id)
    if not profile:
        raise HTTPException(status_code=404, detail="HUM not found")
    results = []
    for event_code in events:
        result = hum_event(HumEventRequest(hum_id=hum_id, event_code=event_code))
        results.append({"event": event_code, "risk": result["hum"]["risk"], "success": result["hum"]["success"], "phase": result["hum"]["phase"]})
    return {"hum_id": hum_id, "events_processed": len(results), "final_state": get_hum_profile(hum_id).to_dict(), "journey": results}
