"""
AUTUS Kernel Service - FastAPI
==============================

독립 Kernel 서비스 (포트 8001)

Endpoints:
- GET  /health
- POST /kernel/step
- POST /kernel/reset
- GET  /kernel/state
- POST /kernel/forecast
- POST /log/append
- GET  /log/entries
- GET  /log/verify
- POST /replay/sequence
- POST /replay/verify
- POST /llm/estimate

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from .kernel import get_kernel, KernelState
from .chain import get_chain
from .replay import get_replay
from .validator import get_validator
from .goal_physics import get_goal_analyzer
from .autus_state import STORE, AutusState, state_to_dict, canonical_json, sha256_hex, sha256_short, ReplayMarker
from .validators import validate_page1_patch, validate_page2_patch, validate_page3_patch
from .commit_pipeline import commit_apply

app = FastAPI(
    title="AUTUS Kernel Service",
    version="1.0.0",
    description="Deterministic Physics Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# REQUEST/RESPONSE MODELS
# ================================================================

class StepRequest(BaseModel):
    motion_id: str
    params: Optional[Dict] = None

class ForecastRequest(BaseModel):
    motion_sequence: List[str]
    steps: int = 5

class ReplayRequest(BaseModel):
    motion_sequence: List[str]
    initial_state: Optional[Dict] = None

class VerifyRequest(BaseModel):
    motion_sequence: List[str]
    runs: int = 3

class LLMEstimateRequest(BaseModel):
    raw_text: str


# ================================================================
# HEALTH
# ================================================================

@app.get("/health")
def health():
    """Health check."""
    kernel = get_kernel()
    return {
        "status": "ok",
        "service": "kernel",
        "version": "1.0.0",
        "registry_version": kernel.registry.version,
        "total_motions": kernel.registry.total
    }


# ================================================================
# KERNEL ENDPOINTS
# ================================================================

@app.post("/kernel/step")
def kernel_step(req: StepRequest):
    """
    Execute one deterministic step.
    
    Pipeline: Validate → Apply → Level2 → Log
    """
    kernel = get_kernel()
    chain = get_chain()
    
    result = kernel.step(req.motion_id, req.params)
    
    # Log to chain if successful
    if result.get("success"):
        chain.append(
            motion_id=req.motion_id,
            state_snapshot=result.get("next_state", {})
        )
    
    return result


@app.post("/kernel/reset")
def kernel_reset():
    """Reset kernel to initial state."""
    kernel = get_kernel()
    state = kernel.reset()
    return {
        "status": "reset",
        "state": state.to_dict()
    }


@app.get("/kernel/state")
def kernel_state():
    """Get current kernel state."""
    kernel = get_kernel()
    return kernel.get_state().to_dict()


@app.post("/kernel/forecast")
def kernel_forecast(req: ForecastRequest):
    """
    Forecast future states without modifying current.
    
    [NO RECOMMENDATION PROVIDED]
    """
    kernel = get_kernel()
    forecasts = kernel.forecast(req.motion_sequence, req.steps)
    return {
        "forecasts": forecasts,
        "note": "[NO RECOMMENDATION PROVIDED] User decides."
    }


# ================================================================
# LOG ENDPOINTS
# ================================================================

@app.post("/log/append")
def log_append(req: StepRequest):
    """
    Append to log chain.
    
    Note: Normally called automatically by /kernel/step.
    """
    kernel = get_kernel()
    chain = get_chain()
    
    entry = chain.append(
        motion_id=req.motion_id,
        state_snapshot=kernel.get_state().to_dict()
    )
    
    return {
        "index": entry.index,
        "hash": entry.hash
    }


@app.get("/log/entries")
def log_entries(start: int = 0, limit: int = 100):
    """Get log entries."""
    chain = get_chain()
    entries = chain.get_entries(start, start + limit)
    return {
        "start": start,
        "count": len(entries),
        "entries": entries
    }


@app.get("/log/verify")
def log_verify():
    """Verify chain integrity."""
    chain = get_chain()
    return chain.verify()


@app.get("/log/export")
def log_export():
    """Export entire chain."""
    chain = get_chain()
    return chain.export()


# ================================================================
# REPLAY ENDPOINTS
# ================================================================

@app.post("/replay/sequence")
def replay_sequence(req: ReplayRequest):
    """
    Replay a motion sequence.
    """
    replay = get_replay()
    result = replay.replay_sequence(req.motion_sequence, req.initial_state)
    
    return {
        "success": result.success,
        "steps_replayed": result.steps_replayed,
        "final_state": result.final_state,
        "mismatches": result.mismatches,
        "deterministic": result.deterministic
    }


@app.post("/replay/verify")
def replay_verify(req: VerifyRequest):
    """
    Verify determinism by running sequence multiple times.
    """
    replay = get_replay()
    return replay.verify_determinism(req.motion_sequence, req.runs)


@app.get("/replay/from-chain")
def replay_from_chain(start: int = 0, end: Optional[int] = None):
    """
    Replay from chain log.
    """
    replay = get_replay()
    result = replay.replay_from_chain(start, end)
    
    return {
        "success": result.success,
        "steps_replayed": result.steps_replayed,
        "final_state": result.final_state,
        "deterministic": result.deterministic
    }


# ================================================================
# LLM ENDPOINTS (VALIDATOR-WRAPPED)
# ================================================================

@app.post("/llm/estimate")
def llm_estimate(req: LLMEstimateRequest):
    """
    Wrap LLM output with validator.
    
    LLM raw output → Validator → VALID or BLOCKED
    """
    validator = get_validator()
    return validator.wrap_llm_output(req.raw_text)


# ================================================================
# GATE ENDPOINT (LEVEL 3)
# ================================================================

@app.post("/gate/consent")
def gate_consent(motion_id: str, consent: bool = False):
    """
    Level 3 Consent Gate.
    
    No execution without explicit consent.
    """
    kernel = get_kernel()
    
    if not kernel.registry.is_valid(motion_id):
        return {"error": f"Invalid motion: {motion_id}"}
    
    if not consent:
        # Show prediction only
        forecasts = kernel.forecast([motion_id], 1)
        return {
            "status": "consent_required",
            "motion_id": motion_id,
            "prediction": forecasts[0] if forecasts else None,
            "message": "[NO RECOMMENDATION PROVIDED] User decides."
        }
    else:
        # Execute with consent
        result = kernel.step(motion_id)
        return {
            "status": "executed",
            "consent": True,
            "result": result
        }


# ================================================================
# REGISTRY ENDPOINT
# ================================================================

@app.get("/registry/motions")
def registry_motions():
    """Get all registered motions."""
    kernel = get_kernel()
    return {
        "version": kernel.registry.version,
        "total": kernel.registry.total,
        "motions": kernel.registry.motions,
        "categories": kernel.registry.categories
    }


@app.get("/registry/motion/{motion_id}")
def registry_motion(motion_id: str):
    """Get single motion details."""
    kernel = get_kernel()
    motion = kernel.registry.get(motion_id)
    
    if not motion:
        raise HTTPException(status_code=404, detail=f"Motion not found: {motion_id}")
    
    return {
        "motion_id": motion_id,
        **motion
    }


# ================================================================
# GOAL PHYSICS ENDPOINTS
# ================================================================

class GoalAnalyzeRequest(BaseModel):
    goal_text: str
    behavior_log: Optional[List[str]] = None


@app.post("/goal/analyze")
def goal_analyze(req: GoalAnalyzeRequest):
    """
    목표 텍스트 → 물리량 변환
    
    Pipeline:
    1. Specificity Scan → Score
    2. Score → r (반경)
    3. r → σ (엔트로피)
    4. σ → Stability
    5. Leak/Pressure 추정
    
    [NO RECOMMENDATION PROVIDED]
    Numbers only.
    """
    analyzer = get_goal_analyzer()
    result = analyzer.analyze(req.goal_text, req.behavior_log)
    return result.to_dict()


@app.post("/goal/specificity")
def goal_specificity(req: GoalAnalyzeRequest):
    """
    목표 구체성만 스캔
    """
    analyzer = get_goal_analyzer()
    specificity, _ = analyzer.converter.convert(req.goal_text)
    return specificity.to_dict()


@app.post("/goal/physics")
def goal_physics(req: GoalAnalyzeRequest):
    """
    목표의 물리량만 계산
    """
    analyzer = get_goal_analyzer()
    _, physics = analyzer.converter.convert(req.goal_text)
    return physics.to_dict()


@app.post("/goal/leak")
def goal_leak(req: GoalAnalyzeRequest):
    """
    Leak/Pressure만 추정
    """
    analyzer = get_goal_analyzer()
    leak_pressure = analyzer.leak_estimator.estimate(
        req.goal_text, req.behavior_log
    )
    return leak_pressure.to_dict()


@app.post("/goal/batch")
def goal_batch(goals: List[str]):
    """
    여러 목표 일괄 분석
    
    Returns comparison table.
    """
    analyzer = get_goal_analyzer()
    results = []
    
    for goal in goals:
        result = analyzer.analyze(goal)
        results.append({
            "goal": goal[:50] + "..." if len(goal) > 50 else goal,
            "r": round(result.physics.r, 3),
            "sigma": round(result.physics.sigma, 3),
            "stability": round(result.physics.stability, 3),
            "state": result.physics.physical_state.split("(")[0].strip(),
            "leak": round(result.leak_pressure.leak, 3),
            "pressure": round(result.leak_pressure.pressure, 3),
            "net_flow": round(result.leak_pressure.net_flow, 3),
        })
    
    return {
        "count": len(results),
        "results": results,
        "note": "[NO RECOMMENDATION PROVIDED] User decides."
    }


# ================================================================
# AUTUS STATE ENDPOINTS (SIM/LIVE Pipeline)
# ================================================================

class DraftUpdateRequest(BaseModel):
    version: str = "autus.draft.patch.v1"
    session_id: str
    t_ms: int
    page: int
    patch: Dict


class CommitRequest(BaseModel):
    version: str = "autus.commit.v1"
    session_id: str
    t_ms: int
    commit_reason: str = "RELEASE"
    options: Dict = {}


class MarkerRequest(BaseModel):
    version: str = "autus.marker.v1"
    session_id: str
    t_ms: int
    state_hash: str
    prev_hash: Optional[str] = None
    label: Optional[str] = None


@app.get("/state")
def get_state(session_id: str):
    """
    GET /state - 현재 상태 조회
    
    SIM/LIVE 모드, Draft, Measure 전체 반환
    """
    if not session_id or len(session_id) < 4:
        raise HTTPException(status_code=400, detail="INVALID_SESSION_ID")
    st = STORE.get_or_create(session_id)
    return state_to_dict(st)


@app.post("/draft/update")
def draft_update(req: DraftUpdateRequest):
    """
    POST /draft/update - Draft 수정
    
    page: 1 | 2 | 3
    patch: 해당 페이지의 수정할 필드
    
    → SIM 모드로 전환
    """
    st = STORE.get_or_create(req.session_id)
    
    try:
        if req.page == 1:
            cleaned = validate_page1_patch(req.patch)
            for k, v in cleaned.items():
                setattr(st.draft.page1, k, v)
        elif req.page == 2:
            cleaned = validate_page2_patch(req.patch)
            for k, v in cleaned.items():
                if k == "ops":
                    st.draft.page2.ops = v
                else:
                    setattr(st.draft.page2, k, v)
        elif req.page == 3:
            cleaned = validate_page3_patch(req.patch)
            st.draft.page3.allocations = cleaned["allocations"]
        else:
            raise HTTPException(status_code=400, detail="INVALID_PAGE: must be 1, 2, or 3")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    st.ui.mode = "SIM"
    st.t_ms = req.t_ms
    return {"version": "autus.state.v1", "state": state_to_dict(st)}


@app.post("/commit")
def commit(req: CommitRequest):
    """
    POST /commit - Draft를 LIVE에 적용 (정본)
    
    Pipeline 순서 (LOCKED):
    1. Page 3 (Mandala) → 물리량 변환 (자원 배분)
    2. Page 1 (Goal) → Mass/Volume 적용 (역량/목표)
    3. Page 2 (Route) → Node Operations (관계)
    4. Kernel 물리 재계산 (Density, Stability)
    5. Forecast 갱신
    6. Replay Marker 생성
    
    → LIVE 모드로 전환 + Draft 리셋
    """
    st = STORE.get_or_create(req.session_id)
    
    create_marker = bool(req.options.get("create_marker", True))
    marker_label = req.options.get("marker_label")

    try:
        result = commit_apply(
            state=st,
            t_ms=req.t_ms,
            create_marker=create_marker,
            marker_label=marker_label
        )
    except ValueError:
        raise HTTPException(status_code=409, detail="COMMIT_BLOCKED_BY_RULES")

    return {"version": "autus.commit.result.v1", **result}


@app.post("/replay/marker")
def replay_marker(req: MarkerRequest):
    """
    POST /replay/marker - Replay 마커 추가
    
    Hash chain으로 연결 (prev_hash 검증)
    결정론적 state_hash로 재현 가능
    """
    st = STORE.get_or_create(req.session_id)

    # Hash chain 체크
    if st.replay.last_chain_hash is not None and req.prev_hash is not None:
        if req.prev_hash != st.replay.last_chain_hash:
            raise HTTPException(status_code=409, detail="HASH_CHAIN_MISMATCH")

    # Chain hash 생성
    payload = {
        "t_ms": req.t_ms,
        "state_hash": req.state_hash,
        "prev_hash": st.replay.last_chain_hash,
        "label": req.label
    }
    chain_hash = sha256_hex(canonical_json(payload))
    marker_id = f"m_{len(st.replay.markers)+1:06d}"

    st.replay.markers.append(
        ReplayMarker(
            id=marker_id,
            t_ms=req.t_ms,
            hash=chain_hash,
            state_hash=req.state_hash
        )
    )

    st.replay.last_marker_id = marker_id
    st.replay.last_chain_hash = chain_hash

    return {
        "version": "autus.marker.result.v1",
        "marker": {
            "id": marker_id,
            "t_ms": req.t_ms,
            "hash": chain_hash,
            "state_hash": req.state_hash
        }
    }


@app.get("/state/sessions")
def list_sessions():
    """모든 세션 목록"""
    return {
        "sessions": STORE.list_sessions(),
        "count": len(STORE.list_sessions())
    }







