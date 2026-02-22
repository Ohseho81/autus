# 온리쌤 카카오 통합 아키텍처

> **카카오를 앱처럼 쓰면 실패. 운영 인프라로 쓰면 독점.**

---

## 현재 상태 진단

### 존재하는 코드 vs 실제 작동

| 컴포넌트 | 코드 | 작동 | 문제 |
|----------|------|------|------|
| 카카오 로그인 | `kakaoAuth.ts` | O | 정상 |
| 알림톡 (Solapi) | `kakaoAlimtalk.ts` | **X** | HMAC 서명이 base64 mock, 템플릿 미승인 |
| 챗봇 (오픈빌더) | `kakaoChatbot.ts` | **X** | blockId 미등록, 스킬 서버 미배포 |
| Vercel 알림 API | `/api/notify` | **X** | n8n webhook URL 미설정, Solapi 미연동 |
| Edge Function | `attendance-chain-reaction` | **X** | KAKAO_ALIMTALK_API_KEY 미설정 |
| 카카오페이 | `tossPayments.ts` 내 참조 | **X** | 포트원 채널 미등록 |

### 핵심 문제: 3중 경로 충돌

```
경로 A: 모바일앱 → Solapi 직접 호출 (kakaoAlimtalk.ts)
경로 B: Vercel API → n8n webhook → Solapi (notify/route.ts)
경로 C: Edge Function → Kakao API 직접 (attendance-chain-reaction)
```

3개가 각각 다른 인증 방식, 다른 에러 처리, 다른 로그 저장.
**하나로 통일해야 한다.**

---

## 목표 아키텍처

### 원칙

1. **모바일은 절대 Solapi를 직접 호출하지 않는다** (API Key 노출 위험)
2. **Supabase Edge Function이 유일한 메시지 게이트웨이**
3. **이벤트 → action_queue → worker → Solapi** (단일 경로)
4. **카카오는 출력 채널, 온리쌤이 판단 엔진**

### 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        온리쌤 Core OS                           │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ QR 출석   │   │ 결제 완료 │   │ 결석 등록 │   │ Cron Job │   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│       │              │              │              │           │
│       ▼              ▼              ▼              ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    events (append-only)                  │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                      │
│                         ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              action_queue (단일 큐)                       │   │
│  │  action_type: SEND_ALIMTALK | SEND_FRIENDTALK |         │   │
│  │               SEND_SMS | SEND_PUSH                       │   │
│  │  status: PENDING → PROCESSING → COMPLETED/FAILED        │   │
│  │  dedupe_key: 중복 방지                                    │   │
│  │  retry_count: 최대 3회                                    │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                      │
│                         ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         message-worker (Edge Function)                   │   │
│  │  1. action_queue에서 PENDING 가져오기                      │   │
│  │  2. 템플릿 렌더링 (DB에서 조회)                             │   │
│  │  3. Solapi API 호출 (HMAC-SHA256 서버사이드)               │   │
│  │  4. 결과 → alimtalk_logs 저장                             │   │
│  │  5. 실패 시 retry_count++ & next_retry_at 설정             │   │
│  │  6. ioo_trace 기록                                        │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Solapi Gateway                              │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ 알림톡    │   │ 친구톡    │   │ SMS      │   │ RCS      │   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│       │              │              │              │           │
└───────┼──────────────┼──────────────┼──────────────┼───────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    카카오톡 / 통신사                               │
│                                                                 │
│  학부모 수신                                                     │
│  - 출석 알림                                                     │
│  - 결제 안내                                                     │
│  - 수업 리마인더                                                  │
│  - 결석 보충 선택 (버튼)                                          │
│  - 피드백 알림                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 카카오 6대 기능 구현 전략

### 1. 알림톡 (정보성 강제 도달) — MVP 필수

**역할:** 부모 앱 설치 없이 도달하는 유일한 채널

**트리거 → 알림 매핑:**

| 트리거 이벤트 | 알림톡 템플릿 | 수신자 | 우선순위 |
|--------------|-------------|--------|---------|
| QR 출석 | `ATB_ATTENDANCE` | 학부모 | P0 |
| 결석 등록 | `ATB_ABSENT_NOTIFY` | 학부모 | P0 |
| 결제 완료 | `ATB_PAYMENT_COMPLETE` | 학부모 | P0 |
| 수업 1시간 전 | `ATB_LESSON_REMIND` | 학부모 | P1 |
| 미납 D+3 | `ATB_PAYMENT_DUE` | 학부모 | P1 |
| 코치 피드백 | `ATB_FEEDBACK` | 학부모 | P1 |
| 가입 환영 | `ATB_WELCOME` | 학부모 | P2 |
| 사고 보고 | `ATB_INCIDENT` | 학부모 | P0 |

**구현 경로:**

```
이벤트 발생
  → presence INSERT / payment_records INSERT
  → DB trigger → action_queue INSERT
  → cron (1분 간격) → message-worker Edge Function
  → Solapi API (HMAC-SHA256 서버사이드)
  → 카카오 알림톡 발송
  → alimtalk_logs 저장
  → ioo_trace 기록
```

**Solapi HMAC-SHA256 인증 (Edge Function 서버사이드):**

```typescript
// message-worker Edge Function 내부
import { createHmac, randomBytes } from 'node:crypto';

function generateSolapiAuth(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}
```

**Fallback 체인:**

```
알림톡 실패 → SMS 자동 전환 (Solapi 자체 fallback)
SMS 실패 → push notification (FCM)
push 실패 → 운영자 Slack 알림
```

---

### 2. 친구톡 (마케팅/리텐션) — 자동화 단계

**역할:** 채널 추가한 학부모에게 마케팅 메시지

**활용 시나리오:**

| 시나리오 | 세그먼트 | 타이밍 |
|---------|---------|--------|
| 방학특강 모집 | 전체 학부모 | 방학 2주 전 |
| 재등록 안내 | 수강권 만료 예정 | 만료 7일 전 |
| 이벤트 홍보 | 활성 학부모 | 이벤트 기간 |
| 성장 리포트 | 월간 활동 있는 학생 | 매월 1일 |

**알림톡 vs 친구톡 분기 로직:**

```
메시지 발송 요청
  ↓
정보성 메시지? (출석/결제/일정)
  → YES → 알림톡 (템플릿 필수, 채널 추가 불필요)
  → NO → 마케팅 메시지?
    → YES → 친구톡 (채널 추가 필수, 수신 동의 필수)
    → NO → SMS
```

---

### 3. 카카오 로그인 (간편 인증) — 완료

**현재 상태:** `kakaoAuth.ts` 구현 완료, 작동 중

**확장 포인트:**
- 카카오싱크: 전화번호 자동 수집 동의 (부모 연락처)
- 학생-부모 자동 연결: 카카오 로그인 시 전화번호 → `atb_students.parent_phone` 매칭

---

### 4. 카카오페이 결제 — 결제선생 통합

**전략:** 카카오페이를 직접 연동하지 않고, **결제선생(PaySSAM)을 통해 간접 연동**

```
결제선생 청구서 → 학부모 카카오톡 수신
  → 결제 버튼 클릭 → 카카오페이/카드/계좌이체 선택
  → 결제 완료 → webhook → 온리쌤 자동 처리
```

**이유:**
- 결제선생이 PG사 역할 + 카카오톡 청구서 발송을 동시에 처리
- 별도 카카오페이 가맹점 등록 불필요
- 토스페이먼츠는 인앱 결제용으로 유지

---

### 5. 카카오 채널 1:1 상담 API — 상담선생 자동화

**현재:** `kakaoChatbot.ts`에 오픈빌더 스킬 핸들러 구현 완료

**목표 플로우:**

```
학부모: "보충수업 신청하고 싶어요"
  ↓
카카오 오픈빌더 → 승원봇 (자동 분기)
  ↓
스킬 서버 (Supabase Edge Function)
  → 결석 기록 조회
  → 가능한 보충 슬롯 조회
  → 캐러셀 카드로 응답
  ↓
학부모: 슬롯 선택 (버튼 클릭)
  ↓
스킬 서버 → 보충 확정 → 알림톡 확인 메시지
```

**필요 작업:**
- 오픈빌더 스킬 서버 배포 (Vercel `/api/kakao/skill/[action]` 이미 준비됨)
- blockId 등록 (카카오 콘솔에서 발급 → env 설정)

---

### 6. 카카오톡 공유 (Proof Pack) — 부모 만족도

**활용:**
- 수업 영상 공유 링크 (YouTube 비공개 링크)
- 월간 성장 리포트 웹 링크
- V-Index 변화 그래프

**구현:** 알림톡 버튼에 웹 링크 포함 (추가 API 불필요)

---

## DB 스키마 (메시지 인프라)

### 기존 테이블 활용

```sql
-- 이미 존재: action_queue, alimtalk_logs, events, ioo_trace
-- 추가 필요: message_templates (DB 기반 템플릿 관리)
```

### message_templates 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- 'ATB_ATTENDANCE', 'ATB_PAYMENT_DUE' 등
  channel TEXT NOT NULL,            -- 'alimtalk', 'friendtalk', 'sms'
  title TEXT NOT NULL,
  content TEXT NOT NULL,            -- #{변수명} 포함
  buttons JSONB,                    -- [{name, type, url}]
  variables TEXT[],                 -- ['parentName', 'studentName', ...]
  kakao_template_id TEXT,           -- 카카오 승인된 템플릿 ID
  approval_status TEXT DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'rejected'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### action_queue 확장 (기존 테이블에 열 추가)

```sql
-- 기존 action_queue에 메시지 관련 메타데이터 추가
ALTER TABLE action_queue
  ADD COLUMN IF NOT EXISTS channel TEXT,           -- 'alimtalk', 'friendtalk', 'sms', 'push'
  ADD COLUMN IF NOT EXISTS template_code TEXT,      -- message_templates.code 참조
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS template_vars JSONB,     -- 템플릿 변수 값
  ADD COLUMN IF NOT EXISTS send_result JSONB;       -- Solapi 응답 저장
```

---

## message-worker Edge Function 설계

```
supabase/functions/message-worker/index.ts
```

### 핵심 로직

```
1. action_queue에서 PENDING + channel IS NOT NULL 가져오기 (LIMIT 10)
2. status → PROCESSING 업데이트
3. 각 메시지에 대해:
   a. message_templates에서 템플릿 조회
   b. template_vars로 변수 치환
   c. 채널별 분기:
      - alimtalk → Solapi API (HMAC-SHA256)
      - friendtalk → Solapi API
      - sms → Solapi API
      - push → FCM/Expo Notifications
   d. 결과 → alimtalk_logs INSERT
   e. 성공 → status = COMPLETED
   f. 실패 → retry_count++, next_retry_at 설정
   g. ioo_trace 기록
4. 1분마다 cron으로 실행
```

### 배치 처리 (200건 단위)

```
200건 이하 → 단일 API 호출
200건 초과 → Loop Over (200건씩 분할)
각 배치 간 1초 대기 (rate limit 준수)
```

---

## 구현 로드맵

### Phase 0: 사전 준비 (카카오 비즈니스)

- [ ] 카카오 비즈니스 채널 프로필 설정 확인
  - [ ] 채널 공개: ON
  - [ ] 검색 허용: ON
  - [ ] 고객센터 연락처 등록
- [ ] Solapi 계정 설정
  - [ ] API Key / Secret 발급 확인
  - [ ] 발신 프로필(PFID) 카카오 채널 연결
- [ ] 알림톡 템플릿 5개 검수 제출
  - [ ] ATB_ATTENDANCE (출석)
  - [ ] ATB_ABSENT_NOTIFY (결석)
  - [ ] ATB_PAYMENT_COMPLETE (결제 완료)
  - [ ] ATB_LESSON_REMIND (수업 리마인더)
  - [ ] ATB_PAYMENT_DUE (미납 안내)

### Phase 1: MVP — 알림톡 1개 관통 (1주)

**목표:** 출석 → 알림톡 1건이 부모에게 도달하는 것을 검증

1. `message_templates` 테이블 생성
2. `action_queue` 열 확장
3. `message-worker` Edge Function 생성
   - Solapi HMAC-SHA256 서버사이드 구현
   - 단일 템플릿 (ATB_ATTENDANCE) 처리
4. `attendance-chain-reaction` 수정
   - 직접 Kakao API 호출 제거
   - action_queue INSERT로 변경
5. 테스트: QR 출석 → action_queue → message-worker → Solapi → 카카오톡

### Phase 2: 알림 자동화 확장 (2주)

6. 나머지 알림톡 템플릿 연동 (결석, 결제, 리마인더, 미납)
7. Cron 스케줄러 연결
   - `payment-reminder` → action_queue
   - `attendance-reminder` → action_queue
8. Fallback 체인 구현 (알림톡 실패 → SMS)
9. `kakaoAlimtalk.ts` 모바일 코드 제거 (Edge Function으로 이전)
10. 운영 대시보드: alimtalk_logs 조회 화면

### Phase 3: 챗봇 + 결제 (3-4주)

11. 오픈빌더 스킬 서버 배포 (Vercel)
12. blockId 등록 및 연결
13. 결제선생(PaySSAM) 파트너 등록
14. 청구서 발송 → 카카오톡 수신 → 결제 플로우
15. 친구톡 마케팅 메시지 기능

### Phase 4: 완성형 (5-6주)

16. 카카오싱크 (전화번호 자동 수집)
17. 세그먼트 기반 친구톡 발송
18. 성장 리포트 공유 링크
19. 1,000명 스케일 테스트

---

## 기존 코드 정리 계획

### 제거 대상

| 파일 | 이유 | 대체 |
|------|------|------|
| `kakaoAlimtalk.ts` 내 `sendViaSolapi()` | 모바일에서 직접 호출 위험 | message-worker Edge Function |
| `kakaoAlimtalk.ts` 내 `generateSolapiSignature()` | mock 구현 (base64) | Edge Function 서버사이드 |
| `/api/notify` 내 `sendKakaoAlimTalk()` | n8n 브릿지 우회 | action_queue 직접 |
| Edge Function 내 직접 Kakao API 호출 | 인증 방식 불일치 | message-worker 통합 |

### 유지 대상

| 파일 | 이유 |
|------|------|
| `kakaoAuth.ts` | 로그인은 모바일에서 직접 처리 (정상) |
| `kakaoChatbot.ts` | 스킬 핸들러 로직 유지 (배포 위치만 변경) |
| `kakaoAlimtalk.ts` 내 템플릿 정의 | DB로 이전 후 제거 |
| `kakaoAlimtalk.ts` 내 편의 함수 (`sendAttendanceNotification` 등) | action_queue INSERT 래퍼로 변환 |

### 변환 예시

**Before (모바일 직접 호출):**
```typescript
// kakaoAlimtalk.ts — 모바일에서 Solapi 직접 호출
await sendAttendanceNotification({
  parentPhone: '010-1234-5678',
  parentName: '김민수 어머니',
  studentName: '김민수',
  ...
});
```

**After (action_queue 경유):**
```typescript
// 모바일 또는 Edge Function에서
await supabase.from('action_queue').insert({
  action_type: 'SEND_MESSAGE',
  channel: 'alimtalk',
  template_code: 'ATB_ATTENDANCE',
  recipient_phone: '010-1234-5678',
  template_vars: {
    parentName: '김민수 어머니',
    studentName: '김민수',
    checkInTime: '14:30',
    lessonName: '초등 고학년반',
    location: '올댓바스켓 체육관',
  },
  status: 'PENDING',
  priority: 1,
});
// → message-worker가 1분 내에 처리
```

---

## 안정 운영 체크리스트

| 항목 | 기준 | 구현 |
|------|------|------|
| 발송 단위 | 200건 이하/배치 | message-worker LIMIT |
| 재시도 | 실패 시 최대 3회 | retry_count + next_retry_at |
| 중복 방지 | 같은 이벤트 2번 발송 안됨 | dedupe_key |
| 로그 저장 | 모든 발송 결과 DB | alimtalk_logs |
| 감사 추적 | 왜 발송됐는지 추적 | ioo_trace |
| 수신거부 | 수신거부자 자동 제외 | opt_out 필드 체크 |
| 비용 모니터링 | 월 발송량/비용 추적 | 대시보드 |
| 장애 알림 | 발송 실패율 > 10% | Slack 알림 |

---

## 비용 구조

| 메시지 유형 | 단가 | 월 예상 (학생 30명) |
|------------|------|-------------------|
| 알림톡 | ~9원 | ~5,400원 (200건) |
| 친구톡 (텍스트) | ~15원 | ~900원 (60건) |
| 친구톡 (이미지) | ~25원 | - |
| SMS (fallback) | ~20원 | ~400원 (20건) |
| **합계** | | **~6,700원/월** |

---

## 핵심 결정 요약

| 결정 | 선택 | 이유 |
|------|------|------|
| 메시지 게이트웨이 | Solapi (서드파티) | 알림톡+SMS+RCS 통합, n8n 대비 직접 제어 |
| API 호출 위치 | Supabase Edge Function | 서버사이드 HMAC, API Key 보호 |
| 큐 시스템 | action_queue (기존) | 새 인프라 불필요, 재시도/중복방지 기구축 |
| 결제 카카오페이 | 결제선생 경유 | PG+카카오 청구서 동시 해결 |
| 챗봇 엔진 | 카카오 오픈빌더 | 네이티브 카카오 UX, 별도 서버 불필요 |
| 템플릿 관리 | DB (message_templates) | 코드 배포 없이 변경 가능 |
