"""
Redis Caching Layer for AUTUS

Provides:
- Connection pooling
- Response caching with TTL
- Cache invalidation strategies
- Metrics tracking
"""

import json
import hashlib
import redis
import logging
from typing import Any, Optional, Callable
from functools import wraps
import time
from datetime import timedelta

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client: Optional[redis.Redis] = None

class CacheConfig:
    """Cache configuration with dynamic TTL strategies"""
    # TTL strategies (seconds) - Optimized based on data freshness requirements
    TTL_ANALYTICS = 300          # 5 minutes for analytics (medium refresh)
    TTL_DEVICES = 180            # 3 minutes for device lists (increased from 120)
    TTL_TWIN = 900               # 15 minutes for twin data (increased from 600)
    TTL_GOD = 600                # 10 minutes for god endpoints (doubled from 300)
    TTL_HEALTH = 10              # 10 seconds for health checks (decreased from 30)
    TTL_DEFAULT = 120            # 2 minutes default (doubled from 60)
    TTL_LONG = 1800              # 30 minutes for rarely-changed data
    TTL_VERY_LONG = 3600         # 1 hour for static data
    
    # Cache key prefixes
    PREFIX_ANALYTICS = "autus:analytics:"
    PREFIX_DEVICES = "autus:devices:"
    PREFIX_TWIN = "autus:twin:"
    PREFIX_GOD = "autus:god:"
    PREFIX_HEALTH = "autus:health:"
    PREFIX_CONFIG = "autus:config:"
    
    # Tag-based cache invalidation for batch operations
    TAGS = {
        "analytics": ["autus:analytics:*", "autus:god:*"],
        "devices": ["autus:devices:*", "autus:god:*"],
        "config": ["autus:config:*"],
        "all": ["autus:*"]
    }
    
    # Invalidation patterns by endpoint
    INVALIDATE_ON_WRITE = {
        "/analytics/track": ["analytics"],
        "/analytics/bulk": ["analytics"],
        "/devices/register": ["devices"],
        "/devices/update": ["devices"],
        "/config/update": ["config", "all"]
    }

# Metrics for caching
cache_hits = 0
cache_misses = 0
cache_errors = 0

def get_redis_client() -> redis.Redis:
    """Get or create Redis client"""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30
            )
            # Test connection
            _redis_client.ping()
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            _redis_client = None
    return _redis_client

def is_redis_available() -> bool:
    """Check if Redis is available"""
    try:
        client = get_redis_client()
        return client is not None and client.ping()
    except:
        return False

def generate_cache_key(endpoint: str, params: dict = None, method: str = "GET") -> str:
    """Generate cache key from endpoint and parameters"""
    key_parts = [endpoint]
    
    if params:
        # Sort params for consistent keys
        sorted_params = sorted(params.items())
        param_str = json.dumps(sorted_params)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()
        key_parts.append(param_hash)
    
    key_parts.append(method)
    return ":".join(key_parts)

def get_cache_ttl(endpoint: str) -> int:
    """Get TTL for endpoint"""
    if endpoint.startswith("/analytics"):
        return CacheConfig.TTL_ANALYTICS
    elif endpoint.startswith("/devices"):
        return CacheConfig.TTL_DEVICES
    elif endpoint.startswith("/twin"):
        return CacheConfig.TTL_TWIN
    elif endpoint.startswith("/god"):
        return CacheConfig.TTL_GOD
    elif endpoint.startswith("/health"):
        return CacheConfig.TTL_HEALTH
    return CacheConfig.TTL_DEFAULT

def cache_get(key: str) -> Optional[Any]:
    """Get value from cache"""
    global cache_hits, cache_misses, cache_errors
    
    try:
        client = get_redis_client()
        if not client:
            cache_errors += 1
            return None
        
        value = client.get(key)
        if value:
            cache_hits += 1
            try:
                return json.loads(value)
            except:
                return value
        else:
            cache_misses += 1
            return None
    except Exception as e:
        cache_errors += 1
        logger.error(f"Cache get error: {e}")
        return None

def cache_set(key: str, value: Any, ttl: int = None) -> bool:
    """Set value in cache with TTL"""
    try:
        client = get_redis_client()
        if not client:
            return False
        
        # Serialize value
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        
        # Set with TTL
        if ttl:
            client.setex(key, ttl, value)
        else:
            client.set(key, value)
        
        return True
    except Exception as e:
        logger.error(f"Cache set error: {e}")
        return False

def cache_delete(key: str) -> bool:
    """Delete key from cache"""
    try:
        client = get_redis_client()
        if not client:
            return False
        client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Cache delete error: {e}")
        return False

def cache_invalidate(pattern: str) -> int:
    """Invalidate cache keys matching pattern"""
    try:
        client = get_redis_client()
        if not client:
            return 0
        
        # Get all keys matching pattern
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception as e:
        logger.error(f"Cache invalidate error: {e}")
        return 0

def cached_response(endpoint: str = None, ttl: int = None):
    """Decorator for caching endpoint responses
    
    Usage:
        @app.get("/analytics/stats")
        @cached_response(endpoint="/analytics/stats", ttl=300)
        async def get_stats():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_endpoint = endpoint or getattr(func, '__name__', 'unknown')
            cache_ttl = ttl or get_cache_ttl(cache_endpoint)
            cache_key = generate_cache_key(cache_endpoint, kwargs)
            
            # Try to get from cache
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value
            
            # Call original function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache_set(cache_key, result, cache_ttl)
            logger.debug(f"Cache miss, stored: {cache_key}")
            
            return result
        
        return wrapper
    return decorator

def get_cache_stats() -> dict:
    """Get cache statistics"""
    total = cache_hits + cache_misses
    hit_rate = (cache_hits / total * 100) if total > 0 else 0
    
    return {
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "cache_errors": cache_errors,
        "total_requests": total,
        "hit_rate_percent": round(hit_rate, 2)
    }

def reset_cache_stats():
    """Reset cache statistics"""
    global cache_hits, cache_misses, cache_errors
    cache_hits = 0
    cache_misses = 0
    cache_errors = 0

def warmup_cache():
    """Warm up cache with common endpoints
    
    Pre-cache frequently accessed endpoints
    """
    try:
        client = get_redis_client()
        if not client:
            return 0
        
        logger.info("🔥 Warming up cache with common endpoints...")
        count = 0
        
        # Could add pre-cached data here
        # This is a placeholder for future warming strategies
        
        logger.info(f"✅ Cache warmup complete: {count} keys")
        return count
    except Exception as e:
        logger.error(f"Cache warmup error: {e}")
        return 0

# Initialization
def init_cache():
    """Initialize caching layer"""
    if is_redis_available():
        logger.info("✅ Redis cache layer initialized")
        warmup_cache()
        return True
    else:
        logger.warning("⚠️ Redis not available, caching disabled")
        return False
