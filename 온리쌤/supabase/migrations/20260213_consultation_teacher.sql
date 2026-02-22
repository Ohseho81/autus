-- ═══════════════════════════════════════════════════════════════════════════════
-- 💬 상담선생 (Consultation Teacher)
-- 결제선생(Payment Truth) 연동 → 위험 감지 → 자동 상담 예약 → 생애주기 관리
-- "Truth는 그들, 의사결정은 우리"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUM 정의
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE consultation_status AS ENUM (
    'scheduled',      -- 예약됨
    'reminded',       -- 리마인드 발송됨
    'in_progress',    -- 진행 중
    'completed',      -- 완료
    'cancelled',      -- 취소
    'follow_up'       -- 후속 조치 필요
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_trigger_type AS ENUM (
    'overdue_payment',   -- 미납 (결제선생 연동)
    'low_vindex',        -- V-Index 낮음
    'failed_payment',    -- 결제 실패
    'absent_streak',     -- 연속 결석
    'no_response'        -- 학부모 무응답
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 상담 세션 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 소속
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

  -- 대상
  student_id UUID NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,

  -- 상태
  status consultation_status NOT NULL DEFAULT 'scheduled',

  -- 트리거 정보 (IOO: Input)
  trigger_type risk_trigger_type NOT NULL,
  trigger_snapshot JSONB DEFAULT '{}',
  -- {v_index, overdue_amount, absent_count, payment_status, risk_level}

  -- 일정
  scheduled_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 결과 (IOO: Output)
  coach_notes TEXT,
  follow_up_actions JSONB DEFAULT '[]',
  -- [{action: "재등록 안내", due_date: "2026-03-01", status: "pending"}]

  -- 중복 방지
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  -- 형식: CONSULT-{org_id}-{student_id}-{YYYYMMDD}

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE consultation_sessions IS '상담선생: 위험 감지 → 자동 상담 예약 → 생애주기 관리';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 인덱스
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_consultation_student
  ON consultation_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_consultation_status
  ON consultation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_consultation_org
  ON consultation_sessions(org_id);

CREATE INDEX IF NOT EXISTS idx_consultation_created
  ON consultation_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_scheduled
  ON consultation_sessions(scheduled_at)
  WHERE status IN ('scheduled', 'reminded');

CREATE INDEX IF NOT EXISTS idx_consultation_trigger
  ON consultation_sessions(trigger_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- updated_at 자동 갱신 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_consultation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultation_sessions_updated_at
  BEFORE UPDATE ON consultation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_sessions_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;

-- 관리자: 전체 접근
CREATE POLICY "Admins can manage consultations"
  ON consultation_sessions FOR ALL
  USING (true);

-- 시스템: INSERT/UPDATE (Edge Function 용)
CREATE POLICY "System can insert consultations"
  ON consultation_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update consultations"
  ON consultation_sessions FOR UPDATE
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 대기 중 상담 (scheduled/reminded)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW pending_consultations AS
SELECT
  cs.*,
  CASE
    WHEN cs.trigger_type = 'overdue_payment' THEN '미납'
    WHEN cs.trigger_type = 'low_vindex' THEN 'V-Index 낮음'
    WHEN cs.trigger_type = 'failed_payment' THEN '결제 실패'
    WHEN cs.trigger_type = 'absent_streak' THEN '연속 결석'
    WHEN cs.trigger_type = 'no_response' THEN '무응답'
  END AS trigger_label,
  CASE
    WHEN cs.status = 'scheduled' AND cs.scheduled_at < NOW() THEN true
    ELSE false
  END AS is_overdue
FROM consultation_sessions cs
WHERE cs.status IN ('scheduled', 'reminded')
ORDER BY cs.scheduled_at ASC;

COMMENT ON VIEW pending_consultations IS '대기 중인 상담 목록 (예약됨/리마인드됨)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 월별 상담 통계
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW consultation_monthly_stats AS
SELECT
  org_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_consultations,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (WHERE status IN ('scheduled', 'reminded')) AS pending_count,
  COUNT(*) FILTER (WHERE status = 'follow_up') AS follow_up_count,
  -- 트리거별 분포
  COUNT(*) FILTER (WHERE trigger_type = 'overdue_payment') AS overdue_triggered,
  COUNT(*) FILTER (WHERE trigger_type = 'low_vindex') AS vindex_triggered,
  COUNT(*) FILTER (WHERE trigger_type = 'absent_streak') AS absent_triggered
FROM consultation_sessions
GROUP BY org_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC;

COMMENT ON VIEW consultation_monthly_stats IS '월별 상담 통계';
