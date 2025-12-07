from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/mars", tags=["Mars OS - PKMARS@v1"])

MARS_TWINS = {
    "HABITAT": {"domes": 12, "modules": 48, "pressure_kpa": 101.3, "integrity": 0.98, "population": 847},
    "LIFE_SUPPORT": {"oxygen_level": 0.21, "water_liters": 850000, "food_days": 180, "co2_scrubber": 0.95},
    "RADIATION": {"radiation_index": 0.45, "exposure_by_zone": {"dome_a": 0.12, "dome_b": 0.15, "outdoor": 2.8}},
    "ENERGY": {"solar_kw": 12000, "nuclear_kw": 8000, "storage_kwh": 95000, "consumption_kw": 15000},
    "TRANSPORT": {"rovers": 24, "active_missions": 3, "cargo_pending_kg": 4500}
}

MARS_EVENTS = [
    {"id": "MARS-EVT-001", "type": "ENV@M01", "name": "radiation_level_logged", "severity": "info"},
    {"id": "MARS-EVT-002", "type": "ENV@M02", "name": "pressure_breach_detected", "severity": "critical"},
    {"id": "MARS-EVT-003", "type": "ENV@M03", "name": "oxygen_level_anomaly", "severity": "warning"},
    {"id": "MARS-EVT-004", "type": "BIO@M04", "name": "closed_ecosystem_anomaly", "severity": "warning"},
    {"id": "MARS-EVT-005", "type": "ENG@M05", "name": "reactor_status_change", "severity": "info"}
]

MARS_POLICIES = {
    "MP01": {"name": "life_support_policy", "min_oxygen": 0.19, "max_co2": 0.04},
    "MP02": {"name": "EVA_policy", "max_duration_hours": 6, "buddy_required": True},
    "MP03": {"name": "habitat_integrity_policy", "min_pressure_kpa": 95, "emergency_seal_auto": True}
}

MARS_RISKS = {
    "MR01": {"name": "habitat_loss", "probability": 0.02, "impact": "critical"},
    "MR02": {"name": "life_support_failure", "probability": 0.05, "impact": "critical"},
    "MR03": {"name": "radiation_overexposure", "probability": 0.08, "impact": "high"}
}

@router.get("/pack/pkmars")
async def get_pkmars_pack():
    return {
        "pack_id": "PKMARS@v1",
        "name": "Mars Colony OS",
        "version": "1.0.0",
        "base": "PKCITY@v1",
        "domains": ["HABITAT", "LIFE_SUPPORT", "RADIATION", "ENERGY", "TRANSPORT"],
        "events": len(MARS_EVENTS),
        "policies": len(MARS_POLICIES),
        "risks": len(MARS_RISKS)
    }

@router.get("/twins")
async def get_mars_twins():
    return {"twins": MARS_TWINS, "updated_at": datetime.now().isoformat()}

@router.get("/twins/{twin_name}")
async def get_mars_twin(twin_name: str):
    twin = MARS_TWINS.get(twin_name.upper())
    if not twin:
        return {"error": "twin_not_found", "available": list(MARS_TWINS.keys())}
    return {"name": twin_name.upper(), "state": twin}

@router.get("/events")
async def get_mars_events():
    return {"events": MARS_EVENTS}

@router.get("/policies")
async def get_mars_policies():
    return {"policies": MARS_POLICIES}

@router.get("/risks")
async def get_mars_risks():
    return {"risks": MARS_RISKS}

@router.get("/dashboard")
async def get_mars_dashboard():
    h = MARS_TWINS["HABITAT"]
    ls = MARS_TWINS["LIFE_SUPPORT"]
    r = MARS_TWINS["RADIATION"]
    e = MARS_TWINS["ENERGY"]
    
    return {
        "colony": "Mars Alpha",
        "status": "operational",
        "population": h["population"],
        "habitat_integrity": h["integrity"],
        "life_support": {
            "oxygen": ls["oxygen_level"],
            "water_days": round(ls["water_liters"] / (h["population"] * 3)),
            "food_days": ls["food_days"]
        },
        "energy": {
            "production_kw": e["solar_kw"] + e["nuclear_kw"],
            "consumption_kw": e["consumption_kw"],
            "reserve_hours": round(e["storage_kwh"] / e["consumption_kw"])
        },
        "radiation_index": r["radiation_index"],
        "alerts": [e for e in MARS_EVENTS if e["severity"] in ["critical", "warning"]],
        "updated_at": datetime.now().isoformat()
    }

@router.get("/mapping")
async def get_earth_mars_mapping():
    return {
        "mapping": [
            {"earth": "CITY-TWN::POPULATION", "mars": "MARS-TWN::HABITAT", "note": "people → modules"},
            {"earth": "CITY-TWN::ENERGY", "mars": "MARS-TWN::LIFE_SUPPORT", "note": "grid → life support"},
            {"earth": "CITY-TWN::ENVIRONMENT", "mars": "MARS-TWN::RADIATION", "note": "air quality → radiation"}
        ]
    }
