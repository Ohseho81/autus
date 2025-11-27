def test_risk_report_integration():
    from core.armp import risks_security, risk_reporter, enforcer
    enforcer.risks.clear()
    risks_security.register_security_risks()
    path = risk_reporter.generate_risk_report()
    import json
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    assert data['risk_count'] == 1
    assert data['risks'][0]['name'] == "SQL Injection Attack"
    assert data['risks'][0]['severity'] == "critical"
