"""Cohort Tile Service - Cohort distribution and predictions"""
from typing import Dict, Any, List, Optional
from .base import TileResponse


def get_cohort_tile(cohort_id: str, db=None) -> TileResponse:
    """
    Get cohort tile data for heatmap/distribution rendering
    
    Returns:
        - size, predictions
        - risk_distribution: low/mid/high buckets
        - industry_alignment
        - bottleneck info
    """
    data = {
        "id": cohort_id,
        "size": 100,
        "graduation_prediction": 0.87,
        "employment_prediction": 0.82,
        "settlement_prediction": 0.75,
        "risk_distribution": [
            {"bucket": "low", "ratio": 0.60, "count": 60},
            {"bucket": "mid", "ratio": 0.30, "count": 30},
            {"bucket": "high", "ratio": 0.10, "count": 10}
        ],
        "industry_alignment": [
            {"industry": "EDU", "ratio": 0.40},
            {"industry": "TECH", "ratio": 0.30},
            {"industry": "SERVICE", "ratio": 0.20},
            {"industry": "OTHER", "ratio": 0.10}
        ],
        "stage_distribution": [
            {"stage": "APPLY", "count": 5},
            {"stage": "VERIFY", "count": 12},
            {"stage": "PROCESS", "count": 53},
            {"stage": "COMMIT", "count": 25},
            {"stage": "RECONCILE", "count": 5}
        ],
        "bottleneck_stage": "VERIFY",
        "high_risk_students": ["STU_031", "STU_047", "STU_089"]
    }
    
    confidence = 0.85
    
    return TileResponse.create(data=data, confidence=confidence)


def get_cohort_risk_distribution(cohort_id: str) -> List[Dict]:
    """Get risk distribution for cohort heatmap"""
    tile = get_cohort_tile(cohort_id)
    return tile.data.get("risk_distribution", [])
