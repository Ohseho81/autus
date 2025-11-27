def test_generate_risk_report(tmp_path):
    from core.armp import risk_reporter, enforcer
    # 리스크가 최소 1개 이상 등록되어 있다고 가정
    path = risk_reporter.generate_risk_report()
    assert path.endswith('.json')
    import json
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    assert 'generated_at' in data
    assert 'risk_count' in data
    assert isinstance(data['risks'], list)
    # 리스크 개수와 실제 등록 개수 일치
    assert data['risk_count'] == len(enforcer.risks)
