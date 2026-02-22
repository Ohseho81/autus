# AUTUS 연동 정책 v1.0
**결제선생 + 카카오톡 + Supabase 통합 전략**

**날짜**: 2026-02-14
**목표**: 세 시스템의 완전한 자동화 통합

---

## 🎯 핵심 원칙

### 1. Single Source of Truth
```
Supabase = Master Database
결제선생 = 결제/청구 전용
카카오톡 = 소통 채널
```

### 2. 데이터 플로우
```
Supabase (이벤트 발생)
    ↓
결제선생 (청구서 생성)
    ↓
카카오톡 (알림 발송)
    ↓
결제선생 (결제 완료)
    ↓
Supabase (업데이트)
    ↓
카카오톡 (영수증 발송)
```

### 3. 자동화 우선
- 수동 작업 최소화
- Edge Functions + Webhooks
- Cron 작업 활용

---

## 📊 결제선생 연동 정책

### A. 학생 데이터 동기화

#### A1. 신규 학생 등록 (Supabase → 결제선생)
**트리거**: `profiles` 테이블 INSERT

**프로세스**:
```sql
-- Supabase Trigger
CREATE TRIGGER sync_student_to_payssam
AFTER INSERT ON profiles
FOR EACH ROW
WHEN (NEW.type = 'student')
EXECUTE FUNCTION sync_to_payssam();
```

**Edge Function**: `sync-student-to-payssam`
```typescript
// 결제선생 API 호출
POST https://api.payssam.kr/v1/students
{
  "name": student.name,
  "phone": student.phone,
  "class": student.metadata.classes[0],
  "external_id": student.id  // Supabase UUID
}

// 결과를 Supabase에 저장
UPDATE profiles
SET metadata = metadata || '{"payssam_id": "xxx"}'
WHERE id = student.id;
```

**정책**:
- ✅ 자동 동기화 (실시간)
- ✅ `external_id`로 양방향 매핑
- ⚠️ 중복 방지: `external_id` 체크
- ⚠️ 에러 시 재시도 (3회)

---

#### A2. 학생 정보 수정 (Supabase ↔ 결제선생)
**트리거**: `profiles` 테이블 UPDATE

**동기화 항목**:
- 이름 변경
- 전화번호 변경
- 클래스 변경
- 상태 변경 (active/inactive)

**프로세스**:
```typescript
// Supabase → 결제선생
PATCH https://api.payssam.kr/v1/students/{payssam_id}
{
  "name": updated_name,
  "phone": updated_phone,
  "class": updated_class
}
```

**정책**:
- ✅ 양방향 동기화
- ⚠️ 충돌 시 Supabase 우선
- ⚠️ 변경 이력 로그

---

### B. 청구서 관리

#### B1. 월 정기 청구서 발송 (자동)
**트리거**: Cron (매월 1일 00:00)

**Edge Function**: `monthly-billing-automation`
```typescript
// 1. Supabase에서 활성 학생 조회
const students = await supabase
  .from('profiles')
  .select('*, metadata')
  .eq('type', 'student')
  .eq('status', 'active');

// 2. 클래스별 월회비 계산
for (const student of students) {
  const classes = student.metadata.classes;
  const items = classes.map(c => ({
    name: `${c} 월회비`,
    amount: getPriceByClass(c),
    vat: 'exempt'  // 교육 서비스 면세
  }));

  // 3. 결제선생 청구서 생성
  const invoice = await payssam.createInvoice({
    student_id: student.metadata.payssam_id,
    name: student.name,
    phone: student.phone,
    items: items,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    due_date: getNextMonthFirstDay(),
    message: `[온리쌤] ${student.name}님, ${getCurrentMonth()} 월회비 안내드립니다.`
  });

  // 4. Supabase payments 테이블 생성
  await supabase.table('payments').insert({
    student_id: student.id,
    invoice_id: invoice.id,
    total_amount: invoice.total,
    payment_status: 'pending',
    invoice_date: new Date(),
    due_date: invoice.due_date,
    items: items
  });

  // 5. 카카오톡 알림 (다음 섹션)
  await sendKakaoNotification(student.phone, 'payment_notice', {
    name: student.name,
    amount: invoice.total,
    due_date: invoice.due_date,
    payment_link: invoice.payment_url
  });
}
```

**정책**:
- ✅ 매월 1일 00:00 자동 발송
- ✅ 클래스별 자동 금액 계산
- ✅ 카카오톡 동시 발송
- ⚠️ 휴원생 제외 (`status = 'active'`)
- ⚠️ 미납자 별도 처리 (독촉)

---

#### B2. 개별 청구서 발송 (수동)
**트리거**: 관리자 또는 코치가 웹/앱에서 직접 발송

**UI 위치**:
- 웹: `/students/[id]` → "청구서 발송" 버튼
- 앱: `ParentScreen` → "결제 요청" 버튼

**프로세스**:
```typescript
// API 엔드포인트
POST /api/invoices/create
{
  "student_id": "uuid",
  "items": [
    { "name": "개인레슨 10회", "amount": 500000 },
    { "name": "유니폼", "amount": 50000 }
  ],
  "message": "추가 청구 안내드립니다."
}

// 1. 결제선생 청구서 생성
// 2. Supabase payments 저장
// 3. 카카오톡 알림
```

**정책**:
- ✅ 즉시 발송
- ✅ 품목 자유 입력
- ✅ 발송 전 미리보기
- ⚠️ 중복 발송 방지 (같은 품목 30일 내)

---

#### B3. 청구서 예약 발송
**트리거**: 관리자가 예약 설정

**사용 케이스**:
- 특별 수업료 (방학 특강)
- 합숙 비용
- 대회 참가비

**프로세스**:
```typescript
// 1. Supabase에 예약 저장
await supabase.table('scheduled_invoices').insert({
  student_id: 'uuid',
  items: [...],
  scheduled_at: '2026-03-15 10:00:00',
  status: 'scheduled'
});

// 2. Cron이 scheduled_at 확인 (매 시간)
// 3. 시간 되면 자동 발송
```

**정책**:
- ✅ 최대 3개월 후까지 예약 가능
- ✅ 예약 취소 가능
- ⚠️ 발송 1일 전 확인 알림

---

### C. 결제 완료 처리 (Webhook)

#### C1. 결제선생 → Supabase 동기화
**Webhook URL**: `https://dcobyicibvhpwcjqkmgw.supabase.co/functions/v1/webhook-payssam`

**Edge Function**: `webhook-payssam`
```typescript
export default async (req: Request) => {
  const payload = await req.json();

  // 1. 검증 (서명 확인)
  if (!verifyPaymentSignature(payload)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Supabase 업데이트
  await supabase.table('payments').update({
    payment_status: 'completed',
    paid_amount: payload.amount,
    paid_at: payload.paid_at,
    payment_method: payload.method,  // 'card', 'naverpay', 'kakaopay'
    approval_number: payload.approval_no
  }).eq('invoice_id', payload.invoice_id);

  // 3. Event Ledger 기록
  await supabase.table('events').insert({
    event_type: 'payment_completed',
    entity_id: payload.student_id,
    entity_type: 'student',
    data: payload
  });

  // 4. V-Index 업데이트 (Motions +1)
  await updateVIndex(payload.student_id);

  // 5. 카카오톡 영수증 발송
  await sendKakaoNotification(payload.phone, 'payment_receipt', {
    name: payload.name,
    amount: payload.amount,
    date: payload.paid_at,
    method: getPaymentMethodName(payload.method)
  });

  return new Response('OK', { status: 200 });
};
```

**정책**:
- ✅ 실시간 동기화 (< 1초)
- ✅ Idempotency (중복 방지)
- ✅ 서명 검증 필수
- ⚠️ 실패 시 재시도 (5회)
- ⚠️ 실패 로그 Sentry

---

#### C2. 결제 취소 처리
**Webhook**: 동일한 엔드포인트, `event_type: 'payment_cancelled'`

**프로세스**:
```typescript
// 1. Supabase 상태 변경
await supabase.table('payments').update({
  payment_status: 'cancelled',
  cancelled_at: payload.cancelled_at,
  cancel_reason: payload.reason
}).eq('invoice_id', payload.invoice_id);

// 2. V-Index 롤백 (Threats +1)
await updateVIndex(payload.student_id, { threats: +1 });

// 3. 카카오톡 알림
await sendKakaoNotification(payload.phone, 'payment_cancelled', {
  name: payload.name,
  amount: payload.amount,
  reason: payload.reason
});
```

---

### D. 미납 관리

#### D1. 미납 독촉 (자동)
**트리거**: Cron (매일 10:00, 18:00)

**Edge Function**: `payment-reminder`
```typescript
// 1. 미납 청구서 조회
const overduePayments = await supabase
  .from('payments')
  .select('*, profiles(*)')
  .eq('payment_status', 'pending')
  .lt('due_date', new Date());

// 2. 독촉 단계 결정
for (const payment of overduePayments) {
  const overdueDays = getDaysSince(payment.due_date);

  let template: string;
  if (overdueDays === 1) template = 'payment_reminder_1day';
  else if (overdueDays === 3) template = 'payment_reminder_3day';
  else if (overdueDays === 7) template = 'payment_reminder_1week';
  else if (overdueDays % 7 === 0) template = 'payment_reminder_weekly';
  else continue;  // 다음 단계까지 대기

  // 3. 카카오톡 발송
  await sendKakaoNotification(payment.profiles.phone, template, {
    name: payment.profiles.name,
    amount: payment.total_amount,
    overdue_days: overdueDays,
    payment_link: getPaymentLink(payment.invoice_id)
  });

  // 4. 발송 로그
  await supabase.table('notification_logs').insert({
    payment_id: payment.id,
    type: 'payment_reminder',
    template: template,
    sent_at: new Date()
  });
}
```

**독촉 정책**:
- D+1: 첫 번째 알림 (부드러운 톤)
- D+3: 두 번째 알림 (정중한 톤)
- D+7: 세 번째 알림 (명확한 톤)
- D+14, D+21, D+28: 주 1회 알림
- D+30: 자동 파기 (결제선생 설정)

**톤 가이드**:
```
D+1: "혹시 잊으셨을까봐 안내드립니다 😊"
D+3: "결제 확인이 어려워 다시 한번 안내드립니다"
D+7: "아직 결제가 확인되지 않았습니다. 확인 부탁드립니다"
D+14+: "미납 시 서비스 이용에 제한이 있을 수 있습니다"
```

---

### E. 출결선생 연동

#### E1. 출석 체크 → 카카오톡 알림
**트리거**: 온리쌤 앱에서 출석 체크

**프로세스**:
```typescript
// 1. 출석 체크 (앱)
await supabase.table('bookings').update({
  status: 'completed',
  checked_in_at: new Date()
}).eq('id', booking_id);

// 2. Edge Function 트리거
// Edge Function: attendance-chain-reaction
const booking = await getBooking(booking_id);
const student = await getStudent(booking.student_id);

// 3. 결제선생 출결 동기화 (선택)
await payssam.recordAttendance({
  student_id: student.metadata.payssam_id,
  date: new Date(),
  status: 'present'
});

// 4. 카카오톡 알림 (학부모)
await sendKakaoNotification(student.phone, 'attendance_completed', {
  name: student.name,
  class: booking.class_name,
  time: booking.start_time,
  date: new Date()
});
```

**정책**:
- ✅ 출석 즉시 알림 (< 5초)
- ✅ 학부모에게만 발송
- ⚠️ 중복 방지 (같은 시간대)
- ⚠️ 결석 시에만 알림 (출석은 선택)

---

#### E2. 결석 알림 (자동)
**트리거**: Cron (수업 시작 10분 후)

**Edge Function**: `attendance-reminder`
```typescript
// 1. 현재 시간 기준 진행 중인 수업 조회
const ongoingClasses = await getOngoingSchedules();

// 2. 예약된 학생 중 미출석 확인
for (const schedule of ongoingClasses) {
  const bookings = await supabase
    .from('bookings')
    .select('*, profiles(*)')
    .eq('schedule_id', schedule.id)
    .eq('booking_date', today())
    .is('checked_in_at', null);

  // 3. 결석자에게 카카오톡 발송
  for (const booking of bookings) {
    await sendKakaoNotification(booking.profiles.phone, 'attendance_absent', {
      name: booking.profiles.name,
      class: schedule.program_name,
      time: schedule.start_time,
      coach: schedule.coach_name
    });

    // 4. 결석 상태 업데이트
    await supabase.table('bookings').update({
      status: 'no_show'
    }).eq('id', booking.id);

    // 5. V-Index 업데이트 (Threats +1)
    await updateVIndex(booking.student_id, { threats: +1 });
  }
}
```

**정책**:
- ✅ 수업 시작 10분 후 자동 발송
- ✅ 결석만 알림 (출석은 선택)
- ⚠️ 사전 결석 신고 시 제외
- ⚠️ 공휴일/휴원일 제외

---

### F. 매출 보고서 동기화

#### F1. 일일 매출 보고서
**트리거**: Cron (매일 23:50)

**Edge Function**: `daily-stats`
```typescript
// 1. 결제선생 API에서 당일 매출 조회
const report = await payssam.getDailyReport(today());

// 2. Supabase에 저장
await supabase.table('daily_reports').insert({
  date: today(),
  total_invoices: report.total_count,
  total_amount: report.total_amount,
  paid_amount: report.paid_amount,
  unpaid_amount: report.unpaid_amount,
  payment_rate: report.payment_rate,
  by_method: report.by_method,  // 결제수단별 집계
  by_card: report.by_card        // 카드사별 집계
});

// 3. 관리자에게 카카오톡 요약 발송
await sendKakaoNotification(ADMIN_PHONE, 'daily_report', {
  date: today(),
  total: report.total_amount,
  paid: report.paid_amount,
  rate: report.payment_rate
});
```

**정책**:
- ✅ 매일 23:50 자동 생성
- ✅ 관리자 카카오톡 요약
- ✅ 주간/월간 리포트 자동 생성
- ⚠️ 엑셀 다운로드 가능

---

## 💬 카카오톡 연동 정책

### A. 알림톡 템플릿

#### A1. 결제 관련 (5개)

**1. 청구서 발송** `payment_notice`
```
[온리쌤] {name}님, {month} 월회비 안내

안녕하세요, {name} 학부모님!
{month} 월회비를 안내드립니다.

💳 청구 내역
{items}

💰 총 금액: {amount}원
📅 납부 기한: {due_date}

아래 버튼을 눌러 편리하게 결제하세요.

[결제하기] → {payment_link}

문의: 010-xxxx-xxxx
```

**2. 결제 완료** `payment_receipt`
```
[온리쌤] 결제 완료 알림

{name}님, 결제가 완료되었습니다.

💰 결제 금액: {amount}원
💳 결제 수단: {method}
📅 결제 일시: {date}

감사합니다!

[영수증 보기] → {receipt_link}
```

**3. 미납 독촉 (단계별)**

**D+1** `payment_reminder_1day`
```
[온리쌤] 결제 안내

{name} 학부모님, 혹시 잊으셨을까봐 알려드립니다 😊

💰 미납 금액: {amount}원
📅 납부 기한: {due_date} (어제)

편하신 시간에 결제 부탁드립니다.

[결제하기] → {payment_link}
```

**D+7** `payment_reminder_1week`
```
[온리쌤] 결제 확인 요청

{name} 학부모님, 아직 결제가 확인되지 않았습니다.

💰 미납 금액: {amount}원
📅 경과일: {overdue_days}일

빠른 결제 부탁드립니다.

[결제하기] → {payment_link}

문의: 010-xxxx-xxxx
```

---

#### A2. 출결 관련 (3개)

**1. 출석 완료** `attendance_completed`
```
[온리쌤] 출석 확인

{name} 학생이 수업에 참여했습니다 🏐

📚 수업: {class}
🕐 시간: {time}
📅 날짜: {date}

오늘도 열심히 하고 있어요!
```

**2. 결석 알림** `attendance_absent`
```
[온리쌤] 결석 알림

{name} 학생이 오늘 수업에 참여하지 않았습니다.

📚 수업: {class}
🕐 시간: {time}
👨‍🏫 코치: {coach}

혹시 연락이 안 되셨나요?
문의: 010-xxxx-xxxx
```

**3. 출석률 요약 (월말)** `attendance_monthly`
```
[온리쌤] {month} 출석률 리포트

{name} 학생의 이번 달 출석 현황입니다.

✅ 출석: {present}회
❌ 결석: {absent}회
📊 출석률: {rate}%

{comment}

다음 달도 화이팅! 💪
```

---

#### A3. 일정 관련 (2개)

**1. 수업 시작 알림** `class_reminder`
```
[온리쌤] 오늘 수업 알림

{name} 학생, 오늘 수업 있어요! 🏐

📚 수업: {class}
🕐 시간: {time}
📍 장소: {location}
👨‍🏫 코치: {coach}

준비물 챙기고 오세요!
```

**2. 스케줄 변경** `schedule_changed`
```
[온리쌤] 일정 변경 안내

{name} 학부모님, 수업 일정이 변경되었습니다.

📚 수업: {class}
❌ 기존: {old_time}
✅ 변경: {new_time}
📅 날짜: {date}

참고 부탁드립니다!
```

---

#### A4. 상담/피드백 (2개)

**1. 상담 예약 확인** `consultation_confirmed`
```
[온리쌤] 상담 예약 완료

{name} 학부모님, 상담이 예약되었습니다.

📅 날짜: {date}
🕐 시간: {time}
👨‍🏫 상담자: {coach}
📍 장소: {location}

시간 맞춰 방문해주세요!

[일정 변경] → {reschedule_link}
```

**2. 성장 피드백** `growth_feedback`
```
[온리쌤] {name} 학생 성장 리포트

{name} 학생의 이번 주 활동입니다!

🏐 출석: {attendance}회
⭐ V-Index: {v_index} ({change})
💪 특이사항: {comment}

영상: {video_link}

계속 응원합니다! 🎉
```

---

### B. 채팅 (1:1 상담)

#### B1. 자동응답 메시지 (6개)

**키워드**: `수업`, `시간`, `시간표`
```
📚 수업 시간표

현재 운영 중인 클래스입니다:

• 선수반: 화목 19:00-21:00
• 실전반: 월수금 18:00-20:00
• 개인레슨: 예약제

자세한 내용은 아래 메뉴를 확인해주세요!

[#수업 안내]
```

**키워드**: `결제`, `수업료`, `비용`
```
💳 결제 안내

월회비는 매월 1일 카카오톡으로 안내드립니다.

• 결제 방법: 카드/간편결제
• 납부 기한: 매월 5일
• 문의: 010-xxxx-xxxx

[#결제하기] → 청구서 목록
```

**키워드**: `출석`, `결석`, `휴원`
```
📝 출결 안내

출석은 수업 시작 시 자동 체크됩니다.
결석 시에는 사전 연락 부탁드립니다.

• 연락처: 010-xxxx-xxxx
• 운영시간: 평일 09:00-22:00

[#출석 확인]
```

**키워드**: `등록`, `신청`, `입학`
```
🎓 등록 안내

온리쌤에 관심 가져주셔서 감사합니다!

신규 등록은 아래 링크에서 신청해주세요.
상담 후 수업 배정이 진행됩니다.

[신청하기] → {registration_link}
```

**키워드**: `위치`, `주소`, `오시는길`
```
📍 오시는 길

주소: 서울시 OO구 OO동 123-45
전화: 010-xxxx-xxxx

[지도 보기] → {map_link}

주차 가능 | 지하철 3번 출구 5분
```

**키워드**: `코치`, `강사`, `선생님`
```
👨‍🏫 코치 소개

• 김코치: 선수반 담당 (전 국가대표)
• 이코치: 실전반 담당 (지도자 자격증)
• 박코치: 개인레슨 (체대 출신)

[#코치 프로필]
```

---

#### B2. 채팅방 메뉴 (리스트 메뉴)

**메뉴 구조**:
```
1. 📚 수업 안내
   - 시간표
   - 수강료
   - 등록 신청

2. 💳 결제
   - 청구서 확인
   - 결제 내역
   - 미납 확인

3. 📝 출결
   - 출석 확인
   - 결석 신고
   - 출석률 조회

4. 🎥 영상
   - 최근 수업 영상
   - 성장 포트폴리오

5. 📞 상담
   - 상담 예약
   - 1:1 문의
```

**API 연동** (비즈니스 폼):
```typescript
// 메뉴 클릭 → Supabase 조회 → 카카오톡 전송
카카오톡 메뉴 "결제" 클릭
    ↓
GET /api/kakao/menu/payments?phone={phone}
    ↓
Supabase 조회: student by phone
    ↓
Supabase 조회: unpaid payments
    ↓
카카오톡 메시지 생성:
  "💳 {name}님의 결제 내역
   미납: {unpaid_count}건 ({unpaid_amount}원)
   [결제하기]"
```

---

### C. 웰컴 메시지

#### C1. 채널 추가 시 자동 발송
```
[온리쌤] 환영합니다! 🎉

안녕하세요! 온리쌤입니다.

채널을 추가해주셔서 감사합니다.
여기서 수업 안내, 결제, 출석 확인을 모두 하실 수 있어요!

🎁 지금 바로 체험 수업 쿠폰을 드립니다!

[쿠폰 받기] → {coupon_link}

궁금한 점은 언제든지 문의하세요 😊
```

---

### D. 비즈니스폼 (예약/신청)

#### D1. 상담 예약
**폼 URL**: `https://pf.kakao.com/_onlyssam/forms/consultation`

**필드**:
- 학생 이름
- 학부모 전화번호
- 희망 날짜 (캘린더)
- 희망 시간 (드롭다운)
- 상담 내용 (선택)
  - 신규 등록 문의
  - 클래스 변경
  - 기타

**제출 → Supabase 저장**:
```typescript
// Webhook: webhook-kakao-form
export default async (req: Request) => {
  const form = await req.json();

  // Supabase에 상담 예약 저장
  await supabase.table('consultations').insert({
    student_name: form.student_name,
    parent_phone: form.parent_phone,
    requested_date: form.requested_date,
    requested_time: form.requested_time,
    consultation_type: form.consultation_type,
    status: 'pending'
  });

  // 관리자에게 카카오톡 알림
  await sendKakaoNotification(ADMIN_PHONE, 'consultation_request', {
    name: form.student_name,
    phone: form.parent_phone,
    date: form.requested_date,
    time: form.requested_time
  });

  return new Response('OK');
};
```

---

#### D2. 결석 신고
**폼 URL**: `https://pf.kakao.com/_onlyssam/forms/absence`

**필드**:
- 학생 이름
- 전화번호 (자동 입력)
- 결석 날짜
- 사유 (선택)

**제출 → Supabase 업데이트**:
```typescript
// 1. 예약된 booking 조회
const booking = await supabase
  .from('bookings')
  .select('*')
  .eq('student_name', form.student_name)
  .eq('booking_date', form.absence_date)
  .single();

// 2. 상태 변경
await supabase.table('bookings').update({
  status: 'cancelled',
  cancel_reason: form.reason
}).eq('id', booking.id);

// 3. 코치에게 알림
await sendKakaoNotification(COACH_PHONE, 'absence_notification', {
  student: form.student_name,
  date: form.absence_date,
  reason: form.reason
});
```

---

### E. 챗봇 (고급 기능)

#### E1. 자연어 상담 (AI)
**Kanana 상담매니저** 활용 (beta)

**시나리오**:
```
학부모: "이번 달 수업료가 얼마예요?"
    ↓
챗봇: Supabase 조회 → 금액 확인
    ↓
챗봇: "{name}님의 이번 달 청구 금액은 {amount}원입니다."
```

**구현**:
```typescript
// Webhook: webhook-kakao-chat
export default async (req: Request) => {
  const message = await req.json();

  // 1. 의도 분석 (LLM or 키워드)
  const intent = await analyzeIntent(message.text);

  if (intent === 'payment_inquiry') {
    // 2. Supabase 조회
    const student = await getStudentByPhone(message.user_phone);
    const payment = await getLatestPayment(student.id);

    // 3. 응답 생성
    return {
      text: `${student.name}님의 이번 달 청구 금액은 ${payment.total_amount}원입니다.`,
      buttons: [
        { label: '결제하기', link: payment.payment_url }
      ]
    };
  }

  // 기타: 상담원 연결
  return { text: '잠시만 기다려주세요. 상담원이 곧 연결됩니다.' };
};
```

---

## 🔄 통합 시나리오 (End-to-End)

### 시나리오 1: 신규 학생 등록

```
1. 웹/앱에서 학생 등록
   ↓
2. Supabase profiles INSERT
   ↓
3. Trigger: sync-student-to-payssam
   ↓
4. 결제선생 학생 등록 API 호출
   ↓
5. payssam_id 저장
   ↓
6. 카카오톡 웰컴 메시지 (채널 추가 유도)
```

---

### 시나리오 2: 월 정기 청구 (매월 1일)

```
Cron 00:00
   ↓
Edge Function: monthly-billing-automation
   ↓
1. Supabase 활성 학생 조회 (780명)
   ↓
2. 클래스별 금액 계산
   ↓
3. 결제선생 청구서 생성 API (배치)
   ↓
4. Supabase payments INSERT
   ↓
5. 카카오톡 알림 발송 (배치)
   ↓
완료: 780개 청구서 발송 (약 2분)
```

---

### 시나리오 3: 결제 완료 → 영수증

```
학부모: 카카오톡 링크 클릭 → 카드 결제
   ↓
결제선생: 결제 승인
   ↓
Webhook → Supabase Edge Function
   ↓
1. payments 테이블 UPDATE (status='completed')
   ↓
2. events INSERT (payment_completed)
   ↓
3. V-Index 업데이트 (Motions +1)
   ↓
4. 카카오톡 영수증 발송
   ↓
학부모: 영수증 수신 (결제 5초 후)
```

---

### 시나리오 4: 출석 체크 → 학부모 알림

```
코치: 온리쌤 앱에서 출석 체크
   ↓
Supabase bookings UPDATE
   ↓
Trigger: attendance-chain-reaction
   ↓
1. 결제선생 출석 기록 (선택)
   ↓
2. events INSERT (attendance_checked)
   ↓
3. V-Index 업데이트 (Motions +1)
   ↓
4. 카카오톡 알림 발송 (학부모)
   ↓
학부모: 출석 알림 수신 (5초 이내)
```

---

### 시나리오 5: 미납 독촉 (D+7)

```
Cron 10:00 (매일)
   ↓
Edge Function: payment-reminder
   ↓
1. Supabase 미납 조회
   ↓
2. 경과일 계산 (D+7 필터)
   ↓
3. 카카오톡 독촉 발송 (단계별 템플릿)
   ↓
4. notification_logs INSERT
   ↓
학부모: 독촉 알림 수신
```

---

## 📊 모니터링 & 로깅

### A. Webhook 로그
```typescript
// 모든 Webhook 응답 로그
await supabase.table('webhook_logs').insert({
  source: 'payssam',
  event_type: payload.event_type,
  payload: payload,
  status: 'success',
  processed_at: new Date()
});
```

### B. 카카오톡 발송 로그
```typescript
await supabase.table('notification_logs').insert({
  recipient_phone: phone,
  template: template_id,
  type: 'kakao_alimtalk',
  status: 'sent',
  sent_at: new Date()
});
```

### C. 결제선생 API 로그
```typescript
await supabase.table('api_logs').insert({
  service: 'payssam',
  endpoint: '/v1/invoices',
  method: 'POST',
  request: request_body,
  response: response_body,
  status_code: 201,
  duration_ms: 350
});
```

---

## 🔒 보안 정책

### A. API 키 관리
- ✅ 환경 변수로만 관리
- ✅ Git에 절대 커밋 금지
- ✅ 3개월마다 로테이션
- ⚠️ Webhook 서명 검증 필수

### B. Webhook 보안
```typescript
// HMAC 서명 검증
function verifyPaymentSignature(payload: any, signature: string): boolean {
  const secret = process.env.PAYSSAM_WEBHOOK_SECRET;
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return calculated === signature;
}
```

### C. Rate Limiting
- 결제선생 API: 초당 10건
- 카카오톡 API: 초당 5건
- Webhook: 초당 100건

---

## 🎯 Success Metrics

### 자동화 비율
- ✅ 청구서 발송 자동화: 100%
- ✅ 결제 완료 처리: 100% (< 1초)
- ✅ 카카오톡 알림: 100% (< 5초)
- ✅ 미납 독촉: 100% (단계별)

### 응답 시간
- Webhook 처리: < 500ms
- 카카오톡 발송: < 3초
- API 호출: < 200ms

### 에러율
- Webhook 실패율: < 0.1%
- 카카오톡 발송 실패율: < 0.5%
- API 호출 실패율: < 1%

---

**프로젝트**: AUTUS + 온리쌤
**연동**: 결제선생 + 카카오톡 + Supabase
**버전**: 1.0
**최종 업데이트**: 2026-02-14
