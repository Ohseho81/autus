-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 온리쌤 전체 학생/결제/판매 스키마
-- SmartFit 연동 필드 포함
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 👤 학생 테이블 (확장)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 기존 students 테이블이 있으면 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS school VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS uniform_number VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS shuttle_required BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS smartfit_id VARCHAR(50);

-- 없으면 새로 생성
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 기본 정보
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  
  -- 학부모 정보
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(200),
  
  -- 학교 정보
  school VARCHAR(100),
  birth_year INTEGER,
  birth_date DATE,
  grade VARCHAR(20), -- '초3', '중1', '고2' 등
  
  -- 온리쌤 전용
  uniform_number VARCHAR(10), -- 유니폼 백넘버
  shuttle_required BOOLEAN DEFAULT false, -- 셔틀 유무
  
  -- 외부 연동
  smartfit_id VARCHAR(50), -- SmartFit 회원 ID
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, withdrawn
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_smartfit ON students(smartfit_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

COMMENT ON TABLE students IS '학생 정보';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📅 회원권 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- 회원권 정보
  membership_type VARCHAR(50) NOT NULL, -- '정규반 8회', '월정액' 등
  lesson_name VARCHAR(100), -- 수업명
  coach_id UUID,
  coach_name VARCHAR(100), -- 담당강사
  
  -- 기간/횟수
  start_date DATE NOT NULL,
  end_date DATE,
  total_lessons INTEGER, -- 총 횟수 (-1 = 무제한)
  used_lessons INTEGER DEFAULT 0,
  remaining_lessons INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_lessons = -1 THEN 999 
         ELSE total_lessons - used_lessons 
    END
  ) STORED,
  lessons_per_week INTEGER DEFAULT 2, -- 주 수업 횟수
  
  -- 금액
  lesson_fee INTEGER NOT NULL DEFAULT 0, -- 강습료
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_student ON memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date);

COMMENT ON TABLE memberships IS '학생 회원권';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 💰 결제/수납 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  
  -- 결제 정보
  total_amount INTEGER NOT NULL DEFAULT 0, -- 합계금액
  discount_amount INTEGER DEFAULT 0, -- 할인금액
  paid_amount INTEGER NOT NULL DEFAULT 0, -- 결제금액
  outstanding_amount INTEGER GENERATED ALWAYS AS (total_amount - discount_amount - paid_amount) STORED, -- 미수금
  
  -- 결제 수단별 금액
  cash_amount INTEGER DEFAULT 0, -- 현금
  card_amount INTEGER DEFAULT 0, -- 카드
  transfer_amount INTEGER DEFAULT 0, -- 계좌이체
  online_payment BOOLEAN DEFAULT false, -- 비대면
  zeropay_amount INTEGER DEFAULT 0, -- 제로페이
  
  -- 상태
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, completed, refunded
  
  -- 토스페이먼츠 연동
  toss_payment_key VARCHAR(200),
  toss_order_id VARCHAR(100),
  
  -- 메모
  payment_memo TEXT,
  
  -- 타임스탬프
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 등록/수정자
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

COMMENT ON TABLE payments IS '결제/수납 기록';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛒 판매 기록 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  
  -- 판매 정보
  sale_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seller_name VARCHAR(100),
  sale_description TEXT, -- 판매내역
  quantity INTEGER DEFAULT 1,
  
  -- 금액
  total_amount INTEGER NOT NULL DEFAULT 0, -- 합계금액
  discount_amount INTEGER DEFAULT 0, -- 할인금액
  paid_amount INTEGER NOT NULL DEFAULT 0, -- 결제금액
  outstanding_amount INTEGER GENERATED ALWAYS AS (total_amount - discount_amount - paid_amount) STORED,
  
  -- 결제 수단
  cash_amount INTEGER DEFAULT 0,
  card_amount INTEGER DEFAULT 0,
  transfer_amount INTEGER DEFAULT 0,
  zeropay_amount INTEGER DEFAULT 0,
  
  -- 메모
  sale_memo TEXT,
  
  -- 등록/수정
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_sales_student ON sales(student_id);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(sale_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_name);

COMMENT ON TABLE sales IS '판매 기록';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 출석 기록 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_slot_id UUID,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  
  -- 출석 정보
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'present', -- present, absent, late, makeup
  
  -- 매출 연결
  daily_revenue INTEGER DEFAULT 0, -- 개인일별매출
  
  -- 확인 방법
  verified_by VARCHAR(50), -- qr, manual, coach
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

COMMENT ON TABLE attendance_records IS '출석 기록';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 뷰: 학생 현황 (SmartFit 스타일)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW student_dashboard AS
SELECT
  s.id,
  s.name AS "이름",
  s.phone AS "연락처",
  s.parent_name AS "학부모이름",
  s.school AS "학교",
  s.birth_year AS "연생",
  s.grade AS "학년",
  s.shuttle_required AS "셔틀유무",
  s.uniform_number AS "유니폼백넘버",
  
  -- 회원권 정보
  m.lesson_name AS "수업명",
  m.coach_name AS "담당강사",
  m.start_date AS "이용시작일",
  m.end_date AS "이용종료일",
  m.lessons_per_week AS "주수업횟수",
  m.lesson_fee AS "강습료",
  m.remaining_lessons AS "잔여횟수",
  
  -- 결제 정보
  COALESCE(p.payment_status, 'none') AS "수납현황",
  COALESCE(p.outstanding_amount, 0) AS "미수금",
  
  -- 출석률
  ROUND(
    (SELECT COUNT(*) FILTER (WHERE status = 'present') * 100.0 / NULLIF(COUNT(*), 0)
     FROM attendance_records ar 
     WHERE ar.student_id = s.id 
       AND ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days')
  , 1) AS "출석률"
  
FROM students s
LEFT JOIN memberships m ON m.student_id = s.id AND m.status = 'active'
LEFT JOIN payments p ON p.student_id = s.id AND p.membership_id = m.id
WHERE s.status = 'active'
ORDER BY s.name;

COMMENT ON VIEW student_dashboard IS '학생 현황 대시보드 (SmartFit 스타일)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 뷰: 미수금 현황
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW outstanding_dashboard AS
SELECT
  s.id,
  s.name AS "회원명",
  s.phone AS "연락처",
  s.parent_phone AS "학부모연락처",
  m.lesson_name AS "수업명",
  m.membership_type AS "회원권",
  p.total_amount AS "합계금액",
  p.paid_amount AS "결제금액",
  p.outstanding_amount AS "미수금",
  p.created_at AS "결제일",
  p.payment_memo AS "메모"
FROM payments p
JOIN students s ON s.id = p.student_id
LEFT JOIN memberships m ON m.id = p.membership_id
WHERE p.outstanding_amount > 0
ORDER BY p.outstanding_amount DESC;

COMMENT ON VIEW outstanding_dashboard IS '미수금 현황';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 뷰: 일별 매출
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW daily_revenue_report AS
SELECT
  DATE(p.created_at) AS "날짜",
  COUNT(DISTINCT p.student_id) AS "결제학생수",
  SUM(p.paid_amount) AS "총매출",
  SUM(p.cash_amount) AS "현금",
  SUM(p.card_amount) AS "카드",
  SUM(p.transfer_amount) AS "계좌이체",
  SUM(p.zeropay_amount) AS "제로페이",
  SUM(p.outstanding_amount) AS "미수금"
FROM payments p
WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(p.created_at)
ORDER BY DATE(p.created_at) DESC;

COMMENT ON VIEW daily_revenue_report IS '일별 매출 리포트';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 관리자/코치 접근
CREATE POLICY "Staff access students" ON students FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'coach')
  ));

CREATE POLICY "Staff access memberships" ON memberships FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'coach')
  ));

CREATE POLICY "Staff access payments" ON payments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Staff access sales" ON sales FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Staff access attendance" ON attendance_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'coach')
  ));
