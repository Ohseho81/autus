# Learning Loop Slot

## Purpose
단일 개체가 경험에서 학습하는 메커니즘을 만든다.

## DONE Definition
단일 개체 학습 명확 — 트리거 → 패턴 → 적용 → 측정 완결

## Status
FILLED ✅

---

## Checklist
- [x] Failure Memory 개념 정의
- [x] 패턴 저장 구조
- [x] 학습 트리거 조건 정의
- [x] 학습 결과 적용 로직
- [x] 학습 효과 측정 지표

---

## 1. 학습 트리거 조건 (Trigger)

```yaml
LEARNING_TRIGGERS:
  # 즉시 학습 (Immediate)
  CRITICAL_STATE:
    condition: "status === 'RED' OR risk > 0.6"
    action: "snapshot + pattern_capture"
    
  FAILURE_IMMINENT:
    condition: "failure_in_ticks < 10"
    action: "early_warning + snapshot"
    
  # 주기적 학습 (Periodic)  
  CYCLE_COMPLETE:
    condition: "tick % 60 === 0 (cycle += 1)"
    action: "aggregate_patterns"
    
  # 이벤트 기반 (Event-driven)
  L4_AUDIT_LOCK:
    condition: "AUDIT verdict === 'LOCK'"
    action: "record_decision + outcome_tracking"
```

---

## 2. 패턴 캡처 구조 (Pattern Capture)

```yaml
PATTERN_SCHEMA:
  id: "PAT_001"
  timestamp: "2025-12-17T20:30:00Z"
  
  # 상태 스냅샷 (실패 직전 5 ticks)
  state_sequence:
    - { tick: 95, entropy: 0.62, pressure: 0.71, status: "YELLOW" }
    - { tick: 96, entropy: 0.65, pressure: 0.73, status: "YELLOW" }
    - { tick: 97, entropy: 0.68, pressure: 0.75, status: "YELLOW" }
    - { tick: 98, entropy: 0.71, pressure: 0.78, status: "RED" }
    - { tick: 99, entropy: 0.74, pressure: 0.80, status: "RED" }
  
  # 원인 분석
  bottleneck: "OVERLOAD"
  required_action: "REMOVE"
  
  # 결과
  outcome:
    prevented: true
    action_taken: "RECOVER"
    recovery_ticks: 12
```

---

## 3. 학습 결과 적용 로직 (Application)

```python
def apply_learning(current_state, patterns):
    """
    학습된 패턴을 현재 상태에 적용
    """
    # 1. 유사 패턴 검색
    similar = find_similar_patterns(current_state, patterns)
    
    if not similar:
        return None
    
    # 2. 가장 유사한 패턴의 결과 확인
    best_match = similar[0]
    
    # 3. 조기 경고 생성
    if best_match.outcome.prevented:
        return {
            "warning": "SIMILAR_PATTERN_DETECTED",
            "confidence": best_match.similarity,
            "recommended_action": best_match.outcome.action_taken,
            "expected_recovery": best_match.outcome.recovery_ticks
        }
    else:
        return {
            "warning": "FAILURE_PATTERN_DETECTED",
            "confidence": best_match.similarity,
            "avoid_action": best_match.outcome.action_taken,
            "risk_level": "HIGH"
        }
```

### 적용 시점

| 시점 | 조건 | 액션 |
|------|------|------|
| 매 tick | entropy > 0.5 | 패턴 매칭 시도 |
| L3 ACTION 클릭 | 항상 | 유사 패턴 경고 표시 |
| L4 AUDIT 표시 | 항상 | Confidence 계산에 반영 |

---

## 4. 학습 효과 측정 지표 (Metrics)

```yaml
LEARNING_METRICS:
  # 예방 효과
  prevention_rate:
    formula: "prevented_failures / total_warnings"
    target: "> 0.7 (70%)"
    
  # 정확도
  pattern_accuracy:
    formula: "correct_predictions / total_predictions"
    target: "> 0.6 (60%)"
    
  # 속도
  early_warning_ticks:
    formula: "avg(warning_tick - failure_tick)"
    target: "> 5 ticks (5초 이상 사전 경고)"
    
  # 커버리지
  pattern_coverage:
    formula: "matched_failures / total_failures"
    target: "> 0.8 (80% 패턴 매칭)"
```

### UI 표시 (L7 SYSTEM BAR)

```
LEARN: 73% (14/19 prevented)
```

---

## 5. 현재 구현 상태

| 컴포넌트 | 위치 | 상태 |
|----------|------|------|
| failure_in_ticks 계산 | `app/main.py:_derive()` | ✅ 구현됨 |
| bottleneck 감지 | `app/main.py:_derive()` | ✅ 구현됨 |
| status 결정 | `app/main.py:_derive()` | ✅ 구현됨 |
| L4 AUDIT 기록 | `frontend/solar.html:auditDecision()` | ✅ 구현됨 |
| L5 MEMORY 저장 | `frontend/solar.html:memoryLog` | ✅ 구현됨 |
| 패턴 매칭 | - | ⏳ 다음 단계 |

---

## 6. 데이터 흐름

```
┌─────────────────────────────────────────────────────────┐
│                    LEARNING LOOP                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐           │
│   │ TRIGGER │ -> │ CAPTURE │ -> │  STORE  │           │
│   │         │    │         │    │         │           │
│   │ risk>0.6│    │ 5 ticks │    │ patterns│           │
│   │ FH < 10 │    │ snapshot│    │  table  │           │
│   └─────────┘    └─────────┘    └────┬────┘           │
│                                      │                 │
│                                      ▼                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐           │
│   │ MEASURE │ <- │  APPLY  │ <- │  MATCH  │           │
│   │         │    │         │    │         │           │
│   │ metrics │    │ warning │    │ similar │           │
│   │ display │    │ + action│    │ pattern │           │
│   └─────────┘    └─────────┘    └─────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 의존성
- state_engine (FILLED) - 상태 데이터 제공
- safety (FILLED) - 안전 제약 조건
- hq_ui (FILLED) - L4 AUDIT, L5 MEMORY 표시

## Notes
- 2025-12-17: 슬롯 생성
- 2025-12-17: 학습 루프 4단계 정의 완료 (Trigger → Capture → Apply → Measure)
- 다음 단계: 패턴 매칭 알고리즘 구현 (유사도 계산)
