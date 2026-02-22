# 온리쌤 런타임 오류 점검 리포트

**날짜**: 2026-02-22
**프로젝트**: AUTUS / 온리쌤 (pphzvnaedmzcvpxjulti)
**상태**: 배포 완료 → 런타임 오류 수정 단계

---

## 수정 완료 (Critical)

### 1. pg_cron job 9~16 — JSON parse 에러 (5분마다 반복)
- **증상**: `invalid input syntax for type json` 에러가 5분 간격으로 발생
- **원인**: job 9~16이 존재하지 않는 `cron-handler` Edge Function을 호출. `current_setting('app.settings.service_role_key', true)`가 NULL 반환 → NULL과 문자열 결합 → jsonb 캐스팅 실패
- **조치**: `cron.unschedule(9)` ~ `cron.unschedule(16)` 실행하여 8개 job 비활성화
- **결과**: Postgres 에러 로그 완전 정리됨

### 2. RLS 미적용 테이블 3개 — 보안 취약점
- **대상**: `message_templates`, `academies`, `message_variants`
- **조치**: migration `enable_rls_messaging_tables` 적용
  - RLS 활성화
  - SELECT → public read 허용
  - INSERT/UPDATE/DELETE → service_role 전용
- **결과**: 3개 테이블 보안 적용 완료

### 3. SECURITY DEFINER 뷰 7개 → SECURITY INVOKER 전환
- **대상**: `atb_attendance`, `atb_classes`, `atb_monthly_payments`, `atb_payments`, `atb_student_dashboard`, `atb_students`, `atb_today_attendance`
- **위험**: SECURITY DEFINER 뷰는 RLS를 우회하여 뷰 소유자 권한으로 실행됨
- **조치**: migration `fix_security_definer_views` 적용 → `security_invoker = on`
- **결과**: 7개 뷰 모두 호출자 권한으로 전환

---

## 현재 정상 동작 중인 pg_cron (10개)

| Job | 이름 | 스케줄 | 동작 |
|-----|------|--------|------|
| 1 | monthly-invoice-generate | 매월 1일 00:00 | Edge: invoice-generate |
| 3 | notification-dispatch | 10분마다 | Edge: notification-dispatch |
| 4 | daily-pay7-score-batch | 매일 21:00 | DB 함수: batch_score_pay7() |
| 5 | daily-pay7-queue-fill | 매일 21:30 | DB 함수: batch_fill_action_queue() |
| 6 | daily-overdue-check | 매일 00:00 | Edge: overdue-check |
| 7 | daily-escalation-batch | 매일 01:00 | Edge: escalation-batch |
| 8 | daily-contract-expire | 매일 23:00 | Edge: contract-expire |
| 17 | mark-overdue-invoices | 매일 00:00 | SQL: invoices 연체 처리 |
| 18 | check-expiring-contracts | 매주 월 09:00 | SQL: 만료 임박 계약 로깅 |
| 19 | cleanup-old-notifications | 매일 08:00 | SQL: 90일 이상 message_outbox 삭제 |

---

## 미해결 (Non-Critical)

### A. Security Advisory — 과도하게 열린 RLS 정책 (28건 WARN)
- `atb_coaches`, `atb_enrollments`, `atb_interventions` 등 온리쌤(atb_*) 테이블들에 `USING(true)` 기반 ALL 정책 존재
- `sw_*` (숙제/과제 관련), `zf_*` (시설관리 관련) 테이블들도 INSERT에 `WITH CHECK(true)` 사용
- **권장**: 프로덕션 안정 후 org_id 기반 정책으로 단계적 전환

### B. Function Search Path Mutable (2건 WARN)
- `update_student_sessions_updated_at`
- `update_factory_domain_configs_updated_at`
- **권장**: `SET search_path = public` 추가

### C. customer_temperatures 404 (Railway 백엔드)
- `backend/routers/views_api.py`에서 존재하지 않는 `customer_temperatures` 테이블 참조
- Vercel API 쪽은 mock fallback 존재하나, Railway 백엔드는 그대로 404 반환
- **권장**: Railway 코드에서 해당 endpoint 제거 또는 테이블 생성

### D. TypeScript 에러 258개 (기존)
- vercel-api 28개 파일에 기존 타입 에러 잔존 (audit, brain, report 등 레거시 라우트)
- 새로 작성한 Phase 1 파일들은 에러 없음
- **권장**: 레거시 라우트 점진적 타입 수정

### E. Git 상태
- **로컬 2 커밋 미푸시**: Phase 1 코드 + messaging 타입 수정
- **미스테이징 변경 7개 파일**: dispatch/route.ts, perception/route.ts, send/route.ts, next.config.js, package.json 등
- **미추적 파일**: docs/, scripts/, supabase/migrations/ 하위 파일들
- **필요 조치**: 로컬 터미널에서 `git push origin main` 실행

---

## Vercel Cron (vercel.json에 등록됨)

| 경로 | 스케줄 | 용도 |
|------|--------|------|
| /api/kakao/worker | 5분마다 | 카카오 알림톡 발송 워커 |
| /api/cron/pre-attendance | 30분마다 | 수업 전 출석 확인 메시지 |
| /api/cron/consultation-trigger | 매일 09:00 | 상담 트리거 점검 |
| /api/cron/monthly-report | 매월 28~31일 10:00 | 월간 성장 리포트 |

---

## 요약

| 구분 | 건수 | 상태 |
|------|------|------|
| Critical 수정 | 3건 | 완료 |
| 정상 cron job | 10개 | 확인 |
| Security WARN | 28건 | 모니터링 (non-blocking) |
| 레거시 TS 에러 | 258개 | 점진적 수정 예정 |
| Git 미푸시 | 2커밋 | 로컬에서 push 필요 |
