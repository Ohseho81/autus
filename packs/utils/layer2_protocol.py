"""Layer 2: Protocol Sphere - 12 프로토콜"""
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Layer2Node:
    id: str
    name: str
    color: str
    node_type: str = "protocol"

LAYER2_MODULES = [
    Layer2Node("proto_identity", "Identity Core", "#9c27b0"),
    Layer2Node("proto_auth_sync", "Auth & Device Sync", "#ff5722"),
    Layer2Node("proto_memory", "Memory Protocol", "#4caf50"),
    Layer2Node("proto_workflow", "Workflow Protocol", "#2196f3"),
    Layer2Node("proto_pack_api", "Pack API Schema", "#795548"),
    Layer2Node("proto_preference", "Preference Vector", "#e91e63", "engine"),
    Layer2Node("proto_pattern", "Pattern Tracker", "#3f51b5", "engine"),
    Layer2Node("proto_risk", "Risk Policy Protocol", "#f44336"),
    Layer2Node("proto_vector", "Vector Search", "#00bcd4"),
    Layer2Node("proto_history", "History Timeline", "#607d8b"),
    Layer2Node("proto_connector", "Connector Protocol", "#ff9800"),
    Layer2Node("proto_3d", "3D State Protocol", "#00ffff"),
]

def get_layer2_state() -> Dict:
    return {
        "id": 2,
        "name": "Protocol Sphere",
        "radius": 5,
        "color": "#00ffff",
        "opacity": 0.3,
        "nodes": [{"id": n.id, "name": n.name, "type": n.node_type, "color": n.color, "status": "active"} for n in LAYER2_MODULES]
    }
