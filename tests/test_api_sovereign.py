"""
AUTUS Sovereign API Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_sovereign_status():
    """Test sovereign status endpoint."""
    response = client.get("/sovereign/status")
    assert response.status_code == 200


def test_sovereign_generate_token():
    """Test token generation."""
    payload = {
        "owner_id": "test_user",
        "resource_type": "identity",
        "resource_id": "test_resource_001"
    }
    response = client.post("/sovereign/token/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "token_id" in data


def test_sovereign_audit_log():
    """Test audit log endpoint."""
    response = client.get("/sovereign/audit/log")
    assert response.status_code == 200

