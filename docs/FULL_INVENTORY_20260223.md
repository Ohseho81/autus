# AUTUS 전체 인벤토리 — 현시점 완전 조사

> **조사일**: 2026-02-23
> **방법**: Supabase MCP 직접 쿼리 + 로컬 파일시스템 전수 스캔
> **프로젝트**: Supabase `pphzvnaedmzcvpxjulti`

---

## 1. 숫자 요약

| 자산 | 수량 |
|------|------|
| DB 테이블 (public) | **123개** |
| DB 함수 (public) | **42개** |
| DB 뷰 (public) | **23개** |
| Edge Functions | **27개** |
| pg_cron 스케줄 | **10개** |
| Vercel cron 라우트 | **3개** |
| Vercel API 라우트 (route.ts) | **86개** |
| 프론트엔드 페이지 디렉토리 | **30+개** |
| 프론트엔드 컴포넌트 그룹 | **24개** |

---

## 2. DB 테이블 — 도메인별 분류 (123개)

### 온리쌤/AUTUS 공통 (96개)

#### 핵심 엔티티 (조직/사용자/학생)
- organizations, users, students, academies, app_members, apps
- invitations, sms_verifications, sovereign_identities

#### 출결 시스템
- attendance, attendance_log, attendance_records, attendance_sessions, attendance_confirmations

#### 수업/스케줄
- class_definitions, class_logs, lesson_slots, schedules, programs
- makeup_classes, makeup_compatibility_rules, holidays

#### 계약/결제
- contracts, invoices, payments, billing_transactions, payment_outcomes
- bad_debt_records, commissions, coach_incentives

#### 성장 추적 (Navigation v2)
- student_roadmaps, student_sessions, focus_words
- evaluations, skill_tests, homework, result_logs
- goal_adjustment_log, goal_change_log, stage_progress_log, level_upgrade_events

#### 상담/트리거
- consultations, consultation_trigger_log, consultation_open_log
- counseling_queue, parent_feedback, parent_view_log

#### 메시징 파이프라인
- message_outbox, message_log, message_templates, message_variants
- kakao_outbox, kakao_delivery_log, kakao_tokens, kakao_webhook_log
- kakao_channel_friends, kakao_channel_posts
- notification_log, notifications, monthly_summary_sent_log

#### AUTUS 물리 엔진 / V-Index
- autus_nodes, autus_relationships, canonical_events
- ranking_scores, customer_temperatures, delta_log, retention_events

#### 자동화/운영
- automation_logs, automation_rules
- ops_action_queue_v02, ops_action_log, ops_center_policy_v01, ops_policy_change_log
- score_pay7_v02, decision_log, decision_queue, kernel_decision_log
- escalation_log, trigger_log, vscan_events, vscan_sessions

#### 전자서명/동의
- signature_requests, signature_events, signature_packages, signature_provider_configs
- signed_documents, consent_records, consent_link_events

#### 팩토리/확장
- factory_domain_configs, factory_generated_artifacts
- sid_data_index, account_deletion_requests

#### 외부 연동
- integration_health, integration_runs, webhook_inbox
- chatbot_sessions, startup_chat_logs

#### 감사/로그
- audit_logs, events, schedule_change_events

### 숙제 시스템 — sw_* (12개)
- sw_users, sw_items, sw_homeworks, sw_homework_assets, sw_submissions
- sw_entitlements, sw_purchase_requests, sw_parent_links
- sw_growth_snapshots, sw_auto_solutions
- sw_verification_runs, sw_verification_steps

### 시설관리 — zf_* (5개)
- zf_facilities, zf_daily_checks, zf_monthly_reports, zf_bills, zf_qr_codes

### 올댓바스켓 — atb_* (5개)
- atb_coaches, atb_enrollments, atb_interventions, atb_qr_codes, atb_tasks

### 뷰티 (0개 테이블 — Edge Function만 존재)
- DB 테이블 아직 미생성, Edge Function 7개가 먼저 배포됨

---

## 3. DB 함수 — 용도별 분류 (42개)

### AUTUS 핵심 연산
- `calculate_autus_a` — A값 (관계 가속도) 계산
- `measure_autus_sigma` — σ (시너지) 측정
- `get_autus_sigma_grade` — σ 등급 반환
- `calculate_churn_risk` — 이탈 위험도 계산
- `record_immortal_event` — canonical_events에 불변 이벤트 기록
- `set_event_sequence_num` — 이벤트 시퀀스 번호 설정

### Pay7 스코어링 (미수금 운영)
- `batch_score_pay7` — 미수금 스코어 일괄 계산
- `batch_fill_action_queue` — 액션 큐 일괄 채우기
- `get_billing_tier` — 결제 등급 반환

### 카카오 메시징
- `claim_kakao_outbox` — 카카오 발송 대기열 클레임
- `update_kakao_outbox_failure` — 카카오 발송 실패 업데이트

### 인증/권한
- `clerk_user_id` — Clerk JWT에서 user_id 추출
- `get_member_role` — 멤버 역할 조회
- `get_session_org_id` — 세션의 org_id 조회
- `get_user_org_ids` — 사용자 소속 org 목록
- `is_org_member` — org 멤버 여부 확인

### 출결/수업
- `record_presence_with_legacy` — 출석 기록 (레거시 호환)
- `create_encounter_with_legacy` — 상담 기록 (레거시 호환)
- `confirm_makeup_slot_atomic` — 보강 슬롯 원자적 확정

### 성장/AI
- `create_personal_ai` — 개인 AI 프로필 생성
- `backfill_personal_ai` — AI 프로필 일괄 백필
- `update_ai_growth` — AI 성장 데이터 업데이트
- `update_organism_status` — 유기체 상태 업데이트

### SID 인덱싱 (자동 트리거)
- `auto_index_attendance` — 출결 시 자동 인덱싱
- `auto_index_counseling` — 상담 시 자동 인덱싱
- `auto_index_makeup` — 보강 시 자동 인덱싱
- `auto_index_result_log` — 결과 로그 시 자동 인덱싱

### 유틸리티/트리거
- `fn_audit_trigger` — 감사 로그 트리거
- `fn_update_timestamp` — 업데이트 타임스탬프
- `fn_validate_payment` — 결제 유효성 검증
- `check_standardization` — 표준화 검사
- `standardize_repetition` — 반복 표준화
- `update_package_on_sign` — 서명 시 패키지 업데이트
- `update_solution_stats` — 솔루션 통계 업데이트
- `update_updated_at` / `update_updated_at_column` — 범용 타임스탬프
- `onlyssam_update_timestamp` — 온리쌤 전용 타임스탬프
- 기타 5개 도메인별 updated_at 트리거

---

## 4. DB 뷰 — 용도별 분류 (23개)

### 올댓바스켓 레거시 뷰 (7개)
- `atb_attendance`, `atb_classes`, `atb_monthly_payments`, `atb_payments`
- `atb_student_dashboard`, `atb_students`, `atb_today_attendance`

### Pay7 운영 뷰 (7개)
- `feat_score_input_v02` — 스코어 입력 피처
- `feat_member_agg_v02` — 멤버 집계 피처
- `feat_absent_streak` — 연속 결석
- `feat_num_overdue_last_90d` — 90일 연체 건수
- `feat_overdue_now` — 현재 연체
- `feat_paid_on_time_rate_180d` — 180일 정시 납부율
- `label_pay7` — Pay7 라벨

### 운영 대시보드 뷰 (5개)
- `ops_action_with_pay7` — Pay7 포함 액션
- `ops_action_recovered_amount_7d` — 7일 회수 금액
- `ops_daily_report_v01` — 일일 리포트
- `ops_daily_report_7dma` — 7일 이동평균
- `ops_tuning_suggest_v01` — 튜닝 제안

### 재무/인보이스 (1개)
- `core_invoice_balance` — 인보이스 잔액

### 전자서명/워크플로우 (3개)
- `v_signature_status` — 서명 상태
- `v_unprocessed_webhooks` — 미처리 웹훅
- `v_workflow_success_rate_24h` — 24시간 워크플로우 성공률

---

## 5. Edge Functions — 도메인별 분류 (27개)

### 온리쌤 핵심 (14개)
| 함수 | 용도 | JWT 검증 |
|------|------|----------|
| chat-ai | AI 챗봇 | ✅ |
| attendance-check | 출결 체크 | ✅ |
| invoice-generate | 인보이스 생성 | ✅ |
| overdue-check | 연체 체크 | ✅ |
| notification-dispatch | 알림 발송 | ✅ |
| growth-report | 성장 리포트 | ✅ |
| contract-expire | 계약 만료 처리 | ✅ |
| escalation-batch | 에스컬레이션 배치 | ✅ |
| event-replay | 이벤트 리플레이 | ✅ |
| payment-webhook | 결제 웹훅 수신 | ❌ |
| kakao-webhook-receiver | 카카오 웹훅 수신 | ❌ |
| message-sender | 메시지 발송 | ❌ |
| message-worker | 메시지 워커 | ❌ |
| automation-engine | 자동화 엔진 | ❌ |

### 뷰티(미용실) (7개)
| 함수 | 용도 | JWT 검증 |
|------|------|----------|
| beauty-reservation-check | 예약 확인 | ✅ |
| beauty-commission-calc | 수수료 계산 | ✅ |
| beauty-noshow-processor | 노쇼 처리 | ❌ |
| beauty-revisit-predictor | 재방문 예측 | ❌ |
| beauty-membership-billing | 멤버십 빌링 | ❌ |
| beauty-reminder-sender | 리마인더 발송 | ❌ |
| beauty-daily-settlement | 일일 정산 | ❌ |

### 공통/인프라 (6개)
| 함수 | 용도 | JWT 검증 |
|------|------|----------|
| telegram-webhook | 몰트봇 텔레그램 웹훅 | ❌ |
| kakao-send | 카카오 알림톡 발송 | ✅ |
| signature-request | 전자서명 요청 | ✅ |
| moodusign-webhook | 무두사인 웹훅 | ❌ |
| consent-link | 동의 링크 생성 | ❌ |
| evidence-package | 증빙 패키지 생성 | ✅ |

---

## 6. 자동화 스케줄 — pg_cron (10개) + Vercel cron (3개)

### pg_cron (10개 활성)

| ID | 이름 | 스케줄 | 동작 |
|----|------|--------|------|
| 1 | monthly-invoice-generate | 매월 1일 0시 | Edge: invoice-generate 호출 |
| 3 | notification-dispatch | 10분마다 | Edge: notification-dispatch 호출 |
| 4 | daily-pay7-score-batch | 매일 21시 | DB: batch_score_pay7() 실행 |
| 5 | daily-pay7-queue-fill | 매일 21:30 | DB: batch_fill_action_queue() 실행 |
| 6 | daily-overdue-check | 매일 0시 | Edge: overdue-check 호출 |
| 7 | daily-escalation-batch | 매일 1시 | Edge: escalation-batch 호출 |
| 8 | daily-contract-expire | 매일 23시 | Edge: contract-expire 호출 |
| 17 | mark-overdue-invoices | 매일 0시 | SQL: 연체 인보이스 상태 변경 |
| 18 | check-expiring-contracts | 매주 월요일 9시 | SQL: 30일 내 만료 계약 로깅 |
| 19 | cleanup-old-notifications | 매일 8시 | SQL: 90일 지난 message_outbox 삭제 |

### Vercel cron (3개)

| 라우트 | 용도 |
|--------|------|
| /api/cron/pre-attendance | 사전 출결 준비 |
| /api/cron/consultation-trigger | 상담 트리거 배치 |
| /api/cron/monthly-report | 월간 리포트 생성 |

---

## 7. Vercel API 라우트 — 도메인별 분류 (86개)

### AUTUS 코어 (16개)
- `/api/autus/nodes` — 노드 관리
- `/api/autus/relationships` — 관계 관리
- `/api/autus/calculate` — V-Index 계산
- `/api/autus/lambda` — λ(시간가치) 조회
- `/api/autus/sigma-history` — σ(시너지) 히스토리
- `/api/autus/sigma-proxy` — σ 프록시
- `/api/autus/dashboard` — AUTUS 대시보드
- `/api/autus/alerts` — 알림
- `/api/autus/behavior` — 행동 분석
- `/api/autus/time-logs` — 시간 기록
- `/api/autus/assets` — 자산
- `/api/autus/efficiency` — 효율성
- `/api/autus/value` — 가치 조회
- `/api/physics` — 물리 엔진
- `/api/time-value` — 시간 가치
- `/api/audit/value` — 가치 감사

### V1 뷰 API (11개 — 온리쌤 대시보드)
- `/api/v1/cockpit` — 콕핏(메인 대시보드)
- `/api/v1/radar` — 레이더(고객 레이더)
- `/api/v1/radar/monitor` — 레이더 모니터
- `/api/v1/score` — 스코어
- `/api/v1/tide` — 타이드(트렌드)
- `/api/v1/crystal` — 크리스탈(예측)
- `/api/v1/heartbeat` — 하트비트(실시간)
- `/api/v1/weather` — 날씨(상태)
- `/api/v1/microscope` — 마이크로스코프(상세)
- `/api/v1/network` — 네트워크(관계도)
- `/api/v1/map` — 맵(지도)
- `/api/v1/funnel` — 퍼널(전환)
- `/api/v1/agent` — 에이전트(자동화)
- `/api/v1/automation` — 자동화

### 성장 추적 (3개)
- `/api/growth/state` — 성장 상태 조회
- `/api/growth/session` — 성장 세션
- `/api/growth/report` — 성장 리포트

### 메시징/카카오 (6개)
- `/api/messaging/send` — 메시지 발송
- `/api/messaging/worker` — 메시지 워커
- `/api/messaging/monthly-report` — 월간 리포트 메시지
- `/api/messaging/safety` — 안전 체크
- `/api/kakao/callback` — 카카오 OAuth 콜백
- `/api/kakao/worker` — 카카오 워커

### 인증 (2개)
- `/api/auth/verify` — JWT 검증
- `/api/auth/approval-code` — 승인 코드

### 목표/리스크 (4개)
- `/api/goals` — 목표 CRUD
- `/api/goals/trajectory` — 목표 궤도
- `/api/goals/auto-plan` — 자동 플랜
- `/api/risks` — 리스크 조회

### 운영/워커 (5개)
- `/api/workers/risk-detection` — 리스크 감지 워커
- `/api/workers/action-queue` — 액션 큐 워커
- `/api/action/dispatch` — 액션 디스패치
- `/api/execute` — 실행
- `/api/quick-tag` — 퀵 태그

### 몰트봇/텔레그램 (3개)
- `/api/moltbot` — 몰트봇 API
- `/api/moltbot/webhook` — 몰트봇 웹훅
- `/api/telegram/webhook` — 텔레그램 웹훅

### 외부 연동 (7개)
- `/api/sync/narakhub` — NarakHub 동기화
- `/api/sync/classting` — 클래스팅 동기화
- `/api/sync/all` — 전체 동기화
- `/api/erp/smartfit` — SmartFit ERP
- `/api/webhook/n8n` — n8n 웹훅
- `/api/webhooks/payssam` — 페이쌤 결제 웹훅
- `/api/consent` — 동의 관리

### 분석/감사 (5개)
- `/api/audit/physics` — 물리 감사
- `/api/audit/perception` — 인지 감사
- `/api/metrics` — 메트릭
- `/api/leaderboard` — 리더보드
- `/api/churn` — 이탈 분석

### AI/뇌 (3개)
- `/api/brain` — 브레인 (AI 허브)
- `/api/brain/script` — AI 스크립트
- `/api/brain/v-pulse` — V-Pulse

### 기타 (11개)
- `/api/health` — 헬스체크
- `/api/message` — 메시지
- `/api/notify` — 알림
- `/api/invite` — 초대
- `/api/calendar` — 캘린더
- `/api/report/generate` — 리포트 생성
- `/api/organisms` — 유기체
- `/api/pilot` — 파일럿
- `/api/global/consolidate` — 글로벌 통합
- `/api/monopoly` — 모노폴리
- `/api/consensus` — 합의
- `/api/shield/activate` — 쉴드 활성화
- `/api/neural/vectorize` — 벡터화
- `/api/geo` — 지오

### Cron (3개)
- `/api/cron/pre-attendance` — 사전 출결
- `/api/cron/consultation-trigger` — 상담 트리거
- `/api/cron/monthly-report` — 월간 리포트

---

## 8. 프론트엔드 (kraton-v2) — 구조

### 기술 스택
- Vite + React (JSX, non-TypeScript)
- Tailwind CSS
- 정적 빌드 → Vercel 서빙

### 메인 앱 파일 (src/)
- `App.jsx` — 메인 라우터
- `AUTUSFinal.jsx`, `AUTUSInternal.jsx`, `AUTUSUniversal.jsx` — AUTUS 버전별 뷰
- `AllThatBasket.jsx` — 올댓바스켓 전용
- `ProcessHub.jsx` — 프로세스 허브
- `ProcessMapV9~V13.jsx` — 프로세스 맵 반복 버전

### 페이지 디렉토리 (src/pages/) — 30+개
| 디렉토리 | 역할 |
|----------|------|
| dashboard | 메인 대시보드 |
| autus | AUTUS 코어 뷰 |
| analytics | 분석 |
| audit | 감사 |
| acceleration | 가속 |
| actuation | 액추에이션 |
| c-level | C레벨 뷰 |
| fsd | FSD |
| global | 글로벌 |
| mirror | 미러 |
| monopoly | 모노폴리 게임 |
| notifications | 알림 |
| optimus | 옵티머스 |
| owner | 원장 뷰 |
| pipeline | 파이프라인 |
| principal | 교장 뷰 |
| retention | 리텐션 |
| script | 스크립트 |
| teacher | 교사 뷰 |
| time-value | 시간 가치 |
| v-engine | V-엔진 |
| viral | 바이럴 |
| ui | UI 컴포넌트 |

### 단독 페이지 파일
- `LiveDashboard.jsx` — 라이브 대시보드
- `MoltBotChat.jsx` — 몰트봇 채팅
- `FeedbackPage.jsx` — 피드백
- `AUTUSNav.jsx` — 내비게이션

### 컴포넌트 그룹 (src/components/) — 24개
agent, allthatbasket, attendance, auth, autus, autus-ai, calendar, cards, consensus, dashboard, feedback, kraton, ledger, messages, parent, profile, settings, solar, strategy, student, timeline + 기타

### 코어 모듈 (src/autus-core/)
- `engine/` — 물리 엔진 로직
- `rules/` — 비즈니스 룰
- `brand/` — 브랜드 에셋

---

## 9. 배포 인프라

| 서비스 | 플랫폼 | 역할 | URL |
|--------|--------|------|-----|
| 프론트엔드 + API | Vercel | kraton-v2 + vercel-api | vercel-2fwqnod3d-ohsehos-projects.vercel.app |
| 메인 사이트 | Vercel | autus-ai.com | autus-ai.com |
| DB | Supabase | PostgreSQL + Edge Functions | pphzvnaedmzcvpxjulti |
| 레거시 백엔드 | Railway | FastAPI (점진적 제거 대상) | - |
| 텔레그램 봇 | Supabase Edge | 몰트봇 | t.me/autus_seho_bot |

---

## 10. 프로덕트별 완성도

### 온리쌤 (학원 관리) — 80%
- DB: 96 테이블 ✅
- Edge Functions: 14개 ✅
- API: 86개 라우트 (대부분 온리쌤용) ✅
- pg_cron: 10개 활성 ✅
- 프론트엔드: 대시보드 라이브 ✅
- **미완**: 카카오 알림톡 외부 연동, 성장 추적 UI 연결

### 뷰티 (미용실) — 30%
- DB: 0 테이블 (미생성)
- Edge Functions: 7개 ✅
- API: 0개 (전용 라우트 없음)
- 프론트엔드: 없음
- **미완**: 스펙 문서, DB 테이블, API, UI 전부

### 올댓바스켓 (체육학원) — 레거시
- DB: 5 테이블 + 7 뷰
- 프론트엔드: AllThatBasket.jsx 존재
- **방향**: 온리쌤으로 흡수/전환 대상

### 숙제 시스템 (sw_*) — 모듈
- DB: 12 테이블
- **방향**: 온리쌤 확장 모듈

### 시설관리 (zf_*) — 모듈
- DB: 5 테이블
- **방향**: 온리쌤 확장 모듈

---

## 11. 금일 수정 사항 (2026-02-23)

1. **V-Index 이중 공식 체계** — CLAUDE.md에 이론/실행 공식 모두 명시
2. **CONSTITUTION.md v2.0 개정** — Cloud-Managed, 멀티 프로덕트 원칙 추가
3. **customer_temperatures 테이블 생성** — Supabase 마이그레이션 적용
4. **DEVELOPMENT_STATUS.md 전면 갱신** — 멀티 프로덕트 구조, 최신 진행률
5. **CLAUDE.md Overview 갱신** — 5개 프로덕트 명시
6. **AUTUS_ONLYSSAM_REALITY_CHECK.md 작성** — 6건 불일치 분석/해결

---

**이 문서는 2026-02-23 시점의 실제 인프라를 DB 직접 조회 + 파일시스템 스캔으로 확인한 것입니다.**
