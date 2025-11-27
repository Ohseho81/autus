import pytest
from core.utils.rule_engine import SimpleRuleEngine

def test_no_critical_risk():
    engine = SimpleRuleEngine(rule_dir="rules")
    context = {"risk": {"severity": "CRITICAL"}}
    result = engine.evaluate(context)
    assert result["result"] == "rejected"
    assert "치명적 리스크" in result["msg"]

def test_accept_non_critical():
    engine = SimpleRuleEngine(rule_dir="rules")
    context = {"risk": {"severity": "LOW"}}
    result = engine.evaluate(context)
    assert result["result"] == "accepted"
