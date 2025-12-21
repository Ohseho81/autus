from fastapi import APIRouter
from core.autus.dean.cache import LRUCache

router = APIRouter(prefix="/autus/patterns", tags=["autus-patterns"])

# Global cache instance
pattern_cache = LRUCache(capacity=10000, ttl=600)

def slow_fetch_pattern(slot_hash: str) -> dict:
    """DB/Store에서 패턴 조회 (느린 경로)"""
    # TODO: 실제 저장소 연결
    return {"hash": slot_hash, "pattern": "default"}

@router.get("/{slot_hash}")
def get_pattern(slot_hash: str):
    """캐시 우선 패턴 조회"""
    hit = pattern_cache.get(slot_hash)
    if hit:
        return {"source": "cache", "data": hit}
    
    data = slow_fetch_pattern(slot_hash)
    if data:
        pattern_cache.set(slot_hash, data)
    return {"source": "store", "data": data}

@router.get("/stats/cache")
def cache_stats():
    """캐시 통계"""
    return pattern_cache.stats()
