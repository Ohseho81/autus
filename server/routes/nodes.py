"""
AUTUS 3D Node API
- /api/state/<node_type> - 노드 상태 조회
- /api/nodes - 전체 노드 조회
"""
from fastapi import APIRouter
from typing import Dict, Any, Optional
from protocols.identity.visualizer import generate_demo_data
from protocols.workflow.standard import WorkflowGraph

router = APIRouter(prefix="/api", tags=["3D Nodes"])

# 간단한 인메모리 상태 (실제는 NodeManager 사용)
_state = {
    "identity": None,
    "workflow": None,
    "patterns": [],
    "risks": [],
    "packs": []
}

@router.get("/state/identity")
async def get_identity_state():
    """Identity Surface 상태"""
    data = generate_demo_data()
    core = data.get("core", {})
    return {
        "update": "identity_state",
        "node_id": "identity_core",
        "position": list(core.get("position", (0, 0, 0))),
        "properties": {
            "color": core.get("color", {}).get("primary", "#ffffff"),
            "shape": core.get("shape", {}).get("geometry", "sphere"),
            "surface": data.get("surface", {}),
            "state": "active"
        }
    }

@router.get("/state/workflow")
async def get_workflow_state():
    """Workflow Orbit 상태"""
    # 데모 워크플로우
    import math
    nodes = []
    for i in range(5):
        angle = (i / 5) * 2 * math.pi
        nodes.append({
            "update": "workflow_state",
            "node_id": f"workflow_{i}",
            "position": [3 * math.cos(angle), 0, 3 * math.sin(angle)],
            "properties": {
                "color": "#00ff88" if i == 2 else "#4488ff",
                "state": "running" if i == 2 else "idle",
                "progress": 0.6 if i == 2 else 0,
                "label": f"Task {i+1}"
            }
        })
    return {"nodes": nodes}

@router.get("/state/memory")
async def get_memory_state():
    """Memory Galaxy 상태"""
    import hashlib
    patterns = [
        {"name": "morning_routine", "category": "habit", "count": 15},
        {"name": "code_review", "category": "workflow", "count": 8},
        {"name": "meeting_prep", "category": "schedule", "count": 5},
    ]
    nodes = []
    colors = {"workflow": "#4CAF50", "schedule": "#2196F3", "habit": "#9C27B0"}
    for i, p in enumerate(patterns):
        h = hashlib.md5(p["name"].encode()).digest()
        nodes.append({
            "update": "pattern_state",
            "node_id": f"pattern_{i}",
            "position": [(h[0]/128-1)*5, (h[1]/128-1)*5, (h[2]/128-1)*5],
            "properties": {
                "color": colors.get(p["category"], "#888"),
                "scale": 0.2 + min(p["count"]/20, 0.8),
                "name": p["name"]
            }
        })
    return {"nodes": nodes}

@router.get("/state/risk")
async def get_risk_state():
    """Risk Nebula 상태"""
    risks = [
        {"article": "article_1", "level": 0.2, "active": False},
        {"article": "article_2", "level": 0.1, "active": False},
    ]
    colors = {"article_1": "#ff0000", "article_2": "#ff8800", "article_3": "#ffff00"}
    nodes = []
    for i, r in enumerate(risks):
        nodes.append({
            "update": "risk_state",
            "node_id": f"risk_{i}",
            "position": [i*2-1, 4, 0],
            "properties": {
                "color": colors.get(r["article"], "#ff0000"),
                "scale": 0.5 + r["level"],
                "level": r["level"],
                "blink": r["active"]
            }
        })
    return {"nodes": nodes}

@router.get("/state/packs")
async def get_packs_state():
    """Pack Universe 상태"""
    import math
    packs = [
        {"name": "architect", "category": "development"},
        {"name": "codegen", "category": "development"},
        {"name": "weather", "category": "examples"},
        {"name": "github", "category": "integration"},
    ]
    colors = {"development": "#00ff00", "integration": "#ff0000", "examples": "#0088ff"}
    nodes = []
    for i, p in enumerate(packs):
        angle = (i / len(packs)) * 2 * math.pi
        nodes.append({
            "update": "pack_state",
            "node_id": f"pack_{p["name"]}",
            "position": [8*math.cos(angle), 2, 8*math.sin(angle)],
            "properties": {
                "color": colors.get(p["category"], "#888"),
                "scale": 1.5,
                "name": p["name"]
            }
        })
    return {"nodes": nodes}

@router.get("/nodes/all")
async def get_all_nodes():
    """전체 노드 상태"""
    identity = await get_identity_state()
    workflow = await get_workflow_state()
    memory = await get_memory_state()
    risk = await get_risk_state()
    packs = await get_packs_state()
    return {
        "identity": identity,
        "workflow": workflow["nodes"],
        "memory": memory["nodes"],
        "risk": risk["nodes"],
        "packs": packs["nodes"]
    }

@router.post("/event")
async def handle_3d_event(event: Dict[str, Any]):
    """3D -> OS 이벤트 처리"""
    event_type = event.get("event")
    node_id = event.get("node_id")
    action = event.get("action")
    
    # 이벤트 로깅 (실제로는 처리 로직)
    print(f"3D Event: {event_type} on {node_id} -> {action}")
    
    return {"status": "ok", "received": event}
