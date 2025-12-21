# AUTUS Engine-UI Mapping Specification (LOCK)

> **"엔진이 계산한 값만 UI에 표시된다. 그 외의 값은 존재하지 않는다."**

---

## 📋 매핑 원칙

1. **단일 소스 (Single Source of Truth)**
   - 모든 UI 값은 `PhysicsEngine.compute_snapshot()`에서 계산
   - UI는 엔진 출력을 직접 바인딩만 함

2. **역정의 (Reverse Definition)**
   - UI 요소가 먼저 정의됨
   - 엔진 함수는 UI 요소에 맞춰 출력

3. **불변성 (Immutability)**
   - 한번 계산된 스냅샷은 변경 불가
   - 새 계산 → 새 스냅샷

---

## 🔗 Engine → UI Element Mapping

### 공통 매핑 (모든 Role)

| Engine Output | UI Element | 형식 |
|--------------|------------|------|
| `system_state` | Header GATE Badge | `GREEN` / `AMBER` / `RED` |
| `risk` | Risk % Display | `0~100%` |
| `recommended_action` | ACTION Button Text | `RECOVER` / `DEFRICTION` / `SHOCK_DAMP` |
| `can_action` | ACTION Button Visibility | `true` / `false` |

### SUBJECT Role

| Engine Output | UI Element | 변환 |
|--------------|------------|------|
| `survival_days` | Primary Metric (SURVIVAL) | `{value}일` |
| `daily_burn * 30 / 10000` | Secondary (BURN) | `−₩{value}만/월` |
| `risk * 100` | Secondary (RISK) | `{value}%` |
| `-risk * 100` | Impact Display | `💰 −{value}%` |

### OPERATOR Role

| Engine Output | UI Element | 변환 |
|--------------|------------|------|
| `person_count` | Primary Metric (TOTAL) | `{value}명` |
| `at_risk_count` | Secondary (AT_RISK) | `{value}명` |
| `critical_count` | Secondary (CRITICAL) | `{value}명` |
| `at_risk_count` | Impact Display | `⚠️ {value}명 위험` |

### SPONSOR Role

| Engine Output | UI Element | 변환 |
|--------------|------------|------|
| `total_invested / 100000000` | Primary Metric (INVESTED) | `₩{value}억` |
| `efficiency * 100` | Secondary (EFFICIENCY) | `{value}%` |
| `loss_risk / 10000` | Secondary (LOSS_RISK) | `₩{value}만` |
| `-loss_risk / 10000` | Impact Display | `📉 −₩{value}만` |

### EMPLOYER Role

| Engine Output | UI Element | 변환 |
|--------------|------------|------|
| `hired_count` | Primary Metric (HIRED) | `{value}명` |
| `retention_rate * 100` | Secondary (RETENTION) | `{value}%` |
| `churn_risk_count` | Secondary (CHURN_RISK) | `{value}명` |
| `churn_risk_count` | Impact Display | `👥 {value}명 이탈 위험` |

### INSTITUTION Role

| Engine Output | UI Element | 변환 |
|--------------|------------|------|
| `survival_mass / 1000000` | Primary Metric (SYSTEM MASS) | `{value} OCU` |
| `governance_state` | Secondary (GOVERNANCE) | `STABLE` / `UNSTABLE` |
| `expansion_state` | Secondary (EXPANSION) | `UNLOCKED` / `LOCKED` |
| `expansion_gap / 1000000` | Impact Display | `🔒 필요 질량: {value} OCU` |

---

## 📐 Action 조건 매핑

| Role | Condition (Engine) | UI Behavior |
|------|-------------------|-------------|
| SUBJECT | `risk >= 0.4 && gate !== 'RED'` | Button 노출 |
| OPERATOR | `at_risk_count >= 1 && gate !== 'RED'` | Button 노출 |
| SPONSOR | `efficiency < 0.8 && gate !== 'RED'` | Button 노출 |
| EMPLOYER | `churn_risk_count >= 1 && gate !== 'RED'` | Button 노출 |
| INSTITUTION | `false` (항상) | Button 미노출 |

---

## 🎨 색상 매핑

| Engine State | Primary Color | Background |
|-------------|---------------|------------|
| `GREEN` | `#00ff88` | `#000000` |
| `AMBER` / `YELLOW` | `#ffaa00` | `#000000` |
| `RED` | `#ff4444` | `#0a0000` |

---

## 📊 API Response 구조

### `/api/v1/physics/ui-binding?role={role}`

```json
{
  "role": "subject",
  "gate": "GREEN",
  "metrics": {
    "primary": {
      "label": "SURVIVAL",
      "value": 216,
      "unit": "일",
      "max": 365,
      "fill_pct": 59.2
    },
    "secondary": [
      { "label": "BURN", "value": "−₩47만/월", "class": "" },
      { "label": "RISK", "value": "32%", "class": "" }
    ]
  },
  "action": {
    "visible": true,
    "name": "RECOVER",
    "impact": "💰 −32%",
    "subtitle": "즉시 행동하지 않으면 손실 확정"
  },
  "countdown": {
    "enabled": true,
    "seconds": 5
  },
  "style": {
    "primary_color": "#00ff88"
  }
}
```

---

## 🔒 계산 공식 (LOCK)

### Risk 계산

```python
risk = 0.4 * pressure_risk + 0.4 * survival_risk + 0.2 * violation_risk

# pressure_risk = min(1.0, float_pressure / 1.5)
# survival_risk = 1.0 - (survival_days / 180) if survival_days < 180 else 0
# violation_risk = min(1.0, violation_count * 0.2)
```

### Efficiency 계산 (SPONSOR)

```python
efficiency = max(0, 1.0 - risk)
```

### Retention 계산 (EMPLOYER)

```python
retention = max(0.7, 1.0 - risk / 3)
```

### Governance 결정 (INSTITUTION)

```python
governance = "UNSTABLE" if gate == "RED" else "STABLE"
```

### Expansion 결정 (INSTITUTION)

```python
expansion = "UNLOCKED" if risk < 0.4 else "LOCKED"
```

---

## 📝 Implementation Checklist

- [x] `PhysicsEngine.compute_snapshot()` 구현
- [x] `PhysicsEngine.to_dict()` 구현
- [x] `PhysicsEngine.to_ui_model()` 구현
- [ ] `PhysicsEngine.to_role_ui_binding(role)` 추가
- [ ] `/api/v1/physics/ui-binding` 엔드포인트 추가
- [ ] Frontend `solar-roles.html` 연결

---

**Version**: 1.0
**Last Updated**: 2025-12-18
**Status**: LOCKED
