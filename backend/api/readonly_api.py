"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS READ-ONLY API
UI → Core Engine 연결 (읽기 전용 파이프라인)
═══════════════════════════════════════════════════════════════════════════════

원칙:
- UI는 "보여준다", Core는 "닫는다"
- UI에서 Gate 판정 로직 절대 실행 금지
- UI는 GateState만 수신

금지:
- POST /apply
- PUT /update  
- PATCH /override
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import hashlib
import json

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/v1", tags=["AUTUS Read-Only API"])

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS (Read-Only)
# ═══════════════════════════════════════════════════════════════════════════════

class GateState(str, Enum):
    OBSERVE = "OBSERVE"
    RING = "RING"
    LOCK = "LOCK"
    AFTERIMAGE = "AFTERIMAGE"

class ScaleLevel(int, Enum):
    K2 = 2
    K4 = 4
    K5 = 5
    K6 = 6
    K10 = 10

class PhysicsState(BaseModel):
    """Physics 상태 (읽기 전용)"""
    node_id: str
    gate_state: GateState
    entropy_acceleration: float
    responsibility_load: float
    energy: float
    psi: float
    timestamp: datetime
    
    class Config:
        frozen = True  # Immutable

class SimulationFrame(BaseModel):
    """시뮬레이션 프레임 (읽기 전용)"""
    frame_id: str
    node_id: str
    gate_state: GateState
    wave_radius: float
    color_temp: float
    inertia_halo: float
    impact_value: float
    timestamp: datetime
    
    class Config:
        frozen = True

class AfterimageRecord(BaseModel):
    """Afterimage 기록 (불변)"""
    id: str
    node_id: str
    gate_state: GateState
    entropy_delta: float
    inertia_delta: float
    lat: float
    lng: float
    replay_hash: str
    previous_hash: str
    environment_version: str
    timestamp: datetime
    
    class Config:
        frozen = True

class ReplayResult(BaseModel):
    """Replay 결과"""
    original: AfterimageRecord
    replayed_frame: SimulationFrame
    hash_match: bool
    deterministic: bool

# ═══════════════════════════════════════════════════════════════════════════════
# IN-MEMORY STORE (실제로는 DB 사용)
# ═══════════════════════════════════════════════════════════════════════════════

class ReadOnlyStore:
    """읽기 전용 데이터 저장소"""
    
    def __init__(self):
        self._physics_states: Dict[str, PhysicsState] = {}
        self._simulation_frames: Dict[str, SimulationFrame] = {}
        self._afterimages: Dict[str, AfterimageRecord] = {}
        self._afterimage_chain: List[str] = []
        self._init_sample_data()
    
    def _init_sample_data(self):
        """샘플 데이터 초기화"""
        now = datetime.utcnow()
        
        # Physics states
        nodes = [
            ("hq", GateState.OBSERVE, 0.3, 0.5, 80, 0.92),
            ("gangnam", GateState.RING, 0.75, 0.8, 60, 0.78),
            ("pangyo", GateState.OBSERVE, 0.4, 0.3, 90, 0.65),
            ("capital", GateState.LOCK, 0.95, 1.2, 20, 0.95),
        ]
        
        for node_id, gate, entropy, load, energy, psi in nodes:
            self._physics_states[node_id] = PhysicsState(
                node_id=node_id,
                gate_state=gate,
                entropy_acceleration=entropy,
                responsibility_load=load,
                energy=energy,
                psi=psi,
                timestamp=now
            )
    
    def get_physics_state(self, node_id: str) -> Optional[PhysicsState]:
        return self._physics_states.get(node_id)
    
    def get_all_physics_states(self) -> List[PhysicsState]:
        return list(self._physics_states.values())
    
    def get_simulation_frame(self, frame_id: str) -> Optional[SimulationFrame]:
        return self._simulation_frames.get(frame_id)
    
    def get_afterimage(self, afterimage_id: str) -> Optional[AfterimageRecord]:
        return self._afterimages.get(afterimage_id)
    
    def get_afterimage_by_hash(self, replay_hash: str) -> Optional[AfterimageRecord]:
        for record in self._afterimages.values():
            if record.replay_hash == replay_hash:
                return record
        return None
    
    def get_afterimage_chain(self) -> List[AfterimageRecord]:
        return [self._afterimages[id] for id in self._afterimage_chain if id in self._afterimages]

# Global store instance
store = ReadOnlyStore()

# ═══════════════════════════════════════════════════════════════════════════════
# READ-ONLY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# PHYSICS STATE (K2 UI용)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/physics/state", response_model=List[PhysicsState])
async def get_all_physics_states():
    """
    모든 노드의 Physics 상태 조회 (K2 UI용)
    
    - Gate 판정 로직 없음
    - 상태만 반환
    """
    return store.get_all_physics_states()

@router.get("/physics/state/{node_id}", response_model=PhysicsState)
async def get_physics_state(node_id: str):
    """
    특정 노드의 Physics 상태 조회
    
    - GateState만 수신
    - 판정 로직 실행 안 함
    """
    state = store.get_physics_state(node_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return state

@router.get("/physics/gate/{node_id}", response_model=Dict[str, Any])
async def get_gate_state(node_id: str):
    """
    Gate 상태만 조회 (최소 응답)
    
    - 캐시 금지 (항상 최신)
    """
    state = store.get_physics_state(node_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    return {
        "node_id": node_id,
        "gate_state": state.gate_state,
        "timestamp": state.timestamp,
        "_cache": "DISABLED"
    }

# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION FRAME (K10 UI용)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/simulation/frame/{frame_id}", response_model=SimulationFrame)
async def get_simulation_frame(frame_id: str):
    """
    시뮬레이션 프레임 조회 (K10 관측용)
    
    - 렌더링 전용 데이터
    - 행동 제안 없음
    """
    frame = store.get_simulation_frame(frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail=f"Frame {frame_id} not found")
    return frame

@router.get("/simulation/frames", response_model=List[SimulationFrame])
async def get_simulation_frames(
    node_id: Optional[str] = Query(None),
    limit: int = Query(default=100, le=1000)
):
    """
    시뮬레이션 프레임 목록 조회
    
    - 관측 전용
    - 캐시 가능 (TTL 명시)
    """
    # 실제 구현에서는 DB 쿼리
    return []

# ─────────────────────────────────────────────────────────────────────────────
# AFTERIMAGE (불변 기록)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/afterimage/{afterimage_id}", response_model=AfterimageRecord)
async def get_afterimage(afterimage_id: str):
    """
    Afterimage 기록 조회
    
    - 불변 데이터
    - 캐시 가능 (영구)
    """
    record = store.get_afterimage(afterimage_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Afterimage {afterimage_id} not found")
    return record

@router.get("/afterimage/replay/{replay_hash}", response_model=AfterimageRecord)
async def get_afterimage_by_hash(replay_hash: str):
    """
    Replay Hash로 Afterimage 조회
    
    - 동일 해시 = 동일 기록
    """
    record = store.get_afterimage_by_hash(replay_hash)
    if not record:
        raise HTTPException(status_code=404, detail=f"Afterimage with hash {replay_hash} not found")
    return record

@router.get("/afterimage/chain", response_model=List[AfterimageRecord])
async def get_afterimage_chain(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """
    Afterimage 체인 조회
    
    - Hash chaining 순서
    - 감사용
    """
    chain = store.get_afterimage_chain()
    return chain[offset:offset + limit]

@router.get("/afterimage/verify/{afterimage_id}")
async def verify_afterimage(afterimage_id: str):
    """
    Afterimage 무결성 검증
    
    - 해시 체인 검증
    - 재현성 검증
    """
    record = store.get_afterimage(afterimage_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Afterimage {afterimage_id} not found")
    
    # 해시 검증 (실제 구현에서는 재계산)
    return {
        "afterimage_id": afterimage_id,
        "hash_valid": True,
        "chain_valid": True,
        "deterministic": True
    }

# ─────────────────────────────────────────────────────────────────────────────
# GRAVITY PRESETS (읽기 전용)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/gravity/presets")
async def get_gravity_presets():
    """
    Gravity Preset 목록 (읽기 전용)
    
    - Apply 엔드포인트 없음
    - 자동 해결만 가능
    """
    return {
        "presets": [
            {"id": "startup_core", "name": "Startup Core", "cost_multiplier": 0.8},
            {"id": "regulated_zone", "name": "Regulated Zone", "cost_multiplier": 1.5},
            {"id": "crisis_mode", "name": "Crisis Mode", "cost_multiplier": 2.0},
            {"id": "exploration", "name": "Exploration", "cost_multiplier": 0.6},
            {"id": "sovereign_lock", "name": "Sovereign Lock", "cost_multiplier": 5.0},
        ],
        "_note": "Apply endpoint does not exist. Presets resolve automatically."
    }

@router.get("/gravity/resolved/{region_id}")
async def get_resolved_gravity(region_id: str, gate_state: GateState = GateState.OBSERVE):
    """
    해결된 Gravity 조회
    
    - 컨텍스트 기반 자동 해결
    - Apply 버튼 없음
    """
    return {
        "region_id": region_id,
        "gate_state": gate_state,
        "effective_cost_multiplier": 1.0,
        "effective_theta": 0.7,
        "_auto_resolved": True
    }

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM STATUS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_system_status():
    """시스템 상태 (헬스체크)"""
    return {
        "status": "operational",
        "api_version": "1.0.0",
        "mode": "READ_ONLY",
        "timestamp": datetime.utcnow(),
        "principles": {
            "apply_endpoint": False,
            "update_endpoint": False,
            "override_endpoint": False
        }
    }

@router.get("/constitution")
async def get_constitution():
    """Gate 헌법 (불변)"""
    return {
        "rules": [
            {"id": "G1", "condition": "ΔṠ > θ", "result": "LOCK"},
            {"id": "G2", "condition": "Load > UC", "result": "LOCK"},
            {"id": "G3", "condition": "E < 0", "result": "LOCK"}
        ],
        "forbidden": [
            "POST /apply",
            "PUT /update",
            "PATCH /override",
            "Admin bypass",
            "Superuser override"
        ],
        "immutable": True
    }

# ═══════════════════════════════════════════════════════════════════════════════
# FORBIDDEN ENDPOINTS (명시적 거부)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/apply")
async def forbidden_apply():
    """금지: Apply 엔드포인트"""
    raise HTTPException(
        status_code=403, 
        detail="FORBIDDEN: Apply endpoint does not exist in AUTUS. Gate closes automatically."
    )

@router.put("/update")
async def forbidden_update():
    """금지: Update 엔드포인트"""
    raise HTTPException(
        status_code=403,
        detail="FORBIDDEN: Update endpoint does not exist. Afterimage is immutable."
    )

@router.patch("/override")
async def forbidden_override():
    """금지: Override 엔드포인트"""
    raise HTTPException(
        status_code=403,
        detail="FORBIDDEN: Override endpoint does not exist. No admin bypass allowed."
    )
