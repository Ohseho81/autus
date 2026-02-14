-- ===================================================================
-- AUTUS Identity Resolution - Supabase Functions
-- ===================================================================

-- ===================================================================
-- 1. 해시 생성 함수
-- ===================================================================

CREATE OR REPLACE FUNCTION hash_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  -- 숫자만 추출
  v_normalized := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- 한국 전화번호 검증 (010으로 시작, 11자리)
  IF NOT (v_normalized ~ '^010' AND length(v_normalized) = 11) THEN
    RAISE EXCEPTION 'Invalid Korean phone number: %', p_phone;
  END IF;

  -- SHA-256 해싱
  RETURN encode(digest(v_normalized, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_phone IS '전화번호 SHA-256 해싱 (정규화 포함)';


CREATE OR REPLACE FUNCTION hash_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  -- 소문자 변환, 공백 제거
  v_normalized := lower(trim(p_email));

  -- 이메일 형식 검증
  IF NOT (v_normalized ~ '^[^@]+@[^@]+\.[^@]+$') THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- SHA-256 해싱
  RETURN encode(digest(v_normalized, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_email IS '이메일 SHA-256 해싱 (정규화 포함)';


-- ===================================================================
-- 2. Universal ID 찾기/생성
-- ===================================================================

CREATE OR REPLACE FUNCTION find_or_create_universal_id(
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_phone_hash TEXT;
  v_email_hash TEXT;
  v_universal_id UUID;
BEGIN
  -- 1. 해시 생성
  v_phone_hash := hash_phone(p_phone);
  v_email_hash := CASE
    WHEN p_email IS NOT NULL THEN hash_email(p_email)
    ELSE NULL
  END;

  -- 2. 기존 universal_profile 검색 (전화번호 우선)
  SELECT id INTO v_universal_id
  FROM universal_profiles
  WHERE phone_hash = v_phone_hash
  LIMIT 1;

  -- 3. 전화번호로 못 찾으면 이메일로 검색
  IF v_universal_id IS NULL AND v_email_hash IS NOT NULL THEN
    SELECT id INTO v_universal_id
    FROM universal_profiles
    WHERE email_hash = v_email_hash
    LIMIT 1;
  END IF;

  -- 4. 못 찾으면 새로 생성
  IF v_universal_id IS NULL THEN
    INSERT INTO universal_profiles (phone_hash, email_hash, v_index)
    VALUES (v_phone_hash, v_email_hash, 0)
    RETURNING id INTO v_universal_id;

    RAISE NOTICE 'Created new universal_profile: %', v_universal_id;
  ELSE
    -- 기존 프로필에 이메일 해시 업데이트 (없었다면)
    UPDATE universal_profiles
    SET email_hash = COALESCE(email_hash, v_email_hash),
        updated_at = now()
    WHERE id = v_universal_id;

    RAISE NOTICE 'Found existing universal_profile: %', v_universal_id;
  END IF;

  RETURN v_universal_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_or_create_universal_id IS '
동일인 검색 또는 신규 생성
- 전화번호 우선 검색 (99% 신뢰도)
- 없으면 이메일로 검색 (95% 신뢰도)
- 둘 다 없으면 신규 생성
';


-- ===================================================================
-- 3. Profiles 테이블 Trigger
-- ===================================================================

CREATE OR REPLACE FUNCTION auto_link_universal_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_universal_id UUID;
BEGIN
  -- profiles 테이블에 INSERT 될 때 자동 실행

  -- 전화번호가 없으면 스킵 (필수 아님)
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. universal_id 찾기/생성
  v_universal_id := find_or_create_universal_id(
    NEW.phone,
    NEW.email,
    NEW.name
  );

  -- 2. profiles.universal_id 자동 설정
  NEW.universal_id := v_universal_id;

  -- 3. universal_profiles 카운터 증가
  UPDATE universal_profiles
  SET total_services = total_services + 1,
      total_interactions = total_interactions + 1,
      updated_at = now()
  WHERE id = v_universal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger 생성 (profiles 테이블이 있다면)
DROP TRIGGER IF EXISTS trigger_auto_link_universal ON profiles;

CREATE TRIGGER trigger_auto_link_universal
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();

COMMENT ON FUNCTION auto_link_universal_profile IS '
Profiles INSERT 시 자동으로 universal_id 연결
- 같은 전화번호면 같은 universal_id 할당
- total_services, total_interactions 자동 증가
';


-- ===================================================================
-- 4. Universal Profile 병합
-- ===================================================================

CREATE OR REPLACE FUNCTION merge_universal_profiles(
  p_primary_id UUID,
  p_secondary_id UUID
)
RETURNS TABLE (
  merged_id UUID,
  deleted_id UUID,
  affected_profiles INTEGER,
  conflicts TEXT[]
) AS $$
DECLARE
  v_primary universal_profiles%ROWTYPE;
  v_secondary universal_profiles%ROWTYPE;
  v_affected_count INTEGER;
  v_conflicts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. 두 프로필 조회
  SELECT * INTO v_primary FROM universal_profiles WHERE id = p_primary_id;
  SELECT * INTO v_secondary FROM universal_profiles WHERE id = p_secondary_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Universal profile not found';
  END IF;

  -- 2. 충돌 체크
  IF v_primary.phone_hash != v_secondary.phone_hash THEN
    v_conflicts := array_append(v_conflicts, 'phone_hash_mismatch');
  END IF;

  IF v_primary.email_hash IS NOT NULL AND v_secondary.email_hash IS NOT NULL
     AND v_primary.email_hash != v_secondary.email_hash THEN
    v_conflicts := array_append(v_conflicts, 'email_hash_mismatch');
  END IF;

  -- 3. 충돌이 있으면 중단
  IF array_length(v_conflicts, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot merge due to conflicts: %', array_to_string(v_conflicts, ', ');
  END IF;

  -- 4. secondary의 모든 profiles를 primary로 이동
  UPDATE profiles
  SET universal_id = p_primary_id
  WHERE universal_id = p_secondary_id;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  -- 5. primary 프로필 통계 업데이트
  UPDATE universal_profiles
  SET total_services = v_primary.total_services + v_secondary.total_services,
      total_interactions = v_primary.total_interactions + v_secondary.total_interactions,
      email_hash = COALESCE(v_primary.email_hash, v_secondary.email_hash),
      updated_at = now()
  WHERE id = p_primary_id;

  -- 6. secondary 프로필 삭제
  DELETE FROM universal_profiles WHERE id = p_secondary_id;

  -- 7. 결과 반환
  RETURN QUERY
  SELECT
    p_primary_id,
    p_secondary_id,
    v_affected_count,
    v_conflicts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION merge_universal_profiles IS '
두 universal_profile 병합
- secondary의 모든 profiles를 primary로 이동
- 통계 합산
- secondary 삭제
';


-- ===================================================================
-- 5. V-Index 계산 함수
-- ===================================================================

CREATE OR REPLACE FUNCTION calculate_v_index(
  p_universal_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_base CONSTANT NUMERIC := 100;
  v_relation_weight CONSTANT NUMERIC := 0.1;
  v_attendance_count INTEGER;
  v_payment_count INTEGER;
  v_absence_count INTEGER;
  v_overdue_count INTEGER;
  v_service_count INTEGER;
  v_months_active NUMERIC;
  v_net_actions INTEGER;
  v_relation_multiplier NUMERIC;
  v_v_index NUMERIC;
BEGIN
  -- 1. 통계 수집
  SELECT
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END),
    COUNT(DISTINCT CASE WHEN pay.payment_status = 'completed' THEN pay.id END),
    COUNT(DISTINCT CASE WHEN b.status = 'no_show' THEN b.id END),
    COUNT(DISTINCT CASE WHEN pay.payment_status = 'overdue' THEN pay.id END),
    COUNT(DISTINCT p.organization_id),
    EXTRACT(MONTH FROM age(now(), MIN(p.created_at)))
  INTO
    v_attendance_count,
    v_payment_count,
    v_absence_count,
    v_overdue_count,
    v_service_count,
    v_months_active
  FROM universal_profiles up
  LEFT JOIN profiles p ON p.universal_id = up.id
  LEFT JOIN bookings b ON b.student_id = p.id
  LEFT JOIN payments pay ON pay.student_id = p.id
  WHERE up.id = p_universal_id
  GROUP BY up.id;

  -- 2. 기본값 처리
  v_months_active := GREATEST(v_months_active, 1);

  -- 3. V-Index 계산
  -- V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t
  v_net_actions := (v_attendance_count + v_payment_count) - (v_absence_count + v_overdue_count);
  v_relation_multiplier := POWER(1 + v_relation_weight * v_service_count, v_months_active);
  v_v_index := v_base * v_net_actions * v_relation_multiplier;

  -- 4. 소수점 2자리 반올림
  RETURN ROUND(v_v_index, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_v_index IS '
V-Index 실시간 계산
Formula: V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t
';


-- ===================================================================
-- 6. 테스트 데이터 생성
-- ===================================================================

CREATE OR REPLACE FUNCTION test_identity_resolution()
RETURNS TABLE (
  test_name TEXT,
  result TEXT,
  details JSONB
) AS $$
DECLARE
  v_universal_id1 UUID;
  v_universal_id2 UUID;
  v_profile_id1 UUID;
  v_profile_id2 UUID;
BEGIN
  -- Test 1: 같은 전화번호 → 같은 universal_id
  RETURN QUERY
  SELECT
    'Test 1: Same phone'::TEXT,
    CASE
      WHEN find_or_create_universal_id('010-1111-1111') =
           find_or_create_universal_id('01011111111')
      THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END,
    jsonb_build_object(
      'phone1', '010-1111-1111',
      'phone2', '01011111111'
    );

  -- Test 2: 다른 전화번호 → 다른 universal_id
  RETURN QUERY
  SELECT
    'Test 2: Different phone'::TEXT,
    CASE
      WHEN find_or_create_universal_id('010-2222-2222') !=
           find_or_create_universal_id('010-3333-3333')
      THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END,
    jsonb_build_object(
      'phone1', '010-2222-2222',
      'phone2', '010-3333-3333'
    );

  -- Test 3: 해시 충돌 방지
  RETURN QUERY
  SELECT
    'Test 3: Hash collision'::TEXT,
    CASE
      WHEN hash_phone('010-1234-5678') != hash_phone('010-8765-4321')
      THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END,
    jsonb_build_object(
      'hash1', hash_phone('010-1234-5678'),
      'hash2', hash_phone('010-8765-4321')
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_identity_resolution IS '동일인 식별 알고리즘 테스트';


-- ===================================================================
-- Usage Examples
-- ===================================================================

-- Example 1: Universal ID 찾기/생성
-- SELECT find_or_create_universal_id('010-1234-5678', 'parent@example.com', '김철수');

-- Example 2: 두 프로필 병합
-- SELECT * FROM merge_universal_profiles('uuid-1', 'uuid-2');

-- Example 3: V-Index 계산
-- SELECT calculate_v_index('uuid-1');

-- Example 4: 테스트 실행
-- SELECT * FROM test_identity_resolution();
