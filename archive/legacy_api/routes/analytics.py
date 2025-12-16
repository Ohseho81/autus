"""
AUTUS Analytics API - Track and view analytics data
"""
from fastapi import APIRouter, Query
from typing import Optional
from api.analytics import analytics
from api.rate_limiter import rate_limiter
from api.cache import cached_response, cache_invalidate, get_cache_ttl

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/stats")
@cached_response(endpoint="/analytics/stats", ttl=300)
async def get_stats():
    """
    Get analytics statistics summary.
    
    Returns:
        dict: Page views, API calls, events count, and health metrics
    """
    return analytics.get_stats()


@router.get("/pages")
@cached_response(endpoint="/analytics/pages", ttl=300)
async def get_page_views():
    """
    Get page view statistics.
    
    Returns:
        dict: Page views by route and total count
    """
    return {
        "page_views": dict(analytics.page_views),
        "total": sum(analytics.page_views.values())
    }


@router.get("/api-calls")
@cached_response(endpoint="/analytics/api-calls", ttl=300)
async def get_api_calls():
    """
    Get API call statistics.
    
    Returns:
        dict: API calls by endpoint and total count
    """
    return {
        "api_calls": dict(analytics.api_calls),
        "total": sum(analytics.api_calls.values())
    }


@router.get("/events")
@cached_response(endpoint="/analytics/events", ttl=300)
async def get_events(limit: int = Query(default=50, le=100)):
    """
    Get recent analytics events.
    
    Args:
        limit: Number of events to return (max 100)
    
    Returns:
        dict: Recent events and total count
    """
    return {
        "events": analytics.events[-limit:],
        "total": len(analytics.events)
    }


@router.post("/track")
async def track_event(event: str, data: Optional[dict] = None):
    """
    Track a custom analytics event.
    
    Args:
        event: Event name to track
        data: Optional event data dictionary
    
    Returns:
        dict: Confirmation of tracked event
    """
    analytics.track_event(event, data)
    # Invalidate cache on write
    cache_invalidate("autus:analytics:*")
    cache_invalidate("autus:god:*")
    return {"status": "tracked", "event": event}


@router.post("/track/page")
async def track_page(page: str, user_id: Optional[str] = None):
    """Track a page view."""
    analytics.track_page(page, user_id)
    # Invalidate cache on write
    cache_invalidate("autus:analytics:*")
    return {"status": "tracked", "page": page}


@router.get("/rate-limit/{client_id}")
@cached_response(endpoint="/analytics/rate-limit", ttl=60)
async def get_rate_limit_usage(client_id: str):
    """Get rate limit usage for a client."""
    return rate_limiter.get_usage(client_id)


@router.post("/reset")
async def reset_analytics():
    """Reset all analytics data (admin only)."""
    analytics.reset()
    return {"status": "reset", "message": "All analytics data cleared"}

