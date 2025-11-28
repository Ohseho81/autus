"""Layer 3: Pack Sphere - 48 Packs"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class PackCategory(Enum):
    OPERATIONS = "operations"
    EDUCATION = "education"
    SPORTS = "sports"
    CITY = "city"
    FINANCE = "finance"
    GOVERNANCE = "governance"
    META = "meta"

@dataclass
class PackDef:
    id: str
    name: str
    category: PackCategory
    color: str
    protocols: List[str] = field(default_factory=list)

PACK_REGISTRY: List[PackDef] = [
    # Operations (8)
    PackDef("emo_cmms", "EMO CMMS", PackCategory.OPERATIONS, "#4caf50", ["identity", "memory", "workflow"]),
    PackDef("building_fm", "Building FM", PackCategory.OPERATIONS, "#8bc34a", ["memory", "workflow"]),
    PackDef("energy_optimizer", "Energy Optimizer", PackCategory.OPERATIONS, "#cddc39", ["memory"]),
    PackDef("cleaning_scheduler", "Cleaning Scheduler", PackCategory.OPERATIONS, "#ffeb3b", ["workflow"]),
    PackDef("safety_inspector", "Safety Inspector", PackCategory.OPERATIONS, "#ffc107", ["workflow", "risk"]),
    PackDef("contractor_gateway", "Contractor Gateway", PackCategory.OPERATIONS, "#ff9800", ["workflow"]),
    PackDef("incident_reporter", "Incident Reporter", PackCategory.OPERATIONS, "#ff5722", ["memory"]),
    PackDef("asset_lifecycle", "Asset Lifecycle", PackCategory.OPERATIONS, "#795548", ["memory", "workflow"]),
    # Education (8)
    PackDef("jeju_school", "Jeju School", PackCategory.EDUCATION, "#2196f3", ["identity", "memory", "workflow"]),
    PackDef("student_profile", "Student Profile", PackCategory.EDUCATION, "#03a9f4", ["identity", "memory"]),
    PackDef("learning_loop", "Learning Loop", PackCategory.EDUCATION, "#00bcd4", ["memory", "workflow"]),
    PackDef("math_trainer", "Math Trainer", PackCategory.EDUCATION, "#009688", ["memory", "pattern"]),
    PackDef("english_trainer", "English Trainer", PackCategory.EDUCATION, "#4caf50", ["memory", "pattern"]),
    PackDef("camp_manager", "Camp Manager", PackCategory.EDUCATION, "#8bc34a", ["workflow"]),
    PackDef("harvard_bridge", "Harvard Bridge", PackCategory.EDUCATION, "#cddc39", ["connector"]),
    PackDef("attendance_guard", "Attendance Guard", PackCategory.EDUCATION, "#ffeb3b", ["memory", "pattern"]),
    # Sports (7)
    PackDef("nba_atb", "NBA ATB", PackCategory.SPORTS, "#f44336", ["identity", "workflow"]),
    PackDef("unit_league", "Unit League", PackCategory.SPORTS, "#e91e63", ["memory", "workflow"]),
    PackDef("ai_highlight", "AI Highlight", PackCategory.SPORTS, "#9c27b0", ["memory"]),
    PackDef("player_tracker", "Player Tracker", PackCategory.SPORTS, "#673ab7", ["memory", "pattern"]),
    PackDef("court_scheduler", "Court Scheduler", PackCategory.SPORTS, "#3f51b5", ["workflow"]),
    PackDef("coach_assistant", "Coach Assistant", PackCategory.SPORTS, "#2196f3", ["memory", "workflow"]),
    PackDef("fan_engagement", "Fan Engagement", PackCategory.SPORTS, "#03a9f4", ["identity", "memory"]),
    # City (6)
    PackDef("city_master", "City Master", PackCategory.CITY, "#607d8b", ["identity", "memory", "workflow"]),
    PackDef("district_planner", "District Planner", PackCategory.CITY, "#9e9e9e", ["memory", "workflow"]),
    PackDef("traffic_simulator", "Traffic Simulator", PackCategory.CITY, "#795548", ["memory"]),
    PackDef("tenant_optimizer", "Tenant Optimizer", PackCategory.CITY, "#ff5722", ["memory", "preference"]),
    PackDef("k_street", "K-Street Manager", PackCategory.CITY, "#ff9800", ["workflow"]),
    PackDef("ai_city_twin", "AI City Twin", PackCategory.CITY, "#ffc107", ["memory", "3d"]),
    # Finance (5)
    PackDef("tax_optimizer", "Tax Optimizer", PackCategory.FINANCE, "#4caf50", ["memory", "workflow"]),
    PackDef("corp_structure", "Corp Structure", PackCategory.FINANCE, "#8bc34a", ["memory", "workflow"]),
    PackDef("fx_hedge", "FX Hedge Planner", PackCategory.FINANCE, "#cddc39", ["memory"]),
    PackDef("cashflow", "Cashflow Orchestrator", PackCategory.FINANCE, "#ffeb3b", ["memory", "workflow"]),
    PackDef("tokenization", "Tokenization Bridge", PackCategory.FINANCE, "#ffc107", ["connector"]),
    # Governance (5)
    PackDef("evidence_logger", "Evidence Logger", PackCategory.GOVERNANCE, "#f44336", ["memory"]),
    PackDef("board_minutes", "Board Minutes", PackCategory.GOVERNANCE, "#e91e63", ["memory", "workflow"]),
    PackDef("risk_library", "Risk Library", PackCategory.GOVERNANCE, "#9c27b0", ["memory", "risk"]),
    PackDef("contract_versioning", "Contract Versioning", PackCategory.GOVERNANCE, "#673ab7", ["memory"]),
    PackDef("compliance_monitor", "Compliance Monitor", PackCategory.GOVERNANCE, "#3f51b5", ["risk", "workflow"]),
    # Meta (8)
    PackDef("local_memory", "Local Memory", PackCategory.META, "#212121", ["memory"]),
    PackDef("style_analyzer", "Style Analyzer", PackCategory.META, "#424242", ["preference"]),
    PackDef("zero_identity", "Zero Identity", PackCategory.META, "#616161", ["identity"]),
    PackDef("pack_factory", "Pack Factory", PackCategory.META, "#757575", ["workflow"]),
    PackDef("meta_tester", "Meta Tester", PackCategory.META, "#9e9e9e", ["workflow"]),
    PackDef("device_bridge", "Device Bridge", PackCategory.META, "#bdbdbd", ["connector"]),
    PackDef("saas_adapter", "SaaS Adapter", PackCategory.META, "#e0e0e0", ["connector"]),
    PackDef("history_timeline", "History Timeline", PackCategory.META, "#f5f5f5", ["history"]),
]

def get_layer3_state() -> Dict:
    return {
        "id": 3,
        "name": "Pack Sphere",
        "radius": 10,
        "color": "#00ff00",
        "opacity": 0.2,
        "nodes": [{"id": f"pack_{p.id}", "name": p.name, "type": "pack", "category": p.category.value, "color": p.color, "protocols": p.protocols, "status": "idle"} for p in PACK_REGISTRY]
    }

def get_packs_by_category(cat: PackCategory) -> List[PackDef]:
    return [p for p in PACK_REGISTRY if p.category == cat]
