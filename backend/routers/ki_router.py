# ═══════════════════════════════════════════════════════════════════════════════
#
#                     AUTUS K/I API 라우터
#                     
#                     기존 로직을 REST API로 노출
#                     - ki_physics.py
#                     - slots_144.py  
#                     - autus_48nodes.json
#                     - automation_loop.py
#                     - pure_trajectory.py
#
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timedelta
from enum import Enum
import json
import asyncio

# 기존 로직 임포트 (실제 경로에 맞게 조정)
# from physics.ki_physics import KIPhysicsEngine
# from physics.slots_144 import Slots144Manager
# from physics.pure_trajectory import TrajectoryPredictor
# from core.autus_48nodes import Nodes48Manager
# from v4.automation_loop import DAROEAutomation

router = APIRouter(prefix="/api/ki", tags=["K/I Physics"])


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic 모델 정의
# ═══════════════════════════════════════════════════════════════════════════════

class KIState(BaseModel):
    """K/I 현재 상태"""
    entity_id: str
    k_index: float = Field(..., ge=-1.0, le=1.0, description="K-지수 (-1 ~ +1)")
    i_index: float = Field(..., ge=-1.0, le=1.0, description="I-지수 (-1 ~ +1)")
    dk_dt: float = Field(..., description="K 변화율 (per day)")
    di_dt: float = Field(..., description="I 변화율 (per day)")
    phase: Literal["GROWTH", "STABLE", "DECLINE", "CRISIS"] = Field(..., description="현재 페이즈")
    last_updated: datetime
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도")


class Node48Value(BaseModel):
    """48노드 개별 값"""
    node_id: str  # e.g., "CASH_A", "TIME_D"
    meta: Literal["RESOURCE", "RELATION", "ACTION", "FLOW"]
    domain: Literal["SURVIVE", "GROW", "RELATE", "EXPRESS"]
    type: Literal["A", "D", "E"]  # Asset, Delta, Efficiency
    value: float = Field(..., ge=-1.0, le=1.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    trend: Literal["UP", "DOWN", "STABLE"]
    last_updated: datetime


class Nodes48Response(BaseModel):
    """48노드 전체 응답"""
    entity_id: str
    nodes: List[Node48Value]
    k_index: float
    domain_scores: Dict[str, float]  # SURVIVE, GROW, RELATE, EXPRESS 각 점수


class Slot144Value(BaseModel):
    """144슬롯 개별 값"""
    slot_id: str  # e.g., "FAMILY_001", "COLLEAGUE_003"
    relation_type: str  # 12 types: FAMILY, COLLEAGUE, PARTNER, etc.
    slot_number: int  # 1-12 within type
    entity_name: Optional[str]
    i_score: float = Field(..., ge=-1.0, le=1.0)
    interaction_count: int
    last_interaction: Optional[datetime]
    fill_status: Literal["FILLED", "EMPTY", "PARTIAL"]


class Slots144Response(BaseModel):
    """144슬롯 전체 응답"""
    entity_id: str
    slots: List[Slot144Value]
    i_index: float
    fill_rate: float  # 채워진 비율
    type_distribution: Dict[str, int]  # 유형별 채워진 개수


class TrajectoryPoint(BaseModel):
    """궤적 예측 포인트"""
    timestamp: datetime
    k_predicted: float
    i_predicted: float
    k_lower: float  # 신뢰구간 하한
    k_upper: float  # 신뢰구간 상한
    i_lower: float
    i_upper: float
    confidence: float


class PredictionResponse(BaseModel):
    """궤적 예측 응답"""
    entity_id: str
    current: KIState
    trajectory: List[TrajectoryPoint]
    horizon_days: int
    predicted_phase: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    key_factors: List[str]


class AutomationTask(BaseModel):
    """자동화 태스크"""
    task_id: str
    entity_id: str
    stage: Literal["DISCOVERY", "ANALYSIS", "REDESIGN", "OPTIMIZATION", "ELIMINATION"]
    status: Literal["PENDING", "APPROVED", "REJECTED", "EXECUTING", "COMPLETED", "FAILED"]
    title: str
    description: str
    impact_k: float  # 예상 K 영향
    impact_i: float  # 예상 I 영향
    confidence: float
    created_at: datetime
    deadline: Optional[datetime]
    auto_approve: bool = False


class Alert(BaseModel):
    """경고"""
    alert_id: str
    entity_id: str
    severity: Literal["INFO", "WARNING", "CRITICAL", "EMERGENCY"]
    category: str  # K_DECLINE, I_IMBALANCE, NODE_CRITICAL, etc.
    title: str
    message: str
    triggered_at: datetime
    acknowledged: bool = False
    resolved: bool = False
    related_nodes: List[str]


class CalculateRequest(BaseModel):
    """K/I 계산 요청"""
    entity_id: str
    node_updates: Optional[Dict[str, float]] = None  # 노드별 값 업데이트
    slot_updates: Optional[Dict[str, float]] = None  # 슬롯별 값 업데이트
    recalculate_all: bool = False


class ApproveRequest(BaseModel):
    """자동화 승인 요청"""
    task_id: str
    approved: bool
    comment: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════

# -----------------------------------------------------------------------------
# K/I 상태 조회
# -----------------------------------------------------------------------------

@router.get("/state/{entity_id}", response_model=KIState)
async def get_ki_state(entity_id: str):
    """
    K/I 현재 상태 조회
    
    Returns:
        - k_index: 현재 K-지수 (-1 ~ +1)
        - i_index: 현재 I-지수 (-1 ~ +1)  
        - dk_dt: K 변화율
        - di_dt: I 변화율
        - phase: 현재 페이즈 (GROWTH/STABLE/DECLINE/CRISIS)
    """
    # TODO: 실제 구현 - ki_physics.py의 calculate_state() 호출
    # engine = KIPhysicsEngine()
    # state = await engine.get_current_state(entity_id)
    
    # 임시 목업 데이터
    return KIState(
        entity_id=entity_id,
        k_index=0.423,
        i_index=0.518,
        dk_dt=-0.012,
        di_dt=0.003,
        phase="STABLE",
        last_updated=datetime.now(),
        confidence=0.85
    )


@router.get("/state/{entity_id}/history")
async def get_ki_history(
    entity_id: str,
    days: int = Query(30, ge=1, le=365),
    interval: Literal["hour", "day", "week"] = "day"
):
    """
    K/I 히스토리 조회
    
    Args:
        days: 조회 기간 (일)
        interval: 집계 단위
    """
    # TODO: 실제 구현 - DB에서 히스토리 조회
    return {
        "entity_id": entity_id,
        "interval": interval,
        "data": [
            {"timestamp": datetime.now() - timedelta(days=i), "k": 0.4 + i*0.01, "i": 0.5 - i*0.005}
            for i in range(days)
        ]
    }


# -----------------------------------------------------------------------------
# 48노드 조회/관리
# -----------------------------------------------------------------------------

@router.get("/nodes/{entity_id}", response_model=Nodes48Response)
async def get_nodes_48(entity_id: str):
    """
    48노드 전체 조회
    
    구조:
        - 4 META: RESOURCE, RELATION, ACTION, FLOW
        - 4 DOMAIN: SURVIVE, GROW, RELATE, EXPRESS  
        - 3 TYPE: A(Asset), D(Delta), E(Efficiency)
        - 총 4×4×3 = 48노드
    """
    # TODO: 실제 구현 - autus_48nodes.json 로드 + DB 값 조합
    # manager = Nodes48Manager()
    # nodes = await manager.get_all_nodes(entity_id)
    
    # 임시 목업
    sample_nodes = []
    metas = ["RESOURCE", "RELATION", "ACTION", "FLOW"]
    domains = ["SURVIVE", "GROW", "RELATE", "EXPRESS"]
    types = ["A", "D", "E"]
    
    for meta in metas:
        for domain in domains:
            for t in types:
                node_id = f"{domain[:4]}_{t}"
                sample_nodes.append(Node48Value(
                    node_id=node_id,
                    meta=meta,
                    domain=domain,
                    type=t,
                    value=0.5,
                    weight=0.25,
                    trend="STABLE",
                    last_updated=datetime.now()
                ))
    
    return Nodes48Response(
        entity_id=entity_id,
        nodes=sample_nodes[:48],  # 48개만
        k_index=0.423,
        domain_scores={
            "SURVIVE": 0.65,
            "GROW": 0.42,
            "RELATE": 0.38,
            "EXPRESS": 0.31
        }
    )


@router.get("/nodes/{entity_id}/{node_id}")
async def get_node_detail(entity_id: str, node_id: str):
    """
    개별 노드 상세 조회
    
    Args:
        node_id: 노드 ID (예: "CASH_A", "TIME_D", "NETWORK_E")
    """
    # TODO: 실제 구현
    return {
        "entity_id": entity_id,
        "node_id": node_id,
        "value": 0.5,
        "history": [],
        "contributing_sources": []
    }


@router.patch("/nodes/{entity_id}/{node_id}")
async def update_node_value(entity_id: str, node_id: str, value: float = Query(..., ge=-1.0, le=1.0)):
    """
    노드 값 수동 업데이트
    """
    # TODO: 실제 구현 - 값 업데이트 + K 재계산
    return {"status": "updated", "node_id": node_id, "new_value": value}


# -----------------------------------------------------------------------------
# 144슬롯 조회/관리
# -----------------------------------------------------------------------------

@router.get("/slots/{entity_id}", response_model=Slots144Response)
async def get_slots_144(entity_id: str):
    """
    144슬롯 전체 조회
    
    구조:
        - 12 RELATION_TYPE: FAMILY, COLLEAGUE, PARTNER, MENTOR, MENTEE...
        - 12 SLOTS per type
        - 총 12×12 = 144슬롯
    """
    # TODO: 실제 구현 - slots_144.py 호출
    # manager = Slots144Manager()
    # slots = await manager.get_all_slots(entity_id)
    
    relation_types = [
        "FAMILY", "COLLEAGUE", "PARTNER", "MENTOR", "MENTEE", "FRIEND",
        "CLIENT", "VENDOR", "COMPETITOR", "COMMUNITY", "ACQUAINTANCE", "OTHER"
    ]
    
    sample_slots = []
    for rel_type in relation_types:
        for i in range(1, 13):
            slot_id = f"{rel_type}_{i:03d}"
            sample_slots.append(Slot144Value(
                slot_id=slot_id,
                relation_type=rel_type,
                slot_number=i,
                entity_name=f"Person {i}" if i <= 3 else None,
                i_score=0.5 if i <= 3 else 0.0,
                interaction_count=10 if i <= 3 else 0,
                last_interaction=datetime.now() if i <= 3 else None,
                fill_status="FILLED" if i <= 3 else "EMPTY"
            ))
    
    return Slots144Response(
        entity_id=entity_id,
        slots=sample_slots,
        i_index=0.518,
        fill_rate=0.25,
        type_distribution={rel: 3 for rel in relation_types}
    )


@router.get("/slots/{entity_id}/{slot_id}")
async def get_slot_detail(entity_id: str, slot_id: str):
    """개별 슬롯 상세 조회"""
    return {
        "entity_id": entity_id,
        "slot_id": slot_id,
        "interactions": [],
        "i_contribution": 0.0
    }


@router.put("/slots/{entity_id}/{slot_id}")
async def update_slot(entity_id: str, slot_id: str, entity_name: str, i_score: float = Query(..., ge=-1.0, le=1.0)):
    """슬롯 업데이트"""
    return {"status": "updated", "slot_id": slot_id}


# -----------------------------------------------------------------------------
# K/I 계산
# -----------------------------------------------------------------------------

@router.post("/calculate", response_model=KIState)
async def calculate_ki(request: CalculateRequest, background_tasks: BackgroundTasks):
    """
    K/I 재계산
    
    - node_updates: 특정 노드 값 업데이트 후 계산
    - slot_updates: 특정 슬롯 값 업데이트 후 계산
    - recalculate_all: 전체 재계산
    """
    # TODO: 실제 구현
    # engine = KIPhysicsEngine()
    # if request.node_updates:
    #     await engine.update_nodes(request.entity_id, request.node_updates)
    # if request.slot_updates:
    #     await engine.update_slots(request.entity_id, request.slot_updates)
    # state = await engine.calculate(request.entity_id)
    
    # 백그라운드로 캐시 갱신
    # background_tasks.add_task(engine.refresh_cache, request.entity_id)
    
    return KIState(
        entity_id=request.entity_id,
        k_index=0.423,
        i_index=0.518,
        dk_dt=-0.012,
        di_dt=0.003,
        phase="STABLE",
        last_updated=datetime.now(),
        confidence=0.85
    )


# -----------------------------------------------------------------------------
# 궤적 예측
# -----------------------------------------------------------------------------

@router.get("/predict/{entity_id}", response_model=PredictionResponse)
async def predict_trajectory(
    entity_id: str,
    horizon_days: int = Query(30, ge=1, le=365),
    scenarios: int = Query(100, ge=10, le=1000, description="Monte Carlo 시뮬레이션 횟수")
):
    """
    K/I 궤적 예측
    
    - RK4 적분으로 기본 궤적 계산
    - Monte Carlo 시뮬레이션으로 신뢰구간 계산
    
    Args:
        horizon_days: 예측 기간 (일)
        scenarios: Monte Carlo 시나리오 수
    """
    # TODO: 실제 구현
    # predictor = TrajectoryPredictor()
    # result = await predictor.predict(entity_id, horizon_days, scenarios)
    
    trajectory = []
    for i in range(horizon_days):
        t = datetime.now() + timedelta(days=i)
        decay = 0.95 ** i  # 신뢰도 감쇠
        trajectory.append(TrajectoryPoint(
            timestamp=t,
            k_predicted=0.423 - 0.012 * i,
            i_predicted=0.518 + 0.003 * i,
            k_lower=0.423 - 0.012 * i - 0.1 * (1 - decay),
            k_upper=0.423 - 0.012 * i + 0.1 * (1 - decay),
            i_lower=0.518 + 0.003 * i - 0.1 * (1 - decay),
            i_upper=0.518 + 0.003 * i + 0.1 * (1 - decay),
            confidence=decay
        ))
    
    return PredictionResponse(
        entity_id=entity_id,
        current=KIState(
            entity_id=entity_id,
            k_index=0.423,
            i_index=0.518,
            dk_dt=-0.012,
            di_dt=0.003,
            phase="STABLE",
            last_updated=datetime.now(),
            confidence=0.85
        ),
        trajectory=trajectory,
        horizon_days=horizon_days,
        predicted_phase="DECLINE" if horizon_days > 20 else "STABLE",
        risk_level="MEDIUM",
        key_factors=["CASH_D declining", "TIME_E low", "NETWORK_A stable"]
    )


# -----------------------------------------------------------------------------
# 자동화 태스크 (DAROE)
# -----------------------------------------------------------------------------

@router.get("/automation/tasks/{entity_id}", response_model=List[AutomationTask])
async def get_automation_tasks(
    entity_id: str,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """
    자동화 태스크 목록 조회
    
    DAROE 5단계:
        - DISCOVERY: 발견
        - ANALYSIS: 분석
        - REDESIGN: 재설계
        - OPTIMIZATION: 최적화
        - ELIMINATION: 제거(완전 자동화)
    """
    # TODO: 실제 구현
    # automation = DAROEAutomation()
    # tasks = await automation.get_tasks(entity_id, stage, status, limit)
    
    return [
        AutomationTask(
            task_id="task_001",
            entity_id=entity_id,
            stage="ANALYSIS",
            status="PENDING",
            title="이메일 응답 시간 개선",
            description="평균 이메일 응답 시간이 4시간 → 2시간으로 단축 가능",
            impact_k=0.05,
            impact_i=0.02,
            confidence=0.78,
            created_at=datetime.now(),
            deadline=datetime.now() + timedelta(days=7),
            auto_approve=False
        ),
        AutomationTask(
            task_id="task_002",
            entity_id=entity_id,
            stage="OPTIMIZATION",
            status="APPROVED",
            title="회의 시간 최적화",
            description="불필요한 회의 30% 감소 제안",
            impact_k=0.08,
            impact_i=0.01,
            confidence=0.82,
            created_at=datetime.now() - timedelta(days=1),
            deadline=datetime.now() + timedelta(days=14),
            auto_approve=False
        )
    ]


@router.post("/automation/approve")
async def approve_automation_task(request: ApproveRequest):
    """자동화 태스크 승인/거부"""
    # TODO: 실제 구현
    # automation = DAROEAutomation()
    # await automation.approve(request.task_id, request.approved, request.comment)
    
    return {
        "task_id": request.task_id,
        "approved": request.approved,
        "status": "APPROVED" if request.approved else "REJECTED"
    }


@router.post("/automation/execute/{task_id}")
async def execute_automation_task(task_id: str, background_tasks: BackgroundTasks):
    """자동화 태스크 실행"""
    # 백그라운드에서 실행
    # background_tasks.add_task(automation.execute, task_id)
    
    return {"task_id": task_id, "status": "EXECUTING"}


# -----------------------------------------------------------------------------
# 경고 (Alerts)
# -----------------------------------------------------------------------------

@router.get("/alerts/{entity_id}", response_model=List[Alert])
async def get_alerts(
    entity_id: str,
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """경고 목록 조회"""
    return [
        Alert(
            alert_id="alert_001",
            entity_id=entity_id,
            severity="WARNING",
            category="K_DECLINE",
            title="K-지수 하락 추세",
            message="최근 7일간 K-지수가 0.05 하락했습니다. CASH_D 노드가 주요 원인입니다.",
            triggered_at=datetime.now() - timedelta(hours=2),
            acknowledged=False,
            resolved=False,
            related_nodes=["CASH_D", "TIME_A"]
        ),
        Alert(
            alert_id="alert_002",
            entity_id=entity_id,
            severity="INFO",
            category="I_OPPORTUNITY",
            title="관계 강화 기회",
            message="MENTOR 슬롯에 3개 빈 자리가 있습니다.",
            triggered_at=datetime.now() - timedelta(days=1),
            acknowledged=True,
            resolved=False,
            related_nodes=["NETWORK_A"]
        )
    ]


@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """경고 확인"""
    return {"alert_id": alert_id, "acknowledged": True}


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """경고 해결"""
    return {"alert_id": alert_id, "resolved": True}


# -----------------------------------------------------------------------------
# SSE (Server-Sent Events) - 실시간 스트림
# -----------------------------------------------------------------------------

@router.get("/stream/{entity_id}")
async def stream_ki_updates(entity_id: str):
    """
    K/I 실시간 업데이트 스트림 (SSE)
    
    클라이언트에서:
    ```javascript
    const es = new EventSource('/api/ki/stream/entity_001');
    es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        console.log('K:', data.k_index, 'I:', data.i_index);
    };
    ```
    """
    async def event_generator():
        # TODO: 실제 구현 - Redis PubSub 또는 WebSocket 브로드캐스트 연결
        while True:
            # 새 데이터가 있으면 전송
            data = {
                "entity_id": entity_id,
                "k_index": 0.423,
                "i_index": 0.518,
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(5)  # 5초마다 업데이트
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# -----------------------------------------------------------------------------
# 메타 정보
# -----------------------------------------------------------------------------

@router.get("/meta/nodes")
async def get_nodes_meta():
    """48노드 메타데이터 (구조 정의)"""
    return {
        "total": 48,
        "structure": {
            "meta": ["RESOURCE", "RELATION", "ACTION", "FLOW"],
            "domain": ["SURVIVE", "GROW", "RELATE", "EXPRESS"],
            "type": ["A", "D", "E"]
        },
        "nodes": [
            # 실제로는 autus_48nodes.json 로드
            {"id": "CASH_A", "name": "현금 자산", "meta": "RESOURCE", "domain": "SURVIVE", "type": "A"},
            {"id": "CASH_D", "name": "현금 변화", "meta": "RESOURCE", "domain": "SURVIVE", "type": "D"},
            {"id": "CASH_E", "name": "현금 효율", "meta": "RESOURCE", "domain": "SURVIVE", "type": "E"},
            # ... 나머지 45개
        ]
    }


@router.get("/meta/slots")
async def get_slots_meta():
    """144슬롯 메타데이터 (구조 정의)"""
    return {
        "total": 144,
        "structure": {
            "relation_types": [
                {"type": "FAMILY", "description": "가족", "max_slots": 12},
                {"type": "COLLEAGUE", "description": "동료", "max_slots": 12},
                {"type": "PARTNER", "description": "파트너", "max_slots": 12},
                {"type": "MENTOR", "description": "멘토", "max_slots": 12},
                {"type": "MENTEE", "description": "멘티", "max_slots": 12},
                {"type": "FRIEND", "description": "친구", "max_slots": 12},
                {"type": "CLIENT", "description": "고객", "max_slots": 12},
                {"type": "VENDOR", "description": "벤더", "max_slots": 12},
                {"type": "COMPETITOR", "description": "경쟁자", "max_slots": 12},
                {"type": "COMMUNITY", "description": "커뮤니티", "max_slots": 12},
                {"type": "ACQUAINTANCE", "description": "지인", "max_slots": 12},
                {"type": "OTHER", "description": "기타", "max_slots": 12},
            ]
        }
    }


@router.get("/meta/phases")
async def get_phases_meta():
    """K/I 페이즈 정의"""
    return {
        "phases": [
            {"name": "GROWTH", "k_range": [0.3, 1.0], "description": "성장 단계"},
            {"name": "STABLE", "k_range": [-0.3, 0.3], "description": "안정 단계"},
            {"name": "DECLINE", "k_range": [-0.7, -0.3], "description": "하락 단계"},
            {"name": "CRISIS", "k_range": [-1.0, -0.7], "description": "위기 단계"},
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# main.py에 라우터 등록
# ═══════════════════════════════════════════════════════════════════════════════

"""
# main.py에 추가:

from routers.ki_router import router as ki_router

app.include_router(ki_router)

# 또는 prefix 변경:
# app.include_router(ki_router, prefix="/v4/ki")
"""
