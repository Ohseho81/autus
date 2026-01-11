# alerts/__init__.py
# 실시간 알림 시스템

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AlertType(str, Enum):
    """알림 타입"""
    WARNING = "warning"
    DANGER = "danger"
    OPPORTUNITY = "opportunity"
    INFO = "info"


class AlertSeverity(int, Enum):
    """심각도 (1-5)"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    EMERGENCY = 5


class Alert(BaseModel):
    """알림 모델"""
    id: str
    node_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    sources: list[str] = []
    created_at: datetime = datetime.now()
    read: bool = False
    dismissed: bool = False


class AlertCreate(BaseModel):
    """알림 생성 요청"""
    node_id: str
    alert_type: AlertType
    severity: AlertSeverity = AlertSeverity.MEDIUM
    title: str
    message: str
    sources: list[str] = []


class AlertUpdate(BaseModel):
    """알림 업데이트 요청"""
    read: Optional[bool] = None
    dismissed: Optional[bool] = None
