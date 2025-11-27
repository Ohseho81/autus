# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_nba_atb_endpoint():
    resp = client.post("/pack/nba_atb", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
