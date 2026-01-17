"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS K/I WebSocket 실시간 서버
                    
    실시간 K/I 지수 변화 브로드캐스트
    - k_update: K-지수 변화
    - i_update: I-지수 변화
    - phase_change: 임계점 전환
    - anomaly: 이상 징후 감지
    
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Set, Optional
from datetime import datetime
from enum import Enum
import asyncio
import json


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket 연결 관리자
# ═══════════════════════════════════════════════════════════════════════════════

class KIConnectionManager:
    """K/I WebSocket 연결 관리"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        print(f"[K/I WS] Client connected. Total: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        print(f"[K/I WS] Client disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """모든 클라이언트에 브로드캐스트"""
        if not self.active_connections:
            return
        
        data = json.dumps(message, default=str)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.add(connection)
        
        # 끊긴 연결 제거
        async with self._lock:
            self.active_connections -= disconnected
    
    async def send_to(self, websocket: WebSocket, message: dict):
        """특정 클라이언트에 전송"""
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception:
            await self.disconnect(websocket)


ki_manager = KIConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════
# 메시지 타입
# ═══════════════════════════════════════════════════════════════════════════════

class MessageType(str, Enum):
    K_UPDATE = "k_update"
    I_UPDATE = "i_update"
    PHASE_CHANGE = "phase_change"
    ANOMALY = "anomaly"
    HEARTBEAT = "heartbeat"
    SNAPSHOT = "snapshot"


def create_message(msg_type: MessageType, data: dict) -> dict:
    return {
        "type": msg_type.value,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# K/I 상태 저장소 (인메모리)
# ═══════════════════════════════════════════════════════════════════════════════

class KIStore:
    """K/I 상태 저장소"""
    
    def __init__(self):
        self.nodes: Dict[str, dict] = {}
        self.interactions: Dict[str, dict] = {}  # key: "nodeA-nodeB" (sorted)
        self.anomalies: List[dict] = []
    
    def _pair_key(self, a: str, b: str) -> str:
        return "-".join(sorted([a, b]))
    
    # K-지수
    def get_k(self, node_id: str) -> Optional[dict]:
        return self.nodes.get(node_id)
    
    async def set_k(self, node_id: str, k_index: float, phase: str, action: Optional[str] = None):
        old = self.nodes.get(node_id, {}).get("k_index", 0)
        
        self.nodes[node_id] = {
            "id": node_id,
            "k_index": k_index,
            "phase": phase,
            "last_action": action,
            "updated_at": datetime.now()
        }
        
        # 브로드캐스트
        await ki_manager.broadcast(create_message(MessageType.K_UPDATE, {
            "node_id": node_id,
            "k_before": old,
            "k_after": k_index,
            "delta_k": k_index - old,
            "phase": phase,
            "action": action
        }))
        
        # 임계점 체크
        await self._check_k_phase(node_id, k_index, phase)
    
    async def _check_k_phase(self, node_id: str, k: float, phase: str):
        anomaly = None
        
        if k > 0.9:
            anomaly = {
                "type": "explosive",
                "target": node_id,
                "value": k,
                "message": f"{node_id} 폭발 성장 진입"
            }
        elif k < -0.7:
            anomaly = {
                "type": "dangerous",
                "target": node_id,
                "value": k,
                "message": f"{node_id} 위험 상태 진입"
            }
        
        if anomaly:
            self.anomalies.append(anomaly)
            await ki_manager.broadcast(create_message(MessageType.ANOMALY, anomaly))
            await ki_manager.broadcast(create_message(MessageType.PHASE_CHANGE, {
                "index_type": "K",
                "target": node_id,
                "phase": phase,
                "value": k
            }))
    
    # I-지수
    def get_i(self, node_a: str, node_b: str) -> Optional[dict]:
        return self.interactions.get(self._pair_key(node_a, node_b))
    
    async def set_i(self, node_a: str, node_b: str, i_index: float, phase: str, interaction: Optional[str] = None):
        key = self._pair_key(node_a, node_b)
        old = self.interactions.get(key, {}).get("i_index", 0)
        
        self.interactions[key] = {
            "node_a": node_a,
            "node_b": node_b,
            "i_index": i_index,
            "phase": phase,
            "last_interaction": interaction,
            "updated_at": datetime.now()
        }
        
        # 브로드캐스트
        await ki_manager.broadcast(create_message(MessageType.I_UPDATE, {
            "node_a": node_a,
            "node_b": node_b,
            "i_before": old,
            "i_after": i_index,
            "delta_i": i_index - old,
            "phase": phase,
            "interaction": interaction
        }))
        
        # 임계점 체크
        await self._check_i_phase(node_a, node_b, i_index, phase)
    
    async def _check_i_phase(self, a: str, b: str, i: float, phase: str):
        anomaly = None
        
        if i > 0.7:
            anomaly = {
                "type": "synergy",
                "target": [a, b],
                "value": i,
                "message": f"{a} ↔ {b} 시너지 폭발"
            }
        elif i < -0.7:
            anomaly = {
                "type": "destructive",
                "target": [a, b],
                "value": i,
                "message": f"{a} ↔ {b} 자멸 궤도 진입"
            }
        
        if anomaly:
            self.anomalies.append(anomaly)
            await ki_manager.broadcast(create_message(MessageType.ANOMALY, anomaly))
            await ki_manager.broadcast(create_message(MessageType.PHASE_CHANGE, {
                "index_type": "I",
                "target": [a, b],
                "phase": phase,
                "value": i
            }))
    
    # 스냅샷
    def get_snapshot(self) -> dict:
        return {
            "nodes": list(self.nodes.values()),
            "interactions": list(self.interactions.values()),
            "anomalies": self.anomalies[-20:]  # 최근 20개
        }


ki_store = KIStore()


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket 라우터
# ═══════════════════════════════════════════════════════════════════════════════

ki_ws_router = APIRouter(tags=["K/I WebSocket"])


@ki_ws_router.websocket("/ws/ki")
async def websocket_ki(websocket: WebSocket):
    """K/I 실시간 WebSocket"""
    await ki_manager.connect(websocket)
    
    try:
        # 연결 시 현재 상태 스냅샷 전송
        snapshot = ki_store.get_snapshot()
        await ki_manager.send_to(websocket, create_message(MessageType.SNAPSHOT, snapshot))
        
        # 메시지 수신 대기
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # 클라이언트 요청 처리
            if msg.get("action") == "get_snapshot":
                await ki_manager.send_to(websocket, create_message(
                    MessageType.SNAPSHOT, ki_store.get_snapshot()
                ))
            
            elif msg.get("action") == "subscribe_node":
                # 특정 노드 구독 (확장용)
                pass
    
    except WebSocketDisconnect:
        await ki_manager.disconnect(websocket)
    except Exception as e:
        print(f"[K/I WS] Error: {e}")
        await ki_manager.disconnect(websocket)


# ═══════════════════════════════════════════════════════════════════════════════
# Heartbeat (연결 유지)
# ═══════════════════════════════════════════════════════════════════════════════

async def ki_heartbeat_task():
    """30초마다 heartbeat 브로드캐스트"""
    while True:
        await asyncio.sleep(30)
        await ki_manager.broadcast(create_message(MessageType.HEARTBEAT, {
            "active_connections": len(ki_manager.active_connections),
            "nodes_count": len(ki_store.nodes),
            "interactions_count": len(ki_store.interactions)
        }))


async def init_ki_demo_data():
    """데모 데이터 초기화"""
    # K-지수
    await ki_store.set_k("User_A", 0.72, "임계점 접근", "약속 이행")
    await ki_store.set_k("User_B", -0.45, "정상", "책임 회피")
    await ki_store.set_k("Corp_X", -0.82, "위험 상태", "배신")
    await ki_store.set_k("Team_Alpha", 0.91, "폭발 성장", "자발적 도움")
    await ki_store.set_k("Partner_Y", 0.33, "정상", "투명한 소통")
    
    # I-지수
    await ki_store.set_i("User_A", "User_B", 0.45, "정상", "협력 성공")
    await ki_store.set_i("User_A", "Corp_X", -0.72, "자멸 궤도", "배신")
    await ki_store.set_i("User_B", "Corp_X", -0.38, "정상", "갈등")
    await ki_store.set_i("Team_Alpha", "Partner_Y", 0.78, "시너지 폭발", "윈윈")
    await ki_store.set_i("User_A", "Team_Alpha", 0.55, "임계점 접근", "신뢰 구축")


# ═══════════════════════════════════════════════════════════════════════════════
# REST API (K/I 엔진과 연동)
# ═══════════════════════════════════════════════════════════════════════════════

ki_http_router = APIRouter(prefix="/api/ki", tags=["K/I Physics"])


class ActionInput(BaseModel):
    node_id: str
    action_type: str
    context: str = ""
    magnitude: float = 1.0


class InteractionInput(BaseModel):
    node_a: str
    node_b: str
    interaction_type: str
    context: str = ""
    magnitude: float = 1.0


class KSetInput(BaseModel):
    k_index: float
    phase: str = "정상"


class ISetInput(BaseModel):
    i_index: float
    phase: str = "정상"


@ki_http_router.post("/action")
async def record_action(input: ActionInput):
    """행동 기록 → K 변화 → WebSocket 브로드캐스트"""
    # 실제로는 K/I 엔진 호출
    # 여기서는 간단히 K 변화 시뮬레이션
    current = ki_store.nodes.get(input.node_id, {}).get("k_index", 0)
    
    # 간단한 K 변화 계산 (실제로는 엔진 사용)
    action_scores = {
        "promise_kept": 0.3,
        "voluntary_help": 0.4,
        "betrayal": -0.8,
        "deception": -0.6
    }
    score = action_scores.get(input.action_type, 0)
    delta = 0.1 * score * input.magnitude * (1 - abs(current))
    new_k = max(-1, min(1, current + delta))
    
    # 임계점 체크
    phase = "정상"
    if new_k > 0.9: phase = "폭발 성장"
    elif new_k > 0.7: phase = "임계점 접근"
    elif new_k < -0.7: phase = "위험 상태"
    elif new_k < -0.5: phase = "임계점 접근"
    
    # 저장 & 브로드캐스트
    await ki_store.set_k(input.node_id, new_k, phase, input.action_type)
    
    return {"node_id": input.node_id, "k_before": current, "k_after": new_k, "phase": phase}


@ki_http_router.post("/interaction")
async def record_interaction(input: InteractionInput):
    """상호작용 기록 → I 변화 → WebSocket 브로드캐스트"""
    key = ki_store._pair_key(input.node_a, input.node_b)
    current = ki_store.interactions.get(key, {}).get("i_index", 0)
    
    # 간단한 I 변화 계산
    interaction_scores = {
        "cooperation_success": 0.4,
        "win_win": 0.5,
        "trust_build": 0.35,
        "betrayal": -0.7,
        "conflict_stuck": -0.3
    }
    score = interaction_scores.get(input.interaction_type, 0)
    
    # K 평균 가져오기
    k_a = ki_store.nodes.get(input.node_a, {}).get("k_index", 0)
    k_b = ki_store.nodes.get(input.node_b, {}).get("k_index", 0)
    k_factor = 1 + (k_a + k_b) / 4
    
    delta = 0.12 * score * input.magnitude * k_factor * (1 - abs(current))
    new_i = max(-1, min(1, current + delta))
    
    # 임계점 체크
    phase = "정상"
    if new_i > 0.7: phase = "시너지 폭발"
    elif new_i > 0.5: phase = "임계점 접근"
    elif new_i < -0.7: phase = "자멸 궤도"
    elif new_i < -0.5: phase = "임계점 접근"
    
    # 저장 & 브로드캐스트
    await ki_store.set_i(input.node_a, input.node_b, new_i, phase, input.interaction_type)
    
    return {"nodes": [input.node_a, input.node_b], "i_before": current, "i_after": new_i, "phase": phase}


@ki_http_router.post("/k/{node_id}/set")
async def set_k(node_id: str, input: KSetInput):
    """K 직접 설정 (Genesis 모드)"""
    await ki_store.set_k(node_id, input.k_index, input.phase, "manual_set")
    return {"node_id": node_id, "k_index": input.k_index, "phase": input.phase}


@ki_http_router.post("/i/{node_a}/{node_b}/set")
async def set_i(node_a: str, node_b: str, input: ISetInput):
    """I 직접 설정 (Genesis 모드)"""
    await ki_store.set_i(node_a, node_b, input.i_index, input.phase, "manual_set")
    return {"nodes": [node_a, node_b], "i_index": input.i_index, "phase": input.phase}


@ki_http_router.get("/snapshot")
async def get_snapshot():
    """현재 상태 스냅샷"""
    return ki_store.get_snapshot()


@ki_http_router.get("/anomalies")
async def get_anomalies():
    """이상 징후 목록"""
    return {"anomalies": ki_store.anomalies[-50:]}


@ki_http_router.get("/stats")
async def get_ki_stats():
    """K/I 통계"""
    return {
        "active_connections": len(ki_manager.active_connections),
        "nodes_count": len(ki_store.nodes),
        "interactions_count": len(ki_store.interactions),
        "anomalies_count": len(ki_store.anomalies)
    }
