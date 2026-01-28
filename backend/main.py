"""
═══════════════════════════════════════════════════════════════════════════════
                    AUTUS API Server v4.2.0
                    
    통합 실행 버전 - 모든 모듈 연결
    
    Features:
    - 6 Physics Engine (72 노드)
    - K/I Physics (48노드 + 144슬롯)
    - DAROE 자동화 루프
    - OAuth 데이터 수집 (Gmail, Calendar, Slack)
    - PostgreSQL + Redis 연결
    - SSE 실시간 스트리밍
═══════════════════════════════════════════════════════════════════════════════
"""

# .env 파일 로드 (최우선)
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
import os
import sys
import time
import warnings
import asyncio
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger("autus")

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ═══════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════

# 기본 설정
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
VERSION = os.getenv("VERSION", "4.2.0")

# 데이터 디렉토리
DATA_DIR = os.getenv("AUTUS_DATA_DIR", "./autus_data")

# PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://autus:autus@localhost:5432/autus"
)

# Redis (선택)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터베이스 연결
# ═══════════════════════════════════════════════════════════════════════════════

db_pool = None
redis_client = None

async def init_db():
    """PostgreSQL 연결 초기화"""
    global db_pool
    try:
        import asyncpg
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        logger.info("✅ PostgreSQL 연결 성공")
        return True
    except ImportError:
        logger.warning("⚠️ asyncpg 미설치 - DB 기능 비활성화")
        return False
    except Exception as e:
        logger.warning(f"⚠️ PostgreSQL 연결 실패: {e}")
        return False

async def init_redis():
    """Redis 연결 초기화"""
    global redis_client
    try:
        import redis.asyncio as aioredis
        redis_client = await aioredis.from_url(REDIS_URL)
        await redis_client.ping()
        logger.info("✅ Redis 연결 성공")
        return True
    except ImportError:
        logger.warning("⚠️ redis 미설치 - 캐시 비활성화")
        return False
    except Exception as e:
        logger.warning(f"⚠️ Redis 연결 실패: {e}")
        return False

async def get_db():
    """DB 커넥션 의존성"""
    if db_pool:
        async with db_pool.acquire() as conn:
            yield conn
    else:
        yield None


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 엔진
# ═══════════════════════════════════════════════════════════════════════════════

# 통합 Physics 엔진 (v14.0)
try:
    from core import (
        UnifiedEngine, MotionEvent,
        Physics, Motion, Domain,
        PHYSICS_INFO, MOTION_INFO
    )
    engine = UnifiedEngine(DATA_DIR)
    logger.info("✅ 통합 Physics 엔진 로드 (v14.0)")
except ImportError as e:
    logger.warning(f"⚠️ Physics 엔진 미사용: {e}")
    engine = None
    Physics = None
    Motion = None
    PHYSICS_INFO = {}
    MOTION_INFO = {}


# K/I Physics 엔진 (v4.0)
try:
    from physics.ki_physics import KIPhysicsEngine
    ki_engine = KIPhysicsEngine()
    logger.info("✅ K/I Physics 엔진 로드")
except ImportError as e:
    logger.warning(f"⚠️ K/I Physics 엔진 미사용: {e}")
    ki_engine = None


# ═══════════════════════════════════════════════════════════════════════════════
# Lifespan 이벤트
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    # Startup
    logger.info("🚀 AUTUS 서버 시작...")
    
    await init_db()
    await init_redis()
    
    # K/I WebSocket 하트비트
    try:
        from websocket import ki_heartbeat_task, init_ki_demo_data
        asyncio.create_task(ki_heartbeat_task())
        await init_ki_demo_data()
        logger.info("✅ K/I 실시간 모드 활성화")
    except ImportError:
        pass
    
    logger.info(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           AUTUS API v{VERSION}                                  ║
║                   Universal Engine for 8 Billion Humans                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   📊 Physics Engines:                                                        ║
║       - 6 Physics × 12 Motion = 72 Nodes                                     ║
║       - K/I Physics: 48 Nodes + 144 Slots                                    ║
║                                                                              ║
║   🔌 Integrations:                                                           ║
║       - OAuth: Gmail, Calendar, Slack, GitHub, Notion                        ║
║       - DB: PostgreSQL {'✅' if db_pool else '❌'}                               ║
║       - Cache: Redis {'✅' if redis_client else '❌'}                            ║
║                                                                              ║
║   📚 Docs: http://localhost:8000/docs                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    yield
    
    # Shutdown
    logger.info("🛑 AUTUS 서버 종료...")
    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI 앱
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS API",
    description="AUTUS Universal Engine - K/I Physics + 6 Physics 통합",
    version=VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS - 허용된 도메인만 (보안 강화)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3000",
    "http://localhost:3003",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "https://autus.ai",
    "https://www.autus.ai",
    "https://autus-ai.com",
    "https://www.autus-ai.com",
    "https://glittery-cassata-31f5d3.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# GZip
app.add_middleware(GZipMiddleware, minimum_size=500)


# ═══════════════════════════════════════════════════════════════════════════════
# 안전한 라우터 등록
# ═══════════════════════════════════════════════════════════════════════════════

def _include_router_safe(app, module, name: str):
    """안전한 라우터 등록"""
    if module and hasattr(module, 'router'):
        app.include_router(module.router)
        logger.info(f"  ✅ {name}")
    else:
        logger.debug(f"  ⏭️ {name} (미사용)")

logger.info("📦 라우터 등록 시작...")

# ─────────────────────────────────────────────────────────────
# Core Routers (v1.x ~ v3.x)
# ─────────────────────────────────────────────────────────────

# Auth
try:
    from auth import router as auth_router
    app.include_router(auth_router)
    logger.info("  ✅ auth_router")
except ImportError:
    pass

# API Modules
try:
    from api import (
        audit_api, autus_api, edge_api, efficiency_api,
        flow_api, keyman_api, notification_api, ontology_api,
        person_score_api, scale_api, strategy_api, unified_api,
        viewport_api, reliance_api, collection_api,
    )
    _include_router_safe(app, audit_api, "audit_api")
    _include_router_safe(app, autus_api, "autus_api")
    _include_router_safe(app, edge_api, "edge_api")
    _include_router_safe(app, efficiency_api, "efficiency_api")
    _include_router_safe(app, flow_api, "flow_api")
    _include_router_safe(app, keyman_api, "keyman_api")
    _include_router_safe(app, notification_api, "notification_api")
    _include_router_safe(app, ontology_api, "ontology_api")
    _include_router_safe(app, person_score_api, "person_score_api")
    _include_router_safe(app, scale_api, "scale_api")
    _include_router_safe(app, strategy_api, "strategy_api")
    _include_router_safe(app, unified_api, "unified_api")
    _include_router_safe(app, viewport_api, "viewport_api")
    _include_router_safe(app, reliance_api, "reliance_api")
    _include_router_safe(app, collection_api, "collection_api")
except ImportError as e:
    logger.warning(f"  ⚠️ API 모듈 로드 실패: {e}")

# Extended APIs
for api_name in ["sovereign_api", "injection_api", "pipeline_api", "autus_unified_api"]:
    try:
        module = __import__(f"api.{api_name}", fromlist=[api_name])
        _include_router_safe(app, module, api_name)
    except ImportError:
        pass

# ─────────────────────────────────────────────────────────────
# AUTUS 2.0 Views API (11개 뷰)
# ─────────────────────────────────────────────────────────────
try:
    from routers import views_api
    app.include_router(views_api.router)
    logger.info("  ✅ Views API (11개 뷰) 등록 완료")
except ImportError as e:
    logger.warning(f"  ⚠️ Views API 로드 실패: {e}")

# ─────────────────────────────────────────────────────────────
# K/I Physics Routers (v4.x)
# ─────────────────────────────────────────────────────────────

# v4.0 K/I API (기본)
try:
    from api import ki_api, automation_api
    _include_router_safe(app, ki_api, "ki_api (v4.0)")
    _include_router_safe(app, automation_api, "automation_api")
except ImportError:
    pass

# v4.1 K/I Router (통합 - autus_api_integration)
try:
    from routers.ki_router import router as ki_router_v2
    app.include_router(ki_router_v2)
    logger.info("  ✅ ki_router (v4.1)")
except ImportError as e:
    logger.debug(f"  ⏭️ ki_router: {e}")

# v4.2 OAuth Router (autus_oauth_collectors)
try:
    from routers.oauth_router import router as oauth_router
    app.include_router(oauth_router)
    logger.info("  ✅ oauth_router (v4.2)")
except ImportError as e:
    logger.debug(f"  ⏭️ oauth_router: {e}")

# v4.3 Task Router (570개 업무 K/I/r 개인화)
try:
    from routers.task_router import router as task_router
    app.include_router(task_router)
    logger.info("  ✅ task_router (v4.3 - 570 Tasks)")
except ImportError as e:
    logger.debug(f"  ⏭️ task_router: {e}")


# v5.0 Task 570 Router (8그룹 570개 업무 + K/I/Ω 물리 엔진)
try:
    from routers.task_570_router import router as task_570_router
    app.include_router(task_570_router)
    # 570개 업무 사전 로드
    from routers.task_570_router import load_570_tasks
    loaded = load_570_tasks()
    logger.info(f"  ✅ task_570_router (v5.0 - {loaded}개 업무 로드)")
except ImportError as e:
    logger.debug(f"  ⏭️ task_570_router: {e}")


# v6.0 Turnkey Router (산업별 턴키 솔루션)
try:
    from routers.turnkey_router import router as turnkey_router
    app.include_router(turnkey_router)
    logger.info("  ✅ turnkey_router (v6.0 - 산업별 턴키 솔루션)")
except ImportError as e:
    logger.debug(f"  ⏭️ turnkey_router: {e}")

# ─────────────────────────────────────────────────────────────
# LangGraph Integration (v7.0 - TypeDB + Pinecone + GRPO)
# ─────────────────────────────────────────────────────────────
try:
    from routers.langgraph_router import router as langgraph_router
    app.include_router(langgraph_router)
    logger.info("  ✅ langgraph_router (v7.0 - TypeDB + Pinecone + GRPO)")
except ImportError as e:
    logger.debug(f"  ⏭️ langgraph_router: {e}")

# ─────────────────────────────────────────────────────────────
# v8.0 Self-Setup Router (AUTUS가 스스로 환경 구성)
# ─────────────────────────────────────────────────────────────
try:
    from routers.setup_router import router as setup_router
    app.include_router(setup_router)
    logger.info("  ✅ setup_router (v8.0 - Self-Building System)")
except ImportError as e:
    logger.debug(f"  ⏭️ setup_router: {e}")

# ─────────────────────────────────────────────────────────────
# v9.0 Task 1000 Generator (30모듈 × 1,000개 업무 자동 생성)
# ─────────────────────────────────────────────────────────────
try:
    from routers.task_1000_router import router as task_1000_router
    app.include_router(task_1000_router)
    logger.info("  ✅ task_1000_router (30모듈 × 1,000 Tasks)")
except ImportError as e:
    logger.debug(f"  ⏭️ task_1000_router: {e}")

# ─────────────────────────────────────────────────────────────
# v10.0 Self-Running Engine (AUTUS 자율 실행)
# ─────────────────────────────────────────────────────────────
try:
    from routers.self_running_router import router as self_running_router
    app.include_router(self_running_router)
    logger.info("  ✅ self_running_router (v10.0 - 자율 실행 엔진)")
except ImportError as e:
    logger.debug(f"  ⏭️ self_running_router: {e}")

# ─────────────────────────────────────────────────────────────
# v11.0 Real-time Streaming (SSE + Chain of Thought)
# ─────────────────────────────────────────────────────────────
try:
    from routers.stream_router import router as stream_router
    app.include_router(stream_router)
    logger.info("  ✅ stream_router (v11.0 - 실시간 스트리밍)")
except ImportError as e:
    logger.debug(f"  ⏭️ stream_router: {e}")

# ─────────────────────────────────────────────────────────────
# v12.0 Self-Evolution Feedback (자가발전 피드백 시스템)
# ─────────────────────────────────────────────────────────────
try:
    from routers.feedback_router import router as feedback_router
    app.include_router(feedback_router)
    logger.info("  ✅ feedback_router (v12.0 - 자가발전 피드백)")
except ImportError as e:
    logger.debug(f"  ⏭️ feedback_router: {e}")

# ─────────────────────────────────────────────────────────────
# v13.0 Kernel - The Stealth Standard (EP10)
# ─────────────────────────────────────────────────────────────
try:
    from routers.kernel_router import router as kernel_router
    app.include_router(kernel_router)
    logger.info("  ✅ kernel_router (v13.0 - ABL-R + Smart Router + Proof Pack)")
except ImportError as e:
    logger.debug(f"  ⏭️ kernel_router: {e}")


# ─────────────────────────────────────────────────────────────
# v14.0 Auto-Provisioning (외부 서비스 자동 설정)
# ─────────────────────────────────────────────────────────────
try:
    from routers.provision_router import router as provision_router
    app.include_router(provision_router)
    logger.info("  ✅ provision_router (v14.0 - 외부 서비스 자동 설정)")
except ImportError as e:
    logger.debug(f"  ⏭️ provision_router: {e}")

# ─────────────────────────────────────────────────────────────
# v14.0 Full Integration Hub (OAuth + Data Collection)
# ─────────────────────────────────────────────────────────────
try:
    from routers.integration_router import router as integration_router
    app.include_router(integration_router)
    logger.info("  ✅ integration_router (v14.0 - OAuth 풀 연동)")
except ImportError as e:
    logger.debug(f"  ⏭️ integration_router: {e}")

# ─────────────────────────────────────────────────────────────
# v14.0 Auto-Sync & AI Analysis
# ─────────────────────────────────────────────────────────────
try:
    from routers.sync_router import router as sync_router
    app.include_router(sync_router)
    logger.info("  ✅ sync_router (v14.0 - 자동 동기화 + AI 분석)")
except ImportError as e:
    logger.debug(f"  ⏭️ sync_router: {e}")

# ─────────────────────────────────────────────────────────────
# v15.0 Core Physics & Monitoring (핵심 기능 활성화)
# ─────────────────────────────────────────────────────────────
try:
    from routers.v_router import router as v_router
    app.include_router(v_router)
    logger.info("  ✅ v_router (v15.0 - V 공식 계산 엔진)")
except ImportError as e:
    logger.debug(f"  ⏭️ v_router: {e}")

try:
    from routers.monitoring_router import router as monitoring_router
    app.include_router(monitoring_router)
    logger.info("  ✅ monitoring_router (v15.0 - 시스템 모니터링)")
except ImportError as e:
    logger.debug(f"  ⏭️ monitoring_router: {e}")

try:
    from routers.typedb_router import router as typedb_router
    app.include_router(typedb_router)
    logger.info("  ✅ typedb_router (v15.0 - TypeDB 통합)")
except ImportError as e:
    logger.debug(f"  ⏭️ typedb_router: {e}")

try:
    from routers.automation_router import router as automation_router
    app.include_router(automation_router)
    logger.info("  ✅ automation_router (v15.0 - 업무 자동화)")
except ImportError as e:
    logger.debug(f"  ⏭️ automation_router: {e}")

# ─────────────────────────────────────────────────────────────
# Extended API Modules (추가 API 모듈)
# ─────────────────────────────────────────────────────────────
for api_name in ["solution_api", "modules_api", "readonly_api"]:
    try:
        module = __import__(f"api.{api_name}", fromlist=[api_name])
        _include_router_safe(app, module, api_name)
    except ImportError:
        pass


# Portal API (Frontend 연동)
try:
    from api.portal_api import router as portal_router
    app.include_router(portal_router)
    logger.info("  ✅ portal_api (Frontend Portal)")
except ImportError as e:
    logger.debug(f"  ⏭️ portal_api: {e}")

# UI Connectivity API (Component Spec)
try:
    from api.ui_connectivity_api import router as ui_connectivity_router
    app.include_router(ui_connectivity_router)
    logger.info("  ✅ ui_connectivity_api (UI Component Spec)")
except ImportError as e:
    logger.debug(f"  ⏭️ ui_connectivity_api: {e}")

# ─────────────────────────────────────────────────────────────
# WebSocket Routers
# ─────────────────────────────────────────────────────────────

try:
    from websocket import ki_ws_router, ki_http_router
    app.include_router(ki_ws_router)
    app.include_router(ki_http_router)
    logger.info("  ✅ ki_websocket")
except ImportError:
    pass

logger.info("📦 라우터 등록 완료!")


# ═══════════════════════════════════════════════════════════════════════════════
# API Models
# ═══════════════════════════════════════════════════════════════════════════════

class MotionRequest(BaseModel):
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


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: float
    components: Dict[str, bool]


# ═══════════════════════════════════════════════════════════════════════════════
# Core Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["System"])
async def root():
    """서버 정보"""
    return {
        "name": "AUTUS API",
        "version": VERSION,
        "description": "Universal Engine for 8 Billion Humans",
        "engines": {
            "6_physics": {
                "enabled": engine is not None,
                "nodes": 72,
                "physics": 6,
                "motions": 12
            },
            "ki_physics": {
                "enabled": ki_engine is not None,
                "nodes": 48,
                "slots": 144,
                "phases": 4
            }
        },
        "integrations": {
            "database": db_pool is not None,
            "redis": redis_client is not None,
            "oauth": bool(GOOGLE_CLIENT_ID)
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "state": "/state",
            "ki": "/api/ki",
            "oauth": "/api/oauth"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """헬스 체크"""
    components = {
        "6_physics_engine": engine is not None,
        "ki_physics_engine": ki_engine is not None,
        "database": db_pool is not None,
        "redis": redis_client is not None
    }
    
    # DB 실제 연결 확인
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
        except:
            components["database"] = False
    
    # Redis 실제 연결 확인
    if redis_client:
        try:
            await redis_client.ping()
        except:
            components["redis"] = False
    
    all_healthy = all([
        components["6_physics_engine"] or components["ki_physics_engine"],
    ])
    
    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        version=VERSION,
        timestamp=time.time(),
        components=components
    )


@app.get("/ready", tags=["System"])
async def readiness():
    """Kubernetes readiness probe"""
    if not (engine or ki_engine):
        raise HTTPException(503, "No engine available")
    return {"ready": True}


@app.get("/live", tags=["System"])
async def liveness():
    """Kubernetes liveness probe"""
    return {"live": True}


# ═══════════════════════════════════════════════════════════════════════════════
# 6 Physics Endpoints (기존 호환)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/state", tags=["6 Physics"])
async def get_state(
    slim: bool = Query(False, description="슬림 응답"),
    fields: Optional[str] = Query(None, description="콤마 구분 필드")
):
    """6 Physics 상태 조회"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    
    state = engine.get_state_dict()
    total_energy = round(sum(engine.get_state()), 4)
    
    if fields:
        wanted = {f.strip() for f in fields.split(",") if f.strip()}
        return {k: v for k, v in state.items() if k in wanted}
    
    if slim:
        return {"s": list(state.values()), "e": total_energy}
    
    return {**state, "total_energy": total_energy}


@app.get("/state/{physics}", tags=["6 Physics"])
async def get_physics_state(physics: str):
    """단일 Physics 상태"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    
    try:
        value = engine.get_physics(physics)
        info = PHYSICS_INFO.get(Physics[physics], {})
        return {
            "physics": physics,
            "value": round(value, 4),
            "name_ko": info.get("name_ko", physics),
            "half_life_days": info.get("half_life_days", 0),
            "inertia": info.get("inertia", 0)
        }
    except (KeyError, AttributeError):
        raise HTTPException(404, f"Unknown physics: {physics}")


@app.post("/motion", tags=["6 Physics"])
async def apply_motion(req: MotionRequest):
    """Motion 적용"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    
    try:
        result = engine.apply(
            physics=req.physics,
            motion=req.motion,
            delta=req.delta,
            friction=req.friction,
            source=req.source
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/nodes", tags=["6 Physics"])
async def list_nodes(
    physics: Optional[str] = None,
    motion: Optional[str] = None
):
    """72 노드 목록"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    
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


@app.get("/project", tags=["6 Physics"])
async def project():
    """6D → 9 UI Ports 투영"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    return {"type": "ui_ports", "count": 9, "values": engine.project()}


@app.get("/domains", tags=["6 Physics"])
async def domains():
    """6D → 3 Domains 투영"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    return {"type": "domains", "count": 3, "values": engine.project_domains()}


@app.get("/gates", tags=["6 Physics"])
async def get_all_gates():
    """모든 Physics Gate"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    return engine.evaluate_all_gates()


@app.post("/tick", tags=["6 Physics"])
async def tick():
    """시간 경과 (감쇠)"""
    if not engine:
        raise HTTPException(503, "6 Physics 엔진 미사용")
    decay = engine.tick()
    return {"success": True, "decay": decay, "state": engine.get_state_dict()}


# ═══════════════════════════════════════════════════════════════════════════════
# System Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/info", tags=["System"])
async def info():
    """엔진 정보"""
    result = {
        "version": VERSION,
        "debug": DEBUG,
        "data_dir": DATA_DIR
    }
    
    if engine:
        result["6_physics"] = engine.info()
    
    return result


@app.post("/reset", tags=["System"])
async def reset():
    """상태 초기화"""
    if engine:
        engine.reset()
    return {"success": True, "message": "Reset complete"}


@app.get("/metrics", tags=["System"])
async def metrics():
    """Prometheus 메트릭"""
    result = {
        "timestamp": time.time(),
        "version": VERSION
    }
    
    if engine:
        info = engine.info()
        result["6_physics"] = {
            "total_energy": info.get("total_energy", 0),
            "motion_counts": info.get("motion_counts", {}),
            "log_size_bytes": info.get("log_size_bytes", 0)
        }
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Reference Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/ref/physics", tags=["Reference"])
async def ref_physics():
    """Physics 레퍼런스"""
    if not Physics:
        return {"error": "Physics not available"}
    return {
        p.name: {"value": p.value, **PHYSICS_INFO.get(p, {})}
        for p in Physics
    }


@app.get("/ref/motions", tags=["Reference"])
async def ref_motions():
    """Motion 레퍼런스"""
    if not Motion:
        return {"error": "Motion not available"}
    return {
        m.name: {"value": m.value, **MOTION_INFO.get(m, {})}
        for m in Motion
    }


@app.get("/ref/nodes48", tags=["Reference"])
async def ref_nodes48():
    """48노드 레퍼런스"""
    return {
        "total": 48,
        "domains": [
            {"name": "SURVIVE", "prefix": "S", "nodes": 12},
            {"name": "GROW", "prefix": "G", "nodes": 12},
            {"name": "RELATE", "prefix": "R", "nodes": 12},
            {"name": "EXPRESS", "prefix": "E", "nodes": 12}
        ],
        "node_types": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
        "examples": [
            "CASH_A", "CASH_B", "TIME_A", "SKILL_D",
            "NET_A", "FAMILY_B", "BRAND_C", "LEGACY_D"
        ]
    }


@app.get("/ref/slots144", tags=["Reference"])
async def ref_slots144():
    """144슬롯 레퍼런스"""
    return {
        "total": 144,
        "slot_types": [
            {"name": "FAMILY", "max": 12},
            {"name": "FRIEND", "max": 24},
            {"name": "COLLEAGUE", "max": 36},
            {"name": "MENTOR", "max": 6},
            {"name": "MENTEE", "max": 12},
            {"name": "PARTNER", "max": 6},
            {"name": "COMMUNITY", "max": 48}
        ],
        "description": "144개의 관계 슬롯 - I-Index 계산에 사용"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Error Handlers
# ═══════════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """글로벌 예외 핸들러"""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if DEBUG else "An error occurred",
            "path": str(request.url.path)
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=DEBUG,
        log_level="debug" if DEBUG else "info"
    )
