#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📡 AUTUS EMPIRE - WebSocket & Metrics                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실시간 알림 WebSocket + Prometheus 메트릭스
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketConfig:
    """WebSocket 설정"""
    PING_INTERVAL = 30  # 핑 간격 (초)
    MAX_CONNECTIONS_PER_STATION = 10  # 매장당 최대 연결


class MetricsConfig:
    """메트릭스 설정"""
    ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메트릭스 수집기
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    """메트릭스 데이터"""
    # 요청 카운터
    requests_total: int = 0
    requests_by_endpoint: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    requests_by_status: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    # 응답 시간
    response_times: List[float] = field(default_factory=list)
    
    # 비즈니스 메트릭스
    customers_created: int = 0
    entries_logged: int = 0
    quests_completed: int = 0
    vip_alerts: int = 0
    caution_alerts: int = 0
    
    # WebSocket
    active_connections: int = 0
    messages_sent: int = 0
    
    # 시스템
    start_time: float = field(default_factory=time.time)


# 글로벌 메트릭스
_metrics = Metrics()


def get_metrics() -> Metrics:
    """메트릭스 반환"""
    return _metrics


def record_request(endpoint: str, status_code: int, response_time: float):
    """요청 메트릭스 기록"""
    _metrics.requests_total += 1
    _metrics.requests_by_endpoint[endpoint] += 1
    _metrics.requests_by_status[status_code] += 1
    
    # 최근 1000개 응답 시간만 유지
    _metrics.response_times.append(response_time)
    if len(_metrics.response_times) > 1000:
        _metrics.response_times = _metrics.response_times[-1000:]


def record_business_event(event_type: str):
    """비즈니스 이벤트 기록"""
    if event_type == "customer_created":
        _metrics.customers_created += 1
    elif event_type == "entry_logged":
        _metrics.entries_logged += 1
    elif event_type == "quest_completed":
        _metrics.quests_completed += 1
    elif event_type == "vip_alert":
        _metrics.vip_alerts += 1
    elif event_type == "caution_alert":
        _metrics.caution_alerts += 1


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Prometheus 포맷 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_prometheus_metrics() -> str:
    """Prometheus 포맷 메트릭스 생성"""
    lines = []
    
    # 업타임
    uptime = time.time() - _metrics.start_time
    lines.append(f"# HELP autus_uptime_seconds Server uptime in seconds")
    lines.append(f"# TYPE autus_uptime_seconds gauge")
    lines.append(f"autus_uptime_seconds {uptime:.2f}")
    
    # 총 요청 수
    lines.append(f"# HELP autus_requests_total Total number of requests")
    lines.append(f"# TYPE autus_requests_total counter")
    lines.append(f"autus_requests_total {_metrics.requests_total}")
    
    # 엔드포인트별 요청
    lines.append(f"# HELP autus_requests_by_endpoint Requests by endpoint")
    lines.append(f"# TYPE autus_requests_by_endpoint counter")
    for endpoint, count in _metrics.requests_by_endpoint.items():
        safe_endpoint = endpoint.replace('"', '\\"')
        lines.append(f'autus_requests_by_endpoint{{endpoint="{safe_endpoint}"}} {count}')
    
    # 상태 코드별 요청
    lines.append(f"# HELP autus_requests_by_status Requests by HTTP status")
    lines.append(f"# TYPE autus_requests_by_status counter")
    for status, count in _metrics.requests_by_status.items():
        lines.append(f'autus_requests_by_status{{status="{status}"}} {count}')
    
    # 평균 응답 시간
    if _metrics.response_times:
        avg_time = sum(_metrics.response_times) / len(_metrics.response_times)
        lines.append(f"# HELP autus_response_time_avg Average response time in ms")
        lines.append(f"# TYPE autus_response_time_avg gauge")
        lines.append(f"autus_response_time_avg {avg_time:.2f}")
    
    # 비즈니스 메트릭스
    lines.append(f"# HELP autus_customers_created Total customers created")
    lines.append(f"# TYPE autus_customers_created counter")
    lines.append(f"autus_customers_created {_metrics.customers_created}")
    
    lines.append(f"# HELP autus_entries_logged Total entry logs")
    lines.append(f"# TYPE autus_entries_logged counter")
    lines.append(f"autus_entries_logged {_metrics.entries_logged}")
    
    lines.append(f"# HELP autus_vip_alerts Total VIP alerts")
    lines.append(f"# TYPE autus_vip_alerts counter")
    lines.append(f"autus_vip_alerts {_metrics.vip_alerts}")
    
    # WebSocket
    lines.append(f"# HELP autus_websocket_connections Active WebSocket connections")
    lines.append(f"# TYPE autus_websocket_connections gauge")
    lines.append(f"autus_websocket_connections {_metrics.active_connections}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        # station_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # 전역 브로드캐스트용
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, station_id: str = None):
        """연결 수락"""
        await websocket.accept()
        
        if station_id:
            # 매장별 연결 제한
            if len(self.active_connections[station_id]) >= WebSocketConfig.MAX_CONNECTIONS_PER_STATION:
                await websocket.close(code=1008, reason="Too many connections")
                return False
            self.active_connections[station_id].add(websocket)
        else:
            self.global_connections.add(websocket)
        
        _metrics.active_connections += 1
        return True
    
    def disconnect(self, websocket: WebSocket, station_id: str = None):
        """연결 해제"""
        if station_id and websocket in self.active_connections[station_id]:
            self.active_connections[station_id].discard(websocket)
        
        self.global_connections.discard(websocket)
        _metrics.active_connections = max(0, _metrics.active_connections - 1)
    
    async def send_to_station(self, station_id: str, message: dict):
        """특정 매장에 메시지 전송"""
        disconnected = set()
        
        for connection in self.active_connections.get(station_id, set()):
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        for conn in disconnected:
            self.disconnect(conn, station_id)
    
    async def broadcast(self, message: dict):
        """전체 브로드캐스트"""
        disconnected = set()
        
        # 전역 연결
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
                _metrics.messages_sent += 1
            except Exception:
                disconnected.add(connection)
        
        # 모든 매장
        for station_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                    _metrics.messages_sent += 1
                except Exception:
                    disconnected.add((connection, station_id))
        
        # 정리
        for item in disconnected:
            if isinstance(item, tuple):
                self.disconnect(item[0], item[1])
            else:
                self.global_connections.discard(item)
    
    def get_stats(self) -> dict:
        """연결 통계"""
        return {
            "global_connections": len(self.global_connections),
            "stations": {
                station_id: len(conns)
                for station_id, conns in self.active_connections.items()
            },
            "total": _metrics.active_connections,
        }


# 글로벌 연결 관리자
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 타입
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AlertType:
    VIP_ENTRY = "VIP_ENTRY"
    CAUTION_ENTRY = "CAUTION_ENTRY"
    QUEST_COMPLETE = "QUEST_COMPLETE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DAILY_REPORT = "DAILY_REPORT"


async def send_alert(
    alert_type: str,
    message: str,
    station_id: str = None,
    data: dict = None
):
    """알림 전송"""
    alert = {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": data or {},
    }
    
    if station_id:
        await manager.send_to_station(station_id, alert)
    else:
        await manager.broadcast(alert)
    
    # 메트릭스 기록
    if alert_type == AlertType.VIP_ENTRY:
        record_business_event("vip_alert")
    elif alert_type == AlertType.CAUTION_ENTRY:
        record_business_event("caution_alert")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_websocket_routes(app: FastAPI):
    """WebSocket 라우트 등록"""
    
    @app.websocket("/ws")
    async def websocket_global(websocket: WebSocket):
        """전역 WebSocket 연결"""
        if not await manager.connect(websocket):
            return
        
        try:
            # 환영 메시지
            await websocket.send_json({
                "type": "CONNECTED",
                "message": "🏛️ AUTUS Empire에 연결되었습니다.",
                "timestamp": datetime.now().isoformat(),
            })
            
            # 메시지 수신 대기
            while True:
                data = await websocket.receive_json()
                
                # Ping-Pong
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
    
    @app.websocket("/ws/{station_id}")
    async def websocket_station(websocket: WebSocket, station_id: str):
        """매장별 WebSocket 연결"""
        if not await manager.connect(websocket, station_id):
            return
        
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "message": f"📍 매장 {station_id}에 연결되었습니다.",
                "station_id": station_id,
                "timestamp": datetime.now().isoformat(),
            })
            
            while True:
                data = await websocket.receive_json()
                
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, station_id)
        except Exception:
            manager.disconnect(websocket, station_id)


def create_metrics_routes():
    """메트릭스 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(tags=["Metrics"])
    
    @router.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics():
        """Prometheus 메트릭스 엔드포인트"""
        if not MetricsConfig.ENABLED:
            return PlainTextResponse("Metrics disabled", status_code=404)
        return generate_prometheus_metrics()
    
    @router.get("/api/v1/metrics")
    async def json_metrics():
        """JSON 메트릭스"""
        m = get_metrics()
        
        avg_response_time = (
            sum(m.response_times) / len(m.response_times)
            if m.response_times else 0
        )
        
        return {
            "uptime_seconds": time.time() - m.start_time,
            "requests": {
                "total": m.requests_total,
                "by_endpoint": dict(m.requests_by_endpoint),
                "by_status": dict(m.requests_by_status),
            },
            "response_time_avg_ms": round(avg_response_time, 2),
            "business": {
                "customers_created": m.customers_created,
                "entries_logged": m.entries_logged,
                "quests_completed": m.quests_completed,
                "vip_alerts": m.vip_alerts,
                "caution_alerts": m.caution_alerts,
            },
            "websocket": {
                "active_connections": m.active_connections,
                "messages_sent": m.messages_sent,
            },
        }
    
    @router.get("/api/v1/websocket/stats")
    async def websocket_stats():
        """WebSocket 연결 통계"""
        return manager.get_stats()
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 (메트릭스 수집용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_metrics_middleware(app: FastAPI):
    """메트릭스 수집 미들웨어"""
    
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # 메트릭스 기록
        response_time = (time.time() - start_time) * 1000
        record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
    
    print("📊 메트릭스 수집 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_websocket_and_metrics(app: FastAPI):
    """WebSocket + 메트릭스 초기화"""
    create_websocket_routes(app)
    app.include_router(create_metrics_routes())
    setup_metrics_middleware(app)
    
    print("📡 WebSocket 엔드포인트 등록 완료 (/ws, /ws/{station_id})")
    print("📊 메트릭스 엔드포인트 등록 완료 (/metrics)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "manager",
    "send_alert",
    "AlertType",
    "get_metrics",
    "record_request",
    "record_business_event",
    "init_websocket_and_metrics",
    "create_websocket_routes",
    "create_metrics_routes",
]





















