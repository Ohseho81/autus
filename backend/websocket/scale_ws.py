"""
AUTUS Scale WebSocket - 실시간 데이터 스트리밍
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, List, Any
import asyncio
import json
import random
from datetime import datetime, timezone

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════════════
# Connection Manager
# ═══════════════════════════════════════════════════════════════════════════

class ScaleConnectionManager:
    """Multi-Scale WebSocket 연결 관리자"""
    
    def __init__(self):
        # 활성 연결
        self.active_connections: Dict[str, WebSocket] = {}
        # 채널별 구독자
        self.subscriptions: Dict[str, Set[str]] = {}
        # 시뮬레이션 태스크
        self._simulation_task: asyncio.Task | None = None
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """클라이언트 연결"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"🔌 Client connected: {client_id}")
        
        # 시뮬레이션 시작 (첫 연결 시)
        if self._simulation_task is None or self._simulation_task.done():
            self._simulation_task = asyncio.create_task(self._run_simulation())
    
    def disconnect(self, client_id: str):
        """클라이언트 연결 해제"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
            # 모든 구독에서 제거
            for channel in self.subscriptions:
                self.subscriptions[channel].discard(client_id)
            
            print(f"🔌 Client disconnected: {client_id}")
    
    def subscribe(self, client_id: str, channel: str):
        """채널 구독"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        self.subscriptions[channel].add(client_id)
        print(f"📡 {client_id} subscribed to {channel}")
    
    def unsubscribe(self, client_id: str, channel: str):
        """채널 구독 해제"""
        if channel in self.subscriptions:
            self.subscriptions[channel].discard(client_id)
            print(f"📡 {client_id} unsubscribed from {channel}")
    
    async def send_personal(self, client_id: str, message: dict):
        """특정 클라이언트에게 전송"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                print(f"Failed to send to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: dict):
        """모든 클라이언트에게 전송"""
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def broadcast_to_channel(self, channel: str, message: dict):
        """채널 구독자에게 전송"""
        if channel not in self.subscriptions:
            return
        
        disconnected = []
        for client_id in self.subscriptions[channel]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_json(message)
                except Exception:
                    disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def _run_simulation(self):
        """실시간 데이터 시뮬레이션"""
        tick = 0
        while self.active_connections:
            await asyncio.sleep(2)  # 2초마다 업데이트 (더 빈번하게)
            tick += 1
            
            # KPI 업데이트 (5초마다)
            if tick % 3 == 0:
                await self._send_kpi_updates()
            
            # 랜덤 알림 (15% 확률)
            if random.random() < 0.15:
                await self._send_random_alert()
            
            # 노드 상태 업데이트 (25% 확률)
            if random.random() < 0.25:
                await self._send_node_status()
            
            # Flow 업데이트 (더 빈번하게 - 50% 확률)
            if random.random() < 0.5:
                await self._send_flow_update()
            
            # 글로벌 Flow (10% 확률)
            if random.random() < 0.1:
                await self._send_global_flow()
        
        print("🔌 Simulation stopped (no connections)")
    
    async def _send_kpi_updates(self):
        """KPI 업데이트 전송"""
        kpis = [
            {"id": "realtime", "value": random.randint(1000, 2000), "change": round(random.uniform(-5, 15), 1)},
            {"id": "traffic", "value": random.randint(3000, 4000), "change": round(random.uniform(-10, 10), 1)},
            {"id": "utilization", "value": round(random.uniform(75, 95), 1), "change": round(random.uniform(-3, 5), 1)},
        ]
        
        for kpi in kpis:
            message = {
                "type": "kpi_update",
                "payload": kpi,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await self.broadcast(message)
    
    async def _send_random_alert(self):
        """랜덤 알림 전송"""
        alerts = [
            {"type": "info", "title": "유동인구 증가", "message": "점심시간 유동인구 20% 증가"},
            {"type": "warning", "title": "재고 부족 예상", "message": "현재 소진 속도로 2시간 후 재고 부족"},
            {"type": "success", "title": "목표 달성", "message": "시간당 매출 목표 달성"},
            {"type": "error", "title": "센서 오류", "message": "IoT 센서 응답 지연"},
        ]
        
        alert = random.choice(alerts)
        message = {
            "type": "alert",
            "payload": {
                "id": f"alert_{int(datetime.now().timestamp())}",
                **alert,
                "location": random.choice(["강남구", "서초구", "송파구", "대치동"]),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.broadcast_to_channel("alerts", message)
        await self.broadcast(message)
    
    async def _send_node_status(self):
        """노드 상태 업데이트"""
        nodes = ["node_01", "node_02", "node_03", "node_04", "node_05"]
        statuses = ["active", "active", "active", "warning", "critical"]
        
        node_id = random.choice(nodes)
        message = {
            "type": "node_status",
            "payload": {
                "nodeId": node_id,
                "status": random.choice(statuses),
                "value": random.randint(5000000, 15000000),
                "growth": round(random.uniform(-10, 25), 1),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.broadcast_to_channel(f"node:{node_id}", message)
        await self.broadcast_to_channel("scale:city", message)
    
    async def _send_flow_update(self):
        """Flow 업데이트 - 향상된 실시간 Flow 애니메이션 지원"""
        # 도시 레벨 노드
        city_nodes = [
            {"id": "node_01", "name": "대치동 농구", "lat": 37.4947, "lng": 127.0573},
            {"id": "node_02", "name": "삼성동 PT", "lat": 37.5088, "lng": 127.0632},
            {"id": "node_03", "name": "역삼동 필라테스", "lat": 37.4995, "lng": 127.0365},
            {"id": "node_04", "name": "청담동 요가", "lat": 37.5198, "lng": 127.0474},
            {"id": "node_05", "name": "논현동 크로스핏", "lat": 37.5108, "lng": 127.0252},
        ]
        
        from_node = random.choice(city_nodes)
        to_node = random.choice([n for n in city_nodes if n["id"] != from_node["id"]])
        
        flow_types = [
            {"type": "payment", "color": "#10b981", "label": "결제"},
            {"type": "transfer", "color": "#06b6d4", "label": "이체"},
            {"type": "revenue", "color": "#f59e0b", "label": "매출"},
            {"type": "refund", "color": "#ef4444", "label": "환불"},
        ]
        flow_type = random.choice(flow_types)
        amount = random.randint(50000, 3000000)
        
        message = {
            "type": "flow",
            "payload": {
                "id": f"flow_{int(datetime.now().timestamp() * 1000)}",
                "fromNode": {
                    "id": from_node["id"],
                    "name": from_node["name"],
                    "position": {"lat": from_node["lat"], "lng": from_node["lng"]},
                },
                "toNode": {
                    "id": to_node["id"],
                    "name": to_node["name"],
                    "position": {"lat": to_node["lat"], "lng": to_node["lng"]},
                },
                "amount": amount,
                "formattedAmount": f"₩{amount:,}",
                "flowType": flow_type["type"],
                "color": flow_type["color"],
                "label": flow_type["label"],
                "duration": random.randint(1500, 3000),  # 애니메이션 지속 시간 (ms)
                "particles": random.randint(3, 8),  # 파티클 수
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.broadcast_to_channel("scale:city", message)
        await self.broadcast_to_channel("flows", message)
        await self.broadcast(message)  # 모든 클라이언트에게도 전송
    
    async def _send_global_flow(self):
        """글로벌 레벨 Flow"""
        regions = [
            {"id": "asia", "name": "Asia Pacific", "lat": 35.0, "lng": 105.0},
            {"id": "europe", "name": "Europe", "lat": 50.0, "lng": 10.0},
            {"id": "northamerica", "name": "North America", "lat": 40.0, "lng": -100.0},
        ]
        
        from_region = random.choice(regions)
        to_region = random.choice([r for r in regions if r["id"] != from_region["id"]])
        amount = random.randint(1000000, 100000000)
        
        message = {
            "type": "global_flow",
            "payload": {
                "id": f"gflow_{int(datetime.now().timestamp() * 1000)}",
                "from": from_region,
                "to": to_region,
                "amount": amount,
                "formattedAmount": f"${amount / 1000000:.1f}M",
                "flowType": random.choice(["trade", "investment", "transfer"]),
                "duration": random.randint(3000, 5000),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.broadcast_to_channel("scale:global", message)
        await self.broadcast(message)


# 전역 매니저
manager = ScaleConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket Endpoint
# ═══════════════════════════════════════════════════════════════════════════

@router.websocket("/ws/scale")
async def websocket_endpoint(websocket: WebSocket):
    """Scale WebSocket 엔드포인트"""
    import uuid
    client_id = str(uuid.uuid4())[:8]
    
    await manager.connect(websocket, client_id)
    
    # 연결 확인 메시지
    await websocket.send_json({
        "type": "system",
        "payload": {
            "message": "Connected to AUTUS Scale WebSocket",
            "clientId": client_id,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            
            if msg_type == "subscribe":
                channel = data.get("channel")
                if channel:
                    manager.subscribe(client_id, channel)
                    await websocket.send_json({
                        "type": "system",
                        "payload": {"message": f"Subscribed to {channel}"},
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
            
            elif msg_type == "unsubscribe":
                channel = data.get("channel")
                if channel:
                    manager.unsubscribe(client_id, channel)
                    await websocket.send_json({
                        "type": "system",
                        "payload": {"message": f"Unsubscribed from {channel}"},
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
            
            elif msg_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(client_id)
