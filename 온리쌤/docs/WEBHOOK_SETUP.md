# 🔔 Auto-Input 웹훅 설정 가이드

## 개요

입력 = 0 아키텍처를 위한 자동 데이터 입력 웹훅 설정

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTO-INPUT SOURCES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💳 토스페이먼츠 (source: 'webhook')                             │
│  └─ 결제 완료/취소 → events (type: 'payment')                    │
│                                                                  │
│  💬 카카오 알림톡 (source: 'webhook')                            │
│  └─ 발송 결과 → events (type: 'notification')                    │
│                                                                  │
│  📱 QR 스캔 (source: 'qr')                                       │
│  └─ 출석 체크 → events (type: 'attendance')                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 토스페이먼츠 웹훅 설정

### 1.1 Supabase Edge Function 배포

```bash
cd 온리쌤
supabase functions deploy webhook-toss --no-verify-jwt
```

### 1.2 토스 대시보드 설정

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. 내 개발정보 → 웹훅 설정
3. URL 입력: `https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/webhook-toss`
4. 이벤트 선택:
   - ✅ PAYMENT_STATUS_CHANGED
   - ✅ PAYMENT_CONFIRMED

### 1.3 환경변수 설정

```bash
# Supabase Dashboard → Settings → Edge Functions
TOSS_SECRET_KEY=your_toss_secret_key
```

### 1.4 결제 요청 시 메타데이터 포함

```typescript
// 결제 요청 시
const paymentData = {
  amount: 300000,
  orderId: `ORDER-${Date.now()}`,
  orderName: '유소년 A반 1월 수강료',
  metadata: {
    studentId: 'uuid-of-student',
    studentName: '이농구',
    serviceId: 'uuid-of-service',
    serviceName: '유소년 A반',
    orgId: 'uuid-of-org',
    paymentMonth: '2026-01'
  }
}
```

---

## 2. 카카오 알림톡 웹훅 설정 (Solapi)

### 2.1 Supabase Edge Function 배포

```bash
supabase functions deploy webhook-kakao --no-verify-jwt
```

### 2.2 Solapi 대시보드 설정

1. [Solapi 콘솔](https://console.solapi.com/) 접속
2. 앱 설정 → 웹훅 설정
3. URL 입력: `https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/webhook-kakao`
4. 이벤트 선택:
   - ✅ MESSAGE_RESULT

### 2.3 알림톡 발송 시 customFields 포함

```typescript
// 알림톡 발송 시
const messageData = {
  to: '010-1234-5678',
  from: '02-1234-5678',
  kakaoOptions: {
    pfId: 'your_pfid',
    templateId: 'ATTENDANCE_CONFIRM',
    variables: {
      '#{학생명}': '이농구',
      '#{수업명}': '유소년 A반'
    }
  },
  customFields: {
    entityId: 'uuid-of-student',
    entityType: 'student',
    orgId: 'uuid-of-org',
    templateCode: 'ATTENDANCE_CONFIRM',
    eventType: 'attendance_confirm'
  }
}
```

---

## 3. QR 스캔 웹훅 설정

### 3.1 Supabase Edge Function 배포

```bash
supabase functions deploy webhook-qr --no-verify-jwt
```

### 3.2 앱에서 QR 스캔 시 호출

```typescript
// QR 스캔 후 호출
const response = await fetch(
  'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/webhook-qr',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrCode: 'ATB-22222222-2222-2222-2222-222222222222-1706000000',
      scannedAt: new Date().toISOString(),
      scannedBy: 'coach-uuid',
      serviceId: 'service-uuid',
      orgId: 'org-uuid',
      location: {
        latitude: 37.5012,
        longitude: 127.0396
      }
    })
  }
)

const result = await response.json()
// { success: true, studentName: '이농구', checkInTime: '...' }
```

---

## 4. 데이터 흐름

### 결제 완료 시

```
토스 → webhook-toss → events 테이블
                    ↓
              metadata 테이블
              (payment_method, payment_key, payment_month)
```

### 알림톡 발송 시

```
Solapi → webhook-kakao → events 테이블
                       ↓
                 metadata 테이블
                 (message_type, recipient_phone, template_code)
```

### QR 스캔 시

```
앱 → webhook-qr → events 테이블
                ↓
          metadata 테이블
          (check_in_time, scanned_by, location)
```

---

## 5. Universal Schema 연동

모든 웹훅 데이터는 Universal Schema의 `events` 테이블로 통합:

| Source | Event Type | Value |
|--------|-----------|-------|
| webhook (토스) | payment | 결제 금액 |
| webhook (토스) | payment_cancel | 취소 금액 (음수) |
| webhook (카카오) | notification | 1 (성공) / 0 (실패) |
| qr | attendance | 1 |

### 뷰로 조회

```sql
-- 결제 내역
SELECT * FROM payments_view WHERE source = 'webhook';

-- 출석 내역
SELECT * FROM attendance_view WHERE source = 'qr';
```

---

## 6. 테스트

### 토스 웹훅 테스트

```bash
curl -X POST https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/webhook-toss \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PAYMENT_STATUS_CHANGED",
    "createdAt": "2026-02-04T12:00:00+09:00",
    "data": {
      "paymentKey": "test-payment-key-001",
      "orderId": "ORDER-001",
      "status": "DONE",
      "method": "카드",
      "totalAmount": 300000,
      "suppliedAmount": 272727,
      "vat": 27273,
      "approvedAt": "2026-02-04T12:00:00+09:00",
      "metadata": {
        "studentId": "22222222-2222-2222-2222-222222222222",
        "serviceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "paymentMonth": "2026-02"
      }
    }
  }'
```

### QR 스캔 테스트

```bash
curl -X POST https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/webhook-qr \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "ATB-22222222-2222-2222-2222-222222222222-1706000000",
    "scannedAt": "2026-02-04T16:00:00+09:00"
  }'
```

---

## 7. 모니터링

Supabase Dashboard에서 확인:

1. **Edge Functions → Logs**: 웹훅 호출 로그
2. **Table Editor → events**: 저장된 이벤트
3. **Table Editor → metadata**: 이벤트 상세 정보

```sql
-- 오늘 웹훅으로 입력된 이벤트
SELECT * FROM events
WHERE source IN ('webhook', 'qr')
  AND occurred_at >= CURRENT_DATE
ORDER BY occurred_at DESC;
```
