import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200

def test_universe_overview():
    response = client.get("/universe/overview")
    assert response.status_code == 200
