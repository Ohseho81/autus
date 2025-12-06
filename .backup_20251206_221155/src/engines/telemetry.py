"""
AUTUS Telemetry Engine
Collects and manages system metrics, events, and errors
"""

from datetime import datetime, timezone
from typing import Dict, Optional, List, Any
import json
from collections import defaultdict


def _utcnow() -> datetime:
    """Get current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)


class Telemetry:
    """
    Telemetry collection for AUTUS OS.
    
    Tracks:
    - Events (user actions, system events)
    - Errors (exceptions, failures)
    - Metrics (counters, gauges)
    """
    
    _events: List[Dict] = []
    _errors: List[Dict] = []
    _metrics: Dict[str, Any] = defaultdict(int)
    _started_at: datetime = _utcnow()
    
    @classmethod
    def record_event(
        cls,
        event_type: str,
        tags: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record an event.
        
        Args:
            event_type: Type of event (e.g., 'user.login', 'pack.executed')
            tags: Optional tags for categorization
            data: Optional additional data
        """
        cls._events.append({
            "type": event_type,
            "tags": tags or {},
            "data": data or {},
            "at": _utcnow().isoformat()
        })
        
        # Keep only last 10000 events
        if len(cls._events) > 10000:
            cls._events = cls._events[-10000:]
    
    @classmethod
    def record_error(
        cls,
        code: str,
        detail: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record an error.
        
        Args:
            code: Error code (e.g., 'AUTH_FAILED', 'VALIDATION_ERROR')
            detail: Human-readable error detail
            context: Optional context information
        """
        cls._errors.append({
            "code": code,
            "detail": detail,
            "context": context or {},
            "at": _utcnow().isoformat()
        })
        
        # Keep only last 1000 errors
        if len(cls._errors) > 1000:
            cls._errors = cls._errors[-1000:]
    
    @classmethod
    def increment(cls, metric: str, value: int = 1) -> None:
        """Increment a counter metric."""
        cls._metrics[metric] += value
    
    @classmethod
    def gauge(cls, metric: str, value: Any) -> None:
        """Set a gauge metric to a specific value."""
        cls._metrics[metric] = value
    
    @classmethod
    def get_metrics(cls) -> Dict:
        """
        Get all telemetry metrics.
        
        Returns:
            Dict with events, errors, and metrics summary
        """
        uptime = (_utcnow() - cls._started_at).total_seconds()
        
        return {
            "events": len(cls._events),
            "errors": len(cls._errors),
            "metrics": dict(cls._metrics),
            "recent_events": cls._events[-10:],
            "recent_errors": cls._errors[-5:],
            "uptime_seconds": uptime,
            "events_per_minute": len(cls._events) / max(uptime / 60, 1)
        }
    
    @classmethod
    def get_events(
        cls,
        event_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get recorded events.
        
        Args:
            event_type: Filter by event type
            limit: Maximum number of events to return
        """
        events = cls._events
        
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        
        return events[-limit:]
    
    @classmethod
    def get_errors(
        cls,
        code: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get recorded errors.
        
        Args:
            code: Filter by error code
            limit: Maximum number of errors to return
        """
        errors = cls._errors
        
        if code:
            errors = [e for e in errors if e["code"] == code]
        
        return errors[-limit:]
    
    @classmethod
    def get_error_rate(cls, window_minutes: int = 5) -> float:
        """
        Calculate error rate over a time window.
        
        Args:
            window_minutes: Time window in minutes
            
        Returns:
            Error rate (errors / events)
        """
        now = _utcnow()
        window_start = now.timestamp() - (window_minutes * 60)
        
        recent_events = [
            e for e in cls._events 
            if datetime.fromisoformat(e["at"]).timestamp() > window_start
        ]
        recent_errors = [
            e for e in cls._errors
            if datetime.fromisoformat(e["at"]).timestamp() > window_start
        ]
        
        if not recent_events:
            return 0.0
        
        return len(recent_errors) / len(recent_events)
    
    @classmethod
    def reset(cls) -> None:
        """Reset all telemetry data."""
        cls._events = []
        cls._errors = []
        cls._metrics = defaultdict(int)
        cls._started_at = _utcnow()
    
    @classmethod
    def export_json(cls) -> str:
        """Export telemetry data as JSON."""
        return json.dumps({
            "events": cls._events,
            "errors": cls._errors,
            "metrics": dict(cls._metrics),
            "exported_at": _utcnow().isoformat()
        }, indent=2)

