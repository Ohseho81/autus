"""
AUTUS Scheduler API Routes
===========================

스케줄러 및 알림 시스템 API

Endpoints:
- GET  /api/scheduler/jobs          - 예약된 작업 목록
- POST /api/scheduler/run/{job_id}  - 작업 즉시 실행
- GET  /api/scheduler/briefing      - 주간 브리핑 생성
- POST /api/scheduler/briefing/schedule  - 첫 브리핑 예약
- GET  /api/notifications           - 알림 목록
- POST /api/notifications/read/{id} - 알림 읽음 처리

Version: 1.0.0
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import logging

# 내부 모듈
from ..core.milestone_scheduler import (
    AutusSchedulerSystem,
    NotificationChannel,
    AlertLevel
)

logger = logging.getLogger("autus.scheduler")

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])


# ================================================================
# GLOBAL STATE
# ================================================================

_scheduler_system: Optional[AutusSchedulerSystem] = None


def get_scheduler() -> AutusSchedulerSystem:
    """스케줄러 인스턴스"""
    global _scheduler_system
    if _scheduler_system is None:
        _scheduler_system = AutusSchedulerSystem()
    return _scheduler_system


# ================================================================
# PYDANTIC MODELS
# ================================================================

class NotificationRequest(BaseModel):
    """알림 요청"""
    title: str
    body: str
    level: str = "info"
    channel: str = "in_app"


# ================================================================
# ENDPOINTS
# ================================================================

@router.get("/jobs")
async def get_scheduled_jobs():
    """
    예약된 작업 목록
    """
    scheduler = get_scheduler()
    schedule = scheduler.get_schedule()
    
    return {
        "status": "success",
        "jobs": schedule["jobs"],
        "notifications": schedule["notifications"],
    }


@router.post("/run/{job_id}")
async def run_job_now(job_id: str):
    """
    작업 즉시 실행
    """
    scheduler = get_scheduler()
    
    try:
        result = await scheduler.scheduler.run_job(job_id)
        
        return {
            "status": "success",
            "job_id": job_id,
            "executed_at": datetime.now().isoformat(),
            "result": "Job executed successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/briefing")
async def get_weekly_briefing(user_id: str = "default"):
    """
    주간 브리핑 생성
    """
    scheduler = get_scheduler()
    
    result = await scheduler.run_weekly_briefing(user_id)
    
    return {
        "status": "success",
        "briefing": result["briefing"],
        "formatted": result["formatted"],
    }


@router.post("/briefing/schedule")
async def schedule_first_briefing(user_id: str = "default"):
    """
    첫 번째 주간 보고서 예약
    
    즉시 첫 번째 브리핑을 생성하고 이후 매주 월요일 알림 예약
    """
    scheduler = get_scheduler()
    
    result = await scheduler.schedule_first_briefing(user_id)
    
    return result


@router.get("/milestones")
async def get_milestones():
    """
    4주 이정표 조회
    """
    milestones = [
        {
            "week": 1,
            "title": "엔트로피 정화 완료",
            "targets": [
                "하위 20% 노드와의 상호작용 80% 감소",
                "확보된 자유 시간 18시간 이상",
            ],
            "system_action": "시간 블랙홀 차단 확인 후 집중 모드 전환",
        },
        {
            "week": 2,
            "title": "시너지 임계점 돌파",
            "targets": [
                "골든 코어 3인 이상과 고밀도 협력 세션",
                "네트워크 연결 강도 75% 도달",
            ],
            "system_action": "가치 전이 신호 포착",
        },
        {
            "week": 3,
            "title": "수익 가속도 관성 확보",
            "targets": [
                "자동화 액션 90% 실행 완료",
                "n^5 수준의 비즈니스 기회 유입",
            ],
            "system_action": "수동적 중력 발생 측정",
        },
        {
            "week": 4,
            "title": "자생적 우주 완성",
            "targets": [
                "월간 총 120시간 시간 자산 저축",
                "최종 가치 지수 n^n 달성",
            ],
            "system_action": "다음 달 확장된 우주 재설계",
        },
    ]
    
    return {
        "status": "success",
        "milestones": milestones,
    }


@router.get("/trajectory")
async def get_trajectory_status():
    """
    현재 궤적 상태
    """
    scheduler = get_scheduler()
    performance = scheduler.scheduler.analyzer.get_weekly_performance()
    
    # 예상 대비 이탈 계산
    expected = {
        "expected_value": 20000000,
        "expected_time_saved": 18,
        "expected_golden": 5,
    }
    
    gap = scheduler.scheduler.analyzer.calculate_trajectory_gap(performance, expected)
    
    if gap < 0.1:
        status = "ON_TRACK"
        message = "✅ 궤도 정상: 완벽한 성공 선상에 있습니다"
    elif gap < 0.25:
        status = "MINOR_DEVIATION"
        message = "⚠️ 경미한 이탈: 소폭의 보정이 필요합니다"
    else:
        status = "MAJOR_DEVIATION"
        message = "🚨 궤도 이탈: 즉시 보정 액션이 필요합니다"
    
    return {
        "status": "success",
        "trajectory": {
            "status": status,
            "message": message,
            "gap_percentage": round(gap * 100, 1),
            "performance": performance,
        },
    }


# ================================================================
# NOTIFICATION ENDPOINTS
# ================================================================

@router.get("/notifications")
async def get_notifications(user_id: str = "default", limit: int = 20):
    """
    알림 목록
    """
    scheduler = get_scheduler()
    
    all_notifications = scheduler.scheduler.notifier.notifications[-limit:]
    user_notifications = [n for n in all_notifications if n.user_id == user_id]
    
    return {
        "status": "success",
        "notifications": [
            {
                "id": n.id,
                "channel": n.channel.value,
                "level": n.level.value,
                "title": n.title,
                "body": n.body,
                "data": n.data,
                "created_at": n.created_at.isoformat(),
                "read": n.read_at is not None,
            }
            for n in user_notifications
        ],
        "unread_count": len([n for n in user_notifications if n.read_at is None]),
    }


@router.get("/notifications/unread")
async def get_unread_notifications(user_id: str = "default"):
    """
    읽지 않은 알림
    """
    scheduler = get_scheduler()
    unread = scheduler.scheduler.notifier.get_unread(user_id)
    
    return {
        "status": "success",
        "count": len(unread),
        "notifications": [
            {
                "id": n.id,
                "level": n.level.value,
                "title": n.title,
                "body": n.body,
                "created_at": n.created_at.isoformat(),
            }
            for n in unread
        ],
    }


@router.post("/notifications/read/{notification_id}")
async def mark_notification_read(notification_id: str):
    """
    알림 읽음 처리
    """
    scheduler = get_scheduler()
    
    for n in scheduler.scheduler.notifier.notifications:
        if n.id == notification_id:
            n.read_at = datetime.now()
            return {"status": "success", "read_at": n.read_at.isoformat()}
    
    raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/notifications/send")
async def send_notification(request: NotificationRequest, user_id: str = "default"):
    """
    알림 발송
    """
    scheduler = get_scheduler()
    
    channel = NotificationChannel.IN_APP
    if request.channel == "webhook":
        channel = NotificationChannel.WEBHOOK
    elif request.channel == "email":
        channel = NotificationChannel.EMAIL
    
    level = AlertLevel.INFO
    if request.level == "success":
        level = AlertLevel.SUCCESS
    elif request.level == "warning":
        level = AlertLevel.WARNING
    elif request.level == "critical":
        level = AlertLevel.CRITICAL
    
    notification = await scheduler.scheduler.notifier.send(
        user_id=user_id,
        channel=channel,
        level=level,
        title=request.title,
        body=request.body,
    )
    
    return {
        "status": "success",
        "notification_id": notification.id,
        "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
    }
