"""
Autus Reality Language (ARL) v1.0 API
"""
from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime

router = APIRouter(prefix="/arl", tags=["ARL - Reality Language"])

# In-memory state store
states_db: Dict[str, Dict] = {}
events_log: List[Dict] = []

@router.get("/schema/state")
async def get_state_schema():
    """Get ARL State schema"""
    return {
        "axes": {
            "A2": "Economic", "A3": "Safety", "A4": "Education", "A5": "Health",
            "A6": "Social", "A7": "Legal", "A8": "Career", "A9": "Risk"
        },
        "types": ["student", "university", "company", "document", "visa", "health", "finance", "employment", "city", "policy"]
    }

@router.post("/state/create")
async def create_state(data: Dict[str, Any]):
    """Create new state entity"""
    state_id = data.get("id", f"STATE-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    state = {
        "id": state_id,
        "type": data.get("type", "student"),
        "axes": {f"A{i}": 0.0 for i in range(2, 10)},
        "meta": data.get("meta", {}),
        "created_at": datetime.now().isoformat()
    }
    states_db[state_id] = state
    return state

@router.get("/state/{state_id}")
async def get_state(state_id: str):
    """Get state by ID"""
    if state_id not in states_db:
        return {"error": "state_not_found"}
    return states_db[state_id]

@router.post("/event/emit")
async def emit_event(data: Dict[str, Any]):
    """Emit event and apply delta to targets"""
    event = {
        "id": f"EVT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "type": data.get("type"),
        "actor": data.get("actor"),
        "targets": data.get("targets", []),
        "delta": data.get("delta", {}),
        "timestamp": datetime.now().isoformat()
    }
    
    # Apply delta to target states
    for target_id in event["targets"]:
        if target_id in states_db:
            state = states_db[target_id]
            for axis, delta in event["delta"].items():
                if axis in state["axes"]:
                    state["axes"][axis] += delta
    
    events_log.append(event)
    return {"event": event, "applied_to": event["targets"]}

@router.get("/events")
async def get_events(limit: int = 50):
    """Get recent events"""
    return {"events": events_log[-limit:], "total": len(events_log)}

@router.get("/flow/limepass")
async def get_limepass_flow():
    """Get LimePass 12-step flow"""
    from kernel.flow_mapper import generate_flow, LIMEPASS_FLOW
    return {"flow": generate_flow([]), "steps": len(LIMEPASS_FLOW)}

@router.post("/score/calculate")
async def calculate_eligibility(state_id: str):
    """Calculate eligibility score for state"""
    if state_id not in states_db:
        return {"error": "state_not_found"}
    
    state = states_db[state_id]
    axes = state["axes"]
    
    # Simple score calculation
    positive = sum(v for v in axes.values() if v > 0)
    negative = abs(sum(v for v in axes.values() if v < 0))
    score = max(0, min(1, 0.5 + (positive - negative) / 2))
    
    return {"state_id": state_id, "score": round(score, 3), "axes": axes}
