"""
AUTUS Redis Client
==================

Redis Pub/Sub 및 캐싱
"""

from typing import Optional, Any, Dict
import json
import asyncio

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    aioredis = None

from .config import settings


class RedisClient:
    """Redis 클라이언트 (비동기)"""
    
    def __init__(self, url: str = None):
        self.url = url or settings.REDIS_URL
        self.client: Optional[Any] = None
        self.pubsub: Optional[Any] = None
    
    async def connect(self):
        """Redis 연결"""
        if not REDIS_AVAILABLE:
            raise RuntimeError("redis package not installed")
        
        self.client = aioredis.from_url(
            self.url,
            encoding="utf-8",
            decode_responses=True
        )
        
        # 연결 테스트
        await self.client.ping()
    
    async def disconnect(self):
        """연결 해제"""
        if self.pubsub:
            await self.pubsub.close()
        if self.client:
            await self.client.close()
    
    async def get(self, key: str) -> Optional[str]:
        """키 조회"""
        if not self.client:
            return None
        return await self.client.get(key)
    
    async def set(self, key: str, value: str, expire: int = None):
        """키 설정"""
        if not self.client:
            return
        await self.client.set(key, value, ex=expire)
    
    async def delete(self, key: str):
        """키 삭제"""
        if not self.client:
            return
        await self.client.delete(key)
    
    async def get_json(self, key: str) -> Optional[Dict]:
        """JSON 조회"""
        value = await self.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set_json(self, key: str, data: Dict, expire: int = None):
        """JSON 설정"""
        await self.set(key, json.dumps(data, ensure_ascii=False), expire)
    
    async def publish(self, channel: str, message: Dict):
        """Pub/Sub 발행"""
        if not self.client:
            return
        await self.client.publish(channel, json.dumps(message, ensure_ascii=False))
    
    async def subscribe(self, channel: str):
        """Pub/Sub 구독"""
        if not self.client:
            return None
        
        self.pubsub = self.client.pubsub()
        await self.pubsub.subscribe(channel)
        return self.pubsub
    
    async def listen(self, callback):
        """메시지 리스닝"""
        if not self.pubsub:
            return
        
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await callback(data)
    
    # Cache helpers
    async def cache_get(self, key: str) -> Optional[Dict]:
        """캐시 조회"""
        return await self.get_json(f"cache:{key}")
    
    async def cache_set(self, key: str, data: Dict, ttl: int = 300):
        """캐시 설정 (기본 5분)"""
        await self.set_json(f"cache:{key}", data, expire=ttl)
    
    async def cache_delete(self, key: str):
        """캐시 삭제"""
        await self.delete(f"cache:{key}")


class MockRedisClient:
    """Mock Redis (Redis 없을 때)"""
    
    def __init__(self):
        self._store: Dict[str, str] = {}
    
    async def connect(self):
        pass
    
    async def disconnect(self):
        pass
    
    async def get(self, key: str) -> Optional[str]:
        return self._store.get(key)
    
    async def set(self, key: str, value: str, expire: int = None):
        self._store[key] = value
    
    async def delete(self, key: str):
        self._store.pop(key, None)
    
    async def get_json(self, key: str) -> Optional[Dict]:
        value = self._store.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set_json(self, key: str, data: Dict, expire: int = None):
        self._store[key] = json.dumps(data)
    
    async def publish(self, channel: str, message: Dict):
        pass
    
    async def subscribe(self, channel: str):
        return None
    
    async def cache_get(self, key: str) -> Optional[Dict]:
        return await self.get_json(f"cache:{key}")
    
    async def cache_set(self, key: str, data: Dict, ttl: int = 300):
        await self.set_json(f"cache:{key}", data)
    
    async def cache_delete(self, key: str):
        await self.delete(f"cache:{key}")


def create_redis_client() -> RedisClient:
    """Redis 클라이언트 팩토리"""
    if REDIS_AVAILABLE:
        return RedisClient()
    else:
        return MockRedisClient()

