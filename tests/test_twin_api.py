import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_twin_overview():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/twin/overview")
    assert r.status_code == 200
    data = r.json()
    assert "city_count" in data
    assert "graph" in data

@pytest.mark.asyncio
async def test_twin_user_zero_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/twin/user/ZTEST123")
    assert r.status_code == 200
    data = r.json()
    assert data["zero_id"] == "ZTEST123"
