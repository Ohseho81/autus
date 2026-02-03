# 🔄 올댓바스켓 1회 완주 시뮬레이션

> Human → Shadow → Auto 전체 사이클 재현

---

## 📅 시뮬레이션 기간

| 단계 | 기간 | 목표 |
|------|------|------|
| PHASE 1 (Human) | Day 1-14 | 로그 축적 |
| PHASE 2 (Shadow) | Day 15-28 | 정확도 70% |
| PHASE 3 (Auto) | Day 29+ | 첫 자동화 |

---

## 🎯 시뮬레이션 대상: "연속 결석 리마인더"

가장 단순한 패턴 하나를 선택:

> **연속 2회 결석 → 학부모 연락**

---

## 📊 PHASE 1: Human (Day 1-14)

### Day 1-3: Fact 축적

```json
// atb_attendance (Day 1)
{ "student_id": "S001", "date": "2026-02-01", "status": "present" }
{ "student_id": "S002", "date": "2026-02-01", "status": "absent" }
{ "student_id": "S003", "date": "2026-02-01", "status": "present" }

// atb_attendance (Day 2)
{ "student_id": "S001", "date": "2026-02-02", "status": "present" }
{ "student_id": "S002", "date": "2026-02-02", "status": "absent" }  // 연속 2회
{ "student_id": "S003", "date": "2026-02-02", "status": "late" }

// atb_attendance (Day 3)
{ "student_id": "S001", "date": "2026-02-03", "status": "absent" }
{ "student_id": "S002", "date": "2026-02-03", "status": "absent" }  // 연속 3회
{ "student_id": "S003", "date": "2026-02-03", "status": "present" }
```

### Day 2: 첫 번째 개입 (Human)

매니저가 S002 학부모에게 전화함.

```json
// atb_interventions (Day 2, 18:30)
{
  "id": "INT_001",
  "student_id": "S002",
  "trigger_type": "manual",
  "action_code": "call.outbound",
  "executed_by": "manager_kim",
  "mode": "manual",
  "context_snapshot": {
    "consecutive_absent": 2,
    "attendance_rate": 0,
    "last_status": "absent"
  },
  "outcome": "pending",
  "created_at": "2026-02-02T18:30:00Z"
}
```

### Day 3: 개입 결과

S002 학부모와 통화 완료. 내일 출석 예정.

```json
// atb_interventions (Day 3, 10:00) - 결과 업데이트
{
  "id": "INT_001",
  "outcome": "success",
  "outcome_data": {
    "call_duration": 180,
    "parent_response": "answered",
    "promised_action": "will_attend_tomorrow"
  },
  "outcome_at": "2026-02-03T10:00:00Z"
}
```

### Day 4: 결과 확인

```json
// atb_attendance (Day 4)
{ "student_id": "S002", "date": "2026-02-04", "status": "present" }  // ✅ 복귀
```

---

### Day 5-14: 패턴 반복 축적

| Day | 학생 | 상황 | 개입 | 결과 |
|-----|------|------|------|------|
| 5 | S005 | 연속 결석 2회 | 매니저 전화 | 성공 (복귀) |
| 7 | S008 | 연속 결석 2회 | 매니저 전화 | 실패 (탈퇴) |
| 9 | S003 | 연속 결석 2회 | 매니저 전화 | 성공 (복귀) |
| 11 | S012 | 연속 결석 2회 | 매니저 카톡 | 성공 (복귀) |
| 13 | S001 | 연속 결석 2회 | 매니저 전화 | 성공 (복귀) |

### PHASE 1 종료 시점 (Day 14)

**Intervention Log 요약:**

```
총 개입: 12건
- 연속 결석 2회 → 연락: 8건
- 연속 결석 3회 → 연락: 3건
- 기타: 1건

성공률:
- 연속 결석 2회 개입: 6/8 = 75% ✅
- 연속 결석 3회 개입: 1/3 = 33% ❌
```

---

## 🔮 Path Builder: 행동 → 경로

### 추출된 Path #1: 연속 결석 2회 → 전화 → 복귀

```
[Fact: absent]
 → [Fact: absent]  // consecutive = 2
   → [Intervention: call.outbound by human]
     → [Outcome: present next day]
```

**Path 점수:**
- 발생 빈도: 8회
- 성공률: 75%
- 인간 개입 비용: 평균 3분/건
- 재현성: 높음 (동일 조건 → 동일 행동)

### 추출된 Path #2: 연속 결석 3회 → 전화 → 탈퇴

```
[Fact: absent] × 3
 → [Intervention: call.outbound by human]
   → [Outcome: withdrawn]
```

**Path 점수:**
- 발생 빈도: 3회
- 성공률: 33%
- 재현성: 낮음

---

## 📏 Top Percentile 선택

| Path | 빈도 | 성공률 | 선택 |
|------|------|--------|------|
| 연속 2회 → 전화 → 복귀 | 8 | 75% | ✅ STANDARD |
| 연속 3회 → 전화 → 탈퇴 | 3 | 33% | ❌ 제외 |

**STANDARD PATH 확정:**

> 연속 결석 2회 발생 시 → 학부모 연락

---

## 🔧 Rule 컴파일 (Day 14)

### Intent 추출

```yaml
trigger:
  type: attendance
  condition: consecutive_absent >= 2

action:
  type: message.parent
  channel: call | kakao
  timing: within_24h

expected_outcome:
  student_returns: true
  success_rate: 75%
```

### Rule JSON 생성

```json
{
  "id": "ATT_CONSEC_2",
  "name": "연속 결석 2회 학부모 알림",
  "version": "1.0.0",
  "mode": "shadow",  // 아직 auto 아님
  "enabled": true,

  "trigger": {
    "type": "attendance",
    "event": "absent"
  },

  "condition": {
    "field": "consecutive_absent",
    "operator": ">=",
    "value": 2
  },

  "actions": ["attendance_reminder"],

  "thresholds": {
    "consecutive_absent": 2
  },

  "metadata": {
    "source": "STANDARD_PATH_001",
    "compiled_at": "2026-02-14T00:00:00Z",
    "human_interventions_analyzed": 8,
    "success_rate": 0.75
  }
}
```

---

## 🌑 PHASE 2: Shadow (Day 15-28)

### Shadow Mode 작동

시스템이 "제안"만 하고 실행하지 않음.

```
Day 15:
  S015 연속 결석 2회 발생
  → [SHADOW] Rule ATT_CONSEC_2 트리거
  → [SHADOW] 제안: "학부모 연락 필요"
  → [LOG] shadow_proposed: attendance_reminder

  매니저 실제 행동: 전화함 ✅
  → [MATCH] Shadow 제안 = 실제 행동
```

### Shadow 정확도 추적 (Day 15-28)

| Day | 학생 | Shadow 제안 | 매니저 행동 | 일치 |
|-----|------|-------------|------------|------|
| 15 | S015 | 연락 필요 | 전화함 | ✅ |
| 17 | S018 | 연락 필요 | 카톡 발송 | ✅ |
| 19 | S003 | 연락 필요 | 전화함 | ✅ |
| 21 | S022 | 연락 필요 | 아무것도 안함 | ❌ |
| 23 | S011 | 연락 필요 | 전화함 | ✅ |
| 25 | S007 | 연락 필요 | 카톡 발송 | ✅ |
| 27 | S025 | 연락 필요 | 전화함 | ✅ |

### Shadow 정확도 계산

```
일치: 6/7 = 85.7% ✅ (기준 70% 통과)
```

### Day 21 불일치 분석

```json
{
  "case_id": "SHADOW_MISS_001",
  "student_id": "S022",
  "shadow_proposed": "attendance_reminder",
  "human_action": null,
  "analysis": {
    "reason": "학생이 미리 연락함 (사유 있는 결석)",
    "context_missing": "excused_absence flag 없음"
  },
  "learning": {
    "add_condition": "NOT excused",
    "note": "사유 결석은 개입 대상 아님"
  }
}
```

### Rule 수정 (Day 28)

```json
{
  "id": "ATT_CONSEC_2",
  "version": "1.1.0",  // 버전 업
  "condition": {
    "and": [
      { "field": "consecutive_absent", "operator": ">=", "value": 2 },
      { "field": "last_excuse", "operator": "is_null", "value": true }
    ]
  }
}
```

---

## ☀️ PHASE 3: Auto (Day 29+)

### 승급 판정 (Day 28)

| 기준 | 값 | 통과 |
|------|-----|------|
| Shadow 정확도 | 85.7% | ✅ (≥70%) |
| 운영자 승인 | "대체로 맞음" | ✅ |
| 위험 수준 | 저위험 (되돌릴 수 있음) | ✅ |
| 반복 실행 | 제한 있음 (1회/학생/주) | ✅ |

**승급 결정: Shadow → Auto**

### Rule 최종 버전

```json
{
  "id": "ATT_CONSEC_2",
  "version": "2.0.0",
  "mode": "auto",  // 🔥 자동 실행
  "enabled": true,

  "trigger": {
    "type": "attendance",
    "event": "absent"
  },

  "condition": {
    "and": [
      { "field": "consecutive_absent", "operator": ">=", "value": 2 },
      { "field": "last_excuse", "operator": "is_null", "value": true }
    ]
  },

  "actions": ["attendance_reminder"],

  "execution": {
    "channel": "kakao",  // 전화 → 카톡으로 표준화
    "timing": "immediate",
    "cooldown": "7d",  // 같은 학생 7일 내 재발송 금지
    "max_per_day": 10  // 하루 최대 10건
  },

  "metadata": {
    "promoted_at": "2026-02-28T00:00:00Z",
    "promoted_from": "shadow",
    "shadow_accuracy": 0.857,
    "human_interventions_replaced": 8
  }
}
```

### Day 29: 첫 Auto 실행

```
09:15 - S030 연속 결석 2회 발생
09:15 - [AUTO] Rule ATT_CONSEC_2 트리거
09:15 - [AUTO] 조건 확인: consecutive_absent=2, excused=false
09:15 - [EXECUTE] 카카오 알림톡 발송
09:15 - [LOG] atb_interventions 기록

{
  "id": "INT_AUTO_001",
  "student_id": "S030",
  "trigger_type": "rule",
  "action_code": "attendance_reminder",
  "executed_by": "moltbot",
  "mode": "auto",
  "rule_id": "ATT_CONSEC_2",
  "rule_version": "2.0.0",
  "context_snapshot": {
    "consecutive_absent": 2,
    "attendance_rate": 60
  },
  "outcome": "pending",
  "created_at": "2026-02-29T09:15:00Z"
}
```

### Day 30: 결과 확인

```json
// S030 출석
{ "student_id": "S030", "date": "2026-03-01", "status": "present" }

// Intervention 결과 업데이트
{
  "id": "INT_AUTO_001",
  "outcome": "success",
  "outcome_at": "2026-03-01T09:00:00Z"
}
```

---

## 🔄 루프 완성

### Auto 실행 → 새로운 학습 데이터

```
[Auto Intervention]
 → [New Fact: attendance]
   → [Outcome measured]
     → [Path updated]
       → [Rule refined]
         → [Loop continues]
```

### Day 29-35 Auto 실행 통계

| 지표 | 값 |
|------|-----|
| Auto 실행 | 5건 |
| 성공 (복귀) | 4건 (80%) |
| 실패 (미복귀) | 1건 (20%) |
| 매니저 개입 | 0건 |

### 1회 완주 성과

| Before (Day 1) | After (Day 35) |
|----------------|----------------|
| 매니저가 매번 전화 | 시스템이 자동 발송 |
| 개입당 3분 소요 | 개입당 0분 소요 |
| 누락 발생 가능 | 100% 실행 보장 |
| 기준 불명확 | Rule로 명문화 |

---

## 📊 1회 완주 타임라인 요약

```
Day 1-14:  HUMAN
           └─ Intervention 축적 (12건)
           └─ Path 추출
           └─ STANDARD PATH 선정
           └─ Rule 컴파일 (Shadow)

Day 15-28: SHADOW
           └─ 제안 vs 실제 비교
           └─ 정확도 측정 (85.7%)
           └─ Rule 수정 (v1.1.0)
           └─ 승급 판정

Day 29+:   AUTO
           └─ 첫 자동 실행
           └─ 결과 측정
           └─ 루프 재진입
```

---

## 🔒 1회 완주 증명

| 단계 | 완료 |
|------|------|
| Human → Intervention Log | ✅ |
| Log → Path | ✅ |
| Path → STANDARD | ✅ |
| STANDARD → Rule (Shadow) | ✅ |
| Shadow → 정확도 70%+ | ✅ |
| Shadow → Auto 승급 | ✅ |
| Auto → 실행 → 새 Log | ✅ |
| 새 Log → 루프 재진입 | ✅ |

**1회 완주 완료** 🎉

---

## ➡️ 다음 루프

| 루프 | 대상 | 예상 기간 |
|------|------|----------|
| 2회 | 결제 리마인더 (마감 3일 전) | 30일 |
| 3회 | 보호모드 진입 (연속 3회 결석) | 30일 |
| 4회 | QR 윈도우 자동 조정 | 45일 |

각 루프가 완주될 때마다 매니저 개입 시간은 감소한다.
