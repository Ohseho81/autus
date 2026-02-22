-- ═══════════════════════════════════════════════════════════════════════════════
-- 💳 토스페이먼츠 결제 테이블
-- 결제 기록, 빌링키, 환불 관리
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 결제 기록 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 토스페이먼츠 정보
  payment_key VARCHAR(200) UNIQUE,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'READY',
  method VARCHAR(30), -- CARD, BILLING, VIRTUAL_ACCOUNT, etc.

  -- 빌링 결제인 경우
  billing_key VARCHAR(200),

  -- 승인 정보
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,

  -- 취소/환불 정보
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancel_amount INTEGER,

  -- 오류 정보
  error_code VARCHAR(50),
  error_message TEXT,

  -- 연관 데이터
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 원본 응답 (디버깅용)
  raw_response JSONB,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_payment_records_payment_key ON payment_records(payment_key);
CREATE INDEX idx_payment_records_order_id ON payment_records(order_id);
CREATE INDEX idx_payment_records_student ON payment_records(student_id);
CREATE INDEX idx_payment_records_parent ON payment_records(parent_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_created ON payment_records(created_at DESC);

-- RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 조회
CREATE POLICY "Admins can view all payments"
  ON payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager')
    )
  );

-- 학부모 본인 결제만 조회
CREATE POLICY "Parents can view own payments"
  ON payment_records FOR SELECT
  USING (parent_id = auth.uid());

-- 시스템 삽입/업데이트
CREATE POLICY "System can insert payments"
  ON payment_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payments"
  ON payment_records FOR UPDATE
  USING (true);

COMMENT ON TABLE payment_records IS '토스페이먼츠 결제 기록';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔑 빌링키 테이블 (정기결제용 카드)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 고객 정보
  customer_key VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 빌링키 정보
  billing_key VARCHAR(200) NOT NULL UNIQUE,

  -- 카드 정보 (마스킹됨)
  card_company VARCHAR(50),
  card_number VARCHAR(20), -- 마스킹: **** **** **** 1234
  card_type VARCHAR(20), -- 신용, 체크

  -- 상태
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_billing_keys_customer ON billing_keys(customer_key);
CREATE INDEX idx_billing_keys_parent ON billing_keys(parent_id);
CREATE INDEX idx_billing_keys_active ON billing_keys(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;

-- 학부모 본인 카드만 조회/관리
CREATE POLICY "Parents can manage own billing keys"
  ON billing_keys FOR ALL
  USING (parent_id = auth.uid());

-- 관리자 조회
CREATE POLICY "Admins can view billing keys"
  ON billing_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager')
    )
  );

COMMENT ON TABLE billing_keys IS '정기결제용 빌링키 (등록 카드)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📦 수업권 패키지 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lesson_packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- 수업 정보
  lesson_count INTEGER NOT NULL, -- -1 = 무제한
  validity_days INTEGER DEFAULT 30, -- 유효기간 (일)

  -- 가격
  price INTEGER NOT NULL,
  price_per_lesson INTEGER,
  discount_rate INTEGER DEFAULT 0,

  -- 표시
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본 패키지 데이터
INSERT INTO lesson_packages (id, name, description, lesson_count, price, price_per_lesson, is_popular, display_order) VALUES
  ('trial', '체험 수업', '첫 체험 할인가', 1, 30000, 30000, false, 1),
  ('basic_4', '기본반 4회', '주 1회 수업', 4, 160000, 40000, false, 2),
  ('standard_8', '정규반 8회', '주 2회 수업 추천', 8, 280000, 35000, true, 3),
  ('intensive_12', '집중반 12회', '주 3회 집중 훈련', 12, 360000, 30000, false, 4),
  ('monthly', '월정액 무제한', '한 달 무제한 수업', -1, 450000, NULL, false, 5)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE lesson_packages IS '수업권 패키지 상품';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎫 학생 수업권 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_lesson_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 연관 정보
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id VARCHAR(50) REFERENCES lesson_packages(id),
  payment_id UUID REFERENCES payment_records(id),

  -- 수업권 정보
  total_lessons INTEGER NOT NULL,
  used_lessons INTEGER NOT NULL DEFAULT 0,
  remaining_lessons INTEGER GENERATED ALWAYS AS (total_lessons - used_lessons) STORED,

  -- 유효기간
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, refunded

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_lesson_credits_student ON student_lesson_credits(student_id);
CREATE INDEX idx_lesson_credits_status ON student_lesson_credits(status);
CREATE INDEX idx_lesson_credits_expires ON student_lesson_credits(expires_at);

-- RLS
ALTER TABLE student_lesson_credits ENABLE ROW LEVEL SECURITY;

-- 관리자/코치 조회
CREATE POLICY "Staff can view lesson credits"
  ON student_lesson_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager', 'coach')
    )
  );

-- 학부모 자녀 수업권 조회
CREATE POLICY "Parents can view children credits"
  ON student_lesson_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_id
      AND students.parent_id = auth.uid()
    )
  );

COMMENT ON TABLE student_lesson_credits IS '학생별 수업권 잔여 현황';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 결제 통계 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW payment_stats AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) FILTER (WHERE status = 'DONE') as success_count,
  COUNT(*) FILTER (WHERE status IN ('CANCELED', 'PARTIAL_CANCELED')) as cancel_count,
  SUM(amount) FILTER (WHERE status = 'DONE') as total_revenue,
  SUM(cancel_amount) FILTER (WHERE status IN ('CANCELED', 'PARTIAL_CANCELED')) as total_refund,
  SUM(amount) FILTER (WHERE status = 'DONE') - COALESCE(SUM(cancel_amount) FILTER (WHERE status IN ('CANCELED', 'PARTIAL_CANCELED')), 0) as net_revenue
FROM payment_records
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

COMMENT ON VIEW payment_stats IS '월별 결제 통계';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚡ 트리거: 수업 차감 시 수업권 업데이트
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION deduct_lesson_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- 해당 학생의 활성 수업권에서 1회 차감
  UPDATE student_lesson_credits
  SET
    used_lessons = used_lessons + 1,
    updated_at = NOW()
  WHERE student_id = NEW.student_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (total_lessons = -1 OR remaining_lessons > 0)
  ORDER BY expires_at NULLS LAST, created_at
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 출석 기록 시 자동 차감
CREATE TRIGGER attendance_deduct_credit
  AFTER INSERT ON attendance_records
  FOR EACH ROW
  WHEN (NEW.status = 'present')
  EXECUTE FUNCTION deduct_lesson_credit();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔔 만료 예정 알림용 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW expiring_credits AS
SELECT
  slc.id,
  slc.student_id,
  s.name as student_name,
  s.parent_phone,
  slc.remaining_lessons,
  slc.expires_at,
  EXTRACT(DAY FROM slc.expires_at - NOW()) as days_until_expiry
FROM student_lesson_credits slc
JOIN students s ON s.id = slc.student_id
WHERE slc.status = 'active'
  AND slc.expires_at IS NOT NULL
  AND slc.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';

COMMENT ON VIEW expiring_credits IS '7일 내 만료 예정 수업권';
