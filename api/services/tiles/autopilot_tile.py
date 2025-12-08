"""Autopilot Tile Service - OS brain recommendations"""
from typing import Dict, Any, List, Optional
from .base import TileResponse
from enum import Enum


class ActionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AutopilotScope(str, Enum):
    STUDENT = "student"
    COHORT = "cohort"
    UNIVERSITY = "university"
    EMPLOYER = "employer"
    SYSTEM = "system"


def get_autopilot_tile(
    scope: str = "cohort",
    target_id: str = None,
    db=None
) -> TileResponse:
    """
    Get autopilot recommendations - the OS brain's single-line summary
    
    This is the most important tile: it tells operators what to do next.
    
    Returns:
        - recommended_action
        - priority, reason
        - expected_impact (deltas)
    """
    # Autopilot logic based on scope
    if scope == "student":
        data = _get_student_autopilot(target_id)
    elif scope == "cohort":
        data = _get_cohort_autopilot(target_id)
    elif scope == "university":
        data = _get_org_autopilot(target_id, "university")
    elif scope == "employer":
        data = _get_org_autopilot(target_id, "employer")
    else:
        data = _get_system_autopilot()
    
    confidence = 0.82
    
    return TileResponse.create(data=data, confidence=confidence)


def _get_student_autopilot(student_id: str) -> Dict[str, Any]:
    """Individual student recommendations"""
    return {
        "scope": "student",
        "target_id": student_id or "STU_UNKNOWN",
        "status": "ATTENTION_NEEDED",
        "recommended_action": "SCHEDULE_COUNSELING_SESSION",
        "action_detail": "Student showing adaptation decline. Schedule 1:1 counseling.",
        "priority": ActionPriority.HIGH.value,
        "reason": "adaptation_score < 0.6 AND days_in_stage > 14",
        "expected_impact": {
            "adaptation_delta": 0.15,
            "risk_delta": -0.08,
            "graduation_delta": 0.05
        },
        "alternative_actions": [
            {"action": "ASSIGN_MENTOR", "impact": {"adaptation_delta": 0.10}},
            {"action": "LANGUAGE_SUPPORT", "impact": {"adaptation_delta": 0.08}}
        ]
    }


def _get_cohort_autopilot(cohort_id: str) -> Dict[str, Any]:
    """Cohort-level recommendations"""
    return {
        "scope": "cohort",
        "target_id": cohort_id or "COHORT_2026_PH2KR",
        "status": "ACTIVE",
        "recommended_action": "INCREASE_SUPPORT_FOR_HIGH_RISK_STUDENTS",
        "action_detail": "10% of cohort in high-risk bucket. Deploy targeted intervention.",
        "priority": ActionPriority.HIGH.value,
        "reason": "high_risk_ratio > 0.08 AND bottleneck_stage == VERIFY",
        "expected_impact": {
            "graduation_delta": 0.03,
            "risk_delta": -0.05,
            "flow_velocity_delta": 0.12
        },
        "affected_students": ["STU_031", "STU_047", "STU_089"],
        "resource_requirement": {
            "counselor_hours": 15,
            "estimated_cost_usd": 450
        },
        "alternative_actions": [
            {
                "action": "EXPEDITE_DOCUMENT_VERIFICATION",
                "impact": {"flow_velocity_delta": 0.15}
            },
            {
                "action": "BATCH_LANGUAGE_TRAINING",
                "impact": {"adaptation_delta": 0.08}
            }
        ]
    }


def _get_org_autopilot(org_id: str, org_type: str) -> Dict[str, Any]:
    """Organization-level recommendations"""
    if org_type == "university":
        return {
            "scope": "university",
            "target_id": org_id or "ORG_UNIV_KW",
            "status": "OPTIMAL",
            "recommended_action": "EXPAND_ENGINEERING_CAPACITY",
            "action_detail": "Engineering department at 95% capacity with high demand.",
            "priority": ActionPriority.MEDIUM.value,
            "reason": "capacity_usage > 0.90 AND quality_score > 0.85",
            "expected_impact": {
                "capacity_delta": 0.20,
                "revenue_delta": 0.15
            }
        }
    else:
        return {
            "scope": "employer",
            "target_id": org_id or "ORG_EMP_A001",
            "status": "ATTENTION_NEEDED",
            "recommended_action": "IMPROVE_RETENTION_PROGRAM",
            "action_detail": "Retention score below threshold. Review onboarding process.",
            "priority": ActionPriority.HIGH.value,
            "reason": "retention_score < 0.75 AND avg_tenure < 12_months",
            "expected_impact": {
                "retention_delta": 0.12,
                "satisfaction_delta": 0.08
            }
        }


def _get_system_autopilot() -> Dict[str, Any]:
    """System-wide recommendations"""
    return {
        "scope": "system",
        "target_id": "LIME_PASS_OS",
        "status": "HEALTHY",
        "recommended_action": "MONITOR_VERIFY_STAGE_BOTTLENECK",
        "action_detail": "System operating normally. Monitor VERIFY stage across cohorts.",
        "priority": ActionPriority.LOW.value,
        "reason": "system_health > 0.85 BUT verify_stage_avg_days increasing",
        "expected_impact": {},
        "system_metrics": {
            "total_students": 500,
            "active_cohorts": 5,
            "overall_success_rate": 0.87,
            "system_risk": 0.12
        }
    }


def get_recommended_action(scope: str, target_id: str = None) -> str:
    """Get just the recommended action string"""
    tile = get_autopilot_tile(scope=scope, target_id=target_id)
    return tile.data.get("recommended_action", "NO_ACTION_REQUIRED")
