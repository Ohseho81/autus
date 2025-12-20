"""
AUTUS Linear API
Task 생성 및 관리
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import os

router = APIRouter(prefix="/api/v1/linear", tags=["linear"])


@router.get("/status")
async def linear_status():
    """Linear 연결 상태 확인"""
    from app.integrations.linear import LINEAR_ENABLED, LINEAR_TEAM_ID, LINEAR_API_KEY
    
    return {
        "enabled": LINEAR_ENABLED,
        "team_id": LINEAR_TEAM_ID if LINEAR_ENABLED else None,
        "api_key_set": bool(LINEAR_API_KEY),
    }


@router.post("/test")
async def test_linear():
    """Linear 연결 테스트"""
    from app.integrations.linear import test_linear_connection
    
    result = await test_linear_connection()
    
    if result["status"] == "disabled":
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    return result


@router.get("/teams")
async def list_teams():
    """팀 목록 조회"""
    from app.integrations.linear import get_teams, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    teams = await get_teams()
    
    return {
        "teams": teams,
        "count": len(teams),
    }


@router.get("/labels")
async def list_labels(team_id: Optional[str] = None):
    """라벨 목록 조회"""
    from app.integrations.linear import get_labels, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    labels = await get_labels(team_id)
    
    return {
        "labels": labels,
        "count": len(labels),
    }


@router.get("/states")
async def list_states(team_id: Optional[str] = None):
    """상태 목록 조회"""
    from app.integrations.linear import get_states, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    states = await get_states(team_id)
    
    return {
        "states": states,
        "count": len(states),
    }


@router.get("/issues")
async def list_issues(
    limit: int = Query(default=10, le=50),
    team_id: Optional[str] = None,
):
    """Issue 목록 조회"""
    from app.integrations.linear import get_issues, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    issues = await get_issues(first=limit, team_id=team_id)
    
    return {
        "issues": [
            {
                "id": i["id"],
                "identifier": i["identifier"],
                "title": i["title"],
                "state": i["state"]["name"],
                "priority": i["priority"],
                "url": i["url"],
                "created_at": i["createdAt"],
            }
            for i in issues
        ],
        "count": len(issues),
    }


@router.post("/task/audit")
async def create_audit_task(
    audit_id: str,
    action: str,
    risk: float = 0,
    system_state: str = "GREEN",
    person_id: Optional[str] = None,
):
    """AUDIT Task 생성"""
    from app.integrations.linear import create_audit_task as linear_create_audit_task, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    result = await linear_create_audit_task(
        audit_id=audit_id,
        action=action,
        risk=risk,
        system_state=system_state,
        person_id=person_id,
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create task")
    
    return result


@router.post("/task/risk")
async def create_risk_task(
    risk: float = 60,
    survival_days: float = 30,
    system_state: str = "YELLOW",
    violations: List[str] = None,
):
    """리스크 알림 Task 생성"""
    from app.integrations.linear import create_risk_alert_task, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    result = await create_risk_alert_task(
        risk=risk,
        survival_days=survival_days,
        system_state=system_state,
        violations=violations or [],
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create task")
    
    return result


@router.post("/task/review")
async def create_review_task(
    date: str,
    total_actions: int = 0,
    avg_risk: float = 0,
):
    """일일 리뷰 Task 생성"""
    from app.integrations.linear import create_daily_review_task, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    result = await create_daily_review_task(
        date=date,
        total_actions=total_actions,
        avg_risk=avg_risk,
        summary={"total_actions": total_actions, "avg_risk": avg_risk},
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create task")
    
    return result


@router.post("/issue")
async def create_custom_issue(
    title: str,
    description: str = "",
    priority: int = Query(default=0, ge=0, le=4),
    team_id: Optional[str] = None,
):
    """커스텀 Issue 생성"""
    from app.integrations.linear import create_issue, LINEAR_ENABLED
    
    if not LINEAR_ENABLED:
        raise HTTPException(status_code=503, detail="Linear not configured")
    
    result = await create_issue(
        title=title,
        description=description,
        priority=priority,
        team_id=team_id,
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create issue")
    
    return result


@router.get("/help")
async def linear_help():
    """Linear 설정 가이드"""
    return {
        "setup": {
            "1": "Linear 설정 → API → Personal API keys",
            "2": "Create key → 복사",
            "3": "팀 ID 확인: Linear URL에서 team/{TEAM_ID}",
            "4": "환경변수 설정",
        },
        "env_vars": {
            "LINEAR_API_KEY": "lin_api_xxxxxxxxxxxx (필수)",
            "LINEAR_TEAM_ID": "팀 UUID (선택, 기본 팀 지정)",
        },
        "endpoints": {
            "GET /api/v1/linear/status": "연결 상태",
            "POST /api/v1/linear/test": "연결 테스트",
            "GET /api/v1/linear/teams": "팀 목록",
            "GET /api/v1/linear/issues": "Issue 목록",
            "POST /api/v1/linear/task/audit": "AUDIT Task",
            "POST /api/v1/linear/task/risk": "리스크 알림 Task",
            "POST /api/v1/linear/task/review": "일일 리뷰 Task",
            "POST /api/v1/linear/issue": "커스텀 Issue",
        },
        "priority": {
            "0": "No priority",
            "1": "Urgent 🔴",
            "2": "High 🟠",
            "3": "Medium 🟡",
            "4": "Low 🟢",
        },
    }
