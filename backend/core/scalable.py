"""
═══════════════════════════════════════════════════════════════════════════════
📈 AUTUS v2.1 - Scalability Layer
═══════════════════════════════════════════════════════════════════════════════

확장성을 위한 추상화 레이어
- 캐싱
- 세션 관리
- 연결 풀링
- 분산 처리 준비

사용법:
  from backend.core.scalable import ScalableAutus
  system = ScalableAutus(user_id="user123")
"""

import json
import hashlib
from typing import Dict, Optional, Any
from functools import lru_cache
from datetime import datetime
from abc import ABC, abstractmethod

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Storage Interface (확장 가능)
# ═══════════════════════════════════════════════════════════════════════════════

class StateStorage(ABC):
    """상태 저장소 인터페이스 - Redis/PostgreSQL로 교체 가능"""
    
    @abstractmethod
    def save(self, key: str, data: dict, ttl: int = 3600) -> bool:
        pass
    
    @abstractmethod
    def load(self, key: str) -> Optional[dict]:
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        pass


class MemoryStorage(StateStorage):
    """인메모리 저장소 (개발/테스트용)"""
    
    _store: Dict[str, dict] = {}
    
    def save(self, key: str, data: dict, ttl: int = 3600) -> bool:
        self._store[key] = {
            "data": data,
            "expires": datetime.now().timestamp() + ttl
        }
        return True
    
    def load(self, key: str) -> Optional[dict]:
        item = self._store.get(key)
        if not item:
            return None
        if datetime.now().timestamp() > item["expires"]:
            del self._store[key]
            return None
        return item["data"]
    
    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False


class RedisStorage(StateStorage):
    """Redis 저장소 (프로덕션용) - redis 패키지 필요"""
    
    def __init__(self, url: str = "redis://localhost:6379"):
        try:
            import redis
            self.client = redis.from_url(url)
            self.available = True
        except ImportError:
            self.client = None
            self.available = False
            print("⚠️ Redis 미설치 - MemoryStorage로 폴백")
    
    def save(self, key: str, data: dict, ttl: int = 3600) -> bool:
        if not self.available:
            return False
        self.client.setex(key, ttl, json.dumps(data))
        return True
    
    def load(self, key: str) -> Optional[dict]:
        if not self.available:
            return None
        data = self.client.get(key)
        return json.loads(data) if data else None
    
    def delete(self, key: str) -> bool:
        if not self.available:
            return False
        return bool(self.client.delete(key))


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Compute Cache (성능 최적화)
# ═══════════════════════════════════════════════════════════════════════════════

class ComputeCache:
    """계산 결과 캐싱"""
    
    def __init__(self, maxsize: int = 10000):
        self.maxsize = maxsize
        self._cache: Dict[str, Any] = {}
    
    def _make_key(self, func_name: str, *args) -> str:
        """캐시 키 생성"""
        key_data = f"{func_name}:{str(args)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)
    
    def set(self, key: str, value: Any) -> None:
        if len(self._cache) >= self.maxsize:
            # LRU 대신 간단히 절반 삭제
            keys = list(self._cache.keys())[:self.maxsize // 2]
            for k in keys:
                del self._cache[k]
        self._cache[key] = value
    
    def cached(self, func):
        """데코레이터로 사용"""
        def wrapper(*args, **kwargs):
            key = self._make_key(func.__name__, *args)
            cached_result = self.get(key)
            if cached_result is not None:
                return cached_result
            result = func(*args, **kwargs)
            self.set(key, result)
            return result
        return wrapper


# 전역 캐시 인스턴스
_compute_cache = ComputeCache()


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Scalable AUTUS System
# ═══════════════════════════════════════════════════════════════════════════════

class ScalableAutus:
    """확장 가능한 AUTUS 시스템"""
    
    # 클래스 레벨 저장소 (싱글톤)
    _storage: Optional[StateStorage] = None
    _cache: ComputeCache = _compute_cache
    
    def __init__(
        self, 
        user_id: str,
        storage: Optional[StateStorage] = None
    ):
        self.user_id = user_id
        self._state_key = f"autus:state:{user_id}"
        
        # 저장소 초기화 (한 번만)
        if ScalableAutus._storage is None:
            ScalableAutus._storage = storage or MemoryStorage()
        
        # 지연 로딩을 위한 내부 시스템
        self._system = None
    
    @property
    def system(self):
        """지연 로딩으로 시스템 초기화"""
        if self._system is None:
            from autus_system import AutusSystem
            self._system = AutusSystem()
            
            # 저장된 상태 복원
            saved_state = self._storage.load(self._state_key)
            if saved_state:
                self._restore_state(saved_state)
        
        return self._system
    
    def _restore_state(self, state: dict) -> None:
        """저장된 상태 복원"""
        from backend.core import ALL_NODES, DataSource
        
        for node_id, node_data in state.get("nodes", {}).items():
            if node_id in self.system.nodes:
                from backend.core import update_node_value
                self.system.nodes[node_id] = update_node_value(
                    self.system.nodes[node_id],
                    node_data["value"],
                    DataSource.MANUAL
                )
    
    def _save_state(self) -> None:
        """현재 상태 저장"""
        state = {
            "nodes": {
                nid: {"value": n.value, "pressure": n.pressure}
                for nid, n in self.system.nodes.items()
            },
            "cycles": self.system.cycle_count,
            "updated_at": datetime.now().isoformat()
        }
        self._storage.save(self._state_key, state)
    
    def sense(self, node_id: str, value: float) -> dict:
        """데이터 주입 + 자동 저장"""
        result = self.system.sense(node_id, value)
        self._save_state()
        return result
    
    def sense_batch(self, data: dict) -> dict:
        """배치 데이터 주입 + 자동 저장"""
        result = self.system.sense_batch(data, "batch")
        self._save_state()
        return result
    
    def cycle(self) -> dict:
        """사이클 실행 (캐시 활용)"""
        result = self.system.cycle()
        
        # 주기적 저장 (10 사이클마다)
        if self.system.cycle_count % 10 == 0:
            self._save_state()
        
        return result
    
    def get_status(self) -> dict:
        """상태 조회"""
        return self.system.get_status()
    
    @classmethod
    def set_storage(cls, storage: StateStorage) -> None:
        """전역 저장소 설정 (서버 시작 시 호출)"""
        cls._storage = storage
    
    @classmethod
    def use_redis(cls, url: str = "redis://localhost:6379") -> None:
        """Redis 저장소 사용"""
        cls._storage = RedisStorage(url)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Connection Pool (다중 사용자)
# ═══════════════════════════════════════════════════════════════════════════════

class SystemPool:
    """시스템 인스턴스 풀"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._pool: Dict[str, ScalableAutus] = {}
        self._access_order: list = []
    
    def get(self, user_id: str) -> ScalableAutus:
        """사용자별 시스템 인스턴스 획득"""
        if user_id not in self._pool:
            # 풀 크기 제한
            if len(self._pool) >= self.max_size:
                # LRU 제거
                oldest = self._access_order.pop(0)
                del self._pool[oldest]
            
            self._pool[user_id] = ScalableAutus(user_id)
        
        # 접근 순서 업데이트
        if user_id in self._access_order:
            self._access_order.remove(user_id)
        self._access_order.append(user_id)
        
        return self._pool[user_id]
    
    def release(self, user_id: str) -> None:
        """시스템 인스턴스 해제"""
        if user_id in self._pool:
            del self._pool[user_id]
        if user_id in self._access_order:
            self._access_order.remove(user_id)
    
    @property
    def size(self) -> int:
        return len(self._pool)


# 전역 풀 인스턴스
system_pool = SystemPool()


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Factory Functions
# ═══════════════════════════════════════════════════════════════════════════════

def get_system(user_id: str) -> ScalableAutus:
    """사용자별 시스템 획득 (권장 진입점)"""
    return system_pool.get(user_id)


def configure_production(redis_url: str = None):
    """프로덕션 설정"""
    if redis_url:
        ScalableAutus.use_redis(redis_url)
    else:
        # 환경 변수에서 읽기
        import os
        url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        ScalableAutus.use_redis(url)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    import os
    # 프로젝트 루트 추가
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
    print("=" * 60)
    print("🧪 ScalableAutus 테스트")
    print("=" * 60)
    
    # 다중 사용자 시뮬레이션
    users = [f"user_{i}" for i in range(100)]
    
    import time
    start = time.time()
    
    for user_id in users:
        system = get_system(user_id)
        system.sense_batch({"n01": 25000000, "n09": 6.5})
        system.cycle()
    
    elapsed = time.time() - start
    
    print(f"✓ {len(users)}명 사용자 처리: {elapsed:.2f}초")
    print(f"✓ 풀 크기: {system_pool.size}")
    print(f"✓ 처리량: {len(users)/elapsed:.0f} users/sec")
    print("=" * 60)
