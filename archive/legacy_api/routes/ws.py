from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from api.websocket import manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            channel = data.get("channel", "default")
            await manager.broadcast(data, channel)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/{channel}")
async def websocket_channel(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, channel)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/ws/stats")
async def ws_stats():
    return manager.get_stats()
