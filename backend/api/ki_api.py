"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS K/I API 라우터
                    
    기존 ki_physics.py, slots_144.py, automation_loop.py 로직을 
    REST API로 노출
    
    엔드포인트:
    - GET  /ki/state/{entity_id}          현재 K/I 상태
    - GET  /ki/nodes/{entity_id}          48노드 상세
    - GET  /ki/slots/{entity_id}          144슬롯 상세
    - POST /ki/calculate                   K/I 재계산
    - GET  /ki/predict/{entity_id}        궤적 예측
    - GET  /ki/history/{entity_id}        K/I 히스토리
    
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import os

# 기존 물리 엔진 import
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from physics.ki_physics import (
        ActionType, InteractionType, PhaseState,
        ActionEvent, InteractionEvent
    )
except ImportError:
    # 기본 Enum 정의
    from enum import Enum
    class ActionType(Enum):
        CREATE = "create"
        UPDATE = "update"
        DELETE = "delete"
    class InteractionType(Enum):
        SYNC = "sync"
        ASYNC = "async"
    class PhaseState(Enum):
        NORMAL = "normal"
        CRITICAL = "critical"
    ActionEvent = None
    InteractionEvent = None
from physics.slots_144 import RelationType, MAX_SLOTS_PER_TYPE, TOTAL_ORBITAL_SLOTS

router = APIRouter(prefix="/ki", tags=["K/I Physics"])


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════════════════════

class EntityType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    STARTUP = "STARTUP"
    SMB = "SMB"
    ENTERPRISE = "ENTERPRISE"
    CITY = "CITY"
    NATION = "NATION"


class NodeValue(BaseModel):
    """48노드 값"""
    id: str
    domain: str
    node_type: str  # A, D, E
    value: float = Field(ge=-1, le=1)
    delta: float = 0.0
    label: str = ""
    meta_category: str = ""


class SlotValue(BaseModel):
    """144슬롯 값"""
    id: str
    type: str  # RelationType
    slot_index: int = Field(ge=0, lt=12)
    source: str = ""
    target: str = ""
    strength: float = Field(ge=0, le=1, default=0)
    i_score: float = Field(ge=-1, le=1, default=0)
    is_empty: bool = True
    last_interaction: Optional[datetime] = None


class EntityStateResponse(BaseModel):
    """엔티티 상태 응답"""
    entity_id: str
    entity_type: EntityType
    k: float = Field(ge=-1, le=1)
    i: float = Field(ge=-1, le=1)
    dk_dt: float = 0.0
    di_dt: float = 0.0
    omega: float = Field(ge=0, le=1, default=0.15)
    phase: str = "NORMAL"
    updated_at: datetime


class NodesResponse(BaseModel):
    """48노드 응답"""
    entity_id: str
    total_nodes: int = 48
    meta_categories: List[str]
    domains: List[str]
    nodes: List[NodeValue]
    k_calculated: float


class SlotsResponse(BaseModel):
    """144슬롯 응답"""
    entity_id: str
    total_slots: int = 144
    relation_types: List[str]
    slots: List[SlotValue]
    i_calculated: float
    fill_rate: float


class PredictionPoint(BaseModel):
    """예측 포인트"""
    day: int
    k: float
    i: float
    confidence: float


class PredictionResponse(BaseModel):
    """궤적 예측 응답"""
    entity_id: str
    current_k: float
    current_i: float
    dk_dt: float
    di_dt: float
    predictions: List[PredictionPoint]
    warning: Optional[str] = None


class CalculateRequest(BaseModel):
    """K/I 계산 요청"""
    entity_id: str
    node_values: Optional[Dict[str, float]] = None
    slot_values: Optional[Dict[str, float]] = None


class CalculateResponse(BaseModel):
    """K/I 계산 응답"""
    entity_id: str
    k: float
    i: float
    dk_dt: float
    di_dt: float
    phase: str
    details: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════════
# 48노드 정의 로드
# ═══════════════════════════════════════════════════════════════════════════════

def load_48nodes_definition():
    """48노드 정의 JSON 로드"""
    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "core", "autus_48nodes.json"
    )
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None

NODES_48_DEF = load_48nodes_definition()


# ═══════════════════════════════════════════════════════════════════════════════
# 메모리 저장소 (실제 환경에서는 DB로 대체)
# ═══════════════════════════════════════════════════════════════════════════════

_entity_states: Dict[str, Dict] = {}
_entity_nodes: Dict[str, Dict[str, float]] = {}
_entity_slots: Dict[str, Dict[str, Dict]] = {}


def get_or_create_entity(entity_id: str, entity_type: EntityType = EntityType.INDIVIDUAL):
    """엔티티 상태 조회 또는 생성"""
    if entity_id not in _entity_states:
        # 초기 상태 생성
        _entity_states[entity_id] = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "k": 0.0,
            "i": 0.0,
            "dk_dt": 0.0,
            "di_dt": 0.0,
            "omega": 0.15,
            "phase": "NORMAL",
            "updated_at": datetime.now(),
        }
        
        # 48노드 초기화
        _entity_nodes[entity_id] = {}
        if NODES_48_DEF:
            for domain_id, domain_info in NODES_48_DEF.get("domains", {}).items():
                for node_type in ["A", "D", "E"]:
                    node_id = f"{domain_id}_{node_type}"
                    _entity_nodes[entity_id][node_id] = 0.0
        
        # 144슬롯 초기화
        _entity_slots[entity_id] = {}
        for rel_type in RelationType:
            for i in range(MAX_SLOTS_PER_TYPE):
                slot_id = f"{rel_type.name}_{i}"
                _entity_slots[entity_id][slot_id] = {
                    "type": rel_type.name,
                    "slot_index": i,
                    "source": entity_id,
                    "target": "",
                    "strength": 0.0,
                    "i_score": 0.0,
                    "is_empty": True,
                    "last_interaction": None,
                }
    
    return _entity_states[entity_id]


# ═══════════════════════════════════════════════════════════════════════════════
# K/I 계산 로직
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_k_from_nodes(entity_id: str) -> float:
    """48노드에서 K 계산"""
    nodes = _entity_nodes.get(entity_id, {})
    if not nodes:
        return 0.0
    
    # 도메인별 가중치 (실제로는 더 복잡한 로직)
    total = sum(nodes.values())
    count = len(nodes) if nodes else 1
    
    return max(-1, min(1, total / count))


def calculate_i_from_slots(entity_id: str) -> float:
    """144슬롯에서 I 계산"""
    slots = _entity_slots.get(entity_id, {})
    if not slots:
        return 0.0
    
    total_i = 0.0
    filled_count = 0
    
    for slot_id, slot in slots.items():
        if not slot.get("is_empty", True):
            total_i += slot.get("i_score", 0.0) * slot.get("strength", 1.0)
            filled_count += 1
    
    if filled_count == 0:
        return 0.0
    
    return max(-1, min(1, total_i / filled_count))


def determine_phase(k: float, i: float) -> str:
    """임계점 상태 판별"""
    if k > 0.9:
        return "EXPLOSIVE"
    if k < -0.7:
        return "DANGEROUS"
    if i > 0.7:
        return "SYNERGY"
    if i < -0.7:
        return "DESTRUCTIVE"
    if abs(k) > 0.6 or abs(i) > 0.6:
        return "CRITICAL"
    return "NORMAL"


# ═══════════════════════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/state/{entity_id}", response_model=EntityStateResponse)
async def get_entity_state(
    entity_id: str,
    entity_type: EntityType = Query(default=EntityType.INDIVIDUAL)
):
    """
    엔티티의 현재 K/I 상태 조회
    
    - **entity_id**: 엔티티 고유 ID
    - **entity_type**: 엔티티 유형 (INDIVIDUAL, STARTUP, SMB, ENTERPRISE, CITY, NATION)
    """
    state = get_or_create_entity(entity_id, entity_type)
    
    # K/I 재계산
    state["k"] = calculate_k_from_nodes(entity_id)
    state["i"] = calculate_i_from_slots(entity_id)
    state["phase"] = determine_phase(state["k"], state["i"])
    state["updated_at"] = datetime.now()
    
    return EntityStateResponse(**state)


@router.get("/nodes/{entity_id}", response_model=NodesResponse)
async def get_entity_nodes(entity_id: str):
    """
    엔티티의 48노드 상세 조회
    
    4 메타카테고리 × 4 도메인 × 3 노드타입(A/D/E) = 48노드
    """
    get_or_create_entity(entity_id)
    nodes_data = _entity_nodes.get(entity_id, {})
    
    # 노드 목록 생성
    nodes_list = []
    meta_categories = set()
    domains = set()
    
    if NODES_48_DEF:
        for domain_id, domain_info in NODES_48_DEF.get("domains", {}).items():
            meta = domain_info.get("meta", "")
            meta_categories.add(meta)
            domains.add(domain_id)
            
            for node_type in ["A", "D", "E"]:
                node_id = f"{domain_id}_{node_type}"
                value = nodes_data.get(node_id, 0.0)
                
                type_info = NODES_48_DEF.get("node_types", {}).get(node_type, {})
                
                nodes_list.append(NodeValue(
                    id=node_id,
                    domain=domain_id,
                    node_type=node_type,
                    value=value,
                    delta=0.0,
                    label=f"{domain_info.get('name', domain_id)} - {type_info.get('name_ko', node_type)}",
                    meta_category=meta,
                ))
    
    k_calculated = calculate_k_from_nodes(entity_id)
    
    return NodesResponse(
        entity_id=entity_id,
        total_nodes=len(nodes_list),
        meta_categories=list(meta_categories),
        domains=list(domains),
        nodes=nodes_list,
        k_calculated=k_calculated,
    )


@router.get("/slots/{entity_id}", response_model=SlotsResponse)
async def get_entity_slots(entity_id: str):
    """
    엔티티의 144슬롯 상세 조회
    
    12 관계유형 × 12 슬롯 = 144슬롯
    """
    get_or_create_entity(entity_id)
    slots_data = _entity_slots.get(entity_id, {})
    
    # 슬롯 목록 생성
    slots_list = []
    relation_types = [rt.name for rt in RelationType]
    filled_count = 0
    
    for slot_id, slot in slots_data.items():
        if not slot.get("is_empty", True):
            filled_count += 1
        
        slots_list.append(SlotValue(
            id=slot_id,
            type=slot.get("type", ""),
            slot_index=slot.get("slot_index", 0),
            source=slot.get("source", ""),
            target=slot.get("target", ""),
            strength=slot.get("strength", 0.0),
            i_score=slot.get("i_score", 0.0),
            is_empty=slot.get("is_empty", True),
            last_interaction=slot.get("last_interaction"),
        ))
    
    i_calculated = calculate_i_from_slots(entity_id)
    fill_rate = filled_count / TOTAL_ORBITAL_SLOTS if TOTAL_ORBITAL_SLOTS > 0 else 0
    
    return SlotsResponse(
        entity_id=entity_id,
        total_slots=TOTAL_ORBITAL_SLOTS,
        relation_types=relation_types,
        slots=slots_list,
        i_calculated=i_calculated,
        fill_rate=fill_rate,
    )


@router.post("/calculate", response_model=CalculateResponse)
async def calculate_ki(request: CalculateRequest):
    """
    K/I 재계산
    
    노드/슬롯 값을 업데이트하고 K/I를 재계산
    """
    entity_id = request.entity_id
    get_or_create_entity(entity_id)
    
    # 노드 업데이트
    if request.node_values:
        for node_id, value in request.node_values.items():
            if node_id in _entity_nodes.get(entity_id, {}):
                _entity_nodes[entity_id][node_id] = max(-1, min(1, value))
    
    # 슬롯 업데이트
    if request.slot_values:
        for slot_id, value in request.slot_values.items():
            if slot_id in _entity_slots.get(entity_id, {}):
                _entity_slots[entity_id][slot_id]["i_score"] = max(-1, min(1, value))
                if value != 0:
                    _entity_slots[entity_id][slot_id]["is_empty"] = False
    
    # 재계산
    k = calculate_k_from_nodes(entity_id)
    i = calculate_i_from_slots(entity_id)
    phase = determine_phase(k, i)
    
    # 상태 업데이트
    old_k = _entity_states[entity_id].get("k", 0)
    old_i = _entity_states[entity_id].get("i", 0)
    
    _entity_states[entity_id]["k"] = k
    _entity_states[entity_id]["i"] = i
    _entity_states[entity_id]["dk_dt"] = k - old_k
    _entity_states[entity_id]["di_dt"] = i - old_i
    _entity_states[entity_id]["phase"] = phase
    _entity_states[entity_id]["updated_at"] = datetime.now()
    
    return CalculateResponse(
        entity_id=entity_id,
        k=k,
        i=i,
        dk_dt=k - old_k,
        di_dt=i - old_i,
        phase=phase,
        details={
            "nodes_updated": len(request.node_values or {}),
            "slots_updated": len(request.slot_values or {}),
        }
    )


@router.get("/predict/{entity_id}", response_model=PredictionResponse)
async def predict_trajectory(
    entity_id: str,
    days: int = Query(default=30, ge=1, le=365)
):
    """
    궤적 예측 (0~365일)
    
    현재 K/I와 변화율(dk/dt, di/dt)을 기반으로 미래 예측
    신뢰도는 시간이 지날수록 감소
    """
    state = get_or_create_entity(entity_id)
    
    k = state["k"]
    i = state["i"]
    dk_dt = state.get("dk_dt", 0.001)  # 기본 미세 변화
    di_dt = state.get("di_dt", 0.001)
    
    predictions = []
    warning = None
    
    for day in range(1, days + 1):
        # 간단한 선형 예측 + 감쇠
        decay = 0.99 ** day  # 시간에 따른 감쇠
        
        pred_k = max(-1, min(1, k + dk_dt * day * decay))
        pred_i = max(-1, min(1, i + di_dt * day * decay))
        
        # 신뢰도: 시간이 지날수록 감소
        confidence = max(0.1, 1.0 - (day / days) * 0.8)
        
        predictions.append(PredictionPoint(
            day=day,
            k=round(pred_k, 4),
            i=round(pred_i, 4),
            confidence=round(confidence, 3),
        ))
        
        # 경고 체크
        if pred_k < -0.7 and not warning:
            warning = f"Day {day}: K-지수가 위험 구간(-0.7) 진입 예상"
        if pred_i < -0.7 and not warning:
            warning = f"Day {day}: I-지수가 자멸 궤도(-0.7) 진입 예상"
    
    return PredictionResponse(
        entity_id=entity_id,
        current_k=k,
        current_i=i,
        dk_dt=dk_dt,
        di_dt=di_dt,
        predictions=predictions,
        warning=warning,
    )


@router.get("/history/{entity_id}")
async def get_ki_history(
    entity_id: str,
    days: int = Query(default=30, ge=1, le=365)
):
    """
    K/I 히스토리 조회 (최근 N일)
    
    실제 환경에서는 DB에서 조회
    """
    # 데모용 히스토리 생성
    state = get_or_create_entity(entity_id)
    k = state["k"]
    i = state["i"]
    
    history = []
    for day in range(days, 0, -1):
        # 과거 값 시뮬레이션 (실제로는 DB에서 조회)
        noise_k = (hash(f"{entity_id}_k_{day}") % 100 - 50) / 500
        noise_i = (hash(f"{entity_id}_i_{day}") % 100 - 50) / 500
        
        history.append({
            "date": (datetime.now() - timedelta(days=day)).isoformat(),
            "k": round(max(-1, min(1, k + noise_k)), 4),
            "i": round(max(-1, min(1, i + noise_i)), 4),
        })
    
    return {
        "entity_id": entity_id,
        "days": days,
        "history": history,
    }


@router.get("/phase-info")
async def get_phase_info():
    """
    임계점 상태 정보 조회
    """
    return {
        "phases": [
            {"id": "NORMAL", "name": "정상", "description": "안정적인 상태", "k_range": "[-0.6, 0.6]", "i_range": "[-0.6, 0.6]"},
            {"id": "SYNERGY", "name": "시너지 폭발", "description": "I > 0.7, 협력 극대화", "condition": "I > 0.7"},
            {"id": "DESTRUCTIVE", "name": "자멸 궤도", "description": "I < -0.7, 관계 붕괴", "condition": "I < -0.7"},
            {"id": "EXPLOSIVE", "name": "폭발 성장", "description": "K > 0.9, 급성장", "condition": "K > 0.9"},
            {"id": "DANGEROUS", "name": "위험 상태", "description": "K < -0.7, 급격한 하락", "condition": "K < -0.7"},
            {"id": "CRITICAL", "name": "임계점 접근", "description": "경계선 근처", "condition": "|K| > 0.6 or |I| > 0.6"},
        ]
    }


@router.get("/relation-types")
async def get_relation_types():
    """
    12가지 관계 유형 정보 조회
    """
    types = []
    for rt in RelationType:
        name, desc, i_range, direction, distance = rt.value
        types.append({
            "id": rt.name,
            "name": name,
            "description": desc,
            "i_range": {"min": i_range[0], "max": i_range[1]},
            "energy_direction": direction,
            "distance": distance,
        })
    
    return {
        "total_types": 12,
        "slots_per_type": MAX_SLOTS_PER_TYPE,
        "total_slots": TOTAL_ORBITAL_SLOTS,
        "types": types,
    }
