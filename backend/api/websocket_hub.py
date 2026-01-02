#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: WebSocket Hub
실시간 대시보드 연동을 위한 WebSocket 서버

Features:
- 실시간 고객 조회 이벤트 브로드캐스트
- VIP/주의 고객 알림
- 통계 업데이트
- 연결된 클라이언트 관리
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from collections import deque

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel


router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DashboardEvent(BaseModel):
    """대시보드 이벤트"""
    event_type: str  # 'customer_lookup', 'vip_alert', 'caution_alert', 'stats_update'
    timestamp: str
    data: Dict[str, Any]


class ConnectionInfo(BaseModel):
    """연결 정보"""
    client_id: str
    connected_at: str
    client_type: str  # 'dashboard', 'bridge', 'admin'


# ═══════════════════════════════════════════════════════════════════════════════════════════
# WebSocket 관리자
# ═══════════════════════════════════════════════════════════════════════════════════════════

class WebSocketManager:
    """WebSocket 연결 관리 및 브로드캐스트"""
    
    def __init__(self):
        # 연결된 클라이언트 {client_id: (websocket, client_type)}
        self.active_connections: Dict[str, tuple] = {}
        
        # 최근 이벤트 버퍼 (신규 연결 시 전송용)
        self.recent_events: deque = deque(maxlen=50)
        
        # 통계
        self.stats = {
            'total_lookups': 0,
            'vip_alerts': 0,
            'caution_alerts': 0,
            'active_stations': set(),
            'hourly_lookups': {},  # {'2024-01-01 14': 25, ...}
        }
    
    async def connect(self, websocket: WebSocket, client_id: str, client_type: str = 'dashboard'):
        """클라이언트 연결"""
        await websocket.accept()
        self.active_connections[client_id] = (websocket, client_type)
        
        # 연결 알림
        await self._broadcast_system_event('client_connected', {
            'client_id': client_id,
            'client_type': client_type,
            'total_connections': len(self.active_connections)
        })
        
        # 최근 이벤트 전송 (대시보드용)
        if client_type == 'dashboard':
            for event in list(self.recent_events)[-10:]:
                try:
                    await websocket.send_json(event)
                except:
                    pass
    
    def disconnect(self, client_id: str):
        """클라이언트 연결 해제"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def broadcast(self, event: Dict[str, Any], target_type: Optional[str] = None):
        """이벤트 브로드캐스트"""
        disconnected = []
        
        for client_id, (websocket, client_type) in self.active_connections.items():
            # 특정 타입만 대상으로 할 경우
            if target_type and client_type != target_type:
                continue
            
            try:
                await websocket.send_json(event)
            except Exception:
                disconnected.append(client_id)
        
        # 끊어진 연결 정리
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def _broadcast_system_event(self, event_type: str, data: Dict[str, Any]):
        """시스템 이벤트 브로드캐스트"""
        event = {
            'event_type': event_type,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        await self.broadcast(event)
    
    async def emit_customer_lookup(self, phone: str, name: str, biz_type: str, 
                                   station_id: str, guide: Dict[str, Any]):
        """고객 조회 이벤트 발행"""
        self.stats['total_lookups'] += 1
        self.stats['active_stations'].add(station_id)
        
        # 시간대별 통계
        hour_key = datetime.now().strftime('%Y-%m-%d %H')
        self.stats['hourly_lookups'][hour_key] = self.stats['hourly_lookups'].get(hour_key, 0) + 1
        
        # 알림 레벨 확인
        alert_level = guide.get('alert_level', 'normal')
        if alert_level == 'urgent':
            self.stats['vip_alerts'] += 1
        elif alert_level == 'caution':
            self.stats['caution_alerts'] += 1
        
        event = {
            'event_type': 'customer_lookup',
            'timestamp': datetime.now().isoformat(),
            'data': {
                'phone': phone[-4:] if phone else '****',  # 마지막 4자리만
                'name': name or 'Unknown',
                'biz_type': biz_type,
                'station_id': station_id,
                'guide': guide,
                'alert_level': alert_level,
            }
        }
        
        self.recent_events.append(event)
        await self.broadcast(event, target_type='dashboard')
    
    async def emit_vip_alert(self, phone: str, name: str, biz_type: str, message: str):
        """VIP 알림 발행"""
        event = {
            'event_type': 'vip_alert',
            'timestamp': datetime.now().isoformat(),
            'data': {
                'phone': phone[-4:] if phone else '****',
                'name': name or 'VIP',
                'biz_type': biz_type,
                'message': message,
            }
        }
        
        self.recent_events.append(event)
        await self.broadcast(event)
    
    async def emit_caution_alert(self, phone: str, name: str, biz_type: str, message: str):
        """주의 알림 발행"""
        event = {
            'event_type': 'caution_alert',
            'timestamp': datetime.now().isoformat(),
            'data': {
                'phone': phone[-4:] if phone else '****',
                'name': name or 'Unknown',
                'biz_type': biz_type,
                'message': message,
            }
        }
        
        self.recent_events.append(event)
        await self.broadcast(event)
    
    def get_stats(self) -> Dict[str, Any]:
        """현재 통계 반환"""
        return {
            'total_lookups': self.stats['total_lookups'],
            'vip_alerts': self.stats['vip_alerts'],
            'caution_alerts': self.stats['caution_alerts'],
            'active_stations': len(self.stats['active_stations']),
            'active_connections': len(self.active_connections),
            'recent_hourly': dict(list(self.stats['hourly_lookups'].items())[-24:]),
        }


# 싱글톤 인스턴스
_ws_manager: Optional[WebSocketManager] = None

def get_ws_manager() -> WebSocketManager:
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
    return _ws_manager


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.websocket("/ws/dashboard/{client_id}")
async def dashboard_websocket(websocket: WebSocket, client_id: str):
    """
    대시보드용 WebSocket 연결
    
    연결 후 실시간 이벤트 수신:
    - customer_lookup: 고객 조회 이벤트
    - vip_alert: VIP 알림
    - caution_alert: 주의 알림
    - stats_update: 통계 업데이트
    """
    manager = get_ws_manager()
    
    try:
        await manager.connect(websocket, client_id, 'dashboard')
        
        # 연결 유지
        while True:
            try:
                # 클라이언트로부터 메시지 수신 (ping/pong 등)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                
                # ping 응답
                if data == 'ping':
                    await websocket.send_text('pong')
                
            except asyncio.TimeoutError:
                # 타임아웃 시 ping 전송
                try:
                    await websocket.send_text('ping')
                except:
                    break
                    
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(client_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """
    WebSocket 통계 조회
    """
    manager = get_ws_manager()
    return manager.get_stats()


@router.get("/ws/connections")
async def get_active_connections():
    """
    활성 연결 목록 조회
    """
    manager = get_ws_manager()
    
    connections = []
    for client_id, (_, client_type) in manager.active_connections.items():
        connections.append({
            'client_id': client_id,
            'client_type': client_type
        })
    
    return {
        'count': len(connections),
        'connections': connections
    }


@router.post("/ws/broadcast")
async def broadcast_message(
    event_type: str,
    message: str,
    target_type: str = None
):
    """
    수동 브로드캐스트 (관리자용)
    """
    manager = get_ws_manager()
    
    event = {
        'event_type': event_type,
        'timestamp': datetime.now().isoformat(),
        'data': {
            'message': message,
            'source': 'admin'
        }
    }
    
    await manager.broadcast(event, target_type)
    
    return {'status': 'broadcast_sent', 'target': target_type or 'all'}
