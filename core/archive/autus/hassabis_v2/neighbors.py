"""
유사 패턴 탐색 - 가정 없이 과거 데이터만 사용
"""
import math
from typing import List, Dict, Tuple

def compute_similarity(slots_a: Dict[str, float], slots_b: Dict[str, float]) -> float:
    """코사인 유사도 계산"""
    keys = set(slots_a.keys()) | set(slots_b.keys())
    if not keys:
        return 0.0
    
    dot = sum(slots_a.get(k, 0) * slots_b.get(k, 0) for k in keys)
    norm_a = math.sqrt(sum(slots_a.get(k, 0) ** 2 for k in keys))
    norm_b = math.sqrt(sum(slots_b.get(k, 0) ** 2 for k in keys))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

def find_neighbors(
    target_slots: Dict[str, float],
    history: List[Dict],
    threshold: float = 0.85,
    max_results: int = 5
) -> List[Tuple[Dict, float]]:
    """
    유사도 >= threshold인 과거 패턴 찾기
    반환: [(패턴, 유사도), ...]
    """
    results = []
    for record in history:
        slots = record.get("slots", {})
        sim = compute_similarity(target_slots, slots)
        if sim >= threshold:
            results.append((record, round(sim, 4)))
    
    # 유사도 높은 순 정렬
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:max_results]
