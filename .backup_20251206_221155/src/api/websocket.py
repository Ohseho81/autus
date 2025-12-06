from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "default"):
        await websocket.accept()
        self.active_connections.append(websocket)
        if channel not in self.subscriptions:
            self.subscriptions[channel] = []
        self.subscriptions[channel].append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for channel in self.subscriptions.values():
            if websocket in channel:
                channel.remove(websocket)

    async def send_personal(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict, channel: str = "default"):
        if channel in self.subscriptions:
            for connection in self.subscriptions[channel]:
                try:
                    await connection.send_json(message)
                except:
                    self.disconnect(connection)

    async def broadcast_all(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

    def get_stats(self) -> dict:
        return {
            "total_connections": len(self.active_connections),
            "channels": {k: len(v) for k, v in self.subscriptions.items()}
        }

manager = ConnectionManager()
