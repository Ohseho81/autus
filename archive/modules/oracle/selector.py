"""
AUTUS Oracle - Natural Selector
제8법칙: 선택 - 좋은 것만 살아남는다

Lines: ~30 (필연적 성공 구조)
"""
from typing import List, Dict, Any


class NaturalSelector:
    """
    자연선택 엔진
    
    필연적 성공:
    - 사용량 많으면 → 상위
    - 성공률 높으면 → 상위
    - 자연히 좋은 것만 생존
    """
    
    def __init__(self, min_usage: int = 10):
        self.min_usage = min_usage
    
    def rank(self, stats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Pack 순위 계산"""
        # 최소 사용량 필터
        valid = [s for s in stats if s.get("usage", 0) >= self.min_usage]
        
        # 점수 계산: 사용량 * 성공률
        for s in valid:
            usage = s.get("usage", 0)
            success_rate = s.get("success_rate", 0)
            s["score"] = usage * success_rate
        
        # 점수순 정렬
        return sorted(valid, key=lambda x: x.get("score", 0), reverse=True)
    
    def top(self, stats: List[Dict[str, Any]], n: int = 10) -> List[str]:
        """상위 N개 Pack 이름"""
        ranked = self.rank(stats)
        return [s["pack"] for s in ranked[:n]]
    
    def is_surviving(self, stat: Dict[str, Any]) -> bool:
        """생존 여부 판단"""
        return (
            stat.get("usage", 0) >= self.min_usage and
            stat.get("success_rate", 0) >= 0.5
        )


# 싱글톤
_selector = NaturalSelector()

def rank(stats: List[Dict]) -> List[Dict]:
    return _selector.rank(stats)

def top(stats: List[Dict], n: int = 10) -> List[str]:
    return _selector.top(stats, n)
