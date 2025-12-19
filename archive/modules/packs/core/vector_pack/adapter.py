from typing import Any, Dict
from .vector import Vector6D, VectorState, DeltaTemplates

class VectorPack:
    def __init__(self):
        self.pack_id = "vector_pack"
        self._states: Dict[str, VectorState] = {}
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "get_state")
        entity_id = input_data.get("entity_id")
        
        if action == "create":
            v = Vector6D.from_dict(input_data.get("vector", {})) if input_data.get("vector") else Vector6D.default()
            state = VectorState(v, entity_id, input_data.get("entity_type", "HUM"), input_data.get("domain", "GENERAL"))
            self._states[entity_id] = state
            return {"status": "success", "state": state.to_dict()}
        
        elif action == "get_state":
            if entity_id not in self._states: return {"status": "error", "error": "not found"}
            return {"status": "success", "state": self._states[entity_id].to_dict()}
        
        elif action == "apply_delta":
            if entity_id not in self._states: return {"status": "error", "error": "not found"}
            delta = getattr(DeltaTemplates, input_data.get("delta_template", ""), None)
            if not delta: delta = Vector6D.from_dict(input_data.get("delta", {}))
            old = self._states[entity_id]
            new = old.apply_event(delta, input_data.get("lambda_", 0.1))
            self._states[entity_id] = new
            return {"status": "success", "old_j": old.vector.j_score_100(), "new_j": new.vector.j_score_100(), "state": new.to_dict()}
        
        return {"status": "error", "error": f"Unknown action: {action}"}
