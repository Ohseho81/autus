"""
AUTUS Notification API
======================

알림 관리 REST API
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from notification.notification_service import (
    notification_service,
    NotificationChannel,
    NotificationType,
    NotificationPriority,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ============================================
# Request/Response Models
# ============================================

class SendNotificationRequest(BaseModel):
    """알림 전송 요청"""
    title: str
    message: str
    type: str = "info"  # alert, info, warning, success, reminder, report
    priority: str = "normal"  # low, normal, high, critical
    channels: List[str] = ["in_app"]  # slack, email, kakao, in_app
    recipient: Optional[str] = None  # user_id or email
    data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    """알림 응답"""
    id: str
    title: str
    message: str
    type: str
    priority: str
    created_at: str
    read: bool


class SendResultResponse(BaseModel):
    """전송 결과"""
    success: bool
    results: Dict[str, bool]


# ============================================
# Endpoints
# ============================================

@router.post("/send", response_model=SendResultResponse)
async def send_notification(request: SendNotificationRequest):
    """
    알림 전송
    
    Channels:
    - slack: Slack 웹훅
    - email: 이메일 (Resend)
    - kakao: 카카오 알림톡
    - in_app: 인앱 알림
    """
    try:
        type_enum = NotificationType(request.type)
    except ValueError:
        type_enum = NotificationType.INFO
    
    try:
        priority_enum = NotificationPriority(request.priority)
    except ValueError:
        priority_enum = NotificationPriority.NORMAL
    
    channels = []
    for ch in request.channels:
        try:
            channels.append(NotificationChannel(ch))
        except ValueError:
            pass
    
    if not channels:
        channels = [NotificationChannel.IN_APP]
    
    results = await notification_service.send(
        title=request.title,
        message=request.message,
        type=type_enum,
        priority=priority_enum,
        channels=channels,
        recipient=request.recipient,
        data=request.data or {},
    )
    
    return SendResultResponse(
        success=any(results.values()),
        results=results,
    )


@router.post("/alert")
async def send_alert(title: str, message: str, recipient: Optional[str] = None):
    """긴급 알림 전송 (Slack + In-App)"""
    results = await notification_service.alert(title, message, recipient)
    return {"success": any(results.values()), "results": results}


@router.post("/info")
async def send_info(title: str, message: str, recipient: Optional[str] = None):
    """정보 알림 전송 (In-App)"""
    results = await notification_service.info(title, message, recipient)
    return {"success": any(results.values()), "results": results}


@router.post("/reminder")
async def send_reminder(title: str, message: str, recipient: str):
    """리마인더 전송 (In-App + Email)"""
    results = await notification_service.reminder(title, message, recipient)
    return {"success": any(results.values()), "results": results}


@router.get("/{user_id}", response_model=List[NotificationResponse])
async def get_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
    """
    사용자 알림 조회
    """
    if unread_only:
        notifications = notification_service.in_app.get_unread(user_id)
    else:
        notifications = notification_service.in_app.get_all(user_id, limit)
    
    return [
        NotificationResponse(
            id=n.get("id", ""),
            title=n.get("title", ""),
            message=n.get("message", ""),
            type=n.get("type", "info"),
            priority=n.get("priority", "normal"),
            created_at=n.get("created_at", ""),
            read=n.get("read", False),
        )
        for n in notifications
    ]


@router.get("/{user_id}/unread/count")
async def get_unread_count(user_id: str):
    """읽지 않은 알림 개수"""
    unread = notification_service.in_app.get_unread(user_id)
    return {"user_id": user_id, "unread_count": len(unread)}


@router.post("/{user_id}/read/{notification_id}")
async def mark_as_read(user_id: str, notification_id: str):
    """알림 읽음 처리"""
    success = notification_service.in_app.mark_read(user_id, notification_id)
    return {"success": success}


@router.post("/{user_id}/read-all")
async def mark_all_as_read(user_id: str):
    """전체 읽음 처리"""
    count = notification_service.in_app.mark_all_read(user_id)
    return {"success": True, "marked_count": count}


@router.get("/channels/status")
async def get_channels_status():
    """채널 상태 확인"""
    return {
        "channels": {
            "slack": {
                "enabled": notification_service.slack.enabled,
                "configured": bool(notification_service.slack.webhook_url),
            },
            "email": {
                "enabled": notification_service.email.enabled,
                "configured": bool(notification_service.email.api_key),
            },
            "kakao": {
                "enabled": notification_service.kakao.enabled,
                "configured": bool(notification_service.kakao.api_key),
            },
            "in_app": {
                "enabled": True,
                "configured": True,
            },
        }
    }
