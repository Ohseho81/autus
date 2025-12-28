# app/validators.py
"""
Draft Validators (정본)
=======================

Draft patch 검증 + 범위 제한 + NodeOps 검증

Version: 1.1.0
Status: 🔒 LOCKED

Limits (draft_limits.json):
┌─────────────────────────────────────────────────────────────────┐
│  Page 1:                                                        │
│    mass_modifier: [-0.50, +0.50]                               │
│    volume_override: [0.30, 0.90]                               │
│    horizon_override: H1|D1|D7|D30|D180                         │
│                                                                 │
│  Page 2:                                                        │
│    filters: [0.0, 1.0]                                         │
│    virtual_anchor_shift: [-1, 1] each                          │
│    ops: NodeOps list (max 200)                                 │
│                                                                 │
│  Page 3:                                                        │
│    allocations: per_slot [0.0, 1.0], sum = 1.0                 │
└─────────────────────────────────────────────────────────────────┘

NodeOps Types (4종):
- NODE_CREATE: 노드 생성
- NODE_DELETE: 노드 삭제  
- NODE_MASS_SCALE: 노드 질량 스케일 [0.5, 2.0]
- EDGE_WEIGHT_SET: 엣지 가중치 설정
"""

from __future__ import annotations
from typing import Dict, Any, List, Literal
from .autus_state import clamp, clamp01
from .mandala_transform import normalize_allocations, SLOTS

Horizon = Literal["H1", "D1", "D7", "D30", "D180"]

# ================================================================
# LIMITS (LOCKED)
# ================================================================

# Page 1
MASS_MODIFIER_MIN = -0.50
MASS_MODIFIER_MAX = +0.50
VOLUME_OVERRIDE_MIN = 0.30
VOLUME_OVERRIDE_MAX = 0.90
HORIZON_VALUES = ["H1", "D1", "D7", "D30", "D180"]

# Page 2
FILTER_MIN = 0.0
FILTER_MAX = 1.0
ANCHOR_SHIFT_MIN = -1.0
ANCHOR_SHIFT_MAX = +1.0
MAX_OPS_PER_COMMIT = 200

# Page 3
ALLOCATION_MIN = 0.0
ALLOCATION_MAX = 1.0
ALLOCATION_STEP = 0.01

# NodeOps
OP_TYPES = {"NODE_CREATE", "NODE_DELETE", "NODE_MASS_SCALE", "EDGE_WEIGHT_SET"}
MASS_SCALE_MIN = 0.50
MASS_SCALE_MAX = 2.00


def validate_page1_patch(patch: Dict[str, Any]) -> Dict[str, Any]:
    """
    Page 1 patch 검증
    
    Allowed keys: mass_modifier, volume_override, horizon_override
    """
    allowed = {"mass_modifier", "volume_override", "horizon_override"}
    for k in patch.keys():
        if k not in allowed:
            raise ValueError(f"INVALID_PATCH_KEY: {k}")

    out: Dict[str, Any] = {}
    
    if "mass_modifier" in patch:
        out["mass_modifier"] = clamp(
            float(patch["mass_modifier"]),
            MASS_MODIFIER_MIN,
            MASS_MODIFIER_MAX
        )
    
    if "volume_override" in patch:
        out["volume_override"] = clamp(
            float(patch["volume_override"]),
            VOLUME_OVERRIDE_MIN,
            VOLUME_OVERRIDE_MAX
        )
    
    if "horizon_override" in patch:
        hv = patch["horizon_override"]
        if hv not in HORIZON_VALUES:
            raise ValueError(f"INVALID_ENUM: horizon must be one of {HORIZON_VALUES}")
        out["horizon_override"] = hv
    
    return out


def validate_page2_patch(patch: Dict[str, Any]) -> Dict[str, Any]:
    """
    Page 2 patch 검증
    
    Allowed keys: mass_filter, flow_filter, sigma_filter, virtual_anchor_shift, ops
    """
    allowed = {"mass_filter", "flow_filter", "sigma_filter", "virtual_anchor_shift", "ops"}
    for k in patch.keys():
        if k not in allowed:
            raise ValueError(f"INVALID_PATCH_KEY: {k}")

    out: Dict[str, Any] = {}
    
    if "mass_filter" in patch:
        out["mass_filter"] = clamp(float(patch["mass_filter"]), FILTER_MIN, FILTER_MAX)
    
    if "flow_filter" in patch:
        out["flow_filter"] = clamp(float(patch["flow_filter"]), FILTER_MIN, FILTER_MAX)
    
    if "sigma_filter" in patch:
        out["sigma_filter"] = clamp(float(patch["sigma_filter"]), FILTER_MIN, FILTER_MAX)
    
    if "virtual_anchor_shift" in patch:
        v = patch["virtual_anchor_shift"]
        if (not isinstance(v, (list, tuple))) or len(v) != 2:
            raise ValueError("INVALID_VECTOR_RANGE: virtual_anchor_shift must be [x, y]")
        out["virtual_anchor_shift"] = (
            clamp(float(v[0]), ANCHOR_SHIFT_MIN, ANCHOR_SHIFT_MAX),
            clamp(float(v[1]), ANCHOR_SHIFT_MIN, ANCHOR_SHIFT_MAX)
        )
    
    if "ops" in patch:
        ops = patch["ops"]
        if not isinstance(ops, list):
            raise ValueError("INVALID_PATCH_RANGE: ops must be a list")
        if len(ops) > MAX_OPS_PER_COMMIT:
            raise ValueError(f"TOO_MANY_OPS: max {MAX_OPS_PER_COMMIT}")
        out["ops"] = validate_node_ops(ops)
    
    return out


def _valid_id(s: Any) -> bool:
    """ID 유효성 검사"""
    if not isinstance(s, str):
        return False
    if len(s) < 1 or len(s) > 64:
        return False
    if any(ch.isspace() for ch in s):
        return False
    return True


def validate_node_ops(ops: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    NodeOps 검증 (4종)
    
    Types:
    - NODE_CREATE: 노드 생성
    - NODE_DELETE: 노드 삭제
    - NODE_MASS_SCALE: 노드 질량 스케일
    - EDGE_WEIGHT_SET: 엣지 가중치 설정
    
    결정론을 위해:
    - 중복 op_id 제거 (idempotent)
    - t_ms, op_id로 정렬
    """
    cleaned: List[Dict[str, Any]] = []
    seen_op_ids = set()
    
    for op in ops:
        if not isinstance(op, dict):
            raise ValueError("INVALID_PATCH_RANGE: each op must be a dict")
        
        op_id = op.get("op_id")
        t_ms = op.get("t_ms")
        typ = op.get("type")
        
        # ID 검증
        if not _valid_id(op_id):
            raise ValueError("INVALID_PATCH_RANGE: invalid op_id")
        
        # 중복 제거 (idempotent)
        if op_id in seen_op_ids:
            continue
        seen_op_ids.add(op_id)
        
        # Type 검증
        if typ not in OP_TYPES:
            raise ValueError(f"INVALID_ENUM: type must be one of {OP_TYPES}")
        
        # t_ms 검증
        if not isinstance(t_ms, int) or t_ms < 0:
            raise ValueError("INVALID_PATCH_RANGE: t_ms must be non-negative int")
        
        # Type별 검증
        if typ == "NODE_CREATE":
            node = op.get("node")
            if not isinstance(node, dict) or not _valid_id(node.get("id")):
                raise ValueError("INVALID_PATCH_RANGE: NODE_CREATE requires valid node.id")
            cleaned.append({
                "op_id": op_id,
                "type": typ,
                "t_ms": t_ms,
                "node": {
                    "id": node["id"],
                    "mass": clamp(float(node.get("mass", 0.5)), 0.0, 1.0),
                    "sigma": clamp(float(node.get("sigma", 0.3)), 0.0, 1.0),
                    "density": clamp(float(node.get("density", 0.5)), 0.0, 1.0),
                    "type": node.get("type", "ENTITY")
                }
            })
        
        elif typ == "NODE_DELETE":
            node_id = op.get("node_id")
            if not _valid_id(node_id):
                raise ValueError("INVALID_PATCH_RANGE: NODE_DELETE requires valid node_id")
            cleaned.append({
                "op_id": op_id,
                "type": typ,
                "t_ms": t_ms,
                "node_id": node_id
            })
        
        elif typ == "NODE_MASS_SCALE":
            node_id = op.get("node_id")
            if not _valid_id(node_id):
                raise ValueError("INVALID_PATCH_RANGE: NODE_MASS_SCALE requires valid node_id")
            scale = clamp(float(op.get("scale", 1.0)), MASS_SCALE_MIN, MASS_SCALE_MAX)
            cleaned.append({
                "op_id": op_id,
                "type": typ,
                "t_ms": t_ms,
                "node_id": node_id,
                "scale": scale
            })
        
        elif typ == "EDGE_WEIGHT_SET":
            a = op.get("a")
            b = op.get("b")
            if not _valid_id(a) or not _valid_id(b):
                raise ValueError("INVALID_PATCH_RANGE: EDGE_WEIGHT_SET requires valid a,b")
            flow = clamp(float(op.get("flow", 0.0)), 0.0, 1.0)
            cleaned.append({
                "op_id": op_id,
                "type": typ,
                "t_ms": t_ms,
                "a": a,
                "b": b,
                "flow": flow
            })
    
    # 결정론: t_ms, op_id로 정렬
    cleaned.sort(key=lambda x: (x["t_ms"], x["op_id"]))
    return cleaned


def validate_page3_patch(patch: Dict[str, Any]) -> Dict[str, Any]:
    """
    Page 3 patch 검증
    
    Allowed key: allocations
    Constraint: sum = 1.0
    """
    allowed = {"allocations"}
    for k in patch.keys():
        if k not in allowed:
            raise ValueError(f"INVALID_PATCH_KEY: {k}")
    
    if "allocations" not in patch or not isinstance(patch["allocations"], dict):
        raise ValueError("INVALID_PATCH_RANGE: allocations required")

    # Normalize
    normalized = normalize_allocations(patch["allocations"])
    
    # Snap to 0.01 step
    snapped = {k: round(normalized.get(k, 0.0) / ALLOCATION_STEP) * ALLOCATION_STEP for k in SLOTS}
    
    # Re-normalize after snapping
    renorm = normalize_allocations(snapped)
    
    return {"allocations": renorm}


def validate_allocation_sum(alloc: Dict[str, float]) -> bool:
    """Allocation 합계 검증"""
    total = sum(alloc.values())
    return abs(total - 1.0) < 0.01





