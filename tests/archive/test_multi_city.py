import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_multiple_cities():
    cities = ["seoul", "tokyo", "newyork", "london", "paris"]
    for city_id in cities:
        response = client.get(f"/twin/city/{city_id}")
        assert response.status_code == 200

def test_city_users():
    response = client.get("/god/cities?role=seho")
    assert response.status_code == 200
    data = response.json()
    assert "cities" in data

def test_universe_graph():
    response = client.get("/universe/graph")
    assert response.status_code == 200

def test_god_evolution():
    response = client.get("/god/evolution?role=seho")
    assert response.status_code == 200
