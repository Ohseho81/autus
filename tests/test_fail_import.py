import pytest

@pytest.mark.xfail(reason="의도적 실패 테스트")
def test_fail_import():
    from nonexistent_module import foo
