# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_erp_adapter_endpoint():
    resp = client.post("/pack/erp_adapter", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
