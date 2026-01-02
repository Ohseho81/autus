# tests/conftest.py
# Pytest 설정

import pytest
import sys
import os

# 백엔드 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


@pytest.fixture(scope="session")
def anyio_backend():
    """비동기 백엔드"""
    return "asyncio"







