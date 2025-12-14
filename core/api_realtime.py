"""
AUTUS Realtime API v1.0
WebSocket + SSE 지원
"""
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import asyncio
import json
import time
from typing import List

# WebSocket 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except:
                pass

manager = ConnectionManager()

# SSE 스트림 생성
async def status_stream(state_engine):
    """Server-Sent Events 스트림"""
    while True:
        status = state_engine.get_status()
        yield f"data: {json.dumps(status)}\n\n"
        await asyncio.sleep(0.5)

# TwinState 변환 (UI용)
def to_twin_state(status: dict) -> dict:
    """API 상태 → TwinState 변환"""
    sig = status.get("signals", {})
    out = status.get("output", {})
    
    return {
        "timeSec": time.time(),
        "energy": sig.get("gravity", 0.5),
        "flow": sig.get("release", 0),
        "risk": min(1, sig.get("entropy", 0) * 1.5 + sig.get("pressure", 0) * 0.5),
        "entropy": sig.get("entropy", 0),
        "pressure": sig.get("pressure", 0),
        "status": out.get("status", "GREEN"),
        "tick": status.get("tick", 0),
        "cycle": status.get("cycle", 0)
    }

# Uniform 계산 (셰이더용)
def to_uniforms(twin: dict) -> dict:
    """TwinState → GPU Uniforms"""
    return {
        "u_time": twin["timeSec"] % 1000,
        "u_energy": max(0, min(1, twin["energy"])),
        "u_flow": max(0, min(1, twin["flow"])),
        "u_risk": max(0, min(1, twin["risk"])),
        "u_entropy": max(0, min(1, twin["entropy"])),
        "u_pressure": max(0, min(1, twin["pressure"])),
        "u_glowGain": 0.3 + twin["energy"] * 0.4,
        "u_noiseGain": twin["entropy"] * 0.2,
        "u_alert": 1 if twin["risk"] > 0.7 else 0
    }
