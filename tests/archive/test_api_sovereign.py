import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_sovereign_status():
    response = client.get("/sovereign/status")
    assert response.status_code == 200

def test_sovereign_audit_log():
    response = client.get("/sovereign/audit/log")
    assert response.status_code == 200
