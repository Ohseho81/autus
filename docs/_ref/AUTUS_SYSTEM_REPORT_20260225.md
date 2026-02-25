# AUTUS 시스템 점검 리포트

**날짜:** 2026-02-25
**Supabase Project:** `pphzvnaedmzcvpxjulti` (ap-northeast-2)
**Frontend:** autus-ai.com (Vercel, Next.js)

---

## 1. 수행 완료 (Fixed)

### 1-1. send-class-result Edge Function (v1 → v2)
- **증상:** 10분 cron 실행 시 500 에러 반복
- **원인:** 코드의 컬럼명이 실제 `message_outbox` 스키마와 불일치
  - 코드: `org_id`, `template_key`, `send_after`, `message_body`, `error_detail`
  - 실제: `tenant_id`/`app_id`, `template_id`, `scheduled_send_at`, `rendered_content`, `failure_reason`
- **수정:** v2 배포 - 컬럼명 수정 + retry 로직(3회, progressive delay) 추가
- **결과:** 200 OK 확인, cron `succeeded` 상태

### 1-2. notification-dispatch Edge Function (v2 → v3 → v4)
- **증상:** 10분 cron 실행 시 400 에러 반복
- **원인 (v2):** cron이 빈 body `{}`로 호출하나 함수가 `org_id`, `type` 필수값 요구
- **수정 (v3):** batch/single 듀얼 모드 추가
- **추가 문제 (v3):** `corsHeaders` 변수가 파일 내 2번 선언 → 503 런타임 에러
- **수정 (v4):** 중복 선언 제거, 함수 순서 정리
- **결과:** 200 OK 확인, cron `succeeded` 상태

### 1-3. Cron Job #18 (check-expiring-contracts)
- **증상:** SQL 에러 - `description` 컬럼 참조
- **원인:** `automation_logs` 테이블에 `description` 컬럼 없음 (실제: `details` jsonb)
- **수정:** `cron.alter_job(18, ...)` SQL 수정
- **결과:** 정상 동작

### 1-4. RLS 보안 취약점 수정
- `attendance_tokens`: anon UPDATE를 만료 전 토큰만 허용하도록 제한
- `sw_users`: anon UPDATE 정책 제거
- `zf_facilities`: anon UPDATE 정책 제거
- Migration: `fix_anon_update_rls_policies` 적용 완료

---

## 2. 핵심 버그 (Frontend - 수정 필요)

### 2-1. [P0] 조직 선택 오류 - 학생 0명 표시

**현상:** 온리쌤 대시보드에서 모든 데이터가 0으로 표시됨 (학생 0, 매출 0, 출석률 0%)

**실제 데이터 (온리쌤 아카데미 org):**
| 항목 | 실제 건수 |
|------|----------|
| students | 802명 (694명 active) |
| attendance | 52건 |
| invoices | 116건 |
| contracts | 14건 |

**근본 원인 - API 호출 추적:**

```
1. GET app_members?user_id=eq.user_39hJ1k6oB378zjN8sWfDCLHjAkR&is_active=eq.true&order=role.asc
   → Clerk ID로 활성 멤버십 조회

2. 결과에서 org_id = 135d3f41-... (올댓바스켓) 선택
   → 이 org에는 학생 0명

3. GET students?organization_id=eq.135d3f41-...
   → 당연히 0건 반환
```

**문제 상세:**
- Clerk user `user_39hJ1k6oB378zjN8sWfDCLHjAkR`는 2개 org에 active director:
  - `0219d7f2-...` 온리쌤 아카데미 (802명) ← 정답
  - `135d3f41-...` 올댓바스켓 (0명) ← 현재 선택됨
- 프론트엔드가 `order=role.asc`로 정렬 후 첫 번째 또는 마지막 결과를 선택하는데, 올댓바스켓이 선택됨

**수정 방향:**
1. **즉시 조치:** 프론트엔드에서 org 선택 로직 수정 - `student_count > 0` 또는 `created_at` 기준
2. **근본 해결:** org switcher UI 추가 (다중 조직 지원)
3. **DB 정리:** 중복 올댓바스켓 36개 → 1개로 정리 필요

### 2-2. [P1] 온보딩 중복 생성 버그

**현상:** "올댓바스켓" 조직이 **36개** 중복 생성됨 (14개에 active 멤버 존재)

**원인 추정:** 온보딩 플로우에서 기존 org 확인 없이 매 로그인/가입마다 새 org 생성

**영향:**
- organizations 테이블 오염 (26개 중 25개가 올댓바스켓)
- app_members 테이블에 불필요한 레코드 대량 생성
- org 선택 시 혼란 유발

### 2-3. [P2] User ID 이중 체계

**현상:** 동일 사용자가 2가지 ID 체계로 존재

| ID 타입 | 값 | 연결된 org |
|---------|---|-----------|
| Supabase UUID | `818362c0-...` | 온리쌤 아카데미, 테스트 학원, 올댓바스켓 |
| Clerk user_id | `user_39hJ1k6oB378zjN8sWfDCLHjAkR` | 온리쌤 아카데미, 올댓바스켓 (여러개) |

`app_members.user_id`가 text 타입이라 두 형식이 혼재. 통합 필요.

### 2-4. [P3] 스키마 불일치 - org 컬럼명

| 테이블 | org 컬럼명 |
|--------|-----------|
| students | `organization_id` |
| attendance | `org_id` |
| invoices | `org_id` |
| contracts | `org_id` |
| organizations | `id` |
| app_members | `org_id` |

`students` 테이블만 `organization_id`를 사용하고 나머지는 `org_id`. 통일 필요.

### 2-5. [P3] /onlyssam/more 라우트 404

온리쌤 대시보드 "더보기" 네비게이션 클릭 시 404 페이지 표시.

---

## 3. 프론트엔드 페이지 현황

| 라우트 | 상태 | 비고 |
|--------|------|------|
| `/dashboard` | OK | AUTUS 메인 대시보드, 서비스 목록 |
| `/onlyssam` | OK (데이터 0) | 조직 선택 버그로 빈 대시보드 |
| `/onlyssam/students` | OK (데이터 0) | 학생 관리 - 등록/필터/상태 UI 완성 |
| `/onlyssam/attendance` | OK (데이터 0) | 출석 체크/관찰/통계/정정 탭 구성 |
| `/onlyssam/schedule` | OK (데이터 0) | 주간/월간 스케줄 그리드 |
| `/onlyssam/billing` | OK (데이터 0) | 인보이스/수납 리포트 |
| `/onlyssam/more` | 404 | 라우트 미구현 |
| `/facility` | 미확인 | Zero Facility |
| `/factory` | 미확인 | 앱 팩토리 |

---

## 4. Cron Job 현황 (수정 후)

| Job ID | 이름 | 주기 | 상태 |
|--------|------|------|------|
| 3 | notification-dispatch | 10분 | **succeeded** (v4) |
| 27 | send-class-result-batch | 10분 | **succeeded** (v2) |
| 18 | check-expiring-contracts | 별도 | SQL 수정 완료 |

---

## 5. 권장 수정 우선순위

1. **[즉시]** 프론트엔드 org 선택 로직 수정 → 802명 학생 데이터 복구
2. **[이번 주]** 온보딩 플로우 수정 → 중복 org 생성 방지
3. **[이번 주]** org switcher UI 추가 → 다중 조직 전환 지원
4. **[다음 주]** 중복 올댓바스켓 org 정리 (36 → 1)
5. **[다음 주]** /onlyssam/more 라우트 구현
6. **[장기]** org 컬럼명 통일 (org_id vs organization_id)
7. **[장기]** User ID 체계 통합 (Clerk ↔ Supabase UUID)
