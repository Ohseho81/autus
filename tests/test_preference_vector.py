# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_preference_vector_endpoint():
    resp = client.post("/pack/preference_vector", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
