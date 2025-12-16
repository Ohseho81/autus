from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Set
import json
import asyncio
import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class SubscriptionType(str, Enum):
    """Types of real-time subscriptions"""
    ANALYTICS = "analytics"
    DEVICES = "devices"
    EVENTS = "events"
    ALERTS = "alerts"
    METRICS = "metrics"
    ALL = "all"


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, List[WebSocket]] = {}
        self.client_filters: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "default"):
        await websocket.accept()
        self.active_connections.append(websocket)
        if channel not in self.subscriptions:
            self.subscriptions[channel] = []
        self.subscriptions[channel].append(websocket)
        logger.info(f"Client connected to channel: {channel}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for channel in self.subscriptions.values():
            if websocket in channel:
                channel.remove(websocket)
        if websocket in self.client_filters:
            del self.client_filters[websocket]
        logger.info("Client disconnected")

    async def send_personal(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict, channel: str = "default"):
        if channel in self.subscriptions:
            disconnected = []
            for connection in self.subscriptions[channel]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for connection in disconnected:
                self.disconnect(connection)

    async def broadcast_all(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast all error: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_analytics_update(self, analytics_data: Dict[str, Any]):
        """Broadcast analytics update"""
        message = {
            'type': 'analytics',
            'data': analytics_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast(message, SubscriptionType.ANALYTICS.value)

    async def broadcast_device_update(self, device_data: Dict[str, Any]):
        """Broadcast device status update"""
        message = {
            'type': 'device',
            'data': device_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast(message, SubscriptionType.DEVICES.value)

    async def broadcast_event(self, event_data: Dict[str, Any]):
        """Broadcast reality event"""
        message = {
            'type': 'event',
            'data': event_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast(message, SubscriptionType.EVENTS.value)

    async def broadcast_alert(self, alert_type: str, message_text: str, severity: str = 'info'):
        """Broadcast alert"""
        message = {
            'type': 'alert',
            'alert_type': alert_type,
            'message': message_text,
            'severity': severity,  # info, warning, error, critical
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast(message, SubscriptionType.ALERTS.value)

    async def broadcast_metrics(self, metrics: Dict[str, Any]):
        """Broadcast system metrics"""
        message = {
            'type': 'metrics',
            'data': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast(message, SubscriptionType.METRICS.value)

    def get_stats(self) -> dict:
        return {
            "total_connections": len(self.active_connections),
            "channels": {k: len(v) for k, v in self.subscriptions.items()},
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_channel_subscribers(self, channel: str) -> int:
        """Get number of subscribers for a channel"""
        return len(self.subscriptions.get(channel, []))


manager = ConnectionManager()
