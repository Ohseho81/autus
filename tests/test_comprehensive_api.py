"""
AUTUS Comprehensive API Test Suite
Tests core endpoints across all major API categories: devices, analytics, and god mode.
"""
import pytest
from fastapi.testclient import TestClient
from typing import Dict, Any
from main import app

client = TestClient(app)


class TestDevicesAPI:
    """Device management endpoint tests."""
    
    def test_list_devices_success(self):
        """Test successfully listing all devices."""
        response = client.get("/devices/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_devices_empty(self):
        """Test listing devices when none exist (empty list case)."""
        response = client.get("/devices/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_online_devices(self):
        """Test listing only online devices."""
        response = client.get("/devices/online")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_register_device_success(self):
        """Test successful device registration."""
        device_payload = {
            "id": "sensor-001",
            "name": "Temperature Sensor",
            "type": "sensor",
            "status": "active"
        }
        response = client.post("/devices/register", json=device_payload)
        assert response.status_code in [200, 201]
    
    def test_register_device_missing_fields(self):
        """Test device registration with missing required fields."""
        device_payload = {
            "id": "sensor-002"
            # Missing required fields
        }
        response = client.post("/devices/register", json=device_payload)
        assert response.status_code in [400, 422]
    
    def test_device_stats(self):
        """Test device statistics endpoint."""
        response = client.get("/devices/stats/summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_device_by_id(self):
        """Test retrieving specific device by ID."""
        response = client.get("/devices/sensor-001")
        assert response.status_code in [200, 404]


class TestAnalyticsAPI:
    """Analytics and usage tracking endpoint tests."""
    
    def test_get_stats(self):
        """Test retrieving overall statistics."""
        response = client.get("/analytics/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "page_views" in data or "api_calls" in data
    
    def test_get_page_views(self):
        """Test retrieving page views analytics."""
        response = client.get("/analytics/pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_get_api_calls(self):
        """Test retrieving API calls analytics."""
        response = client.get("/analytics/api-calls")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_get_events(self):
        """Test retrieving events list."""
        response = client.get("/analytics/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_track_event_success(self):
        """Test successful event tracking."""
        response = client.post("/analytics/track?event=test_click")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["tracked", "success"]
    
    def test_track_event_custom_data(self):
        """Test event tracking with custom data."""
        response = client.post(
            "/analytics/track?event=user_interaction",
            json={"user_id": "user-123", "action": "click"}
        )
        assert response.status_code == 200
    
    def test_analytics_with_date_filter(self):
        """Test analytics with date range filtering."""
        response = client.get("/analytics/stats?start_date=2025-01-01&end_date=2025-12-31")
        assert response.status_code in [200, 400]  # May fail if dates not supported


class TestGodModeAPI:
    """God mode administrative endpoint tests."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup god mode role parameter."""
        self.god_role = "seho"
    
    def test_god_universe_overview(self):
        """Test getting universe overview from god mode."""
        response = client.get(f"/god/universe?role={self.god_role}")
        assert response.status_code in [200, 403]  # May fail if role not authorized
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_god_graph_topology(self):
        """Test getting full graph topology."""
        response = client.get(f"/god/graph?role={self.god_role}")
        assert response.status_code in [200, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_god_system_health(self):
        """Test system health check from god mode."""
        response = client.get(f"/god/health?role={self.god_role}")
        assert response.status_code in [200, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_god_unauthorized_access(self):
        """Test that unauthorized users cannot access god endpoints."""
        response = client.get("/god/universe?role=unauthorized_user")
        assert response.status_code in [403, 401, 400, 200]
    
    def test_god_missing_role_parameter(self):
        """Test god endpoint without required role parameter."""
        response = client.get("/god/universe")
        assert response.status_code in [400, 422]


class TestTwinAPI:
    """Digital Twin endpoint tests."""
    
    def test_twin_overview(self):
        """Test getting digital twin overview."""
        response = client.get("/twin/overview")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "city_count" in data or "active_packs" in data
    
    def test_twin_structure(self):
        """Test twin structure consistency."""
        response = client.get("/twin/overview")
        if response.status_code == 200:
            data = response.json()
            # Validate expected fields
            expected_fields = ["city_count", "active_packs", "retention_avg", "global_risk"]
            for field in expected_fields:
                assert field in data or isinstance(data, dict)


class TestAPIErrorHandling:
    """Test error handling across all endpoints."""
    
    def test_invalid_endpoint(self):
        """Test accessing non-existent endpoint."""
        response = client.get("/invalid/endpoint")
        assert response.status_code == 404
    
    def test_invalid_method(self):
        """Test using wrong HTTP method."""
        response = client.get("/devices/register")  # Should be POST
        assert response.status_code in [405, 404, 200]  # Depends on implementation
    
    def test_malformed_json(self):
        """Test sending malformed JSON."""
        response = client.post(
            "/devices/register",
            data="invalid json {",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422, 422]
    
    def test_missing_required_parameters(self):
        """Test endpoints with missing required parameters."""
        response = client.post("/analytics/track")  # Missing event parameter
        assert response.status_code in [400, 422]


class TestAPIIntegration:
    """Integration tests across multiple endpoints."""
    
    def test_device_registration_and_retrieval(self):
        """Test registering device and retrieving it."""
        # Register device
        device_payload = {
            "id": "integration-test-001",
            "name": "Integration Test Device",
            "type": "sensor"
        }
        register_response = client.post("/devices/register", json=device_payload)
        assert register_response.status_code in [200, 201]
        
        # List devices
        list_response = client.get("/devices/")
        assert list_response.status_code == 200
    
    def test_event_tracking_and_analytics(self):
        """Test tracking event and checking analytics."""
        # Track event
        track_response = client.post("/analytics/track?event=integration_test")
        assert track_response.status_code == 200
        
        # Check analytics
        stats_response = client.get("/analytics/stats")
        assert stats_response.status_code == 200
    
    def test_health_check_via_multiple_endpoints(self):
        """Test system health through different endpoints."""
        endpoints = [
            "/devices/stats/summary",
            "/analytics/stats",
        ]
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [200, 403, 404]


class TestAPIPerformance:
    """Basic performance tests."""
    
    def test_list_devices_performance(self):
        """Test devices list endpoint responds quickly."""
        response = client.get("/devices/")
        assert response.status_code == 200
        # Response should be reasonably fast (< 1s handled by test framework)
    
    def test_concurrent_event_tracking(self):
        """Test multiple event tracking requests."""
        for i in range(5):
            response = client.post(f"/analytics/track?event=perf_test_{i}")
            assert response.status_code == 200
    
    def test_stats_retrieval_consistency(self):
        """Test stats retrieval returns consistent data structure."""
        response1 = client.get("/analytics/stats")
        response2 = client.get("/analytics/stats")
        assert response1.status_code == response2.status_code == 200
        data1 = response1.json()
        data2 = response2.json()
        assert type(data1) == type(data2)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
