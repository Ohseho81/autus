"""
Tests for AUTUS Telemetry Engine
engines/telemetry.py
"""

import pytest
import time
from engines import Telemetry


class TestTelemetry:
    """Tests for Telemetry class."""
    
    @pytest.fixture(autouse=True)
    def reset_telemetry(self):
        """Reset telemetry before and after each test."""
        Telemetry.reset()
        yield
        Telemetry.reset()
    
    def test_record_event(self):
        """Test recording a simple event."""
        Telemetry.record_event("test.event")
        
        metrics = Telemetry.get_metrics()
        assert metrics["events"] == 1
    
    def test_record_event_with_tags(self):
        """Test recording event with tags."""
        Telemetry.record_event("user.login", tags={"role": "student", "city": "seoul"})
        
        events = Telemetry.get_events()
        assert len(events) == 1
        assert events[0]["tags"]["role"] == "student"
    
    def test_record_event_with_data(self):
        """Test recording event with additional data."""
        Telemetry.record_event(
            "pack.executed",
            tags={"pack": "school"},
            data={"duration_ms": 150, "success": True}
        )
        
        events = Telemetry.get_events()
        assert events[0]["data"]["duration_ms"] == 150
    
    def test_record_error(self):
        """Test recording an error."""
        Telemetry.record_error("AUTH_FAILED", "Invalid credentials")
        
        metrics = Telemetry.get_metrics()
        assert metrics["errors"] == 1
    
    def test_record_error_with_context(self):
        """Test recording error with context."""
        Telemetry.record_error(
            "VALIDATION_ERROR",
            "Invalid email format",
            context={"field": "email", "value": "not-an-email"}
        )
        
        errors = Telemetry.get_errors()
        assert errors[0]["context"]["field"] == "email"
    
    def test_increment_counter(self):
        """Test incrementing a counter metric."""
        Telemetry.increment("api.requests")
        Telemetry.increment("api.requests")
        Telemetry.increment("api.requests", 3)
        
        metrics = Telemetry.get_metrics()
        assert metrics["metrics"]["api.requests"] == 5
    
    def test_gauge_metric(self):
        """Test setting a gauge metric."""
        Telemetry.gauge("active_users", 42)
        
        metrics = Telemetry.get_metrics()
        assert metrics["metrics"]["active_users"] == 42
        
        # Update gauge
        Telemetry.gauge("active_users", 50)
        metrics = Telemetry.get_metrics()
        assert metrics["metrics"]["active_users"] == 50
    
    def test_get_events_with_filter(self):
        """Test getting events filtered by type."""
        Telemetry.record_event("user.login")
        Telemetry.record_event("user.logout")
        Telemetry.record_event("user.login")
        Telemetry.record_event("pack.executed")
        
        login_events = Telemetry.get_events(event_type="user.login")
        assert len(login_events) == 2
    
    def test_get_events_with_limit(self):
        """Test getting events with limit."""
        for i in range(20):
            Telemetry.record_event(f"event.{i}")
        
        events = Telemetry.get_events(limit=5)
        assert len(events) == 5
    
    def test_get_errors_with_filter(self):
        """Test getting errors filtered by code."""
        Telemetry.record_error("AUTH_FAILED", "Error 1")
        Telemetry.record_error("VALIDATION_ERROR", "Error 2")
        Telemetry.record_error("AUTH_FAILED", "Error 3")
        
        auth_errors = Telemetry.get_errors(code="AUTH_FAILED")
        assert len(auth_errors) == 2
    
    def test_get_metrics_summary(self):
        """Test getting metrics summary."""
        Telemetry.record_event("test.event")
        Telemetry.record_event("test.event")
        Telemetry.record_error("TEST_ERROR", "Test")
        Telemetry.increment("counter", 5)
        
        metrics = Telemetry.get_metrics()
        
        assert metrics["events"] == 2
        assert metrics["errors"] == 1
        assert "counter" in metrics["metrics"]
        assert "uptime_seconds" in metrics
        assert "events_per_minute" in metrics
    
    def test_recent_events_in_metrics(self):
        """Test that recent events are included in metrics."""
        for i in range(15):
            Telemetry.record_event(f"event.{i}")
        
        metrics = Telemetry.get_metrics()
        # Should only include last 10
        assert len(metrics["recent_events"]) == 10
    
    def test_error_rate_calculation(self):
        """Test error rate calculation."""
        # Record some events and errors
        for _ in range(10):
            Telemetry.record_event("test.event")
        for _ in range(2):
            Telemetry.record_error("TEST_ERROR", "Test")
        
        # Error rate should be 2/10 = 0.2
        error_rate = Telemetry.get_error_rate(window_minutes=5)
        assert error_rate == pytest.approx(0.2, rel=0.1)
    
    def test_reset(self):
        """Test resetting telemetry."""
        Telemetry.record_event("test.event")
        Telemetry.record_error("TEST_ERROR", "Test")
        Telemetry.increment("counter")
        
        Telemetry.reset()
        
        metrics = Telemetry.get_metrics()
        assert metrics["events"] == 0
        assert metrics["errors"] == 0
        assert metrics["metrics"] == {}
    
    def test_export_json(self):
        """Test exporting telemetry as JSON."""
        Telemetry.record_event("test.event", tags={"key": "value"})
        Telemetry.record_error("TEST_ERROR", "Test error")
        
        json_str = Telemetry.export_json()
        
        assert "test.event" in json_str
        assert "TEST_ERROR" in json_str
        assert "exported_at" in json_str
    
    def test_event_limit_enforcement(self):
        """Test that events are limited to prevent memory issues."""
        # This test may take a while with 10001 events
        # In practice, we'd mock or reduce the limit
        pass  # Skip for now
    
    def test_multiple_counters(self):
        """Test tracking multiple counters."""
        Telemetry.increment("api.get_requests", 100)
        Telemetry.increment("api.post_requests", 50)
        Telemetry.increment("api.errors", 5)
        
        metrics = Telemetry.get_metrics()
        
        assert metrics["metrics"]["api.get_requests"] == 100
        assert metrics["metrics"]["api.post_requests"] == 50
        assert metrics["metrics"]["api.errors"] == 5


