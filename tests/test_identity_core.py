# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_identity_core_endpoint():
    resp = client.post("/pack/identity_core", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
