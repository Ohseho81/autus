"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())











"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - SLACK INTEGRATION SERVICE
═══════════════════════════════════════════════════════════════════════════════
Production-ready Slack integration for notifications and alerts
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#autus-alerts")


class AlertLevel(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SlackMessage(BaseModel):
    """Slack message model"""
    channel: Optional[str] = None
    text: str
    level: AlertLevel = AlertLevel.INFO
    title: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# SLACK SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class SlackService:
    """Production Slack integration service"""
    
    LEVEL_COLORS = {
        AlertLevel.INFO: "#36a64f",      # Green
        AlertLevel.SUCCESS: "#2eb886",   # Teal
        AlertLevel.WARNING: "#daa038",   # Yellow
        AlertLevel.ERROR: "#cc4444",     # Red
        AlertLevel.CRITICAL: "#8b0000",  # Dark Red
    }
    
    LEVEL_EMOJIS = {
        AlertLevel.INFO: "ℹ️",
        AlertLevel.SUCCESS: "✅",
        AlertLevel.WARNING: "⚠️",
        AlertLevel.ERROR: "❌",
        AlertLevel.CRITICAL: "🚨",
    }
    
    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.bot_token = SLACK_BOT_TOKEN
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_message(self, message: SlackMessage) -> bool:
        """Send a message to Slack"""
        if not self.webhook_url:
            print("[SLACK] No webhook URL configured, skipping notification")
            return False
        
        try:
            payload = self._build_payload(message)
            response = await self.client.post(
                self.webhook_url,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"[SLACK] Message sent: {message.title or message.text[:50]}")
                return True
            else:
                print(f"[SLACK] Failed to send: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[SLACK] Error sending message: {e}")
            return False
    
    def _build_payload(self, message: SlackMessage) -> Dict[str, Any]:
        """Build Slack message payload with blocks"""
        emoji = self.LEVEL_EMOJIS.get(message.level, "📌")
        color = self.LEVEL_COLORS.get(message.level, "#808080")
        
        # Build attachment
        attachment = {
            "color": color,
            "blocks": []
        }
        
        # Header section
        if message.title:
            attachment["blocks"].append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {message.title}",
                    "emoji": True
                }
            })
        
        # Main text section
        attachment["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message.text
            }
        })
        
        # Fields section (key-value pairs)
        if message.fields:
            fields_block = {
                "type": "section",
                "fields": []
            }
            for key, value in message.fields.items():
                fields_block["fields"].append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{value}"
                })
            attachment["blocks"].append(fields_block)
        
        # Divider
        attachment["blocks"].append({"type": "divider"})
        
        # Context (timestamp)
        attachment["blocks"].append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        })
        
        # Actions (buttons)
        if message.actions:
            actions_block = {
                "type": "actions",
                "elements": message.actions
            }
            attachment["blocks"].append(actions_block)
        
        return {
            "channel": message.channel or SLACK_DEFAULT_CHANNEL,
            "attachments": [attachment]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def notify_automation_created(self, name: str, automation_type: str, estimated_roi: float):
        """Notify when new automation is created"""
        await self.send_message(SlackMessage(
            title="새 자동화 생성됨",
            text=f"*{name}* 자동화가 생성되었습니다.",
            level=AlertLevel.SUCCESS,
            fields={
                "유형": automation_type,
                "예상 ROI": f"₩{estimated_roi:,.0f}",
                "상태": "활성"
            }
        ))
    
    async def notify_automation_deleted(self, name: str, reason: str, final_value: float):
        """Notify when automation is deleted"""
        await self.send_message(SlackMessage(
            title="자동화 삭제됨",
            text=f"*{name}* 자동화가 삭제되었습니다.",
            level=AlertLevel.WARNING,
            fields={
                "삭제 사유": reason,
                "최종 가치": f"₩{final_value:,.0f}"
            }
        ))
    
    async def notify_feedback_received(self, automation_name: str, rating: int, adjustment: float):
        """Notify when feedback is received"""
        emoji = "👍" if rating == 1 else "👎"
        level = AlertLevel.SUCCESS if rating == 1 else AlertLevel.WARNING
        
        await self.send_message(SlackMessage(
            title=f"피드백 수신 {emoji}",
            text=f"*{automation_name}*에 대한 피드백이 접수되었습니다.",
            level=level,
            fields={
                "평가": "긍정" if rating == 1 else "부정",
                "시너지율 조정": f"{adjustment:+.2%}"
            }
        ))
    
    async def notify_pattern_detected(self, pattern_name: str, frequency: int, estimated_value: float):
        """Notify when new pattern is detected"""
        await self.send_message(SlackMessage(
            title="새 패턴 감지됨",
            text=f"AI가 새로운 자동화 패턴 *{pattern_name}*을 감지했습니다.",
            level=AlertLevel.INFO,
            fields={
                "감지 빈도": f"{frequency}회",
                "예상 가치": f"₩{estimated_value:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "승인하기"
                    },
                    "style": "primary",
                    "value": "approve"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "무시하기"
                    },
                    "value": "ignore"
                }
            ]
        ))
    
    async def notify_workflow_pending(self, workflow_name: str, workflow_id: str, estimated_roi: float):
        """Notify when AI-generated workflow is pending approval"""
        await self.send_message(SlackMessage(
            title="워크플로 승인 대기",
            text=f"AI가 생성한 *{workflow_name}* 워크플로가 승인을 기다리고 있습니다.",
            level=AlertLevel.INFO,
            fields={
                "워크플로 ID": workflow_id,
                "예상 ROI": f"₩{estimated_roi:,.0f}"
            },
            actions=[
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ 승인"
                    },
                    "style": "primary",
                    "value": f"approve_{workflow_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❌ 거부"
                    },
                    "style": "danger",
                    "value": f"reject_{workflow_id}"
                }
            ]
        ))
    
    async def notify_value_warning(self, automation_name: str, current_value: float, threshold: float):
        """Notify when automation value is below threshold"""
        await self.send_message(SlackMessage(
            title="가치 경고",
            text=f"*{automation_name}*의 가치가 임계값 아래로 떨어졌습니다.",
            level=AlertLevel.WARNING,
            fields={
                "현재 가치": f"₩{current_value:,.0f}",
                "임계값": f"₩{threshold:,.0f}",
                "조치": "48시간 내 개선 없으면 자동 삭제"
            }
        ))
    
    async def notify_system_error(self, error_type: str, message: str, details: Optional[Dict] = None):
        """Notify system error"""
        fields = {
            "오류 유형": error_type,
            "메시지": message
        }
        if details:
            fields.update(details)
        
        await self.send_message(SlackMessage(
            title="시스템 오류",
            text="AUTUS 시스템에서 오류가 발생했습니다.",
            level=AlertLevel.ERROR,
            fields=fields
        ))
    
    async def send_daily_summary(self, stats: Dict[str, Any]):
        """Send daily automation summary"""
        await self.send_message(SlackMessage(
            title="일일 자동화 요약",
            text="오늘의 AUTUS 자동화 성과입니다.",
            level=AlertLevel.INFO,
            fields={
                "총 자동화 수": str(stats.get("total_automations", 0)),
                "오늘 실행": str(stats.get("executions_today", 0)),
                "성공률": f"{stats.get('success_rate', 0):.1%}",
                "총 가치": f"₩{stats.get('total_value', 0):,.0f}",
                "신규 생성": str(stats.get("created_today", 0)),
                "삭제됨": str(stats.get("deleted_today", 0))
            }
        ))
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

slack_service = SlackService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Send test message
    await slack_service.send_message(SlackMessage(
        title="AUTUS 연동 테스트",
        text="Slack 연동이 성공적으로 완료되었습니다! 🎉",
        level=AlertLevel.SUCCESS,
        fields={
            "환경": "Production",
            "버전": "1.0.0"
        }
    ))
    
    # Test convenience methods
    await slack_service.notify_automation_created(
        name="학생 등록 자동화",
        automation_type="registration",
        estimated_roi=150000
    )
    
    await slack_service.close()


if __name__ == "__main__":
    asyncio.run(main())
















