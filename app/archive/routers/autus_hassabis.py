from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
sys.path.insert(0, '.')

from core.autus.hassabis_v2.replay import replay_segment, compare_paths
from core.autus.hassabis_v2.neighbors import find_neighbors
from core.autus.hassabis_v2.explain import generate_explanation
from core.autus.dean.guard import safe_call

router = APIRouter(prefix="/autus/hassabis", tags=["autus-hassabis"])

# Mock ledger for demo (실제로는 GMU ledger 연결)
mock_ledger = []

class ReplayRequest(BaseModel):
    gmu_id: str
    start_idx: int = 0
    end_idx: int = -1
    variation: Optional[Dict[str, float]] = None

class CompareRequest(BaseModel):
    gmu_id_a: str
    gmu_id_b: str

@router.post("/replay")
def replay(req: ReplayRequest, background_tasks: BackgroundTasks):
    """
    과거 구간 재현 (예측 아님)
    """
    # 실제로는 GMU ledger에서 가져옴
    segment = mock_ledger[req.start_idx:req.end_idx] if mock_ledger else []
    
    if not segment:
        # Demo용 mock 데이터
        segment = [
            {"slots": {"Brain": 0.5, "Heart": 0.6, "Core": 0.7}, "grove_state": "normal"},
            {"slots": {"Brain": 0.6, "Heart": 0.5, "Core": 0.8}, "grove_state": "tension"},
            {"slots": {"Brain": 0.7, "Heart": 0.4, "Core": 0.9}, "grove_state": "inflection"},
        ]
    
    result = safe_call(replay_segment, segment, req.variation)
    
    if result:
        neighbors = safe_call(find_neighbors, segment[-1].get("slots", {}), segment)
        explanation = safe_call(generate_explanation, result, neighbors or [])
        result["explanation"] = explanation
    
    return result or {"error": "Replay failed", "disclaimer": "시스템 영향 없음"}

@router.post("/compare")
def compare(req: CompareRequest):
    """
    두 GMU 경로 비교 (추천 아님)
    """
    # Demo용 mock
    path_a = [
        {"slots": {"Brain": 0.5, "Core": 0.7}, "grove_state": "normal"},
        {"slots": {"Brain": 0.8, "Core": 0.9}, "grove_state": "growth"},
    ]
    path_b = [
        {"slots": {"Brain": 0.5, "Core": 0.7}, "grove_state": "normal"},
        {"slots": {"Brain": 0.6, "Core": 0.6}, "grove_state": "tension"},
    ]
    
    result = safe_call(compare_paths, path_a, path_b)
    return result or {"error": "Compare failed"}

@router.get("/neighbors/{slot_hash}")
def get_neighbors(slot_hash: str):
    """
    유사 패턴 탐색
    """
    # Demo용 target
    target = {"Brain": 0.6, "Heart": 0.5, "Core": 0.8}
    history = [
        {"id": "p1", "slots": {"Brain": 0.6, "Heart": 0.5, "Core": 0.8}, "grove_state": "tension"},
        {"id": "p2", "slots": {"Brain": 0.7, "Heart": 0.6, "Core": 0.7}, "grove_state": "normal"},
        {"id": "p3", "slots": {"Brain": 0.1, "Heart": 0.1, "Core": 0.1}, "grove_state": "normal"},
    ]
    
    neighbors = find_neighbors(target, history, threshold=0.8)
    return {
        "target": target,
        "neighbors": [{"pattern": n[0], "similarity": n[1]} for n in neighbors],
        "disclaimer": "과거 패턴 참조입니다."
    }
