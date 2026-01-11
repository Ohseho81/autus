"""
AUTUS Notification Service
==========================

다중 채널 알림 시스템:
- Slack
- Email (Resend/SMTP)
- 카카오 알림톡
- In-App (WebSocket)
"""

import os
import json
import httpx
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================
# Types
# ============================================

class NotificationChannel(str, Enum):
    SLACK = "slack"
    EMAIL = "email"
    KAKAO = "kakao"
    IN_APP = "in_app"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationType(str, Enum):
    ALERT = "alert"
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    REMINDER = "reminder"
    REPORT = "report"


@dataclass
class Notification:
    """알림 데이터"""
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = field(default_factory=lambda: [NotificationChannel.IN_APP])
    data: Dict[str, Any] = field(default_factory=dict)
    recipient: Optional[str] = None  # user_id or email
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ============================================
# Slack Integration
# ============================================

class SlackNotifier:
    """Slack 알림"""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL")
        self.enabled = bool(self.webhook_url)
    
    async def send(self, notification: Notification) -> bool:
        """Slack 메시지 전송"""
        if not self.enabled:
            logger.warning("[Slack] Not configured, skipping notification")
            return False
        
        # 이모지 매핑
        emoji_map = {
            NotificationType.ALERT: "🚨",
            NotificationType.INFO: "ℹ️",
            NotificationType.WARNING: "⚠️",
            NotificationType.SUCCESS: "✅",
            NotificationType.REMINDER: "⏰",
            NotificationType.REPORT: "📊",
        }
        
        # 색상 매핑
        color_map = {
            NotificationPriority.LOW: "#808080",
            NotificationPriority.NORMAL: "#0066CC",
            NotificationPriority.HIGH: "#FF9900",
            NotificationPriority.CRITICAL: "#FF0000",
        }
        
        emoji = emoji_map.get(notification.type, "📢")
        color = color_map.get(notification.priority, "#0066CC")
        
        payload = {
            "attachments": [
                {
                    "color": color,
                    "blocks": [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": f"{emoji} {notification.title}",
                                "emoji": True
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": notification.message
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": f"*Type:* {notification.type.value} | *Priority:* {notification.priority.value}"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.webhook_url, json=payload)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"[Slack] Error: {e}")
            return False


# ============================================
# Email Integration
# ============================================

class EmailNotifier:
    """이메일 알림 (Resend API)"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("RESEND_API_KEY")
        self.from_email = os.environ.get("EMAIL_FROM", "noreply@autus.app")
        self.enabled = bool(self.api_key)
    
    async def send(self, notification: Notification, to_email: str) -> bool:
        """이메일 전송"""
        if not self.enabled:
            logger.warning("[Email] Not configured, skipping notification")
            return False
        
        payload = {
            "from": self.from_email,
            "to": to_email,
            "subject": f"[AUTUS] {notification.title}",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">{notification.title}</h2>
                    <p style="color: #666; line-height: 1.6;">{notification.message}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Type: {notification.type.value} | Priority: {notification.priority.value}
                    </p>
                </div>
            """
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"[Email] Error: {e}")
            return False


# ============================================
# Kakao Alimtalk Integration
# ============================================

class KakaoNotifier:
    """카카오 알림톡"""
    
    def __init__(self, api_key: Optional[str] = None, sender_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("KAKAO_API_KEY")
        self.sender_key = sender_key or os.environ.get("KAKAO_SENDER_KEY")
        self.enabled = bool(self.api_key and self.sender_key)
    
    async def send(self, notification: Notification, phone: str, template_code: str) -> bool:
        """알림톡 전송"""
        if not self.enabled:
            logger.warning("[Kakao] Not configured, skipping notification")
            return False
        
        # 실제 구현은 카카오 비즈메시지 API 사용
        # https://developers.kakao.com/docs/latest/ko/message/rest-api
        
        payload = {
            "senderKey": self.sender_key,
            "templateCode": template_code,
            "recipientList": [
                {
                    "recipientNo": phone,
                    "templateParameter": {
                        "title": notification.title,
                        "message": notification.message,
                    }
                }
            ]
        }
        
        logger.info(f"[Kakao] Would send: {payload}")
        return True  # Placeholder


# ============================================
# In-App Notification
# ============================================

class InAppNotifier:
    """인앱 알림 (저장 + WebSocket)"""
    
    def __init__(self):
        self._notifications: Dict[str, List[Dict]] = {}  # user_id -> notifications
    
    async def send(self, notification: Notification, user_id: str) -> bool:
        """인앱 알림 저장"""
        if user_id not in self._notifications:
            self._notifications[user_id] = []
        
        self._notifications[user_id].append({
            **asdict(notification),
            "id": f"notif_{len(self._notifications[user_id])}_{datetime.utcnow().timestamp():.0f}",
            "read": False,
        })
        
        # Keep only last 100
        self._notifications[user_id] = self._notifications[user_id][-100:]
        
        return True
    
    def get_unread(self, user_id: str) -> List[Dict]:
        """읽지 않은 알림 조회"""
        notifications = self._notifications.get(user_id, [])
        return [n for n in notifications if not n.get("read")]
    
    def get_all(self, user_id: str, limit: int = 50) -> List[Dict]:
        """전체 알림 조회"""
        notifications = self._notifications.get(user_id, [])
        return notifications[-limit:]
    
    def mark_read(self, user_id: str, notification_id: str) -> bool:
        """알림 읽음 처리"""
        notifications = self._notifications.get(user_id, [])
        for n in notifications:
            if n.get("id") == notification_id:
                n["read"] = True
                return True
        return False
    
    def mark_all_read(self, user_id: str) -> int:
        """전체 읽음 처리"""
        notifications = self._notifications.get(user_id, [])
        count = 0
        for n in notifications:
            if not n.get("read"):
                n["read"] = True
                count += 1
        return count


# ============================================
# Notification Service
# ============================================

class NotificationService:
    """통합 알림 서비스"""
    
    def __init__(self):
        self.slack = SlackNotifier()
        self.email = EmailNotifier()
        self.kakao = KakaoNotifier()
        self.in_app = InAppNotifier()
    
    async def send(
        self,
        title: str,
        message: str,
        type: NotificationType = NotificationType.INFO,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: List[NotificationChannel] = None,
        recipient: Optional[str] = None,
        data: Dict[str, Any] = None,
    ) -> Dict[str, bool]:
        """알림 전송"""
        
        if channels is None:
            channels = [NotificationChannel.IN_APP]
        
        notification = Notification(
            title=title,
            message=message,
            type=type,
            priority=priority,
            channels=channels,
            recipient=recipient,
            data=data or {},
        )
        
        results = {}
        
        for channel in channels:
            if channel == NotificationChannel.SLACK:
                results["slack"] = await self.slack.send(notification)
            
            elif channel == NotificationChannel.EMAIL and recipient:
                results["email"] = await self.email.send(notification, recipient)
            
            elif channel == NotificationChannel.KAKAO and recipient and data and "template_code" in data:
                results["kakao"] = await self.kakao.send(
                    notification, recipient, data["template_code"]
                )
            
            elif channel == NotificationChannel.IN_APP and recipient:
                results["in_app"] = await self.in_app.send(notification, recipient)
        
        return results
    
    # Convenience methods
    async def alert(self, title: str, message: str, recipient: str = None, **kwargs):
        """Alert 알림"""
        return await self.send(
            title, message,
            type=NotificationType.ALERT,
            priority=NotificationPriority.HIGH,
            channels=[NotificationChannel.SLACK, NotificationChannel.IN_APP],
            recipient=recipient,
            **kwargs
        )
    
    async def info(self, title: str, message: str, recipient: str = None, **kwargs):
        """Info 알림"""
        return await self.send(
            title, message,
            type=NotificationType.INFO,
            channels=[NotificationChannel.IN_APP],
            recipient=recipient,
            **kwargs
        )
    
    async def reminder(self, title: str, message: str, recipient: str, **kwargs):
        """리마인더"""
        return await self.send(
            title, message,
            type=NotificationType.REMINDER,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            recipient=recipient,
            **kwargs
        )
    
    async def report(self, title: str, message: str, recipient: str = None, **kwargs):
        """리포트 알림"""
        return await self.send(
            title, message,
            type=NotificationType.REPORT,
            channels=[NotificationChannel.EMAIL, NotificationChannel.SLACK],
            recipient=recipient,
            **kwargs
        )


# ============================================
# Global Instance
# ============================================

notification_service = NotificationService()


# ============================================
# Export
# ============================================

__all__ = [
    "NotificationChannel",
    "NotificationPriority",
    "NotificationType",
    "Notification",
    "SlackNotifier",
    "EmailNotifier",
    "KakaoNotifier",
    "InAppNotifier",
    "NotificationService",
    "notification_service",
]
