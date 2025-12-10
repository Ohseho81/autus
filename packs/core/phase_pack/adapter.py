from dataclasses import dataclass, field
from typing import Any, Dict, List, Set
from datetime import datetime

@dataclass
class PhaseState:
    entity_id: str
    current_phase: str
    j_score: float = 0.5
    completed_events: Set[str] = field(default_factory=set)
    entered_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self):
        return {"entity_id": self.entity_id, "current_phase": self.current_phase,
                "j_score": self.j_score, "completed_events": list(self.completed_events)}

class PhaseFlow:
    PHASES = ["INIT", "APPLICATION", "SCREENING", "TRAINING", "VISA", "EMPLOYMENT", "SETTLEMENT", "COMPLETE"]
    MIN_J = {"APPLICATION": 0.3, "SCREENING": 0.4, "TRAINING": 0.5, "VISA": 0.6, "EMPLOYMENT": 0.7, "SETTLEMENT": 0.75, "COMPLETE": 0.8}

class PhasePack:
    def __init__(self):
        self.pack_id = "phase_pack"
        self._states: Dict[str, PhaseState] = {}
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action")
        eid = input_data.get("entity_id")
        
        if action == "initialize":
            state = PhaseState(eid, "INIT", input_data.get("j_score", 0.5))
            self._states[eid] = state
            return {"status": "success", "state": state.to_dict()}
        
        elif action == "record_event":
            if eid not in self._states: return {"status": "error", "error": "not found"}
            self._states[eid].completed_events.add(input_data.get("event_code"))
            idx = PhaseFlow.PHASES.index(self._states[eid].current_phase)
            next_p = PhaseFlow.PHASES[idx + 1] if idx < len(PhaseFlow.PHASES) - 1 else None
            can = next_p and self._states[eid].j_score >= PhaseFlow.MIN_J.get(next_p, 0)
            return {"status": "success", "can_transition": can, "next": next_p}
        
        elif action == "update_j_score":
            if eid not in self._states: return {"status": "error", "error": "not found"}
            self._states[eid].j_score = input_data.get("j_score", 0.5)
            return {"status": "success", "j_score": self._states[eid].j_score}
        
        elif action == "transition":
            if eid not in self._states: return {"status": "error", "error": "not found"}
            old = self._states[eid].current_phase
            self._states[eid].current_phase = input_data.get("target_phase", old)
            return {"status": "success", "transition": f"{old} → {self._states[eid].current_phase}"}
        
        elif action == "get_progress":
            if eid not in self._states: return {"status": "error"}
            idx = PhaseFlow.PHASES.index(self._states[eid].current_phase)
            return {"progress": round(idx / (len(PhaseFlow.PHASES)-1) * 100), "phase": self._states[eid].current_phase, "j_score": self._states[eid].j_score}
        
        return {"status": "error", "error": "Unknown action"}
