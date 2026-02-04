-- ============================================
-- AUTUS Database Migration v1.0 (FREEZE)
-- Generated: 2026-02-04
-- PostgreSQL 15+ / Supabase
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM ('COACH', 'ADMIN', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM (
        'SESSION_START',
        'SESSION_END',
        'INCIDENT_FLAG',
        'ATTENDANCE_SIGNAL_NONE',
        'ATTENDANCE_RESULT_COMPUTED',
        'MAKEUP_CREDIT_GRANTED',
        'UNAUTHORIZED_ATTENDANCE_SUSPECTED',
        'KAKAO_REPORT_ENQUEUED',
        'KAKAO_REPORT_LOGGED',
        'KAKAO_DELIVERY_FAILED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE session_state AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_type AS ENUM (
        'INCIDENT',
        'MAKEUP_DELAY',
        'UNAUTHORIZED',
        'KAKAO_FAIL',
        'ABSENCE_SUSPECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE outbox_status AS ENUM ('QUEUED', 'SENT', 'FAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE recipient_type AS ENUM ('PARENT', 'COACH', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- F1. event_log (원장 - 불변)
-- ============================================

CREATE TABLE IF NOT EXISTS event_log (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          event_type NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL,
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Actor
    actor_type          actor_type NOT NULL,
    actor_id            TEXT NOT NULL,

    -- Scope
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,
    session_id          UUID,
    incident_id         UUID,
    student_id          UUID,

    -- Idempotency (필수)
    idempotency_key     TEXT NOT NULL UNIQUE,

    -- Payload (최소)
    payload_json        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_log_session_id ON event_log(session_id);
CREATE INDEX IF NOT EXISTS idx_event_log_occurred_at ON event_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_log_event_type ON event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_org_academy ON event_log(org_id, academy_id);

COMMENT ON TABLE event_log IS '사실 기록 원장. 변경 불가. 모든 이벤트의 진실의 원천.';

-- ============================================
-- F2. policy_timers (정책 타이머)
-- ============================================

CREATE TABLE IF NOT EXISTS policy_timers (
    policy_id           TEXT PRIMARY KEY,
    version             TEXT NOT NULL DEFAULT '1.0',
    description         TEXT,

    -- Trigger
    trigger_event_type  event_type NOT NULL,

    -- Guard (조건)
    guard_event_type    event_type,
    guard_timeout_sec   INTEGER NOT NULL,

    -- Remediation
    remediation_action  TEXT NOT NULL,

    -- Metadata
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE policy_timers IS 'InfoVoid 정책 정의. A 발생 후 B가 일정 시간 내 없으면 공백 감지.';

-- Seed: 5개 최소 정책
INSERT INTO policy_timers (policy_id, trigger_event_type, guard_event_type, guard_timeout_sec, remediation_action, description) VALUES
    ('session_end_kakao_report', 'SESSION_END', 'KAKAO_REPORT_LOGGED', 300, 'CREATE_VOID_ALERT', 'SESSION_END 후 5분 내 카톡 보고 없으면 공백'),
    ('incident_admin_queue', 'INCIDENT_FLAG', NULL, 180, 'CREATE_ADMIN_QUEUE_ITEM', 'INCIDENT 후 3분 내 관리자 큐 생성 확인'),
    ('session_start_attendance', 'SESSION_START', 'ATTENDANCE_SIGNAL_NONE', 900, 'DETECT_NO_ATTENDANCE', 'SESSION_START 후 15분 내 출석 시그널 없으면 감지'),
    ('attendance_makeup_grant', 'ATTENDANCE_RESULT_COMPUTED', 'MAKEUP_CREDIT_GRANTED', 180, 'ALERT_MAKEUP_DELAY', '출석 결과 후 3분 내 보충 크레딧 없으면 알림'),
    ('kakao_fail_threshold', 'KAKAO_DELIVERY_FAILED', NULL, 3600, 'ESCALATE_KAKAO_FAIL', '1시간 내 카톡 실패 3회 이상이면 에스컬레이션')
ON CONFLICT (policy_id) DO NOTHING;

-- ============================================
-- F3. void_timers_state (활성 타이머)
-- ============================================

CREATE TABLE IF NOT EXISTS void_timers_state (
    timer_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id           TEXT NOT NULL REFERENCES policy_timers(policy_id),
    trigger_event_id    UUID NOT NULL REFERENCES event_log(event_id),

    -- Context
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,
    session_id          UUID,
    student_id          UUID,

    -- Timer
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,

    -- State
    is_satisfied        BOOLEAN NOT NULL DEFAULT FALSE,
    satisfied_at        TIMESTAMPTZ,
    satisfied_by_event  UUID REFERENCES event_log(event_id),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_void_timers_expires ON void_timers_state(expires_at) WHERE is_satisfied = FALSE;
CREATE INDEX IF NOT EXISTS idx_void_timers_session ON void_timers_state(session_id);

COMMENT ON TABLE void_timers_state IS '활성 InfoVoid 타이머. 만료 시 공백 감지 트리거.';

-- ============================================
-- F3. void_detections (공백 감지 기록)
-- ============================================

CREATE TABLE IF NOT EXISTS void_detections (
    detection_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timer_id            UUID NOT NULL REFERENCES void_timers_state(timer_id),
    policy_id           TEXT NOT NULL REFERENCES policy_timers(policy_id),

    -- Context
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,
    session_id          UUID,
    student_id          UUID,

    -- Detection
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remediation_action  TEXT NOT NULL,

    -- Processing
    is_processed        BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_void_detections_unprocessed ON void_detections(detected_at) WHERE is_processed = FALSE;

COMMENT ON TABLE void_detections IS '공백 감지 기록. remediation_action 실행 대기.';

-- ============================================
-- F4. kakao_outbox (카카오 전송 의도)
-- ============================================

CREATE TABLE IF NOT EXISTS kakao_outbox (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedupe_key          TEXT NOT NULL UNIQUE,

    -- Template
    template_id         TEXT NOT NULL,

    -- Recipient
    recipient_type      recipient_type NOT NULL DEFAULT 'PARENT',
    recipient_student_id UUID,

    -- Context
    context_json        JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Status
    status              outbox_status NOT NULL DEFAULT 'QUEUED',
    attempt_count       INTEGER NOT NULL DEFAULT 0,

    -- Lease (Worker claim)
    lease_owner         TEXT,
    lease_until         TIMESTAMPTZ,
    next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Error tracking
    last_error_code     TEXT,
    last_error_detail   TEXT,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kakao_outbox_queued ON kakao_outbox(next_attempt_at)
    WHERE status = 'QUEUED';
CREATE INDEX IF NOT EXISTS idx_kakao_outbox_lease ON kakao_outbox(lease_until)
    WHERE status = 'QUEUED' AND lease_owner IS NOT NULL;

COMMENT ON TABLE kakao_outbox IS '카카오 메시지 전송 Outbox. Worker가 claim하여 처리.';

-- ============================================
-- F5. admin_queue (관리자 예외 큐)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_queue (
    queue_item_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_type          queue_type NOT NULL,
    status              queue_status NOT NULL DEFAULT 'OPEN',
    severity            severity_level NOT NULL DEFAULT 'MEDIUM',

    -- Context
    case_id             UUID,
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,
    session_id          UUID,
    incident_id         UUID,
    student_id          UUID,

    -- Action
    next_action_code    TEXT,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    resolved_by         TEXT,
    resolution_code     TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_queue_open ON admin_queue(created_at) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_admin_queue_type ON admin_queue(queue_type, status);
CREATE INDEX IF NOT EXISTS idx_admin_queue_severity ON admin_queue(severity, created_at) WHERE status = 'OPEN';

COMMENT ON TABLE admin_queue IS '관리자 예외 큐. LOD2 화면 데이터 소스.';

-- ============================================
-- F6. proofpack (증빙 팩)
-- ============================================

CREATE TABLE IF NOT EXISTS proofpack (
    proofpack_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,

    -- Integrity
    hash                TEXT NOT NULL,

    -- Content
    format_versions     JSONB NOT NULL DEFAULT '{"pdf": "1.0", "json": "1.0"}'::jsonb,
    artifact_path       TEXT NOT NULL,

    -- Policy snapshot
    policy_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timeline snapshot
    timeline_snapshot   JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Delivery logs
    delivery_logs       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Timestamps
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proofpack_case ON proofpack(case_id);

COMMENT ON TABLE proofpack IS '분쟁/감사 대응 증빙 팩. PDF/JSON 형식.';

-- ============================================
-- SUPPORTING TABLES
-- ============================================

-- autus_sessions (Coach App 조회용)
CREATE TABLE IF NOT EXISTS autus_sessions (
    session_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,

    -- Schedule
    scheduled_date      DATE NOT NULL,
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,

    -- Info
    group_label         TEXT NOT NULL,
    location_label      TEXT NOT NULL,
    court_id            TEXT,

    -- State
    session_state       session_state NOT NULL DEFAULT 'SCHEDULED',

    -- Recording
    is_recording        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autus_sessions_date ON autus_sessions(scheduled_date, academy_id);

-- autus_students (Roster용, 최소 정보만)
CREATE TABLE IF NOT EXISTS autus_students (
    student_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,

    -- Display (최소 정보만)
    display_name        TEXT NOT NULL,
    photo_url           TEXT,

    -- Safety (강사가 알아야 할 것만)
    safety_flags        TEXT[] DEFAULT '{}',
    badges              TEXT[] DEFAULT '{}',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- autus_session_students (Session-Student mapping)
CREATE TABLE IF NOT EXISTS autus_session_students (
    session_id          UUID NOT NULL REFERENCES autus_sessions(session_id),
    student_id          UUID NOT NULL REFERENCES autus_students(student_id),
    PRIMARY KEY (session_id, student_id)
);

-- autus_coaches
CREATE TABLE IF NOT EXISTS autus_coaches (
    coach_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              TEXT NOT NULL,
    academy_id          TEXT NOT NULL,

    display_name        TEXT NOT NULL,
    auth_code           TEXT NOT NULL UNIQUE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

-- autus_session_coaches (Session-Coach mapping)
CREATE TABLE IF NOT EXISTS autus_session_coaches (
    session_id          UUID NOT NULL REFERENCES autus_sessions(session_id),
    coach_id            UUID NOT NULL REFERENCES autus_coaches(coach_id),
    PRIMARY KEY (session_id, coach_id)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Claim Kakao Outbox (Worker용)
CREATE OR REPLACE FUNCTION claim_kakao_outbox(
    p_worker_id TEXT,
    p_lease_seconds INTEGER DEFAULT 60,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    template_id TEXT,
    recipient_student_id UUID,
    context_json JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        UPDATE kakao_outbox
        SET
            lease_owner = p_worker_id,
            lease_until = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
            updated_at = NOW()
        WHERE kakao_outbox.id IN (
            SELECT o.id
            FROM kakao_outbox o
            WHERE o.status = 'QUEUED'
              AND o.next_attempt_at <= NOW()
              AND (o.lease_until IS NULL OR o.lease_until < NOW())
            ORDER BY o.next_attempt_at
            LIMIT p_limit
            FOR UPDATE SKIP LOCKED
        )
        RETURNING kakao_outbox.*
    )
    SELECT claimed.id, claimed.template_id, claimed.recipient_student_id, claimed.context_json
    FROM claimed;
END;
$$ LANGUAGE plpgsql;

-- Backoff Helper (60s → 300s → FAIL)
CREATE OR REPLACE FUNCTION update_kakao_outbox_failure(
    p_id UUID,
    p_error_code TEXT,
    p_error_detail TEXT
)
RETURNS VOID AS $$
DECLARE
    v_attempt_count INTEGER;
BEGIN
    SELECT attempt_count INTO v_attempt_count FROM kakao_outbox WHERE id = p_id;

    IF v_attempt_count >= 2 THEN
        UPDATE kakao_outbox
        SET status = 'FAIL',
            last_error_code = p_error_code,
            last_error_detail = p_error_detail,
            lease_owner = NULL,
            lease_until = NULL,
            updated_at = NOW()
        WHERE id = p_id;
    ELSE
        UPDATE kakao_outbox
        SET attempt_count = attempt_count + 1,
            next_attempt_at = NOW() + (CASE WHEN attempt_count = 0 THEN 60 ELSE 300 END || ' seconds')::INTERVAL,
            last_error_code = p_error_code,
            last_error_detail = p_error_detail,
            lease_owner = NULL,
            lease_until = NULL,
            updated_at = NOW()
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS tr_autus_sessions_updated_at ON autus_sessions;
CREATE TRIGGER tr_autus_sessions_updated_at
    BEFORE UPDATE ON autus_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_kakao_outbox_updated_at ON kakao_outbox;
CREATE TRIGGER tr_kakao_outbox_updated_at
    BEFORE UPDATE ON kakao_outbox
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_autus_students_updated_at ON autus_students;
CREATE TRIGGER tr_autus_students_updated_at
    BEFORE UPDATE ON autus_students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_timers_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofpack ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_coaches ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 모든 인증된 사용자 허용 (개발 단계)
CREATE POLICY "Allow all on event_log" ON event_log FOR ALL USING (true);
CREATE POLICY "Allow all on policy_timers" ON policy_timers FOR ALL USING (true);
CREATE POLICY "Allow all on void_timers_state" ON void_timers_state FOR ALL USING (true);
CREATE POLICY "Allow all on void_detections" ON void_detections FOR ALL USING (true);
CREATE POLICY "Allow all on kakao_outbox" ON kakao_outbox FOR ALL USING (true);
CREATE POLICY "Allow all on admin_queue" ON admin_queue FOR ALL USING (true);
CREATE POLICY "Allow all on proofpack" ON proofpack FOR ALL USING (true);
CREATE POLICY "Allow all on autus_sessions" ON autus_sessions FOR ALL USING (true);
CREATE POLICY "Allow all on autus_students" ON autus_students FOR ALL USING (true);
CREATE POLICY "Allow all on autus_coaches" ON autus_coaches FOR ALL USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Coach Today View
CREATE OR REPLACE VIEW coach_today_sessions AS
SELECT
    s.session_id,
    s.org_id,
    s.academy_id,
    s.scheduled_date,
    TO_CHAR(s.start_time, 'HH24:MI') || ' - ' || TO_CHAR(s.end_time, 'HH24:MI') AS time_range,
    s.group_label,
    s.location_label,
    s.session_state,
    s.is_recording,
    s.session_state = 'SCHEDULED' AS can_start,
    s.session_state = 'IN_PROGRESS' AS can_end,
    s.session_state = 'IN_PROGRESS' AS can_incident,
    (SELECT COUNT(*) FROM autus_session_students ss WHERE ss.session_id = s.session_id) AS student_count
FROM autus_sessions s
WHERE s.scheduled_date = CURRENT_DATE
ORDER BY s.start_time;

-- Admin Today Summary View
CREATE OR REPLACE VIEW admin_today_summary AS
SELECT
    (SELECT COUNT(*) FROM autus_sessions WHERE scheduled_date = CURRENT_DATE) AS total_sessions,
    (SELECT COUNT(*) FROM admin_queue WHERE status = 'OPEN' AND queue_type = 'ABSENCE_SUSPECTED') AS absence_suspected,
    (SELECT COUNT(*) FROM admin_queue WHERE status = 'OPEN' AND queue_type = 'INCIDENT') AS incidents,
    (SELECT COUNT(*) FROM kakao_outbox WHERE status = 'FAIL' AND created_at > CURRENT_DATE) AS kakao_failures,
    (SELECT COUNT(*) FROM admin_queue WHERE status = 'OPEN' AND queue_type = 'MAKEUP_DELAY') AS makeup_delayed;

-- Admin Queue View
CREATE OR REPLACE VIEW admin_queue_view AS
SELECT
    q.queue_item_id,
    q.queue_type,
    q.status,
    q.severity,
    q.case_id,
    q.session_id,
    q.student_id,
    q.next_action_code,
    EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 60 AS age_minutes,
    CASE q.severity
        WHEN 'CRITICAL' THEN 15
        WHEN 'HIGH' THEN 30
        WHEN 'MEDIUM' THEN 60
        ELSE 120
    END AS sla_minutes,
    q.created_at
FROM admin_queue q
WHERE q.status = 'OPEN'
ORDER BY
    CASE q.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END,
    q.created_at;

-- ============================================
-- END OF MIGRATION v1.0
-- ============================================
