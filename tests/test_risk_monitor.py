# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_risk_monitor_endpoint():
    resp = client.post("/pack/risk_monitor", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
