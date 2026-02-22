-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Encounter Kernel — 4개 핵심 테이블
--
-- encounters:   수업/만남의 단일 Truth
-- presence:     불변 출석 로그 (UPDATE/DELETE 금지)
-- ioo_trace:    Input-Operation-Output 감사추적 (append-only)
-- action_queue: 비동기 작업 큐 (retry + TTL + dedupe)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Encounters (수업/만남 커널)
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  encounter_type VARCHAR(30) NOT NULL DEFAULT 'lesson',
  -- CHECK (encounter_type IN ('lesson', 'care', 'clinic', 'consultation'))
  title VARCHAR(200),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  location VARCHAR(200),
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,
  class_id UUID REFERENCES atb_classes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  expected_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  -- 레거시 호환: atb_lesson_sessions.id 와 1:1 매핑 (FK는 테이블 존재 시 별도 추가)
  legacy_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_org ON encounters(org_id);
CREATE INDEX IF NOT EXISTS idx_encounters_scheduled ON encounters(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_coach ON encounters(coach_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounters_legacy ON encounters(legacy_session_id);

-- 2. Presence (불변 출석 로그)
CREATE TABLE IF NOT EXISTS presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,  -- entity or student ID
  subject_type VARCHAR(20) NOT NULL DEFAULT 'student',
  status VARCHAR(20) NOT NULL DEFAULT 'PRESENT'
    CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  recorded_by UUID,  -- coach or system
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  -- CHECK (source IN ('manual', 'qr', 'nfc', 'auto', 'system'))
  -- 중복 방지: 같은 encounter + subject에 대해 1회만
  dedupe_key VARCHAR(200) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_presence_encounter ON presence(encounter_id);
CREATE INDEX IF NOT EXISTS idx_presence_subject ON presence(subject_id);
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_recorded ON presence(recorded_at DESC);

-- 3. IOO Trace (Input-Operation-Output 감사추적)
CREATE TABLE IF NOT EXISTS ioo_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,  -- 같은 파이프라인의 INPUT/OPERATION/OUTPUT 그룹핑
  phase VARCHAR(20) NOT NULL
    CHECK (phase IN ('INPUT', 'OPERATION', 'OUTPUT')),
  actor VARCHAR(50) NOT NULL,  -- 'coach:uuid', 'system:worker', 'cron:action-queue'
  action VARCHAR(100) NOT NULL,  -- 'record_presence', 'send_kakao_alimtalk', etc.
  target_type VARCHAR(50),  -- 'presence', 'action_queue', 'kakao_message'
  target_id UUID,
  payload JSONB DEFAULT '{}',
  result VARCHAR(20) DEFAULT 'pending'
    CHECK (result IN ('pending', 'success', 'failure', 'skipped')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ioo_trace_id ON ioo_trace(trace_id);
CREATE INDEX IF NOT EXISTS idx_ioo_phase ON ioo_trace(phase);
CREATE INDEX IF NOT EXISTS idx_ioo_action ON ioo_trace(action);
CREATE INDEX IF NOT EXISTS idx_ioo_created ON ioo_trace(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ioo_result ON ioo_trace(result);

-- 4. Action Queue (비동기 작업 큐)
CREATE TABLE IF NOT EXISTS action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  -- 예: 'SEND_MESSAGE', 'SEND_PUSH', 'UPDATE_VINDEX', 'SCHEDULE_REMINDER'
  priority INTEGER NOT NULL DEFAULT 5,  -- 1=highest, 10=lowest
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
  payload JSONB NOT NULL DEFAULT '{}',
  -- 재시도
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  -- TTL (만료)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  -- 중복 방지
  dedupe_key VARCHAR(200),
  -- IOO 추적
  trace_id UUID,
  -- 처리 결과
  result JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_action_queue_status ON action_queue(status);
CREATE INDEX IF NOT EXISTS idx_action_queue_priority ON action_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_action_queue_next_retry ON action_queue(next_retry_at)
  WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS idx_action_queue_expires ON action_queue(expires_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_action_queue_trace ON action_queue(trace_id);
CREATE INDEX IF NOT EXISTS idx_action_queue_type ON action_queue(action_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS Policies: presence는 불변 (INSERT only), ioo_trace는 append-only
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioo_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;

-- Encounters: 인증된 사용자 CRUD
CREATE POLICY encounters_select ON encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY encounters_insert ON encounters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY encounters_update ON encounters FOR UPDATE TO authenticated USING (true);

-- Presence: INSERT만 허용 (불변)
CREATE POLICY presence_select ON presence FOR SELECT TO authenticated USING (true);
CREATE POLICY presence_insert ON presence FOR INSERT TO authenticated WITH CHECK (true);
-- UPDATE/DELETE 정책 없음 = 불변

-- IOO Trace: INSERT + SELECT만 허용 (append-only)
CREATE POLICY ioo_trace_select ON ioo_trace FOR SELECT TO authenticated USING (true);
CREATE POLICY ioo_trace_insert ON ioo_trace FOR INSERT TO authenticated WITH CHECK (true);
-- UPDATE/DELETE 정책 없음 = append-only

-- Action Queue: 시스템이 관리
CREATE POLICY action_queue_select ON action_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY action_queue_insert ON action_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY action_queue_update ON action_queue FOR UPDATE TO authenticated USING (true);

-- Service Role은 모든 테이블에 full access (Worker Gateway용)
CREATE POLICY encounters_service ON encounters FOR ALL TO service_role USING (true);
CREATE POLICY presence_service ON presence FOR ALL TO service_role USING (true);
CREATE POLICY ioo_trace_service ON ioo_trace FOR ALL TO service_role USING (true);
CREATE POLICY action_queue_service ON action_queue FOR ALL TO service_role USING (true);
