"""
AUTUS /me API
Role-based personalized dashboard

Each role sees their own tailored view.
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from datetime import datetime

from core.view_scope import ViewScope, Role
from api.deps import get_view_scope

router = APIRouter(prefix="/me", tags=["me"])


# ==========================================
# Sample Data by Role
# ==========================================

SAMPLE_DATA = {
    Role.student: {
        "tasks": [
            {"id": "t1", "title": "TOPIK 신청서 제출", "due": "2025-12-10", "status": "pending"},
            {"id": "t2", "title": "비자 서류 준비", "due": "2025-12-15", "status": "in_progress"},
            {"id": "t3", "title": "오리엔테이션 참석", "due": "2025-12-08", "status": "completed"},
        ],
        "status": {
            "enrollment": "active",
            "visa": "processing",
            "progress": 0.65,
            "level": "TOPIK 2"
        },
        "upcoming": [
            {"date": "2025-12-08", "event": "오리엔테이션", "location": "본관 201호"},
            {"date": "2025-12-10", "event": "한국어 시험", "location": "시험장 A"}
        ]
    },
    Role.teacher: {
        "tasks": [
            {"id": "t1", "title": "출석 입력", "due": "today", "status": "pending"},
            {"id": "t2", "title": "중간고사 채점", "due": "2025-12-12", "status": "in_progress"},
        ],
        "classes": [
            {"id": "c1", "name": "한국어 3급", "students": 25, "time": "09:00-12:00"},
            {"id": "c2", "name": "한국어 4급", "students": 18, "time": "14:00-17:00"}
        ],
        "alerts": [
            {"type": "attendance", "message": "김OO 3일 연속 결석", "severity": "warning"}
        ]
    },
    Role.facility: {
        "tasks": [
            {"id": "t1", "title": "에어컨 필터 교체", "location": "A동 201호", "priority": "high"},
            {"id": "t2", "title": "화장실 점검", "location": "B동 1층", "priority": "medium"},
        ],
        "work_orders": {
            "pending": 5,
            "in_progress": 3,
            "completed_today": 8
        },
        "alerts": [
            {"asset": "HVAC-001", "message": "필터 교체 필요", "severity": "warning"}
        ]
    },
    Role.visa: {
        "tasks": [
            {"id": "t1", "title": "D-4 신청서 검토", "applicant": "박OO", "deadline": "today"},
            {"id": "t2", "title": "서류 보완 요청", "applicant": "이OO", "deadline": "2025-12-09"},
        ],
        "applications": {
            "pending_review": 12,
            "documents_needed": 5,
            "approved_today": 3
        },
        "deadlines": [
            {"application": "A001", "deadline": "2025-12-08", "type": "D-4"},
            {"application": "A002", "deadline": "2025-12-10", "type": "D-2"}
        ]
    },
    Role.city: {
        "kpi": {
            "total_students": 2500,
            "retention_rate": 0.94,
            "satisfaction": 4.3,
            "completion_rate": 0.87
        },
        "packs": [
            {"name": "school", "status": "healthy", "users": 2200},
            {"name": "visa", "status": "healthy", "users": 450},
            {"name": "facility", "status": "warning", "users": 50}
        ],
        "alerts": [
            {"type": "system", "message": "facility pack 작업 큐 증가", "severity": "warning"}
        ]
    },
    Role.seho: {
        "message": "Use /god endpoints for full access",
        "god_mode": True,
        "endpoints": ["/god/universe", "/god/graph", "/god/flow"]
    }
}


# ==========================================
# Endpoints
# ==========================================

@router.get("")
async def get_my_dashboard(scope: ViewScope = Depends(get_view_scope)):
    """
    Get personalized dashboard based on role.
    
    Examples:
    - Student: ?role=student&subject_id=Z_test123
    - Teacher: ?role=teacher&org_id=ORG001
    - God Mode: ?role=seho
    """
    data = SAMPLE_DATA.get(scope.role, {})
    
    return {
        "role": scope.role.value,
        "subject_id": scope.subject_id,
        "filters": scope.as_filters(),
        "timestamp": datetime.now().isoformat(),
        "dashboard": data
    }


@router.get("/tasks")
async def get_my_tasks(
    scope: ViewScope = Depends(get_view_scope),
    status: str = Query(default=None, description="Filter by status")
):
    """Get my tasks based on role."""
    data = SAMPLE_DATA.get(scope.role, {})
    tasks = data.get("tasks", [])
    
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    
    return {
        "role": scope.role.value,
        "tasks": tasks,
        "total": len(tasks)
    }


@router.get("/scope")
async def get_my_scope(scope: ViewScope = Depends(get_view_scope)):
    """
    Get my visibility scope.
    Shows what data I can access based on my role.
    """
    scope_descriptions = {
        Role.student: "내 데이터만 볼 수 있음",
        Role.teacher: "내 조직(학교)의 학생/수업 데이터",
        Role.facility: "내 시설의 자산/유지보수 데이터",
        Role.visa: "내 조직의 비자 신청 데이터",
        Role.city: "도시 전체 데이터",
        Role.seho: "🌌 전체 시스템 (God Mode)"
    }
    
    return {
        "role": scope.role.value,
        "description": scope_descriptions.get(scope.role, "Unknown"),
        "filters": scope.as_filters(),
        "is_god_mode": scope.is_god_mode(),
        "can_view": {
            "own_data": True,
            "org_data": scope.role in [Role.teacher, Role.visa, Role.city, Role.seho],
            "city_data": scope.role in [Role.city, Role.seho],
            "all_data": scope.role == Role.seho
        }
    }


@router.get("/notifications")
async def get_my_notifications(
    scope: ViewScope = Depends(get_view_scope),
    limit: int = Query(default=10, description="Max notifications")
):
    """Get role-specific notifications."""
    
    notifications_by_role = {
        Role.student: [
            {"id": "n1", "type": "deadline", "message": "비자 서류 마감 D-3", "time": "1h ago"},
            {"id": "n2", "type": "info", "message": "수업 일정 변경", "time": "3h ago"}
        ],
        Role.teacher: [
            {"id": "n1", "type": "alert", "message": "결석 학생 2명", "time": "30m ago"},
            {"id": "n2", "type": "task", "message": "채점 마감 내일", "time": "2h ago"}
        ],
        Role.facility: [
            {"id": "n1", "type": "urgent", "message": "A동 에어컨 고장", "time": "15m ago"},
            {"id": "n2", "type": "task", "message": "신규 작업 지시 3건", "time": "1h ago"}
        ],
        Role.visa: [
            {"id": "n1", "type": "deadline", "message": "금일 마감 신청서 4건", "time": "2h ago"},
            {"id": "n2", "type": "update", "message": "출입국 승인 3건", "time": "4h ago"}
        ],
        Role.city: [
            {"id": "n1", "type": "metric", "message": "재학률 94%로 상승", "time": "1h ago"},
            {"id": "n2", "type": "alert", "message": "시설팩 경고 상태", "time": "3h ago"}
        ],
        Role.seho: [
            {"id": "n1", "type": "god", "message": "Evolution 완료: 5개 파일 생성", "time": "10m ago"},
            {"id": "n2", "type": "god", "message": "시스템 상태: 98%", "time": "1h ago"}
        ]
    }
    
    notifications = notifications_by_role.get(scope.role, [])[:limit]
    
    return {
        "role": scope.role.value,
        "notifications": notifications,
        "unread": len(notifications)
    }
