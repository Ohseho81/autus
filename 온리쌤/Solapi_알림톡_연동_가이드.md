# Solapi 알림톡 연동 가이드

## ✅ 개발 완료 항목

### 1. 파일 생성
- ✅ `src/config/solapiConfig.ts` - Solapi 설정
- ✅ `src/types/alimtalk.ts` - 알림톡 타입 정의
- ✅ `src/services/alimtalkService.ts` - 알림톡 발송 서비스 (12가지 템플릿)
- ✅ `src/screens/v2/CoachHomeScreen.tsx` - 출석 체크 시 자동 알림 발송
- ✅ `.env.example` - 환경 변수 가이드 업데이트
- ✅ `package.json` - axios 의존성 추가

### 2. 구현 기능
- ✅ 12가지 알림 템플릿 지원
  - 출석 관련 (3): 출석확인, 결석, 지각
  - 결제 관련 (3): 결제요청, 결제완료, 미납
  - 스케줄 관련 (3): 수업리마인드, 스케줄변경, 휴원공지
  - 피드백 관련 (3): 수업결과, 성취축하, 상담요청
- ✅ 출석 체크 시 자동 알림 발송
- ✅ SMS 자동 대체 발송 (알림톡 실패 시)
- ✅ Event Ledger 자동 기록
- ✅ 개발 모드 지원 (실제 발송 없이 로그만 출력)
- ✅ 에러 핸들링 및 재시도 로직

---

## 🚀 설치 및 설정 (30분)

### Step 1: 의존성 설치 (1분)

```bash
cd /sessions/modest-bold-einstein/mnt/autus/온리쌤
npm install
```

### Step 2: Solapi 계정 생성 (5분)

1. [Solapi 웹사이트](https://solapi.com) 방문
2. 회원가입 (무료 크레딧 5,000원 지급)
3. 로그인

### Step 3: API Key 발급 (2분)

1. Solapi 대시보드 접속
2. **API Key 관리** 메뉴 클릭
3. **새 API Key 생성** 클릭
4. **API Key**와 **API Secret** 복사 (안전한 곳에 보관)

### Step 4: 발신번호 등록 (3분)

1. 대시보드 → **발신번호 관리**
2. **발신번호 추가** 클릭
3. 학원 전화번호 입력 (예: 01012345678)
4. 인증 절차 완료 (SMS 인증)

### Step 5: 카카오 비즈니스 채널 개설 (10분)

1. [카카오 비즈니스](https://business.kakao.com) 접속
2. **채널 개설하기** 클릭
3. 채널 정보 입력:
   - 채널명: 학원명 (예: ATB 배구아카데미)
   - 카테고리: 교육 > 체육/레저
   - 프로필 이미지 업로드
4. 채널 개설 완료

### Step 6: Solapi에 카카오 채널 연동 (5분)

1. Solapi 대시보드 → **카카오 채널 연동**
2. **채널 추가** 클릭
3. 카카오 채널 정보 입력:
   - 채널 ID (PFID) 입력
   - 카카오 비즈니스에서 확인 가능
4. 연동 완료

### Step 7: 환경 변수 설정 (2분)

`.env` 파일 생성 (`.env.example` 복사):

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
# Solapi 설정
SOLAPI_API_KEY=your_actual_api_key_here
SOLAPI_API_SECRET=your_actual_api_secret_here
KAKAO_PFID=your_kakao_channel_id_here
SENDER_PHONE=01012345678

# 기존 Supabase 설정은 그대로 유지
EXPO_PUBLIC_SUPABASE_URL=https://dcobyicibvhpwcjqkmgw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 8: 알림톡 템플릿 등록 (30분)

#### 템플릿 1: ATTENDANCE_CONFIRM (출석 확인)
```
{name}님, 오늘 {class_name} 출석 완료! 👏
- 출석 시간: {time}
- 누적 출석: {attendance_count}회
```

#### 템플릿 2: ABSENCE_NOTICE (결석 알림)
```
{name}님, 오늘 {class_name}에 결석하셨습니다.
- 보강 수업 신청: {makeup_link}
```
**버튼**: [보강 수업 신청] → {makeup_link}

#### 템플릿 3: LATE_NOTICE (지각 알림)
```
{name}님, 오늘 {class_name}에 지각하셨습니다.
- 도착 시간: {time}
```

#### 템플릿 4: PAYMENT_REQUEST (결제 요청)
```
{name} 학부모님, {month}월 수강료 {amount}원 결제 요청드립니다.
- 납부 기한: {due_date}
- 결제 링크: {payment_link}
```
**버튼**: [결제하기] → {payment_link}

#### 템플릿 5: PAYMENT_COMPLETE (결제 완료)
```
{amount}원 결제가 완료되었습니다. 감사합니다! 🙏
- 영수증: {receipt_link}
```
**버튼**: [영수증 보기] → {receipt_link}

#### 템플릿 6: PAYMENT_OVERDUE (미납 알림)
```
{name} 학부모님, {month}월 수강료가 아직 미납입니다.
- 납부 기한: {due_date} (D-{days})
```

#### 템플릿 7: CLASS_REMINDER (수업 리마인드)
```
내일 {class_name} 수업이 있습니다! 📚
- 시간: {time}
- 장소: {location}
```

#### 템플릿 8: SCHEDULE_CHANGE (스케줄 변경)
```
{class_name} 수업 시간이 변경되었습니다.
- 변경 전: {old_time}
- 변경 후: {new_time}
```

#### 템플릿 9: CLOSURE_NOTICE (휴원 공지)
```
{date}은 {reason}으로 휴원합니다.
- 보강 일정: {makeup_date}
```

#### 템플릿 10: CLASS_RESULT (수업 결과)
```
{name}님, 오늘 {class_name} 수업 결과입니다.
- 평가: {feedback}
- 영상: {video_link}
```
**버튼**: [영상 보기] → {video_link}

#### 템플릿 11: ACHIEVEMENT (성취 축하)
```
축하합니다! 🎉 {name}님이 {achievement}를 달성했습니다!
- 날짜: {date}
```

#### 템플릿 12: CONSULTATION_REQUEST (상담 요청)
```
{name} 학부모님, {coach_name} 코치가 상담을 요청했습니다.
- 연락처: {phone}
```

**템플릿 등록 절차:**
1. Solapi 대시보드 → **템플릿 관리**
2. **새 템플릿** 클릭
3. 템플릿 코드 입력 (예: `ATTENDANCE_CONFIRM`)
4. 템플릿 내용 입력 (위 예시 참고)
5. 버튼 설정 (필요 시)
6. **검수 신청** 클릭
7. 검수 승인 대기 (통상 1~3일 소요)

---

## 🧪 테스트

### 1. 개발 모드 테스트 (실제 발송 X)

```bash
# .env 파일에서 NODE_ENV 설정
NODE_ENV=development

# 앱 실행
npm start
```

**결과**: 알림톡이 실제로 발송되지 않고 콘솔에만 로그 출력

### 2. 출석 체크 테스트

1. 온리쌤 앱 실행
2. 코치 계정으로 로그인
3. **CoachHomeScreen**으로 이동
4. 학생 출석 체크 (PRESENT / ABSENT / LATE)
5. 콘솔 확인:
```
[AlimtalkService] DEV MODE - Message not sent: {
  to: '01012345678',
  templateId: 'ATTENDANCE_CONFIRM',
  variables: { name: '김민준', class_name: '선수반', time: '14:30', attendance_count: 15 }
}
```

### 3. 실제 발송 테스트 (검수 승인 후)

```bash
# .env 파일에서 NODE_ENV 제거 또는 production 설정
# NODE_ENV=production

# 앱 재실행
npm start
```

**결과**: 실제 알림톡 발송 → 학부모 핸드폰으로 알림 수신

---

## 📊 모니터링

### 1. Solapi 대시보드

- **발송 현황**: 실시간 발송 통계
- **성공/실패**: 발송 성공률
- **비용**: 월별 사용 요금

### 2. Event Ledger 확인

Supabase에서 알림 발송 기록 확인:

```sql
SELECT
  created_at,
  entity_id,
  metadata->>'type' as notification_type,
  metadata->>'template' as template_id,
  metadata->>'success' as success,
  metadata->>'message_id' as message_id
FROM event_ledger
WHERE event_type = 'notification_sent'
ORDER BY created_at DESC
LIMIT 50;
```

### 3. Sentry 에러 모니터링

알림 발송 실패 시 Sentry에 자동 기록

---

## 💰 비용 계산

### 예상 발송량 (학생 780명 기준)

| 알림 종류 | 월 발송량 | 단가 | 월 비용 |
|----------|----------|------|---------|
| 출석 확인 | 2,400건 | 9원 | 21,600원 |
| 결제 요청 | 800건 | 9원 | 7,200원 |
| 수업 리마인드 | 600건 | 9원 | 5,400원 |
| 기타 | 200건 | 9원 | 1,800원 |
| **합계** | **4,000건** | | **36,000원** |

**SMS 대체 발송** (5% 실패율):
- 200건 × 20원 = 4,000원

**총 예상 비용**: 40,000원/월

---

## 🔧 추가 기능 구현

### 1. 결제 완료 시 알림 발송

```typescript
// src/services/paymentService.ts
import { alimtalkService } from './alimtalkService';

async function handlePaymentComplete(student: Student, invoice: Invoice) {
  // 결제 처리
  await processPayment(invoice);

  // 알림 발송
  await alimtalkService.sendPaymentComplete(student.id, student.phone, {
    amount: invoice.amount.toLocaleString(),
    receipt_link: invoice.receipt_url,
  });
}
```

### 2. 스케줄 변경 시 일괄 알림

```typescript
// src/services/scheduleService.ts
import { alimtalkService } from './alimtalkService';

async function notifyScheduleChange(
  students: Student[],
  oldTime: string,
  newTime: string,
  className: string
) {
  for (const student of students) {
    await alimtalkService.sendScheduleChange(student.id, student.phone, {
      class_name: className,
      old_time: oldTime,
      new_time: newTime,
    });
  }
}
```

### 3. 수업 전날 리마인드 (Cron Job)

```typescript
// Supabase Edge Function: send-class-reminders
import { alimtalkService } from './alimtalkService';

export async function sendClassReminders() {
  // 내일 수업 조회
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const classes = await getClassesForDate(tomorrow);

  for (const classItem of classes) {
    const students = await getStudentsForClass(classItem.id);

    for (const student of students) {
      await alimtalkService.sendClassReminder(student.id, student.phone, {
        class_name: classItem.name,
        time: classItem.time,
        location: classItem.location,
      });
    }
  }
}

// Cron: 매일 저녁 8시 실행
// 0 20 * * *
```

---

## 🐛 트러블슈팅

### 문제 1: "Configuration missing" 에러

**원인**: 환경 변수가 설정되지 않음

**해결**:
```bash
# .env 파일 확인
cat .env

# 필수 변수 확인
# SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PFID, SENDER_PHONE
```

### 문제 2: 알림톡 발송 실패 (statusCode 4xxx)

**원인**: 템플릿 검수 미승인 또는 템플릿 ID 불일치

**해결**:
1. Solapi 대시보드에서 템플릿 검수 상태 확인
2. 템플릿 ID가 코드의 `AlimtalkTemplateId`와 일치하는지 확인

### 문제 3: SMS로만 발송됨

**원인**: 알림톡 발송 실패 → SMS 자동 대체

**해결**:
1. 카카오 채널 연동 상태 확인
2. KAKAO_PFID가 올바른지 확인
3. 템플릿 검수 승인 여부 확인

### 문제 4: 전화번호 형식 오류

**원인**: 전화번호에 하이픈(-) 포함

**해결**:
- `normalizePhoneNumber()` 함수가 자동으로 처리하지만, DB에 저장된 전화번호 형식 확인
- 예: `010-1234-5678` → `01012345678`

---

## 📚 참고 자료

- [Solapi 공식 문서](https://docs.solapi.com)
- [Solapi API Reference](https://docs.solapi.com/api-reference)
- [카카오 비즈니스 가이드](https://business.kakao.com/info/alimtalk/)
- [온리쌤 Event Ledger 가이드](./AUTUS_엔진_적용_완료.md)

---

## ✅ 체크리스트

### 설치 및 설정
- [ ] Solapi 계정 생성
- [ ] API Key 발급
- [ ] 발신번호 등록
- [ ] 카카오 채널 개설
- [ ] 카카오 채널 연동
- [ ] 환경 변수 설정
- [ ] 의존성 설치 (`npm install`)

### 템플릿 등록
- [ ] ATTENDANCE_CONFIRM
- [ ] ABSENCE_NOTICE
- [ ] LATE_NOTICE
- [ ] PAYMENT_REQUEST
- [ ] PAYMENT_COMPLETE
- [ ] PAYMENT_OVERDUE
- [ ] CLASS_REMINDER
- [ ] SCHEDULE_CHANGE
- [ ] CLOSURE_NOTICE
- [ ] CLASS_RESULT
- [ ] ACHIEVEMENT
- [ ] CONSULTATION_REQUEST

### 테스트
- [ ] 개발 모드 테스트 (로그 확인)
- [ ] 출석 체크 시 알림 발송 테스트
- [ ] 실제 알림톡 수신 확인
- [ ] Event Ledger 기록 확인
- [ ] SMS 대체 발송 확인

---

## 🎉 완료!

이제 온리쌤 앱에서 출석 체크 시 자동으로 알림톡이 발송됩니다!

**다음 단계**: 결제, 스케줄 변경 등 다른 이벤트에도 알림톡 적용하기
