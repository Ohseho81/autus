"""
AUTUS Analytics - Track user behavior and API usage
"""
from datetime import datetime
from collections import defaultdict
from typing import Dict, List


class Analytics:
    """Simple analytics tracker for AUTUS."""
    
    def __init__(self):
        self.page_views: Dict[str, int] = defaultdict(int)
        self.api_calls: Dict[str, int] = defaultdict(int)
        self.events: List[dict] = []
        self.users: Dict[str, dict] = {}

    def track_page(self, page: str, user_id: str = None):
        """Track a page view."""
        self.page_views[page] += 1
        if user_id:
            self._track_user_activity(user_id, "page_view", page)

    def track_api(self, endpoint: str, method: str = "GET"):
        """Track an API call."""
        key = f"{method}:{endpoint}"
        self.api_calls[key] += 1

    def track_event(self, event: str, data: dict = None):
        """Track a custom event."""
        self.events.append({
            "event": event,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        })
        # Keep only last 1000 events
        if len(self.events) > 1000:
            self.events = self.events[-1000:]

    def _track_user_activity(self, user_id: str, activity: str, detail: str):
        """Track user activity."""
        if user_id not in self.users:
            self.users[user_id] = {
                "first_seen": datetime.now().isoformat(),
                "activities": []
            }
        self.users[user_id]["last_seen"] = datetime.now().isoformat()
        self.users[user_id]["activities"].append({
            "activity": activity,
            "detail": detail,
            "timestamp": datetime.now().isoformat()
        })

    def get_stats(self) -> dict:
        """Get analytics statistics."""
        return {
            "page_views": dict(self.page_views),
            "api_calls": dict(self.api_calls),
            "total_events": len(self.events),
            "total_users": len(self.users),
            "recent_events": self.events[-10:],
            "top_endpoints": sorted(
                self.api_calls.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        }

    def reset(self):
        """Reset all analytics data."""
        self.page_views.clear()
        self.api_calls.clear()
        self.events.clear()
        self.users.clear()


# Global analytics instance
analytics = Analytics()

