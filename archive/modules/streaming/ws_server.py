"""
WebSocket Streaming Server
실시간 입력 → Guardrail 반응
Commit은 배치로만
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import asyncio

class StreamingServer:
    def __init__(self):
        self.connections = []
        self.pressure_buffer = []
        self.buffer_size = 10
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
    
    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)
    
    async def receive_signal(self, data: Dict[str, Any]):
        """신호 수신 → 버퍼에 추가"""
        self.pressure_buffer.append(data)
        if len(self.pressure_buffer) > self.buffer_size:
            self.pressure_buffer.pop(0)
        
        # 압력 체크 (Guardrail 트리거 조건)
        avg_pressure = sum(d.get("pressure", 0) for d in self.pressure_buffer) / len(self.pressure_buffer)
        return {"avg_pressure": avg_pressure, "trigger": avg_pressure > 0.75}
    
    async def broadcast(self, message: Dict):
        """모든 연결에 브로드캐스트"""
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except:
                pass

server = StreamingServer()
