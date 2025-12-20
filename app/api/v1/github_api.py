"""
AUTUS GitHub API
Issue 생성 및 관리
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import os

router = APIRouter(prefix="/api/v1/github", tags=["github"])


@router.get("/status")
async def github_status():
    """GitHub 연결 상태 확인"""
    from app.integrations.github import GITHUB_ENABLED, GITHUB_REPO, GITHUB_TOKEN
    
    return {
        "enabled": GITHUB_ENABLED,
        "repo": GITHUB_REPO if GITHUB_ENABLED else None,
        "token_set": bool(GITHUB_TOKEN),
    }


@router.post("/test")
async def test_github():
    """GitHub 연결 테스트"""
    from app.integrations.github import test_github_connection
    
    result = await test_github_connection()
    
    if result["status"] == "disabled":
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    return result


@router.post("/issue/audit")
async def create_audit_issue(
    audit_id: str,
    action: str,
    risk: float = 0,
    system_state: str = "GREEN",
    person_id: Optional[str] = None,
):
    """AUDIT Issue 생성"""
    from app.integrations.github import create_audit_issue, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    snapshot = {
        "audit_id": audit_id,
        "action": action,
        "risk": risk,
        "system_state": system_state,
        "person_id": person_id,
    }
    
    result = await create_audit_issue(
        audit_id=audit_id,
        action=action,
        risk=risk,
        system_state=system_state,
        snapshot=snapshot,
        person_id=person_id,
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create issue")
    
    return result


@router.post("/issue/red")
async def create_red_issue(
    risk: float = 85,
    survival_days: float = 30,
    violations: List[str] = None,
):
    """SYSTEM_RED Issue 생성"""
    from app.integrations.github import create_system_red_issue, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    snapshot = {
        "risk": risk,
        "survival_days": survival_days,
        "state": "RED",
    }
    
    result = await create_system_red_issue(
        risk=risk,
        survival_days=survival_days,
        violations=violations or [],
        snapshot=snapshot,
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create issue")
    
    return result


@router.post("/issue/summary")
async def create_summary_issue(
    date: str,
    total_actions: int = 0,
    total_audits: int = 0,
    avg_risk: float = 0,
):
    """일일 요약 Issue 생성"""
    from app.integrations.github import create_daily_summary_issue, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    result = await create_daily_summary_issue(
        date=date,
        total_actions=total_actions,
        total_audits=total_audits,
        avg_risk=avg_risk,
        actions_by_type={"RECOVER": 0, "DEFRICTION": 0, "SHOCK_DAMP": 0},
        state_distribution={"GREEN": 0, "YELLOW": 0, "RED": 0},
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create issue")
    
    return result


@router.get("/issues")
async def list_issues(
    state: str = Query(default="open", enum=["open", "closed", "all"]),
    labels: Optional[str] = None,
    limit: int = Query(default=10, le=100),
):
    """Issue 목록 조회"""
    from app.integrations.github import list_issues, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    issues = await list_issues(state=state, labels=labels, limit=limit)
    
    return {
        "issues": [
            {
                "number": i["number"],
                "title": i["title"],
                "state": i["state"],
                "url": i["html_url"],
                "labels": [l["name"] for l in i.get("labels", [])],
                "created_at": i["created_at"],
            }
            for i in issues
        ],
        "total": len(issues),
    }


@router.post("/issues/{issue_number}/comment")
async def add_comment(
    issue_number: int,
    body: str,
):
    """Issue에 코멘트 추가"""
    from app.integrations.github import add_comment as gh_add_comment, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    success = await gh_add_comment(issue_number, body)
    
    return {
        "success": success,
        "issue_number": issue_number,
    }


@router.post("/issues/{issue_number}/close")
async def close_issue(issue_number: int):
    """Issue 닫기"""
    from app.integrations.github import close_issue as gh_close_issue, GITHUB_ENABLED
    
    if not GITHUB_ENABLED:
        raise HTTPException(status_code=503, detail="GitHub not configured")
    
    success = await gh_close_issue(issue_number)
    
    return {
        "success": success,
        "issue_number": issue_number,
        "state": "closed" if success else "open",
    }


@router.get("/help")
async def github_help():
    """GitHub 설정 가이드"""
    return {
        "setup": {
            "1": "GitHub Personal Access Token 생성",
            "2": "Settings → Developer settings → Personal access tokens",
            "3": "권한: repo (Full control)",
            "4": "환경변수 설정",
        },
        "env_vars": {
            "GITHUB_TOKEN": "Personal Access Token (필수)",
            "GITHUB_REPO": "owner/repo 형식 (기본: Ohseho81/autus)",
        },
        "endpoints": {
            "GET /api/v1/github/status": "연결 상태",
            "POST /api/v1/github/test": "연결 테스트",
            "POST /api/v1/github/issue/audit": "AUDIT Issue 생성",
            "POST /api/v1/github/issue/red": "RED 긴급 Issue",
            "POST /api/v1/github/issue/summary": "일일 요약 Issue",
            "GET /api/v1/github/issues": "Issue 목록",
        },
        "labels": {
            "audit": "AUDIT 기록",
            "automated": "자동 생성",
            "critical": "긴급",
            "system-red": "RED 상태",
            "action-*": "액션 타입",
        },
    }
