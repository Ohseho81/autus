"""
AUTUS Unified API v2.0
======================

72 노드 (6 Physics × 12 Motion) + 물리 법칙 + Gate + Projection

Endpoints:
  - GET  /state               6 Physics 상태
  - GET  /state/{physics}     단일 Physics 상태
  - POST /motion              Motion 적용
  - GET  /motions             최근 Motion 로그
  - POST /tick                시간 경과
  - GET  /nodes               72 노드 목록
  - GET  /nodes/{node_id}     단일 노드 조회
  - GET  /project             9 UI Ports
  - GET  /domains             3 Domains
  - GET  /gates               모든 Gate
  - GET  /gates/{physics}     단일 Gate
  - GET  /info                엔진 정보
  - POST /replay              이벤트 소싱 재생
  - POST /reset               상태 초기화
  - GET  /ref/physics         Physics 레퍼런스
  - GET  /ref/motions         Motion 레퍼런스
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, Union
import os
import sys

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.unified import (
    UnifiedEngine,
    Physics, Motion, UIPort, Domain,
    PHYSICS_INFO, MOTION_INFO
)


# ============================================================
# API Models
# ============================================================

class MotionRequest(BaseModel):
    """Motion 요청"""
    physics: Union[int, str] = Field(..., description="Physics (0-5 또는 이름)")
    motion: Union[int, str] = Field(..., description="Motion (0-11 또는 이름)")
    delta: float = Field(..., ge=-1.0, le=1.0, description="변화량 [-1, 1]")
    friction: float = Field(0.1, ge=0.0, le=1.0, description="마찰 [0, 1]")
    source: str = Field("", description="문화별 라벨")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "physics": "CAPITAL",
                "motion": "ACQUIRE",
                "delta": 0.2,
                "friction": 0.1,
                "source": "급여"
            }
        }
    )


class MotionResponse(BaseModel):
    """Motion 응답"""
    success: bool
    node: str
    source: str
    effects: Dict[str, Dict[str, float]]


class StateResponse(BaseModel):
    """상태 응답"""
    BIO: float
    CAPITAL: float
    COGNITION: float
    RELATION: float
    ENVIRONMENT: float
    LEGACY: float
    total_energy: float


class NodeResponse(BaseModel):
    """노드 응답"""
    id: str
    physics: str
    motion: str
    physics_value: float
    motion_count: int


class GateResponse(BaseModel):
    """Gate 응답"""
    physics: str
    passed: bool
    confidence: float
    display_mode: str
    motion_count: int
    last_motion_age_days: float


class InfoResponse(BaseModel):
    """정보 응답"""
    version: str
    total_nodes: int
    physics_count: int
    motion_count: int
    state: Dict[str, float]
    total_energy: float
    motion_counts: Dict[str, int]
    data_dir: str


# ============================================================
# Router & Engine
# ============================================================

router = APIRouter(prefix="/api/unified", tags=["unified-engine"])

# Engine 초기화
DATA_DIR = os.environ.get("AUTUS_DATA_DIR", "./autus_data")
engine = UnifiedEngine(DATA_DIR)


# ============================================================
# Endpoints
# ============================================================

@router.get("/", tags=["unified-engine"])
async def unified_root():
    """Unified Engine 정보"""
    return {
        "name": "AUTUS Unified Engine",
        "version": "2.0.0",
        "description": "72 Nodes = 6 Physics × 12 Motion",
        "nodes": 72,
        "physics": 6,
        "motions": 12,
        "endpoints": {
            "state": "/api/unified/state",
            "motion": "/api/unified/motion",
            "nodes": "/api/unified/nodes",
            "project": "/api/unified/project",
            "domains": "/api/unified/domains",
            "gates": "/api/unified/gates"
        }
    }


# ─────────────────────────────────────────────────────────────
# State
# ─────────────────────────────────────────────────────────────

@router.get("/state", response_model=StateResponse)
async def get_state(
    slim: bool = Query(False, description="슬림 응답 (배열 형식)"),
    fields: Optional[str] = Query(None, description="콤마 구분 필드 선택")
):
    """6 Physics 상태 조회 (슬림/필드 선택 지원)"""
    state = engine.get_state_dict()
    total_energy = round(sum(engine.get_state()), 4)
    
    # 필드 선택
    if fields:
        wanted = {f.strip() for f in fields.split(",") if f.strip()}
        filtered = {k: v for k, v in state.items() if k in wanted}
        return {**filtered, "total_energy": total_energy}
    
    # 슬림 응답
    if slim:
        return {
            "s": [state[p.name] for p in Physics],
            "e": total_energy,
            "t": engine._last_ts,
        }
    
    return StateResponse(**state, total_energy=total_energy)


@router.get("/state/{physics}")
async def get_physics_state(physics: str):
    """단일 Physics 상태 조회"""
    try:
        value = engine.get_physics(physics)
        info = PHYSICS_INFO[Physics[physics]]
        return {
            "physics": physics,
            "value": round(value, 4),
            "name_ko": info["name_ko"],
            "half_life_days": info["half_life_days"],
            "inertia": info["inertia"]
        }
    except KeyError:
        raise HTTPException(404, f"Unknown physics: {physics}")


# ─────────────────────────────────────────────────────────────
# Motion
# ─────────────────────────────────────────────────────────────

@router.post("/motion", response_model=MotionResponse)
async def apply_motion(req: MotionRequest):
    """Motion 적용"""
    try:
        result = engine.apply(
            physics=req.physics,
            motion=req.motion,
            delta=req.delta,
            friction=req.friction,
            source=req.source
        )
        return MotionResponse(**result)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/motions")
async def get_motions(
    n: int = Query(10, ge=1, le=200, description="페이지 크기"),
    page: int = Query(1, ge=1, description="페이지 번호 (1-based)"),
    fields: Optional[str] = Query(None, description="콤마 구분 필드 선택 (t,p,m,d,f,s)")
):
    """최근 Motion 로그 (페이지네이션 + 필드 선택)"""
    limit = min(max(n, 1), 200)
    total_fetch = limit * page
    motions = engine.get_recent_motions(total_fetch)
    total = len(motions)
    start = max(total - limit, 0)
    items = motions[start:total]
    
    # 필드 선택
    if fields:
        wanted = {f.strip() for f in fields.split(",") if f.strip()}
        def select(item):
            return {k: v for k, v in item.items() if k in wanted}
        items = [select(m) for m in items]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": limit,
        "has_more": total > limit * page,
    }


@router.post("/tick")
async def tick():
    """시간 경과 (감쇠 적용)"""
    decay = engine.tick()
    return {
        "success": True,
        "decay": decay,
        "state": engine.get_state_dict()
    }


# ─────────────────────────────────────────────────────────────
# Nodes
# ─────────────────────────────────────────────────────────────

@router.get("/nodes")
async def list_nodes(
    physics: Optional[str] = None,
    motion: Optional[str] = None
):
    """72 노드 목록"""
    nodes = []
    for node in engine.registry.nodes.values():
        if physics and node.physics.name != physics:
            continue
        if motion and node.motion.name != motion:
            continue
        nodes.append({
            "id": node.id,
            "physics": node.physics.name,
            "motion": node.motion.name,
            "index": node.index
        })
    return {"count": len(nodes), "nodes": nodes}


@router.get("/nodes/{node_id}", response_model=NodeResponse)
async def get_node(node_id: str):
    """단일 노드 조회"""
    result = engine.get_node(node_id)
    if not result:
        raise HTTPException(404, f"Unknown node: {node_id}")
    return NodeResponse(**result)


# ─────────────────────────────────────────────────────────────
# Projection
# ─────────────────────────────────────────────────────────────

@router.get("/project")
async def project():
    """6D → 9 UI Ports 투영"""
    ports = engine.project()
    return {
        "type": "ui_ports",
        "count": 9,
        "values": ports
    }


@router.get("/domains")
async def domains():
    """6D → 3 Domains 투영"""
    doms = engine.project_domains()
    return {
        "type": "domains",
        "count": 3,
        "values": doms
    }


# ─────────────────────────────────────────────────────────────
# Gates
# ─────────────────────────────────────────────────────────────

@router.get("/gates")
async def get_all_gates():
    """모든 Physics Gate 평가"""
    return engine.evaluate_all_gates()


@router.get("/gates/{physics}", response_model=GateResponse)
async def get_gate(physics: str):
    """단일 Physics Gate 평가"""
    try:
        result = engine.evaluate_gate(physics)
        return GateResponse(**result.to_dict())
    except KeyError:
        raise HTTPException(404, f"Unknown physics: {physics}")


# ─────────────────────────────────────────────────────────────
# System
# ─────────────────────────────────────────────────────────────

@router.get("/info", response_model=InfoResponse)
async def info():
    """엔진 정보"""
    return InfoResponse(**engine.info())


@router.post("/replay")
async def replay():
    """이벤트 소싱 재생"""
    count = engine.replay()
    return {
        "success": True,
        "replayed": count,
        "state": engine.get_state_dict()
    }


@router.post("/reset")
async def reset():
    """상태 초기화"""
    engine.reset()
    return {
        "success": True,
        "state": engine.get_state_dict()
    }


# ─────────────────────────────────────────────────────────────
# Reference
# ─────────────────────────────────────────────────────────────

@router.get("/ref/physics")
async def ref_physics():
    """Physics 레퍼런스"""
    return {
        p.name: {
            "value": p.value,
            **PHYSICS_INFO[p]
        }
        for p in Physics
    }


@router.get("/ref/motions")
async def ref_motions():
    """Motion 레퍼런스"""
    return {
        m.name: {
            "value": m.value,
            **MOTION_INFO[m]
        }
        for m in Motion
    }


# ─────────────────────────────────────────────────────────────
# Snapshots & Metrics
# ─────────────────────────────────────────────────────────────

@router.get("/snapshots")
async def list_snapshots():
    """스냅샷 목록"""
    snaps = engine.list_snapshots()
    return {"count": len(snaps), "snapshots": snaps}


@router.post("/snapshot")
async def create_snapshot():
    """스냅샷 생성"""
    path = engine.snapshot_state()
    info = engine.info()
    return {
        "path": path,
        "ts": info.get("last_snapshot_ts"),
        "state": info.get("state"),
    }


@router.post("/snapshots/{ts}/restore")
async def restore_snapshot(ts: int):
    """특정 스냅샷 복원"""
    try:
        path = engine._snapshot_path(ts)
        if not os.path.exists(path):
            raise HTTPException(404, f"Snapshot not found: {ts}")
        engine._load_snapshot(path)
        engine._save_state(force=True)
        return {"restored": ts, "state": engine.get_state_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/metrics")
async def metrics():
    """엔진 메트릭"""
    info = engine.info()
    extra = {
        "buffer_len": len(engine._motion_buffer),
        "async_write": engine._async_write,
        "flush_threshold": engine._buffer_flush_threshold,
        "flush_interval": engine._buffer_flush_interval,
    }
    return {**info, **extra}

