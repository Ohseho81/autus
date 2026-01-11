# alerts/router.py
# 알림 API 라우터

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from . import Alert, AlertCreate, AlertSeverity, AlertType, AlertUpdate

logger = logging.getLogger("autus.alerts")
router = APIRouter(prefix="/alerts", tags=["Alerts"])

# In-memory storage (실제 환경에서는 DB 사용)
ALERTS_DB: dict[str, Alert] = {}

# 초기 샘플 알림
SAMPLE_ALERTS = [
    Alert(
        id="alert_001",
        node_id="tesla",
        alert_type=AlertType.WARNING,
        severity=AlertSeverity.CRITICAL,
        title="대규모 매각 감지",
        message="Elon Musk가 2024년 12월에 $5B 상당의 주식을 매각했습니다",
        sources=["sec_form4"],
        created_at=datetime(2024, 12, 16),
    ),
    Alert(
        id="alert_002",
        node_id="nvidia",
        alert_type=AlertType.WARNING,
        severity=AlertSeverity.HIGH,
        title="내부자 매각",
        message="Jensen Huang이 $200M 상당의 주식을 매각했습니다",
        sources=["sec_form4"],
        created_at=datetime(2024, 12, 11),
    ),
    Alert(
        id="alert_003",
        node_id="apple",
        alert_type=AlertType.OPPORTUNITY,
        severity=AlertSeverity.MEDIUM,
        title="기관 매수 증가",
        message="BlackRock이 Q4에 $15B 포지션을 증가시켰습니다",
        sources=["sec_13f"],
        created_at=datetime(2024, 12, 20),
    ),
    Alert(
        id="alert_004",
        node_id="china",
        alert_type=AlertType.WARNING,
        severity=AlertSeverity.CRITICAL,
        title="무역 긴장 고조",
        message="미중 무역 긴장 고조 - 새로운 관세 발표",
        sources=["news"],
        created_at=datetime(2025, 1, 2),
    ),
    Alert(
        id="alert_005",
        node_id="russia",
        alert_type=AlertType.DANGER,
        severity=AlertSeverity.EMERGENCY,
        title="국제 제재",
        message="국제 제재가 무역 흐름에 영향을 미치고 있습니다",
        sources=["news", "comtrade"],
        created_at=datetime(2024, 12, 1),
    ),
    Alert(
        id="alert_006",
        node_id="samsung",
        alert_type=AlertType.OPPORTUNITY,
        severity=AlertSeverity.MEDIUM,
        title="수요 회복",
        message="메모리 칩 수요 회복 - AI 기업들의 대규모 주문",
        sources=["news"],
        created_at=datetime(2025, 1, 1),
    ),
    Alert(
        id="alert_007",
        node_id="microsoft",
        alert_type=AlertType.OPPORTUNITY,
        severity=AlertSeverity.HIGH,
        title="기관 매수",
        message="Vanguard가 $10B 지분을 증가시켰습니다 - AI 모멘텀",
        sources=["sec_13f"],
        created_at=datetime(2024, 12, 18),
    ),
]

# 초기화
for alert in SAMPLE_ALERTS:
    ALERTS_DB[alert.id] = alert


@router.get("")
async def get_alerts(
    node_id: Optional[str] = Query(None, description="노드 ID 필터"),
    alert_type: Optional[AlertType] = Query(None, description="알림 타입 필터"),
    severity_min: Optional[int] = Query(None, ge=1, le=5, description="최소 심각도"),
    unread_only: bool = Query(False, description="읽지 않은 알림만"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """알림 목록 조회"""
    alerts = list(ALERTS_DB.values())
    
    # 필터링
    if node_id:
        alerts = [a for a in alerts if a.node_id == node_id]
    if alert_type:
        alerts = [a for a in alerts if a.alert_type == alert_type]
    if severity_min:
        alerts = [a for a in alerts if a.severity.value >= severity_min]
    if unread_only:
        alerts = [a for a in alerts if not a.read]
    
    # 최신순 정렬
    alerts.sort(key=lambda x: x.created_at, reverse=True)
    alerts = alerts[:limit]
    
    # 통계
    stats = {
        "total": len(ALERTS_DB),
        "unread": sum(1 for a in ALERTS_DB.values() if not a.read),
        "by_type": {
            "warning": sum(1 for a in alerts if a.alert_type == AlertType.WARNING),
            "danger": sum(1 for a in alerts if a.alert_type == AlertType.DANGER),
            "opportunity": sum(1 for a in alerts if a.alert_type == AlertType.OPPORTUNITY),
        },
        "critical": sum(1 for a in alerts if a.severity.value >= 4),
    }
    
    return {
        "alerts": [a.model_dump() for a in alerts],
        "stats": stats,
    }


@router.get("/{alert_id}")
async def get_alert(alert_id: str) -> dict:
    """특정 알림 조회"""
    if alert_id not in ALERTS_DB:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": ALERTS_DB[alert_id].model_dump()}


@router.post("")
async def create_alert(request: AlertCreate) -> dict:
    """새 알림 생성"""
    alert_id = f"alert_{uuid.uuid4().hex[:8]}"
    alert = Alert(
        id=alert_id,
        node_id=request.node_id,
        alert_type=request.alert_type,
        severity=request.severity,
        title=request.title,
        message=request.message,
        sources=request.sources,
        created_at=datetime.now(),
    )
    ALERTS_DB[alert_id] = alert
    logger.info(f"Alert created: {alert_id} for node {request.node_id}")
    return {"alert": alert.model_dump(), "message": "Alert created"}


@router.patch("/{alert_id}")
async def update_alert(alert_id: str, request: AlertUpdate) -> dict:
    """알림 업데이트 (읽음/해제)"""
    if alert_id not in ALERTS_DB:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert = ALERTS_DB[alert_id]
    if request.read is not None:
        alert.read = request.read
    if request.dismissed is not None:
        alert.dismissed = request.dismissed
    
    return {"alert": alert.model_dump(), "message": "Alert updated"}


@router.post("/mark-all-read")
async def mark_all_read() -> dict:
    """모든 알림 읽음 처리"""
    count = 0
    for alert in ALERTS_DB.values():
        if not alert.read:
            alert.read = True
            count += 1
    return {"marked": count, "message": f"{count} alerts marked as read"}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str) -> dict:
    """알림 삭제"""
    if alert_id not in ALERTS_DB:
        raise HTTPException(status_code=404, detail="Alert not found")
    del ALERTS_DB[alert_id]
    return {"message": "Alert deleted"}


@router.get("/node/{node_id}")
async def get_node_alerts(node_id: str) -> dict:
    """특정 노드의 알림 조회"""
    alerts = [a for a in ALERTS_DB.values() if a.node_id == node_id]
    alerts.sort(key=lambda x: x.created_at, reverse=True)
    return {
        "node_id": node_id,
        "alerts": [a.model_dump() for a in alerts],
        "count": len(alerts),
    }
