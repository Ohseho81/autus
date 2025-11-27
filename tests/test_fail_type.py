import pytest

@pytest.mark.xfail(reason="의도적 실패 테스트")
def test_fail_type():
    len(123)  # TypeError
