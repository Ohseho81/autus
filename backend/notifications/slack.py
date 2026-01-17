"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Slack Notification Service
Human Escalation + Alert Webhook
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import httpx
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_CHANNEL = os.environ.get("SLACK_CHANNEL", "#autus-alerts")
SLACK_BOT_NAME = "AUTUS Bot"
SLACK_BOT_ICON = ":robot_face:"


class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    ESCALATION = "escalation"


ALERT_COLORS = {
    AlertLevel.INFO: "#36a64f",      # Green
    AlertLevel.WARNING: "#f2c744",   # Yellow
    AlertLevel.ERROR: "#e01e5a",     # Red
    AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    AlertLevel.ESCALATION: "#9b59b6", # Purple
}

ALERT_EMOJIS = {
    AlertLevel.INFO: "ℹ️",
    AlertLevel.WARNING: "⚠️",
    AlertLevel.ERROR: "🚨",
    AlertLevel.CRITICAL: "🔥",
    AlertLevel.ESCALATION: "👤",
}


# ═══════════════════════════════════════════════════════════════════════════════
# Slack Message Builder
# ═══════════════════════════════════════════════════════════════════════════════

def build_slack_message(
    title: str,
    message: str,
    level: AlertLevel = AlertLevel.INFO,
    fields: Optional[List[Dict[str, str]]] = None,
    actions: Optional[List[Dict[str, str]]] = None,
    footer: Optional[str] = None,
) -> Dict[str, Any]:
    """Slack Block Kit 메시지 빌드"""
    
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{ALERT_EMOJIS[level]} {title}",
                "emoji": True,
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message,
            }
        },
    ]
    
    # Fields 추가
    if fields:
        field_blocks = []
        for field in fields:
            field_blocks.append({
                "type": "mrkdwn",
                "text": f"*{field['title']}*\n{field['value']}",
            })
        
        blocks.append({
            "type": "section",
            "fields": field_blocks[:10],  # Slack 최대 10개
        })
    
    # Divider
    blocks.append({"type": "divider"})
    
    # Actions (버튼)
    if actions:
        action_elements = []
        for action in actions:
            action_elements.append({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": action["text"],
                    "emoji": True,
                },
                "url": action.get("url", ""),
                "style": action.get("style", "primary"),  # primary | danger
            })
        
        blocks.append({
            "type": "actions",
            "elements": action_elements[:5],  # 최대 5개
        })
    
    # Footer
    if footer:
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": footer,
                }
            ]
        })
    
    return {
        "channel": SLACK_CHANNEL,
        "username": SLACK_BOT_NAME,
        "icon_emoji": SLACK_BOT_ICON,
        "attachments": [
            {
                "color": ALERT_COLORS[level],
                "blocks": blocks,
            }
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Notification Functions
# ═══════════════════════════════════════════════════════════════════════════════

async def send_slack_notification(
    title: str,
    message: str,
    level: AlertLevel = AlertLevel.INFO,
    fields: Optional[List[Dict[str, str]]] = None,
    actions: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Slack 알림 발송"""
    
    if not SLACK_WEBHOOK_URL:
        logger.warning("[Slack] SLACK_WEBHOOK_URL not configured")
        return {"success": False, "error": "SLACK_WEBHOOK_URL_NOT_CONFIGURED"}
    
    payload = build_slack_message(
        title=title,
        message=message,
        level=level,
        fields=fields,
        actions=actions,
        footer=f"AUTUS | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
    )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SLACK_WEBHOOK_URL,
                json=payload,
                timeout=10.0,
            )
            
            if response.status_code == 200:
                logger.info(f"[Slack] Notification sent: {title}")
                return {"success": True, "status": response.status_code}
            else:
                logger.error(f"[Slack] Failed: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
                
    except Exception as e:
        logger.error(f"[Slack] Error: {str(e)}")
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# Pre-built Notifications
# ═══════════════════════════════════════════════════════════════════════════════

async def notify_human_escalation(
    decision_id: str,
    actor: str,
    event_type: str,
    k_level: int,
    reason: str,
    omega: float,
    dashboard_url: str = "http://localhost:3000/gravity",
) -> Dict[str, Any]:
    """Human Escalation 알림"""
    
    return await send_slack_notification(
        title="Human Escalation Required",
        message=f"의사결정 `{decision_id}`에 대해 인간 검토가 필요합니다.",
        level=AlertLevel.ESCALATION,
        fields=[
            {"title": "Decision ID", "value": decision_id},
            {"title": "Actor", "value": actor},
            {"title": "Event Type", "value": event_type},
            {"title": "K Level", "value": f"K{k_level}"},
            {"title": "Omega (Ω)", "value": str(omega)},
            {"title": "Reason", "value": reason},
        ],
        actions=[
            {"text": "📊 Dashboard 열기", "url": dashboard_url, "style": "primary"},
            {"text": "✅ 승인", "url": f"{dashboard_url}?action=approve&id={decision_id}", "style": "primary"},
            {"text": "❌ 거부", "url": f"{dashboard_url}?action=reject&id={decision_id}", "style": "danger"},
        ],
    )


async def notify_k10_ritual_started(
    decision_id: str,
    actor: str,
    ritual_id: str,
    expires_in_minutes: int = 10,
) -> Dict[str, Any]:
    """K10 Ritual 시작 알림"""
    
    return await send_slack_notification(
        title="K10 Ritual Started (헌법 변경)",
        message=f"⚠️ *헌법/원칙 변경 의식*이 시작되었습니다.\n{expires_in_minutes}분 내 최종 승인이 필요합니다.",
        level=AlertLevel.CRITICAL,
        fields=[
            {"title": "Decision ID", "value": decision_id},
            {"title": "Initiator", "value": actor},
            {"title": "Ritual ID", "value": f"`{ritual_id}`"},
            {"title": "Expires In", "value": f"{expires_in_minutes} minutes"},
        ],
    )


async def notify_k10_ritual_finalized(
    decision_id: str,
    actor: str,
    approval_statement: str,
) -> Dict[str, Any]:
    """K10 Ritual 완료 알림"""
    
    return await send_slack_notification(
        title="K10 Ritual Finalized (헌법 확정)",
        message=f"✅ 헌법/원칙 변경이 *최종 확정*되었습니다.",
        level=AlertLevel.INFO,
        fields=[
            {"title": "Decision ID", "value": decision_id},
            {"title": "Approved By", "value": actor},
            {"title": "Statement", "value": approval_statement[:200]},
        ],
    )


async def notify_tech_update_result(
    total_sources: int,
    breaking_changes: int,
    auto_applied: List[str],
    skipped: List[str],
    k_impact: float,
    human_escalation: bool,
) -> Dict[str, Any]:
    """월간 기술 업데이트 결과 알림"""
    
    level = AlertLevel.ESCALATION if human_escalation else AlertLevel.INFO
    title = "Monthly Tech Update (Human Review Required)" if human_escalation else "Monthly Tech Update Complete"
    
    return await send_slack_notification(
        title=title,
        message=f"총 {total_sources}개 기술 소스 확인 완료.",
        level=level,
        fields=[
            {"title": "Breaking Changes", "value": str(breaking_changes)},
            {"title": "K Impact", "value": f"{k_impact:+.2f}"},
            {"title": "Auto Applied", "value": ", ".join(auto_applied) or "None"},
            {"title": "Skipped", "value": ", ".join(skipped) or "None"},
        ],
    )


async def notify_gate_blocked(
    decision_id: str,
    actor: str,
    k_level: int,
    action: str,
    component: str,
) -> Dict[str, Any]:
    """Gate 차단 알림"""
    
    return await send_slack_notification(
        title="Gate Blocked (Altitude Lock)",
        message=f"K{k_level} 레벨에서 `{action}` 액션이 차단되었습니다.",
        level=AlertLevel.WARNING,
        fields=[
            {"title": "Decision ID", "value": decision_id},
            {"title": "Actor", "value": actor},
            {"title": "K Level", "value": f"K{k_level}"},
            {"title": "Blocked Action", "value": action},
            {"title": "Component", "value": component},
        ],
    )


async def notify_audit_chain_broken(
    broken_at: str,
    total_records: int,
) -> Dict[str, Any]:
    """Audit 체인 무결성 오류 알림"""
    
    return await send_slack_notification(
        title="⚠️ Audit Chain Integrity Error",
        message="감사 로그 해시 체인에 무결성 오류가 감지되었습니다!",
        level=AlertLevel.CRITICAL,
        fields=[
            {"title": "Broken At", "value": broken_at},
            {"title": "Total Records", "value": str(total_records)},
            {"title": "Action Required", "value": "즉시 조사 필요"},
        ],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Sync Wrapper (for non-async contexts)
# ═══════════════════════════════════════════════════════════════════════════════

def send_slack_notification_sync(
    title: str,
    message: str,
    level: AlertLevel = AlertLevel.INFO,
    fields: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """동기 버전 Slack 알림 (Airflow 등에서 사용)"""
    
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        send_slack_notification(title, message, level, fields)
    )
