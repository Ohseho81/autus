"""AUTUS Triple Sphere 3D API"""
from fastapi import APIRouter
from typing import Dict, List
import math
from datetime import datetime

from core.layers import get_layer1_state, get_layer2_state, get_layer3_state, PACK_REGISTRY, PackCategory

router = APIRouter(prefix="/api/3d", tags=["Triple Sphere"])

def spherical_distribute(nodes: List[Dict], radius: float) -> List[Dict]:
    """노드를 구 표면에 균등 분포"""
    n = len(nodes)
    if n == 0:
        return nodes
    result = []
    for i, node in enumerate(nodes):
        theta = (2 * math.pi * i * 1.618) % (2 * math.pi)
        phi = math.acos(1 - 2 * (i + 0.5) / n)
        x = radius * math.sin(phi) * math.cos(theta)
        y = radius * math.sin(phi) * math.sin(theta)
        z = radius * math.cos(phi)
        result.append({**node, "position": {"theta": round(theta, 3), "phi": round(phi, 3), "x": round(x, 3), "y": round(y, 3), "z": round(z, 3)}})
    return result

@router.get("/state")
async def get_triple_sphere_state():
    """전체 3중 구 상태"""
    l1, l2, l3 = get_layer1_state(), get_layer2_state(), get_layer3_state()
    l1["nodes"] = spherical_distribute(l1["nodes"], l1["radius"])
    l2["nodes"] = spherical_distribute(l2["nodes"], l2["radius"])
    l3["nodes"] = spherical_distribute(l3["nodes"], l3["radius"])
    return {
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "layers": [l1, l2, l3],
        "stats": {"layer1": len(l1["nodes"]), "layer2": len(l2["nodes"]), "layer3": len(l3["nodes"]), "total": len(l1["nodes"]) + len(l2["nodes"]) + len(l3["nodes"])}
    }

@router.get("/layer/{layer_id}")
async def get_layer(layer_id: int):
    """특정 Layer"""
    layers = {1: get_layer1_state, 2: get_layer2_state, 3: get_layer3_state}
    if layer_id not in layers:
        return {"error": "Invalid layer_id (1, 2, or 3)"}
    layer = layers[layer_id]()
    layer["nodes"] = spherical_distribute(layer["nodes"], layer["radius"])
    return layer

@router.get("/stats")
async def get_stats():
    """통계"""
    return {
        "layer_1": {"name": "OS Core", "count": 12},
        "layer_2": {"name": "Protocol", "count": 12},
        "layer_3": {"name": "Pack", "count": len(PACK_REGISTRY)},
        "categories": {c.value: len([p for p in PACK_REGISTRY if p.category == c]) for c in PackCategory}
    }
