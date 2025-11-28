

import pytest
import os

if not os.path.isdir("rules"):
    pytest.skip("rules 디렉토리 없음. 환경 의존성으로 전체 파일 skip.", allow_module_level=True)

from core.utils.rule_engine import SimpleRuleEngine

@pytest.mark.skipif(not os.path.isdir("rules"), reason="rules 디렉토리 없음. 환경 의존성으로 skip.")
def test_no_critical_risk():
    engine = SimpleRuleEngine(rule_dir="rules")
    context = {"risk": {"severity": "CRITICAL"}}
    result = engine.evaluate(context)
    assert result["result"] == "rejected"
    assert "치명적 리스크" in result["msg"]

@pytest.mark.skipif(not os.path.isdir("rules"), reason="rules 디렉토리 없음. 환경 의존성으로 skip.")
def test_accept_non_critical():
    engine = SimpleRuleEngine(rule_dir="rules")
    context = {"risk": {"severity": "LOW"}}
    result = engine.evaluate(context)
    assert result["result"] == "accepted"
