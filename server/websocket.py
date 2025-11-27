"""
AUTUS WebSocket Stream
- ws://127.0.0.1:8000/stream
- OS -> 3D 실시간 업데이트
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """모든 연결에 메시지 브로드캐스트"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # 끊어진 연결 제거
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_node_update(self, node_data: dict):
        """노드 업데이트 브로드캐스트"""
        await self.broadcast({
            "type": "node_update",
            "node": node_data
        })
    
    async def send_state_change(self, state_type: str):
        """상태 변경 알림"""
        await self.broadcast({
            "type": "state_change",
            "state": state_type
        })

# 전역 매니저
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 엔드포인트"""
    await manager.connect(websocket)
    try:
        # 연결 확인 메시지
        await websocket.send_json({
            "type": "connected",
            "message": "AUTUS 3D Stream connected",
            "clients": len(manager.active_connections)
        })
        
        while True:
            # 클라이언트로부터 이벤트 수신
            data = await websocket.receive_text()
            event = json.loads(data)
            
            print(f"WS Event: {event}")
            
            # 이벤트 처리
            if event.get("event") == "node_click":
                # 클릭된 노드 정보 에코백
                await websocket.send_json({
                    "type": "ack",
                    "event": event,
                    "message": f"Node {event.get('node_id')} clicked"
                })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# 외부에서 브로드캐스트 호출용 함수
async def broadcast_update(update: dict):
    await manager.broadcast(update)

def get_connection_count():
    return len(manager.active_connections)
