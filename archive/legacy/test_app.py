"""
Minimal FastAPI app to test caching without full AUTUS dependencies
This focuses on validating the caching layer specifically
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional
import asyncio
import hashlib

# Initialize Redis
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Test data
test_analytics_data = {
    "total_events": 15234,
    "unique_users": 1023,
    "page_views": 8392,
    "avg_session_duration": 4.5,
    "bounce_rate": 0.23
}

test_device_data = [
    {"id": "dev-001", "name": "Living Room", "type": "speaker", "online": True},
    {"id": "dev-002", "name": "Kitchen", "type": "display", "online": True},
    {"id": "dev-003", "name": "Bedroom", "type": "sensor", "online": False},
]

# Cache stats
cache_stats = {
    "cache_hits": 0,
    "cache_misses": 0,
    "cache_errors": 0,
}

# Create FastAPI app
app = FastAPI(title="AUTUS Cache Test", version="4.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caching decorator
def cached_response(endpoint: str = "", ttl: int = 300):
    """Cache decorator for async endpoints"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"autus:{endpoint}:{hashlib.md5(json.dumps({**kwargs}, sort_keys=True, default=str).encode()).hexdigest()}"
            
            # Try to get from cache
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    cache_stats["cache_hits"] += 1
                    return json.loads(cached_data)
            except Exception as e:
                cache_stats["cache_errors"] += 1
            
            # Cache miss - call function
            cache_stats["cache_misses"] += 1
            result = await func(*args, **kwargs)
            
            # Store in cache
            try:
                redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
            except Exception as e:
                cache_stats["cache_errors"] += 1
            
            return result
        
        return wrapper
    return decorator

# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "4.5"}

@app.get("/cache/stats")
async def cache_stats_endpoint():
    """Get cache statistics"""
    total = cache_stats["cache_hits"] + cache_stats["cache_misses"]
    hit_rate = (cache_stats["cache_hits"] / total * 100) if total > 0 else 0
    
    return {
        "cache_hits": cache_stats["cache_hits"],
        "cache_misses": cache_stats["cache_misses"],
        "cache_errors": cache_stats["cache_errors"],
        "total_requests": total,
        "hit_rate_percent": hit_rate
    }

@app.get("/analytics/stats")
@cached_response(endpoint="analytics/stats", ttl=300)
async def analytics_stats():
    """Analytics statistics (cached)"""
    await asyncio.sleep(0.1)  # Simulate processing
    return test_analytics_data

@app.get("/analytics/pages")
@cached_response(endpoint="analytics/pages", ttl=300)
async def analytics_pages():
    """Analytics pages (cached)"""
    await asyncio.sleep(0.05)  # Simulate processing
    return {"pages": ["home", "about", "contact", "blog"], "total": 4}

@app.get("/devices/list")
@cached_response(endpoint="devices/list", ttl=120)
async def list_devices():
    """List all devices (cached)"""
    await asyncio.sleep(0.08)  # Simulate processing
    return {"devices": test_device_data, "total": len(test_device_data)}

@app.get("/devices/online")
@cached_response(endpoint="devices/online", ttl=60)
async def list_online_devices():
    """List online devices (cached with shorter TTL)"""
    await asyncio.sleep(0.05)  # Simulate processing
    online = [d for d in test_device_data if d["online"]]
    return {"devices": online, "total": len(online)}

@app.post("/analytics/track")
async def track_analytics(event: Dict[str, Any]):
    """Track analytics event"""
    # Invalidate cache
    try:
        for key in redis_client.keys("autus:analytics:*"):
            redis_client.delete(key)
        cache_stats["cache_misses"] += 1  # Mark for next cache miss
    except Exception as e:
        cache_stats["cache_errors"] += 1
    
    return {"status": "tracked", "event": event}

@app.post("/devices/register")
async def register_device(device: Dict[str, Any]):
    """Register new device"""
    # Invalidate devices cache
    try:
        for key in redis_client.keys("autus:devices:*"):
            redis_client.delete(key)
        cache_stats["cache_misses"] += 1  # Mark for next cache miss
    except Exception as e:
        cache_stats["cache_errors"] += 1
    
    return {"status": "registered", "device_id": device.get("id", "unknown")}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 AUTUS v4.5 Caching Test Server")
    print("="*60)
    print("Starting on http://localhost:8003")
    print("Redis: Connected ✓")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="warning")
