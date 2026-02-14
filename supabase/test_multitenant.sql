-- ============================================================
-- AUTUS 멀티 테넌트 테스트
-- 병렬 확장 4가지 시나리오 검증
-- ============================================================

-- ===== 시나리오 1: 학원 추가 (수평 확장) =====

-- 두 번째 학원 추가
INSERT INTO organizations (name, slug, type, status, tier)
VALUES ('챔피언스포츠클럽', 'champion-sports', 'club', 'active', 'basic')
RETURNING id, name, slug;

-- 프로그램 추가
DO $$
DECLARE
  champion_org_id UUID;
BEGIN
  SELECT id INTO champion_org_id FROM organizations WHERE slug = 'champion-sports';

  INSERT INTO programs (organization_id, name, category, level, monthly_fee, capacity)
  VALUES
    (champion_org_id, '축구 초급반', 'soccer', 'beginner', 180000, 25),
    (champion_org_id, '축구 중급반', 'soccer', 'intermediate', 220000, 20),
    (champion_org_id, '농구 초급반', 'basketball', 'beginner', 190000, 20);

  RAISE NOTICE '✅ 챔피언스포츠클럽 프로그램 3개 생성';
END $$;

-- 테스트 학생 추가 (챔피언스포츠클럽)
DO $$
DECLARE
  champion_org_id UUID;
  student1_id UUID;
  student2_id UUID;
BEGIN
  SELECT id INTO champion_org_id FROM organizations WHERE slug = 'champion-sports';

  -- 학생 1
  INSERT INTO profiles (organization_id, type, name, phone, status)
  VALUES (champion_org_id, 'student', '김축구', '010-2000-0001', 'active')
  RETURNING id INTO student1_id;

  -- 학생 2 (온리쌤과 중복 - Universal ID 테스트용)
  INSERT INTO profiles (organization_id, type, name, phone, status)
  VALUES (champion_org_id, 'student', '이배구', '010-1111-1111', 'active')
  RETURNING id INTO student2_id;

  RAISE NOTICE '✅ 챔피언스포츠클럽 학생 2명 생성';
  RAISE NOTICE '   학생 1 (김축구): %', student1_id;
  RAISE NOTICE '   학생 2 (이배구 - 중복): %', student2_id;
END $$;

-- ===== 시나리오 2: 종목 추가 (카테고리 확장) =====

-- 온리쌤에 새 종목 추가
DO $$
DECLARE
  onlyssam_org_id UUID;
BEGIN
  SELECT id INTO onlyssam_org_id FROM organizations WHERE slug = 'onlyssam';

  INSERT INTO programs (organization_id, name, category, level, monthly_fee, capacity)
  VALUES
    (onlyssam_org_id, '농구 초급반', 'basketball', 'beginner', 200000, 20),
    (onlyssam_org_id, '축구 초급반', 'soccer', 'beginner', 180000, 25),
    (onlyssam_org_id, '야구 초급반', 'baseball', 'beginner', 220000, 18);

  RAISE NOTICE '✅ 온리쌤 신규 종목 3개 추가 (농구, 축구, 야구)';
END $$;

-- ===== 시나리오 3: 동일 학생 다중 서비스 (Universal ID) =====

-- 온리쌤에도 같은 전화번호로 학생 추가 (이배구)
DO $$
DECLARE
  onlyssam_org_id UUID;
  existing_universal_id UUID;
  new_student_id UUID;
BEGIN
  SELECT id INTO onlyssam_org_id FROM organizations WHERE slug = 'onlyssam';

  -- 기존 Universal ID 확인
  SELECT universal_id INTO existing_universal_id
  FROM profiles
  WHERE phone = '010-1111-1111'
  LIMIT 1;

  -- 온리쌤에 같은 사람 추가
  INSERT INTO profiles (organization_id, type, name, phone, status)
  VALUES (onlyssam_org_id, 'student', '이배구', '010-1111-1111', 'active')
  RETURNING id, universal_id INTO new_student_id, existing_universal_id;

  RAISE NOTICE '✅ 동일 학생 다중 서비스 테스트';
  RAISE NOTICE '   온리쌤 profile_id: %', new_student_id;
  RAISE NOTICE '   Universal ID: % (자동 연결됨)', existing_universal_id;

  -- Universal ID 서비스 개수 확인
  SELECT total_services
  FROM universal_profiles
  WHERE id = existing_universal_id;

END $$;

-- ===== 검증 쿼리 =====

-- 1. 조직별 학생 수
SELECT
  o.name as organization,
  COUNT(*) as student_count
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.type = 'student'
GROUP BY o.name;

-- 2. 조직별 프로그램 수 및 카테고리
SELECT
  o.name as organization,
  p.category,
  COUNT(*) as program_count
FROM programs p
JOIN organizations o ON p.organization_id = o.id
GROUP BY o.name, p.category
ORDER BY o.name, p.category;

-- 3. Universal ID 통합 현황
SELECT
  up.id as universal_id,
  up.total_services,
  STRING_AGG(DISTINCT o.name, ', ') as organizations,
  STRING_AGG(DISTINCT p.name, ', ') as student_names
FROM universal_profiles up
JOIN profiles p ON p.universal_id = up.id
JOIN organizations o ON p.organization_id = o.id
GROUP BY up.id, up.total_services
HAVING up.total_services > 1  -- 2개 이상 서비스 이용
ORDER BY up.total_services DESC;

-- 4. 동일 학생의 모든 프로필
SELECT
  up.id as universal_id,
  o.name as organization,
  p.name as student_name,
  p.phone,
  p.status
FROM universal_profiles up
JOIN profiles p ON p.universal_id = up.id
JOIN organizations o ON p.organization_id = o.id
WHERE up.phone_hash = encode(digest('010-1111-1111', 'sha256'), 'hex')
ORDER BY o.name;

-- 5. RLS 테스트 (조직별 데이터 격리 확인)
-- 온리쌤 학생만 보임
SELECT COUNT(*) as onlyssam_students
FROM profiles
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'onlyssam')
  AND type = 'student';

-- 챔피언스포츠클럽 학생만 보임
SELECT COUNT(*) as champion_students
FROM profiles
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'champion-sports')
  AND type = 'student';

-- ===== 성능 테스트 =====

-- organization_id 인덱스 사용 확인
EXPLAIN ANALYZE
SELECT * FROM profiles
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'onlyssam')
  AND type = 'student';

-- Universal ID 조회 성능
EXPLAIN ANALYZE
SELECT
  up.*,
  COUNT(p.id) as profile_count,
  STRING_AGG(o.name, ', ') as organizations
FROM universal_profiles up
LEFT JOIN profiles p ON p.universal_id = up.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE up.id = (
  SELECT universal_id FROM profiles
  WHERE phone = '010-1111-1111'
  LIMIT 1
)
GROUP BY up.id;

-- ===== 정리 =====

RAISE NOTICE '
============================================================
멀티 테넌트 테스트 완료!

✅ 시나리오 1: 학원 추가 (챔피언스포츠클럽)
✅ 시나리오 2: 종목 추가 (농구, 축구, 야구)
✅ 시나리오 3: Universal ID 통합 (이배구 - 2개 조직)
✅ RLS 데이터 격리 검증
✅ 성능 테스트

다음 단계:
1. FastAPI에 organization_id 필터 추가
2. 관리자 UI에서 조직 전환 기능
3. ClickHouse 이벤트 로깅
============================================================
';

-- ===== 테스트 데이터 삭제 (선택) =====

-- 테스트가 끝나면 챔피언스포츠클럽 데이터 삭제 (CASCADE로 관련 데이터 모두 삭제)
-- DELETE FROM organizations WHERE slug = 'champion-sports';

-- 온리쌤 신규 종목 삭제
-- DELETE FROM programs
-- WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'onlyssam')
--   AND category IN ('basketball', 'soccer', 'baseball');
