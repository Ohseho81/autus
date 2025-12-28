"""
AUTUS Production API Server
===========================

상용화 버전 메인 서버

Version: 1.0.0
Status: PRODUCTION
"""

import os
from contextlib import asynccontextmanager
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# AUTUS Modules
from .db import init_db, get_db, Repository
from .db.models import UserModel
from .auth import (
    create_access_token, 
    get_password_hash, 
    verify_password,
    get_current_user,
    get_current_user_optional
)
from .middleware import setup_error_handlers, LoggingMiddleware, setup_logging
from .autus_state import (
    AutusState, state_to_dict, canonical_json, sha256_short,
    clamp01, STORE
)
from .commit_pipeline import commit_apply
from .validators import validate_page1_patch, validate_page2_patch, validate_page3_patch

# ================================================================
# CONFIGURATION
# ================================================================

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080").split(",")
API_VERSION = "1.0.0"


# ================================================================
# LIFESPAN
# ================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행"""
    # Startup
    setup_logging()
    init_db()
    yield
    # Shutdown
    pass


# ================================================================
# APP INITIALIZATION
# ================================================================

app = FastAPI(
    title="AUTUS Kernel Service",
    description="결정론적 물리 엔진 API",
    version=API_VERSION,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware
app.add_middleware(LoggingMiddleware)

# Error Handlers
setup_error_handlers(app)


# ================================================================
# SCHEMAS
# ================================================================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class DraftUpdateRequest(BaseModel):
    version: str = "autus.draft.patch.v1"
    session_id: str
    t_ms: int
    page: int = Field(..., ge=1, le=3)
    patch: dict


class CommitRequest(BaseModel):
    version: str = "autus.commit.v1"
    session_id: str
    t_ms: int
    commit_reason: str = "USER_COMMIT"
    options: dict = Field(default_factory=dict)


class MarkerRequest(BaseModel):
    version: str = "autus.marker.v1"
    session_id: str
    t_ms: int
    state_hash: str
    prev_hash: Optional[str] = None
    label: Optional[str] = None


# ================================================================
# HEALTH ENDPOINTS
# ================================================================

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "version": API_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "AUTUS Kernel",
        "version": API_VERSION,
        "status": "running"
    }


# ================================================================
# AUTH ENDPOINTS
# ================================================================

@app.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db=Depends(get_db)):
    """사용자 등록"""
    repo = Repository(db)
    
    # 중복 확인
    if repo.get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 사용자명입니다"
        )
    
    # 사용자 생성
    password_hash = get_password_hash(user_data.password)
    user = repo.create_user(
        username=user_data.username,
        password_hash=password_hash,
        email=user_data.email
    )
    
    # 토큰 생성
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # 감사 로그
    repo.log_action("REGISTER", user_id=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, db=Depends(get_db)):
    """로그인"""
    repo = Repository(db)
    
    user = repo.get_user_by_username(credentials.username)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="잘못된 사용자명 또는 비밀번호입니다"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )
    
    # 토큰 생성
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # 감사 로그
    repo.log_action(
        "LOGIN",
        user_id=user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보"""
    return current_user


# ================================================================
# STATE ENDPOINTS
# ================================================================

@app.get("/state")
async def get_state(
    session_id: str = Query(...),
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """현재 물리 상태 조회"""
    repo = Repository(db)
    
    # DB에서 세션 조회
    db_session = repo.get_session(session_id)
    
    if db_session and db_session.state_json:
        # DB에서 복원
        return db_session.state_json
    
    # In-memory에서 조회 또는 생성
    state = STORE.get_or_create(session_id)
    state_dict = state_to_dict(state)
    
    # DB에 저장
    if not db_session:
        user_id = current_user["id"] if current_user else None
        repo.create_session(session_id, user_id, state_dict)
    
    return state_dict


@app.post("/draft/update")
async def update_draft(
    req: DraftUpdateRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """Draft 업데이트 (SIM 모드)"""
    repo = Repository(db)
    
    # 상태 가져오기
    state = STORE.get_or_create(req.session_id)
    
    # SIM 모드로 전환
    if state.ui.mode == "LIVE":
        state.ui.mode = "SIM"
    
    # 페이지별 패치 검증 및 적용
    if req.page == 1:
        validated = validate_page1_patch(req.patch)
        if "mass_modifier" in validated:
            state.draft.page1.mass_modifier = validated["mass_modifier"]
        if "volume_override" in validated:
            state.draft.page1.volume_override = validated["volume_override"]
        if "horizon_override" in validated:
            state.draft.page1.horizon_override = validated["horizon_override"]
    
    elif req.page == 2:
        validated = validate_page2_patch(req.patch)
        if "ops" in validated:
            state.draft.page2.ops.extend(validated["ops"])
        if "mass_filter" in validated:
            state.draft.page2.mass_filter = validated["mass_filter"]
        if "flow_filter" in validated:
            state.draft.page2.flow_filter = validated["flow_filter"]
    
    elif req.page == 3:
        validated = validate_page3_patch(req.patch)
        if "allocations" in validated:
            state.draft.page3.allocations = validated["allocations"]
    
    # 타임스탬프 업데이트
    state.t_ms = req.t_ms
    
    # DB 저장
    state_dict = state_to_dict(state)
    repo.update_session_state(req.session_id, state_dict, state.ui.mode)
    
    return {
        "success": True,
        "state": state_dict,
        "mode": state.ui.mode
    }


@app.post("/commit")
async def commit(
    req: CommitRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """Draft를 LIVE로 커밋"""
    repo = Repository(db)
    
    # 상태 가져오기
    state = STORE.get_or_create(req.session_id)
    
    # 커밋 실행
    result = commit_apply(
        state,
        t_ms=req.t_ms,
        create_marker=req.options.get("create_marker", True),
        marker_label=req.options.get("marker_label")
    )
    
    # DB 저장
    state_dict = state_to_dict(state)
    repo.update_session_state(req.session_id, state_dict, "LIVE")
    repo.increment_commit_count(req.session_id)
    
    # 마커 저장
    if result["commit"]["marker_required"]:
        marker_payload = result["commit"]["marker_payload"]
        latest_marker = repo.get_latest_marker(req.session_id)
        prev_hash = latest_marker.chain_hash if latest_marker else None
        
        marker_id = f"m_{req.t_ms}_{marker_payload['state_hash'][:8]}"
        chain_hash = sha256_short(canonical_json({
            "prev": prev_hash,
            "state": marker_payload["state_hash"],
            "t_ms": req.t_ms
        }))
        
        repo.create_marker(
            marker_id=marker_id,
            session_id=req.session_id,
            state_hash=marker_payload["state_hash"],
            chain_hash=chain_hash,
            physics_snapshot=state_dict["measure"],
            t_ms=req.t_ms,
            prev_hash=prev_hash,
            label=marker_payload.get("label")
        )
    
    # 감사 로그
    repo.log_action(
        "COMMIT",
        session_id=req.session_id,
        user_id=current_user["id"] if current_user else None,
        details={"reason": req.commit_reason}
    )
    
    return {
        "success": True,
        "state_hash": result["commit"]["marker_payload"]["state_hash"],
        "processing_steps": result["processing_steps"],
        "mode": "LIVE"
    }


@app.post("/replay/marker")
async def create_marker(
    req: MarkerRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """리플레이 마커 생성"""
    repo = Repository(db)
    
    # 상태 가져오기
    state = STORE.get_or_create(req.session_id)
    state_dict = state_to_dict(state)
    
    # 체인 해시 생성
    chain_hash = sha256_short(canonical_json({
        "prev": req.prev_hash,
        "state": req.state_hash,
        "t_ms": req.t_ms
    }))
    
    # 마커 ID
    marker_id = f"m_{req.t_ms}_{req.state_hash[:8]}"
    
    # DB 저장
    marker = repo.create_marker(
        marker_id=marker_id,
        session_id=req.session_id,
        state_hash=req.state_hash,
        chain_hash=chain_hash,
        physics_snapshot=state_dict["measure"],
        t_ms=req.t_ms,
        prev_hash=req.prev_hash,
        label=req.label
    )
    
    return {
        "success": True,
        "marker": {
            "id": marker.marker_id,
            "state_hash": marker.state_hash,
            "chain_hash": marker.chain_hash,
            "t_ms": marker.t_ms,
            "label": marker.label
        }
    }


@app.get("/replay/markers")
async def get_markers(
    session_id: str = Query(...),
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """세션의 모든 마커 조회"""
    repo = Repository(db)
    markers = repo.get_session_markers(session_id)
    
    return {
        "session_id": session_id,
        "count": len(markers),
        "markers": [
            {
                "id": m.marker_id,
                "state_hash": m.state_hash,
                "chain_hash": m.chain_hash,
                "t_ms": m.t_ms,
                "label": m.label,
                "created_at": m.created_at.isoformat()
            }
            for m in markers
        ]
    }


# ================================================================
# DATA EXPORT/DELETE
# ================================================================

@app.get("/export")
async def export_data(
    session_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """사용자 데이터 내보내기"""
    repo = Repository(db)
    
    db_session = repo.get_session(session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    
    markers = repo.get_session_markers(session_id)
    
    return {
        "session_id": session_id,
        "state": db_session.state_json,
        "markers": [
            {
                "id": m.marker_id,
                "state_hash": m.state_hash,
                "physics": m.physics_snapshot,
                "t_ms": m.t_ms
            }
            for m in markers
        ],
        "exported_at": datetime.utcnow().isoformat()
    }


@app.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """세션 삭제"""
    repo = Repository(db)
    
    if repo.delete_session(session_id):
        STORE._states.pop(session_id, None)
        repo.log_action("DELETE_SESSION", session_id=session_id, user_id=current_user["id"])
        return {"success": True, "message": "세션이 삭제되었습니다"}
    
    raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")





