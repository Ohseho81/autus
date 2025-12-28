"""
AUTUS Backend Main Application
==============================

FastAPI 기반 백엔드 서버

Features:
- REST API 전체 엔드포인트
- WebSocket 실시간 통신
- Redis Pub/Sub 브로드캐스트
- PostgreSQL 데이터베이스
- 백그라운드 스케줄러
- JWT 인증

Version: 3.0.0
Status: PRODUCTION
"""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import asyncio
import json
import logging

# 내부 모듈
from .core import (
    UnifiedSystemEngine,
    UnifiedNode,
    SystemState,
    ClusterType,
    OrbitType,
    UnifiedPhysicsFormulas,
    create_engine,
)
from .config import settings
from .auth import AuthHandler, get_current_user, get_optional_user
from .websocket_manager import WebSocketManager, ws_manager
from .scheduler import create_scheduler
from .redis_client import create_redis_client

# 로깅
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger("autus")


# ================================================================
# PYDANTIC MODELS
# ================================================================

class NodeCreate(BaseModel):
    """노드 생성 요청"""
    id: str
    name: str
    revenue: float = 0.0
    time_spent: float = 0.0
    fitness: float = 0.5
    density: float = 0.5
    frequency: float = 0.5
    penalty: float = 0.0
    role_probabilities: Optional[Dict[str, float]] = None
    tags: List[str] = []


class NodeUpdate(BaseModel):
    """노드 업데이트 요청"""
    revenue: Optional[float] = None
    time_spent: Optional[float] = None
    fitness: Optional[float] = None
    density: Optional[float] = None
    frequency: Optional[float] = None
    penalty: Optional[float] = None
    tags: Optional[List[str]] = None


class NodeResponse(BaseModel):
    """노드 응답"""
    id: str
    name: str
    revenue: float
    time_spent: float
    x: float
    y: float
    z: float
    synergy: float
    cluster: str
    orbit: str
    mass: float
    momentum: float


class EntanglementCreate(BaseModel):
    """얽힘 생성 요청"""
    node_a: str
    node_b: str
    intensity: float = 0.5
    correlation: float = 0.8
    entanglement_type: str = "synergy"


class ActionRequest(BaseModel):
    """액션 요청"""
    action_type: str
    target_id: str
    params: Dict[str, Any] = {}
    priority: int = 0


class RepositionRequest(BaseModel):
    """노드 재배치 요청"""
    id: str
    x: float
    y: float
    z: float


class SynergyCalculateRequest(BaseModel):
    """시너지 계산 요청"""
    fitness: float
    density: float
    frequency: float
    penalty: float


class LoginRequest(BaseModel):
    """로그인 요청"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """토큰 응답"""
    access_token: str
    token_type: str = "bearer"


# ================================================================
# GLOBAL INSTANCES
# ================================================================

# 통합 엔진
engine = create_engine()

# 스케줄러
scheduler = create_scheduler()

# Redis
redis_client = None


# ================================================================
# LIFESPAN
# ================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 라이프사이클 관리"""
    global redis_client
    
    logger.info("🚀 AUTUS Backend Starting...")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Debug: {settings.DEBUG}")
    
    # Redis 연결
    try:
        redis_client = create_redis_client()
        await redis_client.connect()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.warning(f"⚠️ Redis not available: {e}")
        redis_client = None
    
    # 스케줄러 시작
    scheduler.start()
    logger.info("✅ Scheduler started")
    
    yield
    
    # 종료
    logger.info("🛑 AUTUS Backend Shutting down...")
    scheduler.stop()
    
    if redis_client:
        await redis_client.disconnect()


# ================================================================
# APP INITIALIZATION
# ================================================================

app = FastAPI(
    title="AUTUS API",
    description="Autonomous Twin Universal System - Physics-based Business Intelligence",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# ERROR HANDLERS
# ================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 에러 핸들러"""
    logger.error(f"Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "timestamp": datetime.now().isoformat(),
        }
    )


# ================================================================
# HEALTH & INFO ENDPOINTS
# ================================================================

@app.get("/", tags=["Info"])
async def root():
    """루트 엔드포인트"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health", tags=["Info"])
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "nodes": len(engine.nodes),
        "entanglements": len(engine.entanglements),
        "pending_actions": len(engine.pending_actions),
        "redis": redis_client is not None,
        "scheduler": scheduler.is_running,
        "websocket_connections": ws_manager.get_connection_count(),
    }


@app.get("/stats", tags=["Info"])
async def get_stats():
    """시스템 통계"""
    state = engine.get_system_state()
    return state.to_dict()


# ================================================================
# NODE ENDPOINTS
# ================================================================

@app.get("/api/nodes", response_model=List[Dict], tags=["Nodes"])
async def get_nodes(
    cluster: Optional[str] = Query(None, description="클러스터 필터"),
    orbit: Optional[str] = Query(None, description="궤도 필터"),
    limit: int = Query(100, ge=1, le=1000, description="최대 개수")
):
    """모든 노드 조회"""
    nodes = [node.to_dict() for node in engine.nodes.values()]
    
    if cluster:
        nodes = [n for n in nodes if n["cluster"] == cluster]
    if orbit:
        nodes = [n for n in nodes if n["orbit"] == orbit]
    
    return nodes[:limit]


@app.get("/api/nodes/{node_id}", tags=["Nodes"])
async def get_node(node_id: str):
    """단일 노드 조회"""
    node = engine.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return node.to_dict()


@app.post("/api/nodes", response_model=Dict, tags=["Nodes"])
async def create_node(node_data: NodeCreate, background_tasks: BackgroundTasks):
    """노드 생성"""
    if node_data.id in engine.nodes:
        raise HTTPException(status_code=400, detail="Node already exists")
    
    node = engine.add_node(
        id=node_data.id,
        name=node_data.name,
        revenue=node_data.revenue,
        time_spent=node_data.time_spent,
        fitness=node_data.fitness,
        density=node_data.density,
        frequency=node_data.frequency,
        penalty=node_data.penalty,
        role_probabilities=node_data.role_probabilities,
        tags=node_data.tags,
    )
    
    # WebSocket 브로드캐스트
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "node_added", "data": node.to_dict()}
    )
    
    # Redis Pub/Sub
    if redis_client:
        background_tasks.add_task(
            redis_client.publish,
            "map-updates",
            {"type": "node_added", "data": node.to_dict()}
        )
    
    return node.to_dict()


@app.put("/api/nodes/{node_id}", tags=["Nodes"])
async def update_node(node_id: str, node_data: NodeUpdate, background_tasks: BackgroundTasks):
    """노드 업데이트"""
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    
    update_dict = {k: v for k, v in node_data.model_dump().items() if v is not None}
    
    node = engine.update_node(node_id, **update_dict)
    
    # WebSocket 브로드캐스트
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "node_updated", "data": node.to_dict()}
    )
    
    return node.to_dict()


@app.delete("/api/nodes/{node_id}", tags=["Nodes"])
async def delete_node(node_id: str, background_tasks: BackgroundTasks):
    """노드 삭제"""
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    
    engine.remove_node(node_id)
    
    # WebSocket 브로드캐스트
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "node_removed", "data": {"node_id": node_id}}
    )
    
    return {"status": "deleted", "node_id": node_id}


@app.post("/api/nodes/batch", tags=["Nodes"])
async def create_nodes_batch(nodes: List[NodeCreate], background_tasks: BackgroundTasks):
    """노드 일괄 생성"""
    created = []
    
    for node_data in nodes:
        if node_data.id not in engine.nodes:
            node = engine.add_node(
                id=node_data.id,
                name=node_data.name,
                revenue=node_data.revenue,
                time_spent=node_data.time_spent,
                fitness=node_data.fitness,
                density=node_data.density,
                frequency=node_data.frequency,
                penalty=node_data.penalty,
                role_probabilities=node_data.role_probabilities,
                tags=node_data.tags,
            )
            created.append(node.to_dict())
    
    # 일괄 브로드캐스트
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "batch_added", "data": {"count": len(created)}}
    )
    
    return {"created": len(created), "nodes": created}


# ================================================================
# MAP ENDPOINTS
# ================================================================

@app.get("/api/map", tags=["Map"])
async def get_map():
    """Physics Map 데이터 조회"""
    return engine.export_graph_data()


@app.post("/api/reposition", tags=["Map"])
async def reposition_node(request: RepositionRequest, background_tasks: BackgroundTasks):
    """노드 재배치"""
    if request.id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node = engine.nodes[request.id]
    node.x = request.x
    node.y = request.y
    node.z = request.z
    node.updated_at = datetime.now()
    
    # 클러스터 재분류
    node.cluster = engine._classify_cluster(node)
    node.orbit = engine._classify_orbit(node)
    
    # WebSocket 브로드캐스트
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "node_repositioned", "data": node.to_dict()}
    )
    
    return node.to_dict()


@app.get("/api/clusters", tags=["Map"])
async def get_clusters():
    """클러스터 정보 조회"""
    clusters = {}
    
    for node in engine.nodes.values():
        cluster = node.cluster.value if isinstance(node.cluster, ClusterType) else node.cluster
        if cluster not in clusters:
            clusters[cluster] = {
                "nodes": [],
                "total_value": 0,
                "avg_synergy": 0,
            }
        
        clusters[cluster]["nodes"].append(node.to_dict())
        clusters[cluster]["total_value"] += node.revenue
    
    for cluster, data in clusters.items():
        if data["nodes"]:
            data["avg_synergy"] = sum(n["synergy"] for n in data["nodes"]) / len(data["nodes"])
            data["count"] = len(data["nodes"])
    
    return clusters


@app.get("/api/golden-volume", tags=["Map"])
async def get_golden_volume():
    """골든 볼륨 조회"""
    golden_nodes = [
        node.to_dict()
        for node in engine.nodes.values()
        if node.cluster == ClusterType.GOLDEN
    ]
    
    return {
        "nodes": sorted(golden_nodes, key=lambda n: n["revenue"], reverse=True)[:10],
        "total_value": sum(n["revenue"] for n in golden_nodes),
        "count": len(golden_nodes),
    }


# ================================================================
# ENTANGLEMENT ENDPOINTS
# ================================================================

@app.get("/api/entanglements", tags=["Entanglement"])
async def get_entanglements():
    """모든 얽힘 조회"""
    return [ent.to_dict() for ent in engine.entanglements.values()]


@app.post("/api/entanglements", tags=["Entanglement"])
async def create_entanglement(request: EntanglementCreate, background_tasks: BackgroundTasks):
    """얽힘 생성"""
    ent = engine.create_entanglement(
        node_a=request.node_a,
        node_b=request.node_b,
        intensity=request.intensity,
        correlation=request.correlation,
        entanglement_type=request.entanglement_type,
    )
    
    if not ent:
        raise HTTPException(status_code=400, detail="Could not create entanglement")
    
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "entanglement_created", "data": ent.to_dict()}
    )
    
    return ent.to_dict()


@app.delete("/api/entanglements/{node_a}/{node_b}", tags=["Entanglement"])
async def delete_entanglement(node_a: str, node_b: str):
    """얽힘 삭제"""
    if not engine.remove_entanglement(node_a, node_b):
        raise HTTPException(status_code=404, detail="Entanglement not found")
    
    return {"status": "deleted"}


# ================================================================
# SYNERGY & ENTROPY ENDPOINTS
# ================================================================

@app.post("/api/calculate-synergy", tags=["Physics"])
async def calculate_synergy(request: SynergyCalculateRequest):
    """시너지 강도 계산"""
    synergy = UnifiedPhysicsFormulas.synergy_strength(
        request.fitness,
        request.density,
        request.frequency,
        request.penalty
    )
    
    # 등급 결정
    if synergy >= 0.8:
        grade = "S (화이트홀)"
    elif synergy >= 0.6:
        grade = "A (핵심 연합)"
    elif synergy >= 0.3:
        grade = "B (시너지)"
    elif synergy >= 0:
        grade = "C (중립)"
    elif synergy >= -0.3:
        grade = "D (마찰)"
    else:
        grade = "F (블랙홀)"
    
    return {
        "synergy": round(synergy, 4),
        "grade": grade,
        "recommendation": "증폭" if synergy > 0.7 else "관찰" if synergy > -0.3 else "차단",
    }


@app.get("/api/entropy", tags=["Physics"])
async def get_entropy():
    """엔트로피 조회"""
    entropy = engine.calculate_entropy()
    efficiency = engine.calculate_money_efficiency()
    
    # 레벨 결정
    if entropy >= 10:
        level = "CRITICAL"
    elif entropy >= 5:
        level = "HIGH"
    elif entropy >= 2:
        level = "MEDIUM"
    elif entropy >= 1:
        level = "LOW"
    else:
        level = "OPTIMAL"
    
    return {
        "entropy": entropy,
        "efficiency": efficiency,
        "level": level,
    }


@app.get("/api/entropy/components", tags=["Physics"])
async def get_entropy_components():
    """엔트로피 구성요소 조회"""
    components = engine.get_entropy_components()
    components["total_entropy"] = engine.calculate_entropy()
    return components


@app.get("/api/value", tags=["Physics"])
async def get_system_value():
    """시스템 가치 조회"""
    return {
        "classical_value": engine.calculate_system_value(),
        "quantum_value": engine.calculate_quantum_value(),
        "entropy": engine.calculate_entropy(),
        "efficiency": engine.calculate_money_efficiency(),
    }


# ================================================================
# QUANTUM ENDPOINTS
# ================================================================

@app.get("/api/quantum/state", tags=["Quantum"])
async def get_quantum_state():
    """양자 상태 조회"""
    uncertainty = engine.get_uncertainty_metrics()
    
    return {
        "superpositions": sum(1 for qs in engine.quantum_states.values() if qs.is_superposition),
        "entanglements": len(engine.entanglements),
        "uncertainty": uncertainty,
        "quantum_value": engine.calculate_quantum_value(),
    }


@app.post("/api/quantum/measure/{node_id}", tags=["Quantum"])
async def measure_quantum_state(node_id: str, background_tasks: BackgroundTasks):
    """양자 상태 측정 (붕괴)"""
    if node_id not in engine.quantum_states:
        raise HTTPException(status_code=404, detail="Quantum state not found")
    
    qs = engine.quantum_states[node_id]
    
    if not qs.is_superposition:
        return {
            "node_id": node_id,
            "already_collapsed": True,
            "role": qs.collapsed_role,
        }
    
    role = qs.measure()
    
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "quantum_measured", "data": {"node_id": node_id, "role": role}}
    )
    
    return {
        "node_id": node_id,
        "collapsed_role": role,
        "is_superposition": qs.is_superposition,
    }


# ================================================================
# ACTION ENDPOINTS
# ================================================================

@app.get("/api/actions/pending", tags=["Actions"])
async def get_pending_actions():
    """대기 중인 액션 조회"""
    return engine.pending_actions


@app.get("/api/actions/history", tags=["Actions"])
async def get_action_history(limit: int = Query(100, ge=1, le=1000)):
    """액션 히스토리 조회"""
    return engine.executed_actions[-limit:]


@app.post("/api/actions", tags=["Actions"])
async def queue_action(request: ActionRequest):
    """액션 대기열 추가"""
    if request.target_id not in engine.nodes and request.action_type != "broadcast":
        raise HTTPException(status_code=404, detail="Target node not found")
    
    action = engine.queue_action(
        action_type=request.action_type,
        target_id=request.target_id,
        params=request.params,
        priority=request.priority,
    )
    
    return action


@app.post("/api/actions/execute", tags=["Actions"])
async def execute_actions(background_tasks: BackgroundTasks):
    """대기 액션 실행"""
    executed = engine.execute_pending_actions()
    
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "actions_executed", "data": {"count": len(executed)}}
    )
    
    return {
        "executed": len(executed),
        "actions": executed,
    }


# ================================================================
# AUTO-OPTIMIZATION ENDPOINTS
# ================================================================

@app.get("/api/auto-optimize/recommendations", tags=["Optimization"])
async def get_optimization_recommendations():
    """자동화 추천 조회"""
    return {"actions": engine.get_optimization_recommendations()}


@app.post("/api/auto-optimize/execute", tags=["Optimization"])
async def execute_auto_optimization(background_tasks: BackgroundTasks):
    """자동 최적화 실행"""
    result = engine.run_auto_optimization()
    executed = engine.execute_pending_actions()
    
    background_tasks.add_task(
        ws_manager.broadcast_all,
        {"type": "optimization_complete", "data": result}
    )
    
    state = engine.get_system_state()
    
    return {
        "status": "completed",
        "actions_executed": len(executed),
        "new_state": state.to_dict(),
    }


# ================================================================
# ORBIT STRATEGY ENDPOINTS
# ================================================================

@app.get("/api/orbits", tags=["Orbits"])
async def get_orbits():
    """궤도 정보 조회"""
    orbits = {
        "SAFETY": {"nodes": [], "description": "안전 궤도 - 리텐션"},
        "ACQUISITION": {"nodes": [], "description": "영입 궤도 - 신규"},
        "REVENUE": {"nodes": [], "description": "수익 궤도 - 업셀"},
        "EJECT": {"nodes": [], "description": "이탈 궤도 - 제거"},
    }
    
    for node in engine.nodes.values():
        orbit = node.orbit.value if isinstance(node.orbit, OrbitType) else node.orbit
        if orbit in orbits:
            orbits[orbit]["nodes"].append(node.to_dict())
    
    for orbit_data in orbits.values():
        orbit_data["count"] = len(orbit_data["nodes"])
    
    return orbits


# ================================================================
# WEBSOCKET ENDPOINTS
# ================================================================

@app.websocket("/ws/map")
async def websocket_map(websocket: WebSocket):
    """실시간 Map 업데이트 WebSocket"""
    await ws_manager.connect(websocket, "map")
    
    try:
        # 초기 데이터 전송
        await websocket.send_json({
            "type": "initial",
            "data": engine.export_graph_data(),
        })
        
        # 클라이언트 메시지 처리
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "reposition":
                node_id = data.get("id")
                if node_id in engine.nodes:
                    node = engine.nodes[node_id]
                    node.x = data.get("x", node.x)
                    node.y = data.get("y", node.y)
                    node.z = data.get("z", node.z)
                    
                    await ws_manager.broadcast({
                        "type": "node_updated",
                        "data": node.to_dict(),
                    }, "map")
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@app.websocket("/ws/stats")
async def websocket_stats(websocket: WebSocket):
    """실시간 통계 WebSocket"""
    await ws_manager.connect(websocket, "stats")
    
    try:
        while True:
            # 5초마다 상태 전송
            state = engine.get_system_state()
            
            await websocket.send_json({
                "type": "stats",
                "data": state.to_dict(),
            })
            
            await asyncio.sleep(5)
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ================================================================
# AUTHENTICATION ENDPOINTS
# ================================================================

auth_handler = AuthHandler()


@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(request: LoginRequest):
    """로그인"""
    # 간단한 인증 (실제로는 DB 조회)
    if request.username == "admin" and request.password == "autus2025":
        token = auth_handler.create_token({"sub": request.username, "role": "admin"})
        return TokenResponse(access_token=token)
    
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/auth/me", tags=["Auth"])
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보"""
    return {"username": current_user.get("sub"), "role": current_user.get("role")}


# ================================================================
# EXPORT ENDPOINTS
# ================================================================

@app.get("/api/export/json", tags=["Export"])
async def export_json():
    """상태 JSON 내보내기"""
    return json.loads(engine.export_state_json())


@app.get("/api/export/graph", tags=["Export"])
async def export_graph():
    """그래프 데이터 내보내기"""
    return engine.export_graph_data()


@app.post("/api/import/nodes", tags=["Export"])
async def import_nodes(nodes: List[Dict]):
    """노드 일괄 임포트"""
    imported = engine.import_nodes(nodes)
    return {"imported": imported}


# ================================================================
# SCHEDULER ENDPOINTS
# ================================================================

@app.get("/api/scheduler/status", tags=["Scheduler"])
async def get_scheduler_status():
    """스케줄러 상태 조회"""
    return {
        "is_running": scheduler.is_running,
        "jobs": scheduler.get_jobs(),
    }


@app.post("/api/scheduler/trigger/{job_name}", tags=["Scheduler"])
async def trigger_job(job_name: str):
    """수동 작업 트리거"""
    try:
        scheduler.trigger_job(job_name)
        return {"status": "triggered", "job": job_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================================================================
# RUN
# ================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS,
    )

