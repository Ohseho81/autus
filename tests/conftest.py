"""
AUTUS Test Configuration
========================

pytest 설정 및 공통 fixture
"""

import sys
from pathlib import Path

# 프로젝트 루트 및 백엔드 경로 추가
root = Path(__file__).parent.parent
backend = root / "backend"

sys.path.insert(0, str(root))
sys.path.insert(0, str(backend))

import pytest
import warnings

# 경고 필터링
warnings.filterwarnings("ignore", category=UserWarning)


@pytest.fixture
def api_client():
    """FastAPI TestClient"""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
def engine():
    """AUTUS Engine"""
    from core.unified import UnifiedEngine
    return UnifiedEngine("./test_data")


@pytest.fixture
def mock_data():
    """테스트용 Mock 데이터"""
    return {
        "user_id": "test_user",
        "nodes": {
            "n01": 0.5,
            "n02": 0.6,
            "n03": 0.4,
        },
        "works": [
            {"id": "w1", "title": "테스트 업무", "pressure": 0.5},
        ],
    }
