"""Student Tile Service - Individual student twin data"""
from typing import Dict, Any, Optional
from .base import TileResponse


def get_student_tile(student_id: str, db=None) -> TileResponse:
    """
    Get student tile data for UI rendering
    
    Returns:
        - metrics: skill, adaptation, risk
        - prediction: graduation, employment, settlement
        - flow: current_stage, next_step
    """
    # TODO: Connect to actual Twin Engine
    # For now, return mock data structure
    
    data = {
        "id": student_id,
        "name": "Masked",  # Privacy: never expose real name
        "metrics": {
            "skill": 0.80,
            "adaptation": 0.78,
            "risk": 0.15
        },
        "prediction": {
            "graduation": 0.90,
            "employment": 0.84,
            "settlement": 0.76
        },
        "flow": {
            "current_stage": "PROCESS",
            "next_step": "COMMIT",
            "days_in_stage": 12
        },
        "alerts": []
    }
    
    confidence = 0.87
    
    return TileResponse.create(data=data, confidence=confidence)


def get_student_metrics(student_id: str) -> Dict[str, float]:
    """Get just the metrics for a student"""
    tile = get_student_tile(student_id)
    return tile.data.get("metrics", {})


def get_student_predictions(student_id: str) -> Dict[str, float]:
    """Get predictions for a student"""
    tile = get_student_tile(student_id)
    return tile.data.get("prediction", {})
