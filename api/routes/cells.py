from fastapi import APIRouter

router = APIRouter(prefix="/cell", tags=["Cells"])

CELL_INFO = {
    "angeles-school": {
        "domain": "education/sports",
        "packs": [
            {"id": "school.attendance", "version": "1.0.0", "status": "active"},
            {"id": "school.admissions", "version": "0.9.3", "status": "testing"},
            {"id": "sports.training.schedule", "version": "1.1.1", "status": "active"},
        ],
        "events_24h": 12340,
    },
    "jeju-city": {
        "domain": "city/cmms",
        "packs": [
            {"id": "cmms.facility", "version": "1.0.0", "status": "active"},
        ],
        "events_24h": 5420,
    },
    "clark-campus": {
        "domain": "education/visa",
        "packs": [
            {"id": "visa.screening", "version": "0.8.0", "status": "testing"},
        ],
        "events_24h": 2310,
    },
}

@router.get("/{cell_id}")
async def get_cell(cell_id: str):
    info = CELL_INFO.get(cell_id)
    if not info:
        return {"cell_id": cell_id, "status": "unknown", "packs": []}
    return {"cell_id": cell_id, "status": "active", **info}

@router.get("")
async def list_cells():
    return {"cells": list(CELL_INFO.keys()), "total": len(CELL_INFO)}
