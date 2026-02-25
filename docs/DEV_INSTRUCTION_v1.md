# AUTUS 개발 지시서 v1

> 작성일: 2026-02-23 | 작성 기준: Supabase DB 실시간 감사 결과
> 대상: Claude Code (P1), Cowork (P2), Chrome (P3)
> 순서: 위에서 아래로 실행. 각 태스크는 독립 배포 가능하되, 의존성 표시된 것은 선행 완료 필수.

---

## 0. 현재 상태 스냅샷

### 인프라

| 항목 | 수량/상태 |
|------|-----------|
| Supabase 프로젝트 | `pphzvnaedmzcvpxjulti` |
| DB 테이블 | ~121개 (public schema) |
| Edge Functions | 38개 배포됨 |
| pg_cron Jobs | 14개 활성 |
| Auth Users | 2명 (test@onlyssam.com, stiger0720@gmail.com) |
| Migrations | 119개 적용됨 |

### 데이터 현황

| 테이블 | 건수 | 비고 |
|--------|------|------|
| organizations | 7 | OnlySsam 1 + 테스트 1 + 올댓바스켓 5(중복) |
| students | 802 | 전부 OnlySsam org |
| attendance | 52 | |
| contracts | 14 | |
| invoices | 116 | |
| result_logs | 3 | 테스트 데이터, training_stage 전부 null |
| proof_records | 1 | 테스트 데이터 |
| proof_anchors | 0 | |
| message_outbox | 1 | |
| notifications | 0 | |
| consent_records | 0 | |
| kakao_tokens | 1 | |
| kakao_delivery_log | 0 | |
| message_templates | 9 | |

### Edge Functions 분류

**온리쌤 코어 (12개)**
- `attendance-check` v2 — QR/수동 출석 체크
- `attendance-response` v2 — 출석 확인 응답
- `coach-result-submit` v4 — 코치 결과 제출 + proof 생성
- `send-attendance-reminder` v1 — 출석 알림 발송
- `send-class-result` v1 — 수업 결과 발송
- `invoice-generate` v2 — 청구서 생성
- `overdue-check` v2 — 미수금 체크
- `contract-expire` v1 — 계약 만료 체크
- `growth-report` v1 — 성장 리포트
- `makeup-booking` v1 — 보강 예약
- `notification-dispatch` v2 — 알림 발송
- `notification-scheduler` v1 — 알림 스케줄러

**Proof Layer (5개)**
- `proof-generator` v1 — leaf_hash 생성
- `proof-anchor` v3 — Merkle Tree + L2 앵커링 (Base Mainnet 준비완료)
- `verify-page` v1 — 공개 검증 페이지 (HTML)
- `aggregate-metrics` v1 — 전국 익명 통계
- `evidence-package` v1 — 7종 증거 패키지

**카카오 연동 (4개)**
- `kakao-send` v2 — 솔라피 알림톡 발송
- `kakao-webhook-receiver` v2 — 카카오 웹훅
- `consent-link` v1 — 동의서 링크 (JWT 불필요)
- `template-manager` v2 — 메시지 템플릿 관리

**뷰티 (7개, 스키마 미생성)**
- `beauty-reservation-check` v1
- `beauty-commission-calc` v1
- `beauty-noshow-processor` v1
- `beauty-revisit-predictor` v1
- `beauty-membership-billing` v1
- `beauty-reminder-sender` v1
- `beauty-daily-settlement` v1

**플랫폼 공통 (10개)**
- `chat-ai` v2 — AI 채팅
- `automation-engine` v1 — 자동화 엔진
- `escalation-batch` v1 — 에스컬레이션
- `event-replay` v1 — 이벤트 리플레이
- `payment-webhook` v1 — 결제 웹훅
- `signature-request` v1 — 서명 요청
- `moodusign-webhook` v1 — 무두사인 웹훅
- `telegram-webhook` v1 — 텔레그램 봇
- `message-sender` v1 — 메시지 발송
- `message-worker` v1 — 메시지 워커

### Cron Jobs (14개)

| Job | 스케줄 (UTC) | KST |
|-----|-------------|-----|
| daily-pay7-score-batch | 0 21 * * * | 06:00 |
| daily-pay7-queue-fill | 30 21 * * * | 06:30 |
| daily-overdue-check | 0 0 * * * | 09:00 |
| mark-overdue-invoices | 0 0 * * * | 09:00 |
| cleanup-old-notifications | 0 8 * * * | 17:00 |
| check-expiring-contracts | 0 9 * * 1 | 월 18:00 |
| daily-escalation-batch | 0 1 * * * | 10:00 |
| daily-contract-expire | 0 23 * * * | 08:00 |
| daily-attendance-reminder | 0 12 * * * | 21:00 |
| daily-proof-anchor-build | 0 15 * * * | 00:00 |
| daily-proof-anchor-l2 | 5 15 * * * | 00:05 |
| monthly-invoice-generate | 0 0 1 * * | 매월 1일 09:00 |
| notification-dispatch | */10 * * * * | 10분마다 |
| send-class-result-batch | */10 * * * * | 10분마다 |

### 컬럼명 불일치 (Critical)

| 테이블 | 사용하는 컬럼명 | 참조 대상 |
|--------|----------------|-----------|
| students | `organization_id` | organizations.id |
| attendance | `org_id` | organizations.id |
| proof_records | `org_id` | organizations.id |
| contracts | ? | organizations.id |
| invoices | ? | organizations.id |
| app_members | `org_id` | organizations.id |
| result_logs | `student_sid` | students.id (이름과 다름!) |

> **규칙**: 신규 테이블은 `org_id` 사용. 기존 `organization_id`는 점진적 마이그레이션.

### OnlySsam Org 데이터

```
org_id: 0219d7f2-5875-4bab-b921-f8593df126b8
name: OnlySSem 배구 아카데미
type: academy
owner_user_id: null  ← 미설정!
branding: 9개 필드 설정됨 (badge_enabled: false)
```

---

## Phase 1: 긴급 수정 (온리쌤 안정화 전제 조건)

### T-01: OnlySsam org owner_user_id 연결

**문제**: organizations.owner_user_id가 null이어서 owner 기반 권한 체크 실패 가능
**이전 Auth**: Clerk (`user_39hJ1k6oB378zjN8sWfDCLHjAkR`)
**현재 Auth**: Supabase Auth (`818362c0-0a44-41a3-b625-e93d1595647d` = seho)

**실행**:
```sql
UPDATE organizations
SET owner_user_id = '818362c0-0a44-41a3-b625-e93d1595647d'
WHERE id = '0219d7f2-5875-4bab-b921-f8593df126b8';
```

**검증**: `SELECT owner_user_id FROM organizations WHERE id = '0219d7f2-...'`

---

### T-02: 중복 올댓바스켓 org 정리

**문제**: 올댓바스켓 org가 5개 중복 존재 (students 0건)
**org_ids**: `7461b23d`, `cd1ef5af`, `639597c4`, `b55ddda8`, `465170f8`

**실행**:
1. 학생/출석/계약 등 데이터 존재하는 org 확인
2. 데이터 없는 org의 app_members 삭제
3. 빈 org 삭제 (또는 status='archived')

```sql
-- 1. 각 org의 데이터 존재 여부 확인
SELECT o.id, o.name,
  (SELECT count(*) FROM students WHERE organization_id = o.id) as students,
  (SELECT count(*) FROM attendance WHERE org_id = o.id) as attendance
FROM organizations o
WHERE o.name = '올댓바스켓';

-- 2. 데이터 없는 org archived 처리
UPDATE organizations SET status = 'archived'
WHERE name = '올댓바스켓'
AND id NOT IN (SELECT DISTINCT organization_id FROM students);
```

**검증**: `SELECT id, status FROM organizations WHERE name = '올댓바스켓'`

---

### T-03: Clerk→Supabase Auth 마이그레이션 RLS 호환

**문제**: app_members에 Clerk user_id(`user_39hJ1k6oB378zjN8sWfDCLHjAkR`)로 된 6개 레코드 존재. Supabase Auth의 `auth.uid()`와 불일치.

**분석 필요**:
```sql
-- Clerk ID를 사용하는 app_members
SELECT id, user_id, org_id, role FROM app_members
WHERE user_id LIKE 'user_%';
```

**실행 방향**:
- 올댓바스켓 orgs (T-02에서 정리 후) → 해당 app_members도 삭제
- 테스트 학원 → archived 또는 유지 결정
- RLS 정책에서 `auth.uid()::text = user_id` 조건이 있으면 Clerk ID 매칭 실패

**의존성**: T-02 완료 후

---

### T-04: result_logs.training_stage 데이터 정비

**문제**: 3건 모두 training_stage = null → coach-result-submit v4의 growth_delta 계산 불가

**실행**:
```sql
-- 테스트 데이터 확인
SELECT id, student_sid, training_stage, created_at FROM result_logs;

-- 테스트 데이터면 삭제, 실데이터면 stage 채움
-- 테스트 데이터 삭제 예시:
DELETE FROM result_logs WHERE student_sid LIKE '11111111-%' OR student_sid LIKE 'e2e0%';
```

**검증**: `SELECT count(*) FROM result_logs WHERE training_stage IS NULL`

---

## Phase 2: 온리쌤 핵심 플로우 완성

### T-05: 출석 → 알림 파이프라인 E2E 테스트

**현황**: attendance-check v2 + send-attendance-reminder v1 + kakao-send v2 배포됨
**문제**: kakao_delivery_log 0건 = 실제 발송된 적 없음

**테스트 순서**:
1. attendance-check 호출 → attendance 레코드 생성 확인
2. send-attendance-reminder가 학부모에게 알림 생성하는지 확인
3. kakao-send의 솔라피 연동 확인 (SOLAPI env 설정 여부)

**필요한 env 확인**:
```
KAKAO_API_KEY (솔라피 API Key)
KAKAO_API_SECRET (솔라피 API Secret)
KAKAO_PFID (카카오 채널 PFID)
KAKAO_SENDER_PHONE (발신번호)
```

**검증**:
```sql
-- 발송 로그 확인
SELECT count(*) FROM kakao_delivery_log WHERE kakao_status = 'success';
```

---

### T-06: 코치 결과 제출 → 학부모 알림 E2E 테스트

**현황**: coach-result-submit v4 배포됨 (실제 metrics 조회)
**플로우**: 코치 결과 입력 → result_logs INSERT → proof_records INSERT → 카카오 알림톡

**테스트**:
```bash
curl -X POST https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/coach-result-submit \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "student_sid": "{실제_student_id}",
    "org_id": "0219d7f2-5875-4bab-b921-f8593df126b8",
    "training_stage": "intermediate",
    "score_json": {"serve": 7, "receive": 6, "spike": 8},
    "coach_note": "좋은 훈련이었습니다"
  }'
```

**검증**:
```sql
SELECT id, training_stage, result_token FROM result_logs ORDER BY created_at DESC LIMIT 1;
SELECT id, leaf_hash FROM proof_records ORDER BY created_at DESC LIMIT 1;
```

---

### T-07: 청구서 자동 생성 파이프라인

**현황**: invoice-generate v2 + monthly-invoice-generate cron (매월 1일) 존재. invoices 116건.

**확인 사항**:
1. 청구서 생성 로직이 활성 학생 기반인지 확인
2. 미수금(overdue) 체크 로직 확인
3. 학부모에게 청구 알림 발송 여부

**Edge Function 코드 검증 필요**: `invoice-generate` 읽고 실제 로직 확인

---

### T-08: 동의서 플로우 활성화

**현황**: consent-link v1 배포됨 (완전한 구현). consent_records 0건 = 한번도 사용 안됨.

**실행**:
1. 동의서 콘텐츠를 DB 또는 Storage로 이동 (현재 하드코딩)
2. consent-link의 base_url 확인 (`https://onlyssam.autus-ai.com`)
3. 프론트엔드에 `/consent` 라우트 존재하는지 확인

**테스트**:
```bash
# 동의서 링크 발송
curl -X POST https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/kakao-send \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_consent",
    "org_id": "0219d7f2-5875-4bab-b921-f8593df126b8",
    "student_id": "{student_id}",
    "recipient_phone": "01012345678",
    "recipient_name": "김학부모",
    "consent_type": "parent_consent"
  }'
```

---

### T-09: 프론트엔드 (kraton-v2) 라우트 점검

**필요 확인 사항**:
- `/consent` — 동의서 페이지 존재?
- `/result/{token}` — 결과 리포트 페이지 존재?
- 로그인 흐름 — Clerk → Supabase Auth 전환 완료?
- VerifyBadge 컴포넌트 삽입 위치

**실행 에이전트**: Claude Code (P1) — kraton-v2 레포 접근 필요

**산출물**:
```
kraton-v2/src/components/proof/VerifyBadge.tsx  (G8)
kraton-v2/src/app/result/[token]/page.tsx 수정  (G9)
kraton-v2/src/app/consent/page.tsx              (T-08 연동)
```

---

## Phase 3: Proof Layer 완성

### T-10: AutusAnchor.sol Base Mainnet 배포

**현황**: 컨트랙트 코드 작성 완료 (`contracts/AutusAnchor.sol`)
**proof-anchor v3**: 배포 완료, env 설정 시 live 모드 자동 전환

**수동 실행 (Remix IDE)**:
1. https://remix.ethereum.org 접속
2. `AutusAnchor.sol` 복사 → Compile (0.8.24)
3. Environment: Injected Provider (MetaMask — Base Mainnet)
4. Deploy → contract address 복사
5. BaseScan에서 Verify & Publish

**Supabase env 설정**:
```
L2_RPC_URL = https://mainnet.base.org
L2_SIGNER_PRIVATE_KEY = 0x{배포한_지갑_private_key}
L2_CONTRACT_ADDRESS = 0x{배포된_컨트랙트_주소}
```

**검증**:
```bash
# proof-anchor status 확인
curl -X POST https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/proof-anchor \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
# l2_enabled: true 확인
```

**비용**: ~$0.01/일, 월 $0.30

---

### T-11: proof-anchor function selector 검증

**문제**: `ANCHOR_SELECTOR = "0xc0d27b89"` — keccak256("anchor(bytes32,uint256)")의 첫 4바이트인지 검증 필요

**실행** (Node.js 또는 ethers.js):
```javascript
const { ethers } = require('ethers');
const iface = new ethers.Interface(['function anchor(bytes32,uint256)']);
console.log(iface.getFunction('anchor').selector);
// 예상: 0xc0d27b89 → 일치하면 OK, 다르면 proof-anchor 코드 수정
```

**불일치 시**: proof-anchor v4 배포하여 ANCHOR_SELECTOR 수정

---

### T-12: VerifyBadge 컴포넌트 + 결과 페이지 연동

**의존성**: T-09 (kraton-v2 접근)

**VerifyBadge.tsx** 스펙:
```tsx
// Props
interface VerifyBadgeProps {
  leafHash: string;
  anchorStatus: 'anchored' | 'pending' | 'recorded' | null;
  txHash?: string;
}

// 표시
// anchored → 초록 배지 "블록체인 검증됨" + BaseScan 링크
// pending → 노란 배지 "검증 대기중"
// recorded → 파란 배지 "기록됨"
// null → 숨김
```

**결과 페이지 수정** (`/result/[token]/page.tsx`):
```typescript
const { data } = await supabase
  .from('result_logs')
  .select(`*, proof_records!proof_records_report_id_fkey(
    id, leaf_hash, anchor_id,
    proof_anchors(merkle_root, tx_hash, anchored_at)
  )`)
  .eq('result_token', token)
  .single();
```

---

## Phase 4: 카카오 알림톡 실전 운영

### T-13: 솔라피 API 키 설정 + 발신번호 등록

**현황**: kakao-send v2에 솔라피 연동 코드 완성됨. Mock 모드 동작 중 (env 미설정).

**수동 실행**:
1. https://solapi.com 대시보드 → API Key 발급
2. 카카오 비즈니스 채널 연동 → PFID 획득
3. 발신번호 등록 (사업자 인증 필요)

**Supabase env 설정**:
```
KAKAO_API_KEY = {솔라피_API_KEY}
KAKAO_API_SECRET = {솔라피_API_SECRET}
KAKAO_PFID = {카카오채널_PFID}
KAKAO_SENDER_PHONE = 01012345678
```

---

### T-14: 알림톡 템플릿 등록

**현황**: message_templates 9건 존재 (DB). 솔라피에 실제 등록 여부 미확인.

**확인**:
```sql
SELECT id, template_key, name, status FROM message_templates;
```

**필요 템플릿**:
| template_id | 용도 | 솔라피 등록 |
|-------------|------|------------|
| ATTENDANCE_REMINDER | 출석 알림 | 필요 |
| CLASS_RESULT_V1 | 수업 결과 알림 | 필요 |
| CONSENT_LINK_V1 | 동의서 링크 | 필요 |
| INVOICE_NOTIFY | 청구 알림 | 필요 |
| OVERDUE_REMINDER | 미수금 알림 | 필요 |

**실행**: 솔라피 대시보드에서 각 템플릿을 카카오 심사 등록

---

### T-15: 출석 확인 학부모 응답 플로우

**현황**: attendance-response v2 배포됨, kakao-webhook-receiver v2 배포됨

**플로우**:
1. 출석 알림 발송 (T-05)
2. 학부모가 카카오 채널에서 "확인" 응답
3. kakao-webhook-receiver가 수신
4. attendance-response가 확인 처리

**검증**: E2E 테스트 — 실제 카카오 메시지 → 웹훅 → 응답 처리

---

## Phase 5: 모바일 앱 (Expo)

### T-16: 모바일 앱 Expo Go 테스트

**현황**: mobile-app/ 디렉토리 준비됨. Supabase Auth 테스트 계정 생성됨.

**로컬 실행**:
```bash
cd mobile-app
npm install
npx expo start
```

**테스트 계정**:
- test@onlyssam.com / test1234!
- stiger0720@gmail.com / autus2024!

**확인 사항**:
- [ ] 로그인 화면 렌더링
- [ ] Supabase Auth 로그인 성공
- [ ] 메인 화면 진입 (org 선택/학생 목록)
- [ ] 출석 체크 기능
- [ ] 결과 입력 기능

---

### T-17: 모바일 → 몰트봇 연동

**현황**: telegram-webhook v1 배포됨

**플로우**:
- 모바일에서 출석 체크 → 텔레그램 봇 알림
- 모바일에서 결과 입력 → 텔레그램 봇 알림

**Telegram Bot env**:
```
TELEGRAM_BOT_TOKEN = {봇_토큰}
TELEGRAM_CHAT_ID = {seho_채팅_ID}
```

---

## Phase 6: 뷰티 제품 스펙 정리

### T-18: 뷰티 DB 스키마 생성

**현황**: beauty_ 테이블 0개. Edge Function 7개 배포됨 (스키마 없이).

**필요 테이블**:
```sql
-- beauty_clients: 고객
CREATE TABLE beauty_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  phone text,
  gender text CHECK (gender IN ('M','F','other')),
  birth_date date,
  memo text,
  visit_count int DEFAULT 0,
  last_visit_at timestamptz,
  tags text[],
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- beauty_services: 시술 메뉴
CREATE TABLE beauty_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  category text, -- 커트, 염색, 펌, 네일 등
  duration_minutes int,
  price numeric(10,0),
  commission_rate numeric(5,2), -- 디자이너 수수료율
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- beauty_designers: 디자이너/스태프
CREATE TABLE beauty_designers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  phone text,
  role text DEFAULT 'designer',
  commission_type text DEFAULT 'percentage',
  commission_rate numeric(5,2),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- beauty_reservations: 예약
CREATE TABLE beauty_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  client_id uuid REFERENCES beauty_clients(id),
  designer_id uuid REFERENCES beauty_designers(id),
  service_id uuid REFERENCES beauty_services(id),
  reserved_at timestamptz NOT NULL,
  duration_minutes int,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','completed','cancelled','noshow')),
  price numeric(10,0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- beauty_settlements: 일일 정산
CREATE TABLE beauty_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  settlement_date date NOT NULL,
  total_revenue numeric(12,0),
  total_commission numeric(12,0),
  reservation_count int,
  noshow_count int,
  created_at timestamptz DEFAULT now()
);

-- beauty_memberships: 멤버십/정기권
CREATE TABLE beauty_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  client_id uuid REFERENCES beauty_clients(id),
  type text, -- 정기권, 횟수권 등
  total_amount numeric(10,0),
  remaining_amount numeric(10,0),
  total_count int,
  remaining_count int,
  started_at date,
  expires_at date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
```

**RLS**: 모든 테이블에 org_id 기반 격리 정책 적용

**실행 에이전트**: Claude Code (P1) — Supabase migration

---

### T-19: 뷰티 Edge Functions 스키마 연결

**현황**: 7개 Edge Function 배포됨 → 각각 코드 읽고 실제 테이블 참조 확인 필요

**점검 목록**:
| Function | 예상 테이블 | 상태 |
|----------|------------|------|
| beauty-reservation-check | beauty_reservations | 코드 확인 필요 |
| beauty-commission-calc | beauty_designers, beauty_reservations | 코드 확인 필요 |
| beauty-noshow-processor | beauty_reservations | 코드 확인 필요 |
| beauty-revisit-predictor | beauty_clients, beauty_reservations | 코드 확인 필요 |
| beauty-membership-billing | beauty_memberships | 코드 확인 필요 |
| beauty-reminder-sender | beauty_reservations, beauty_clients | 코드 확인 필요 |
| beauty-daily-settlement | beauty_settlements, beauty_reservations | 코드 확인 필요 |

**실행**: 각 Function 코드 읽기 → 참조 테이블명 확인 → T-18 스키마와 일치시키기

---

## Phase 7: 플랫폼 인프라

### T-20: Event Ledger 무결성 검증

**규칙**: append only (no UPDATE/DELETE)

**검증**:
```sql
-- events 테이블에 UPDATE/DELETE trigger가 차단되어 있는지 확인
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- events RLS에 UPDATE/DELETE 정책 없는지 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'events';
```

---

### T-21: RLS 보안 감사

**Supabase Security Advisor 결과 (2026-02-23 감사)**:

**ERROR (즉시 수정)**:
| 이슈 | 테이블/뷰 | 조치 |
|------|-----------|------|
| RLS 미활성 | `permission` | `ALTER TABLE permission ENABLE ROW LEVEL SECURITY;` + org 격리 정책 |
| RLS 미활성 | `personal_ai` | `ALTER TABLE personal_ai ENABLE ROW LEVEL SECURITY;` + owner 격리 정책 |
| RLS 미활성 | `connector` | `ALTER TABLE connector ENABLE ROW LEVEL SECURITY;` + ai_id 기반 정책 |
| SECURITY DEFINER 뷰 | `v_signature_status` | SECURITY INVOKER로 변경 또는 제거 |

**WARN (function search_path)**:
| 함수 | 조치 |
|------|------|
| `update_student_sessions_updated_at` | `SET search_path = public` 추가 |
| `update_factory_domain_configs_updated_at` | `SET search_path = public` 추가 |
| `update_package_on_sign` | `SET search_path = public` 추가 |
| `update_updated_at_column` | `SET search_path = public` 추가 |

**WARN (과도한 RLS 정책 — `USING(true)` 또는 `WITH CHECK(true)`)**:
- `atb_coaches`, `atb_enrollments`, `atb_interventions`, `atb_qr_codes`, `atb_tasks` — ALL with true
- `sw_*` 테이블 10개 — INSERT with true
- `zf_*` 테이블 4개 — INSERT/UPDATE with true
- `attendance_tokens` — UPDATE with true
- `autus_nodes`, `autus_relationships` — ALL with true

**WARN (Auth)**:
- Leaked password protection 비활성 → Supabase Dashboard에서 활성화

**실행 우선순위**: ERROR 4건 먼저 → function search_path → atb/sw/zf RLS 점진적 수정

---

### T-22: org별 서명 키 (G6, 장기)

**현황**: 미구현. MVP에서는 SHA-256 해시만으로 충분.

**구현 시점**: 온리쌤 파일럿 3개월 후

**스키마 변경**:
```sql
ALTER TABLE proof_records ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE proof_records ADD COLUMN IF NOT EXISTS signed_by_org uuid REFERENCES organizations(id);
```

---

## 실행 우선순위 요약

```
긴급 (Phase 1) — 데이터 정합성
├── T-01: owner_user_id 연결
├── T-02: 중복 org 정리
├── T-03: Clerk→Supabase Auth RLS
└── T-04: result_logs 정비

코어 (Phase 2) — 온리쌤 핵심 플로우
├── T-05: 출석→알림 E2E
├── T-06: 코치 결과→알림 E2E
├── T-07: 청구서 파이프라인
├── T-08: 동의서 플로우
└── T-09: 프론트엔드 라우트 (kraton-v2)

Proof (Phase 3) — 검증 레이어
├── T-10: Base Mainnet 배포 (수동)
├── T-11: function selector 검증
└── T-12: VerifyBadge + 결과 페이지

카카오 (Phase 4) — 알림톡
├── T-13: 솔라피 키 설정 (수동)
├── T-14: 템플릿 등록 (수동)
└── T-15: 학부모 응답 플로우

모바일 (Phase 5) — Expo
├── T-16: Expo Go 테스트
└── T-17: 텔레그램 봇 연동

뷰티 (Phase 6) — 두 번째 제품
├── T-18: DB 스키마 생성
└── T-19: Edge Function 연결

인프라 (Phase 7) — 장기
├── T-20: Event Ledger 검증
├── T-21: RLS 보안 감사
└── T-22: org별 서명 키
```

---

## 에이전트 라우팅

| 태스크 | 메인 에이전트 | 서포트 |
|--------|-------------|--------|
| T-01~04 | Claude Code (SQL) | — |
| T-05~06 | Claude Code (curl) | Chrome (UI) |
| T-07~08 | Claude Code (코드 읽기) | — |
| T-09, T-12 | Claude Code (React) | Chrome (검증) |
| T-10 | 수동 (Remix IDE) | — |
| T-11 | Claude Code (Node.js) | — |
| T-13~14 | 수동 (솔라피 대시보드) | — |
| T-15 | Claude Code + Chrome | — |
| T-16~17 | 로컬 (Expo) | 몰트봇 |
| T-18~19 | Claude Code (SQL + Deno) | — |
| T-20~21 | Claude Code (SQL) | — |

---

## Supabase 프로젝트 정보

```
Project ID: pphzvnaedmzcvpxjulti
URL: https://pphzvnaedmzcvpxjulti.supabase.co
Edge Functions URL: https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/{slug}
```

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-02-23 | 초기 작성. DB 실시간 감사 기반 22개 태스크 |
