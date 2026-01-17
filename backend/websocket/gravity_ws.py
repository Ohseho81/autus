"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Gravity WebSocket Server
실시간 Gravity 상태 브로드캐스트
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import dataclass, field, asdict
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Connection Manager
# ═══════════════════════════════════════════════════════════════════════════════

class GravityConnectionManager:
    """Gravity WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._state = GravityState()
        self._broadcast_task: Optional[asyncio.Task] = None
    
    async def connect(self, websocket: WebSocket):
        """클라이언트 연결"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[GravityWS] Client connected. Total: {len(self.active_connections)}")
        
        # 초기 상태 전송
        await self.send_state(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """클라이언트 연결 해제"""
        self.active_connections.discard(websocket)
        logger.info(f"[GravityWS] Client disconnected. Total: {len(self.active_connections)}")
    
    async def send_state(self, websocket: WebSocket):
        """특정 클라이언트에 상태 전송"""
        try:
            await websocket.send_json({
                "type": "gravity_state",
                "data": self._state.to_dict(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"[GravityWS] Send error: {e}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """모든 클라이언트에 브로드캐스트"""
        if not self.active_connections:
            return
        
        disconnected = set()
        
        for websocket in self.active_connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"[GravityWS] Broadcast failed: {e}")
                disconnected.add(websocket)
        
        # 끊어진 연결 정리
        self.active_connections -= disconnected
    
    async def broadcast_state(self):
        """현재 상태 브로드캐스트"""
        await self.broadcast({
            "type": "gravity_state",
            "data": self._state.to_dict(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    
    async def broadcast_event(self, event: "GravityEvent"):
        """이벤트 브로드캐스트"""
        self._state.add_event(event)
        
        await self.broadcast({
            "type": "gravity_event",
            "data": event.to_dict(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        # 전체 상태도 함께 전송
        await self.broadcast_state()
    
    def update_state(self, **kwargs):
        """상태 업데이트"""
        for key, value in kwargs.items():
            if hasattr(self._state, key):
                setattr(self._state, key, value)
    
    def get_state(self) -> "GravityState":
        """현재 상태 조회"""
        return self._state
    
    async def start_periodic_broadcast(self, interval: float = 5.0):
        """주기적 상태 브로드캐스트 시작"""
        async def _broadcast_loop():
            while True:
                await asyncio.sleep(interval)
                if self.active_connections:
                    await self.broadcast_state()
        
        self._broadcast_task = asyncio.create_task(_broadcast_loop())
        logger.info(f"[GravityWS] Periodic broadcast started (interval: {interval}s)")
    
    def stop_periodic_broadcast(self):
        """주기적 브로드캐스트 중지"""
        if self._broadcast_task:
            self._broadcast_task.cancel()
            self._broadcast_task = None


# ═══════════════════════════════════════════════════════════════════════════════
# State Models
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GravityEvent:
    """Gravity 이벤트"""
    id: str
    type: str  # EVALUATE, OVERRIDE, RITUAL_ENTER, RITUAL_FINALIZE, GATE_BLOCKED
    decision_id: str
    k_level: int
    actor: str
    status: str  # allowed, blocked, pending, ritual
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GravityState:
    """Gravity 전체 상태"""
    active_decisions: int = 0
    pending_approvals: int = 0
    k_distribution: Dict[int, int] = field(default_factory=lambda: {k: 0 for k in range(1, 11)})
    recent_events: List[GravityEvent] = field(default_factory=list)
    ritual_in_progress: bool = False
    ritual_id: Optional[str] = None
    ritual_decision_id: Optional[str] = None
    audit_count: int = 0
    chain_valid: bool = True
    
    # System Health
    api_health: str = "healthy"
    db_health: str = "healthy"
    llm_health: str = "healthy"
    ws_health: str = "healthy"
    
    def add_event(self, event: GravityEvent):
        """이벤트 추가"""
        self.recent_events.insert(0, event)
        
        # 최대 50개 유지
        if len(self.recent_events) > 50:
            self.recent_events = self.recent_events[:50]
        
        # 카운터 업데이트
        if event.type == "EVALUATE":
            self.active_decisions += 1
            k = event.k_level
            if 1 <= k <= 10:
                self.k_distribution[k] = self.k_distribution.get(k, 0) + 1
            
            if event.status == "pending":
                self.pending_approvals += 1
        
        elif event.type == "RITUAL_ENTER":
            self.ritual_in_progress = True
            self.ritual_id = event.details.get("ritual_id")
            self.ritual_decision_id = event.decision_id
        
        elif event.type == "RITUAL_FINALIZE":
            self.ritual_in_progress = False
            self.ritual_id = None
            self.ritual_decision_id = None
        
        self.audit_count += 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "active_decisions": self.active_decisions,
            "pending_approvals": self.pending_approvals,
            "k_distribution": self.k_distribution,
            "recent_events": [e.to_dict() if isinstance(e, GravityEvent) else e for e in self.recent_events],
            "ritual_in_progress": self.ritual_in_progress,
            "ritual_id": self.ritual_id,
            "ritual_decision_id": self.ritual_decision_id,
            "audit_count": self.audit_count,
            "chain_valid": self.chain_valid,
            "system_health": {
                "api": self.api_health,
                "database": self.db_health,
                "llm": self.llm_health,
                "websocket": self.ws_health,
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

gravity_manager = GravityConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions (Gravity 모듈에서 호출)
# ═══════════════════════════════════════════════════════════════════════════════

async def emit_gravity_event(
    event_type: str,
    decision_id: str,
    k_level: int,
    actor: str,
    status: str,
    details: Optional[Dict] = None,
):
    """Gravity 이벤트 발행 (Gravity router에서 호출)"""
    import uuid
    
    event = GravityEvent(
        id=str(uuid.uuid4())[:8],
        type=event_type,
        decision_id=decision_id,
        k_level=k_level,
        actor=actor,
        status=status,
        details=details or {},
    )
    
    await gravity_manager.broadcast_event(event)
    
    return event


def update_gravity_state(**kwargs):
    """상태 업데이트 (동기)"""
    gravity_manager.update_state(**kwargs)


def get_gravity_state() -> Dict[str, Any]:
    """현재 상태 조회"""
    return gravity_manager.get_state().to_dict()
