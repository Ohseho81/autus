"""Country Tile Service - Country-level drift and policy indicators"""
from typing import Dict, Any, List
from .base import TileResponse


def get_country_tile(country_code: str, db=None) -> TileResponse:
    """
    Get country tile data for drift/trend indicators
    
    Returns:
        - country_score, trend, variance
        - labor_demand, policy_volatility
        - drift indicators for UI
    """
    # Country-specific data (example: KR, PH)
    country_data = {
        "KR": {
            "code": "KR",
            "name": "South Korea",
            "country_score": 0.92,
            "trend": 0.04,  # positive = improving
            "variance": 0.12,
            "labor_demand": 0.82,
            "policy_volatility": 0.15,
            "metrics": {
                "visa_approval_rate": 0.89,
                "avg_processing_days": 21,
                "employment_rate": 0.94,
                "settlement_rate": 0.78
            },
            "drift_indicators": {
                "economic": 0.03,
                "regulatory": -0.02,
                "social": 0.01
            }
        },
        "PH": {
            "code": "PH",
            "name": "Philippines",
            "country_score": 0.85,
            "trend": 0.06,
            "variance": 0.18,
            "labor_demand": 0.75,
            "policy_volatility": 0.22,
            "metrics": {
                "departure_rate": 0.92,
                "training_completion": 0.88,
                "document_ready_rate": 0.85,
                "partner_quality": 0.80
            },
            "drift_indicators": {
                "economic": 0.05,
                "regulatory": 0.02,
                "social": 0.03
            }
        }
    }
    
    data = country_data.get(country_code.upper(), {
        "code": country_code.upper(),
        "name": "Unknown",
        "country_score": 0.70,
        "trend": 0.00,
        "variance": 0.20,
        "labor_demand": 0.50,
        "policy_volatility": 0.30,
        "metrics": {},
        "drift_indicators": {}
    })
    
    confidence = 0.90
    
    return TileResponse.create(data=data, confidence=confidence)


def get_country_drift(country_code: str) -> Dict[str, float]:
    """Get drift indicators for country"""
    tile = get_country_tile(country_code)
    return tile.data.get("drift_indicators", {})
