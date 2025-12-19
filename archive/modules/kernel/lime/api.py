"""Lime Kernel API - FastAPI Router for LIME PASS OS"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from .simulator import LimeSimulator
from .core.event_engine import EVENT_DICTIONARY

router = APIRouter(prefix="/api/v1/lime", tags=["Lime Kernel"])

# Global simulator instance
_simulator: Optional[LimeSimulator] = None

def get_simulator() -> LimeSimulator:
    global _simulator
    if _simulator is None:
        _simulator = LimeSimulator(country="KR", industry="education")
        _simulator.load_hum_seeds()
    return _simulator


class EventRequest(BaseModel):
    entity_id: str
    event_code: str

class SimulateRequest(BaseModel):
    entity_id: str
    events: List[str]

class VectorResponse(BaseModel):
    DIR: float
    FOR: float
    GAP: float
    TEM: float
    UNC: float
    INT: float


@router.get("/health")
def health():
    return {"status": "ok", "kernel": "lime", "version": "1.0.0"}


@router.get("/events")
def list_events():
    """List all available events"""
    return {
        "count": len(EVENT_DICTIONARY),
        "events": [
            {"code": k, "source": v.source_type, "description": v.description}
            for k, v in EVENT_DICTIONARY.items()
        ]
    }


@router.get("/entities")
def list_entities():
    """List all registered entities"""
    sim = get_simulator()
    return {
        "count": len(sim.event_engine.entities),
        "entities": [
            {"id": e.id, "type": e.type, "events_count": len(e.history)}
            for e in sim.event_engine.entities.values()
        ]
    }


@router.get("/state/{entity_id}")
def get_state(entity_id: str):
    """Get entity state with progress and risk"""
    sim = get_simulator()
    state = sim.event_engine.get_state(entity_id)
    if "error" in state:
        raise HTTPException(status_code=404, detail=state["error"])
    return state


@router.get("/settlement/{entity_id}")
def check_settlement(entity_id: str):
    """Check if entity meets settlement criteria"""
    sim = get_simulator()
    result = sim.check_settlement(entity_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/event")
def process_event(req: EventRequest):
    """Process single event for entity"""
    sim = get_simulator()
    result = sim.event_engine.process_event(req.entity_id, req.event_code)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/simulate")
def simulate_scenario(req: SimulateRequest):
    """Run multiple events as scenario"""
    sim = get_simulator()
    result = sim.run_scenario(req.entity_id, req.events)
    settlement = sim.check_settlement(req.entity_id)
    return {
        "simulation": result,
        "settlement": settlement
    }


@router.get("/scenarios")
def list_scenarios():
    """List available scenarios"""
    sim = get_simulator()
    scenarios = sim.load_scenarios()
    return {
        "count": len(scenarios["scenarios"]),
        "scenarios": [
            {"id": s["id"], "name": s["name"], "events_count": len(s["events"])}
            for s in scenarios["scenarios"]
        ]
    }


@router.post("/reset")
def reset_kernel():
    """Reset kernel to initial state"""
    global _simulator
    _simulator = None
    get_simulator()
    return {"status": "reset", "entities_loaded": 10}
