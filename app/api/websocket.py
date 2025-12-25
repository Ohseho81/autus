"""
AUTUS WebSocket API
PhysicsEngine 실시간 브로드캐스트
"""

import asyncio
import json
import time
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import asdict

# Physics Engine import (선택적)
try:
    from app.physics.engine import PhysicsEngine
    HAS_PHYSICS_ENGINE = True
except ImportError:
    HAS_PHYSICS_ENGINE = False
    PhysicsEngine = None


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.physics_engine: Optional[Any] = None
        self.broadcast_task: Optional[asyncio.Task] = None
        self.broadcast_interval: float = 1.0  # 1초 간격
        self._running = False
    
    def set_physics_engine(self, engine):
        """PhysicsEngine 인스턴스 설정"""
        self.physics_engine = engine
        print(f"[WS] PhysicsEngine connected: {type(engine).__name__}")
    
    async def connect(self, websocket: WebSocket):
        """새 연결 수락"""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")
        
        # 초기 상태 전송
        await self._send_initial_state(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """연결 해제"""
        self.active_connections.discard(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")
    
    async def _send_initial_state(self, websocket: WebSocket):
        """초기 상태 전송"""
        snapshot = self._get_physics_snapshot()
        await websocket.send_json({
            "type": "physics_update",
            "payload": snapshot
        })
    
    async def broadcast(self, message: Dict):
        """모든 클라이언트에 브로드캐스트"""
        if not self.active_connections:
            return
        
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS] Broadcast error: {e}")
                disconnected.add(connection)
        
        # 끊어진 연결 제거
        self.active_connections -= disconnected
    
    async def broadcast_physics_update(self):
        """물리 상태 브로드캐스트"""
        snapshot = self._get_physics_snapshot()
        await self.broadcast({
            "type": "physics_update",
            "payload": snapshot
        })
    
    def _get_physics_snapshot(self) -> Dict:
        """PhysicsEngine 스냅샷 가져오기"""
        if self.physics_engine:
            try:
                # 실제 PhysicsEngine 사용
                snapshot = self.physics_engine.compute_snapshot()
                return self.physics_engine.to_dict()
            except Exception as e:
                print(f"[WS] PhysicsEngine error: {e}")
        
        # 더미 데이터 (개발용)
        return self._get_mock_snapshot()
    
    def _get_mock_snapshot(self) -> Dict:
        """개발용 더미 데이터"""
        import random
        
        base_risk = 35 + random.random() * 10
        
        return {
            "timestamp": time.time(),
            "system_state": "YELLOW" if base_risk > 40 else "GREEN",
            "gate": "YELLOW" if base_risk > 40 else "GREEN",
            
            # 핵심 지표
            "risk": round(base_risk + random.random() * 5, 1),
            "entropy": round(25 + random.random() * 15, 1),
            "pressure": round(40 + random.random() * 20, 1),
            "flow": round(60 + random.random() * 10, 1),
            
            # 시간 지표
            "survival_days": round(180 - random.random() * 30, 1),
            "collapse_days": round(365 - random.random() * 50, 1),
            "pnr_days": int(14 + random.random() * 7),
            
            # 기회비용
            "total_loss": int(12400000 + random.random() * 2000000),
            "loss_rate": int(41000 + random.random() * 5000),
            "loss_velocity": round(0.47 + random.random() * 0.2, 2),
            
            # 7종 기회비용
            "costs": {
                "time": int(2100000 + random.random() * 200000),
                "risk": int(3470000 + random.random() * 300000),
                "resource": int(1240000 + random.random() * 100000),
                "position": int(1980000 + random.random() * 200000),
                "learning": int(1490000 + random.random() * 150000),
                "trust": int(1610000 + random.random() * 150000),
                "irreversibility": int(500000 + random.random() * 100000)
            },
            
            # 상태
            "state": "WARNING",
            "unit": "₩",
            "can_create_commit": True,
            "can_expand": False,
            "recommended_action": "RECOVER",
            "violations": []
        }
    
    async def start_broadcast_loop(self):
        """주기적 브로드캐스트 시작"""
        if self._running:
            return
        
        self._running = True
        print(f"[WS] Broadcast loop started (interval: {self.broadcast_interval}s)")
        
        while self._running:
            await self.broadcast_physics_update()
            await asyncio.sleep(self.broadcast_interval)
    
    def stop_broadcast_loop(self):
        """브로드캐스트 중지"""
        self._running = False
        if self.broadcast_task:
            self.broadcast_task.cancel()
            self.broadcast_task = None
        print("[WS] Broadcast loop stopped")
    
    async def handle_client_message(self, websocket: WebSocket, data: Dict):
        """클라이언트 메시지 처리"""
        msg_type = data.get("type")
        payload = data.get("payload", {})
        
        if msg_type == "action":
            result = await self._handle_action(payload)
            await websocket.send_json({
                "type": "action_result",
                "payload": result
            })
        
        elif msg_type == "subscribe":
            # 특정 데이터 구독 (향후 확장)
            pass
        
        elif msg_type == "ping":
            await websocket.send_json({"type": "pong", "timestamp": time.time()})
    
    async def _handle_action(self, payload: Dict) -> Dict:
        """액션 처리"""
        action = payload.get("action")
        
        if self.physics_engine:
            try:
                result = self.physics_engine.execute_action(action)
                
                # 상태 변경 알림
                if result.get("success"):
                    await self.broadcast({
                        "type": "alert",
                        "payload": {
                            "level": "info",
                            "message": f"Action '{action}' executed"
                        }
                    })
                
                return result
                
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        # 더미 응답
        return {
            "success": True,
            "action": action,
            "message": f"Action '{action}' simulated (no engine)"
        }


# 싱글톤 인스턴스
_manager: Optional[ConnectionManager] = None

def get_manager() -> ConnectionManager:
    """ConnectionManager 싱글톤 가져오기"""
    global _manager
    if _manager is None:
        _manager = ConnectionManager()
    return _manager


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/physics")
async def websocket_physics(websocket: WebSocket):
    """Physics 실시간 WebSocket 엔드포인트"""
    manager = get_manager()
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_client_message(websocket, data)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Error: {e}")
        manager.disconnect(websocket)


@router.get("/api/physics/snapshot")
async def get_physics_snapshot():
    """현재 물리 상태 (REST API)"""
    manager = get_manager()
    return manager._get_physics_snapshot()


@router.post("/api/physics/action")
async def execute_physics_action(action: str):
    """액션 실행 (REST API)"""
    manager = get_manager()
    result = await manager._handle_action({"action": action})
    return result
