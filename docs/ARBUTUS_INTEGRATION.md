# Arbutus Analyzer + AUTUS 통합

> 감사 데이터 → 물리 엔진 → 리스크 대시보드

---

## 개요

Arbutus Analyzer의 감사 결과를 AUTUS 물리 엔진으로 변환하여 리스크를 모델링하고 시각화합니다.

### 아키텍처

```
Arbutus Analyzer (데스크톱)
    ↓ Export (CSV/JSON)
Arbutus Bridge (Python)
    ↓ Findings → Motion Events
AUTUS Audit Physics Engine
    ↓ Physics State (6D)
Web Dashboard (React)
```

---

## 핵심 개념

### 1. 감사 물리 노드 (6D)

| Physics | 설명 | 반감기 | 관성 |
|---------|------|--------|------|
| **FINANCIAL_HEALTH** | 재무 건강성 | 30일 | 0.3 |
| **CAPITAL_RISK** | 자본 리스크 | 90일 | 0.5 |
| **COMPLIANCE_IQ** | 규정 준수 지능 | 60일 | 0.4 |
| **STAKEHOLDER** | 이해관계자 관계 | 45일 | 0.4 |
| **CONTROL_ENV** | 통제 환경 | 120일 | 0.6 |
| **REPUTATION** | 평판/지속가능성 | 180일 | 0.7 |

### 2. 카테고리 → Physics 매핑

| Arbutus Category | 주요 Physics | 가중치 |
|------------------|-------------|--------|
| **FRAUD** | CAPITAL_RISK, REPUTATION, CONTROL_ENV | 0.4, 0.3, 0.2 |
| **COMPLIANCE** | COMPLIANCE_IQ, CONTROL_ENV | 0.5, 0.3 |
| **FINANCIAL** | FINANCIAL_HEALTH, CAPITAL_RISK | 0.5, 0.3 |
| **OPERATIONAL** | CONTROL_ENV, FINANCIAL_HEALTH | 0.4, 0.3 |
| **IT_SECURITY** | CONTROL_ENV, REPUTATION | 0.4, 0.3 |
| **VENDOR** | STAKEHOLDER, CAPITAL_RISK | 0.4, 0.3 |

### 3. 리스크 레벨 → Delta

| Risk Level | Delta | 설명 |
|------------|-------|------|
| **CRITICAL** | -0.3 | 심각한 위험 |
| **HIGH** | -0.2 | 높은 위험 |
| **MEDIUM** | -0.1 | 중간 위험 |
| **LOW** | -0.05 | 낮은 위험 |
| **INFO** | 0.0 | 정보성 |

---

## 사용법

### 1. Python API

```python
from audit.arbutus_bridge import AuditPhysicsEngine, ArbutusFindings, AuditCategory, AuditRiskLevel

# 엔진 초기화
engine = AuditPhysicsEngine("./audit_data")

# Finding 처리
finding = ArbutusFindings(
    id="FRD-001",
    timestamp=int(time.time() * 1000),
    category=AuditCategory.FRAUD,
    risk_level=AuditRiskLevel.CRITICAL,
    score=95,
    description="Duplicate vendor payments detected",
    affected_records=150,
    monetary_impact=250000,
    source_table="AP_PAYMENTS",
    query_used="DUPLICATE_PAYMENT_CHECK",
    outlier_probability=0.92
)

result = engine.process_finding(finding)

# 상태 조회
state = engine.get_state()
risk_score = engine.get_risk_score()
breakdown = engine.get_risk_breakdown()
dashboard = engine.get_dashboard_data()

# 시정 조치
remediation = engine.process_remediation(
    AuditPhysics.CAPITAL_RISK,
    effectiveness=0.8,
    source="FRD-001"
)
```

### 2. REST API

#### Finding 처리
```bash
POST /api/audit/findings
Content-Type: application/json

{
  "id": "FRD-001",
  "category": "FRAUD",
  "risk_level": "CRITICAL",
  "score": 95,
  "description": "Duplicate vendor payments detected",
  "affected_records": 150,
  "monetary_impact": 250000,
  "source_table": "AP_PAYMENTS",
  "query_used": "DUPLICATE_PAYMENT_CHECK",
  "outlier_probability": 0.92
}
```

#### 상태 조회
```bash
GET /api/audit/state
GET /api/audit/risk-score
GET /api/audit/breakdown
GET /api/audit/dashboard
```

#### 시정 조치
```bash
POST /api/audit/remediation
Content-Type: application/json

{
  "physics": "CAPITAL_RISK",
  "effectiveness": 0.8,
  "source": "FRD-001"
}
```

#### 파일 임포트
```bash
POST /api/audit/import
Content-Type: application/json

{
  "file_path": "/path/to/arbutus_export.json"
}
```

---

## 물리 법칙

### 1. 감쇠 (회복)

시간이 지나면 상태가 1.0(건강)을 향해 회복합니다.

```
recovery = (1.0 - current_state) × (1 - e^(-λ × dt))
new_state = current_state + recovery
```

### 2. 마찰

Outlier probability가 높을수록 마찰이 낮아져 영향력이 큽니다.

```
friction = 1.0 - outlier_probability
effective_delta = raw_delta × (1 - friction × 0.5)
```

### 3. 관성

높은 관성(예: REPUTATION)은 변화를 느리게 만듭니다.

```
effective_delta = raw_delta × (1 - inertia)
```

### 4. 금액 영향

금액 영향은 log scale로 반영됩니다.

```
impact_multiplier = 1.0 + log10(max(1, monetary_impact)) × 0.1
raw_delta = base_delta × weight × impact_multiplier
```

---

## 리스크 점수

### 종합 리스크 점수 (0-100)

```
risk_score = (1 - avg_state) × 100
```

- **0-5**: HEALTHY (건강)
- **5-15**: LOW (낮은 위험)
- **15-30**: MEDIUM (중간 위험)
- **30-50**: HIGH (높은 위험)
- **50+**: CRITICAL (심각한 위험)

### 리스크 분석

각 Physics별로:
- **state**: 현재 상태 (0-1)
- **risk_percent**: 리스크 비율 (0-100%)
- **level**: 리스크 레벨
- **findings_count**: 발견된 Finding 수
- **monetary_impact**: 금액 영향

---

## 대시보드 데이터

```json
{
  "timestamp": 1704567890000,
  "overall_risk_score": 7.67,
  "state": {
    "FINANCIAL_HEALTH": 0.9627,
    "CAPITAL_RISK": 0.8671,
    "COMPLIANCE_IQ": 0.8933,
    "STAKEHOLDER": 0.9872,
    "CONTROL_ENV": 0.9024,
    "REPUTATION": 0.9272
  },
  "breakdown": {
    "CAPITAL_RISK": {
      "state": 0.8671,
      "risk_percent": 13.3,
      "level": "LOW",
      "findings_count": 4,
      "monetary_impact": 115000
    },
    ...
  },
  "recent_events": [...],
  "summary": {
    "total_findings": 13,
    "total_monetary_impact": 480000,
    "highest_risk_area": "COMPLIANCE_IQ"
  }
}
```

---

## 테스트

```bash
cd autus-unified/backend
python3 -c "from audit.arbutus_bridge import test_arbutus_autus_integration; test_arbutus_autus_integration()"
```

---

## 파일 구조

```
backend/
├── audit/
│   ├── __init__.py
│   └── arbutus_bridge.py      # 핵심 엔진
├── api/
│   └── audit_api.py           # REST API
└── main.py                    # API 서버 (라우터 등록)
```

---

## 참고

- **AUTUS Master Spec v2.0**: `docs/MASTER_SPEC_v2.md`
- **API 문서**: `http://localhost:8000/docs`
- **Arbutus Analyzer**: https://www.arbutussoftware.com/

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX  
**Status**: ✅ PRODUCTION READY

