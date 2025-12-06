"""
AUTUS Twin API Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_twin_overview():
    """Test twin overview endpoint."""
    response = client.get("/twin/overview")
    assert response.status_code == 200


def test_twin_graph_summary():
    """Test twin graph summary endpoint."""
    response = client.get("/twin/graph/summary")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data or "edges" in data


def test_twin_packs():
    """Test twin packs endpoint."""
    response = client.get("/twin/packs")
    assert response.status_code == 200


def test_twin_protocols_status():
    """Test twin protocols status endpoint."""
    response = client.get("/twin/protocols/status")
    assert response.status_code == 200

