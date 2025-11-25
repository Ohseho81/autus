# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_analyzer_endpoint():
    resp = client.post("/pack/analyzer", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
