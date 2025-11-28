import os

# 모든 테스트에서 환경변수 의존성 제거용 fixture
import pytest

@pytest.fixture(autouse=True)
def patch_env_vars(monkeypatch):
    # 여기에 프로젝트에서 자주 쓰는 환경변수를 안전한 값으로 지정
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("ENV", "test")
    # 필요시 추가 환경변수 패치
    yield
"""AUTUS Test Configuration - Minimal"""
import pytest
import sys
from pathlib import Path

# 프로젝트 루트 추가
root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

# core.utils 호환성 (packs/utils로 리다이렉트)
class UtilsModule:
    pass

utils_module = UtilsModule()
sys.modules['core.utils'] = utils_module

# core.armp 호환성 (packs/security로 리다이렉트)
try:
    sys.path.insert(0, str(root / "packs"))
    from packs import security
    sys.modules['core.armp'] = security
    sys.modules['core.armp.enforcer'] = __import__('packs.security.enforcer', fromlist=[''])
    sys.modules['core.armp.risks'] = __import__('packs.security.risks', fromlist=[''])
except Exception as e:
    print(f"ARMP redirect failed: {e}")

@pytest.fixture
def temp_dir(tmp_path):
    return tmp_path
