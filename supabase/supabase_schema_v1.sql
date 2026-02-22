-- ===================================================================
-- AUTUS 3,000명 즉시 론칭용 Supabase Schema
-- 버전: 1.0
-- 작성일: 2026-02-14
-- ===================================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- Layer 1: 개인 통합 프로필
-- ===================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  external_id TEXT UNIQUE, -- 외부 시스템 ID (온리쌤 학생 ID 등)
  type TEXT NOT NULL CHECK (type IN ('student', 'parent', 'coach', 'admin')),
  name TEXT NOT NULL,

  -- 연락처
  phone TEXT,
  email TEXT,

  -- 관계 (학생-학부모 연결)
  parent_id UUID REFERENCES profiles(id), -- 학생의 경우 학부모 ID

  -- 메타데이터
  metadata JSONB DEFAULT '{}', -- 유연한 확장 (생년월일, 학교 등)

  -- 상태
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX idx_profiles_external_id ON profiles(external_id);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE profiles IS '모든 개체의 통합 프로필 (학생, 학부모, 강사, 관리자)';
COMMENT ON COLUMN profiles.external_id IS '외부 시스템 연동용 ID';
COMMENT ON COLUMN profiles.metadata IS 'JSON 형식 확장 필드 (birth_date, school, address 등)';

-- ===================================================================
-- Layer 2: 결제 (가장 중요!)
-- ===================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 학생 정보
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 결제 정보
  total_amount INTEGER NOT NULL, -- 총 금액
  paid_amount INTEGER DEFAULT 0, -- 납부 금액

  -- 상태
  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'partial', 'completed', 'overdue', 'cancelled')
  ),

  -- 결제 수단
  payment_method TEXT CHECK (
    payment_method IN ('cash', 'card', 'transfer', 'kakaopay', 'naverpay')
  ),

  -- 날짜
  invoice_date DATE NOT NULL, -- 청구일
  due_date DATE NOT NULL, -- 납부 기한
  payment_date TIMESTAMPTZ, -- 실제 납부일

  -- 메모
  memo TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- 트리거
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 미수금 자동 계산 뷰
CREATE VIEW unpaid_payments AS
SELECT
  p.id,
  p.student_id,
  prof.name as student_name,
  prof.phone as parent_phone,
  p.total_amount,
  p.paid_amount,
  (p.total_amount - p.paid_amount) as unpaid_amount,
  p.due_date,
  CASE
    WHEN p.due_date < CURRENT_DATE THEN (CURRENT_DATE - p.due_date)
    ELSE 0
  END as overdue_days,
  p.payment_status
FROM payments p
JOIN profiles prof ON p.student_id = prof.id
WHERE p.paid_amount < p.total_amount
  AND p.payment_status != 'cancelled';

COMMENT ON TABLE payments IS '결제 기록 (미수금 관리 핵심)';
COMMENT ON VIEW unpaid_payments IS '미수금 현황 실시간 뷰';

-- ===================================================================
-- Layer 3: 스케줄
-- ===================================================================

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 수업 정보
  program_name TEXT NOT NULL, -- 프로그램명 (예: 배구 초급반)
  coach_id UUID REFERENCES profiles(id), -- 담당 강사

  -- 시간표
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=월, 6=일
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- 정원
  capacity INTEGER DEFAULT 20,

  -- 장소
  facility TEXT, -- 코트 번호, 장소명

  -- 상태
  is_active BOOLEAN DEFAULT true,

  -- 메타데이터
  metadata JSONB DEFAULT '{}', -- 레벨, 연령대 등

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_schedules_coach_id ON schedules(coach_id);
CREATE INDEX idx_schedules_day_of_week ON schedules(day_of_week);
CREATE INDEX idx_schedules_active ON schedules(is_active);

-- 트리거
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE schedules IS '정규 수업 시간표';
COMMENT ON COLUMN schedules.day_of_week IS '0=월요일, 6=일요일';

-- ===================================================================
-- Layer 4: 예약
-- ===================================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 관계
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 예약 정보
  booking_date DATE NOT NULL, -- 수업 날짜

  -- 상태
  status TEXT DEFAULT 'confirmed' CHECK (
    status IN ('confirmed', 'cancelled', 'completed', 'no_show')
  ),

  -- 메모
  memo TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 중복 방지
  UNIQUE(schedule_id, student_id, booking_date)
);

-- 인덱스
CREATE INDEX idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- 트리거
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 예약 현황 뷰 (오늘 수업)
CREATE VIEW today_bookings AS
SELECT
  b.id,
  s.program_name,
  s.start_time,
  s.end_time,
  prof_student.name as student_name,
  prof_coach.name as coach_name,
  b.status
FROM bookings b
JOIN schedules s ON b.schedule_id = s.id
JOIN profiles prof_student ON b.student_id = prof_student.id
LEFT JOIN profiles prof_coach ON s.coach_id = prof_coach.id
WHERE b.booking_date = CURRENT_DATE
  AND b.status = 'confirmed';

COMMENT ON TABLE bookings IS '수업 예약 기록';
COMMENT ON VIEW today_bookings IS '오늘 수업 현황';

-- ===================================================================
-- Layer 5: 수업 기록 (이미 있음 - 참고용)
-- ===================================================================

-- class_logs 테이블은 이미 생성되어 있음
-- 필요시 아래 구조 참고

/*
CREATE TABLE class_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id),
  class_date DATE NOT NULL,
  attendance_status TEXT CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
  performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 10),
  coach_comment TEXT,
  parent_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
*/

-- ===================================================================
-- Layer 6: 알림
-- ===================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 대상
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 알림 정보
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'attendance', 'payment_due', 'payment_completed',
      'class_result', 'booking_confirmed', 'schedule_change'
    )
  ),

  -- 채널
  channel TEXT DEFAULT 'kakao' CHECK (
    channel IN ('kakao', 'sms', 'email', 'push')
  ),

  -- 내용
  message TEXT NOT NULL,

  -- 상태
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed', 'delivered', 'read')
  ),

  -- 발송 정보
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- 메타데이터
  metadata JSONB DEFAULT '{}', -- 카카오 메시지 ID 등

  -- 자동 삭제 (7일 후)
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- 만료된 알림 자동 삭제 (매일 실행)
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE notifications IS '알림 발송 기록 (7일 보관)';

-- ===================================================================
-- RLS (Row Level Security) 설정
-- ===================================================================

-- 모든 테이블 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service Role은 모든 접근 가능
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON schedules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- 인증된 사용자 정책 (필요시 추가)
-- 예: 학부모는 본인 자녀 데이터만 조회 가능

-- ===================================================================
-- 초기 데이터 (필요시)
-- ===================================================================

-- 관리자 계정 예시
INSERT INTO profiles (external_id, type, name, phone, email, status)
VALUES
  ('admin-001', 'admin', '시스템 관리자', '010-1234-5678', 'admin@autus.kr', 'active')
ON CONFLICT (external_id) DO NOTHING;

-- ===================================================================
-- 완료
-- ===================================================================

-- 생성된 테이블 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'payments', 'schedules', 'bookings', 'notifications')
ORDER BY tablename;

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ AUTUS 3,000명 즉시 론칭용 스키마 생성 완료!';
  RAISE NOTICE '📊 생성된 테이블: profiles, payments, schedules, bookings, notifications';
  RAISE NOTICE '🚀 다음 단계: FastAPI 웹훅 개발 + 카카오톡 연동';
END $$;
