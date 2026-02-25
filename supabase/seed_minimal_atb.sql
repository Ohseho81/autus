-- ============================================
-- 올댓바스켓 최소 시드 데이터 (테스트용)
-- ============================================
-- 실행: Supabase SQL Editor에서 001_allthatbasket_complete.sql 적용 후 실행
-- ============================================

-- 1. 학원
INSERT INTO atb_academies (id, name, owner_name, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', '올댓바스켓 농구교실', 'seho 원장님', '010-0000-0000')
ON CONFLICT (id) DO NOTHING;

-- 2. 강사
INSERT INTO atb_coaches (id, academy_id, name, is_active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '김코치',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 3. 수업 (월요일 16:00)
INSERT INTO atb_classes (id, academy_id, name, day_of_week, start_time, end_time, coach_id, is_active)
VALUES (
  'x0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '주니어반',
  1,
  '16:00',
  '17:30',
  'c0000000-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 4. 학생 1명 (테이블이 비어있을 때만)
INSERT INTO atb_students (academy_id, name, grade, enrollment_status, attendance_rate, total_outstanding)
SELECT 'a0000000-0000-0000-0000-000000000001', '테스트 학생', '초3', 'active', 100, 0
WHERE NOT EXISTS (SELECT 1 FROM atb_students LIMIT 1);

-- 5. 수업 등록
INSERT INTO atb_enrollments (student_id, class_id, status)
SELECT s.id, 'x0000000-0000-0000-0000-000000000001'::uuid, 'active'
FROM atb_students s WHERE s.name = '테스트 학생'
ON CONFLICT (student_id, class_id) DO NOTHING;
