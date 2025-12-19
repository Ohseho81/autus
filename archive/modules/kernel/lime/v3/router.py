"""
Lime Kernel v3.0 - FastAPI Router
=================================
15가지 고도화 요소가 통합된 API 엔드포인트
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Engine import (상대 경로로 변경 필요시 수정)
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from engine import (
    LimeKernelV3, HumProfile, ExternalContext,
    AXES, BASE_MATRIX, PHASE_THRESHOLDS, REGIMES
)

router = APIRouter(prefix="/kernel/lime/v3", tags=["lime-kernel-v3"])

# 싱글톤 엔진
_engine = LimeKernelV3(country="KR", industry="education")

# 프로파일 저장소 (실제로는 DB 사용)
_profiles: Dict[str, HumProfile] = {}
_vectors: Dict[str, Dict[str, float]] = {}
_delta_history: Dict[str, List[Dict[str, float]]] = {}


# ============================================================
# REQUEST MODELS
# ============================================================

class CreateVectorRequest(BaseModel):
    hum_id: str
    profile_type: str = "standard"
    experience_level: float = Field(0.0, ge=0.0, le=1.0)
    risk_tolerance: float = Field(0.5, ge=0.0, le=1.0)


class ApplyEventRequest(BaseModel):
    hum_id: str
    source: str
    event_code: str
    event_delta: Dict[str, float]
    days_since_last: int = 0
    external_context: Optional[Dict[str, float]] = None


class BackwardPlanRequest(BaseModel):
    hum_id: str
    target_vector: Dict[str, float]
    time_budget_days: int = 90


class CalibrationDataRequest(BaseModel):
    source: str
    event_code: str
    predicted_success: float
    actual_success: float


class BatchEventRequest(BaseModel):
    hum_id: str
    events: List[Dict[str, Any]]


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/status")
def kernel_status():
    """Lime Kernel v3.0 상태"""
    return {
        "status": "active",
        "version": "3.0.0",
        "features": [
            "ground_truth_calibration",
            "sequence_modeling",
            "external_factors",
            "uncertainty_quantification",
            "causal_inference",
            "personalized_learning_rate",
            "event_interaction",
            "saturation_effect",
            "phase_transition",
            "network_effect",
            "hysteresis",
            "multiscale_temporal",
            "backward_propagation",
            "correlated_risk",
            "regime_switching"
        ],
        "axes": AXES,
        "regimes": list(REGIMES.keys()),
        "phase_triggers": list(PHASE_THRESHOLDS.keys())
    }


@router.post("/vector/create")
def create_vector(req: CreateVectorRequest):
    """초기 벡터 및 프로파일 생성"""
    vector = _engine.create_initial_vector(req.profile_type)
    
    profile = HumProfile(
        hum_id=req.hum_id,
        experience_level=req.experience_level,
        risk_tolerance=req.risk_tolerance
    )
    
    _profiles[req.hum_id] = profile
    _vectors[req.hum_id] = vector
    _delta_history[req.hum_id] = []
    
    # 초기 상태 분석
    success = _engine.calculate_success_probability(vector)
    uncertainty = _engine.quantify_uncertainty(vector)
    
    return {
        "hum_id": req.hum_id,
        "vector": vector,
        "profile": {
            "experience_level": profile.experience_level,
            "risk_tolerance": profile.risk_tolerance
        },
        "analysis": {
            "success_probability": success["probability"],
            "confidence_interval": f"{success.get('ci_lower', 0)}% - {success.get('ci_upper', 100)}%",
            "regime": "normal"
        },
        "version": "3.0.0"
    }


@router.post("/event/apply")
def apply_event(req: ApplyEventRequest):
    """이벤트 적용 (15가지 고도화 요소 통합)"""
    
    # 프로파일/벡터 가져오기
    if req.hum_id not in _vectors:
        return {"error": f"HUM {req.hum_id} not found. Create first."}
    
    profile = _profiles.get(req.hum_id, HumProfile(hum_id=req.hum_id))
    current_vector = _vectors[req.hum_id]
    recent_deltas = _delta_history.get(req.hum_id, [])
    
    # 외부 컨텍스트
    context = ExternalContext()
    if req.external_context:
        context.economic_index = req.external_context.get("economic_index", 0.5)
        context.policy_stability = req.external_context.get("policy_stability", 0.7)
        context.season_factor = req.external_context.get("season_factor", 1.0)
        context.market_demand = req.external_context.get("market_demand", 0.5)
    
    # 피어 벡터 (네트워크 효과용)
    peer_vectors = {pid: _vectors[pid] for pid in profile.peers if pid in _vectors}
    
    # 이벤트 적용
    result = _engine.apply_event(
        current_vector=current_vector,
        source=req.source,
        event_delta=req.event_delta,
        event_code=req.event_code,
        profile=profile,
        context=context,
        days_since_last=req.days_since_last,
        all_peer_vectors=peer_vectors,
        recent_deltas=recent_deltas
    )
    
    # 상태 업데이트
    _vectors[req.hum_id] = result.new_vector
    _delta_history[req.hum_id].append(result.delta)
    if len(_delta_history[req.hum_id]) > 20:
        _delta_history[req.hum_id] = _delta_history[req.hum_id][-20:]
    
    # 성공 확률
    success = _engine.calculate_success_probability(result.new_vector)
    
    return {
        "hum_id": req.hum_id,
        "event": req.event_code,
        
        "vectors": {
            "before": result.old_vector,
            "after": result.new_vector,
            "delta": result.delta
        },
        
        "effect_breakdown": {
            "base": result.base_effect,
            "saturation": result.saturation_effect,
            "cross_axis": result.cross_axis_effect,
            "synergy": result.synergy_effect,
            "phase_transition": result.phase_transition_effect,
            "temporal_decay": result.temporal_decay,
            "network": result.network_effect,
            "hysteresis": result.hysteresis_effect,
            "regime_adjustment": result.regime_adjustment,
            "external": result.external_effect,
            "personal": result.personal_modifier
        },
        
        "analysis": {
            "regime": result.regime,
            "phase_triggered": result.phase_triggered,
            "risk_score": result.risk_score,
            "correlated_risk": result.correlated_risk,
            "success_probability": success["probability"],
            "confidence_interval": f"{success.get('ci_lower', 0)}% - {success.get('ci_upper', 100)}%"
        },
        
        "uncertainty": {
            axis: {
                "mean": u.mean,
                "std": u.std,
                "ci": f"[{u.ci_lower}, {u.ci_upper}]",
                "confidence": u.confidence
            }
            for axis, u in result.uncertainty.items()
        },
        
        "timestamp": result.timestamp,
        "version": "3.0.0"
    }


@router.post("/event/batch")
def apply_batch_events(req: BatchEventRequest):
    """여러 이벤트 일괄 처리"""
    results = []
    
    for event in req.events:
        result = apply_event(ApplyEventRequest(
            hum_id=req.hum_id,
            source=event.get("source", "HUM"),
            event_code=event.get("event_code", "UNKNOWN"),
            event_delta=event.get("event_delta", {}),
            days_since_last=event.get("days_since_last", 0),
            external_context=event.get("external_context")
        ))
        results.append({
            "event": event.get("event_code"),
            "success_probability": result.get("analysis", {}).get("success_probability"),
            "regime": result.get("analysis", {}).get("regime"),
            "phase_triggered": result.get("analysis", {}).get("phase_triggered")
        })
    
    final_vector = _vectors.get(req.hum_id, {})
    final_success = _engine.calculate_success_probability(final_vector) if final_vector else {}
    
    return {
        "hum_id": req.hum_id,
        "events_processed": len(results),
        "results": results,
        "final_state": {
            "vector": final_vector,
            "success_probability": final_success.get("probability"),
            "regime": results[-1].get("regime") if results else "normal"
        },
        "version": "3.0.0"
    }


@router.post("/plan/backward")
def create_backward_plan(req: BackwardPlanRequest):
    """역방향 전파 - 목표 달성 계획 수립"""
    
    if req.hum_id not in _vectors:
        return {"error": f"HUM {req.hum_id} not found. Create first."}
    
    current_vector = _vectors[req.hum_id]
    profile = _profiles.get(req.hum_id)
    
    plan = _engine.plan_backward(
        current_vector=current_vector,
        target_vector=req.target_vector,
        time_budget_days=req.time_budget_days,
        profile=profile
    )
    
    return {
        "hum_id": req.hum_id,
        "current_state": plan.current_state,
        "target_state": plan.target_state,
        "gap_analysis": plan.gap_analysis,
        "recommended_events": plan.recommended_events,
        "critical_path": plan.critical_path,
        "estimated_duration_days": plan.estimated_duration_days,
        "success_probability": plan.success_probability,
        "version": "3.0.0"
    }


@router.post("/settlement/check")
def check_settlement(hum_id: str):
    """정착 조건 체크"""
    
    if hum_id not in _vectors:
        return {"error": f"HUM {hum_id} not found."}
    
    vector = _vectors[hum_id]
    result = _engine.check_settlement(vector)
    
    return {
        "hum_id": hum_id,
        "vector": vector,
        **result,
        "version": "3.0.0"
    }


@router.post("/calibrate")
def add_calibration(req: CalibrationDataRequest):
    """실제 데이터 피드백 추가 (Ground Truth Calibration)"""
    
    _engine.add_calibration_data({
        "source": req.source,
        "event_code": req.event_code,
        "predicted_success": req.predicted_success,
        "actual_success": req.actual_success,
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "status": "calibration_data_added",
        "total_samples": len(_engine.calibration_data),
        "learned_weights_count": len(_engine.learned_weights),
        "message": "Weights will be recalibrated after 10+ samples"
    }


@router.get("/profile/{hum_id}")
def get_profile(hum_id: str):
    """HUM 프로파일 조회"""
    
    if hum_id not in _profiles:
        return {"error": f"HUM {hum_id} not found."}
    
    profile = _profiles[hum_id]
    vector = _vectors.get(hum_id, {})
    
    success = _engine.calculate_success_probability(vector) if vector else {}
    regime = _engine.detect_regime(vector, _delta_history.get(hum_id, []))
    
    return {
        "hum_id": hum_id,
        "profile": {
            "experience_level": profile.experience_level,
            "risk_tolerance": profile.risk_tolerance,
            "event_history": profile.event_history[-10:],
            "peers": profile.peers,
            "historical_max": profile.historical_max,
            "historical_min": profile.historical_min
        },
        "current_vector": vector,
        "analysis": {
            "success_probability": success.get("probability"),
            "regime": regime,
            "correlated_risk": _engine.calculate_correlated_risk(vector) if vector else None
        },
        "version": "3.0.0"
    }


@router.post("/network/connect")
def connect_peers(hum_id: str, peer_ids: List[str]):
    """피어 네트워크 연결"""
    
    if hum_id not in _profiles:
        return {"error": f"HUM {hum_id} not found."}
    
    profile = _profiles[hum_id]
    for pid in peer_ids:
        if pid not in profile.peers:
            profile.peers.append(pid)
    
    return {
        "hum_id": hum_id,
        "peers": profile.peers,
        "message": "Network connections updated"
    }


@router.get("/constants")
def get_constants():
    """상수 및 설정값 조회"""
    return {
        "axes": AXES,
        "base_matrix": BASE_MATRIX,
        "phase_thresholds": PHASE_THRESHOLDS,
        "regimes": REGIMES,
        "version": "3.0.0"
    }
