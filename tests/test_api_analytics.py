"""
AUTUS Analytics API Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_analytics_stats():
    """Test analytics statistics endpoint."""
    response = client.get("/analytics/stats")
    assert response.status_code == 200
    data = response.json()
    assert "page_views" in data
    assert "api_calls" in data


def test_analytics_track():
    """Test event tracking."""
    response = client.post("/analytics/track?event=test_event")
    assert response.status_code == 200
    assert response.json()["status"] == "tracked"


def test_analytics_pages():
    """Test page views statistics."""
    response = client.get("/analytics/pages")
    assert response.status_code == 200
    data = response.json()
    assert "page_views" in data


def test_analytics_api_calls():
    """Test API calls statistics."""
    response = client.get("/analytics/api-calls")
    assert response.status_code == 200
    data = response.json()
    assert "api_calls" in data


def test_analytics_events():
    """Test events listing."""
    response = client.get("/analytics/events")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data


