def test_execute_workflow_notify(monkeypatch):
    from packs.workflows import engine
    # print을 가로채서 결과 확인
    printed = []
    monkeypatch.setattr('builtins.print', lambda *a, **k: printed.append(a))
    context = {'severity': 'critical', 'risk_id': 'SECURITY_SQL_INJECTION'}
    result = engine.execute_workflow('critical_risk_response', context)
    assert any('[NOTIFY:slack]' in str(x) for x in printed)
    assert any('Critical risk detected' in str(x) for x in printed)
    assert result[0][0] == 'notify'
