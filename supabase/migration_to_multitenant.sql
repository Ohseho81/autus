-- ============================================================
-- AUTUS 기존 데이터 → 멀티 테넌트 마이그레이션
-- 실행 전 조건: supabase_schema_v2_multitenant.sql 실행 완료
-- 소요 시간: 약 5분 (데이터 규모에 따라)
-- ============================================================

-- ===== 1. 기본 조직 확인 =====

DO $$
DECLARE
  default_org_id UUID;
  org_count INTEGER;
BEGIN
  -- 온리쌤 조직 ID 가져오기
  SELECT id INTO default_org_id
  FROM organizations
  WHERE slug = 'onlyssam';

  -- 조직이 없으면 생성
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, type, status, tier)
    VALUES ('온리쌤배구아카데미', 'onlyssam', 'academy', 'active', 'pro')
    RETURNING id INTO default_org_id;

    RAISE NOTICE '✅ 기본 조직 생성: %', default_org_id;
  ELSE
    RAISE NOTICE '✅ 기본 조직 존재: %', default_org_id;
  END IF;

  -- ===== 2. profiles 테이블 마이그레이션 =====

  -- organization_id가 NULL인 레코드에 기본 조직 설정
  UPDATE profiles
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE '✅ profiles 마이그레이션: % 건', org_count;

  -- ===== 3. payments 테이블 마이그레이션 =====

  UPDATE payments
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE '✅ payments 마이그레이션: % 건', org_count;

  -- ===== 4. schedules 테이블 마이그레이션 =====

  UPDATE schedules
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE '✅ schedules 마이그레이션: % 건', org_count;

  -- ===== 5. bookings 테이블 마이그레이션 =====

  UPDATE bookings
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE '✅ bookings 마이그레이션: % 건', org_count;

  -- ===== 6. notifications 테이블 마이그레이션 =====

  UPDATE notifications
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE '✅ notifications 마이그레이션: % 건', org_count;

  -- ===== 7. invoices 테이블 마이그레이션 (있다면) =====

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    UPDATE invoices
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    GET DIAGNOSTICS org_count = ROW_COUNT;
    RAISE NOTICE '✅ invoices 마이그레이션: % 건', org_count;
  END IF;

  -- ===== 8. payment_transactions 테이블 마이그레이션 =====

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
    UPDATE payment_transactions
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    GET DIAGNOSTICS org_count = ROW_COUNT;
    RAISE NOTICE '✅ payment_transactions 마이그레이션: % 건', org_count;
  END IF;

  -- ===== 9. cash_receipts 테이블 마이그레이션 =====

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_receipts') THEN
    UPDATE cash_receipts
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    GET DIAGNOSTICS org_count = ROW_COUNT;
    RAISE NOTICE '✅ cash_receipts 마이그레이션: % 건', org_count;
  END IF;

END $$;

-- ===== 10. programs 테이블 생성 (schedules에서 추출) =====

DO $$
DECLARE
  default_org_id UUID;
  program_count INTEGER;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'onlyssam';

  -- schedules에서 고유한 program_name 추출하여 programs 생성
  INSERT INTO programs (organization_id, name, category, level, monthly_fee, capacity)
  SELECT DISTINCT
    default_org_id,
    COALESCE(program_name, '일반반'),
    'volleyball',  -- 기본 카테고리
    'beginner',    -- 기본 레벨
    200000,        -- 기본 수업료
    20             -- 기본 정원
  FROM schedules
  WHERE program_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM programs
      WHERE organization_id = default_org_id
        AND name = schedules.program_name
    )
  ON CONFLICT (organization_id, name) DO NOTHING;

  GET DIAGNOSTICS program_count = ROW_COUNT;
  RAISE NOTICE '✅ programs 생성: % 건', program_count;

  -- schedules에 program_id 매핑
  UPDATE schedules s
  SET program_id = p.id
  FROM programs p
  WHERE s.organization_id = p.organization_id
    AND s.program_name = p.name
    AND s.program_id IS NULL;

  GET DIAGNOSTICS program_count = ROW_COUNT;
  RAISE NOTICE '✅ schedules program_id 매핑: % 건', program_count;

END $$;

-- ===== 11. universal_profiles 생성 (profiles에서 추출) =====

DO $$
DECLARE
  universal_count INTEGER;
BEGIN
  -- 전화번호가 있는 학생들의 universal_profile 생성
  INSERT INTO universal_profiles (phone_hash)
  SELECT DISTINCT encode(digest(phone, 'sha256'), 'hex')
  FROM profiles
  WHERE type = 'student'
    AND phone IS NOT NULL
  ON CONFLICT (phone_hash) DO NOTHING;

  GET DIAGNOSTICS universal_count = ROW_COUNT;
  RAISE NOTICE '✅ universal_profiles 생성: % 건', universal_count;

  -- profiles에 universal_id 매핑
  UPDATE profiles p
  SET universal_id = up.id
  FROM universal_profiles up
  WHERE p.type = 'student'
    AND p.phone IS NOT NULL
    AND encode(digest(p.phone, 'sha256'), 'hex') = up.phone_hash
    AND p.universal_id IS NULL;

  GET DIAGNOSTICS universal_count = ROW_COUNT;
  RAISE NOTICE '✅ profiles universal_id 매핑: % 건', universal_count;

  -- universal_profiles 통계 업데이트
  UPDATE universal_profiles up
  SET total_services = (
        SELECT COUNT(DISTINCT organization_id)
        FROM profiles
        WHERE universal_id = up.id
      ),
      total_interactions = (
        SELECT COUNT(*)
        FROM bookings b
        JOIN profiles p ON b.student_id = p.id
        WHERE p.universal_id = up.id
      ),
      last_interaction_at = (
        SELECT MAX(b.created_at)
        FROM bookings b
        JOIN profiles p ON b.student_id = p.id
        WHERE p.universal_id = up.id
      );

  RAISE NOTICE '✅ universal_profiles 통계 업데이트 완료';

END $$;

-- ===== 12. NOT NULL 제약 조건 추가 (선택) =====

-- 주의: 마이그레이션 후 모든 데이터가 organization_id를 가지고 있어야 함

-- ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE schedules ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE bookings ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;

-- RAISE NOTICE '✅ NOT NULL 제약 조건 추가 (선택 사항)';

-- ===== 13. Materialized View 재생성 =====

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_unpaid_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_invoice_summary;

-- ===== 14. ANALYZE 실행 =====

ANALYZE organizations;
ANALYZE programs;
ANALYZE universal_profiles;
ANALYZE profiles;
ANALYZE payments;
ANALYZE schedules;
ANALYZE bookings;

-- ============================================================
-- 마이그레이션 완료!
--
-- ✅ 모든 데이터 멀티 테넌트로 전환
-- ✅ programs 테이블 생성 및 매핑
-- ✅ universal_profiles 생성 및 연결
-- ✅ Materialized View 갱신
-- ✅ 통계 업데이트
--
-- 검증 쿼리:
-- SELECT COUNT(*) FROM profiles WHERE organization_id IS NULL;  -- 0이어야 함
-- SELECT COUNT(*) FROM programs;  -- 프로그램 개수 확인
-- SELECT COUNT(*) FROM universal_profiles;  -- 고유 학생 수 확인
--
-- 다음 단계:
-- 1. 새 조직 추가 테스트
-- 2. RLS 정책 테스트
-- 3. Universal ID 통합 테스트
-- ============================================================
