"""
AUTUS Oracle - Metric Collector
제11법칙: 균형 - 사용하면 자동으로 데이터가 쌓인다

Lines: ~50 (필연적 성공 구조)
"""
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict
import json
import hashlib


class MetricCollector:
    """
    메트릭 수집기
    
    필연적 성공:
    - 사용하면 → 자동 수집
    - 수집하면 → 패턴 생성
    - 패턴 생성 → Oracle 강화
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        self.metrics: Dict[str, Any] = defaultdict(lambda: {
            "count": 0,
            "success": 0,
            "total_time_ms": 0,
            "last_used": None
        })
        self.storage_path = storage_path
    
    def record(self, pack_name: str, success: bool, execution_time_ms: float) -> None:
        """Pack 실행 기록 (자동 호출)"""
        m = self.metrics[pack_name]
        m["count"] += 1
        m["success"] += 1 if success else 0
        m["total_time_ms"] += execution_time_ms
        m["last_used"] = datetime.utcnow().isoformat()
    
    def get_stats(self, pack_name: str) -> Dict[str, Any]:
        """Pack 통계 조회"""
        m = self.metrics.get(pack_name, {})
        if not m or m.get("count", 0) == 0:
            return {"pack": pack_name, "usage": 0}
        
        return {
            "pack": pack_name,
            "usage": m["count"],
            "success_rate": m["success"] / m["count"],
            "avg_time_ms": m["total_time_ms"] / m["count"],
            "last_used": m["last_used"]
        }
    
    def get_all_stats(self) -> list:
        """전체 통계 (익명, 집계만)"""
        return [self.get_stats(name) for name in self.metrics.keys()]
    
    def get_anonymous_hash(self) -> str:
        """익명 해시 (개인 식별 불가)"""
        data = json.dumps(dict(self.metrics), sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()[:16]


# 싱글톤 인스턴스
_collector = MetricCollector()

def record(pack_name: str, success: bool, time_ms: float) -> None:
    """전역 기록 함수"""
    _collector.record(pack_name, success, time_ms)

def stats(pack_name: str = None) -> Any:
    """전역 통계 함수"""
    if pack_name:
        return _collector.get_stats(pack_name)
    return _collector.get_all_stats()
