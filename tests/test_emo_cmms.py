# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_emo_cmms_endpoint():
    resp = client.post("/pack/emo_cmms", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
