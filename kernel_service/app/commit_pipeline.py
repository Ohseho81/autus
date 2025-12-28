# app/commit_pipeline.py
"""
AUTUS Commit Pipeline (정본)
============================

Version: 1.0.0
Status: 🔒 LOCKED

핵심 원칙:
"Commit은 저장이 아니라 물리 상태 전이(Event)다."
- 동일 입력 → 동일 출력 (Deterministic)
- 순서는 고정, 예외 없음
- 각 단계는 이전 단계의 결과를 입력으로 사용

처리 순서 (LOCKED):
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Page 3 (Mandala) → 물리량 변환                        │
│  ──────────────────────────────────────────────────────────────│
│  왜 먼저?: 자원 배분이 나머지 모든 물리량의 기반                 │
│  출력: E, Pressure, Leak, σ                                    │
│                                                                 │
│           ↓                                                     │
│                                                                 │
│  STAGE 2: Page 1 (Goal) → Mass/Volume 적용                     │
│  ──────────────────────────────────────────────────────────────│
│  왜 두 번째?: 자기 역량이 Density 계산의 핵심                   │
│  출력: M, Volume                                               │
│                                                                 │
│           ↓                                                     │
│                                                                 │
│  STAGE 3: Page 2 (Route) → Node Operations 적용                │
│  ──────────────────────────────────────────────────────────────│
│  왜 세 번째?: 관계 변화는 자기 상태 확정 후에만 의미            │
│  출력: graph.nodes, σ 조정                                     │
│                                                                 │
│           ↓                                                     │
│                                                                 │
│  STAGE 4: Kernel 물리 재계산                                   │
│  ──────────────────────────────────────────────────────────────│
│  Density = (E × (1-Leak) × Pressure) / Volume                  │
│  Stability = 1 - σ                                             │
│                                                                 │
│           ↓                                                     │
│                                                                 │
│  STAGE 5: Forecast 갱신                                        │
│  ──────────────────────────────────────────────────────────────│
│  Trajectory 재계산                                              │
│                                                                 │
│           ↓                                                     │
│                                                                 │
│  STAGE 6: Replay Marker 생성                                   │
│  ──────────────────────────────────────────────────────────────│
│  불변 해시 기록, mode = LIVE                                   │
└─────────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations
from typing import Dict, Any, Optional, List
from copy import deepcopy

from .autus_state import (
    AutusState, clamp01, lerp, canonical_json, sha256_short, state_to_dict
)
from .mandala_transform import mandala_to_physics, normalize_allocations
from .node_classifier import classify_node

# ================================================================
# DAMPING COEFFICIENTS (LOCKED)
# ================================================================
ALLOC_ALPHA = 0.40     # Allocation 반영 감쇠
MASS_ALPHA = 0.35      # Mass 반영 감쇠
VOLUME_ALPHA = 0.50    # Volume 반영 감쇠
NODE_ALPHA = 0.30      # Node 크기 변화 감쇠


# ================================================================
# GRAPH CANONICALIZATION (결정론)
# ================================================================

def _sort_graph(state: AutusState) -> None:
    """
    Graph canonicalization (결정론)
    
    - nodes: id 기준 정렬
    - edges: (a, b) 기준 정렬
    """
    state.graph.nodes.sort(key=lambda n: str(n.get("id", "")))
    state.graph.edges.sort(key=lambda e: (str(e.get("a", "")), str(e.get("b", ""))))


# ================================================================
# NODE OPS APPLY (STAGE 3)
# ================================================================

def apply_node_ops(state: AutusState, ops: List[Dict[str, Any]]) -> None:
    """
    NodeOps 적용 (정본)
    
    적용 순서 (LOCKED):
    1. DELETE: 노드 삭제 (SELF 제외, idempotent)
    2. CREATE: 노드 생성 (충돌 시 무시)
    3. MASS_SCALE: 질량 스케일 (없으면 무시)
    4. EDGE_WEIGHT_SET: 엣지 가중치 설정 (없으면 생성)
    
    결정론을 위해:
    - ops는 이미 t_ms, op_id로 정렬됨
    - 적용 후 그래프 정렬
    """
    if not ops:
        return
    
    # 분류
    deletes = [o for o in ops if o["type"] == "NODE_DELETE"]
    creates = [o for o in ops if o["type"] == "NODE_CREATE"]
    scales = [o for o in ops if o["type"] == "NODE_MASS_SCALE"]
    edges = [o for o in ops if o["type"] == "EDGE_WEIGHT_SET"]
    
    # 노드 인덱스
    node_index = {n["id"]: n for n in state.graph.nodes if "id" in n}
    
    # 1) DELETE (SELF 제외, idempotent)
    for o in deletes:
        nid = o["node_id"]
        if nid in node_index and nid != "SELF":
            state.graph.nodes = [n for n in state.graph.nodes if n.get("id") != nid]
            # 관련 엣지 제거
            state.graph.edges = [
                e for e in state.graph.edges
                if e.get("a") != nid and e.get("b") != nid
            ]
            node_index.pop(nid, None)
    
    # 인덱스 갱신
    node_index = {n["id"]: n for n in state.graph.nodes if "id" in n}
    
    # 2) CREATE (충돌 시 무시 - idempotent)
    for o in creates:
        node = o["node"]
        nid = node["id"]
        if nid in node_index:
            continue  # 이미 존재하면 무시
        new_node = dict(node)
        new_node.setdefault("layer", 1)
        state.graph.nodes.append(new_node)
        node_index[nid] = state.graph.nodes[-1]
    
    # 3) MASS_SCALE (없으면 무시)
    for o in scales:
        nid = o["node_id"]
        if nid in node_index and nid != "SELF":
            current_mass = float(node_index[nid].get("mass", 0.5))
            new_mass = clamp01(current_mass * float(o["scale"]))
            node_index[nid]["mass"] = new_mass
    
    # 4) EDGE_WEIGHT_SET (없으면 생성, 있으면 덮어씀)
    edge_index = {(e.get("a"), e.get("b")): e for e in state.graph.edges}
    for o in edges:
        a, b = o["a"], o["b"]
        flow = clamp01(float(o["flow"]))
        key = (a, b)
        if key in edge_index:
            edge_index[key]["flow"] = flow
        else:
            new_edge = {"a": a, "b": b, "flow": flow, "sigma": 0.0}
            state.graph.edges.append(new_edge)
            edge_index[key] = state.graph.edges[-1]
    
    # 그래프 정렬 (결정론)
    _sort_graph(state)

# ================================================================
# STAGE 1: MANDALA TRANSFORM
# ================================================================

def stage1_mandala_transform(state: AutusState, draft_snapshot: Any) -> Dict[str, float]:
    """
    Stage 1: Page 3 Mandala → Physics Transform
    
    allocation → (E, Pressure, Leak, Volume, σ)
    → 자기 물리량의 "기준값" 생성
    """
    a_norm = normalize_allocations(draft_snapshot.page3.allocations)
    physics = mandala_to_physics(a_norm)
    
    # Apply with damping
    state.measure.E = lerp(state.measure.E, physics["E"], ALLOC_ALPHA)
    state.measure.pressure = lerp(state.measure.pressure, physics["pressure"], ALLOC_ALPHA)
    state.measure.leak = lerp(state.measure.leak, physics["leak"], ALLOC_ALPHA)
    state.measure.sigma = lerp(state.measure.sigma, physics["sigma"], ALLOC_ALPHA)
    state.measure.volume = lerp(state.measure.volume, physics["volume"], ALLOC_ALPHA)
    
    # dE_dt (에너지 변화율)
    state.measure.dE_dt = physics["E"] - state.measure.E
    
    return physics


# ================================================================
# STAGE 2: MASS + VOLUME
# ================================================================

def stage2_mass_volume(state: AutusState, draft_snapshot: Any) -> None:
    """
    Stage 2: Page 1 Mass + Volume 적용
    
    Mass Modifier → M 조정
    Volume Override → Volume 조정
    → 역량과 목표 크기 반영
    """
    # Mass Modifier
    mm = float(draft_snapshot.page1.mass_modifier)
    M_target = clamp01(state.measure.M * (1.0 + mm))
    state.measure.M = lerp(state.measure.M, M_target, MASS_ALPHA)
    
    # Volume Override (>0 일 때만 적용)
    v_override = float(draft_snapshot.page1.volume_override)
    if v_override > 0:
        state.measure.volume = lerp(state.measure.volume, v_override, VOLUME_ALPHA)


# ================================================================
# STAGE 3: NODE OPERATIONS
# ================================================================

def stage3_node_operations(state: AutusState, draft_snapshot: Any) -> None:
    """
    Stage 3: Page 2 Node Operations (WORLD THIRD)
    
    NodeOps 4종 적용:
    - NODE_CREATE: 노드 생성
    - NODE_DELETE: 노드 삭제
    - NODE_MASS_SCALE: 질량 스케일
    - EDGE_WEIGHT_SET: 엣지 가중치
    
    적용 순서: DELETE → CREATE → MASS_SCALE → EDGE_WEIGHT_SET
    """
    ops = getattr(draft_snapshot.page2, 'ops', [])
    if ops:
        apply_node_ops(state, ops)
        
        # σ 영향 (ops 수에 비례)
        sigma_delta = len(ops) * 0.005
        state.measure.sigma = clamp01(state.measure.sigma + sigma_delta)


# ================================================================
# STAGE 4: KERNEL RECALCULATION
# ================================================================

def stage4_kernel_recalc(state: AutusState) -> None:
    """
    Stage 4: Kernel 재계산
    
    Density = (E × (1-Leak) × Pressure) / Volume
    Stability = 1 - σ
    NodeType 판정
    """
    # Effective Energy
    E_eff = state.measure.E * (1.0 - state.measure.leak)
    
    # Density (안전 분모)
    volume = max(state.measure.volume, 0.05)
    state.measure.density = clamp01((E_eff * state.measure.pressure) / volume)
    
    # Stability
    state.measure.stability = clamp01(1.0 - state.measure.sigma)
    
    # Recovery (간소화)
    state.measure.recovery = clamp01(state.measure.recovery)
    
    # NodeType 분류
    state.measure.node_type = classify_node(
        M=state.measure.M,
        E=state.measure.E,
        sigma=state.measure.sigma,
        density=state.measure.density,
        stability=state.measure.stability
    )


# ================================================================
# STAGE 5: FORECAST UPDATE
# ================================================================

def stage5_forecast_update(state: AutusState, horizon: str) -> None:
    """
    Stage 5: Forecast 갱신
    
    Trajectory 재계산
    """
    # Horizon 설정
    state.forecast.horizon = horizon
    
    # Horizon → 샘플 수
    horizon_samples = {
        "H1": 4,
        "D1": 8,
        "D7": 14,
        "D30": 30,
        "D180": 60
    }
    n_samples = horizon_samples.get(horizon, 8)
    
    # Horizon → 불확실성 계수
    horizon_factor = {
        "H1": 0.10,
        "D1": 0.15,
        "D7": 0.25,
        "D30": 0.40,
        "D180": 0.55
    }[horizon]
    
    # P_outcome 계산
    d = state.measure.density
    s = state.measure.stability
    sigma = state.measure.sigma
    
    p = clamp01((d * 0.65 + s * 0.35) * (1.0 - horizon_factor * sigma))
    state.forecast.P_outcome = p
    state.forecast.confidence = clamp01(1.0 - horizon_factor * sigma)
    
    # Trajectory samples
    base = d
    trend = (s - 0.5) * 0.1
    
    samples = []
    for i in range(min(n_samples, 8)):  # 최대 8개
        t = i / max(n_samples - 1, 1)
        value = clamp01(base + trend * t * (1.0 - sigma))
        samples.append(value)
    
    state.forecast.trajectory_samples = samples


# ================================================================
# MAIN COMMIT PIPELINE
# ================================================================

def commit_apply(
    state: AutusState,
    t_ms: int,
    create_marker: bool = True,
    marker_label: Optional[str] = None
) -> Dict[str, Any]:
    """
    AUTUS Commit Pipeline (정본)
    
    결정론적 처리 순서 (LOCKED):
    1. Page 3 Mandala → Physics (자원 배분)
    2. Page 1 Mass + Volume (역량/목표)
    3. Page 2 Node Operations (관계)
    4. Kernel Recalculation (물리량)
    5. Forecast Update (예측)
    6. Replay Marker Generation (기록)
    
    Args:
        state: AutusState (mutated in place)
        t_ms: Timestamp
        create_marker: Marker 생성 여부
        marker_label: Marker 라벨
    
    Returns:
        {state, commit: {applied, marker_required, marker_payload}}
    """
    processing_steps: List[str] = []
    
    # Snapshot draft before processing
    draft_snapshot = deepcopy(state.draft)
    
    # === STAGE 1: Page 3 Mandala → Physics ===
    processing_steps.append("STAGE1: Mandala Transform")
    stage1_mandala_transform(state, draft_snapshot)
    
    # === STAGE 2: Page 1 Mass + Volume ===
    processing_steps.append("STAGE2: Mass + Volume Apply")
    stage2_mass_volume(state, draft_snapshot)
    
    # === STAGE 3: Page 2 Node Operations ===
    processing_steps.append("STAGE3: Node Operations")
    stage3_node_operations(state, draft_snapshot)
    
    # === STAGE 4: Kernel Recalculation ===
    processing_steps.append("STAGE4: Kernel Recalculation")
    stage4_kernel_recalc(state)
    
    # === STAGE 5: Forecast Update ===
    processing_steps.append("STAGE5: Forecast Update")
    horizon = draft_snapshot.page1.horizon_override
    stage5_forecast_update(state, horizon)
    
    # === STAGE 6: Finalize ===
    processing_steps.append("STAGE6: Finalize + Marker")
    
    # LIVE 전환
    state.ui.mode = "LIVE"
    state.t_ms = t_ms
    
    # Draft reset
    state.draft = type(state.draft)()
    
    # State hash
    state_dict = state_to_dict(state)
    state_hash = sha256_short(canonical_json(state_dict))
    
    # Marker payload
    marker_payload = {
        "t_ms": t_ms,
        "state_hash": state_hash,
        "mode": "LIVE",
        "label": marker_label
    }
    
    return {
        "state": state_dict,
        "commit": {
            "applied": True,
            "marker_required": bool(create_marker),
            "marker_payload": marker_payload
        },
        "processing_steps": processing_steps
    }





