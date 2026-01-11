"""
AUTUS API Server v2.0
=====================

FastAPI 기반 REST API

Endpoints:
  - GET  /                    서버 정보
  - GET  /health              헬스 체크
  - GET  /state               6 Physics 상태
  - GET  /state/{physics}     단일 Physics 상태
  - POST /motion              Motion 적용
  - GET  /nodes               72 노드 목록
  - GET  /nodes/{node_id}     단일 노드 조회
  - GET  /project             9 UI Ports
  - GET  /domains             3 Domains
  - GET  /gates               모든 Gate
  - GET  /gates/{physics}     단일 Gate
  - GET  /motions             최근 Motion 로그
  - POST /tick                시간 경과
  - POST /replay              이벤트 소싱 재생
  - POST /reset               상태 초기화
  - GET  /info                엔진 정보
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
import os
import sys
import time

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.unified import (
    UnifiedEngine, MotionEvent,
    Physics, Motion, UIPort, Domain,
    PHYSICS_INFO, MOTION_INFO
)

# Audit API
from api import audit_api


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
    snapshot_dir: Optional[str] = None
    last_snapshot_ts: Optional[int] = None
    motions_since_snapshot: Optional[int] = None
    snapshot_interval_sec: Optional[float] = None
    snapshot_min_motions: Optional[int] = None
    log_size_bytes: Optional[int] = None
    snapshot_count: Optional[int] = None
    checkpoint_count: Optional[int] = None
    retention_days: Optional[int] = None
    compress_mb: Optional[int] = None
    gzip_level: Optional[int] = None
    checkpoint_interval: Optional[int] = None
    gate_cache: Optional[Dict[str, Any]] = None
    projection_cache: Optional[Dict[str, Any]] = None
    writer: Optional[Dict[str, Any]] = None


# ============================================================
# App
# ============================================================

app = FastAPI(
    title="AUTUS API",
    description="AUTUS Universal Engine API - 80억 인류 포괄 물리 엔진",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# GZip
app.add_middleware(GZipMiddleware, minimum_size=500)

# Engine
DATA_DIR = os.environ.get("AUTUS_DATA_DIR", "./autus_data")
engine = UnifiedEngine(DATA_DIR)

# ============================================================
# API Routers (Safe Import)
# ============================================================

import warnings

def _include_router_safe(app, module, name: str):
    """안전한 라우터 등록"""
    if module and hasattr(module, 'router'):
        app.include_router(module.router)
    else:
        warnings.warn(f"Router not available: {name}")

# Auth API
try:
    from auth import router as auth_router
    app.include_router(auth_router)
except ImportError:
    warnings.warn("Auth router not available")

# Import all API modules (safe import in api/__init__.py)
from api import (
    audit_api, autus_api, edge_api, efficiency_api, engine_api,
    kernel_api, distributed_api, final_api,
    flow_api, keyman_api, notification_api, ontology_api,
    person_score_api, scale_api, strategy_api, unified_api,
    viewport_api, reliance_api, collection_api,
)

# Sovereign API (별도 임포트)
try:
    from api import sovereign_api
except ImportError:
    sovereign_api = None

# Injection & Pipeline API (v2.2.0)
try:
    from api import injection_api, pipeline_api
except ImportError:
    injection_api = None
    pipeline_api = None

# Universe API (v3.0.0)
try:
    from api import universe_api
except ImportError:
    universe_api = None

# Distribution API (v2.0.0)
try:
    from api import distribution_api
except ImportError:
    distribution_api = None

# Core Routers
_include_router_safe(app, audit_api, "audit_api")
_include_router_safe(app, autus_api, "autus_api")
_include_router_safe(app, edge_api, "edge_api")
_include_router_safe(app, efficiency_api, "efficiency_api")
_include_router_safe(app, engine_api, "engine_api")
_include_router_safe(app, kernel_api, "kernel_api")
_include_router_safe(app, distributed_api, "distributed_api")
_include_router_safe(app, final_api, "final_api")

# Extended Routers
_include_router_safe(app, flow_api, "flow_api")
_include_router_safe(app, keyman_api, "keyman_api")
_include_router_safe(app, notification_api, "notification_api")
_include_router_safe(app, ontology_api, "ontology_api")
_include_router_safe(app, person_score_api, "person_score_api")
_include_router_safe(app, scale_api, "scale_api")
_include_router_safe(app, sovereign_api, "sovereign_api")
_include_router_safe(app, strategy_api, "strategy_api")
_include_router_safe(app, unified_api, "unified_api")
_include_router_safe(app, viewport_api, "viewport_api")
_include_router_safe(app, reliance_api, "reliance_api")
_include_router_safe(app, collection_api, "collection_api")

# v2.2.0 Sovereign Routers (Injection & Pipeline)
_include_router_safe(app, injection_api, "injection_api")
_include_router_safe(app, pipeline_api, "pipeline_api")

# v3.0.0 Universe Router (Living Universe)
_include_router_safe(app, universe_api, "universe_api")

# v2.0.0 Distribution Router (144K Masters → 8B Distribution)
_include_router_safe(app, distribution_api, "distribution_api")


# ============================================================
# Endpoints
# ============================================================

@app.get("/", tags=["System"])
async def root():
    """서버 정보"""
    return {
        "name": "AUTUS API",
        "version": "2.0.0",
        "description": "Universal Engine for 8 Billion Humans",
        "nodes": 72,
        "physics": 6,
        "motions": 12,
        "ontology": {
            "event_space": 72**4,
            "human_types": 72,
            "forces": 72
        },
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "state": "/state",
            "motion": "/motion",
            "nodes": "/nodes",
            "project": "/project",
            "gates": "/gates",
            "ontology": "/ontology"
        }
    }


@app.get("/health", tags=["System"])
async def health():
    """헬스 체크 + 주요 메트릭"""
    info = engine.info()
    return {
        "status": "healthy",
        "version": info.get("version"),
        "timestamp": time.time(),
        "engine": {
            "total_energy": info.get("total_energy"),
            "motion_counts": info.get("motion_counts"),
            "cache": {
                "gate": info.get("gate_cache"),
                "projection": info.get("projection_cache"),
            },
            "writer": info.get("writer"),
        },
        "storage": {
            "log_size_bytes": info.get("log_size_bytes"),
            "snapshot_count": info.get("snapshot_count"),
            "checkpoint_count": info.get("checkpoint_count"),
            "retention_days": info.get("retention_days"),
        },
    }


# ─────────────────────────────────────────────────────────────
# State
# ─────────────────────────────────────────────────────────────

@app.get("/state", response_model=StateResponse, tags=["State"])
async def get_state(
    slim: bool = Query(False, description="슬림 응답"),
    fields: Optional[str] = Query(None, description="콤마 구분 필드 목록")
):
    """6 Physics 상태 조회"""
    state = engine.get_state_dict()
    total_energy = round(sum(engine.get_state()), 4)

    # fields 선택
    if fields:
        wanted = {f.strip() for f in fields.split(",") if f.strip()}
        filtered = {k: v for k, v in state.items() if k in wanted}
        return filtered

    # slim 응답
    if slim:
        return {
            "s": [state[p.name] for p in Physics],
            "e": total_energy,
            "t": engine._last_ts,
        }

    return StateResponse(**state, total_energy=total_energy)


@app.get("/state/{physics}", tags=["State"])
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

@app.post("/motion", response_model=MotionResponse, tags=["Motion"])
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


@app.get("/motions", tags=["Motion"])
async def get_motions(
    n: int = Query(10, ge=1, le=200),
    page: int = Query(1, ge=1, description="1-based"),
    fields: Optional[str] = Query(None, description="콤마 구분 필드 선택")
):
    """최근 Motion 로그 (pagination + fields)"""
    limit = min(max(n, 1), 200)
    total_fetch = limit * page
    motions = engine.get_recent_motions(total_fetch)
    total = len(motions)
    start = max(total - limit, 0)
    items = motions[start:total]

    # fields 선택
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


@app.post("/tick", tags=["Motion"])
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

@app.get("/nodes", tags=["Nodes"])
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


@app.get("/nodes/{node_id}", response_model=NodeResponse, tags=["Nodes"])
async def get_node(node_id: str):
    """단일 노드 조회"""
    result = engine.get_node(node_id)
    if not result:
        raise HTTPException(404, f"Unknown node: {node_id}")
    return NodeResponse(**result)


# ─────────────────────────────────────────────────────────────
# Projection
# ─────────────────────────────────────────────────────────────

@app.get("/project", tags=["Projection"])
async def project():
    """6D → 9 UI Ports 투영"""
    ports = engine.project()
    return {
        "type": "ui_ports",
        "count": 9,
        "values": ports
    }


@app.get("/domains", tags=["Projection"])
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

@app.get("/gates", tags=["Gates"])
async def get_all_gates():
    """모든 Physics Gate 평가"""
    return engine.evaluate_all_gates()


@app.get("/gates/{physics}", response_model=GateResponse, tags=["Gates"])
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

@app.get("/info", response_model=InfoResponse, tags=["System"])
async def info():
    """엔진 정보"""
    return InfoResponse(**engine.info())


@app.post("/replay", tags=["System"])
async def replay():
    """이벤트 소싱 재생"""
    count = engine.replay()
    return {
        "success": True,
        "replayed": count,
        "state": engine.get_state_dict()
    }


@app.post("/reset", tags=["System"])
async def reset():
    """상태 초기화"""
    engine.reset()
    return {
        "success": True,
        "state": engine.get_state_dict()
    }


# ─────────────────────────────────────────────────────────────
# Snapshots & Metrics
# ─────────────────────────────────────────────────────────────

@app.get("/snapshots", tags=["System"])
async def list_snapshots():
    """스냅샷 목록"""
    snaps = engine.list_snapshots()
    return {"count": len(snaps), "snapshots": snaps}


@app.post("/snapshot", tags=["System"])
async def create_snapshot():
    """스냅샷 생성"""
    path = engine.snapshot_state()
    info = engine.info()
    return {"path": path, "ts": info.get("last_snapshot_ts"), "state": info.get("state")}


@app.post("/snapshots/{ts}/restore", tags=["System"])
async def restore_snapshot(ts: int):
    """특정 스냅샷 복원"""
    try:
        path = engine._snapshot_path(ts)
        if not os.path.exists(path):
            raise HTTPException(404, f"Snapshot not found: {ts}")
        engine._load_snapshot(path)
        engine._save_state(force=True)
        engine._invalidate_caches()
        return {"restored": ts, "state": engine.get_state_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/metrics", tags=["System"])
async def metrics():
    """엔진 메트릭"""
    info = engine.info()
    extra = {
        "buffer_len": len(engine._motion_buffer),
        "async_write": engine._async_write,
        "flush_threshold": engine._buffer_flush_threshold,
        "flush_interval": engine._buffer_flush_interval,
        "gate_cache": info.get("gate_cache"),
        "projection_cache": info.get("projection_cache"),
        "writer": info.get("writer"),
        "log_size_bytes": info.get("log_size_bytes"),
        "snapshot_count": info.get("snapshot_count"),
        "checkpoint_count": info.get("checkpoint_count"),
        "retention_days": info.get("retention_days"),
        "compress_mb": info.get("compress_mb"),
    }
    return {**info, **extra}


@app.get("/checkpoints", tags=["System"])
async def list_checkpoints():
    """체크포인트 목록"""
    cps = engine.list_checkpoints()
    return {"count": len(cps), "checkpoints": cps}


@app.post("/checkpoint", tags=["System"])
async def create_checkpoint():
    """체크포인트 생성"""
    path = engine.create_checkpoint()
    return {"path": path, "ts": engine._last_checkpoint_ts, "offset": engine._last_log_offset}


# ─────────────────────────────────────────────────────────────
# Reference
# ─────────────────────────────────────────────────────────────

@app.get("/ref/physics", tags=["Reference"])
async def ref_physics():
    """Physics 레퍼런스"""
    return {
        p.name: {
            "value": p.value,
            **PHYSICS_INFO[p]
        }
        for p in Physics
    }


@app.get("/ref/motions", tags=["Reference"])
async def ref_motions():
    """Motion 레퍼런스"""
    return {
        m.name: {
            "value": m.value,
            **MOTION_INFO[m]
        }
        for m in Motion
    }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           AUTUS API Server v2.0                              ║
║                   Universal Engine for 8 Billion Humans                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   72 Nodes = 6 Physics × 12 Motion                                          ║
║                                                                              ║
║   Endpoints:                                                                 ║
║     GET  /state              6 Physics 상태                                  ║
║     POST /motion             Motion 적용                                     ║
║     GET  /nodes              72 노드 목록                                    ║
║     GET  /project            9 UI Ports                                      ║
║     GET  /domains            3 Domains                                       ║
║     GET  /gates              Evidence Gates                                  ║
║                                                                              ║
║   Docs: http://{host}:{port}/docs                                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")
    
    uvicorn.run(app, host=host, port=port)
