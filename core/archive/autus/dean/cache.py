import time
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity=10000, ttl=600):
        self.capacity = capacity
        self.ttl = ttl
        self.store = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        item = self.store.get(key)
        if not item:
            self.misses += 1
            return None
        value, ts = item
        if time.time() - ts > self.ttl:
            self.store.pop(key, None)
            self.misses += 1
            return None
        self.store.move_to_end(key)
        self.hits += 1
        return value

    def set(self, key, value):
        if key in self.store:
            self.store.move_to_end(key)
        self.store[key] = (value, time.time())
        if len(self.store) > self.capacity:
            self.store.popitem(last=False)

    def stats(self):
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "size": len(self.store)
        }
