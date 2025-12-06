"""
AUTUS Device API Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_devices():
    """Test listing all devices."""
    response = client.get("/devices/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_register_device():
    """Test device registration."""
    device = {
        "id": "test-001",
        "name": "Test Sensor",
        "type": "sensor"
    }
    response = client.post("/devices/register", json=device)
    assert response.status_code == 200
    assert response.json()["status"] == "registered"


def test_get_device():
    """Test getting a specific device."""
    # First register
    device = {"id": "test-002", "name": "Test Device", "type": "sensor"}
    client.post("/devices/register", json=device)
    
    # Then get
    response = client.get("/devices/test-002")
    assert response.status_code == 200
    assert response.json()["id"] == "test-002"


def test_device_stats():
    """Test device statistics summary."""
    response = client.get("/devices/stats/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_devices" in data


def test_receive_device_data():
    """Test receiving data from a device."""
    data = {"value": 25.5, "unit": "celsius"}
    response = client.post("/devices/test-001/data", json=data)
    assert response.status_code == 200
    assert response.json()["status"] == "received"

