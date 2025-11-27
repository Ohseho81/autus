import pytest

@pytest.mark.xfail(reason="의도적 실패 테스트")
def test_scenario_fail():
    assert False, "시나리오 테스트: 일부러 실패"
