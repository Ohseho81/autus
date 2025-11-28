import os
import json
from datetime import datetime
from packs.security.enforcer import enforcer

REPORTS_DIR = os.path.join(os.path.dirname(__file__), '../../reports')
REPORTS_DIR = os.path.abspath(REPORTS_DIR)
os.makedirs(REPORTS_DIR, exist_ok=True)

def generate_risk_report():
    from dataclasses import asdict
    risks = []
    for r in enforcer.risks:
        d = asdict(r)
        # Enum 값 문자열로 변환
        if hasattr(d.get('category'), 'value'):
            d['category'] = d['category'].value
        if hasattr(d.get('severity'), 'value'):
            d['severity'] = d['severity'].value
        # 함수 필드 제거
        d.pop('prevention', None)
        d.pop('detection', None)
        d.pop('response', None)
        d.pop('recovery', None)
        risks.append(d)
    report = {
        "generated_at": datetime.utcnow().isoformat() + 'Z',
        "risk_count": len(risks),
        "risks": risks
    }
    filename = f"risk_report_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"
    path = os.path.join(REPORTS_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return path

def print_risk_report_summary():
    risks = enforcer.risks
    print(f"[리스크 리포트] 총 {len(risks)}건 등록됨:")
    for r in risks:
        print(f"- {getattr(r, 'name', '?')}: {getattr(r, 'severity', '?')}")
