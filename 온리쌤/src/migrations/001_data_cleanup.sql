-- =========================================
-- Migration 001: 데이터베이스 초기 정리 및 설정
-- Created: 2026-02-14
-- Description:
--   1. event_type_mappings RLS 정책 추가
--   2. 기본 학원 생성
--   3. Universal_id 미연결 프로필 연결
--   4. V-Index 초기화
--   5. Students 테이블 deprecated
-- =========================================

-- Migration 실행 여부 확인용 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- 이미 실행되었는지 확인
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM migrations WHERE version = '001') THEN
    RAISE NOTICE 'Migration 001 already executed. Skipping...';
    RETURN;
  END IF;
END $$;

-- =========================================
-- 1. event_type_mappings RLS 정책
-- =========================================

-- RLS 활성화
ALTER TABLE event_type_mappings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Anyone can read event types" ON event_type_mappings;
DROP POLICY IF EXISTS "Service role can insert event types" ON event_type_mappings;

-- 새 정책 생성
CREATE POLICY "Anyone can read event types"
  ON event_type_mappings
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert event types"
  ON event_type_mappings
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =========================================
-- 2. 기본 학원 생성 (없으면)
-- =========================================

INSERT INTO academies (
  id,
  name,
  phone,
  address,
  settings,
  status,
  created_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  '온리쌤 배구아카데미',
  '02-1234-5678',
  '서울특별시',
  '{
    "notification": {
      "enabled": true,
      "alimtalk": true
    },
    "attendance": {
      "auto_notify": true
    }
  }'::JSONB,
  'active',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM academies WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
);

-- =========================================
-- 3. Universal_id 미연결 프로필 연결
-- =========================================

DO $$
DECLARE
  profile_record RECORD;
  new_universal_id UUID;
  phone_hash TEXT;
  email_hash TEXT;
BEGIN
  -- 미연결 프로필 찾기
  FOR profile_record IN
    SELECT id, name, phone, email
    FROM profiles
    WHERE universal_id IS NULL
  LOOP
    -- 해시 생성
    phone_hash := MD5(COALESCE(profile_record.phone, ''));
    email_hash := MD5(COALESCE(profile_record.email, ''));

    -- 기존 universal_profile 찾기 (phone 또는 email 매칭)
    SELECT id INTO new_universal_id
    FROM universal_profiles
    WHERE phone_hash = phone_hash OR email_hash = email_hash
    LIMIT 1;

    -- 없으면 새로 생성
    IF new_universal_id IS NULL THEN
      INSERT INTO universal_profiles (
        name,
        phone_hash,
        email_hash,
        v_index,
        base_value,
        relations,
        created_at
      ) VALUES (
        profile_record.name,
        phone_hash,
        email_hash,
        100.00,  -- 신규 학생 기본값
        1.0,
        0.5,
        NOW()
      )
      RETURNING id INTO new_universal_id;

      RAISE NOTICE 'Created new universal_profile for profile %', profile_record.id;
    END IF;

    -- 연결
    UPDATE profiles
    SET universal_id = new_universal_id
    WHERE id = profile_record.id;

    RAISE NOTICE 'Linked profile % to universal_profile %', profile_record.id, new_universal_id;
  END LOOP;
END $$;

-- =========================================
-- 4. V-Index 초기화 (0.00인 경우)
-- =========================================

UPDATE universal_profiles
SET
  v_index = 100.00,
  base_value = 1.0,
  relations = 0.5,
  updated_at = NOW()
WHERE v_index = 0.00;

-- =========================================
-- 5. Students 테이블 Deprecated
-- =========================================

-- 테이블에 주석 추가
COMMENT ON TABLE students IS
  'DEPRECATED: Use profiles table with type=student instead. This table is kept for legacy reference only.';

-- 모든 작업 차단하는 RLS 정책
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students table deprecated" ON students;

CREATE POLICY "Students table deprecated"
  ON students
  FOR ALL
  USING (false);

-- =========================================
-- 6. Profiles에 academy_id 연결
-- =========================================

-- academy_id 컬럼 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'academy_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN academy_id UUID REFERENCES academies(id);
  END IF;
END $$;

-- 모든 프로필을 기본 학원에 연결
UPDATE profiles
SET academy_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE academy_id IS NULL;

-- =========================================
-- 7. System Health View 생성
-- =========================================

CREATE OR REPLACE VIEW system_health AS
SELECT
  -- 학원 통계
  (SELECT COUNT(*) FROM academies WHERE status = 'active') as active_academies,
  (SELECT COUNT(*) FROM academies) as total_academies,

  -- 프로필 통계
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE type = 'student') as active_students,
  (SELECT COUNT(*) FROM profiles WHERE type = 'coach') as active_coaches,
  (SELECT COUNT(*) FROM profiles WHERE universal_id IS NULL) as profiles_without_universal_id,

  -- Universal Profile 통계
  (SELECT COUNT(*) FROM universal_profiles) as total_universal_profiles,
  (SELECT ROUND(AVG(v_index), 2) FROM universal_profiles) as avg_v_index,
  (SELECT ROUND(MIN(v_index), 2) FROM universal_profiles) as min_v_index,
  (SELECT ROUND(MAX(v_index), 2) FROM universal_profiles) as max_v_index,

  -- Event Ledger 통계
  (SELECT COUNT(*) FROM event_ledger) as total_events,
  (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '7 days') as events_last_7_days,
  (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '24 hours') as events_last_24_hours,

  -- 태스크 통계
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status = 'pending') as pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks;

-- =========================================
-- 8. 인덱스 최적화
-- =========================================

-- profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_universal_id ON profiles(universal_id);
CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);

-- event_ledger 인덱스
CREATE INDEX IF NOT EXISTS idx_event_ledger_entity_id ON event_ledger(entity_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at DESC);

-- universal_profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_universal_profiles_phone_hash ON universal_profiles(phone_hash);
CREATE INDEX IF NOT EXISTS idx_universal_profiles_email_hash ON universal_profiles(email_hash);

-- =========================================
-- 9. 통계 업데이트
-- =========================================

ANALYZE profiles;
ANALYZE universal_profiles;
ANALYZE event_ledger;
ANALYZE academies;

-- =========================================
-- Migration 완료 기록
-- =========================================

INSERT INTO migrations (version, name, success)
VALUES ('001', 'Data cleanup and initial setup', TRUE);

-- 최종 결과 출력
SELECT '✅ Migration 001 completed successfully!' as status, NOW() as completed_at;
SELECT '📊 System Health:' as section, * FROM system_health;
