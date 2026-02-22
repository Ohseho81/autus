-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2: 결제선생 + 상담선생 + 위험감지
--
-- risk_flags:          위험 신호 감지 + 자동 에스컬레이션
-- payment_invoices:    결제선생 청구서 추적 (기존 migration 통합)
-- consultation_sessions: 상담선생 세션 (기존 migration 통합)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM 정의 (존재하면 건너뜀)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_trigger_type AS ENUM (
    'overdue_payment', 'low_vindex', 'failed_payment',
    'absent_streak', 'no_response'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE consultation_status AS ENUM (
    'scheduled', 'reminded', 'in_progress',
    'completed', 'cancelled', 'follow_up'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payssam_invoice_status AS ENUM (
    'pending', 'sent', 'paid', 'overdue', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. risk_flags — 위험 신호 감지
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,

  -- 위험 유형 + 심각도
  trigger_type risk_trigger_type NOT NULL,
  severity risk_severity NOT NULL DEFAULT 'medium',

  -- 스냅샷 (감지 시점의 데이터)
  snapshot JSONB NOT NULL DEFAULT '{}',
  -- {attendance_rate, overdue_amount, absent_streak, v_index, last_payment_date}

  -- 상태 관리
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED', 'EXPIRED')),

  -- 자동 액션 연결
  action_taken VARCHAR(100),  -- 'auto_consultation', 'send_reminder', 'escalate_to_owner'
  action_queue_id UUID,       -- action_queue FK
  consultation_id UUID,       -- consultation_sessions FK (자동 상담 예약 시)

  -- 중복 방지
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  -- 형식: RISK-{org_id}-{student_id}-{trigger_type}-{YYYYMMDD}

  -- IOO 추적
  trace_id UUID,

  -- TTL
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_flags_student ON risk_flags(student_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_org ON risk_flags(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_status ON risk_flags(status);
CREATE INDEX IF NOT EXISTS idx_risk_flags_severity ON risk_flags(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_flags_trigger ON risk_flags(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_flags_open ON risk_flags(status, expires_at)
  WHERE status IN ('OPEN', 'ACKNOWLEDGED');
CREATE INDEX IF NOT EXISTS idx_risk_flags_trace ON risk_flags(trace_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. payment_invoices — 결제선생 청구서
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  student_id UUID,
  parent_phone VARCHAR(20) NOT NULL,

  -- 청구 정보
  amount INTEGER NOT NULL CHECK (amount > 0),
  description VARCHAR(200) NOT NULL,
  due_date DATE,

  -- 결제선생 외부 ID
  payssam_invoice_id VARCHAR(100),

  -- 상태
  status payssam_invoice_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  callback_received_at TIMESTAMPTZ,

  -- 포인트 비용
  point_cost INTEGER DEFAULT 55,

  -- 에러 추적
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- API 응답 보존
  raw_response JSONB,

  -- 중복 방지
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,

  -- IOO 추적
  trace_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_student ON payment_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_status ON payment_invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_org ON payment_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_created ON payment_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_overdue ON payment_invoices(status, due_date)
  WHERE status IN ('sent', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payment_invoices_trace ON payment_invoices(trace_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. consultation_sessions — 상담선생
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  student_id UUID NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,

  -- 상태
  status consultation_status NOT NULL DEFAULT 'scheduled',

  -- 트리거 (IOO: Input)
  trigger_type risk_trigger_type NOT NULL,
  trigger_snapshot JSONB DEFAULT '{}',
  risk_flag_id UUID REFERENCES risk_flags(id) ON DELETE SET NULL,

  -- 일정
  scheduled_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 결과 (IOO: Output)
  coach_notes TEXT,
  follow_up_actions JSONB DEFAULT '[]',

  -- 중복 방지
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,

  -- IOO 추적
  trace_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_student ON consultation_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON consultation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_consultation_org ON consultation_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_consultation_created ON consultation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_scheduled ON consultation_sessions(scheduled_at)
  WHERE status IN ('scheduled', 'reminded');
CREATE INDEX IF NOT EXISTS idx_consultation_trigger ON consultation_sessions(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_risk ON consultation_sessions(risk_flag_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 자동 갱신 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER risk_flags_updated_at BEFORE UPDATE ON risk_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER payment_invoices_updated_at BEFORE UPDATE ON payment_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER consultation_sessions_updated_at BEFORE UPDATE ON consultation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;

-- risk_flags: 인증 사용자 조회, 시스템 관리
CREATE POLICY risk_flags_select ON risk_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY risk_flags_insert ON risk_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY risk_flags_update ON risk_flags FOR UPDATE TO authenticated USING (true);
CREATE POLICY risk_flags_service ON risk_flags FOR ALL TO service_role USING (true);

-- payment_invoices: 인증 사용자 조회, 시스템 관리
CREATE POLICY payment_invoices_select ON payment_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY payment_invoices_insert ON payment_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY payment_invoices_update ON payment_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY payment_invoices_service ON payment_invoices FOR ALL TO service_role USING (true);

-- consultation_sessions: 인증 사용자 조회, 시스템 관리
CREATE POLICY consultation_select ON consultation_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY consultation_insert ON consultation_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY consultation_update ON consultation_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY consultation_service ON consultation_sessions FOR ALL TO service_role USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 미납 청구서
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
  pi.*,
  CURRENT_DATE - pi.due_date AS days_overdue
FROM payment_invoices pi
WHERE pi.status IN ('sent', 'overdue')
  AND pi.due_date < CURRENT_DATE
ORDER BY pi.due_date ASC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 대기 중 상담
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 활성 위험 플래그
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW active_risk_flags AS
SELECT
  rf.*,
  CASE
    WHEN rf.severity = 'critical' THEN 1
    WHEN rf.severity = 'high' THEN 2
    WHEN rf.severity = 'medium' THEN 3
    WHEN rf.severity = 'low' THEN 4
  END AS severity_order
FROM risk_flags rf
WHERE rf.status IN ('OPEN', 'ACKNOWLEDGED')
  AND rf.expires_at > NOW()
ORDER BY severity_order ASC, rf.created_at DESC;
