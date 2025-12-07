"""University Tile Service - University/institution metrics"""
from typing import Dict, Any, List, Optional
from .base import TileResponse


def get_university_tile(org_id: str, db=None) -> TileResponse:
    """
    Get university tile data for capacity/quality bars
    
    Returns:
        - capacity_usage, quality metrics
        - cohort predictions
        - high risk students list
    """
    data = {
        "id": org_id,
        "name": "Masked University",
        "type": "UNIVERSITY",
        "capacity_usage": 0.78,
        "quality": 0.86,
        "risk": 0.18,
        "metrics": {
            "enrollment_rate": 0.92,
            "retention_rate": 0.88,
            "graduation_rate": 0.85,
            "satisfaction_score": 4.2
        },
        "cohort_graduation_prediction": 0.88,
        "cohort_employment_prediction": 0.82,
        "active_students": 156,
        "high_risk_students": ["STU_031", "STU_047"],
        "departments": [
            {"name": "Engineering", "students": 45, "risk": 0.12},
            {"name": "Business", "students": 38, "risk": 0.15},
            {"name": "Hospitality", "students": 73, "risk": 0.22}
        ]
    }
    
    confidence = 0.89
    
    return TileResponse.create(data=data, confidence=confidence)


def get_university_capacity(org_id: str) -> Dict[str, float]:
    """Get capacity metrics for bar chart"""
    tile = get_university_tile(org_id)
    return {
        "capacity_usage": tile.data.get("capacity_usage", 0),
        "quality": tile.data.get("quality", 0)
    }
