-- ===================================================================
-- AUTUS 완전판 Schema
-- Universal ID + 동일인 식별 포함
-- 1회 실행으로 모든 설정 완료
-- ===================================================================

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- Layer 0: Universal Profiles (AUTUS 핵심)
-- ===================================================================

CREATE TABLE IF NOT EXISTS universal_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  phone_hash TEXT UNIQUE NOT NULL,
  email_hash TEXT,

  v_index NUMERIC(10,2) DEFAULT 0,
  total_services INTEGER DEFAULT 0,
  total_interactions BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universal_profiles_phone_hash ON universal_profiles(phone_hash);
CREATE INDEX IF NOT EXISTS idx_universal_profiles_email_hash ON universal_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_universal_profiles_v_index ON universal_profiles(v_index DESC);

-- ===================================================================
-- Layer 1: Profiles
-- ===================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  universal_id UUID REFERENCES universal_profiles(id),

  external_id TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('student', 'parent', 'coach', 'admin')),
  name TEXT NOT NULL,

  phone TEXT,
  email TEXT,

  parent_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_external_id ON profiles(external_id);
CREATE INDEX IF NOT EXISTS idx_profiles_universal_id ON profiles(universal_id);

-- ===================================================================
-- Layer 2: Payments
-- ===================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  total_amount INTEGER NOT NULL,
  paid_amount INTEGER DEFAULT 0,

  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'partial', 'completed', 'overdue', 'cancelled')
  ),

  payment_method TEXT CHECK (
    payment_method IN ('cash', 'card', 'transfer', 'kakaopay', 'naverpay')
  ),

  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_date TIMESTAMPTZ,

  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- ===================================================================
-- Layer 3: Schedules
-- ===================================================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  program_name TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id),

  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  capacity INTEGER DEFAULT 20,
  facility TEXT,

  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_coach_id ON schedules(coach_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);

-- ===================================================================
-- Layer 4: Bookings
-- ===================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  booking_date DATE NOT NULL,

  status TEXT DEFAULT 'confirmed' CHECK (
    status IN ('confirmed', 'cancelled', 'completed', 'no_show')
  ),

  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(schedule_id, student_id, booking_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ===================================================================
-- Views
-- ===================================================================

CREATE OR REPLACE VIEW unpaid_payments AS
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

CREATE OR REPLACE VIEW today_bookings AS
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

-- ===================================================================
-- Functions
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION hash_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := regexp_replace(p_phone, '[^0-9]', '', 'g');

  IF NOT (v_normalized ~ '^010' AND length(v_normalized) = 11) THEN
    RAISE EXCEPTION 'Invalid Korean phone number: %', p_phone;
  END IF;

  RETURN encode(digest(v_normalized, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION hash_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := lower(trim(p_email));

  IF NOT (v_normalized ~ '^[^@]+@[^@]+\.[^@]+$') THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  RETURN encode(digest(v_normalized, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION find_or_create_universal_id(
  p_phone TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_phone_hash TEXT;
  v_email_hash TEXT;
  v_universal_id UUID;
BEGIN
  v_phone_hash := hash_phone(p_phone);
  v_email_hash := CASE
    WHEN p_email IS NOT NULL THEN hash_email(p_email)
    ELSE NULL
  END;

  SELECT id INTO v_universal_id
  FROM universal_profiles
  WHERE phone_hash = v_phone_hash
  LIMIT 1;

  IF v_universal_id IS NULL AND v_email_hash IS NOT NULL THEN
    SELECT id INTO v_universal_id
    FROM universal_profiles
    WHERE email_hash = v_email_hash
    LIMIT 1;
  END IF;

  IF v_universal_id IS NULL THEN
    INSERT INTO universal_profiles (phone_hash, email_hash, v_index)
    VALUES (v_phone_hash, v_email_hash, 0)
    RETURNING id INTO v_universal_id;
  ELSE
    UPDATE universal_profiles
    SET email_hash = COALESCE(email_hash, v_email_hash),
        updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  RETURN v_universal_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_link_universal_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_universal_id UUID;
BEGIN
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  v_universal_id := find_or_create_universal_id(NEW.phone, NEW.email);
  NEW.universal_id := v_universal_id;

  UPDATE universal_profiles
  SET total_services = total_services + 1,
      total_interactions = total_interactions + 1,
      updated_at = now()
  WHERE id = v_universal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- Triggers
-- ===================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_auto_link_universal ON profiles;
CREATE TRIGGER trigger_auto_link_universal
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();

-- ===================================================================
-- Complete
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '
============================================================
✅ AUTUS Schema 완료!
============================================================

생성된 테이블:
✅ universal_profiles - 동일인 식별 (AUTUS 핵심)
✅ profiles - 학원별 프로필
✅ payments - 결제
✅ schedules - 시간표
✅ bookings - 예약

생성된 함수:
✅ hash_phone() - 전화번호 SHA-256 해싱
✅ hash_email() - 이메일 SHA-256 해싱
✅ find_or_create_universal_id() - 동일인 검색/생성
✅ auto_link_universal_profile() - 자동 연결 Trigger

다음 단계:
python3 upload_students_fixed.py
============================================================
  ';
END $$;
