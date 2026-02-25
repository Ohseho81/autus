# AUTUS 개발 현황 종합 리포트

**날짜:** 2026-02-25
**프로젝트:** autus-ai.com (Vercel) + Supabase `pphzvnaedmzcvpxjulti` (ap-northeast-2)

---

## 1. 인프라 현황

### 1-1. Supabase DB
| 항목 | 수치 |
|------|------|
| 테이블 (public) | **148개** (core 131 + sw 12 + zf 5) |
| 마이그레이션 | **144건** (2/14 ~ 2/25) |
| DB 크기 | ~43MB |
| RLS | 전체 활성화 |

### 1-2. Edge Functions (38개)

**온리쌤 코어 (14개)**
| 함수 | 버전 | JWT | 역할 |
|------|------|-----|------|
| attendance-check | v2 | O | 출석 체크 처리 |
| attendance-response | v2 | X | 출석 응답 (학부모) |
| send-attendance-reminder | v1 | O | 출석 리마인더 발송 |
| send-class-result | **v2** | O | 수업 결과 발송 (cron) |
| notification-dispatch | **v4** | O | 알림 발송 (cron, batch/single) |
| notification-scheduler | v1 | X | 알림 스케줄링 |
| invoice-generate | v2 | O | 인보이스 생성 |
| overdue-check | v2 | O | 미수금 체크 |
| contract-expire | v1 | O | 계약 만료 체크 |
| escalation-batch | v1 | O | 에스컬레이션 배치 |
| coach-result-submit | v4 | O | 코치 결과 제출 |
| aggregate-metrics | v1 | O | 메트릭 집계 |
| growth-report | v1 | O | 성장 리포트 |
| event-replay | v1 | O | 이벤트 리플레이 |

**메시징 (6개)**
| 함수 | 버전 | JWT | 역할 |
|------|------|-----|------|
| kakao-send | v2 | O | 카카오 알림톡 발송 |
| kakao-webhook-receiver | v2 | X | 카카오 웹훅 수신 |
| message-sender | v1 | X | 메시지 발송 엔진 |
| message-worker | v1 | X | 메시지 워커 |
| template-manager | v2 | X | 템플릿 관리 |
| telegram-webhook | v1 | X | 몰트봇 텔레그램 웹훅 |

**계약/증빙 (5개)**
| 함수 | 버전 | JWT | 역할 |
|------|------|-----|------|
| signature-request | v1 | O | 전자서명 요청 |
| moodusign-webhook | v1 | X | 무두사인 웹훅 |
| consent-link | v1 | X | 동의 링크 |
| evidence-package | v1 | O | 증빙 패키지 |
| proof-anchor / proof-generator | v3/v1 | O | 증명 앵커링 |

**뷰티 도메인 (7개)**
| 함수 | 버전 | JWT | 역할 |
|------|------|-----|------|
| beauty-reservation-check | v1 | O | 예약 확인 |
| beauty-commission-calc | v1 | O | 수수료 계산 |
| beauty-noshow-processor | v1 | X | 노쇼 처리 |
| beauty-revisit-predictor | v1 | X | 재방문 예측 |
| beauty-membership-billing | v1 | X | 멤버십 빌링 |
| beauty-reminder-sender | v1 | X | 리마인더 발송 |
| beauty-daily-settlement | v1 | X | 일일 정산 |

**기타 (6개)**
| 함수 | 버전 | 역할 |
|------|------|------|
| chat-ai | v2 | AI 챗봇 |
| automation-engine | v1 | 자동화 엔진 |
| payment-webhook | v1 | 결제 웹훅 |
| makeup-booking | v1 | 보강 예약 |
| verify-page | v1 | 검증 페이지 |

### 1-3. Cron Jobs (14개 활성)
| Job ID | 이름 | 주기 | 상태 |
|--------|------|------|------|
| 1 | monthly-invoice-generate | 매월 1일 00:00 | active |
| 3 | notification-dispatch | **10분마다** | **succeeded** |
| 4 | daily-pay7-score-batch | 매일 21:00 | active |
| 5 | daily-pay7-queue-fill | 매일 21:30 | active |
| 6 | daily-overdue-check | 매일 00:00 | active |
| 7 | daily-escalation-batch | 매일 01:00 | active |
| 8 | daily-contract-expire | 매일 23:00 | active |
| 17 | mark-overdue-invoices | 매일 00:00 | active |
| 18 | check-expiring-contracts | 매주 월 09:00 | **fixed** |
| 19 | cleanup-old-notifications | 매일 08:00 | active |
| 24 | daily-proof-anchor-build | 매일 15:00 | active |
| 25 | daily-proof-anchor-l2 | 매일 15:05 | active |
| 26 | daily-attendance-reminder | 매일 12:00 | active |
| 27 | send-class-result-batch | **10분마다** | **succeeded** |

---

## 2. 데이터 현황

### 2-1. 주요 테이블 데이터량
| 테이블 | 건수 | 비고 |
|--------|------|------|
| audit_logs | 4,819 | 시스템 감사 로그 |
| events | 1,005 | 이벤트 레저 |
| **students** | **802** | **694명 active** (온리쌤 아카데미) |
| invoices | 116 | 인보이스 |
| attendance | 52 | 출석 기록 |
| automation_logs | 50 | 자동화 실행 로그 |
| contracts | 14 | 계약서 |
| schedules | 13 | 수업 스케줄 |
| evaluations | 12 | 평가 |
| app_members | 10 | 조직 멤버 |
| class_logs | 7 | 수업 로그 |
| organizations | 6 | 조직 (정리 후) |
| consultations | 6 | 상담 |

### 2-2. 미사용/빈 테이블 (구현 대기)
notifications(0), payments(0), kakao_outbox(0), consent_records(0), proof_records(0), signature_requests(0), class_definitions(0)

---

## 3. 프론트엔드 현황

### 3-1. 빌드 검증 (최신)
| 항목 | 결과 |
|------|------|
| `next build` | exit 0 성공 |
| Dev server | Ready in 1135ms |
| `/onlyssam` 페이지 | 200 OK, 컴파일 정상 |
| `/api/onlyssam/onboarding` | 405 (POST 전용, 정상) |
| 서버 에러 | 0건 |
| `useAuth.ts` 컴파일 | 에러 없음 |
| DB 마이그레이션 | 2건 적용 성공 |
| Preview 빈 화면 | Clerk 인증 리다이렉트 (정상 동작) |

### 3-2. 라우트 현황
| 라우트 | 상태 | UI 구현 | 데이터 연동 |
|--------|------|---------|------------|
| `/dashboard` | OK | AUTUS 메인, 서비스 카드 | 부분 (매출/자동화율 0) |
| `/onlyssam` | OK | 대시보드 (매출/미수금/출석/직원/상담/이탈위험) | **데이터 0 (org 선택 버그)** |
| `/onlyssam/students` | OK | 학생 목록/필터/상태탭/일괄등록 | **데이터 0** |
| `/onlyssam/attendance` | OK | 출석체크/관찰/통계/정정 4탭 | **데이터 0** |
| `/onlyssam/schedule` | OK | 주간/월간 시간표 그리드 | **데이터 0** |
| `/onlyssam/billing` | OK | 인보이스/수납리포트/환불 | **데이터 0** |
| `/onlyssam/more` | **404** | 미구현 | - |
| `/facility` | 미확인 | Zero Facility | - |
| `/factory` | 미확인 | 앱 팩토리 | - |

### 3-3. 인증 체계
- **Clerk** → 프론트엔드 인증 (user_id: `user_39hJ1k6oB378zjN8sWfDCLHjAkR`)
- **Supabase Auth** → DB 레벨 (UUID: `818362c0-...`)
- `app_members.user_id` (text) → 두 ID 형식 혼재

---

## 4. 제품별 개발 완성도

### 4-1. 온리쌤 (학원관리) - **70% 완성**

| 기능 영역 | DB/Backend | Edge Function | Frontend UI | 데이터 연동 | 완성도 |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **학생 관리** | students(802) + 50컬럼 | - | 목록/필터/등록 | org 버그 | 85% |
| **출석 관리** | attendance(52) + qr_tokens + sessions | attendance-check v2, attendance-response v2 | 4탭 UI | org 버그 | 80% |
| **수납/결제** | invoices(116) + payments(0) | invoice-generate v2, overdue-check v2 | 인보이스/리포트 | org 버그 | 60% |
| **계약 관리** | contracts(14) + signatures | signature-request, consent-link, evidence-package | - | - | 50% |
| **스케줄** | schedules(13) + lesson_slots + class_definitions(0) | - | 주간/월간 그리드 | org 버그 | 50% |
| **알림/메시징** | message_outbox(1) + kakao_outbox(0) + templates | notification-dispatch v4, kakao-send v2, send-class-result v2 | - | 파이프라인 동작 | 40% |
| **상담** | consultations(6) + counseling_queue | - | - | - | 30% |
| **코치/평가** | evaluations(12) + class_logs(7) + skill_tests | coach-result-submit v4 | - | - | 40% |
| **리텐션** | retention_events + risk_assessments + risk_interventions | escalation-batch v1 | 이탈위험 표시 | - | 30% |
| **보강** | makeup_bookings + makeup_classes + compatibility_rules | makeup-booking v1 | - | - | 30% |
| **성장 리포트** | student_roadmaps + student_portfolios + badges | growth-report v1, proof-anchor v3 | - | - | 25% |
| **Pay7 (수납 예측)** | score_pay7_v02 + ops_action_queue | daily-pay7-score-batch cron | - | cron 동작 | 30% |
| **학부모 포탈** | parent_feedback + parent_view_log | - | - | - | 10% |

### 4-2. 뷰티 (미용실) - **15% 완성**

| 기능 영역 | DB | Edge Function | Frontend | 완성도 |
|-----------|:---:|:---:|:---:|:---:|
| 예약 관리 | - (테이블 미생성) | beauty-reservation-check v1 | - | 15% |
| 수수료 계산 | commissions(0) | beauty-commission-calc v1 | - | 15% |
| 노쇼 처리 | - | beauty-noshow-processor v1 | - | 10% |
| 재방문 예측 | customer_temperatures(0) | beauty-revisit-predictor v1 | - | 10% |
| 멤버십 | - | beauty-membership-billing v1 | - | 10% |
| 리마인더 | - | beauty-reminder-sender v1 | - | 10% |
| 일일 정산 | - | beauty-daily-settlement v1 | - | 10% |

> **주의:** beauty_ 접두사 테이블이 0개 — Edge Function만 배포된 상태. DB 스키마 마이그레이션 필요.

### 4-3. 올댓바스켓 (체육학원) - **25% 완성**
| 항목 | 상태 |
|------|------|
| DB 테이블 | atb_coaches, atb_enrollments, atb_interventions, atb_qr_codes, atb_tasks |
| Edge Function | - |
| Frontend | /onlyssam 공유 (온리쌤과 동일 구조) |

### 4-4. 숙제 (sw_*) - **20% 완성**
| 항목 | 상태 |
|------|------|
| DB 테이블 | 12개 (sw_homeworks, sw_submissions, sw_users, sw_verification_* 등) |
| Edge Function | - |
| Frontend | - |

### 4-5. 시설관리 (zf_*) - **15% 완성**
| 항목 | 상태 |
|------|------|
| DB 테이블 | 5개 (zf_facilities, zf_bills, zf_daily_checks, zf_monthly_reports, zf_qr_codes) |
| Edge Function | - |
| Frontend | /facility (미확인) |

### 4-6. AUTUS 플랫폼 - **30% 완성**
| 기능 | 상태 |
|------|------|
| 멀티테넌트 | organizations + app_members 구조 완성 |
| Event Ledger | events(1005) + canonical_events 동작 중 |
| V-Index (Physics Engine) | autus_nodes + autus_relationships 테이블 존재, 로직 미구현 |
| 자동화 엔진 | automation-engine v1 + automation_rules + automation_logs(50) |
| 몰트봇 | telegram-webhook v1 + moltbot_conversations/messages |
| AI 챗봇 | chat-ai v2 + chatbot_sessions + startup_chat_logs |
| 팩토리 | factory_domain_configs + factory_generated_artifacts |
| 증명/감사 | proof_records + proof_anchors + cron (daily-proof-anchor) |

---

## 5. 금일 수정 완료 사항

| # | 항목 | Before | After |
|---|------|--------|-------|
| 1 | send-class-result | v1 → 500 에러 | v2 → 200 OK |
| 2 | notification-dispatch | v2 → 400 에러 | v4 → 200 OK |
| 3 | cron #18 (check-expiring-contracts) | SQL 에러 (`description` 컬럼) | `details` jsonb로 수정 |
| 4 | RLS 보안 | 3개 테이블 anon UPDATE 오픈 | 정책 제한/제거 |
| 5 | 중복 org 정리 | 올댓바스켓 36개 | 마이그레이션으로 정리 |

---

## 6. 남은 핵심 이슈 (우선순위)

### P0 - 즉시 수정
1. **프론트엔드 org 선택 로직** — Clerk user가 다중 org 멤버일 때 올댓바스켓(0명) 대신 온리쌤 아카데미(802명) 선택되도록
2. **org switcher UI** — 다중 조직 전환 지원

### P1 - 이번 주
3. **온보딩 중복 생성 방지** — 기존 org 확인 후 생성하도록 수정
4. `/onlyssam/more` 라우트 구현
5. 미사용 테이블 데이터 파이프라인 연결 (payments, notifications, kakao_outbox 등)

### P2 - 다음 주
6. 뷰티 도메인 DB 스키마 마이그레이션 (beauty_* 테이블 생성)
7. User ID 체계 통합 (Clerk ↔ Supabase UUID)
8. org 컬럼명 통일 (`org_id` vs `organization_id`)

### P3 - 장기
9. V-Index Physics Engine 실제 계산 로직 구현
10. Pay7 수납예측 → 프론트엔드 대시보드 연동
11. 학부모 포탈 MVP
12. 뷰티 프론트엔드

---

## 7. 아키텍처 요약

```
[Clerk Auth] → [Next.js Frontend (Vercel)]
                    ↓
              [Supabase REST API]
                    ↓
    ┌─────────────────────────────────┐
    │  PostgreSQL (148 tables)        │
    │  ├── core (131) ← 온리쌤+플랫폼│
    │  ├── sw_* (12)  ← 숙제         │
    │  └── zf_* (5)   ← 시설관리     │
    └─────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────┐
    │  Edge Functions (38개)          │
    │  ├── 온리쌤 코어 (14)           │
    │  ├── 메시징 (6)                 │
    │  ├── 계약/증빙 (5)              │
    │  ├── 뷰티 (7)                   │
    │  └── 기타 (6)                   │
    └─────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────┐
    │  pg_cron (14 jobs)              │
    │  ├── 10분: 알림+수업결과        │
    │  ├── 일간: 미수금/만료/정산 등   │
    │  └── 월간: 인보이스 생성        │
    └─────────────────────────────────┘
                    ↓
              [몰트봇 (Telegram)]
```
