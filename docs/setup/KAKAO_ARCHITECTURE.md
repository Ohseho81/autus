# 온리쌤 카카오톡 비즈니스 통합 아키텍처

**버전**: 1.0
**작성일**: 2026-02-14
**목표**: 학원 운영 자동화를 위한 카카오 생태계 완전 통합

---

## 📋 목차

1. [전략적 방향](#전략적-방향)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [카카오 기능 맵](#카카오-기능-맵)
4. [기술 스택 선택](#기술-스택-선택)
5. [데이터 플로우](#데이터-플로우)
6. [이벤트 트리거 설계](#이벤트-트리거-설계)
7. [구현 로드맵](#구현-로드맵)
8. [비용 산정](#비용-산정)

---

## 🎯 전략적 방향

### 핵심 원칙

```
❌ 카카오를 "앱처럼" 사용 → 실패
✅ 카카오를 "운영 인프라"로 활용 → 독점
```

**온리쌤의 역할**: 물리 세계의 트리거 생성 (출석, 사고, 결제)
**카카오의 역할**: 도달 채널 (알림, 인증, 결제)

### 전략 맵

```
온리쌤 Core OS (판단 엔진)
        ↓
이벤트 발생 (출석/결석/결제/사고)
        ↓
카카오 API Layer (전달 채널)
        ↓
학부모/학생 도달 (앱 설치 불필요)
```

---

## 🏗️ 시스템 아키텍처

### 전체 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                    온리쌤 운영 시스템                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Next.js UI   │  │ FastAPI      │  │ Supabase     │      │
│  │ (관리자/강사) │  │ (비즈니스    │  │ (PostgreSQL) │      │
│  │              │  │  로직)       │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                  ┌─────────▼─────────┐                       │
│                  │  Event Engine     │                       │
│                  │  (트리거 감지)     │                       │
│                  └─────────┬─────────┘                       │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │     카카오 통합 레이어                 │
         ├───────────────────────────────────────┤
         │                                       │
         │  ┌─────────┐  ┌─────────┐           │
         │  │ Solapi  │  │ n8n/    │           │
         │  │ (메시지)│  │ Make    │           │
         │  └────┬────┘  └────┬────┘           │
         │       │            │                 │
         │       └─────┬──────┘                 │
         │             ▼                        │
         │  ┌──────────────────────┐           │
         │  │  카카오 비즈니스     │           │
         │  ├──────────────────────┤           │
         │  │ • 알림톡            │           │
         │  │ • 친구톡            │           │
         │  │ • 카카오 로그인     │           │
         │  │ • 카카오페이        │           │
         │  │ • 1:1 채팅          │           │
         │  └──────────────────────┘           │
         └───────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  학부모 / 학생            │
              │  (카카오톡 수신)          │
              └──────────────────────────┘
```

### 레이어 구조

| 레이어 | 역할 | 기술 |
|--------|------|------|
| **L1: 데이터** | 학생/수업/결제 저장 | Supabase (PostgreSQL) |
| **L2: 비즈니스** | 로직 처리 | FastAPI |
| **L3: 이벤트** | 트리거 감지 | Supabase Triggers / Edge Functions |
| **L4: 메시지** | 발송 관리 | Solapi + n8n |
| **L5: 전달** | 최종 도달 | 카카오톡 |

---

## 🔧 카카오 기능 맵

### 1️⃣ 필수 6대 기능 (MVP)

#### 1. 알림톡 (정보성 강제 도달)

**목적**: 학부모 앱 설치 없이 중요 정보 전달

**사용 케이스**:
- ✅ 출석 체크 완료 → "오선우 학생이 16:00에 출석했습니다"
- ✅ 결석 즉시 알림 → "오선우 학생이 16:00 수업에 결석했습니다"
- ✅ 수업 결과 자동 전송 → "오늘 수업 결과: 스파이크 연습..."
- ✅ 결제 완료 → "3월 수강료 200,000원 결제 완료"
- ✅ 사고 보고 → "오선우 학생 부상 발생, 즉시 연락 요망"
- ✅ 스케줄 변경 → "3/15(금) 수업 시간 변경: 16:00 → 17:00"

**특징**:
- 친구 추가 불필요
- 템플릿 사전 승인 필수
- 도달률 95%+
- 비용: 건당 8~12원

**온리쌤 연동**:
```sql
-- Supabase Trigger 예시
CREATE TRIGGER notify_attendance_checked
AFTER INSERT ON class_logs
FOR EACH ROW
EXECUTE FUNCTION send_alimtalk_attendance();
```

---

#### 2. 친구톡 (마케팅/리텐션)

**목적**: 채널 친구 대상 자유 형식 발송

**사용 케이스**:
- 📢 신규반 모집 안내
- 🎉 방학 특강 이벤트
- 🏆 대회 참가 독려
- 💡 학원 운영 소식

**특징**:
- 채널 친구 추가 필수
- 템플릿 승인 불필요
- 이미지/버튼 첨부 가능
- 비용: 건당 4~6원

**온리쌤 연동**:
```python
# 친구톡 발송 예시
send_friendtalk(
    to="010-2048-6048",
    channel_id="@onlyssam",
    message="🏐 방학특강 모집! 3/1~3/7, 조기마감 예상",
    buttons=[{"name": "신청하기", "url": "https://payssam.kr/special"}]
)
```

---

#### 3. 카카오 로그인 (간편 인증)

**목적**: 자체 회원가입 UX 제거

**사용 케이스**:
- 학부모 계정 생성 (카카오 1초 인증)
- 학생-부모 자동 연결
- 관리자/강사 권한 분리

**온리쌤 연동**:
```javascript
// Next.js 로그인
const handleKakaoLogin = async () => {
  const kakao = await kakaoLogin();
  const user = {
    kakao_id: kakao.id,
    name: kakao.name,
    phone: kakao.phone_number,
    role: 'parent'
  };
  await createUser(user);
};
```

---

#### 4. 카카오페이 결제

**목적**: 수강료 자동 수납

**사용 케이스**:
- 월 수강료 결제
- 자유이용권 자동결제 (정기결제)
- 추가 수업 결제

**플로우**:
```
결제 요청 → 카카오페이 → 결제 완료
    ↓
Supabase payments 업데이트
    ↓
알림톡 자동 발송 ("결제 완료")
    ↓
출석권 활성화
```

**온리쌤 연동**:
```python
# FastAPI 결제 API
@app.post("/payments/kakaopay")
async def create_kakaopay_payment(student_id, amount):
    payment = await kakaopay.ready(
        partner_order_id=f"ONLY-{student_id}",
        item_name="3월 수강료",
        total_amount=amount
    )
    return {"redirect_url": payment.next_redirect_pc_url}
```

---

#### 5. 카카오 채널 1:1 상담 API

**목적**: 상담 자동화

**사용 케이스**:
- 신규 상담 예약
- 자동응답 챗봇
- 수업 문의 분기

**플로우**:
```
학부모 → "상담 신청" 메시지
    ↓
챗봇 자동 응답 → "희망 시간대를 선택해주세요"
    ↓
선택 → Supabase에 상담 예약 저장
    ↓
관리자에게 알림
```

---

#### 6. 카카오톡 공유 (Proof Pack 공유)

**목적**: 학생 활동 기록 공유

**사용 케이스**:
- 📊 월간 성장 리포트 공유
- 📹 대회 영상 공유
- 🏆 수상 내역 공유

**온리쌤 연동**:
```javascript
// 카카오톡 공유하기
Kakao.Link.sendDefault({
  objectType: 'feed',
  content: {
    title: '오선우 학생 2월 성장 리포트',
    description: '출석률 95%, 스파이크 성공률 향상 +20%',
    imageUrl: 'https://payssam.kr/reports/202602_oseonwoo.png',
    link: {
      webUrl: 'https://payssam.kr/reports/202602_oseonwoo'
    }
  }
});
```

---

### 2️⃣ 선택적 고급 기능 (향후 확장)

| 기능 | 목적 | 우선순위 |
|------|------|----------|
| 챗봇 시나리오 | FAQ 자동응답 | P1 |
| 카카오싱크 | 개인정보 수집 동의 자동화 | P2 |
| 비즈메시지 CRM | 세그먼트 발송 | P1 |
| 카카오 모먼트 | 광고 리타겟팅 | P3 |

---

## 🛠️ 기술 스택 선택

### 메시지 발송 방법 비교

| 방법 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| **Solapi + n8n** | 시각적 워크플로우, 배치 처리 쉬움 | 복잡한 인증, n8n 서버 필요 | ⭐⭐⭐⭐ |
| **Solapi + FastAPI** | 완전 제어, 속도 빠름 | 코드 직접 작성 필요 | ⭐⭐⭐⭐⭐ |
| **Make (Integromat)** | Solapi 모듈 내장, 쉬움 | 유료 ($9/월~) | ⭐⭐⭐ |

### 온리쌤 선택: **Solapi + FastAPI 직접 연동** (추천)

**이유**:
1. 이미 FastAPI 백엔드 구조 예정
2. n8n 서버 별도 운영 부담
3. 완전한 제어와 확장성
4. 비용 절감 (n8n 클라우드 유료)

---

## 🔄 데이터 플로우

### 1. 출석 체크 플로우

```
강사가 QR 스캔 또는 수동 체크
        ↓
[FastAPI] POST /attendance/check
        ↓
[Supabase] class_logs INSERT
        ↓
[Trigger] notify_attendance_checked()
        ↓
[FastAPI] send_alimtalk()
        ↓
[Solapi] API 호출
        ↓
[카카오톡] 학부모 수신
        ↓
[Supabase] notifications 기록
```

**코드 예시**:
```python
# FastAPI
@app.post("/attendance/check")
async def check_attendance(student_id: str):
    # 1. 출석 기록
    log = await db.table('class_logs').insert({
        'student_id': student_id,
        'class_date': today(),
        'attendance_status': 'present',
        'checked_at': now()
    }).execute()

    # 2. 학생 정보 조회
    student = await db.table('atb_students').select('*').eq('id', student_id).single().execute()

    # 3. 알림톡 발송
    await send_alimtalk(
        to=student.data['parent_phone'],
        template_code='attendance_checked',
        variables={
            'student_name': student.data['name'],
            'check_time': now().strftime('%H:%M')
        }
    )

    return {"status": "success"}
```

---

### 2. 결제 완료 플로우

```
학부모 → 카카오페이 결제
        ↓
[카카오페이] 결제 승인 웹훅
        ↓
[FastAPI] POST /webhooks/kakaopay
        ↓
[Supabase] payments UPDATE (paid_amount)
        ↓
[FastAPI] send_alimtalk() "결제 완료"
        ↓
[Supabase] memberships UPDATE (출석권 활성화)
```

---

### 3. 결석 자동 감지 플로우

```
[Supabase Edge Function] 매시간 10분 실행
        ↓
schedules 조회 (현재 시간 수업)
        ↓
class_logs 조회 (출석 체크 여부)
        ↓
미체크 학생 발견
        ↓
[FastAPI] send_alimtalk() "결석 알림"
        ↓
[Supabase] class_logs INSERT (attendance_status='absent')
```

---

## ⚡ 이벤트 트리거 설계

### Supabase Triggers

#### 1. 출석 체크 시 알림

```sql
CREATE OR REPLACE FUNCTION notify_attendance_checked()
RETURNS TRIGGER AS $$
BEGIN
  -- FastAPI 웹훅 호출
  PERFORM net.http_post(
    url := 'https://api.payssam.kr/webhooks/attendance',
    body := json_build_object(
      'student_id', NEW.student_id,
      'class_date', NEW.class_date,
      'attendance_status', NEW.attendance_status
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_checked_trigger
AFTER INSERT ON class_logs
FOR EACH ROW
EXECUTE FUNCTION notify_attendance_checked();
```

---

#### 2. 결제 완료 시 알림

```sql
CREATE OR REPLACE FUNCTION notify_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount THEN
    PERFORM net.http_post(
      url := 'https://api.payssam.kr/webhooks/payment',
      body := json_build_object(
        'student_id', NEW.student_id,
        'amount', NEW.paid_amount,
        'payment_date', NEW.payment_date
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_completed_trigger
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_payment_completed();
```

---

### Supabase Edge Functions (Deno)

#### 결석 자동 감지

```typescript
// supabase/functions/check-absence/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 현재 시간 수업 조회
  const now = new Date()
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, membership:memberships(*)')
    .eq('day_of_week', now.getDay())
    .lte('start_time', now.toTimeString())
    .gte('end_time', now.toTimeString())

  // 출석 체크 여부 확인
  for (const schedule of schedules) {
    const { data: log } = await supabase
      .from('class_logs')
      .select('*')
      .eq('student_id', schedule.membership.student_id)
      .eq('class_date', now.toISOString().split('T')[0])
      .single()

    if (!log) {
      // 결석 알림 발송
      await fetch('https://api.payssam.kr/webhooks/absence', {
        method: 'POST',
        body: JSON.stringify({
          student_id: schedule.membership.student_id,
          class_date: now.toISOString().split('T')[0]
        })
      })
    }
  }

  return new Response('OK')
})
```

**Cron 설정**:
```
0 10,16,18,20 * * * (매일 10시, 16시, 18시, 20시 10분에 실행)
```

---

## 📱 알림톡 템플릿 설계

### 템플릿 1: 출석 체크

**템플릿 코드**: `attendance_checked`

```
📚 출석 확인

#{student_name} 학생이 #{check_time}에 출석했습니다.

오늘도 화이팅! 🏐

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678
```

**변수**:
- `#{student_name}`: 학생 이름
- `#{check_time}`: 체크 시간

---

### 템플릿 2: 결석 알림

**템플릿 코드**: `absence_alert`

```
⚠️ 결석 알림

#{student_name} 학생이 #{class_time} 수업에 결석했습니다.

혹시 사정이 있으신가요?
연락 부탁드립니다.

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678
```

---

### 템플릿 3: 수업 결과 전송

**템플릿 코드**: `class_result`

```
📊 오늘의 수업 결과

학생: #{student_name}
날짜: #{class_date}
출석: #{attendance_emoji}

💬 코치 코멘트:
#{coach_comment}

성장하는 모습이 보입니다! 👏

────────────────
온리쌤 배구아카데미
```

**변수**:
- `#{student_name}`: 학생 이름
- `#{class_date}`: 수업 날짜
- `#{attendance_emoji}`: ✅ 또는 ⏰
- `#{coach_comment}`: 코치 코멘트

---

### 템플릿 4: 결제 완료

**템플릿 코드**: `payment_completed`

```
💳 결제 완료

#{student_name} 학생
결제 금액: #{amount}원
결제 일시: #{payment_date}

영수증: #{receipt_url}

────────────────
온리쌤 배구아카데미
```

---

### 템플릿 5: 미수금 알림

**템플릿 코드**: `payment_reminder`

```
💰 수강료 안내

#{student_name} 학생
미납 금액: #{unpaid_amount}원
납부 기한: #{due_date}

결제하기: #{payment_url}

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678
```

---

## 🚀 구현 로드맵

### Phase 1: 알림톡 기반 (2주)

**목표**: 단방향 알림 자동화

- [ ] 카카오 비즈니스 채널 생성
- [ ] Solapi 계정 생성 및 API 키 발급
- [ ] 알림톡 템플릿 5개 승인 신청
- [ ] FastAPI 알림톡 발송 모듈 개발
- [ ] Supabase Trigger 연동
- [ ] 출석/결석/결제 알림 자동화

**완료 기준**:
- ✅ 출석 체크 → 1분 내 학부모 알림 도달
- ✅ 결석 자동 감지 → 10분 내 알림
- ✅ 결제 완료 → 즉시 알림

---

### Phase 2: 카카오 로그인 + 결제 (2주)

**목표**: 학부모 계정 인증 및 결제 자동화

- [ ] 카카오 로그인 OAuth 연동
- [ ] Next.js 로그인 UI
- [ ] Supabase users 테이블 연동
- [ ] 카카오페이 결제 API 연동
- [ ] 결제 완료 웹훅 처리
- [ ] 자동 수납 처리

**완료 기준**:
- ✅ 학부모 1초 로그인
- ✅ 카카오페이 결제 성공률 99%+

---

### Phase 3: 친구톡 + CRM (2주)

**목표**: 마케팅 자동화

- [ ] 카카오 채널 친구 관리
- [ ] 친구톡 발송 모듈
- [ ] 세그먼트 발송 (신규/기존/휴면)
- [ ] 이벤트 자동 발송
- [ ] A/B 테스트

**완료 기준**:
- ✅ 방학특강 알림 → 클릭률 30%+
- ✅ 신규 등록 전환율 20%+

---

### Phase 4: 챗봇 + 1:1 상담 (4주)

**목표**: 양방향 대화 자동화

- [ ] 카카오 채널 1:1 채팅 API 연동
- [ ] 챗봇 시나리오 설계
- [ ] FAQ 자동응답
- [ ] 상담 예약 자동화
- [ ] 관리자 대시보드

**완료 기준**:
- ✅ FAQ 자동응답률 80%+
- ✅ 상담 예약 자동화율 100%

---

## 💰 비용 산정

### Solapi 메시지 비용

| 유형 | 단가 | 월 예상 발송량 (학생 100명 기준) | 월 비용 |
|------|------|----------------------------------|---------|
| 알림톡 | 8원 | 출석(2,000) + 결석(200) + 결제(100) = 2,300건 | 18,400원 |
| 친구톡 | 5원 | 마케팅(400) = 400건 | 2,000원 |
| **합계** | - | 2,700건 | **20,400원/월** |

### 학생 규모별 예상 비용

| 학생 수 | 월 발송량 | 월 비용 | 연 비용 |
|---------|-----------|---------|---------|
| 50명 | 1,350건 | 10,200원 | 122,400원 |
| 100명 | 2,700건 | 20,400원 | 244,800원 |
| 200명 | 5,400건 | 40,800원 | 489,600원 |
| 500명 | 13,500건 | 102,000원 | 1,224,000원 |

**ROI**:
- 수동 알림 시간 절감: 월 20시간 (시급 15,000원 기준 = 300,000원)
- 미수금 회수율 향상: 5% → 월 500,000원 (100명 기준)
- **순이익**: 월 779,600원

---

### 기타 비용

| 항목 | 비용 |
|------|------|
| Solapi 충전금 | 선불 (최소 10,000원) |
| 카카오 비즈니스 채널 | 무료 |
| 카카오페이 수수료 | 2.9% (결제 금액의) |
| n8n Cloud (선택) | $20/월 (안 쓰면 0원) |

---

## 📊 성공 지표 (KPI)

### 운영 효율

- ✅ 알림 자동화율: 100%
- ✅ 수동 알림 시간: 월 20시간 → 0시간
- ✅ 미수금 회수율: 5% 향상

### 학부모 만족도

- ✅ 알림 도달률: 95%+
- ✅ 알림 응답률: 80%+
- ✅ NPS: +30 이상

### 매출

- ✅ 신규 등록 전환율: 20% 향상
- ✅ 재등록률: 10% 향상
- ✅ 추가 수업 구매율: 15% 향상

---

## 🔐 보안 및 개인정보

### 필수 조치

1. **개인정보 수집 동의**
   - 카카오톡 알림 수신 동의
   - 마케팅 수신 동의 (친구톡)

2. **데이터 암호화**
   - 학부모 전화번호: AES-256 암호화
   - 카카오 API 키: 환경 변수 관리

3. **수신거부 처리**
   - 알림톡 하단 "수신거부" 링크
   - 수신거부 시 자동 DB 업데이트

---

## 🎯 다음 단계

### 즉시 실행

1. **카카오 비즈니스 채널 생성**
   - URL: https://kakaobusiness.com
   - 사업자등록번호 준비
   - 채널명: "온리쌤 배구아카데미"

2. **Solapi 계정 생성**
   - URL: https://solapi.com
   - API 키 발급
   - 10,000원 충전

3. **알림톡 템플릿 승인 신청**
   - 템플릿 5개 작성
   - 승인 대기 (1~2일)

4. **FastAPI 개발 시작**
   - 알림톡 발송 모듈
   - Supabase Trigger 연동

---

## 📞 기술 지원

**Solapi 개발자 문서**: https://docs.solapi.com
**카카오 비즈니스 가이드**: https://kakaobusiness.gitbook.io
**Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-14
**작성자**: AUTUS Team
