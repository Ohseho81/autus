from typing import Dict, List, Any
from datetime import datetime
from collections import defaultdict

class AnalyticsService:
    def __init__(self):
        self.page_views: Dict[str, int] = defaultdict(int)
        self.api_calls: Dict[str, int] = defaultdict(int)
        self.events: List[Dict[str, Any]] = []

    def track_page(self, page: str):
        self.page_views[page] += 1

    def track_api(self, endpoint: str, method: str):
        key = f"{method}:{endpoint}"
        self.api_calls[key] += 1

    def track_event(self, event: str, data: Dict[str, Any] = None):
        self.events.append({
            "event": event,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
        if len(self.events) > 10000:
            self.events = self.events[-5000:]

    def get_stats(self) -> Dict[str, Any]:
        return {
            "page_views": dict(self.page_views),
            "api_calls": dict(self.api_calls),
            "total_events": len(self.events),
            "recent_events": self.events[-10:]
        }

    def reset(self):
        self.page_views.clear()
        self.api_calls.clear()
        self.events.clear()

analytics_service = AnalyticsService()
