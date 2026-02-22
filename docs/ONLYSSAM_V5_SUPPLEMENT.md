# 온리쌤 앱 설계 v5 — 추가 보완 사항

**기준**: `docs/onlysam-app-design-v5.html`  
**작성일**: 2026-02-22

---

## 1. Contract 준수 여부

### B-1: Outbound Contract

| 항목 | 설계 요구 | 현재 상태 | 보완 필요 |
|------|----------|----------|----------|
| Idempotency | idempotency_key unique | ✅ 구현됨 | - |
| Retry Backoff | 1s→2s→4s→8s→dead-letter | ✅ 지수 백오프 (1s×2^n) | - |
| Rate Limit | 초당 10건 이하 | ✅ `RATE_LIMIT = 10` | - |
| Dead-letter | 3회 실패 시 격리 + 수동 알림 | ⚠️ status=`cancelled`만 설정 | 몰트봇/이메일 등 수동 처리 알림 추가 |
| Audit | 누가/언제/무엇을/왜 → message_log | ⚠️ DELIVERED만 기록, actor 누락 | actor_role, actor_id, reason 필드 확장 |

### B-2: Inbound Contract

| 항목 | 설계 요구 | 현재 상태 | 보완 필요 |
|------|----------|----------|----------|
| Button Response | [참석]/[결석] → attendance_confirmations | ✅ 구현 | - |
| Dedup | message_id + response_type unique | ✅ 5분 윈도우 dedup | message_id+response_type unique 제약 검토 |
| Timeout | 미응답 NONE (수업 30분 전) | ⚠️ pre-attendance만 2h 전 발송 | NONE 처리 배치/스케줄러 추가 |
| inbound_callbacks | 콜백 수신 테이블 | ⚠️ 코드 참조, 테이블 미확인 | Supabase에 테이블 존재 확인 및 마이그레이션 정리 |

### B-3: Consent Contract

| 항목 | 설계 요구 | 현재 상태 | 보완 필요 |
|------|----------|----------|----------|
| 카카오싱크 | 로그인+약관+채널추가 통합 | ⚠️ consent-handler만 존재 | 카카오싱크 앱 등록 + 플로우 연동 |
| consent_records | 동의 저장 | ✅ 테이블 있음 | - |
| 약관 버전 | 변경 시 재동의 트리거 | ⚠️ 미구현 | 약관 버전 관리 로직 추가 |

### Contract C: Goal Change

| 항목 | 설계 요구 | 현재 상태 | 보완 필요 |
|------|----------|----------|----------|
| goal_change_log | from/to/reason/effective_from | ✅ 테이블·핸들러 존재 | - |
| Destination 변경 3조건 | 구조적 변화/능력 점프/전략 합의 | ⚠️ UI/검증 로직 부족 | 변경 전 검증 로직 추가 |

---

## 2. Safety Chain SLA

| 단계 | 설계 | 구현 | 보완 |
|------|------|------|------|
| 1차 (5분) | 안전확인 카톡 | ✅ enqueueMessage SAFETY | - |
| 2차 (10분) | 학부모 전화 시도 | ⚠️ safety_alerts insert | safety_alerts 테이블 확인, 몰트봇 연동으로 전화 시도 로그 전달 |
| 3차 (30분) | safety_log + 원장 알림 | ⚠️ trigger_log + director 알림 | design의 safety_log와 trigger_log 역할 정의 정리 |
| 로직 | "참석 응답 + 실제 불참" 감지 | ⚠️ attendance_confirmations ATTENDED만 조회 | 실제 출석(atb_attendance 등)과 대조 로직 명확화 |

---

## 3. DB/스키마 보완

| 항목 | 상태 | 조치 |
|------|------|------|
| inbound_callbacks | 코드 참조, 마이그레이션 없음 | Supabase 존재 여부 확인 후, 로컬 마이그레이션 파일 추가 |
| safety_alerts | safety-chain에서 insert | 동일 |
| message_log 스키마 | message_id (UUID vs TEXT) | 실제 DB 스키마와 migration 011 불일치 가능 → 스키마 정리 |
| message_outbox | tenant_id TEXT vs UUID | 실제 DB는 uuid, migration은 TEXT → 타입 통일 |

---

## 4. 설계서 상 "개발필요" 기능

| 기능 | 앱 | 현재 | 예상 |
|------|-----|------|------|
| 📱 사전출결 (카톡→학부모) | 강사 | pre-attendance cron + enqueue | 알림톡 템플릿 승인, 버튼 [참석]/[결석] 등록 |
| 💬 카톡 안내 (키워드→문장→발송) | 상담 | send API, template-engine | Outbound Contract 완전 준수, UI 통합 |
| 🔔 상담 트리거 숫자 대시보드 | 상담 | consultation-trigger cron, growth/state | 상담 예약 시 숫자 자동 공개 UI |
| 📝 동의서/계약서 카톡 연동 | 상담 | 앱 내 동의만 | 카톡 [서명] 버튼 → Inbound → contracts |
| 👔 급여 산정 | 상담 | 근로/출퇴근만 | 출석×시간표×계약 → 급여 계산 |
| 보증보험 | 상담 | 미개발 | 체크리스트 + 증빙 업로드 |

---

## 5. 외부 연동/설정

| 항목 | 상태 | 보완 |
|------|------|------|
| 카카오 비즈니스 채널 | 등록 필요 | 채널 개설 + 비즈메시지 연동 |
| 카카오싱크 앱 | 등록 필요 | 앱 생성 후 동의 플로우 연결 |
| 알림톡 템플릿 | 사전출결/안전확인/월간리포트 등 | 승인 완료 템플릿 목록 정리 |
| Kakao callback URL | `/api/kakao/callback` | 카카오 개발자콘솔에 등록 |
| Vercel Cron | 5분(worker), 30분(pre-attendance), 9시(consultation), 28–31일(monthly) | ✅ 설정됨 |

---

## 6. API 일관성

| 항목 | 현재 | 보완 |
|------|------|------|
| /api/messaging/send | org_id, template_code 사용 | tenant_id/org_id 용어 통일, template_code↔template_id 매핑 문서화 |
| message_outbox.tenant_id | UUID (실제 DB) | org_id 문자열과의 매핑 정책 명시 |

---

## 7. 마이그레이션 정리

현재 `supabase/migrations/` 에 없는 테이블 (Supabase에는 존재):

- `attendance_confirmations`
- `consent_records`
- `goal_change_log`
- `trigger_log`
- `inbound_callbacks` (존재 시)
- `safety_alerts` (존재 시)

→ 실제 Supabase 스키마를 덤프하여 `supabase/migrations/` 에 버전 관리용 마이그레이션 파일 추가 권장.

---

## 8. Next Loop (우선순위)

1. **Dead-letter 알림** — 3회 실패 시 몰트봇 또는 이메일 알림
2. **message_log 감사 확장** — actor, reason 필드 추가
3. **Safety Chain 로직 정리** — "참석+실제 불참" 대조 명확화, safety_alerts/safety_log 역할 정리
4. **마이그레이션 파일 정리** — DB 스키마와 코드/문서 일치
5. **카카오 비즈니스 채널 + 카카오싱크 앱** 등록 및 연동
6. **사전출결 알림톡 템플릿** — [참석]/[결석] 버튼 템플릿 승인
