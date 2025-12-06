"""
AUTUS Analytics API - Track and view analytics data
"""
from fastapi import APIRouter, Query
from typing import Optional
from api.analytics import analytics
from api.rate_limiter import rate_limiter

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/stats")
async def get_stats():
    """Get all analytics statistics."""
    return analytics.get_stats()


@router.get("/pages")
async def get_page_views():
    """Get page view statistics."""
    return {
        "page_views": dict(analytics.page_views),
        "total": sum(analytics.page_views.values())
    }


@router.get("/api-calls")
async def get_api_calls():
    """Get API call statistics."""
    return {
        "api_calls": dict(analytics.api_calls),
        "total": sum(analytics.api_calls.values())
    }


@router.get("/events")
async def get_events(limit: int = Query(default=50, le=100)):
    """Get recent events."""
    return {
        "events": analytics.events[-limit:],
        "total": len(analytics.events)
    }


@router.post("/track")
async def track_event(event: str, data: Optional[dict] = None):
    """Track a custom event."""
    analytics.track_event(event, data)
    return {"status": "tracked", "event": event}


@router.post("/track/page")
async def track_page(page: str, user_id: Optional[str] = None):
    """Track a page view."""
    analytics.track_page(page, user_id)
    return {"status": "tracked", "page": page}


@router.get("/rate-limit/{client_id}")
async def get_rate_limit_usage(client_id: str):
    """Get rate limit usage for a client."""
    return rate_limiter.get_usage(client_id)


@router.post("/reset")
async def reset_analytics():
    """Reset all analytics data (admin only)."""
    analytics.reset()
    return {"status": "reset", "message": "All analytics data cleared"}

