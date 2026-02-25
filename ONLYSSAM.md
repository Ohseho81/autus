# 온리쌤 안정화 지시서 (Claude Code 전용)

> **작성일**: 2026-02-26 | **기준 감사일**: 2026-02-25
> **Supabase Project**: `pphzvnaedmzcvpxjulti`
> **메인 org_id**: `0219d7f2-5875-4bab-b921-f8593df126b8` (온리쌤 아카데미)
> **목표**: 운영 안정성 확보. 보안 → 데이터 정합성 → 알림 연동 순서

---

## 현재 상태 스냅샷

```
학생: 802명 (org_id: 0219d7f2)
스케줄: 13건 (5명만 등록)
출결: 52건 (2/16 하루치만 — present:40, absent:5, late:7)
계약: 14건 | 청구서: 116건
카카오 토큰: 2개 | 발송 성공: 0건 | 실패: 1건
notification_schedule: 0건
RLS 위험 정책: ~90개 (qual='true' 또는 with_check='true')
pg_cron: 12개 활성 | Edge Functions: 37개 (온리쌤 관련 ~20개)
올댓바스켓 중복 org: 3개 (빈 데이터, 정리 대상)
마이그레이션: 136건 적용 완료
```

---

## 핵심 테이블 스키마 (온리쌤)

### students
```
id(uuid PK), name(varchar), phone, parent_name, parent_phone, parent_email,
parent_kakao_id, school, birth_year, grade, subject, tuition(int),
schedule_day, schedule_time, status(varchar default 'active'),
organization_id(uuid FK→organizations), universal_id(uuid),
-- 결제
billing_key, billing_key_last4, billing_key_card_brand, auto_pay_enabled,
-- 리텐션
churn_risk(text default 'low'), retention_stage(text default 'active'),
consecutive_absence_days(int), last_class_date(date),
cancel_requested_at, cancel_reason, cancel_effective_date,
-- 레벨
student_level(text default 'L1'), level_upgraded_at, level_upgrade_eligible,
-- 기타
memo, skill_score, engagement_score, fcm_token,
created_at, updated_at
```

### attendance
```
id(uuid PK), org_id(uuid NOT NULL), student_id(uuid NOT NULL),
session_date(date default CURRENT_DATE), check_in_time(timestamptz),
check_in_method(text default 'manual'), status(text default 'present'),
late_minutes(int), qr_nonce, verified(bool), state(text default 'committed'),
corrected_by(uuid), correction_reason, notes,
created_at, updated_at
```
> **주의**: org 컬럼명이 `org_id`임 (students는 `organization_id` 사용 — 불일치)

### schedules
```
id(uuid PK), organization_id(uuid NOT NULL), program_id(uuid),
title(text NOT NULL), day_of_week(int), start_time(time), end_time(time),
location, instructor, max_capacity(int), is_active(bool default true),
effective_from(date), effective_until(date),
student_id(uuid), subject(varchar), booked_count(int default 0),
created_at, updated_at
```

### contracts
```
id(uuid PK), org_id(uuid NOT NULL), student_id(uuid NOT NULL),
contract_type(text default 'enrollment'), start_date(date), end_date(date),
monthly_fee(numeric), total_amount(numeric), terms(jsonb),
parent_signature, parent_signed_at, org_signature, org_signed_at,
status(text default 'draft'), state(text default 'committed'),
signature_image, notes, created_at, updated_at
```

### invoices
```
id(uuid PK), org_id(uuid NOT NULL), student_id(uuid NOT NULL),
invoice_month(date), amount(numeric), discount_amount, discount_reason,
due_date(date), status(text default 'pending'),
paid_amount, paid_at, payment_method, payteacher_id,
state(text default 'committed'), notes, created_by(uuid),
created_at, updated_at
```

### events (Event Ledger — APPEND ONLY)
```
event_id(uuid PK), event_type(text), event_category(text),
entity_id(text), entity_type(text), state_from, state_to,
payload(jsonb), idempotency_key(text), actor_id, actor_type,
source(text), ip_address, user_agent,
occurred_at(timestamptz), recorded_at(timestamptz default now()),
schema_version(text default 'v1.0'), app_id(text default 'autus_core'),
tier(text default 'A'), weight(numeric default 0),
process_trigger, sequence_num(bigint), created_at
```
> **절대 규칙**: UPDATE/DELETE 금지. INSERT ONLY.

### organizations
```
id(uuid PK), name(text), slug(text), type(text default 'academy'),
business_number, owner_name, owner_phone, owner_user_id,
phone, email, address, status(text default 'active'), tier(text default 'free'),
-- 결제
pg_provider, pg_merchant_id, pg_api_key_encrypted,
card_fee_rate(0.8), cash_fee_rate(0.0),
auto_send_invoice(bool), auto_send_day(int default 1),
auto_reminder_enabled(bool), reminder_days_before_due(int default 3),
-- 운영
ops_stack(jsonb: payment,shuttle,contract,facility,complaint,attendance),
kernel_interest_top2(text[]),
metadata(jsonb), verification_data(jsonb),
created_at, updated_at
```

### app_members
```
id(uuid PK), org_id(uuid NOT NULL), user_id(text NOT NULL),
role(text default 'staff'), display_name, email, phone,
is_active(bool default true), permissions(jsonb),
onboarding_completed(bool), invitation_id(uuid),
deleted_at, deletion_reason, joined_at, created_at, updated_at
```

### org_settings
```
id(uuid PK), org_id(uuid NOT NULL), org_type(text default 'academy'),
custom_subjects(jsonb), subject_categories(jsonb),
evaluation_mode(text), evaluation_scale(jsonb),
schedule_types(jsonb), skill_tag_presets(jsonb),
terminology(jsonb), notification_defaults(jsonb), branding(jsonb),
enabled_modules(text[] — 14개 기본 모듈),
created_at, updated_at
```

### 알림 관련 테이블

**kakao_tokens**: `id, kakao_user_id, access_token, refresh_token, expires_at, refresh_expires_at, student_id, scope`

**message_outbox**: `id, message_id, app_id, tenant_id, event_id, channel, recipient_type, recipient_id, recipient_phone, template_id, variables(jsonb), rendered_content, idempotency_key, status, sent_at, failed_at, failure_reason, retry_count, scheduled_send_at, priority, next_retry_at`

**notification_schedule**: `id, org_id, schedule_id, type, send_at, sent(bool), sent_at, token, error, status, scheduled_at, message, metadata(jsonb), student_id, channel`

**kakao_delivery_log**: `id, org_id, outbox_id, recipient_phone, recipient_name, student_id, template_id, message_body, context_json, queued_at, sent_at, delivered_at, read_at, msg_uid, kakao_status, kakao_code, kakao_response, fallback_sms`

**message_templates**: `id, template_key, kakao_template_code, purpose`

---

## Edge Functions (온리쌤 관련)

| slug | JWT | 용도 |
|------|-----|------|
| `attendance-check` | O | 출결 체크인 처리 |
| `attendance-response` | X | 출결 확인 응답 (학부모) |
| `coach-result-submit` | O | 강사 수업 결과 제출 |
| `send-attendance-reminder` | O | 출결 알림 발송 (cron 12시) |
| `send-class-result` | O | 수업 결과 발송 (cron 10분) |
| `invoice-generate` | O | 월 청구서 생성 (cron 매월 1일) |
| `overdue-check` | O | 연체 체크 (cron 매일 0시) |
| `notification-dispatch` | O | 알림 디스패치 (cron 10분) |
| `notification-scheduler` | X | 알림 스케줄 등록 |
| `contract-expire` | O | 계약 만료 처리 (cron 23시) |
| `escalation-batch` | O | 에스컬레이션 배치 (cron 01시) |
| `kakao-send` | O | 카카오 알림톡 발송 |
| `kakao-webhook-receiver` | X | 카카오 웹훅 수신 |
| `template-manager` | X | 템플릿 관리 |
| `consent-link` | X | 동의서 링크 생성 |
| `signature-request` | O | 전자 서명 요청 |
| `moodusign-webhook` | X | 무두사인 웹훅 |
| `proof-generator` | O | 증빙 생성 |
| `proof-anchor` | O | 증빙 앵커링 (cron 15시) |
| `growth-report` | O | 성장 리포트 |
| `aggregate-metrics` | O | 메트릭 집계 |
| `makeup-booking` | X | 보강 예약 |
| `verify-page` | X | 검증 페이지 |
| `chat-ai` | O | AI 챗봇 |
| `telegram-webhook` | X | 텔레그램 웹훅 (몰트봇) |

---

## pg_cron 배치 작업

| jobname | schedule | 대상 |
|---------|----------|------|
| `monthly-invoice-generate` | 매월 1일 0시 | invoice-generate |
| `notification-dispatch` | 10분마다 | notification-dispatch |
| `daily-pay7-score-batch` | 매일 21시 | batch_score_pay7() |
| `daily-pay7-queue-fill` | 매일 21:30 | batch_fill_action_queue() |
| `daily-overdue-check` | 매일 0시 | overdue-check |
| `daily-escalation-batch` | 매일 1시 | escalation-batch |
| `daily-contract-expire` | 매일 23시 | contract-expire |
| `mark-overdue-invoices` | 매일 0시 | SQL 직접 실행 |
| `check-expiring-contracts` | 매주 월 9시 | SQL 직접 실행 |
| `cleanup-old-notifications` | 매일 8시 | 90일 이전 outbox 삭제 |
| `daily-proof-anchor-build` | 매일 15시 | proof-anchor (build_tree) |
| `daily-proof-anchor-l2` | 매일 15:05 | proof-anchor (anchor_l2) |
| `daily-attendance-reminder` | 매일 12시 | send-attendance-reminder |
| `send-class-result-batch` | 10분마다 | send-class-result |

---

## 안정화 태스크

### TASK-1: RLS 보안 강화 [P0-Critical]

**문제**: 핵심 테이블에 `qual = 'true'` 또는 `with_check = 'true'` 정책 다수 존재. 누구나 학생/출결/계약 데이터 조회 가능.

**즉시 수정 (온리쌤 핵심 10개 테이블)**:

```sql
-- 1단계: 위험 정책 DROP
DROP POLICY IF EXISTS students_anon_read_temp ON students;
DROP POLICY IF EXISTS students_public_read_temp ON students;
DROP POLICY IF EXISTS attendance_anon_read_temp ON attendance;
DROP POLICY IF EXISTS attendance_public_read_temp ON attendance;
DROP POLICY IF EXISTS contracts_anon_read_temp ON contracts;
DROP POLICY IF EXISTS contracts_public_read_temp ON contracts;
DROP POLICY IF EXISTS invoices_public_read_temp ON invoices;
DROP POLICY IF EXISTS events_public_read_temp ON events;
DROP POLICY IF EXISTS organizations_anon_read_temp ON organizations;
DROP POLICY IF EXISTS consultations_public_read_temp ON consultations;
DROP POLICY IF EXISTS consultations_anon_read_temp ON consultations;
DROP POLICY IF EXISTS schedules_public_read_temp ON schedules;
DROP POLICY IF EXISTS org_settings_anon_read_temp ON org_settings;

-- 2단계: org 격리 정책 생성
-- 패턴: authenticated 사용자가 속한 org의 데이터만 접근
CREATE POLICY "students_org_isolation" ON students FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- attendance: org_id 컬럼 사용 (organization_id 아님!)
CREATE POLICY "attendance_org_isolation" ON attendance FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- contracts, invoices: org_id 사용
CREATE POLICY "contracts_org_isolation" ON contracts FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

CREATE POLICY "invoices_org_isolation" ON invoices FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- events: org 격리 (events에 org 컬럼 없으면 entity_id 기반)
-- ⚠️ events 테이블에 org_id 컬럼이 없음! payload->>'org_id' 또는 별도 처리 필요
-- 확인 쿼리: SELECT column_name FROM information_schema.columns WHERE table_name='events' AND column_name LIKE '%org%';

-- organizations: authenticated만 자기 org 조회
CREATE POLICY "organizations_auth_only" ON organizations FOR SELECT TO authenticated
  USING (id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- consultations: organization_id 사용
CREATE POLICY "consultations_org_isolation" ON consultations FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- schedules: organization_id 사용
CREATE POLICY "schedules_org_isolation" ON schedules FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- org_settings: org_id 사용
CREATE POLICY "org_settings_member_only" ON org_settings FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM app_members WHERE user_id = auth.uid()::text AND is_active = true
  ));

-- 3단계: events INSERT 강화
DROP POLICY IF EXISTS events_append_only ON events;
CREATE POLICY "events_append_only_with_check" ON events FOR INSERT TO authenticated
  WITH CHECK (true);  -- events는 source/actor 기반이므로 INSERT는 허용하되 SELECT만 제한
```

**사전 확인 필수**:
1. 프론트엔드에서 `anon` key로 직접 쿼리하는 부분 찾기 (깨질 수 있음)
2. Edge Function은 `service_role` 사용하므로 영향 없음 확인
3. 학부모 앱이 anon으로 접근하면 별도 토큰 기반 정책 필요

**2차 수정** (서비스 테이블):
- `attendance_log`, `attendance_qr_tokens`: ALL true 정책이 있지만 service_role 전용 확인
- `canonical_events`: INSERT true → org_id NOT NULL 체크 추가
- `consent_records`: INSERT true → 서명 토큰 검증 추가
- `startup_chat_logs`: INSERT true → rate limit 추가

**sw_*/zf_* 테이블**: 현재 모두 anon open. 해당 제품 개발 시 같이 강화.

**롤백**:
```sql
-- DOWN: 원래 temp 정책 복원 (긴급 시)
-- CREATE POLICY "students_anon_read_temp" ON students FOR SELECT TO anon USING (true);
-- ... (각 테이블별)
```

**검증**: 마이그레이션 후 anon key로 curl 테스트 → 403 확인
```bash
curl -H "apikey: ANON_KEY" \
  "https://pphzvnaedmzcvpxjulti.supabase.co/rest/v1/students?select=id,name&limit=1"
# 기대 결과: [] 또는 403
```

---

### TASK-2: 올댓바스켓 중복 org 정리 [P1-High]

**삭제 대상** (모두 데이터 0건):
```
e4291771-8a85-4aa7-bcf5-5411344473e8  (2/25 08:44)
04df1b0b-555f-41bb-ad06-91337adc134b  (2/25 09:02)
a7f4789f-b619-4691-a6bc-3d213a6848e9  (2/25 10:06)
```
**유지**: `7461b23d-ac9f-438f-8906-ab9f701d654b` (2/20 원본)

**실행 SQL**:
```sql
-- 1. FK 의존성 확인
SELECT 'app_members' as tbl, count(*) FROM app_members WHERE org_id IN ('e4291771-8a85-4aa7-bcf5-5411344473e8','04df1b0b-555f-41bb-ad06-91337adc134b','a7f4789f-b619-4691-a6bc-3d213a6848e9')
UNION ALL SELECT 'invitations', count(*) FROM invitations WHERE organization_id IN ('e4291771-8a85-4aa7-bcf5-5411344473e8','04df1b0b-555f-41bb-ad06-91337adc134b','a7f4789f-b619-4691-a6bc-3d213a6848e9')
UNION ALL SELECT 'org_settings', count(*) FROM org_settings WHERE org_id IN ('e4291771-8a85-4aa7-bcf5-5411344473e8','04df1b0b-555f-41bb-ad06-91337adc134b','a7f4789f-b619-4691-a6bc-3d213a6848e9')
UNION ALL SELECT 'events', count(*) FROM events WHERE entity_id IN ('e4291771-8a85-4aa7-bcf5-5411344473e8','04df1b0b-555f-41bb-ad06-91337adc134b','a7f4789f-b619-4691-a6bc-3d213a6848e9');

-- 2. events에 데이터 있으면 DELETE 금지 → status 마킹
-- 3. 의존 데이터 수동 삭제 후 organizations 삭제
DELETE FROM app_members WHERE org_id IN (...);
DELETE FROM org_settings WHERE org_id IN (...);
DELETE FROM organizations WHERE id IN (...);

-- 4. 트리거 테스트
-- prevent_duplicate_org_creation이 정상 동작하는지 확인
```

---

### TASK-3: 출결 시스템 운영 점검 [P1-High]

**문제**: 802명 중 5명만 스케줄, 출결 52건이 2/16 하루에만 존재.

**점검 순서**:

1. **스케줄 구조 확인**
   ```sql
   SELECT id, title, day_of_week, start_time, end_time, student_id, subject, is_active
   FROM schedules WHERE organization_id = '0219d7f2-5875-4bab-b921-f8593df126b8';
   ```
   - student_id가 개별 학생별인지 확인 (802명이면 802개 스케줄 필요?)
   - 반(class) 단위 스케줄 vs 개별 스케줄 설계 확인

2. **출결 자동화 플로우**
   - `daily-attendance-reminder` (cron 12시) → `send-attendance-reminder` Edge Function
   - `send-class-result-batch` (cron 10분) → `send-class-result` Edge Function
   - Edge Function 로그 확인: 실제 호출되고 있는지
   - `attendance-check` / `attendance-response` 정상 동작 확인

3. **데이터 정합성**
   - `attendance.org_id` vs `students.organization_id` 컬럼명 불일치 → JOIN 시 주의
   - events의 `attendance.check_in_recorded` 이벤트 수 vs attendance 레코드 수 비교

4. **예상 원인과 조치**
   - 벌크 스케줄 등록 UI/API 부재 가능성 → 필요 시 구현
   - 기존 학생 데이터가 마이그레이션된 것일 수 있음 → 스케줄은 미연동

---

### TASK-4: 카카오 알림톡 연동 안정화 [P2-Medium]

**현재**: 토큰 2개, 발송 0건 성공, 1건 실패, 스케줄 0건

**점검**:

```sql
-- 1. 토큰 유효성
SELECT id, kakao_user_id, expires_at, refresh_expires_at, student_id
FROM kakao_tokens;
-- expires_at < now() 이면 토큰 만료

-- 2. 발송 실패 원인
SELECT id, channel, template_id, status, failure_reason, created_at
FROM message_outbox WHERE status = 'failed';

-- 3. 템플릿 등록 여부
SELECT template_key, kakao_template_code, purpose FROM message_templates;
```

**E2E 테스트 순서**:
1. `notification_schedule`에 테스트 건 INSERT
2. `notification-dispatch` cron이 Edge Function 호출하는지 확인
3. Edge Function → `kakao-send` 호출 확인
4. `kakao_delivery_log`에 결과 기록 확인

**주의**: 카카오 비즈메시지 콘솔에서 승인된 템플릿과 DB 매칭 필요

---

### TASK-5: function search_path 보안 [P2-Medium]

```sql
-- 즉시 수정
ALTER FUNCTION prevent_duplicate_org_for_user()
SET search_path = public, pg_temp;

-- 전체 SECURITY DEFINER 함수 점검
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE prosecdef = true AND pronamespace = 'public'::regnamespace;
-- proconfig에 search_path 없으면 추가 필요
```

---

### TASK-6: 모니터링 뷰 세팅 [P3-Nice-to-have]

```sql
CREATE OR REPLACE VIEW v_onlyssam_health AS
SELECT
  (SELECT count(*) FROM students WHERE organization_id = '0219d7f2-5875-4bab-b921-f8593df126b8') as total_students,
  (SELECT count(*) FROM students WHERE organization_id = '0219d7f2-5875-4bab-b921-f8593df126b8' AND status = 'active') as active_students,
  (SELECT count(*) FROM attendance WHERE org_id = '0219d7f2-5875-4bab-b921-f8593df126b8' AND check_in_time > now() - interval '24h') as today_attendance,
  (SELECT count(*) FROM message_outbox WHERE status = 'failed' AND created_at > now() - interval '24h') as failed_messages_24h,
  (SELECT count(*) FROM invoices WHERE org_id = '0219d7f2-5875-4bab-b921-f8593df126b8' AND status = 'overdue') as overdue_invoices,
  (SELECT count(*) FROM contracts WHERE org_id = '0219d7f2-5875-4bab-b921-f8593df126b8' AND status IN ('signed','active') AND end_date <= CURRENT_DATE + interval '30 days' AND end_date >= CURRENT_DATE) as expiring_contracts_30d;
```

---

## 실행 규칙

1. **순서**: TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6
2. **각 태스크 전**: plan mode 진입, 영향 범위 확인
3. **마이그레이션 명명**: `YYYYMMDDHHMMSS_onlyssam_stability_[task번호]_[설명]`
4. **RLS 변경 전**: 프론트엔드 anon 호출 패턴 반드시 먼저 확인
5. **테스트**: 태스크 완료 후 Chrome에서 실제 동작 검증
6. **롤백**: 각 마이그레이션에 DOWN 스크립트 주석으로 포함
7. **Event Ledger**: events 테이블은 절대 UPDATE/DELETE 금지
8. **완료 알림**: 각 태스크 완료 시 몰트봇(@autus_seho_bot)으로 알림

## 코드 컨벤션

- TypeScript strict, no any
- React functional + hooks only
- Tailwind CSS, Tesla dark theme (#0a0a0a, #1a1a2e)
- Git branch: `feature/onlyssam-[task]`
- Commit: `⌨️ feat(onlyssam): desc` / `🔗 chore(onlyssam): desc`
- Deploy: Frontend → Vercel, Edge Functions → Supabase, DB → Supabase PostgreSQL
