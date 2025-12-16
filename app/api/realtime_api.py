"""
AUTUS Realtime API
WebSocket for Solar Dashboard
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import asyncio
import json

router = APIRouter(prefix="/realtime", tags=["realtime"])

# 연결된 클라이언트들
clients = []

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    print(f"[WS] Client connected. Total: {len(clients)}")
    
    try:
        from core.solar.observer_bridge import get_realtime_state
        
        while True:
            state = get_realtime_state()
            await websocket.send_json(state)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        clients.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(clients)}")

@router.get("/stream")
async def stream_status():
    """SSE 스트림 (WebSocket 대안)"""
    from core.solar.observer_bridge import get_realtime_state
    
    async def generate():
        while True:
            state = get_realtime_state()
            yield f"data: {json.dumps(state)}\n\n"
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"}
    )

@router.get("/state")
async def get_state():
    """현재 상태 (폴링용)"""
    from core.solar.observer_bridge import get_realtime_state
    return get_realtime_state()
