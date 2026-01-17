"""
🏛️ AUTUS Portal API
프론트엔드 Portal과 연동되는 엔드포인트
"""

from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime
import random

router = APIRouter(tags=["Portal"])

# ═══════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_NODES = [
    {"id": "hq", "name": "본사 운영", "lat": 37.5665, "lng": 126.9780, "mass": 9.2, "psi": 0.92, "entropy": 0.3, "gate": "OBSERVE"},
    {"id": "gangnam", "name": "강남 지사", "lat": 37.4979, "lng": 127.0276, "mass": 7.5, "psi": 0.78, "entropy": 0.6, "gate": "RING"},
    {"id": "pangyo", "name": "판교 R&D", "lat": 37.3947, "lng": 127.1119, "mass": 6.8, "psi": 0.65, "entropy": 0.4, "gate": "OBSERVE"},
    {"id": "capital", "name": "주요 자금", "lat": 37.5172, "lng": 127.0473, "mass": 8.5, "psi": 0.90, "entropy": 0.2, "gate": "OBSERVE"},
]

PRESETS = [
    {"id": "startup_core", "name": "Startup Core", "multiplier": 0.8},
    {"id": "regulated", "name": "Regulated Zone", "multiplier": 1.5},
    {"id": "crisis", "name": "Crisis Mode", "multiplier": 2.0},
]

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
async def get_status():
    """시스템 상태"""
    return {
        "status": "operational",
        "total_entropy": round(random.uniform(0.1, 0.3), 2),
        "active_nodes": len(SAMPLE_NODES),
        "gate_state": "OPEN",
        "sim_time": round(random.uniform(2.5, 3.5), 2),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/nodes")
async def get_nodes():
    """노드 목록"""
    return {"nodes": SAMPLE_NODES}

@router.get("/simulate/{node_id}")
async def simulate(node_id: str, t: float = 0.5):
    """시뮬레이션 실행"""
    node = next((n for n in SAMPLE_NODES if n["id"] == node_id), None)
    if not node:
        return {"error": "Node not found"}
    
    frames = []
    for n in SAMPLE_NODES:
        frames.append({
            "node_id": n["id"],
            "wave_radius": random.uniform(1000, 5000),
            "impact": random.uniform(0.1, 0.9),
            "gate_state": n["gate"]
        })
    
    return {
        "focus": node_id,
        "t": t,
        "frames": frames,
        "total_entropy": round(random.uniform(0.1, 0.3), 2)
    }

@router.get("/presets")
async def get_presets():
    """프리셋 목록"""
    return {"presets": PRESETS}

@router.post("/presets/{preset_id}/apply")
async def apply_preset(preset_id: str):
    """프리셋 적용 (금지됨)"""
    return {
        "error": "FORBIDDEN",
        "message": "Apply endpoint does not exist in AUTUS. Presets resolve automatically.",
        "preset_id": preset_id
    }
