"""Layer 1: OS Core Sphere - 12 모듈"""
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Layer1Node:
    id: str
    name: str
    color: str
    status: str = "active"

LAYER1_MODULES = [
    Layer1Node("kernel_runtime", "Runtime Kernel", "#ffff00"),
    Layer1Node("kernel_config", "Config Kernel", "#ffd700"),
    Layer1Node("kernel_loop", "Loop Engine (PER/SPG/FACT/TRUST)", "#ff8800"),
    Layer1Node("kernel_armp", "Security Kernel (ARMP)", "#ff0000"),
    Layer1Node("kernel_memory", "MemoryOS Kernel", "#00ff88"),
    Layer1Node("kernel_workflow", "Workflow Kernel", "#0088ff"),
    Layer1Node("kernel_eventbus", "Event Bus", "#00ffff"),
    Layer1Node("kernel_telemetry", "Telemetry Kernel", "#888888"),
    Layer1Node("kernel_plugin", "Plugin Loader", "#9c27b0"),
    Layer1Node("kernel_device", "Device Bridge Core", "#607d8b"),
    Layer1Node("kernel_zero_id", "Zero Identity Guard", "#ffffff"),
    Layer1Node("kernel_schema", "Schema Registry Core", "#4caf50"),
]

def get_layer1_state() -> Dict:
    return {
        "id": 1,
        "name": "OS Core Sphere",
        "radius": 2,
        "color": "#ffffff",
        "opacity": 1.0,
        "nodes": [{"id": n.id, "name": n.name, "type": "kernel", "color": n.color, "status": n.status} for n in LAYER1_MODULES]
    }
