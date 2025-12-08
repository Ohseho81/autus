import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_list_devices():
    response = client.get("/devices/")
    assert response.status_code == 200

def test_register_device():
    device = {"id": "test-001", "name": "Test Sensor", "type": "sensor"}
    response = client.post("/devices/register", json=device)
    assert response.status_code == 200

def test_device_stats():
    response = client.get("/devices/stats/summary")
    assert response.status_code == 200


