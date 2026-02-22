-- ═══════════════════════════════════════════════════════════════════════════════
-- 결제선생(PaySSAM) 청구서 연동 테이블
--
-- 온리쌤 ↔ 결제선생 API 연동을 위한 청구서 추적 테이블
-- Pattern: payment_records (Toss) 동일 구조
-- ═══════════════════════════════════════════════════════════════════════════════

-- 청구서 상태 ENUM
CREATE TYPE payssam_invoice_status AS ENUM (
  'pending',     -- 생성됨, 미발송
  'sent',        -- 결제선생 API로 발송 완료
  'paid',        -- 결제 완료 (Webhook 수신)
  'overdue',     -- 미납 (기한 초과)
  'cancelled',   -- 취소
  'failed'       -- 발송 실패
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 payment_invoices (결제선생 청구서)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_invoices (
  -- PK
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 조직 (멀티테넌시)
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

  -- 학생/학부모 참조
  student_id UUID,             -- FK → atb_students 또는 entities
  parent_phone VARCHAR(20) NOT NULL,  -- 학부모 전화번호 (결제선생 발송 대상)

  -- 청구 정보
  amount INTEGER NOT NULL CHECK (amount > 0),  -- 청구 금액 (원)
  description VARCHAR(200) NOT NULL,           -- 청구 사유 ("2026년 3월 수업료")
  due_date DATE,                               -- 납부 기한

  -- 결제선생 외부 ID
  payssam_invoice_id VARCHAR(100),  -- 결제선생에서 반환한 청구서 ID

  -- 상태 관리
  status payssam_invoice_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,              -- 발송 시각
  paid_at TIMESTAMPTZ,              -- 결제 완료 시각
  callback_received_at TIMESTAMPTZ, -- Webhook 수신 시각

  -- 포인트 비용
  point_cost INTEGER DEFAULT 55,    -- 쌤포인트 차감 (기본 55P/건)

  -- 에러 추적
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,    -- 재시도 횟수

  -- API 응답 보존
  raw_response JSONB,

  -- 중복 방지 (idempotency)
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 인덱스
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_payment_invoices_student ON payment_invoices(student_id);
CREATE INDEX idx_payment_invoices_status ON payment_invoices(status);
CREATE INDEX idx_payment_invoices_org ON payment_invoices(org_id);
CREATE INDEX idx_payment_invoices_created ON payment_invoices(created_at DESC);
CREATE INDEX idx_payment_invoices_overdue ON payment_invoices(status, due_date)
  WHERE status IN ('sent', 'overdue');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔄 updated_at 자동 갱신 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_payment_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_invoices_updated_at
  BEFORE UPDATE ON payment_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_invoices_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔒 RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;

-- Admin/Manager: 전체 조회
CREATE POLICY "Admins can view all invoices"
  ON payment_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager')
    )
  );

-- Admin/Manager: 생성/수정
CREATE POLICY "Admins can manage invoices"
  ON payment_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager')
    )
  );

-- Parent: 본인 자녀 청구서만 조회
CREATE POLICY "Parents can view children invoices"
  ON payment_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM atb_students
      WHERE atb_students.id = payment_invoices.student_id
      AND atb_students.parent_id = auth.uid()
    )
  );

-- System: 삽입/수정 (Edge Function, Service Role)
CREATE POLICY "System can insert invoices"
  ON payment_invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update invoices"
  ON payment_invoices FOR UPDATE
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 미납 청구서 뷰 (overdue detection)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
  pi.*,
  s.name AS student_name,
  CURRENT_DATE - pi.due_date AS days_overdue
FROM payment_invoices pi
LEFT JOIN atb_students s ON s.id = pi.student_id
WHERE pi.status IN ('sent', 'overdue')
  AND pi.due_date < CURRENT_DATE
ORDER BY pi.due_date ASC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 월별 청구/수납 통계 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW payssam_monthly_stats AS
SELECT
  org_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_invoices,
  COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE status IN ('sent', 'overdue')) AS unpaid_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS paid_amount,
  COALESCE(SUM(amount) FILTER (WHERE status IN ('sent', 'overdue')), 0) AS unpaid_amount,
  COALESCE(SUM(point_cost), 0) AS total_point_cost
FROM payment_invoices
GROUP BY org_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 코멘트
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE payment_invoices IS '결제선생(PaySSAM) 청구서 추적 테이블';
COMMENT ON COLUMN payment_invoices.dedupe_key IS 'Idempotency key: PAYSSAM-{org_id}-{student_id}-{YYYYMM}';
COMMENT ON COLUMN payment_invoices.payssam_invoice_id IS '결제선생 API에서 반환한 외부 청구서 ID';
COMMENT ON COLUMN payment_invoices.point_cost IS '쌤포인트 차감 (기본 55P/건)';
