-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚫 Zero Accumulation System
-- 모든 과정과 수집이 쌓이지 않는 구조
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 1: TTL 컬럼 추가 (기존 테이블)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 이벤트 아웃박스 TTL (24시간)
ALTER TABLE atb_session_events
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours';

ALTER TABLE atb_session_events
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE atb_session_events
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- 영상 레코드 TTL (72시간)
ALTER TABLE atb_video_records
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 2: 알림 큐 테이블 (쌓이지 않는 구조)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS atb_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대상
  recipient_id UUID,  -- 학부모/코치 entity ID
  recipient_phone VARCHAR(20),

  -- 알림 내용
  template_code VARCHAR(50) NOT NULL,  -- 알림톡 템플릿 코드
  variables JSONB DEFAULT '{}',  -- 템플릿 변수

  -- 상태 (3가지 최종 상태만)
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'expired')),

  -- 재시도
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),

  -- TTL (48시간)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',

  -- 결과
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON atb_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry ON atb_notification_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_expires ON atb_notification_queue(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 3: 보충권 테이블 (30일 자동 소멸)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS atb_makeup_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결
  student_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  original_session_id UUID REFERENCES atb_lesson_sessions(id),
  used_session_id UUID REFERENCES atb_lesson_sessions(id),

  -- 상태
  status VARCHAR(20) DEFAULT 'available'
    CHECK (status IN ('available', 'scheduled', 'used', 'expired')),

  -- TTL (30일)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  used_at TIMESTAMPTZ,

  -- 리마인더 추적
  reminder_7d_sent BOOLEAN DEFAULT FALSE,
  reminder_21d_sent BOOLEAN DEFAULT FALSE,
  expiry_notice_sent BOOLEAN DEFAULT FALSE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_makeup_credits_student ON atb_makeup_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_makeup_credits_status ON atb_makeup_credits(status);
CREATE INDEX IF NOT EXISTS idx_makeup_credits_expires ON atb_makeup_credits(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 4: 자동 만료 함수들
-- ═══════════════════════════════════════════════════════════════════════════════

-- 4.1 알림 큐 만료 처리
CREATE OR REPLACE FUNCTION fn_expire_notifications()
RETURNS jsonb AS $$
DECLARE
  expired_count INT;
BEGIN
  UPDATE atb_notification_queue
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_notifications', expired_count,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 4.2 보충권 만료 처리
CREATE OR REPLACE FUNCTION fn_expire_makeup_credits()
RETURNS jsonb AS $$
DECLARE
  expired_count INT;
  v_credit RECORD;
BEGIN
  -- 만료된 보충권 상태 변경
  FOR v_credit IN
    SELECT mc.*, e.organization_id, e.name as student_name
    FROM atb_makeup_credits mc
    JOIN entities e ON e.id = mc.student_id
    WHERE mc.status = 'available'
      AND mc.expires_at < NOW()
  LOOP
    -- 상태 변경
    UPDATE atb_makeup_credits SET status = 'expired' WHERE id = v_credit.id;

    -- 만료 알림 이벤트 생성 (아직 발송 안 했으면)
    IF NOT v_credit.expiry_notice_sent THEN
      INSERT INTO events (organization_id, event_type, source, source_id, metadata)
      VALUES (
        v_credit.organization_id,
        'makeup_expired',
        'system',
        v_credit.id::TEXT,
        jsonb_build_object(
          'student_id', v_credit.student_id,
          'student_name', v_credit.student_name,
          'expired_at', NOW()
        )
      );

      UPDATE atb_makeup_credits SET expiry_notice_sent = TRUE WHERE id = v_credit.id;
    END IF;
  END LOOP;

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_credits', expired_count,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 4.3 이벤트 아웃박스 만료 처리
CREATE OR REPLACE FUNCTION fn_expire_events()
RETURNS jsonb AS $$
DECLARE
  expired_count INT;
  failed_count INT;
BEGIN
  -- 만료된 이벤트 삭제
  DELETE FROM atb_session_events
  WHERE expires_at < NOW();
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- 3회 이상 실패한 이벤트도 삭제 (로그만 남김)
  DELETE FROM atb_session_events
  WHERE retry_count >= 3;
  GET DIAGNOSTICS failed_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_events', expired_count,
    'failed_events', failed_count,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 4.4 영상 큐 만료 처리
CREATE OR REPLACE FUNCTION fn_expire_videos()
RETURNS jsonb AS $$
DECLARE
  expired_count INT;
BEGIN
  UPDATE atb_video_records
  SET status = 'DELETED', deleted_at = NOW()
  WHERE status IN ('LOCAL', 'FAILED')
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_videos', expired_count,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 5: 보충권 리마인더 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_send_makeup_reminders()
RETURNS jsonb AS $$
DECLARE
  v_credit RECORD;
  reminder_7d_count INT := 0;
  reminder_21d_count INT := 0;
BEGIN
  -- D+7 리마인더 (23일 남음)
  FOR v_credit IN
    SELECT mc.*, e.organization_id, e.name as student_name
    FROM atb_makeup_credits mc
    JOIN entities e ON e.id = mc.student_id
    WHERE mc.status = 'available'
      AND NOT mc.reminder_7d_sent
      AND mc.created_at < NOW() - INTERVAL '7 days'
      AND mc.expires_at > NOW()
  LOOP
    INSERT INTO events (organization_id, event_type, source, source_id, metadata)
    VALUES (
      v_credit.organization_id,
      'makeup_reminder_7d',
      'system',
      v_credit.id::TEXT,
      jsonb_build_object(
        'student_id', v_credit.student_id,
        'student_name', v_credit.student_name,
        'days_remaining', EXTRACT(DAY FROM v_credit.expires_at - NOW())::INT
      )
    );

    UPDATE atb_makeup_credits SET reminder_7d_sent = TRUE WHERE id = v_credit.id;
    reminder_7d_count := reminder_7d_count + 1;
  END LOOP;

  -- D+21 리마인더 (9일 남음)
  FOR v_credit IN
    SELECT mc.*, e.organization_id, e.name as student_name
    FROM atb_makeup_credits mc
    JOIN entities e ON e.id = mc.student_id
    WHERE mc.status = 'available'
      AND NOT mc.reminder_21d_sent
      AND mc.created_at < NOW() - INTERVAL '21 days'
      AND mc.expires_at > NOW()
  LOOP
    INSERT INTO events (organization_id, event_type, source, source_id, metadata)
    VALUES (
      v_credit.organization_id,
      'makeup_reminder_21d',
      'system',
      v_credit.id::TEXT,
      jsonb_build_object(
        'student_id', v_credit.student_id,
        'student_name', v_credit.student_name,
        'days_remaining', EXTRACT(DAY FROM v_credit.expires_at - NOW())::INT
      )
    );

    UPDATE atb_makeup_credits SET reminder_21d_sent = TRUE WHERE id = v_credit.id;
    reminder_21d_count := reminder_21d_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'reminder_7d_sent', reminder_7d_count,
    'reminder_21d_sent', reminder_21d_count,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 6: 통합 청소 함수 (매일 00:00 실행)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_daily_cleanup()
RETURNS jsonb AS $$
DECLARE
  result_notifications jsonb;
  result_events jsonb;
  result_videos jsonb;
  result_credits jsonb;
  old_logs_deleted INT;
BEGIN
  -- 1. 알림 만료 처리
  SELECT fn_expire_notifications() INTO result_notifications;

  -- 2. 이벤트 만료 처리
  SELECT fn_expire_events() INTO result_events;

  -- 3. 영상 만료 처리
  SELECT fn_expire_videos() INTO result_videos;

  -- 4. 보충권 만료 처리
  SELECT fn_expire_makeup_credits() INTO result_credits;

  -- 5. 오래된 이벤트 로그 삭제 (30일 이상)
  DELETE FROM events WHERE occurred_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS old_logs_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'notifications', result_notifications,
    'events', result_events,
    'videos', result_videos,
    'credits', result_credits,
    'old_logs_deleted', old_logs_deleted,
    'cleanup_completed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 7: 상태 모니터링 뷰 (대시보드용)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_system_accumulation_status AS
SELECT
  (SELECT COUNT(*) FROM atb_session_events WHERE expires_at > NOW()) AS pending_events,
  (SELECT COUNT(*) FROM atb_notification_queue WHERE status = 'pending') AS pending_notifications,
  (SELECT COUNT(*) FROM atb_video_records WHERE status IN ('LOCAL', 'UPLOADING', 'FAILED')) AS pending_videos,
  (SELECT COUNT(*) FROM atb_makeup_credits WHERE status = 'available') AS pending_makeups,
  CASE
    WHEN (SELECT COUNT(*) FROM atb_session_events WHERE expires_at > NOW()) > 10 THEN 'WARNING'
    WHEN (SELECT COUNT(*) FROM atb_notification_queue WHERE status = 'pending') > 50 THEN 'WARNING'
    WHEN (SELECT COUNT(*) FROM atb_video_records WHERE status IN ('LOCAL', 'UPLOADING', 'FAILED')) > 5 THEN 'WARNING'
    ELSE 'HEALTHY'
  END AS system_health,
  NOW() AS checked_at;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 8: 에스컬레이션 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_and_escalate()
RETURNS jsonb AS $$
DECLARE
  status RECORD;
  escalation_needed BOOLEAN := FALSE;
BEGIN
  -- 현재 상태 확인
  SELECT * INTO status FROM v_system_accumulation_status;

  -- 에스컬레이션 조건 확인
  IF status.pending_events > 10
     OR status.pending_notifications > 50
     OR status.pending_videos > 5 THEN
    escalation_needed := TRUE;

    -- 에스컬레이션 이벤트 생성
    INSERT INTO events (event_type, source, metadata)
    VALUES (
      'system_escalation',
      'system',
      jsonb_build_object(
        'pending_events', status.pending_events,
        'pending_notifications', status.pending_notifications,
        'pending_videos', status.pending_videos,
        'pending_makeups', status.pending_makeups,
        'triggered_at', NOW()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', status,
    'escalation_needed', escalation_needed,
    'checked_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 9: 결석 시 자동 보충권 생성 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_auto_create_makeup_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- 결석으로 변경된 경우 자동 보충권 생성
  IF NEW.status = 'absent' AND (OLD.status IS NULL OR OLD.status != 'absent') THEN
    INSERT INTO atb_makeup_credits (student_id, original_session_id)
    VALUES (NEW.student_id, NEW.session_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 출석 테이블이 있다면 트리거 연결 (테이블명 확인 필요)
-- DROP TRIGGER IF EXISTS trg_auto_makeup_credit ON atb_attendance;
-- CREATE TRIGGER trg_auto_makeup_credit
--   AFTER INSERT OR UPDATE ON atb_attendance
--   FOR EACH ROW
--   EXECUTE FUNCTION fn_auto_create_makeup_credit();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 10: RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE atb_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_makeup_credits ENABLE ROW LEVEL SECURITY;

-- 알림 큐: 인증된 사용자 접근
CREATE POLICY "Authenticated access to notifications"
  ON atb_notification_queue FOR ALL
  TO authenticated
  USING (true);

-- 보충권: 인증된 사용자 접근
CREATE POLICY "Authenticated access to makeup credits"
  ON atb_makeup_credits FOR ALL
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE atb_notification_queue IS '알림 큐 - TTL 48시간, 자동 만료';
COMMENT ON TABLE atb_makeup_credits IS '보충권 - TTL 30일, 자동 소멸';
COMMENT ON FUNCTION fn_daily_cleanup IS '매일 00:00 실행 - 모든 만료 데이터 정리';
COMMENT ON VIEW v_system_accumulation_status IS 'Zero Accumulation 모니터링 대시보드';
