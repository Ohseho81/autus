"""Twin World - 가상 세계 상태 관리"""
from dataclasses import dataclass, field
from typing import Dict, List, Any
from datetime import datetime
import uuid
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from engines.hum.delta_engine import get_delta, apply_delta, compute_risk, compute_success
from engines.hum.phase_engine import infer_phase

@dataclass
class TwinEntity:
    """가상 엔티티"""
    entity_id: str
    entity_type: str  # people, process, space, energy
    state: str = "active"
    vector: Dict[str, float] = field(default_factory=lambda: {"DIR":0.5,"FOR":0.5,"GAP":0.5,"UNC":0.5,"TEM":0.5,"INT":0.5})
    phase: str = "LIME"
    risk: float = 0.5
    success: float = 0.5
    history: List[Dict] = field(default_factory=list)

@dataclass
class TwinWorld:
    """가상 세계"""
    world_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    entities: Dict[str, TwinEntity] = field(default_factory=dict)
    events: List[Dict] = field(default_factory=list)
    tick: int = 0
    
    def create_entity(self, entity_id: str, entity_type: str = "people") -> TwinEntity:
        entity = TwinEntity(entity_id=entity_id, entity_type=entity_type)
        self.entities[entity_id] = entity
        return entity
    
    def get_entity(self, entity_id: str) -> TwinEntity:
        return self.entities.get(entity_id)
    
    def process_event(self, entity_id: str, event_code: str) -> Dict[str, Any]:
        entity = self.get_entity(entity_id)
        if not entity:
            return {"error": "Entity not found"}
        
        # Delta 적용
        delta = get_delta(event_code)
        old_vector = entity.vector.copy()
        new_vector = apply_delta(entity.vector, delta)
        
        # 상태 업데이트
        entity.vector = new_vector
        entity.risk = compute_risk(new_vector)
        entity.success = compute_success(new_vector)
        entity.phase = infer_phase(event_code, entity.phase)
        
        # 이벤트 기록
        event_record = {
            "tick": self.tick,
            "entity_id": entity_id,
            "event_code": event_code,
            "vector_before": old_vector,
            "vector_after": new_vector,
            "risk": entity.risk,
            "success": entity.success,
            "phase": entity.phase,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.events.append(event_record)
        entity.history.append(event_record)
        
        self.tick += 1
        
        return {
            "status": "processed",
            "entity": {
                "id": entity.entity_id,
                "phase": entity.phase,
                "risk": entity.risk,
                "success": entity.success,
                "vector": entity.vector
            },
            "delta": delta
        }
    
    def get_snapshot(self) -> Dict[str, Any]:
        return {
            "world_id": self.world_id,
            "tick": self.tick,
            "entities": {k: {
                "id": v.entity_id,
                "type": v.entity_type,
                "phase": v.phase,
                "risk": v.risk,
                "success": v.success,
                "vector": v.vector
            } for k, v in self.entities.items()},
            "event_count": len(self.events)
        }
    
    def reset(self):
        self.entities = {}
        self.events = []
        self.tick = 0
