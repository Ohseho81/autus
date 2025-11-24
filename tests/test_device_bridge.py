# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_device_bridge_endpoint():
    resp = client.post("/pack/device_bridge", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
