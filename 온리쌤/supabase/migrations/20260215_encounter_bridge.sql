-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Bridge Layer — 레거시 호환
--
-- 뷰 2개: 레거시 → Encounter 매핑
-- 함수 2개: Dual Write (새 테이블 + 레거시 동시 기록)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- View 1: atb_lesson_sessions → encounters 뷰
-- ─────────────────────────────────────────────────────────────────────────────

-- View 1은 atb_lesson_sessions 테이블 존재 시 별도 생성
-- 현재는 encounters 단독 뷰로 생성
CREATE OR REPLACE VIEW v_legacy_sessions_as_encounters AS
SELECT
  e.id,
  e.org_id,
  e.encounter_type,
  e.title,
  e.scheduled_at,
  e.duration_minutes,
  e.location,
  e.coach_id,
  e.class_id,
  e.status,
  e.expected_count,
  e.actual_count,
  e.started_at,
  e.ended_at,
  e.legacy_session_id,
  NULL::VARCHAR AS legacy_name,
  NULL::DATE AS legacy_date,
  NULL::TIME AS legacy_start_time,
  NULL::TIME AS legacy_end_time,
  NULL::INTEGER AS legacy_student_count,
  NULL::INTEGER AS legacy_attendance_count,
  e.created_at,
  e.updated_at
FROM encounters e;

-- ─────────────────────────────────────────────────────────────────────────────
-- View 2: attendance_records → presence 뷰
-- ─────────────────────────────────────────────────────────────────────────────

-- View 2: attendance_records 컬럼 매핑은 스키마 확정 후 추가
CREATE OR REPLACE VIEW v_legacy_attendance_as_presence AS
SELECT
  p.id,
  p.encounter_id,
  p.subject_id,
  p.subject_type,
  p.status,
  p.recorded_by,
  p.recorded_at,
  p.source,
  p.dedupe_key,
  NULL::UUID AS legacy_student_id,
  NULL::UUID AS legacy_lesson_slot_id,
  NULL::DATE AS legacy_date,
  NULL::TIMESTAMPTZ AS legacy_check_in,
  NULL::TIMESTAMPTZ AS legacy_check_out,
  NULL::VARCHAR AS legacy_status,
  NULL::NUMERIC AS legacy_revenue,
  p.created_at
FROM presence p;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function 1: create_encounter_with_legacy()
-- Encounter 생성 + atb_lesson_sessions 동시 생성
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_encounter_with_legacy(
  p_org_id UUID,
  p_title VARCHAR,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 90,
  p_location VARCHAR DEFAULT NULL,
  p_coach_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL,
  p_expected_count INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_encounter_id UUID;
  v_session_id UUID;
BEGIN
  -- 1. 레거시 atb_lesson_sessions 생성 (테이블 존재 시)
  BEGIN
    EXECUTE format(
      'INSERT INTO atb_lesson_sessions (class_id, coach_id, name, location, session_date, start_time, end_time, student_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id'
    )
    USING p_class_id, p_coach_id, p_title, p_location,
      (p_scheduled_at AT TIME ZONE 'Asia/Seoul')::DATE,
      (p_scheduled_at AT TIME ZONE 'Asia/Seoul')::TIME,
      ((p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL) AT TIME ZONE 'Asia/Seoul')::TIME,
      p_expected_count, 'SCHEDULED'
    INTO v_session_id;
  EXCEPTION WHEN undefined_table THEN
    v_session_id := NULL;  -- 레거시 테이블 없으면 건너뜀
  END;

  -- 2. Encounter 생성
  INSERT INTO encounters (
    org_id, encounter_type, title, scheduled_at,
    duration_minutes, location, coach_id, class_id,
    status, expected_count, legacy_session_id
  ) VALUES (
    p_org_id, 'lesson', p_title, p_scheduled_at,
    p_duration_minutes, p_location, p_coach_id, p_class_id,
    'SCHEDULED', p_expected_count, v_session_id
  )
  RETURNING id INTO v_encounter_id;

  RETURN v_encounter_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function 2: record_presence_with_legacy()
-- Dual Write: presence + attendance_records 동시 기록
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_presence_with_legacy(
  p_encounter_id UUID,
  p_subject_id UUID,
  p_status VARCHAR DEFAULT 'PRESENT',
  p_recorded_by UUID DEFAULT NULL,
  p_source VARCHAR DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_presence_id UUID;
  v_dedupe_key VARCHAR;
  v_encounter RECORD;
  v_legacy_status VARCHAR;
BEGIN
  -- Encounter 정보 조회
  SELECT * INTO v_encounter
  FROM encounters
  WHERE id = p_encounter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encounter not found: %', p_encounter_id;
  END IF;

  -- Dedupe key 생성
  v_dedupe_key := 'presence:' || p_encounter_id || ':' || p_subject_id;

  -- 1. Presence 기록 (dedupe_key로 중복 방지)
  INSERT INTO presence (
    encounter_id, subject_id, subject_type, status,
    recorded_by, source, dedupe_key
  ) VALUES (
    p_encounter_id, p_subject_id, 'student', p_status,
    p_recorded_by, p_source, v_dedupe_key
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_presence_id;

  -- 이미 존재하는 경우 기존 ID 반환
  IF v_presence_id IS NULL THEN
    SELECT id INTO v_presence_id FROM presence WHERE dedupe_key = v_dedupe_key;
    RETURN v_presence_id;
  END IF;

  -- 2. 레거시 attendance_records 동시 기록 (테이블 존재 시)
  v_legacy_status := LOWER(p_status);

  BEGIN
    INSERT INTO attendance_records (
      student_id,
      attendance_date,
      check_in_time,
      status,
      verified_by
    ) VALUES (
      p_subject_id,
      (v_encounter.scheduled_at AT TIME ZONE 'Asia/Seoul')::DATE,
      CASE WHEN p_status IN ('PRESENT', 'LATE') THEN NOW() ELSE NULL END,
      v_legacy_status,
      'manual'
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;  -- 레거시 테이블 없거나 제약 위반 시 건너뜀
  END;

  -- 3. Encounter의 actual_count 업데이트
  UPDATE encounters
  SET actual_count = (
    SELECT COUNT(*) FROM presence
    WHERE encounter_id = p_encounter_id AND status IN ('PRESENT', 'LATE')
  ),
  updated_at = NOW()
  WHERE id = p_encounter_id;

  RETURN v_presence_id;
END;
$$;
