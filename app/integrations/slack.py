"""
AUTUS Slack Integration
ACTION 실행 시 Slack 알림 발송
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger("autus.slack")

# ═══════════════════════════════════════════════════════════════════════════════
# Slack Webhook 설정
# ═══════════════════════════════════════════════════════════════════════════════

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_ENABLED = bool(SLACK_WEBHOOK_URL)

# 채널별 Webhook (선택)
SLACK_CHANNELS = {
    "action": os.getenv("SLACK_WEBHOOK_ACTION", SLACK_WEBHOOK_URL),
    "audit": os.getenv("SLACK_WEBHOOK_AUDIT", SLACK_WEBHOOK_URL),
    "alert": os.getenv("SLACK_WEBHOOK_ALERT", SLACK_WEBHOOK_URL),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 메시지 템플릿
# ═══════════════════════════════════════════════════════════════════════════════

def format_action_message(
    action: str,
    audit_id: str,
    risk: float,
    system_state: str,
    person_id: Optional[str] = None,
) -> Dict[str, Any]:
    """ACTION 실행 알림 메시지"""
    
    # 상태별 이모지
    state_emoji = {
        "GREEN": "🟢",
        "YELLOW": "🟡",
        "AMBER": "🟡",
        "RED": "🔴",
    }
    
    # 액션별 이모지
    action_emoji = {
        "RECOVER": "💚",
        "DEFRICTION": "⚡",
        "SHOCK_DAMP": "🛡️",
        "LOCK": "🔒",
        "HOLD": "⏸️",
        "REJECT": "❌",
    }
    
    emoji = action_emoji.get(action, "✅")
    state = state_emoji.get(system_state, "⚪")
    
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} ACTION 실행됨: {action}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*AUDIT ID:*\n`{audit_id}`"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*시스템 상태:*\n{state} {system_state}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Risk:*\n{risk}%"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*시간:*\n{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"
                }
            ]
        },
    ]
    
    if person_id:
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"👤 Person: `{person_id}`"
                }
            ]
        })
    
    blocks.append({
        "type": "divider"
    })
    
    return {
        "blocks": blocks,
        "text": f"ACTION 실행됨: {action} (AUDIT: {audit_id})"  # 폴백 텍스트
    }


def format_alert_message(
    alert_type: str,
    message: str,
    risk: float,
    details: Optional[Dict] = None,
) -> Dict[str, Any]:
    """시스템 알림 메시지"""
    
    alert_emoji = {
        "WARNING": "⚠️",
        "CRITICAL": "🚨",
        "INFO": "ℹ️",
        "SUCCESS": "✅",
    }
    
    emoji = alert_emoji.get(alert_type, "📢")
    
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} {alert_type}: AUTUS Alert",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Risk Level:*\n{risk}%"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*시간:*\n{datetime.utcnow().strftime('%H:%M:%S')} UTC"
                }
            ]
        },
    ]
    
    if details:
        detail_text = "\n".join([f"• {k}: {v}" for k, v in details.items()])
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": detail_text
                }
            ]
        })
    
    return {
        "blocks": blocks,
        "text": f"{alert_type}: {message}"
    }


def format_system_red_message(
    risk: float,
    survival_days: float,
    violations: list,
) -> Dict[str, Any]:
    """SYSTEM_RED 긴급 알림"""
    
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🔴 SYSTEM RED — 긴급 상황",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*시스템이 RED 상태로 전환되었습니다.*\n모든 ACTION이 차단됩니다."
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Risk:*\n🔴 {risk}%"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Survival:*\n⏱️ {survival_days}일"
                }
            ]
        },
    ]
    
    if violations:
        violation_text = "\n".join([f"• {v}" for v in violations])
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*위반 사항:*\n{violation_text}"
            }
        })
    
    blocks.append({
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "📊 Dashboard 열기",
                    "emoji": True
                },
                "url": "https://solar.autus-ai.com/frontend/solar.html",
                "action_id": "open_dashboard"
            }
        ]
    })
    
    return {
        "blocks": blocks,
        "text": f"🔴 SYSTEM RED — Risk: {risk}%"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Slack 전송 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def send_slack_message(
    payload: Dict[str, Any],
    channel: str = "action",
) -> bool:
    """Slack 메시지 전송"""
    
    if not SLACK_ENABLED:
        logger.debug("[Slack] Webhook not configured, skipping")
        return False
    
    webhook_url = SLACK_CHANNELS.get(channel, SLACK_WEBHOOK_URL)
    
    if not webhook_url:
        logger.warning(f"[Slack] No webhook URL for channel: {channel}")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                logger.info(f"[Slack] Message sent to {channel}")
                return True
            else:
                logger.warning(f"[Slack] Failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"[Slack] Error: {e}")
        return False


def send_slack_message_sync(
    payload: Dict[str, Any],
    channel: str = "action",
) -> bool:
    """Slack 메시지 전송 (동기)"""
    
    if not SLACK_ENABLED:
        return False
    
    webhook_url = SLACK_CHANNELS.get(channel, SLACK_WEBHOOK_URL)
    
    if not webhook_url:
        return False
    
    try:
        import requests
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"[Slack] Sync error: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def notify_action_executed(
    action: str,
    audit_id: str,
    risk: float,
    system_state: str,
    person_id: Optional[str] = None,
) -> bool:
    """ACTION 실행 알림"""
    payload = format_action_message(action, audit_id, risk, system_state, person_id)
    return await send_slack_message(payload, "action")


async def notify_system_alert(
    alert_type: str,
    message: str,
    risk: float,
    details: Optional[Dict] = None,
) -> bool:
    """시스템 알림"""
    payload = format_alert_message(alert_type, message, risk, details)
    return await send_slack_message(payload, "alert")


async def notify_system_red(
    risk: float,
    survival_days: float,
    violations: list,
) -> bool:
    """SYSTEM_RED 긴급 알림"""
    payload = format_system_red_message(risk, survival_days, violations)
    return await send_slack_message(payload, "alert")


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

async def test_slack_connection() -> Dict[str, Any]:
    """Slack 연결 테스트"""
    
    if not SLACK_ENABLED:
        return {
            "status": "disabled",
            "message": "SLACK_WEBHOOK_URL not configured"
        }
    
    test_payload = {
        "text": "🧪 AUTUS Slack 연결 테스트 성공!"
    }
    
    success = await send_slack_message(test_payload, "action")
    
    return {
        "status": "success" if success else "failed",
        "message": "Test message sent" if success else "Failed to send test message"
    }
