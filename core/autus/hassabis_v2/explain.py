"""
Explain Log - 결과 설명 생성
"""
from typing import List, Dict, Any

def generate_explanation(
    replay_result: Dict[str, Any],
    neighbor_patterns: List[tuple] = None
) -> Dict[str, Any]:
    """
    재현 결과에 대한 설명 생성
    """
    neighbor_patterns = neighbor_patterns or []
    
    # 핵심 변화 슬롯 추출
    changes = replay_result.get("actual_changes", {})
    key_slots = [k for k, v in changes.items() if v.get("direction") in ["↑", "↓"]]
    
    # 유사 패턴 요약
    pattern_refs = []
    for pattern, sim in neighbor_patterns[:3]:
        pattern_refs.append({
            "pattern_id": pattern.get("id", "unknown"),
            "similarity": sim,
            "grove_state": pattern.get("grove_state", "unknown")
        })
    
    explanation = {
        "summary": f"구간 내 {len(key_slots)}개 슬롯 변화 감지",
        "key_factors": key_slots,
        "state_transition": f"{replay_result.get('start_state')} → {replay_result.get('end_state')}",
        "reference_patterns": pattern_refs if pattern_refs else "유사 패턴 없음",
        "confidence": "관측 기반" if pattern_refs else "단독 분석",
        "disclaimer": "이 설명은 과거 데이터 기반이며, 미래 예측이 아닙니다."
    }
    
    return explanation
