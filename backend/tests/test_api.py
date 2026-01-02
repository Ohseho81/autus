"""
AUTUS API Tests
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_root():
    """루트 엔드포인트 테스트"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert data["formula"] == "V = M - T + S"


@pytest.mark.anyio
async def test_health():
    """헬스 체크 테스트"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# Note: DB 연동 테스트는 실제 DB 필요
# pytest-asyncio와 테스트 DB 설정 후 실행
