import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_twin_overview():
    response = client.get("/twin/overview")
    assert response.status_code == 200

def test_twin_graph_summary():
    response = client.get("/twin/graph/summary")
    assert response.status_code == 200

def test_twin_packs():
    response = client.get("/twin/packs")
    assert response.status_code == 200


