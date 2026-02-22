# 🎯 최소투입 최고효율

> **4원칙: 삭제 → 일체화 → 자동화 → 제도개선**

---

## 1️⃣ 삭제 (Delete)

> **저장하지 않아도 되는 것은 저장하지 않는다**

### 삭제 대상 필드

| 필드 | 삭제 이유 | 대체 방법 |
|------|----------|----------|
| 회원명 (중복) | entities.name과 동일 | JOIN |
| 연락처 (중복) | entities.phone과 동일 | JOIN |
| 미수금 (중복) | 결제에서 계산 가능 | `SUM(outstanding)` |
| 출석률 (중복) | 이벤트에서 계산 가능 | `COUNT(*) / total` |
| 개인일별매출 (중복) | 결제에서 계산 가능 | `SUM(amount) GROUP BY date` |
| 수납현황 (중복) | 결제 상태로 대체 | `payment.status` |
| 분기/횟수 (중복) | services에 이미 존재 | `services.duration_*` |
| 등록일시/수정일시 | 모든 테이블에 기본 포함 | `created_at`, `updated_at` |
| 등록자/수정자 | 감사 로그로 대체 | 필요시 events로 |

### 삭제 효과
```
37개 필드 → 28개 필드 (24% 감소)
```

---

## 2️⃣ 일체화 (Unify)

> **같은 개념은 하나로 통합한다**

### 통합 대상

| 분산된 개념 | 통합 위치 | 방법 |
|------------|----------|------|
| 학생정보 + 회원정보 | `entities` | type='student' |
| 학부모정보 | `entities` | type='parent' + relationship |
| 수업 + 회원권 | `services` | type으로 구분 |
| 모든 결제수단 | `atb_payments.method` | enum으로 통합 |
| 학교/학년/생년월일/셔틀/유니폼/백넘버 | `metadata` | key-value |

### 결제수단 일체화

**Before (6개 컬럼):**
```
현금, 카드, 계좌이체, 비대면, 제로페이, 미수금
```

**After (1개 JSONB):**
```sql
payment_breakdown JSONB DEFAULT '{}'
-- {"cash": 50000, "card": 100000, "transfer": 0, "zeropay": 0}
```

### 농구 전용 필드 일체화

**Before (6개 컬럼):**
```
학교, 학년, 생년월일, 셔틀, 유니폼, 백넘버
```

**After (1개 JSONB in metadata):**
```sql
-- entities.metadata로 통합 (테이블 추가 불필요)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}';
-- {"school": "대치초", "grade": 3, "birth": "2015-03-15", "shuttle": true, "uniform": true, "back_number": "23"}
```

### 통합 효과
```
17개 테이블 → 6개 핵심 테이블 (Universal Schema 유지)
```

---

## 3️⃣ 자동화 (Automate)

> **입력하지 않고 계산/추론한다**

### 자동 계산 필드

| 필드 | 자동화 방법 | 트리거 |
|------|------------|--------|
| 출석률 | `출석일 / 수업일 * 100` | 실시간 계산 |
| 미수금 | `SUM(amount - paid)` | 결제 시 계산 |
| 개인매출 | `SUM(payments) WHERE entity_id` | 결제 시 집계 |
| 주 수업 횟수 | `COUNT(sessions) / weeks` | 스케줄에서 추론 |
| 이용종료일 | `시작일 + duration` | 등록 시 계산 |
| 학년 | `현재연도 - 생년 + 1` (초등) | 매년 자동 갱신 |

### 자동 생성 데이터

| 데이터 | 트리거 | 자동 액션 |
|--------|--------|----------|
| 보충권 | 결석 감지 | 자동 생성 |
| 결제 알림 | D-7 | 알림톡 발송 |
| 재등록 안내 | 만료 D-14 | 알림톡 발송 |
| 출석 확인 | 수업 전날 | 알림톡 발송 |
| 만족도 조사 | 수업 종료 | 알림톡 발송 |

### 자동화 뷰 (계산 필드)

```sql
CREATE OR REPLACE VIEW v_student_summary AS
SELECT
  e.id,
  e.name,
  e.phone,
  e.extra->>'school' as school,
  e.extra->>'grade' as grade,
  e.extra->>'shuttle' as shuttle,

  -- 자동 계산 필드
  (SELECT COUNT(*) FROM events
   WHERE entity_id = e.id AND event_type = 'attendance'
   AND status = 'present') as attended,

  (SELECT COUNT(*) FROM events
   WHERE entity_id = e.id AND event_type = 'attendance') as total_sessions,

  ROUND(
    (SELECT COUNT(*) FROM events
     WHERE entity_id = e.id AND event_type = 'attendance'
     AND status = 'present')::numeric /
    NULLIF((SELECT COUNT(*) FROM events
     WHERE entity_id = e.id AND event_type = 'attendance'), 0) * 100
  , 1) as attendance_rate,

  (SELECT COALESCE(SUM(outstanding), 0) FROM atb_payments
   WHERE entity_id = e.id) as total_outstanding,

  (SELECT COALESCE(SUM(amount), 0) FROM atb_payments
   WHERE entity_id = e.id AND status = 'completed') as total_paid

FROM entities e
WHERE e.type = 'student';
```

---

## 4️⃣ 제도개선 (System Improvement)

> **구조적으로 입력이 필요없게 만든다**

### 입력 제거 제도

| 기존 입력 | 제도 개선 | 효과 |
|----------|----------|------|
| 출석 체크 | QR 자동 스캔 | 입력 0 |
| 결제 확인 | 토스 웹훅 자동 | 입력 0 |
| 학부모 응답 | 알림톡 버튼 | 텍스트 입력 0 |
| 상담 예약 | 버튼 선택 | 날짜 입력 0 |
| 만족도 조사 | 이모지 버튼 | 점수 입력 0 |
| 결석 사유 | 버튼 선택 | 텍스트 입력 0 |

### 데이터 흐름 제도

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   입력 원천          자동 흐름              최종 상태           │
│   ─────────         ─────────             ─────────            │
│                                                                 │
│   토스 결제    ───▶  웹훅 수신  ───▶  payments 기록            │
│   QR 스캔     ───▶  웹훅 수신  ───▶  attendance 기록          │
│   알림톡 버튼  ───▶  웹훅 수신  ───▶  events 기록             │
│   수업 종료   ───▶  트리거     ───▶  만족도 알림톡 발송       │
│   결석 감지   ───▶  트리거     ───▶  보충권 자동 생성         │
│   만료 D-14  ───▶  Cron Job  ───▶  재등록 알림톡 발송        │
│                                                                 │
│   👨‍💼 관리자 입력 = 0%                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 최종 스키마 (최소화)

### 테이블 (6개만)

| # | 테이블 | 용도 | 비고 |
|---|--------|------|------|
| 1 | `entities` | 모든 사람 | +extra JSONB |
| 2 | `services` | 모든 서비스 | 수업+회원권 통합 |
| 3 | `events` | 모든 이벤트 | 출석+결제+알림 |
| 4 | `relationships` | 관계 | 학부모-학생, 코치-반 |
| 5 | `atb_payments` | 결제 상세 | +payment_breakdown |
| 6 | `atb_lesson_sessions` | 수업 일정 | |

### 추가 컬럼 (2개만)

```sql
-- 1. entities에 extra JSONB 추가
ALTER TABLE entities ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}';

-- 2. payments에 breakdown 추가
ALTER TABLE atb_payments ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT '{}';
ALTER TABLE atb_payments ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0;
```

### 삭제 가능 테이블

| 테이블 | 삭제 이유 |
|--------|----------|
| `metadata` | entities.extra로 대체 |
| `organizations` | 단일 사업장이면 불필요 |
| `atb_classes` | services로 통합 가능 |

---

## ✅ 4원칙 적용 결과

```
┌─────────────────────────────────────────────────────────────────┐
│                     최소투입 최고효율 결과                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1️⃣ 삭제                                                       │
│      필드: 37개 → 28개 (24% ↓)                                  │
│      중복 제거: 9개 필드                                         │
│                                                                 │
│   2️⃣ 일체화                                                     │
│      테이블: 17개 → 6개 (65% ↓)                                 │
│      결제수단: 6컬럼 → 1 JSONB                                  │
│      농구필드: 6컬럼 → 1 JSONB                                  │
│                                                                 │
│   3️⃣ 자동화                                                     │
│      계산 필드: 6개 (저장 안 함)                                 │
│      자동 생성: 5개 트리거                                       │
│      Cron Jobs: 6개                                             │
│                                                                 │
│   4️⃣ 제도개선                                                   │
│      관리자 입력: 95% → 0%                                      │
│      학부모 텍스트 입력: 0 (버튼만)                              │
│      코치 입력: 버튼 3개 + 영상                                  │
│                                                                 │
│   ─────────────────────────────────────────────────────────────  │
│                                                                 │
│   📈 효율                                                        │
│      저장 데이터: 65% 감소                                       │
│      수동 입력: 95% 감소                                         │
│      유지보수: 단순화                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 즉시 실행 SQL

```sql
-- 005_minimum_input.sql
-- 최소투입 최고효율 적용

-- 1. entities extra 컬럼 (농구 전용 필드 통합)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}';

-- 2. payments 확장 (결제수단 통합)
ALTER TABLE atb_payments ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT '{}';
ALTER TABLE atb_payments ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0;

-- 3. 자동 계산 뷰
CREATE OR REPLACE VIEW v_student_dashboard AS
SELECT
  e.id,
  e.name,
  e.phone,
  e.extra,
  e.v_index,
  e.tier,

  -- 자동 계산: 출석률
  COALESCE(att.rate, 0) as attendance_rate,

  -- 자동 계산: 미수금
  COALESCE(pay.outstanding, 0) as outstanding,

  -- 자동 계산: 총 결제액
  COALESCE(pay.total_paid, 0) as total_paid

FROM entities e
LEFT JOIN LATERAL (
  SELECT
    ROUND(COUNT(*) FILTER (WHERE status = 'present')::numeric /
          NULLIF(COUNT(*), 0) * 100, 1) as rate
  FROM events WHERE entity_id = e.id AND event_type = 'attendance'
) att ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(outstanding) as outstanding,
    SUM(amount) FILTER (WHERE status = 'completed') as total_paid
  FROM atb_payments WHERE entity_id = e.id
) pay ON true
WHERE e.type = 'student';

-- 완료
COMMENT ON VIEW v_student_dashboard IS '학생 대시보드 - 모든 계산 필드 자동화';
```

---

*Updated: 2026-02-04*
*Version: 4.0 (최소투입 최고효율)*
