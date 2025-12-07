"""Flow Tile Service - Flow stage distribution and bottleneck detection"""
from typing import Dict, Any, List, Optional
from .base import TileResponse


# Standard 5-stage flow (Autus-OS Protocol v1)
FLOW_STAGES = ["APPLY", "VERIFY", "PROCESS", "COMMIT", "RECONCILE"]


def get_flow_tile(
    cohort_id: str = None, 
    student_id: str = None,
    db=None
) -> TileResponse:
    """
    Get flow tile data for timeline/stage visualization
    
    Returns:
        - stages, distribution
        - bottleneck detection
        - stage-level metrics
    """
    if student_id:
        # Individual student flow
        data = {
            "scope": "student",
            "target_id": student_id,
            "stages": FLOW_STAGES,
            "current_stage": "PROCESS",
            "current_stage_index": 2,
            "next_stage": "COMMIT",
            "days_in_current": 12,
            "avg_days_per_stage": [3, 7, 14, 5, 3],
            "estimated_completion_days": 22,
            "blockers": [],
            "stage_history": [
                {"stage": "APPLY", "entered": "2025-09-01", "exited": "2025-09-04"},
                {"stage": "VERIFY", "entered": "2025-09-04", "exited": "2025-09-11"},
                {"stage": "PROCESS", "entered": "2025-09-11", "exited": None}
            ]
        }
    else:
        # Cohort flow distribution
        cohort_id = cohort_id or "COHORT_DEFAULT"
        data = {
            "scope": "cohort",
            "target_id": cohort_id,
            "stages": FLOW_STAGES,
            "distribution": [
                {"stage": "APPLY", "count": 5, "pct": 0.05, "avg_days": 3},
                {"stage": "VERIFY", "count": 12, "pct": 0.12, "avg_days": 8},
                {"stage": "PROCESS", "count": 53, "pct": 0.53, "avg_days": 15},
                {"stage": "COMMIT", "count": 25, "pct": 0.25, "avg_days": 5},
                {"stage": "RECONCILE", "count": 5, "pct": 0.05, "avg_days": 4}
            ],
            "bottleneck_stage": "VERIFY",
            "bottleneck_reason": "document_verification_delay",
            "flow_velocity": 0.78,  # 1.0 = optimal
            "stuck_students": [
                {"id": "STU_031", "stage": "VERIFY", "days": 21},
                {"id": "STU_047", "stage": "VERIFY", "days": 18}
            ],
            "estimated_cohort_completion": "2026-03-15"
        }
    
    confidence = 0.88
    
    return TileResponse.create(data=data, confidence=confidence)


def get_bottleneck_info(cohort_id: str) -> Dict[str, Any]:
    """Get bottleneck analysis for cohort"""
    tile = get_flow_tile(cohort_id=cohort_id)
    return {
        "stage": tile.data.get("bottleneck_stage"),
        "reason": tile.data.get("bottleneck_reason"),
        "stuck_count": len(tile.data.get("stuck_students", []))
    }
