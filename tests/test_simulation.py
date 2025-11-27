import pytest
import random

def simulate_risk_event():
    # 단순 시뮬레이션: 랜덤 리스크 발생
    risks = ["R1", "R2", "R3"]
    return {
        "risk_id": random.choice(risks),
        "severity": random.choice(["HIGH", "MEDIUM", "LOW"]),
        "detected": True
    }

def test_simulate_risk_event():
    result = simulate_risk_event()
    assert result["risk_id"] in ["R1", "R2", "R3"]
    assert result["severity"] in ["HIGH", "MEDIUM", "LOW"]
    assert result["detected"] is True
