"""
AUTUS API Health Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    """Test health endpoint returns OK."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_universe_overview():
    """Test universe overview endpoint."""
    response = client.get("/universe/overview")
    assert response.status_code == 200
    data = response.json()
    assert "layers" in data or "universe" in data

