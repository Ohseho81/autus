def test_fail_import():
    from nonexistent_module import foo  # ImportError 유발
