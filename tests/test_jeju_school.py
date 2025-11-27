# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_jeju_school_endpoint():
    resp = client.post("/pack/jeju_school", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
