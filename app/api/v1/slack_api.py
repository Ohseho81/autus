"""
AUTUS Slack API
Webhook 테스트 및 수동 알림
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
import os

router = APIRouter(prefix="/api/v1/slack", tags=["slack"])


@router.get("/status")
async def slack_status():
    """Slack 연결 상태 확인"""
    from app.integrations.slack import SLACK_ENABLED, SLACK_WEBHOOK_URL
    
    return {
        "enabled": SLACK_ENABLED,
        "configured": bool(SLACK_WEBHOOK_URL),
        "webhook_set": "***" + SLACK_WEBHOOK_URL[-10:] if SLACK_WEBHOOK_URL else None,
    }


@router.post("/test")
async def test_slack():
    """Slack 연결 테스트"""
    from app.integrations.slack import test_slack_connection
    
    result = await test_slack_connection()
    
    if result["status"] == "disabled":
        raise HTTPException(status_code=503, detail="Slack not configured")
    
    return result


@router.post("/notify/action")
async def notify_action(
    action: str,
    audit_id: str,
    risk: float = 0,
    system_state: str = "GREEN",
    person_id: Optional[str] = None,
):
    """수동 ACTION 알림"""
    from app.integrations.slack import notify_action_executed, SLACK_ENABLED
    
    if not SLACK_ENABLED:
        raise HTTPException(status_code=503, detail="Slack not configured")
    
    success = await notify_action_executed(
        action=action,
        audit_id=audit_id,
        risk=risk,
        system_state=system_state,
        person_id=person_id,
    )
    
    return {
        "sent": success,
        "action": action,
        "audit_id": audit_id,
    }


@router.post("/notify/alert")
async def notify_alert(
    alert_type: str = "INFO",
    message: str = "",
    risk: float = 0,
):
    """수동 시스템 알림"""
    from app.integrations.slack import notify_system_alert, SLACK_ENABLED
    
    if not SLACK_ENABLED:
        raise HTTPException(status_code=503, detail="Slack not configured")
    
    success = await notify_system_alert(
        alert_type=alert_type,
        message=message,
        risk=risk,
    )
    
    return {
        "sent": success,
        "alert_type": alert_type,
    }


@router.post("/notify/red")
async def notify_red(
    risk: float = 85,
    survival_days: float = 30,
    violations: list = None,
):
    """SYSTEM_RED 긴급 알림"""
    from app.integrations.slack import notify_system_red, SLACK_ENABLED
    
    if not SLACK_ENABLED:
        raise HTTPException(status_code=503, detail="Slack not configured")
    
    success = await notify_system_red(
        risk=risk,
        survival_days=survival_days,
        violations=violations or [],
    )
    
    return {
        "sent": success,
        "risk": risk,
    }


@router.get("/help")
async def slack_help():
    """Slack 설정 가이드"""
    return {
        "setup": {
            "1": "Slack App 생성: https://api.slack.com/apps",
            "2": "Incoming Webhooks 활성화",
            "3": "Webhook URL 복사",
            "4": "환경변수 설정: SLACK_WEBHOOK_URL=https://hooks.slack.com/...",
        },
        "env_vars": {
            "SLACK_WEBHOOK_URL": "기본 Webhook URL (필수)",
            "SLACK_WEBHOOK_ACTION": "ACTION 알림용 (선택)",
            "SLACK_WEBHOOK_AUDIT": "AUDIT 알림용 (선택)",
            "SLACK_WEBHOOK_ALERT": "긴급 알림용 (선택)",
        },
        "endpoints": {
            "GET /api/v1/slack/status": "연결 상태",
            "POST /api/v1/slack/test": "연결 테스트",
            "POST /api/v1/slack/notify/action": "ACTION 알림",
            "POST /api/v1/slack/notify/alert": "시스템 알림",
            "POST /api/v1/slack/notify/red": "RED 긴급 알림",
        },
    }
