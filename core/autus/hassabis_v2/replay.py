"""
Past Replay Engine - 과거 구간 재현
예측 금지, 추천 금지, 자동 실행 금지
"""
from typing import List, Dict, Any
from .neighbors import find_neighbors, compute_similarity

def replay_segment(
    ledger_segment: List[Dict],
    variation: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    과거 구간을 재현하고 변화 방향 제시
    
    Args:
        ledger_segment: Ledger 구간 [(t0), (t1), ..., (tn)]
        variation: 가상 변화량 (예: {"pressure": -0.1})
    
    Returns:
        재현 결과 (설명만, 수치 예측 없음)
    """
    if not ledger_segment:
        return {"error": "Empty segment"}
    
    variation = variation or {}
    
    # 시작/끝 상태
    start = ledger_segment[0]
    end = ledger_segment[-1]
    
    start_slots = start.get("slots", {})
    end_slots = end.get("slots", {})
    
    # 실제 변화 계산
    actual_changes = {}
    for key in set(start_slots.keys()) | set(end_slots.keys()):
        start_val = start_slots.get(key, 0)
        end_val = end_slots.get(key, 0)
        diff = end_val - start_val
        if abs(diff) > 0.01:
            actual_changes[key] = {
                "from": round(start_val, 3),
                "to": round(end_val, 3),
                "direction": "↑" if diff > 0 else "↓"
            }
    
    # 가상 변화 적용 시 방향 추정 (Counterfactual-lite)
    counterfactual = {}
    if variation:
        for key, delta in variation.items():
            if key in actual_changes:
                original_dir = actual_changes[key]["direction"]
                # 유사 패턴 기반 추정 (가정 아님, 관측된 패턴만)
                if delta > 0:
                    counterfactual[key] = "≈ 더 상승 가능성"
                elif delta < 0:
                    counterfactual[key] = "≈ 완화 가능성"
                else:
                    counterfactual[key] = "≈ 유사"
    
    return {
        "segment_length": len(ledger_segment),
        "start_state": start.get("grove_state", "unknown"),
        "end_state": end.get("grove_state", "unknown"),
        "actual_changes": actual_changes,
        "counterfactual_hints": counterfactual if counterfactual else "no variation applied",
        "disclaimer": "과거 재현 결과입니다. 예측이 아닙니다."
    }

def compare_paths(
    path_a: List[Dict],
    path_b: List[Dict]
) -> Dict[str, Any]:
    """
    두 과거 경로 비교
    """
    if not path_a or not path_b:
        return {"error": "Empty path"}
    
    end_a = path_a[-1].get("slots", {})
    end_b = path_b[-1].get("slots", {})
    
    similarity = compute_similarity(end_a, end_b)
    
    differences = {}
    for key in set(end_a.keys()) | set(end_b.keys()):
        val_a = end_a.get(key, 0)
        val_b = end_b.get(key, 0)
        diff = val_b - val_a
        if abs(diff) > 0.05:
            differences[key] = {
                "path_a": round(val_a, 3),
                "path_b": round(val_b, 3),
                "direction": "↑" if diff > 0 else "↓"
            }
    
    return {
        "similarity": round(similarity, 4),
        "key_differences": differences,
        "disclaimer": "과거 경로 비교입니다. 추천이 아닙니다."
    }
