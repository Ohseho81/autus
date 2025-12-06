"""
AUTUS Oracle - Compassion Checker
제13법칙: 자비 - 인간이 불행해지지 않는지 확인

Lines: ~20 (필연적 성공 구조)
"""
from typing import Dict, Any
from collections import defaultdict


class CompassionChecker:
    """
    자비 검증기
    
    필연적 성공:
    - 피드백 수집 → 1클릭
    - 부정 피드백 → 경고
    - 경고 → 검토 → 수정
    """
    
    def __init__(self, threshold: float = 0.3):
        self.feedback: Dict[str, Dict[str, int]] = defaultdict(lambda: {"happy": 0, "unhappy": 0})
        self.threshold = threshold  # 불행 비율 임계값
    
    def record(self, pack_name: str, is_happy: bool) -> None:
        """피드백 기록 (😊 or 😢)"""
        key = "happy" if is_happy else "unhappy"
        self.feedback[pack_name][key] += 1
    
    def check(self, pack_name: str) -> Dict[str, Any]:
        """자비 검증"""
        f = self.feedback[pack_name]
        total = f["happy"] + f["unhappy"]
        
        if total == 0:
            return {"pack": pack_name, "status": "unknown", "total": 0}
        
        unhappy_rate = f["unhappy"] / total
        
        return {
            "pack": pack_name,
            "status": "warning" if unhappy_rate > self.threshold else "ok",
            "happy": f["happy"],
            "unhappy": f["unhappy"],
            "unhappy_rate": round(unhappy_rate, 2),
            "needs_review": unhappy_rate > self.threshold
        }
    
    def ask(self) -> str:
        """최후의 질문"""
        return "이것이 인간을 불행하게 하는가?"


# 싱글톤
_checker = CompassionChecker()

def happy(pack: str) -> None:
    _checker.record(pack, True)

def unhappy(pack: str) -> None:
    _checker.record(pack, False)

def check(pack: str) -> Dict:
    return _checker.check(pack)
