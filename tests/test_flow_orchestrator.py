# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_flow_orchestrator_endpoint():
    resp = client.post("/pack/flow_orchestrator", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
