-- ============================================
-- ATB Hub QR 출석 + 수납 일체화 스키마
-- Supabase Migration
-- ============================================

-- 학생 테이블 (기존 확장)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE,
  parent_name TEXT,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  qr_code TEXT UNIQUE,  -- 개인 QR 코드 (ATB-{id}-{timestamp})
  profile_image TEXT,
  grade TEXT,  -- U-10, U-12 등
  team TEXT,   -- ATB FC, ATB Academy 등
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제/수납 테이블
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,  -- '레슨 20회', '무제한 월정액'
  package_type TEXT NOT NULL DEFAULT 'count',  -- 'count' | 'monthly' | 'unlimited'
  total_lessons INT,  -- 총 레슨 횟수 (count 타입)
  remaining_lessons INT,  -- 잔여 레슨
  amount INT NOT NULL,  -- 결제 금액
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,  -- 'kakaopay' | 'card' | 'transfer'
  pg_transaction_id TEXT,  -- PG사 거래 ID
  due_date DATE,  -- 납부 기한
  status TEXT DEFAULT 'pending',  -- 'pending' | 'paid' | 'overdue' | 'cancelled'
  qr_active BOOLEAN DEFAULT FALSE,  -- QR 출석 가능 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 레슨 슬롯 (시간표)
CREATE TABLE IF NOT EXISTS lesson_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- '드리블 기초반', '슈팅 클리닉'
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  coach_id UUID,
  location TEXT,  -- '대치 Red Court', 'B구장'
  max_count INT DEFAULT 12,
  current_count INT DEFAULT 0,
  status TEXT DEFAULT 'scheduled',  -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출석 기록
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_slot_id UUID REFERENCES lesson_slots(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'present',  -- 'present' | 'late' | 'absent' | 'excused'
  verified_by TEXT DEFAULT 'qr_scan',  -- 'qr_scan' | 'manual' | 'gps'
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  lesson_deducted BOOLEAN DEFAULT FALSE,  -- 레슨 차감 완료 여부
  parent_notified BOOLEAN DEFAULT FALSE,  -- 학부모 알림 발송 여부
  feedback_id UUID,  -- 연결된 피드백 ID
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, lesson_slot_id)  -- 중복 출석 방지
);

-- 알림 기록
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'attendance' | 'payment' | 'feedback' | 'reminder'
  channel TEXT NOT NULL,  -- 'push' | 'kakao' | 'sms'
  title TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB  -- 추가 데이터
);

-- 성장 기록 로그
CREATE TABLE IF NOT EXISTS growth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES attendance_records(id),
  log_date DATE NOT NULL,
  skill_ratings JSONB,  -- { "dribble": 4.5, "shoot": 3.5, ... }
  coach_comment TEXT,
  video_url TEXT,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_payments_student ON student_payments(student_id);
CREATE INDEX idx_payments_status ON student_payments(status);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_records(check_in_time);
CREATE INDEX idx_lesson_slots_date ON lesson_slots(date);
CREATE INDEX idx_notifications_student ON notifications(student_id);

-- QR 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_student_qr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := 'ATB-' || NEW.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_qr
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION generate_student_qr();

-- 결제 완료 시 QR 활성화 트리거
CREATE OR REPLACE FUNCTION activate_qr_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid = TRUE AND OLD.paid = FALSE THEN
    NEW.qr_active := TRUE;
    NEW.paid_at := NOW();
    NEW.status := 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activate_qr
BEFORE UPDATE ON student_payments
FOR EACH ROW
EXECUTE FUNCTION activate_qr_on_payment();

-- 출석 시 레슨 슬롯 카운트 업데이트
CREATE OR REPLACE FUNCTION update_lesson_slot_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lesson_slots
    SET current_count = current_count + 1
    WHERE id = NEW.lesson_slot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lesson_slots
    SET current_count = current_count - 1
    WHERE id = OLD.lesson_slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slot_count
AFTER INSERT OR DELETE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_lesson_slot_count();

-- 미납 자동 체크 (매일 자정 실행용)
CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS void AS $$
BEGIN
  UPDATE student_payments
  SET
    status = 'overdue',
    qr_active = FALSE
  WHERE
    paid = FALSE
    AND due_date < CURRENT_DATE
    AND status != 'overdue';
END;
$$ LANGUAGE plpgsql;