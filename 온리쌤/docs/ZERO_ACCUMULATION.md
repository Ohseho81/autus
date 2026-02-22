# 🚫 Zero Accumulation 원칙

> **모든 과정과 수집이 쌓이지 않는 구조**

*Last Updated: 2026-02-04*

---

## 핵심 철학

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ❌ 기존 방식: 데이터 → 쌓임 → 관리자 확인 → 처리            │
│                                                                 │
│   ✅ 우리 방식: 데이터 → 자동 처리 → 완료/에스컬레이션        │
│                                                                 │
│   "Inbox Zero가 아니라 System Zero"                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7대 Zero Accumulation 법칙

### 법칙 1: Flow, Not Stock (흐름, 재고 아님)
```
모든 데이터는 "저장"이 아닌 "통과"의 대상이다.
- 입력 → 처리 → 완료/삭제
- 대기열에 머무는 시간 최소화
- TTL(Time To Live) 필수 적용
```

### 법칙 2: Auto-Resolve (자동 해결)
```
모든 pending 상태는 자동 해결 경로가 있어야 한다.
- 결제 미수: 3일 후 자동 알림 → 7일 후 재알림 → 14일 후 에스컬레이션
- 보충 미신청: 7일 후 자동 제안 → 30일 후 소멸
- 영상 업로드 실패: 3회 재시도 → 실패 시 로컬 삭제 + 알림
```

### 법칙 3: Escalate, Not Accumulate (적체 대신 에스컬레이션)
```
자동 처리 불가 시 → 사람에게 즉시 에스컬레이션
쌓아두지 않고, 문제를 전달한다.
- 3회 실패 → 관리자 알림
- 이상 감지 → 즉시 Slack/알림톡
```

### 법칙 4: TTL on Everything (모든 것에 만료 시간)
```
모든 대기 데이터에 TTL 적용:
- event_outbox: 24시간
- video_queue: 72시간
- notification_queue: 48시간
- makeup_credits: 30일
- temp_files: 24시간
```

### 법칙 5: Complete or Delete (완료 아니면 삭제)
```
중간 상태로 방치하지 않는다.
- PENDING → SUCCESS | FAILED | EXPIRED
- 3가지 최종 상태만 허용
- FAILED도 처리 완료로 간주
```

### 법칙 6: Scheduled Cleanup (정기 청소)
```
매일 자동 청소 실행:
- 00:00: 만료 데이터 삭제
- 01:00: 로그 압축/아카이브
- 02:00: 통계 집계 후 원본 삭제
```

### 법칙 7: Dashboard = Empty (대시보드 = 비어있음)
```
관리자 대시보드의 기본 상태는 "할 일 없음"
- 알림 0개
- 대기 0건
- 문제 0개
무언가 보인다 = 시스템 이상
```

---

## 영역별 Zero Accumulation 설계

### 1. 출석/수업
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   수업 시작     │ ──▶ │   수업 종료     │ ──▶ │   출석 확정     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 자동 QR 체크          │ 자동 출석 계산        │ 자동 보충 생성
        ▼                       ▼                       ▼
   즉시 반영              즉시 반영              즉시 반영
```

**Anti-Pattern:**
- ❌ 출석 미확인 목록 누적
- ❌ 수동 출석 체크 대기
- ❌ 보충 수동 생성 대기

### 2. 결제
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   결제 요청     │ ──▶ │   결제 완료     │ ──▶ │   자동 연장     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 미결제 시             │ 즉시 반영             │ 다음 주기 생성
        ▼                       ▼                       ▼
   D+3 자동 리마인드     서비스 활성화          결제 요청 자동 생성
   D+7 재리마인드
   D+14 에스컬레이션
```

**TTL 적용:**
```sql
-- 결제 상태 자동 전환
scheduled: 결제 요청 생성
pending: 3일 후 → reminder_sent
reminder_sent: 4일 후 → final_notice
final_notice: 7일 후 → escalated
escalated: 관리자 알림 후 → resolved/cancelled
```

### 3. 영상
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   촬영 완료     │ ──▶ │   업로드 시도   │ ──▶ │   완료/실패     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 로컬 저장             │ 최대 3회 재시도       │ 로컬 파일 삭제
        ▼                       ▼                       ▼
   큐에 추가              진행 중                완료 or 에스컬레이션
   (TTL: 72시간)         (간격: 5분, 30분, 2시간)   (로컬 정리)
```

**실패 시 흐름:**
```
3회 실패 → 관리자 알림 → 로컬 파일 유지 (수동 업로드 가능)
72시간 후 → 로컬 파일 자동 삭제 → 기록만 남김
```

### 4. 알림톡
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   이벤트 발생   │ ──▶ │   알림톡 발송   │ ──▶ │   발송 완료     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 큐에 추가             │ 최대 3회 재시도       │ 로그 기록
        ▼                       ▼                       ▼
   TTL: 48시간            간격: 1분, 10분, 1시간    큐에서 제거
```

**절대 쌓이지 않음:**
- 발송 성공 → 즉시 큐에서 제거
- 발송 실패 (3회) → 실패 로그 기록 + 큐에서 제거
- TTL 초과 → 자동 삭제 + 만료 로그

### 5. 보충 수업
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   결석 발생     │ ──▶ │   보충권 생성   │ ──▶ │   보충 사용     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 자동 생성             │ D+7 리마인드          │ 수업 완료
        ▼                       ▼                       ▼
   즉시 반영              D+21 재리마인드          보충권 소멸
                          D+30 자동 소멸
```

**소멸 정책:**
```
보충권은 30일 후 자동 소멸
- D+7: "보충 수업 신청하세요" 알림
- D+21: "9일 후 소멸됩니다" 알림
- D+30: 자동 소멸 + 소멸 알림
```

### 6. 상담
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   상담 요청     │ ──▶ │   상담 진행     │ ──▶ │   상담 완료     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 자동 스케줄링         │ 48시간 내 완료        │ 만족도 조사
        ▼                       ▼                       ▼
   가능 시간 제안          미완료 시 에스컬레이션   피드백 수집
```

---

## Cron Job 설계

### 매 5분 (고빈도)
```sql
-- 1. 이벤트 동기화
SELECT sync_pending_events();

-- 2. 알림톡 발송
SELECT process_notification_queue();

-- 3. 영상 업로드 재시도
SELECT retry_video_uploads();
```

### 매시간
```sql
-- 1. TTL 만료 체크
SELECT expire_ttl_items();

-- 2. 결제 상태 전환
SELECT update_payment_status();

-- 3. 보충권 리마인드
SELECT send_makeup_reminders();
```

### 매일 00:00
```sql
-- 1. 만료 데이터 삭제
SELECT cleanup_expired_data();

-- 2. 보충권 소멸
SELECT expire_makeup_credits();

-- 3. 통계 집계
SELECT aggregate_daily_stats();

-- 4. 로그 아카이브
SELECT archive_old_logs();
```

### 매주 월요일 09:00
```sql
-- 1. 주간 리포트 생성
SELECT generate_weekly_report();

-- 2. 장기 미결 에스컬레이션
SELECT escalate_long_pending();
```

---

## 데이터베이스 설계

### TTL 컬럼 추가
```sql
-- 모든 대기성 테이블에 TTL 컬럼 추가
ALTER TABLE event_outbox ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours';
ALTER TABLE notification_queue ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours';
ALTER TABLE video_queue ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours';
```

### 자동 만료 트리거
```sql
-- 만료 데이터 자동 처리
CREATE OR REPLACE FUNCTION fn_auto_expire()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.status = 'pending' THEN
    NEW.status := 'expired';
    -- 에스컬레이션 이벤트 생성
    INSERT INTO events (event_type, source_id, metadata)
    VALUES ('item_expired', NEW.id, jsonb_build_object('table', TG_TABLE_NAME));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 청소 함수
```sql
-- 매일 실행되는 청소 함수
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS jsonb AS $$
DECLARE
  deleted_events INT;
  deleted_notifications INT;
  deleted_videos INT;
BEGIN
  -- 만료된 이벤트 삭제
  DELETE FROM event_outbox WHERE expires_at < NOW() AND status IN ('expired', 'failed');
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- 만료된 알림 삭제
  DELETE FROM notification_queue WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_notifications = ROW_COUNT;

  -- 만료된 영상 큐 삭제
  DELETE FROM video_queue WHERE expires_at < NOW() AND status != 'uploaded';
  GET DIAGNOSTICS deleted_videos = ROW_COUNT;

  RETURN jsonb_build_object(
    'events', deleted_events,
    'notifications', deleted_notifications,
    'videos', deleted_videos,
    'cleaned_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 모니터링

### Zero Accumulation 대시보드 지표
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 시스템 상태                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  대기 이벤트:    0  ✅                                          │
│  대기 알림:      0  ✅                                          │
│  대기 업로드:    0  ✅                                          │
│  미결제:         0  ✅                                          │
│  미처리 상담:    0  ✅                                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  목표: 모든 지표 0 유지                                         │
│  경고: 1개 이상 시 즉시 알림                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 알림 조건
```
- 대기 이벤트 > 10 → 경고
- 대기 알림 > 50 → 경고
- 대기 업로드 > 5 → 경고
- 미결제 > 3 → 경고
- 미처리 상담 > 2 → 경고

모든 경고 → Slack + 관리자 알림톡
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🚫 Zero Accumulation = 시스템에 아무것도 쌓이지 않음         │
│                                                                 │
│   ✅ 모든 것은 흐른다 (Flow)                                   │
│   ✅ 모든 것은 만료된다 (TTL)                                  │
│   ✅ 모든 것은 해결되거나 에스컬레이션된다 (Resolve/Escalate) │
│   ✅ 대시보드의 기본 상태는 "비어있음" (Empty)                 │
│                                                                 │
│   "쌓이면 실패, 흐르면 성공"                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
