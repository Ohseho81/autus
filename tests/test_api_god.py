import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_god_universe():
    response = client.get("/god/universe?role=seho")
    assert response.status_code == 200

def test_god_graph():
    response = client.get("/god/graph?role=seho")
    assert response.status_code == 200

def test_god_health():
    response = client.get("/god/health?role=seho")
    assert response.status_code == 200
