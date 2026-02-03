# 🎫 PHASE 1 작업 티켓 (Human → 기록만)

> **목표**: 운영 현실을 있는 그대로 기록. MoltBot 학습 재료 확보.
> **원칙**: 자동화 0. 사람이 하고 시스템은 기록만.

---

## 📋 티켓 목록

### 🟢 1-1. Fact 기록 (결제)

| ID | 티켓 | 우선순위 | 예상시간 |
|----|------|----------|----------|
| P1-PAY-01 | 결제 웹훅 엔드포인트 완성 | P0 | 2h |
| P1-PAY-02 | 결제 성공 이벤트 → atb_payments INSERT | P0 | 1h |
| P1-PAY-03 | 결제 실패 이벤트 → atb_payments INSERT (status='failed') | P0 | 1h |
| P1-PAY-04 | 수기 결제 입력 경로 차단 확인 | P0 | 0.5h |

**완료 조건**:
- 모든 결제가 `/payment-webhook`로만 들어옴
- 수기 입력 경로 0개
- 결제 실패도 Fact로 기록됨

---

### 🟢 1-2. Fact 기록 (출석)

| ID | 티켓 | 우선순위 | 예상시간 |
|----|------|----------|----------|
| P1-ATT-01 | QR 스캔 엔드포인트 완성 | P0 | 2h |
| P1-ATT-02 | QR 스캔 → atb_attendance INSERT | P0 | 1h |
| P1-ATT-03 | QR 토큰 30초 만료 적용 | P1 | 1h |
| P1-ATT-04 | iPad 키오스크 스캔 지원 | P1 | 2h |
| P1-ATT-05 | 수기 출석 입력 경로 차단 확인 | P0 | 0.5h |

**완료 조건**:
- 출석이 `/attendance-chain` (QR)로만 발생
- 수기 입력 경로 0개
- QR 재사용 차단됨

---

### 🔴 1-3. 개입 기록 (가장 중요!)

| ID | 티켓 | 우선순위 | 예상시간 |
|----|------|----------|----------|
| P1-INT-01 | 매니저 "손댄 순간" 감지 → Intervention Log | P0 | 3h |
| P1-INT-02 | 수동 메시지 발송 감지 | P0 | 2h |
| P1-INT-03 | 반 이동 시 개입 로그 | P0 | 1h |
| P1-INT-04 | 시간 변경 시 개입 로그 | P0 | 1h |
| P1-INT-05 | 상태 변경 시 개입 로그 (active→paused 등) | P0 | 1h |
| P1-INT-06 | Telegram 알림: "오늘 N건 개입" 리포트 | P1 | 2h |

**완료 조건**:
- 매니저가 뭔가 "손댄 순간"이 100% 기록됨
- 수동 메시지 발송이 감지됨
- 반/시간 변경 시 개입 로그가 남음

---

## 🎯 PHASE 1 완료 기준

| 항목 | 기준 |
|------|------|
| 운영 | 불편해도 정상 작동 |
| 로그 | 완전 (누락 0) |
| 자동화 | 0건 |
| 수기 입력 | 구조적 불가능 |

---

## 📆 실행 순서 (7일)

### Day 1-2: 결제 Fact
```
P1-PAY-01 → P1-PAY-02 → P1-PAY-03 → P1-PAY-04
```

### Day 3-4: 출석 Fact
```
P1-ATT-01 → P1-ATT-02 → P1-ATT-03 → P1-ATT-05
```

### Day 5-7: 개입 로그
```
P1-INT-01 → P1-INT-02 → P1-INT-03 → P1-INT-05 → P1-INT-06
```

---

## 🔧 티켓 상세

### P1-PAY-01: 결제 웹훅 엔드포인트 완성

**설명**: PortOne/Toss 웹훅을 받아 결제 이벤트를 기록

**구현**:
```typescript
// supabase/functions/payment-webhook/index.ts
// 이미 생성됨 - 검증 및 테스트 필요
```

**테스트**:
```bash
curl -X POST /functions/v1/payment-webhook \
  -d '{"student_id":"...", "amount":100000, "month":"2026-02", "status":"paid"}'
```

**완료 조건**:
- [ ] 웹훅 수신 성공
- [ ] atb_payments에 INSERT 확인
- [ ] 에러 시 로그 남음

---

### P1-ATT-01: QR 스캔 엔드포인트 완성

**설명**: QR 코드 스캔 → 출석 체크

**구현**:
```typescript
// supabase/functions/attendance-chain/index.ts
// 이미 생성됨 - QR 검증 로직 강화 필요
```

**테스트**:
```bash
curl -X POST /functions/v1/attendance-chain \
  -d '{"student_id":"...", "class_id":"...", "status":"present", "qr_code":"ATB-xxxx"}'
```

**완료 조건**:
- [ ] QR 스캔 성공
- [ ] atb_attendance에 INSERT 확인
- [ ] check_in_method = 'qr' 확인

---

### P1-INT-01: 매니저 "손댄 순간" 감지

**설명**: 모든 수동 조작을 Intervention Log로 기록

**구현**:
```javascript
// moltbot-brain/core/intervention-detector.js (NEW)

const MANUAL_ACTIONS = [
  'student.update',      // 학생 정보 수정
  'class.change',        // 반 변경
  'schedule.change',     // 시간 변경
  'status.change',       // 상태 변경
  'payment.manual',      // 수동 결제 처리
  'message.manual',      // 수동 메시지 발송
];

function detectManualAction(action, actor, target) {
  return {
    trigger_type: 'manual',
    action_code: action,
    executed_by: actor,
    student_id: target.student_id,
    context_snapshot: target,
    created_at: new Date().toISOString(),
  };
}
```

**완료 조건**:
- [ ] 수동 조작 100% 감지
- [ ] atb_interventions에 INSERT
- [ ] 일일 리포트 Telegram 발송

---

## ❌ 중단 기준

다음 중 하나라도 발생하면 **즉시 중단**:

1. 수기 입력 경로가 발견됨
2. notes/메모 필드가 사용됨
3. Intervention Log 없이 상태 변경됨
4. QR 외 출석 입력 발생
5. 웹훅 외 결제 입력 발생

---

## 📊 PHASE 1 KPI

| 지표 | 목표 |
|------|------|
| 수기 입력 | 0건 |
| 로그 누락 | 0건 |
| 개입 기록률 | 100% |
| 자동화 실행 | 0건 |

---

## ➡️ PHASE 2 진입 조건

PHASE 1 완료 후:
- 최소 7일 운영 데이터 축적
- Intervention Log 30건 이상
- 로그 기반 패턴 분석 가능

그 다음 → **PHASE 2 (Shadow)** 시작
