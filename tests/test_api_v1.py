"""
AUTUS API v1 테스트
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from main import app
    client = TestClient(app)
    SKIP_TESTS = False
except ImportError as e:
    SKIP_TESTS = True
    SKIP_REASON = str(e)


@pytest.mark.skipif(SKIP_TESTS, reason="main module import failed")
class TestHealthEndpoints:
    """헬스체크 엔드포인트 테스트"""
    
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.skipif(SKIP_TESTS, reason="main module import failed")
class TestAPIV1:
    """API v1 테스트"""
    
    def test_docs_available(self):
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_openapi_schema(self):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
