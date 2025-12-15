"""Solar State API - Physics Kernel Endpoint"""
from fastapi import APIRouter
from typing import Optional
from core.physics import entropy, pressure, gravity, failure_horizon, DeltaState

router = APIRouter(prefix="/solar", tags=["solar"])

# 이전 상태 저장 (메모리)
_prev_metrics = {}

@router.get("/state/{entity_id}")
async def get_solar_state(entity_id: str):
    """
    물리 수식 커널 기반 Solar State 조회
    
    Returns:
        - delta: ΔState 벡터 (변화량)
        - physics: 계산된 물리량 (S, P, G, FH)
    """
    from main import solar_engine  # 순환 import 방지
    
    # 현재 상태
    engine_data = solar_engine.to_dict()
    signals = engine_data.get("signals", {})
    state_vec = engine_data.get("state_vector", {})
    
    # 현재 메트릭스
    metrics_now = {
        "energy": sum(state_vec.values()) / len(state_vec) if state_vec else 0.5,
        "stability": 1.0 - signals.get("entropy", 0),
        "pressure": signals.get("pressure", 0),
        "influence": signals.get("gravity", 0.5),
        "trust": 1.0,  # 기본값
        "risk": signals.get("entropy", 0) * 0.8 + signals.get("pressure", 0) * 0.2,
        "demand": signals.get("pressure", 0) + 0.3,
    }
    
    # 이전 메트릭스 (없으면 현재값 복사)
    metrics_prev = _prev_metrics.get(entity_id, metrics_now.copy())
    
    # ΔState 계산
    delta = DeltaState(
        dE=metrics_now["energy"] - metrics_prev.get("energy", metrics_now["energy"]),
        dS=metrics_now["stability"] - metrics_prev.get("stability", metrics_now["stability"]),
        dP=metrics_now["pressure"] - metrics_prev.get("pressure", metrics_now["pressure"]),
        dG=metrics_now["influence"] - metrics_prev.get("influence", metrics_now["influence"]),
        dR=metrics_now["risk"] - metrics_prev.get("risk", metrics_now["risk"]),
    )
    
    # Risk Rate 계산 (최근 변화율)
    risk_rate = abs(delta.dR) if delta.dR > 0 else 0.01
    
    # 물리량 계산
    S = entropy(delta.total_change(), dt=1.0)
    P = pressure(metrics_now["demand"], metrics_now["energy"], metrics_now["stability"])
    G = gravity(metrics_now["influence"], metrics_now["trust"])
    FH = failure_horizon(metrics_now["risk"], risk_rate, threshold=1.0)
    
    # 상태 저장
    _prev_metrics[entity_id] = metrics_now.copy()
    
    return {
        "entity_id": entity_id,
        "tick": engine_data.get("tick", 0),
        "cycle": engine_data.get("cycle", 0),
        "delta": delta.dict(),
        "physics": {
            "entropy": round(S, 4),
            "pressure": round(P, 4),
            "gravity": round(G, 4),
            "failure_horizon": round(FH, 2) if FH != float('inf') else 9999,
        },
        "metrics": {
            "energy": round(metrics_now["energy"], 4),
            "stability": round(metrics_now["stability"], 4),
            "risk": round(metrics_now["risk"], 4),
        },
        "status": engine_data.get("output", {}).get("status", "GREEN"),
    }
