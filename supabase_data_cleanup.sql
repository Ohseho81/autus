-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS 데이터 정리 및 초기 설정
-- 온리쌤 데이터베이스 개선 작업
-- ═══════════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. event_type_mappings RLS 정책 추가 (읽기 전용 공개)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- RLS 활성화
ALTER TABLE event_type_mappings ENABLE ROW LEVEL SECURITY;

-- 읽기 전용 공개 정책 (모든 사용자가 이벤트 타입 조회 가능)
DROP POLICY IF EXISTS "Anyone can read event types" ON event_type_mappings;
CREATE POLICY "Anyone can read event types"
  ON event_type_mappings FOR SELECT
  USING (true);

-- 삽입은 서비스 역할만 가능
DROP POLICY IF EXISTS "Service role can insert event types" ON event_type_mappings;
CREATE POLICY "Service role can insert event types"
  ON event_type_mappings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE event_type_mappings IS 'Event type definitions - read-only for all users';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. academies 테이블 초기 데이터 생성
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 학원 테이블 확인 및 생성 (없을 경우 대비)
CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 기본 정보
  name TEXT NOT NULL,
  business_number TEXT,

  -- 연락처
  phone TEXT,
  email TEXT,
  address TEXT,

  -- 설정
  settings JSONB DEFAULT '{}',

  -- 상태
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- 소유자
  owner_id UUID REFERENCES auth.users(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_academies_owner ON academies(owner_id);
CREATE INDEX IF NOT EXISTS idx_academies_status ON academies(status);

-- 기본 학원 데이터 삽입 (없을 경우만)
INSERT INTO academies (id, name, phone, address, settings, status)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  '온리쌤 배구아카데미',
  '02-1234-5678',
  '서울시 강남구',
  jsonb_build_object(
    'sports', 'volleyball',
    'timezone', 'Asia/Seoul',
    'default_class_duration', 90,
    'max_students_per_class', 20
  ),
  'active'
WHERE NOT EXISTS (SELECT 1 FROM academies LIMIT 1);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. universal_id 연결 (15개 미연결 프로필 처리)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
  profile_record RECORD;
  new_universal_id UUID;
  phone_hash_value TEXT;
  email_hash_value TEXT;
BEGIN
  -- universal_id가 NULL인 프로필들 처리
  FOR profile_record IN
    SELECT id, name, phone, metadata->>'email' as email
    FROM profiles
    WHERE universal_id IS NULL
  LOOP
    -- 전화번호 해시 생성
    IF profile_record.phone IS NOT NULL THEN
      phone_hash_value := encode(digest(profile_record.phone, 'sha256'), 'hex');
    ELSE
      phone_hash_value := NULL;
    END IF;

    -- 이메일 해시 생성
    IF profile_record.email IS NOT NULL THEN
      email_hash_value := encode(digest(profile_record.email, 'sha256'), 'hex');
    ELSE
      email_hash_value := NULL;
    END IF;

    -- 기존 universal_profile 찾기 (전화번호 또는 이메일 기준)
    SELECT id INTO new_universal_id
    FROM universal_profiles
    WHERE (phone_hash = phone_hash_value AND phone_hash IS NOT NULL)
       OR (email_hash = email_hash_value AND email_hash IS NOT NULL)
    LIMIT 1;

    -- 없으면 새로 생성
    IF new_universal_id IS NULL THEN
      INSERT INTO universal_profiles (
        phone_hash,
        email_hash,
        v_index,
        base_value,
        relations,
        interaction_exponent
      ) VALUES (
        phone_hash_value,
        email_hash_value,
        100.00, -- 초기값 100
        1.0,
        0.5,
        0.10
      )
      RETURNING id INTO new_universal_id;
    END IF;

    -- profiles 테이블 업데이트
    UPDATE profiles
    SET universal_id = new_universal_id,
        updated_at = NOW()
    WHERE id = profile_record.id;

    RAISE NOTICE 'Profile % linked to universal_id %', profile_record.id, new_universal_id;
  END LOOP;

  RAISE NOTICE 'Universal ID linking complete!';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. universal_profiles V-Index 초기값 설정
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- V-Index가 0인 universal_profiles를 100으로 설정 (신규 학생 기본값)
UPDATE universal_profiles
SET v_index = 100.00,
    base_value = 1.0,
    relations = 0.5,
    interaction_exponent = 0.10,
    updated_at = NOW()
WHERE v_index = 0.00;

COMMENT ON COLUMN universal_profiles.v_index IS 'V-Index: 100 = 신규, 0-50 = 위험, 50-70 = 주의, 70+ = 안전';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. students 테이블 처리 (profiles와 중복 방지)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- students 테이블이 비어있고 profiles에 데이터가 있으므로
-- students 테이블을 deprecated로 표시하고 사용 중단
-- (삭제는 하지 않고, 향후 마이그레이션 여지를 남겨둠)

COMMENT ON TABLE students IS 'DEPRECATED: Use profiles table with type=student instead. This table is kept for backward compatibility only.';

-- students 테이블 사용 방지 RLS 정책
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students table deprecated" ON students;
CREATE POLICY "Students table deprecated"
  ON students FOR ALL
  USING (false)
  WITH CHECK (false);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. profiles 테이블 academy_id 연결
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- profiles에 academy_id 컬럼 추가 (없을 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'academy_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN academy_id UUID REFERENCES academies(id);
    CREATE INDEX idx_profiles_academy ON profiles(academy_id);
  END IF;
END $$;

-- 모든 profiles를 기본 학원에 연결
UPDATE profiles
SET academy_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE academy_id IS NULL;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. 통계 및 확인
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 최종 상태 확인 뷰 생성
CREATE OR REPLACE VIEW system_health AS
SELECT
  -- 학원 정보
  (SELECT COUNT(*) FROM academies WHERE status = 'active') as active_academies,

  -- 프로필 정보
  (SELECT COUNT(*) FROM profiles WHERE status = 'active') as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE type = 'student' AND status = 'active') as active_students,
  (SELECT COUNT(*) FROM profiles WHERE universal_id IS NULL) as profiles_without_universal_id,

  -- Universal Profiles
  (SELECT COUNT(*) FROM universal_profiles) as total_universal_profiles,
  (SELECT COUNT(*) FROM universal_profiles WHERE v_index = 100) as new_students_v100,
  (SELECT COUNT(*) FROM universal_profiles WHERE v_index < 50) as at_risk_students,
  (SELECT ROUND(AVG(v_index), 2) FROM universal_profiles) as avg_v_index,

  -- Event Ledger
  (SELECT COUNT(*) FROM event_ledger) as total_events,
  (SELECT COUNT(*) FROM event_type_mappings) as total_event_types,

  -- 테이블 통계
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_rls_policies,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) as total_triggers,

  -- 데이터 품질
  (SELECT COUNT(*) FROM profiles WHERE phone IS NULL) as profiles_without_phone,
  (SELECT COUNT(*) FROM profiles WHERE academy_id IS NULL) as profiles_without_academy;

-- 통계 출력
SELECT * FROM system_health;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. 샘플 이벤트 생성 (테스트용 - 선택사항)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 주석 해제하여 샘플 이벤트 생성 가능
/*
DO $$
DECLARE
  sample_student_id UUID;
BEGIN
  -- 첫 번째 학생 선택
  SELECT id INTO sample_student_id
  FROM profiles
  WHERE type = 'student' AND status = 'active'
  ORDER BY name
  LIMIT 1;

  IF sample_student_id IS NOT NULL THEN
    -- 출석 이벤트 5개 생성
    FOR i IN 1..5 LOOP
      PERFORM log_event(
        sample_student_id,
        'attendance',
        1.0,
        jsonb_build_object('day', i, 'class', '선수반')
      );
    END LOOP;

    -- 결제 완료 이벤트 1개
    PERFORM log_event(
      sample_student_id,
      'payment_completed',
      1.0,
      jsonb_build_object('amount', 150000, 'month', '2월')
    );

    RAISE NOTICE 'Sample events created for student %', sample_student_id;
  END IF;
END $$;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. 인덱스 최적화
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- profiles 테이블 복합 인덱스 (자주 조회되는 조합)
CREATE INDEX IF NOT EXISTS idx_profiles_type_status_academy
  ON profiles(type, status, academy_id)
  WHERE status = 'active';

-- universal_profiles V-Index 범위 인덱스
CREATE INDEX IF NOT EXISTS idx_universal_v_index_range
  ON universal_profiles(v_index)
  WHERE v_index < 70;

-- event_ledger 최근 이벤트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_event_ledger_recent
  ON event_ledger(entity_id, created_at DESC)
  WHERE created_at >= NOW() - INTERVAL '30 days';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. VACUUM 및 ANALYZE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 통계 업데이트
ANALYZE profiles;
ANALYZE universal_profiles;
ANALYZE event_ledger;
ANALYZE event_type_mappings;
ANALYZE academies;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  '✅ 데이터 정리 완료!' as status,
  NOW() as completed_at;

-- 최종 상태 확인
SELECT
  '📊 최종 통계:' as section,
  *
FROM system_health;
