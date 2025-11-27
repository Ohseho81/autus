import pytest

@pytest.mark.xfail(reason="의도적 실패 테스트")
def test_fail_assertion():
    assert 1 == 2, "의도적 AssertionError 실패 시나리오"
