# AUTO-GENERATED TEST (DO NOT EDIT)
from fastapi.testclient import TestClient
from server.main import app
client = TestClient(app)
def test_habit_tracker_endpoint():
    resp = client.post("/pack/habit_tracker", json={"payload": {"ping": "pong"}})
    assert resp.status_code == 200
