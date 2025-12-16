from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/city", tags=["City OS - PKCITY@v1"])

CITY_TWINS = {
    "POPULATION": {"total_residents": 15000, "levels": {"L0": 5000, "L1": 4000, "L2": 3000, "L3": 2000, "L4": 1000}, "households": 4200, "inflow_monthly": 120, "outflow_monthly": 80},
    "ECONOMY": {"gdp_like": 45000000, "total_wage_monthly": 12000000, "city_revenue": 2500000, "subsidies": 500000, "businesses_active": 340},
    "ENERGY": {"production_kwh": 45000, "consumption_kwh": 38000, "storage_level": 0.72, "self_sufficiency_rate": 0.95},
    "RESIDENCE": {"buildings": 180, "units": 5200, "occupancy_rate": 0.88, "maintenance_backlog": 12},
    "LABOR": {"active_jobs": 8500, "filled_jobs": 7800, "unemployment_rate": 0.08, "avg_hours_weekly": 42},
    "TRANSPORT": {"shuttle_routes": 12, "daily_trips": 4500, "incidents_monthly": 3, "avg_commute_min": 18},
    "SECURITY": {"incidents_open": 5, "response_time_min": 4.2, "safety_index": 0.92},
    "HEALTH": {"health_index": 0.87, "disease_cases": 12, "screening_coverage": 0.78},
    "ENVIRONMENT": {"air_index": 0.91, "water_index": 0.94, "noise_index": 0.82, "waste_tons_daily": 8.5},
    "GOVERNANCE": {"active_policies": 24, "vote_participation_rate": 0.67, "disputes_open": 3}
}

CITY_EVENTS = {
    "POP": ["resident_registered", "residency_level_changed", "moved_in", "moved_out", "household_created"],
    "ECO": ["salary_paid", "tax_charged", "subsidy_granted", "business_registered", "business_closed"],
    "ENG": ["grid_production_logged", "grid_consumption_logged", "storage_charge", "storage_discharge", "energy_alarm"],
    "RES": ["building_created", "inspection_passed", "maintenance_ticket_opened", "maintenance_ticket_closed"],
    "LAB": ["job_created", "job_filled", "job_ended", "shift_logged"],
    "TRN": ["shuttle_route_update", "traffic_incident", "cargo_movement"],
    "SEC": ["safety_incident", "alarm_triggered", "emergency_resolved"],
    "BIO": ["health_check", "disease_case", "health_program_joined"],
    "ENV": ["air_quality_sampled", "water_quality_sampled", "noise_logged", "waste_collected"],
    "GOV": ["policy_proposed", "policy_voted", "policy_approved", "policy_revoked", "dispute_opened", "dispute_resolved"]
}

CITY_POLICIES = {
    "P01": "residency_policy", "P02": "taxation_policy", "P03": "energy_policy",
    "P04": "labor_policy", "P05": "housing_policy", "P06": "security_policy",
    "P07": "health_policy", "P08": "environment_policy", "P09": "governance_policy"
}

CITY_RISKS = {
    "R01": {"name": "over_population", "threshold": 20000, "current": 15000},
    "R02": {"name": "economic_instability", "threshold": 0.15, "current": 0.08},
    "R03": {"name": "energy_shortage", "threshold": 0.8, "current": 0.95},
    "R04": {"name": "housing_crisis", "threshold": 0.95, "current": 0.88},
    "R05": {"name": "labor_exploitation", "threshold": 50, "current": 42},
    "R06": {"name": "safety_collapse", "threshold": 0.7, "current": 0.92},
    "R07": {"name": "epidemic", "threshold": 100, "current": 12},
    "R08": {"name": "environmental_hazard", "threshold": 0.6, "current": 0.89},
    "R09": {"name": "governance_legitimacy", "threshold": 0.4, "current": 0.67}
}

@router.get("/pack/pkcity")
async def get_pkcity_pack():
    return {
        "pack_id": "PKCITY@v1",
        "name": "City Operating System",
        "version": "1.0.0",
        "domains": list(CITY_TWINS.keys()),
        "event_types": sum(len(v) for v in CITY_EVENTS.values()),
        "policies": len(CITY_POLICIES),
        "risks": len(CITY_RISKS)
    }

@router.get("/twins")
async def get_city_twins():
    return {"twins": CITY_TWINS, "updated_at": datetime.now().isoformat()}

@router.get("/twins/{twin_name}")
async def get_city_twin(twin_name: str):
    twin = CITY_TWINS.get(twin_name.upper())
    if not twin:
        return {"error": "twin_not_found", "available": list(CITY_TWINS.keys())}
    return {"name": twin_name.upper(), "state": twin}

@router.get("/events")
async def get_city_events():
    return {"events": CITY_EVENTS}

@router.get("/policies")
async def get_city_policies():
    return {"policies": CITY_POLICIES}

@router.get("/risks")
async def get_city_risks():
    return {"risks": CITY_RISKS}

@router.get("/dashboard")
async def get_city_dashboard():
    pop = CITY_TWINS["POPULATION"]
    eco = CITY_TWINS["ECONOMY"]
    eng = CITY_TWINS["ENERGY"]
    sec = CITY_TWINS["SECURITY"]
    hlth = CITY_TWINS["HEALTH"]
    env = CITY_TWINS["ENVIRONMENT"]
    
    return {
        "city": "Angeles Technology Base",
        "status": "operational",
        "population": pop["total_residents"],
        "economy": {"gdp": eco["gdp_like"], "businesses": eco["businesses_active"]},
        "energy": {"self_sufficiency": eng["self_sufficiency_rate"], "storage": eng["storage_level"]},
        "safety_index": sec["safety_index"],
        "health_index": hlth["health_index"],
        "environment_index": round((env["air_index"] + env["water_index"] + env["noise_index"]) / 3, 2),
        "risks_active": len([r for r in CITY_RISKS.values() if isinstance(r, dict) and r.get("current", 0) > r.get("threshold", 1) * 0.8]),
        "updated_at": datetime.now().isoformat()
    }

@router.post("/events/emit")
async def emit_city_event(data: Dict):
    return {
        "status": "emitted",
        "event_id": f"CITY-EVT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "type": data.get("type"),
        "domain": data.get("domain"),
        "timestamp": datetime.now().isoformat()
    }
