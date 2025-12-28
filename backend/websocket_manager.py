"""
AUTUS WebSocket Manager
=======================

실시간 WebSocket 연결 관리
"""

from typing import List, Dict, Any, Set
from fastapi import WebSocket
import json
import asyncio


class WebSocketManager:
    """WebSocket 연결 매니저"""
    
    def __init__(self):
        # 활성 연결
        self.active_connections: List[WebSocket] = []
        
        # 채널별 구독자
        self.channel_subscribers: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str = "default"):
        """WebSocket 연결"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # 채널 구독
        if channel not in self.channel_subscribers:
            self.channel_subscribers[channel] = set()
        self.channel_subscribers[channel].add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """WebSocket 연결 해제"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # 모든 채널에서 제거
        for subscribers in self.channel_subscribers.values():
            subscribers.discard(websocket)
    
    async def send_personal(self, message: Dict[str, Any], websocket: WebSocket):
        """개인 메시지 전송"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Send error: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any], channel: str = "default"):
        """브로드캐스트 (채널)"""
        if channel not in self.channel_subscribers:
            return
        
        disconnected = []
        
        for websocket in self.channel_subscribers[channel]:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)
        
        # 끊어진 연결 정리
        for ws in disconnected:
            self.disconnect(ws)
    
    async def broadcast_all(self, message: Dict[str, Any]):
        """전체 브로드캐스트"""
        disconnected = []
        
        for websocket in self.active_connections:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)
        
        for ws in disconnected:
            self.disconnect(ws)
    
    def get_connection_count(self) -> int:
        """활성 연결 수"""
        return len(self.active_connections)
    
    def get_channel_count(self, channel: str) -> int:
        """채널별 구독자 수"""
        return len(self.channel_subscribers.get(channel, set()))


# 전역 인스턴스
ws_manager = WebSocketManager()

