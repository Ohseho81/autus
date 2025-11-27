"""
AUTUS WebSocket Stream
- ws://127.0.0.1:8000/stream
- OS -> 3D 실시간 업데이트
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 엔드포인트 - main.py에서 등록"""
    await manager.connect(websocket)
    try:
        # 초기 상태 전송
        await websocket.send_json({
            "type": "connected",
            "message": "AUTUS 3D Stream connected"
        })
        
        while True:
            # 클라이언트로부터 이벤트 수신
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # 이벤트 처리 (에코백 + 로깅)
            print(f"WS Event: {event}")
            await websocket.send_json({
                "type": "ack",
                "event": event
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 브로드캐스트 함수 (다른 모듈에서 호출)
async def broadcast_update(update: dict):
    await manager.broadcast(update)
