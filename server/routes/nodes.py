"""
AUTUS 3D Node API
- /api/state/<node_type> - 노드 상태 조회
- /api/trigger - 실시간 업데이트 트리거
"""
from fastapi import APIRouter, BackgroundTasks
from typing import Dict, Any
import asyncio
import random

import math

router = APIRouter(prefix="/api", tags=["3D Nodes"])


# --- Layer 1: Core Sphere (12 kernels) ---

KERNELS = [
    {"node_id": "kernel_runtime", "label": "런타임 엔진"},
    {"node_id": "kernel_config", "label": "설정 관리"},
    {"node_id": "kernel_loop", "label": "Core Loop"},
    {"node_id": "kernel_armp", "label": "보안 커널(ARMP)"},
    {"node_id": "kernel_memory", "label": "MemoryOS"},
    {"node_id": "kernel_workflow", "label": "워크플로우 엔진"},
    {"node_id": "kernel_eventbus", "label": "이벤트 버스"},
    {"node_id": "kernel_telemetry", "label": "원격 측정"},
    {"node_id": "kernel_plugin", "label": "플러그인 로더"},
    {"node_id": "kernel_device", "label": "디바이스 브릿지"},
    {"node_id": "kernel_zero_id", "label": "Zero Identity 가드"},
    {"node_id": "kernel_schema", "label": "스키마 레지스트리"}
]


def get_identity_nodes():
    nodes = []
    for i, k in enumerate(KERNELS):
        angle = (i / len(KERNELS)) * 2 * math.pi
        nodes.append({
            "node_id": k["node_id"],
            "type": "kernel",
            "label": k["label"],
            "layer": 1,
            "color": "#ff3333",
            "position": [2 * math.cos(angle), 0, 2 * math.sin(angle)],
            "state": "active"
        })
    return nodes


# --- Layer 2: Protocol Sphere (12 protocols) ---

PROTOCOLS = [
    {"node_id": "proto_identity", "label": "Identity Core"},
    {"node_id": "proto_auth_sync", "label": "Auth & Device Sync"},
    {"node_id": "proto_memory", "label": "Memory Protocol"},
    {"node_id": "proto_workflow", "label": "Workflow Protocol"},
    {"node_id": "proto_pack_api", "label": "Pack API Schema"},
    {"node_id": "proto_preference", "label": "Preference Vector"},
    {"node_id": "proto_pattern", "label": "Pattern Tracker"},
    {"node_id": "proto_risk", "label": "Risk Policy"},
    {"node_id": "proto_vector", "label": "Vector Search"},
    {"node_id": "proto_history", "label": "History Timeline"},
    {"node_id": "proto_connector", "label": "Connector Protocol"},
    {"node_id": "proto_3d", "label": "3D State Protocol"}
]


def get_protocol_nodes():
    nodes = []
    for i, p in enumerate(PROTOCOLS):
        angle = (i / len(PROTOCOLS)) * 2 * math.pi
        nodes.append({
            "node_id": p["node_id"],
            "type": "protocol",
            "label": p["label"],
            "layer": 2,
            "color": "#00cfff",
            "position": [5 * math.cos(angle), 0, 5 * math.sin(angle)],
            "state": "standard"
        })
    return nodes


# --- Layer 3: Pack Sphere (47 packs, grouped by category) ---

PACKS = [
    # operations (8)
    {"node_id": "pack_emo_cmms", "label": "EMO CMMS", "category": "operations"},
    {"node_id": "pack_building_fm", "label": "Building FM", "category": "operations"},
    {"node_id": "pack_energy_manager", "label": "Energy Manager", "category": "operations"},
    {"node_id": "pack_asset_tracker", "label": "Asset Tracker", "category": "operations"},
    {"node_id": "pack_facility_monitor", "label": "Facility Monitor", "category": "operations"},
    {"node_id": "pack_safety_guard", "label": "Safety Guard", "category": "operations"},
    {"node_id": "pack_maintenance_ai", "label": "Maintenance AI", "category": "operations"},
    {"node_id": "pack_operation_dashboard", "label": "Operation Dashboard", "category": "operations"},
    # education (8)
    {"node_id": "pack_jeju_school", "label": "Jeju School", "category": "education"},
    {"node_id": "pack_student_profile", "label": "Student Profile", "category": "education"},
    {"node_id": "pack_edu_bridge", "label": "Edu Bridge", "category": "education"},
    {"node_id": "pack_learning_path", "label": "Learning Path", "category": "education"},
    {"node_id": "pack_exam_generator", "label": "Exam Generator", "category": "education"},
    {"node_id": "pack_attendance_ai", "label": "Attendance AI", "category": "education"},
    {"node_id": "pack_edu_reporter", "label": "Edu Reporter", "category": "education"},
    {"node_id": "pack_classroom_manager", "label": "Classroom Manager", "category": "education"},
    # sports (7)
    {"node_id": "pack_nba_atb", "label": "NBA ATB", "category": "sports"},
    {"node_id": "pack_unit_league", "label": "Unit League", "category": "sports"},
    {"node_id": "pack_sports_analytics", "label": "Sports Analytics", "category": "sports"},
    {"node_id": "pack_match_predictor", "label": "Match Predictor", "category": "sports"},
    {"node_id": "pack_player_tracker", "label": "Player Tracker", "category": "sports"},
    {"node_id": "pack_fitness_coach", "label": "Fitness Coach", "category": "sports"},
    {"node_id": "pack_scoreboard", "label": "Scoreboard", "category": "sports"},
    # city (6)
    {"node_id": "pack_city_master", "label": "City Master", "category": "city"},
    {"node_id": "pack_traffic_simulator", "label": "Traffic Simulator", "category": "city"},
    {"node_id": "pack_urban_planner", "label": "Urban Planner", "category": "city"},
    {"node_id": "pack_waste_manager", "label": "Waste Manager", "category": "city"},
    {"node_id": "pack_public_safety", "label": "Public Safety", "category": "city"},
    {"node_id": "pack_smart_parking", "label": "Smart Parking", "category": "city"},
    # finance (5)
    {"node_id": "pack_tax_optimizer", "label": "Tax Optimizer", "category": "finance"},
    {"node_id": "pack_fx_hedge", "label": "FX Hedge", "category": "finance"},
    {"node_id": "pack_budget_planner", "label": "Budget Planner", "category": "finance"},
    {"node_id": "pack_expense_tracker", "label": "Expense Tracker", "category": "finance"},
    {"node_id": "pack_investment_advisor", "label": "Investment Advisor", "category": "finance"},
    # governance (5)
    {"node_id": "pack_evidence_logger", "label": "Evidence Logger", "category": "governance"},
    {"node_id": "pack_risk_library", "label": "Risk Library", "category": "governance"},
    {"node_id": "pack_policy_manager", "label": "Policy Manager", "category": "governance"},
    {"node_id": "pack_compliance_ai", "label": "Compliance AI", "category": "governance"},
    {"node_id": "pack_audit_trail", "label": "Audit Trail", "category": "governance"},
    # meta (8)
    {"node_id": "pack_local_memory", "label": "Local Memory", "category": "meta"},
    {"node_id": "pack_pack_factory", "label": "Pack Factory", "category": "meta"},
    {"node_id": "pack_pattern_learner", "label": "Pattern Learner", "category": "meta"},
    {"node_id": "pack_preference_vector", "label": "Preference Vector", "category": "meta"},
    {"node_id": "pack_privacy_guard", "label": "Privacy Guard", "category": "meta"},
    {"node_id": "pack_runtime_controller", "label": "Runtime Controller", "category": "meta"},
    {"node_id": "pack_style_analyzer", "label": "Style Analyzer", "category": "meta"},
    {"node_id": "pack_zero_identity", "label": "Zero Identity Pack", "category": "meta"}
]

def get_pack_nodes():
    nodes = []
    total = len(PACKS)
    for i, p in enumerate(PACKS):
        angle = (i / total) * 2 * math.pi
        nodes.append({
            "node_id": p["node_id"],
            "type": "pack",
            "label": p["label"],
            "category": p["category"],
            "layer": 3,
            "color": "#FFD600",
            "position": [10 * math.cos(angle), 0, 10 * math.sin(angle)],
            "state": "normal"
        })
    return nodes

@router.get("/state/risk")
async def get_risk_state():
    risks = [
        {"article": "article_1", "level": random.uniform(0.1, 0.5), "active": False},
        {"article": "article_2", "level": random.uniform(0.05, 0.3), "active": False},
    ]
    colors = {"article_1": "#ff0000", "article_2": "#ff8800"}
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
            "node_id": f"pack_{p['name']}",
            "position": [8*math.cos(angle), 2, 8*math.sin(angle)],
            "properties": {
                "color": colors.get(p["category"], "#888"),
                "scale": 1.5,
                "name": p["name"]
            }
        })
    return {"nodes": nodes}


# --- All nodes (Triple Sphere) ---

# --- All nodes (Triple Sphere) ---

@router.get("/nodes/all")
async def get_all_nodes():
    return {
        "identity": get_identity_nodes(),
        "protocols": get_protocol_nodes(),
        "packs": get_pack_nodes()
    }

@router.post("/event")
async def handle_3d_event(event: Dict[str, Any]):
    print(f"3D Event: {event}")
    return {"status": "ok", "received": event}

@router.post("/trigger/update")
async def trigger_update(node_id: str = "workflow_2", color: str = "#ff0000"):
    """실시간 업데이트 트리거 (테스트용)"""
    from server.websocket import manager
    
    update = {
        "type": "node_update",
        "node": {
            "node_id": node_id,
            "position": [random.uniform(-2, 2), random.uniform(-1, 1), random.uniform(-2, 2)],
            "properties": {
                "color": color,
                "scale": random.uniform(0.8, 1.5),
                "state": "running"
            }
        }
    }
    
    await manager.broadcast(update)
    return {"status": "ok", "broadcast": update}

@router.post("/trigger/random")
async def trigger_random_update():
    """랜덤 노드 업데이트 (테스트용)"""
    from server.websocket import manager
    
    node_types = ["workflow", "pattern", "risk", "pack"]
    colors = ["#ff0000", "#00ff00", "#0088ff", "#ff8800", "#9C27B0"]
    
    node_type = random.choice(node_types)
    node_id = f"{node_type}_{random.randint(0, 4)}"
    
    update = {
        "type": "node_update",
        "node": {
            "node_id": node_id,
            "position": [random.uniform(-5, 5), random.uniform(-2, 2), random.uniform(-5, 5)],
            "properties": {
                "color": random.choice(colors),
                "scale": random.uniform(0.5, 2.0),
                "state": random.choice(["idle", "running", "complete"])
            }
        }
    }
    
    await manager.broadcast(update)
    return {"status": "ok", "broadcast": update}
