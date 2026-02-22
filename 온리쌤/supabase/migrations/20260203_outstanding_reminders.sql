-- ═══════════════════════════════════════════════════════════════════════════════
-- 💰 미수금 자동 알림 테이블
-- 알림 발송 로그 및 에스컬레이션 관리
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 student_payments 테이블 확장 (알림 관련 필드)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE student_payments
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

COMMENT ON COLUMN student_payments.last_reminder_at IS '마지막 알림 발송 시간';
COMMENT ON COLUMN student_payments.reminder_count IS '알림 발송 횟수';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 알림 발송 로그 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outstanding_reminder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 연관 데이터
  payment_id UUID REFERENCES student_payments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- 알림 정보
  reminder_type VARCHAR(20) NOT NULL, -- 'alimtalk', 'slack', 'sms'
  amount INTEGER NOT NULL,

  -- 결과
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,

  -- 타임스탬프
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reminder_logs_payment ON outstanding_reminder_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_student ON outstanding_reminder_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent ON outstanding_reminder_logs(sent_at DESC);

COMMENT ON TABLE outstanding_reminder_logs IS '미수금 알림 발송 로그';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 미수금 현황 뷰 (개선)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW outstanding_details AS
SELECT
  sp.id,
  sp.student_id,
  s.name as student_name,
  s.parent_phone,
  s.parent_name,
  sp.sale_item,
  sp.amount,
  sp.outstanding,
  sp.sale_date,
  sp.last_reminder_at,
  sp.reminder_count,
  EXTRACT(DAY FROM NOW() - sp.sale_date)::INTEGER as days_overdue,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - sp.sale_date) >= 30 THEN 'CRITICAL'
    WHEN sp.outstanding >= 500000 THEN 'CRITICAL'
    WHEN sp.outstanding >= 300000 THEN 'HIGH'
    WHEN sp.outstanding >= 100000 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level,
  CASE
    WHEN sp.reminder_count = 0 AND EXTRACT(DAY FROM NOW() - sp.sale_date) >= 7 THEN true
    WHEN sp.reminder_count = 1 AND EXTRACT(DAY FROM NOW() - sp.sale_date) >= 14 THEN true
    WHEN sp.reminder_count = 2 AND EXTRACT(DAY FROM NOW() - sp.sale_date) >= 21 THEN true
    ELSE false
  END as needs_reminder
FROM student_payments sp
JOIN students s ON s.id = sp.student_id
WHERE sp.outstanding > 0
ORDER BY sp.outstanding DESC;

COMMENT ON VIEW outstanding_details IS '미수금 상세 현황 (알림 대상 포함)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 알림 대상자 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW reminder_targets AS
SELECT
  *,
  CASE
    WHEN reminder_count = 0 AND days_overdue >= 7 THEN 'FIRST'
    WHEN reminder_count = 1 AND days_overdue >= 14 THEN 'SECOND'
    WHEN reminder_count = 2 AND days_overdue >= 21 THEN 'URGENT'
    WHEN days_overdue >= 30 THEN 'CRITICAL'
    ELSE NULL
  END as reminder_stage
FROM outstanding_details
WHERE needs_reminder = true;

COMMENT ON VIEW reminder_targets IS '알림 발송 대상자';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 미수금 통계 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW outstanding_stats AS
SELECT
  COUNT(*) as total_count,
  SUM(outstanding) as total_amount,
  COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_count,
  SUM(outstanding) FILTER (WHERE risk_level = 'LOW') as low_amount,
  COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_count,
  SUM(outstanding) FILTER (WHERE risk_level = 'MEDIUM') as medium_amount,
  COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_count,
  SUM(outstanding) FILTER (WHERE risk_level = 'HIGH') as high_amount,
  COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_count,
  SUM(outstanding) FILTER (WHERE risk_level = 'CRITICAL') as critical_amount,
  COUNT(*) FILTER (WHERE needs_reminder = true) as needs_reminder_count
FROM outstanding_details;

COMMENT ON VIEW outstanding_stats IS '미수금 통계 요약';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚡ 자동 알림 트리거 (선택 - Edge Function 권장)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 미수금 발생 시 슬랙 알림 (Webhook으로 대체 가능)
-- CREATE OR REPLACE FUNCTION notify_new_outstanding()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.outstanding > 0 AND (OLD.outstanding IS NULL OR OLD.outstanding = 0) THEN
--     -- Edge Function 또는 Webhook 호출
--     PERFORM pg_notify('new_outstanding', json_build_object(
--       'student_id', NEW.student_id,
--       'amount', NEW.outstanding
--     )::text);
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
