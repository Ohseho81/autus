"""
LimePass Tile Services API Router
==================================
Autus-OS Protocol v1 - Layer 5: Tile API Layer

7 Tile endpoints for ONE-SCREEN UI Kernel:
- /svc/student/{id}     → Student Twin metrics
- /svc/cohort/{id}      → Cohort distribution/heatmap
- /svc/university/{id}  → University capacity/quality
- /svc/employer/{id}    → Employer jobfit/retention
- /svc/country/{code}   → Country drift indicators
- /svc/flow             → Flow stage distribution
- /svc/autopilot        → OS brain recommendations
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.services.tiles import (
    TileResponse,
    get_student_tile,
    get_cohort_tile,
    get_university_tile,
    get_employer_tile,
    get_country_tile,
    get_flow_tile,
    get_autopilot_tile
)

router = APIRouter(prefix="/svc", tags=["tiles", "ui-kernel"])


# ============================================================
# TILE ENDPOINTS
# ============================================================

@router.get("/student/{student_id}", response_model=TileResponse)
async def student_tile(student_id: str):
    """
    Student Tile - Individual student twin data
    
    Returns metrics (skill, adaptation, risk), predictions, and flow state.
    Used by: CircleGauge component in ONE-SCREEN UI
    """
    try:
        return get_student_tile(student_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohort/{cohort_id}", response_model=TileResponse)
async def cohort_tile(cohort_id: str):
    """
    Cohort Tile - Cohort distribution and predictions
    
    Returns risk distribution, industry alignment, bottleneck info.
    Used by: Heatmap component in ONE-SCREEN UI
    """
    try:
        return get_cohort_tile(cohort_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/university/{org_id}", response_model=TileResponse)
async def university_tile(org_id: str):
    """
    University Tile - Institution metrics
    
    Returns capacity usage, quality scores, high-risk students.
    Used by: BarStack component in ONE-SCREEN UI
    """
    try:
        return get_university_tile(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employer/{org_id}", response_model=TileResponse)
async def employer_tile(org_id: str):
    """
    Employer Tile - Company/employer metrics
    
    Returns jobfit average, retention score, top candidates.
    Used by: BarStack component in ONE-SCREEN UI
    """
    try:
        return get_employer_tile(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/country/{country_code}", response_model=TileResponse)
async def country_tile(country_code: str):
    """
    Country Tile - Country-level indicators
    
    Returns country score, trend, variance, policy volatility.
    Used by: DriftIndicator component in ONE-SCREEN UI
    """
    try:
        return get_country_tile(country_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flow", response_model=TileResponse)
async def flow_tile(
    cohort_id: Optional[str] = Query(None, description="Cohort ID for distribution view"),
    student_id: Optional[str] = Query(None, description="Student ID for individual flow")
):
    """
    Flow Tile - Stage distribution and bottleneck detection
    
    Returns 5-stage flow (APPLY→VERIFY→PROCESS→COMMIT→RECONCILE).
    Used by: TimelineStrip component in ONE-SCREEN UI
    """
    try:
        return get_flow_tile(cohort_id=cohort_id, student_id=student_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/autopilot", response_model=TileResponse)
async def autopilot_tile(
    scope: str = Query("cohort", description="Scope: student, cohort, university, employer, system"),
    target_id: Optional[str] = Query(None, description="Target entity ID")
):
    """
    Autopilot Tile - OS Brain Recommendations
    
    THE MOST IMPORTANT TILE: Returns recommended action, priority, expected impact.
    This is what tells operators exactly what to do next.
    Used by: ActionStrip component in ONE-SCREEN UI
    """
    valid_scopes = ["student", "cohort", "university", "employer", "system"]
    if scope not in valid_scopes:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid scope. Must be one of: {valid_scopes}"
        )
    
    try:
        return get_autopilot_tile(scope=scope, target_id=target_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AGGREGATED ENDPOINTS
# ============================================================

@router.get("/dashboard", response_model=dict)
async def dashboard_tiles(
    cohort_id: str = Query("COHORT_2026_PH2KR", description="Active cohort ID")
):
    """
    Dashboard - All tiles for ONE-SCREEN UI in single call
    
    Returns all 7 tiles pre-loaded for immediate UI rendering.
    Optimized for initial page load.
    """
    try:
        return {
            "cohort": get_cohort_tile(cohort_id).model_dump(),
            "flow": get_flow_tile(cohort_id=cohort_id).model_dump(),
            "autopilot": get_autopilot_tile(scope="cohort", target_id=cohort_id).model_dump(),
            "countries": {
                "KR": get_country_tile("KR").model_dump(),
                "PH": get_country_tile("PH").model_dump()
            },
            "meta": {
                "cohort_id": cohort_id,
                "tile_count": 7,
                "version": "1.0.0"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def tiles_health():
    """Health check for tile services"""
    return {
        "status": "healthy",
        "services": [
            "student_tile", "cohort_tile", "university_tile",
            "employer_tile", "country_tile", "flow_tile", "autopilot_tile"
        ],
        "version": "1.0.0"
    }
