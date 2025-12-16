from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/graph", tags=["Graph - Entity Relations"])

ENTITIES = {
    "ENT-001": {"type": "student", "name": "Maria Santos", "cell": "angeles-school", "status": "active"},
    "ENT-002": {"type": "university", "name": "Kwangwoon University", "cell": "seoul-edu", "status": "active"},
    "ENT-003": {"type": "company", "name": "Samsung Electronics", "cell": "korea-corp", "status": "active"},
    "ENT-004": {"type": "city", "name": "Angeles Technology Base", "cell": "atb-city", "status": "active"},
    "ENT-005": {"type": "visa", "name": "D-2 Student Visa", "cell": "korea-immigration", "status": "template"},
    "ENT-006": {"type": "student", "name": "Juan Dela Cruz", "cell": "angeles-school", "status": "active"},
    "ENT-007": {"type": "employer", "name": "ATB Sports Academy", "cell": "atb-city", "status": "active"}
}

RELATIONSHIPS = [
    {"id": "REL-001", "from": "ENT-001", "to": "ENT-002", "type": "APPLIES_TO", "status": "pending"},
    {"id": "REL-002", "from": "ENT-001", "to": "ENT-005", "type": "REQUIRES", "status": "incomplete"},
    {"id": "REL-003", "from": "ENT-002", "to": "ENT-003", "type": "PARTNERS_WITH", "status": "active"},
    {"id": "REL-004", "from": "ENT-001", "to": "ENT-004", "type": "RESIDES_IN", "status": "active"},
    {"id": "REL-005", "from": "ENT-001", "to": "ENT-007", "type": "EMPLOYED_BY", "status": "future"},
    {"id": "REL-006", "from": "ENT-006", "to": "ENT-002", "type": "APPLIES_TO", "status": "approved"},
    {"id": "REL-007", "from": "ENT-007", "to": "ENT-004", "type": "LOCATED_IN", "status": "active"}
]

@router.get("/entities")
async def get_entities(type: str = None):
    if type:
        filtered = {k: v for k, v in ENTITIES.items() if v["type"] == type}
        return {"entities": filtered, "count": len(filtered)}
    return {"entities": ENTITIES, "count": len(ENTITIES)}

@router.get("/entities/{entity_id}")
async def get_entity(entity_id: str):
    entity = ENTITIES.get(entity_id)
    if not entity:
        return {"error": "entity_not_found"}
    
    # Get relationships
    rels = [r for r in RELATIONSHIPS if r["from"] == entity_id or r["to"] == entity_id]
    return {"entity": entity, "relationships": rels}

@router.get("/relationships")
async def get_relationships(type: str = None, status: str = None):
    rels = RELATIONSHIPS
    if type:
        rels = [r for r in rels if r["type"] == type]
    if status:
        rels = [r for r in rels if r["status"] == status]
    return {"relationships": rels, "count": len(rels)}

@router.post("/entities")
async def create_entity(data: Dict):
    entity_id = f"ENT-{len(ENTITIES) + 1:03d}"
    ENTITIES[entity_id] = {
        "type": data.get("type"),
        "name": data.get("name"),
        "cell": data.get("cell"),
        "status": "active"
    }
    return {"id": entity_id, "entity": ENTITIES[entity_id]}

@router.post("/relationships")
async def create_relationship(data: Dict):
    rel_id = f"REL-{len(RELATIONSHIPS) + 1:03d}"
    rel = {
        "id": rel_id,
        "from": data.get("from"),
        "to": data.get("to"),
        "type": data.get("type"),
        "status": data.get("status", "pending")
    }
    RELATIONSHIPS.append(rel)
    return rel

@router.get("/visualize")
async def get_graph_visualization():
    nodes = [{"id": k, "label": v["name"], "type": v["type"]} for k, v in ENTITIES.items()]
    edges = [{"source": r["from"], "target": r["to"], "label": r["type"]} for r in RELATIONSHIPS]
    return {"nodes": nodes, "edges": edges, "format": "d3"}

@router.get("/path/{from_id}/{to_id}")
async def find_path(from_id: str, to_id: str):
    # Simple BFS path finding
    if from_id not in ENTITIES or to_id not in ENTITIES:
        return {"error": "entity_not_found"}
    
    # Direct relationship check
    direct = [r for r in RELATIONSHIPS if (r["from"] == from_id and r["to"] == to_id) or (r["from"] == to_id and r["to"] == from_id)]
    if direct:
        return {"path": [from_id, to_id], "relationships": direct, "hops": 1}
    
    return {"path": [], "message": "No direct path found", "hops": 0}
