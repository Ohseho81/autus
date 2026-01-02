#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🛡️ AUTUS EMPIRE - Middleware (Rate Limiting & Caching)                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Rate Limiting + 캐싱 시스템
"""

import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from collections import defaultdict
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# Redis (선택적)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class MiddlewareConfig:
    """미들웨어 설정"""
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # 요청 수
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 시간 윈도우 (초)
    
    # Caching
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))  # 5분
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# In-Memory Storage (Redis 없을 때 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class InMemoryStorage:
    """인메모리 저장소 (개발/테스트용)"""
    
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        self._cleanup_expired()
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None):
        """값 저장"""
        self._data[key] = value
        if ttl:
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """값 삭제"""
        self._data.pop(key, None)
        self._expiry.pop(key, None)
    
    def incr_rate(self, key: str, window: int) -> int:
        """Rate limit 카운터 증가"""
        now = time.time()
        # 윈도우 내의 요청만 유지
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        self._rate_limits[key].append(now)
        return len(self._rate_limits[key])
    
    def _cleanup_expired(self):
        """만료된 항목 정리"""
        now = time.time()
        expired = [k for k, v in self._expiry.items() if now > v]
        for k in expired:
            self._data.pop(k, None)
            self._expiry.pop(k, None)


# 글로벌 스토리지
_storage = InMemoryStorage()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Redis Client (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_redis_client = None

def get_redis_client():
    """Redis 클라이언트 반환"""
    global _redis_client
    
    if not REDIS_AVAILABLE or not MiddlewareConfig.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(MiddlewareConfig.REDIS_URL)
            _redis_client.ping()
        except Exception as e:
            print(f"⚠️ Redis 연결 실패: {e}")
            _redis_client = None
    
    return _redis_client


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Rate Limiter
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate Limiter"""
    
    def __init__(self, requests: int = None, window: int = None):
        self.requests = requests or MiddlewareConfig.RATE_LIMIT_REQUESTS
        self.window = window or MiddlewareConfig.RATE_LIMIT_WINDOW
    
    def _get_client_id(self, request: Request) -> str:
        """클라이언트 식별자 추출"""
        # 1. API Key 헤더
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{hashlib.md5(api_key.encode()).hexdigest()[:16]}"
        
        # 2. Authorization 헤더
        auth = request.headers.get("Authorization")
        if auth:
            return f"auth:{hashlib.md5(auth.encode()).hexdigest()[:16]}"
        
        # 3. IP 주소
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def is_allowed(self, request: Request) -> tuple[bool, int, int]:
        """
        요청 허용 여부 확인
        
        Returns:
            (allowed, remaining, reset_time)
        """
        if not MiddlewareConfig.RATE_LIMIT_ENABLED:
            return True, self.requests, 0
        
        client_id = self._get_client_id(request)
        key = f"rate:{client_id}"
        
        redis_client = get_redis_client()
        
        if redis_client:
            # Redis 사용
            try:
                pipe = redis_client.pipeline()
                now = time.time()
                
                # Sliding window 방식
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window)
                
                _, _, count, _ = pipe.execute()
                
                remaining = max(0, self.requests - count)
                allowed = count <= self.requests
                
                return allowed, remaining, self.window
            except Exception:
                pass
        
        # In-memory 사용
        count = _storage.incr_rate(key, self.window)
        remaining = max(0, self.requests - count)
        allowed = count <= self.requests
        
        return allowed, remaining, self.window


def rate_limit_middleware(requests: int = None, window: int = None):
    """Rate Limit 미들웨어 팩토리"""
    limiter = RateLimiter(requests, window)
    
    async def middleware(request: Request, call_next):
        allowed, remaining, reset = limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after": reset,
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(reset),
                },
            )
        
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        response.headers["X-RateLimit-Limit"] = str(limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
    
    return middleware


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Cache
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Cache:
    """캐시 시스템"""
    
    @staticmethod
    def _make_key(prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix] + [str(a) for a in args]
        if kwargs:
            key_parts.append(hashlib.md5(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:8])
        return ":".join(key_parts)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """캐시 조회"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return None
        
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        
        return _storage.get(key)
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = None):
        """캐시 저장"""
        if not MiddlewareConfig.CACHE_ENABLED:
            return
        
        ttl = ttl or MiddlewareConfig.CACHE_DEFAULT_TTL
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        _storage.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        
        _storage.delete(key)
    
    @staticmethod
    def clear_pattern(pattern: str):
        """패턴에 맞는 캐시 삭제"""
        redis_client = get_redis_client()
        
        if redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except Exception:
                pass


def cached(prefix: str, ttl: int = None):
    """캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = Cache._make_key(prefix, *args, **kwargs)
            
            # 캐시 조회
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 미들웨어 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_middleware(app: FastAPI):
    """미들웨어 설정"""
    
    # Rate Limiting
    if MiddlewareConfig.RATE_LIMIT_ENABLED:
        @app.middleware("http")
        async def rate_limit(request: Request, call_next):
            return await rate_limit_middleware()(request, call_next)
        
        print(f"🛡️ Rate Limiting 활성화 ({MiddlewareConfig.RATE_LIMIT_REQUESTS}req/{MiddlewareConfig.RATE_LIMIT_WINDOW}s)")
    
    # 캐시 상태 확인
    if MiddlewareConfig.CACHE_ENABLED:
        redis_client = get_redis_client()
        if redis_client:
            print("💾 Redis 캐시 활성화")
        else:
            print("💾 In-Memory 캐시 활성화")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트 추가
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_cache_routes():
    """캐시 관리 라우터"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])
    
    @router.get("/stats")
    async def cache_stats():
        """캐시 상태"""
        redis_client = get_redis_client()
        
        return {
            "enabled": MiddlewareConfig.CACHE_ENABLED,
            "backend": "redis" if redis_client else "memory",
            "default_ttl": MiddlewareConfig.CACHE_DEFAULT_TTL,
        }
    
    @router.delete("/clear")
    async def clear_cache(pattern: str = "*"):
        """캐시 클리어"""
        Cache.clear_pattern(pattern)
        return {"success": True, "pattern": pattern}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🛡️ AUTUS Middleware Test")
    print("=" * 50)
    
    # 캐시 테스트
    print("\n1. Cache 테스트...")
    Cache.set("test_key", {"data": "hello"}, 10)
    result = Cache.get("test_key")
    print(f"   저장/조회: {result}")
    
    # Rate Limiter 테스트
    print("\n2. Rate Limiter 테스트...")
    limiter = RateLimiter(requests=5, window=60)
    
    # Mock request
    class MockRequest:
        class Client:
            host = "127.0.0.1"
        client = Client()
        headers = {}
    
    for i in range(7):
        allowed, remaining, _ = limiter.is_allowed(MockRequest())
        print(f"   요청 {i+1}: allowed={allowed}, remaining={remaining}")
    
    print("\n✅ 테스트 완료!")





















