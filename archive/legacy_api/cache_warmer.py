"""
Automatic cache warming on application startup

Pre-caches frequently accessed endpoints to maximize cache hit rate
and reduce initial request latency
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from api.cache import cache_set, cache_get, cache_invalidate

logger = logging.getLogger(__name__)


class CacheWarmer:
    """Manage cache warming strategy"""
    
    def __init__(self):
        self.warm_items: List[Dict[str, Any]] = []
        self.warmup_complete = False
        self.warmup_duration_ms = 0
    
    def add_warm_item(
        self,
        key: str,
        data: Any,
        ttl: int = 3600,
        priority: int = 0
    ):
        """Add item to warm-up list"""
        self.warm_items.append({
            "key": key,
            "data": data,
            "ttl": ttl,
            "priority": priority
        })
    
    async def warmup(self) -> Dict[str, Any]:
        """Execute cache warm-up"""
        import time
        start_time = time.time()
        
        logger.info(f"🔥 Starting cache warm-up: {len(self.warm_items)} items")
        
        # Sort by priority (higher = warmer first)
        sorted_items = sorted(self.warm_items, key=lambda x: x["priority"], reverse=True)
        
        warmed = 0
        failed = 0
        
        # Warm in batches
        batch_size = 10
        for i in range(0, len(sorted_items), batch_size):
            batch = sorted_items[i:i + batch_size]
            
            tasks = []
            for item in batch:
                # Set with TTL
                try:
                    cache_set(item["key"], item["data"], item["ttl"])
                    warmed += 1
                except Exception as e:
                    logger.warning(f"Failed to warm {item['key']}: {e}")
                    failed += 1
            
            # Small delay between batches
            await asyncio.sleep(0.1)
        
        self.warmup_complete = True
        self.warmup_duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"✅ Cache warm-up complete: {warmed} warmed, {failed} failed, "
            f"{self.warmup_duration_ms:.0f}ms"
        )
        
        return {
            "status": "completed",
            "total_items": len(self.warm_items),
            "warmed": warmed,
            "failed": failed,
            "duration_ms": round(self.warmup_duration_ms, 2)
        }


# Global warmer instance
cache_warmer = CacheWarmer()


def init_cache_warming():
    """Initialize common cache items for warm-up"""
    
    # Pre-warm device lists (priority 10 = highest)
    cache_warmer.add_warm_item(
        key="autus:devices:list",
        data={
            "devices": [],
            "total": 0,
            "updated_at": datetime.utcnow().isoformat()
        },
        ttl=300,
        priority=10
    )
    
    # Pre-warm analytics summary (priority 9)
    cache_warmer.add_warm_item(
        key="autus:analytics:summary",
        data={
            "total_events": 0,
            "events_24h": 0,
            "events_1h": 0,
            "active_devices": 0
        },
        ttl=300,
        priority=9
    )
    
    # Pre-warm cache stats (priority 8)
    cache_warmer.add_warm_item(
        key="autus:cache:stats",
        data={
            "cache_hits": 0,
            "cache_misses": 0,
            "cache_errors": 0,
            "total_requests": 0,
            "hit_rate_percent": 0
        },
        ttl=60,
        priority=8
    )
    
    # Pre-warm system status (priority 7)
    cache_warmer.add_warm_item(
        key="autus:system:status",
        data={
            "status": "operational",
            "uptime_seconds": 0,
            "version": "4.8.0",
            "timestamp": datetime.utcnow().isoformat()
        },
        ttl=30,
        priority=7
    )
    
    # Pre-warm health check (priority 6)
    cache_warmer.add_warm_item(
        key="autus:health:check",
        data={
            "healthy": True,
            "checks": {
                "database": "ok",
                "cache": "ok",
                "api": "ok"
            },
            "timestamp": datetime.utcnow().isoformat()
        },
        ttl=10,
        priority=6
    )
    
    logger.info(f"✅ Initialized {len(cache_warmer.warm_items)} cache warm items")


async def run_cache_warmup():
    """Run cache warmup on startup"""
    return await cache_warmer.warmup()


# Usage in main.py:
"""
from api.cache_warmer import init_cache_warming, run_cache_warmup

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up...")
    
    # Initialize cache warming
    init_cache_warming()
    
    # Run cache warmup
    warmup_result = await run_cache_warmup()
    
    logger.info(f"Startup complete: {warmup_result}")
"""
