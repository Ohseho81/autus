# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_notification_endpoint():
    resp = client.post("/pack/notification", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
