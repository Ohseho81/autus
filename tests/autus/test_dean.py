import sys
sys.path.insert(0, '.')
from core.autus.dean.cache import LRUCache
from core.autus.dean.guard import safe_call

def test_cache_hit():
    cache = LRUCache(capacity=10, ttl=60)
    cache.set("key1", "value1")
    assert cache.get("key1") == "value1"

def test_cache_miss():
    cache = LRUCache(capacity=10, ttl=60)
    assert cache.get("nonexistent") is None

def test_cache_lru_eviction():
    cache = LRUCache(capacity=3, ttl=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.set("d", 4)
    assert cache.get("a") is None
    assert cache.get("d") == 4

def test_safe_call_success():
    def good_fn():
        return "ok"
    assert safe_call(good_fn) == "ok"

def test_safe_call_failure():
    def bad_fn():
        raise Exception("fail")
    assert safe_call(bad_fn) is None

def test_cache_stats():
    cache = LRUCache()
    cache.set("x", 1)
    cache.get("x")
    cache.get("y")
    stats = cache.stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
