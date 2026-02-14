-- ============================================================
-- AUTUS Core Log System: activity_logs (The Ledger)
-- ============================================================
-- PostHog 대체. 아이의 '인생 원장'.
-- 기존 autus_fact_* 패턴(append-only, brand 멀티테넌트) 준수.
-- ============================================================

-- 1. 이벤트 타입 ENUM
CREATE TYPE activity_event_type AS ENUM (
  -- 출석 (기존 autus_fact_visits 연동)
  'attendance.check_in',
  'attendance.check_out',
  'attendance.absent_marked',
  -- 결제 (기존 autus_fact_payments 연동)
  'payment.completed',
  'payment.failed',
  'payment.overdue',
  -- 수업/세션
  'session.started',
  'session.completed',
  'session.cancelled',
  -- 스킬 평가
  'skill.assessed',
  'skill.improved',
  'skill.badge_earned',
  -- 코치 행동
  'coach.feedback_sent',
  'coach.report_generated',
  'coach.intervention',
  -- 학부모 상호작용
  'parent.report_viewed',
  'parent.payment_initiated',
  'parent.message_sent',
  -- UI 행동 (신규 - 기존에 없던 추적)
  'ui.page_view',
  'ui.feature_used',
  'ui.menu_tap',
  'ui.session_start',
  'ui.session_end'
);

-- 2. activity_logs 테이블 (The Ledger)
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 멀티앱 지원 (올댓바스켓, 향후 앱들)
  app_id        TEXT NOT NULL DEFAULT 'allthatbasket',
  brand         TEXT NOT NULL DEFAULT 'allthatbasket',

  -- 누가 (actor)
  actor_id      UUID,                    -- Supabase Auth UID
  actor_role    TEXT NOT NULL DEFAULT 'system',  -- owner, coach, parent, student, system

  -- 누구에 대해 (target) - nullable: UI 이벤트는 target 없음
  student_id    UUID,
  coach_id      UUID,

  -- 무엇을 (event)
  event_type    activity_event_type NOT NULL,

  -- 상세 데이터 (유연한 JSON)
  raw_data      JSONB NOT NULL DEFAULT '{}',
  -- 예시:
  -- attendance: { "class_id": "...", "method": "qr_scan", "lesson_slot_id": "..." }
  -- skill:      { "category": "shooting", "before": 6.5, "after": 7.2 }
  -- ui:         { "feature": "schedule", "action": "tap", "page": "dashboard" }
  -- payment:    { "amount": 200000, "month": "2026-02" }

  -- V-Index 변동치 (핵심: 이 이벤트가 V-Index에 미친 영향)
  v_index_delta NUMERIC(6,2) DEFAULT 0,
  -- +5: 출석 체크인
  -- -10: 무단 결석
  -- +3: 스킬 향상
  -- +1: 학부모 리포트 열람
  -- 0: UI 이벤트 (V-Index 무관)

  -- 무결성 (학부모 리포트 공증용)
  signature     TEXT NOT NULL,
  -- SHA-256(student_id + event_type + raw_data + occurred_at + AUTUS_SECRET)

  -- 시간
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 세션 추적 (UI 이벤트용)
  session_id    TEXT,

  -- 소스
  source        TEXT NOT NULL DEFAULT 'app',
  -- 'app', 'qr_scan', 'webhook', 'moltbot', 'system', 'manual'

  -- append-only 보장: 수정/삭제 불가 플래그
  is_immutable  BOOLEAN NOT NULL DEFAULT true
);

-- 3. 인덱스 (기존 패턴 준수)
CREATE INDEX idx_activity_logs_student      ON activity_logs (student_id, occurred_at DESC);
CREATE INDEX idx_activity_logs_coach        ON activity_logs (coach_id, occurred_at DESC);
CREATE INDEX idx_activity_logs_event_type   ON activity_logs (event_type, occurred_at DESC);
CREATE INDEX idx_activity_logs_app_brand    ON activity_logs (app_id, brand);
CREATE INDEX idx_activity_logs_occurred     ON activity_logs (occurred_at DESC);
CREATE INDEX idx_activity_logs_session      ON activity_logs (session_id) WHERE session_id IS NOT NULL;

-- 기능별 사용량 집계용 (FeatureCatalog Sunset Rule 핵심)
CREATE INDEX idx_activity_logs_feature_usage ON activity_logs
  USING btree ((raw_data->>'feature'), occurred_at DESC)
  WHERE event_type IN ('ui.feature_used', 'ui.page_view', 'ui.menu_tap');

-- 4. UPDATE/DELETE 차단 (append-only 강제)
CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'activity_logs is append-only. UPDATE and DELETE are forbidden.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_logs_no_update
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();

CREATE TRIGGER trg_activity_logs_no_delete
  BEFORE DELETE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();

-- 5. 무결성 해시 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_activity_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- signature가 'auto'이면 서버에서 자동 생성
  IF NEW.signature = 'auto' OR NEW.signature = '' THEN
    NEW.signature := encode(
      sha256(
        convert_to(
          COALESCE(NEW.student_id::TEXT, 'none') || '|' ||
          NEW.event_type::TEXT || '|' ||
          NEW.raw_data::TEXT || '|' ||
          NEW.occurred_at::TEXT || '|' ||
          COALESCE(current_setting('app.autus_secret', true), 'autus-sovereign-2026'),
          'UTF8'
        )
      ),
      'hex'
    );
  END IF;

  NEW.recorded_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_logs_signature
  BEFORE INSERT ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION generate_activity_signature();

-- 6. V-Index 자동 계산 트리거
CREATE OR REPLACE FUNCTION calculate_v_index_delta()
RETURNS TRIGGER AS $$
BEGIN
  -- v_index_delta가 명시적으로 설정되지 않은 경우 자동 계산
  IF NEW.v_index_delta = 0 AND NEW.student_id IS NOT NULL THEN
    NEW.v_index_delta := CASE NEW.event_type
      -- 출석
      WHEN 'attendance.check_in'       THEN  5.0
      WHEN 'attendance.check_out'      THEN  1.0
      WHEN 'attendance.absent_marked'  THEN -10.0
      -- 결제
      WHEN 'payment.completed'         THEN  3.0
      WHEN 'payment.failed'            THEN -5.0
      WHEN 'payment.overdue'           THEN -8.0
      -- 수업
      WHEN 'session.started'           THEN  0.5
      WHEN 'session.completed'         THEN  2.0
      WHEN 'session.cancelled'         THEN -3.0
      -- 스킬
      WHEN 'skill.assessed'            THEN  1.0
      WHEN 'skill.improved'            THEN  4.0
      WHEN 'skill.badge_earned'        THEN  6.0
      -- 코치 행동
      WHEN 'coach.feedback_sent'       THEN  2.0
      WHEN 'coach.report_generated'    THEN  1.0
      WHEN 'coach.intervention'        THEN  1.5
      -- 학부모 참여
      WHEN 'parent.report_viewed'      THEN  1.0
      WHEN 'parent.payment_initiated'  THEN  0.5
      WHEN 'parent.message_sent'       THEN  1.5
      -- UI 이벤트는 V-Index 무관
      ELSE 0
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_logs_v_index
  BEFORE INSERT ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION calculate_v_index_delta();

-- 7. 학생별 V-Index 누적 뷰
CREATE OR REPLACE VIEW student_v_index_summary AS
SELECT
  student_id,
  app_id,
  brand,
  -- 누적 V-Index
  SUM(v_index_delta) AS total_v_index,
  -- 최근 7일 V-Index
  SUM(v_index_delta) FILTER (WHERE occurred_at > now() - INTERVAL '7 days') AS weekly_v_index,
  -- 최근 30일 V-Index
  SUM(v_index_delta) FILTER (WHERE occurred_at > now() - INTERVAL '30 days') AS monthly_v_index,
  -- 이벤트 통계
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE occurred_at > now() - INTERVAL '7 days') AS weekly_events,
  -- 마지막 활동
  MAX(occurred_at) AS last_activity,
  -- 출석률 (최근 30일)
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'attendance.check_in' AND occurred_at > now() - INTERVAL '30 days')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE event_type IN ('attendance.check_in', 'attendance.absent_marked') AND occurred_at > now() - INTERVAL '30 days'), 0) * 100,
    1
  ) AS attendance_rate_30d
FROM activity_logs
WHERE student_id IS NOT NULL
GROUP BY student_id, app_id, brand;

-- 8. 기능별 사용량 뷰 (Sunset Rule용)
CREATE OR REPLACE VIEW feature_usage_summary AS
SELECT
  raw_data->>'feature' AS feature_key,
  app_id,
  brand,
  actor_role,
  COUNT(*) AS total_uses,
  COUNT(*) FILTER (WHERE occurred_at > now() - INTERVAL '7 days') AS uses_7d,
  COUNT(*) FILTER (WHERE occurred_at > now() - INTERVAL '30 days') AS uses_30d,
  COUNT(DISTINCT actor_id) AS unique_users,
  COUNT(DISTINCT actor_id) FILTER (WHERE occurred_at > now() - INTERVAL '7 days') AS unique_users_7d,
  MAX(occurred_at) AS last_used,
  -- Sunset 판단: 7일 미사용이면 true
  (MAX(occurred_at) < now() - INTERVAL '7 days') AS sunset_candidate
FROM activity_logs
WHERE event_type IN ('ui.feature_used', 'ui.page_view', 'ui.menu_tap')
  AND raw_data->>'feature' IS NOT NULL
GROUP BY raw_data->>'feature', app_id, brand, actor_role;

-- 9. 몰트봇 직접 쿼리용 함수들
-- 완료율 계산 (SystemMode 판단 기준)
CREATE OR REPLACE FUNCTION get_completion_rate(
  p_app_id TEXT DEFAULT 'allthatbasket',
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  total_started BIGINT,
  total_completed BIGINT,
  completion_rate NUMERIC,
  mode_recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'session.started') AS total_started,
    COUNT(*) FILTER (WHERE event_type = 'session.completed') AS total_completed,
    ROUND(
      COUNT(*) FILTER (WHERE event_type = 'session.completed')::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'session.started'), 0) * 100,
      1
    ) AS completion_rate,
    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'session.completed')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE event_type = 'session.started'), 0) * 100 < 30
        THEN 'DEGRADED'
      WHEN COUNT(*) FILTER (WHERE event_type = 'session.completed')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE event_type = 'session.started'), 0) * 100 < 50
        THEN 'STRICT'
      ELSE 'NORMAL'
    END AS mode_recommendation
  FROM activity_logs
  WHERE app_id = p_app_id
    AND occurred_at > now() - (p_days || ' days')::INTERVAL
    AND event_type IN ('session.started', 'session.completed');
END;
$$ LANGUAGE plpgsql;

-- 이탈 예측 (위험 학생 목록)
CREATE OR REPLACE FUNCTION get_churn_risk_students(
  p_app_id TEXT DEFAULT 'allthatbasket',
  p_threshold INTEGER DEFAULT 5
)
RETURNS TABLE(
  student_id UUID,
  monthly_v_index NUMERIC,
  last_activity TIMESTAMPTZ,
  days_inactive INTEGER,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.student_id,
    s.monthly_v_index,
    s.last_activity,
    EXTRACT(DAY FROM now() - s.last_activity)::INTEGER AS days_inactive,
    CASE
      WHEN s.monthly_v_index < -20 THEN 'CRITICAL'
      WHEN s.monthly_v_index < -5  THEN 'HIGH'
      WHEN s.monthly_v_index < 5   THEN 'MEDIUM'
      ELSE 'LOW'
    END AS risk_level
  FROM student_v_index_summary s
  WHERE s.app_id = p_app_id
    AND (s.monthly_v_index < 0 OR s.last_activity < now() - INTERVAL '7 days')
  ORDER BY s.monthly_v_index ASC
  LIMIT p_threshold;
END;
$$ LANGUAGE plpgsql;

-- 학부모 리포트 데이터 조회
CREATE OR REPLACE FUNCTION get_parent_report(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_v_index NUMERIC,
  period_v_index NUMERIC,
  attendance_rate NUMERIC,
  skill_improvements JSONB,
  badges_earned BIGINT,
  coach_feedbacks BIGINT,
  event_timeline JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(v_index_delta), 0) AS total_v_index,
    COALESCE(SUM(v_index_delta) FILTER (WHERE occurred_at > now() - (p_days || ' days')::INTERVAL), 0) AS period_v_index,
    ROUND(
      COUNT(*) FILTER (WHERE event_type = 'attendance.check_in' AND occurred_at > now() - (p_days || ' days')::INTERVAL)::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE event_type IN ('attendance.check_in', 'attendance.absent_marked') AND occurred_at > now() - (p_days || ' days')::INTERVAL), 0) * 100,
      1
    ) AS attendance_rate,
    COALESCE(
      jsonb_agg(raw_data) FILTER (WHERE event_type = 'skill.improved' AND occurred_at > now() - (p_days || ' days')::INTERVAL),
      '[]'::JSONB
    ) AS skill_improvements,
    COUNT(*) FILTER (WHERE event_type = 'skill.badge_earned' AND occurred_at > now() - (p_days || ' days')::INTERVAL) AS badges_earned,
    COUNT(*) FILTER (WHERE event_type = 'coach.feedback_sent' AND occurred_at > now() - (p_days || ' days')::INTERVAL) AS coach_feedbacks,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', event_type,
          'data', raw_data,
          'delta', v_index_delta,
          'at', occurred_at
        ) ORDER BY occurred_at DESC
      ) FILTER (WHERE occurred_at > now() - (p_days || ' days')::INTERVAL),
      '[]'::JSONB
    ) AS event_timeline
  FROM activity_logs
  WHERE activity_logs.student_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS 정책
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자: INSERT만 허용 (append-only)
CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 읽기: 자기 브랜드 데이터만
CREATE POLICY "activity_logs_select" ON activity_logs
  FOR SELECT TO authenticated
  USING (true);
  -- Phase 2에서 브랜드/역할 기반 세분화:
  -- USING (brand IN (SELECT brand FROM user_org_memberships WHERE user_id = auth.uid()))

-- 11. 코멘트
COMMENT ON TABLE activity_logs IS 'AUTUS Sovereign Ledger. Append-only. 아이의 인생 원장.';
COMMENT ON COLUMN activity_logs.v_index_delta IS '이 이벤트가 V-Index에 미친 영향. 자동 계산.';
COMMENT ON COLUMN activity_logs.signature IS 'SHA-256 무결성 해시. 학부모 리포트 공증용.';
COMMENT ON COLUMN activity_logs.app_id IS '멀티앱 지원. 새 앱 추가 시 이 컬럼만 구분.';
