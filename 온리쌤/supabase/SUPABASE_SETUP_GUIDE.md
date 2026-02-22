# 📋 Supabase 실행 총 항목 리스트

> **실행 순서대로 정리 (Zero Accumulation 원칙 반영)**

---

## 🚀 실행 순서

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1️⃣  EXECUTE_THIS.sql          ← 기본 스키마 (필수, 1회)       │
│   2️⃣  003_video_storage.sql     ← 영상 스토리지 (필수)          │
│   3️⃣  004_zero_accumulation.sql ← Zero Accumulation (필수)     │
│   4️⃣  Storage Bucket 생성        ← Supabase 대시보드           │
│   5️⃣  Edge Functions 배포        ← supabase functions deploy   │
│   6️⃣  Cron Jobs 설정             ← pg_cron 또는 외부 스케줄러   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ EXECUTE_THIS.sql (기본 스키마)

**위치:** `supabase/EXECUTE_THIS.sql`

### 포함 내용:

| Part | 테이블/기능 | 설명 |
|------|------------|------|
| **Part 1** | Universal Schema | 6개 핵심 테이블 |
| | `organizations` | 조직/사업장 |
| | `entities` | 모든 참여자 (학생, 코치, 학부모) |
| | `services` | 모든 서비스 (수업, 패키지) |
| | `events` | 모든 이벤트 (출석, 결제, 알림) |
| | `metadata` | 무한 확장 (키-값) |
| | `relationships` | 관계 (parent_of, coach_of) |
| **Part 2** | Legacy Views | 기존 시스템 호환 뷰 |
| | `v_students` | 학생 목록 뷰 |
| | `v_parents` | 학부모 목록 뷰 |
| | `v_coaches` | 코치 목록 뷰 |
| **Part 3** | Coach App Tables | 코치앱 전용 테이블 |
| | `atb_classes` | 반 정보 |
| | `atb_lesson_sessions` | 수업 세션 |
| | `atb_session_events` | 세션 이벤트 (시작/종료/사고) |
| **Part 4** | Payment Tables | 결제 시스템 |
| | `atb_payments` | 결제 내역 |
| | `atb_payment_methods` | 결제 수단 |
| **Part 5** | Alimtalk Tables | 알림톡 시스템 |
| | `atb_alimtalk_templates` | 알림톡 템플릿 |
| | `atb_alimtalk_logs` | 발송 로그 |
| **Part 6** | Triggers | 자동화 트리거 |
| | `fn_update_entity_timestamp` | 수정 시간 자동 업데이트 |
| | `fn_log_session_event` | 세션 이벤트 로깅 |
| **Part 7** | RLS Policies | Row Level Security |
| **Part 8** | Sample Data | 테스트 데이터 |

### 실행 방법:
```sql
-- Supabase Dashboard → SQL Editor → New Query
-- EXECUTE_THIS.sql 전체 복사 → 붙여넣기 → Run
```

---

## 2️⃣ 003_video_storage.sql (영상 스토리지)

**위치:** `supabase/migrations/003_video_storage.sql`

### 포함 내용:

| Part | 테이블/기능 | 설명 |
|------|------------|------|
| **Part 1** | Storage Bucket | `lesson-videos` 버킷 생성 |
| | | 50MB 제한, video/mp4 허용 |
| **Part 2** | `atb_video_records` | 영상 메타데이터 테이블 |
| | | session_id, student_id, coach_id |
| | | video_url, duration_seconds |
| | | status (RECORDING → UPLOADED) |
| **Part 3** | RLS Policies | 영상 접근 권한 |
| **Part 4** | Trigger | 영상 업로드 → 알림 생성 |
| **Part 5** | View | `v_student_videos` (학생별 영상 목록) |

### 실행 방법:
```sql
-- Supabase Dashboard → SQL Editor → New Query
-- 003_video_storage.sql 전체 복사 → 붙여넣기 → Run
```

---

## 3️⃣ 004_zero_accumulation.sql (Zero Accumulation)

**위치:** `supabase/migrations/004_zero_accumulation.sql`

### 포함 내용:

| Part | 테이블/기능 | 설명 |
|------|------------|------|
| **Part 1** | TTL 컬럼 추가 | 기존 테이블에 expires_at 추가 |
| | | `atb_session_events` +24시간 |
| | | `atb_video_records` +72시간 |
| **Part 2** | `atb_notification_queue` | 알림 큐 (TTL 48시간) |
| | | status: pending → sent/failed/expired |
| | | retry_count, max_retries |
| **Part 3** | `atb_makeup_credits` | 보충권 (TTL 30일) |
| | | status: available → used/expired |
| | | reminder_7d_sent, reminder_21d_sent |
| **Part 4** | 자동 만료 함수들 | |
| | `fn_expire_notifications()` | 알림 만료 처리 |
| | `fn_expire_makeup_credits()` | 보충권 만료 처리 |
| | `fn_expire_events()` | 이벤트 만료 처리 |
| | `fn_expire_videos()` | 영상 만료 처리 |
| **Part 5** | `fn_send_makeup_reminders()` | 보충권 D+7, D+21 리마인더 |
| **Part 6** | `fn_daily_cleanup()` | 매일 00:00 통합 청소 |
| **Part 7** | `v_system_accumulation_status` | 모니터링 뷰 |
| **Part 8** | `fn_check_and_escalate()` | 에스컬레이션 체크 |
| **Part 9** | Trigger | 결석 → 보충권 자동 생성 |
| **Part 10** | RLS Policies | 접근 권한 |

### 실행 방법:
```sql
-- Supabase Dashboard → SQL Editor → New Query
-- 004_zero_accumulation.sql 전체 복사 → 붙여넣기 → Run
```

---

## 4️⃣ Storage Bucket 설정 (대시보드)

**위치:** Supabase Dashboard → Storage → New Bucket

```
┌─────────────────────────────────────────────────────────────────┐
│  버킷 설정                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name: lesson-videos                                            │
│  Public: ✅ (학부모 공유용)                                      │
│  File size limit: 52428800 (50MB)                               │
│  Allowed MIME types:                                            │
│    - video/mp4                                                  │
│    - video/quicktime                                            │
│    - video/x-msvideo                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> ⚠️ SQL에서 버킷 생성이 실패하면 대시보드에서 수동 생성

---

## 5️⃣ Edge Functions 배포

**위치:** `supabase/functions/`

### 배포 명령:
```bash
# 1. webhook-toss (결제)
supabase functions deploy webhook-toss

# 2. webhook-kakao (알림톡 버튼 응답)
supabase functions deploy webhook-kakao

# 3. webhook-qr (QR 출석)
supabase functions deploy webhook-qr
```

### 환경 변수 설정:
```bash
# Supabase Dashboard → Settings → Edge Functions → Secrets

TOSS_SECRET_KEY=test_sk_xxxxxxxx
KAKAO_REST_API_KEY=xxxxxxxx
SOLAPI_API_KEY=xxxxxxxx
SOLAPI_API_SECRET=xxxxxxxx
```

---

## 6️⃣ Cron Jobs 설정

### 옵션 A: pg_cron (Supabase Pro 이상)

```sql
-- pg_cron 활성화 (대시보드 → Database → Extensions → pg_cron)

-- 매 5분: 이벤트 동기화
SELECT cron.schedule('sync-events', '*/5 * * * *', 'SELECT sync_pending_events()');

-- 매시간: TTL 만료 체크
SELECT cron.schedule('expire-ttl', '0 * * * *', 'SELECT fn_expire_notifications(); SELECT fn_expire_events();');

-- 매일 00:00: 전체 청소
SELECT cron.schedule('daily-cleanup', '0 0 * * *', 'SELECT fn_daily_cleanup()');

-- 매일 09:00: 보충권 리마인더
SELECT cron.schedule('makeup-reminders', '0 9 * * *', 'SELECT fn_send_makeup_reminders()');
```

### 옵션 B: 외부 스케줄러 (Free 플랜)

```javascript
// Vercel Cron / GitHub Actions / 별도 서버

// 매일 00:00 UTC
fetch('https://your-project.supabase.co/rest/v1/rpc/fn_daily_cleanup', {
  method: 'POST',
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-service-role-key'
  }
});
```

---

## 📊 전체 테이블 목록 (최종)

### Universal Schema (6개)
| # | 테이블 | 용도 |
|---|--------|------|
| 1 | `organizations` | 조직 |
| 2 | `entities` | 모든 참여자 |
| 3 | `services` | 모든 서비스 |
| 4 | `events` | 모든 이벤트 |
| 5 | `metadata` | 무한 확장 |
| 6 | `relationships` | 관계 |

### Coach App (3개)
| # | 테이블 | 용도 |
|---|--------|------|
| 7 | `atb_classes` | 반 정보 |
| 8 | `atb_lesson_sessions` | 수업 세션 |
| 9 | `atb_session_events` | 세션 이벤트 |

### Payment (2개)
| # | 테이블 | 용도 |
|---|--------|------|
| 10 | `atb_payments` | 결제 내역 |
| 11 | `atb_payment_methods` | 결제 수단 |

### Alimtalk (2개)
| # | 테이블 | 용도 |
|---|--------|------|
| 12 | `atb_alimtalk_templates` | 템플릿 |
| 13 | `atb_alimtalk_logs` | 발송 로그 |

### Video (1개)
| # | 테이블 | 용도 |
|---|--------|------|
| 14 | `atb_video_records` | 영상 메타데이터 |

### Zero Accumulation (2개)
| # | 테이블 | 용도 |
|---|--------|------|
| 15 | `atb_notification_queue` | 알림 큐 (TTL 48h) |
| 16 | `atb_makeup_credits` | 보충권 (TTL 30d) |

---

## 📊 전체 함수 목록 (최종)

### Cleanup Functions (6개)
| # | 함수 | 주기 | 용도 |
|---|------|------|------|
| 1 | `fn_expire_notifications()` | 매시간 | 알림 만료 |
| 2 | `fn_expire_events()` | 매시간 | 이벤트 만료 |
| 3 | `fn_expire_videos()` | 매일 | 영상 만료 |
| 4 | `fn_expire_makeup_credits()` | 매일 | 보충권 소멸 |
| 5 | `fn_send_makeup_reminders()` | 매일 | 보충권 리마인드 |
| 6 | `fn_daily_cleanup()` | 매일 00:00 | 통합 청소 |

### Trigger Functions (4개)
| # | 함수 | 트리거 | 용도 |
|---|------|--------|------|
| 7 | `fn_update_entity_timestamp()` | UPDATE | 수정시간 갱신 |
| 8 | `fn_log_session_event()` | INSERT | 세션 이벤트 로깅 |
| 9 | `fn_video_upload_notification()` | INSERT/UPDATE | 영상 업로드 알림 |
| 10 | `fn_auto_create_makeup_credit()` | INSERT/UPDATE | 결석 → 보충권 |

### Monitoring (2개)
| # | 함수/뷰 | 용도 |
|---|---------|------|
| 11 | `v_system_accumulation_status` | 적체 상태 모니터링 |
| 12 | `fn_check_and_escalate()` | 에스컬레이션 체크 |

---

## ✅ 실행 체크리스트

```
□ Step 1: EXECUTE_THIS.sql 실행
□ Step 2: 003_video_storage.sql 실행
□ Step 3: 004_zero_accumulation.sql 실행
□ Step 4: Storage 버킷 확인/생성
□ Step 5: Edge Functions 배포
□ Step 6: 환경 변수 설정
□ Step 7: Cron Jobs 설정
□ Step 8: 테스트
   □ 코치앱 로그인
   □ 수업 시작/종료
   □ 영상 촬영/업로드
   □ 알림톡 발송
   □ Zero Accumulation 모니터링
```

---

## 🔍 실행 후 확인

```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 함수 생성 확인
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Zero Accumulation 상태 확인
SELECT * FROM v_system_accumulation_status;
```

---

*Updated: 2026-02-04*
