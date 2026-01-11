"""
AUTUS Final API v2.1
=====================

완전 통합 시스템 API

Endpoints:
- GET  /final/status           시스템 상태
- POST /final/update           데이터 업데이트
- POST /final/run              물리 연산 실행
- GET  /final/top1             Top-1 카드 조회
- POST /final/setup            Human Domain 설정
- GET  /final/simulate/{type}  위기 시뮬레이션
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from autus_final import (
    AUTUS, PhysicsEngine, CrisisSimulator,
    HumanDomain, AutonomyLevel, State,
    get_autus, reset_autus
)


router = APIRouter(prefix="/final", tags=["AUTUS Final v2.1"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class UpdateRequest(BaseModel):
    """데이터 업데이트 요청"""
    node_values: Dict[str, float] = Field(
        ...,
        description="노드 ID와 값",
        json_schema_extra={"example": {"n01": 25000000, "n05": 10, "n09": 6.0}}
    )


class SetupRequest(BaseModel):
    """Human Domain 설정 요청"""
    type: str = Field(default="entrepreneur", description="entrepreneur, employee, freelancer")
    custom_weights: Optional[Dict[str, float]] = Field(default=None, description="노드별 가중치")
    autonomy_level: int = Field(default=0, ge=0, le=4, description="자율성 레벨 0-4")


class StatusResponse(BaseModel):
    """상태 응답"""
    version: str
    equilibrium: float
    stability: float
    circuits: Dict[str, float]
    critical: List[Dict]
    daily_cards: int
    human_domain: Dict


class CardResponse(BaseModel):
    """카드 응답"""
    node_id: str
    name: str
    state: str
    pressure: float
    message: str


class SimulationResponse(BaseModel):
    """시뮬레이션 응답"""
    scenario: str
    timeline: List[Dict]
    summary: Dict


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """
    시스템 상태 조회
    
    - 평형점, 안정성
    - 회로 상태
    - 위험 노드 목록
    """
    autus = get_autus()
    return autus.status()


@router.post("/update")
async def update_data(request: UpdateRequest):
    """
    데이터 업데이트
    
    노드별 Raw Data 입력 (로컬에서만 처리)
    """
    autus = get_autus()
    autus.update(request.node_values)
    
    return {
        "success": True,
        "updated_nodes": len(request.node_values),
        "equilibrium": round(autus.engine.equilibrium(), 4)
    }


@router.post("/run")
async def run_engine(cycles: int = Query(default=1, ge=1, le=10)):
    """
    물리 엔진 실행
    
    - 6가지 물리 법칙 적용
    - Top-1 카드 반환 (발화 시)
    """
    autus = get_autus()
    card = autus.run(cycles)
    
    result = {
        "success": True,
        "cycles": cycles,
        "equilibrium": round(autus.engine.equilibrium(), 4),
        "stability": round(autus.engine.stability(), 4),
        "card": None
    }
    
    if card:
        result["card"] = {
            "node_id": card.node_id,
            "name": card.name,
            "state": card.state.name,
            "pressure": round(card.pressure, 4),
            "message": card.message
        }
    
    return result


@router.get("/top1")
async def get_top1():
    """
    Top-1 카드 조회 (현재 상태)
    
    물리 엔진 재실행 없이 현재 상태의 Top-1 반환
    """
    autus = get_autus()
    card = autus.engine.generate_card()
    
    if not card:
        return {"top1": None, "message": "모든 노드 안전 (침묵)"}
    
    return {
        "top1": {
            "node_id": card.node_id,
            "name": card.name,
            "state": card.state.name,
            "pressure": round(card.pressure, 4),
            "message": card.message
        }
    }


@router.get("/nodes")
async def get_nodes(
    layer: Optional[str] = Query(None, description="레이어 필터 (재무, 생체, 운영, 고객, 외부)"),
    state: Optional[str] = Query(None, description="상태 필터 (IGNORABLE, PRESSURING, IRREVERSIBLE)")
):
    """
    전체 노드 조회
    """
    autus = get_autus()
    
    nodes = []
    for nid, n in autus.engine.nodes.items():
        # 필터링
        if layer and n.layer.value != layer:
            continue
        if state and n.state.name != state:
            continue
        
        nodes.append({
            "id": nid,
            "name": n.name,
            "layer": n.layer.value,
            "value": n.value,
            "pressure": round(n.pressure, 4),
            "state": n.state.name
        })
    
    return {
        "count": len(nodes),
        "nodes": nodes
    }


@router.get("/circuits")
async def get_circuits():
    """
    회로 상태 조회
    
    5가지 핵심 회로:
    - survival: 생존 (지출→현금→런웨이)
    - fatigue: 피로 (태스크→수면→HRV→지연)
    - repeat_capital: 반복자본 (반복구매→수입→현금)
    - people: 인력 (이직률→가동률→처리속도)
    - growth: 성장 (리드→고객→수입)
    """
    autus = get_autus()
    circuits = autus.engine.circuit_status()
    
    descriptions = {
        "survival": "생존 루프: 지출→현금→런웨이",
        "fatigue": "피로 루프: 태스크→수면→HRV→지연",
        "repeat_capital": "반복자본: 반복구매→수입→현금",
        "people": "인력 루프: 이직률→가동률→처리속도",
        "growth": "성장 루프: 리드→고객→수입"
    }
    
    return {
        "circuits": [
            {
                "name": name,
                "pressure": round(pressure, 4),
                "description": descriptions.get(name, ""),
                "active": pressure > 0.3
            }
            for name, pressure in circuits.items()
        ]
    }


@router.post("/setup")
async def setup_domain(request: SetupRequest):
    """
    Human Domain 설정
    
    무슨 존재가 될지를 정의
    """
    autus = get_autus()
    
    # 도메인 타입에 따른 기본값
    if request.type == "entrepreneur":
        domain = HumanDomain.default_entrepreneur()
    elif request.type == "employee":
        domain = HumanDomain.default_employee()
    elif request.type == "freelancer":
        domain = HumanDomain.default_freelancer()
    else:
        domain = HumanDomain.default_entrepreneur()
    
    # 커스텀 가중치 적용
    if request.custom_weights:
        domain.value["weights"].update(request.custom_weights)
    
    # 자율성 레벨
    domain.autonomy = AutonomyLevel(request.autonomy_level)
    
    autus.setup(domain)
    
    return {
        "success": True,
        "domain": {
            "type": request.type,
            "identity": domain.identity,
            "goal": domain.goal,
            "autonomy": f"L{domain.autonomy.value}"
        }
    }


@router.post("/reset")
async def reset_system():
    """
    시스템 리셋
    """
    reset_autus()
    return {"success": True, "message": "시스템 리셋 완료"}


@router.post("/reset-daily")
async def reset_daily_counter():
    """
    일일 발화 카운터 리셋
    """
    autus = get_autus()
    autus.reset_daily()
    return {"success": True, "daily_count": autus.daily_count}


# ============================================================================
# CRISIS SIMULATION ENDPOINTS
# ============================================================================

@router.get("/simulate/burnout", response_model=SimulationResponse)
async def simulate_burnout():
    """
    Burnout Drive 시뮬레이션
    
    인간 붕괴 시나리오:
    태스크↑ → 연속작업↑ → 수면↓ → HRV↓ → 지연↑
    """
    simulator = CrisisSimulator()
    timeline = simulator.burnout_drive()
    summary = simulator.summary()
    
    return SimulationResponse(
        scenario="burnout",
        timeline=timeline,
        summary=summary.get("burnout", {})
    )


@router.get("/simulate/bankruptcy", response_model=SimulationResponse)
async def simulate_bankruptcy():
    """
    Bankruptcy Drive 시뮬레이션
    
    기업 붕괴 시나리오:
    수입↓ → 현금↓ → 런웨이↓ → 이직률↑ → 가동률↓
    """
    simulator = CrisisSimulator()
    timeline = simulator.bankruptcy_drive()
    summary = simulator.summary()
    
    return SimulationResponse(
        scenario="bankruptcy",
        timeline=timeline,
        summary=summary.get("bankruptcy", {})
    )


@router.get("/simulate/blackswan", response_model=SimulationResponse)
async def simulate_blackswan():
    """
    Black Swan Drive 시뮬레이션
    
    외부 충격 시나리오:
    금리↑ → 부채압력↑ → 현금↓ → 런웨이↓
    """
    simulator = CrisisSimulator()
    timeline = simulator.blackswan_drive()
    summary = simulator.summary()
    
    return SimulationResponse(
        scenario="blackswan",
        timeline=timeline,
        summary=summary.get("blackswan", {})
    )


@router.get("/simulate/all")
async def simulate_all():
    """
    전체 위기 시나리오 시뮬레이션
    """
    simulator = CrisisSimulator()
    results = simulator.run_all()
    summary = simulator.summary()
    
    return {
        "scenarios": ["burnout", "bankruptcy", "blackswan"],
        "results": results,
        "summary": summary
    }


# ============================================================================
# INFO ENDPOINTS
# ============================================================================

@router.get("/info")
async def get_info():
    """
    AUTUS 시스템 정보
    """
    return {
        "name": "AUTUS Final Package",
        "version": "2.1.0",
        "philosophy": "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다.",
        "principles": [
            "데이터는 로컬에 가두고, 법칙만 클라우드에서 흐르게 한다",
            "진짜 최고의 시스템은 '잊혀지는 것'이다",
            "해석의 거부 - 사실만 보고한다"
        ],
        "components": {
            "nodes": 36,
            "edges": 42,
            "layers": 5,
            "circuits": 5,
            "physics_laws": 6
        },
        "autonomy_levels": [
            "L0: 알림만",
            "L1: 옵션 제시",
            "L2: 추천",
            "L3: 승인 후 실행",
            "L4: 자동 실행"
        ]
    }


@router.get("/philosophy")
async def get_philosophy():
    """
    AUTUS 철학
    """
    return {
        "core": "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다.",
        "silence_design": "진짜 최고의 시스템은 잊혀지는 것이다. 공기처럼 존재하며 사고가 나기 직전에만 핸들을 꺾어준다.",
        "data_sovereignty": "데이터는 로컬에 가두고, 법칙만 클라우드에서 흐르게 한다.",
        "interpretation_refusal": "해석의 거부 - 사실만 보고한다. '당신의 정신력은 M(질량)에 불과하다.'",
        "human_domain": {
            "identity": "무슨 존재가 될 것인가",
            "goal": "어디로 갈 것인가",
            "value": "무엇을 중요시하는가",
            "boundary": "절대 넘지 않을 선은 무엇인가"
        }
    }
