-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔄 스마트핏 API 연동 테이블
-- 기존 스마트핏 시스템과의 데이터 동기화
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 students 테이블 확장 (스마트핏 연동 필드 추가)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 스마트핏 연동 필드 추가
ALTER TABLE students
ADD COLUMN IF NOT EXISTS smartfit_idx VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS membership_status VARCHAR(20) DEFAULT 'VALID',
ADD COLUMN IF NOT EXISTS membership_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS membership_start DATE,
ADD COLUMN IF NOT EXISTS membership_end DATE,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_students_smartfit ON students(smartfit_idx);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(membership_status);
CREATE INDEX IF NOT EXISTS idx_students_membership_end ON students(membership_end);

COMMENT ON COLUMN students.smartfit_idx IS '스마트핏 시스템 회원 ID';
COMMENT ON COLUMN students.membership_status IS '회원권 상태 (VALID/EXPIRED/SUSPENDED)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 attendance_records 테이블 확장
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS lesson_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS coach_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app',
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 중복 방지 인덱스 (스마트핏 동기화용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
ON attendance_records(student_id, check_in_time);

COMMENT ON COLUMN attendance_records.source IS '출석 기록 출처 (app/smartfit/qr)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 student_payments 테이블 (수납/미수 관리)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 기존 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 판매 정보
  sale_item VARCHAR(200) NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  outstanding INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- PAID, PARTIAL, UNPAID

  -- 날짜
  sale_date TIMESTAMPTZ NOT NULL,
  paid_date TIMESTAMPTZ,

  -- 동기화 정보
  source VARCHAR(20) DEFAULT 'app',
  synced_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 중복 방지
  UNIQUE(student_id, sale_date, sale_item)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_student ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON student_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_outstanding ON student_payments(outstanding) WHERE outstanding > 0;
CREATE INDEX IF NOT EXISTS idx_payments_sale_date ON student_payments(sale_date DESC);

-- RLS
ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Staff can view payments"
  ON student_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager', 'coach')
    )
  );

COMMENT ON TABLE student_payments IS '학생별 수납/미수 기록 (스마트핏 연동)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 동기화 로그 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- members, attendance, payments
  synced_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(synced_at DESC);

COMMENT ON TABLE sync_logs IS '스마트핏 데이터 동기화 로그';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 미수금 현황 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW outstanding_summary AS
SELECT
  s.id as student_id,
  s.name as student_name,
  s.parent_phone,
  s.membership_status,
  s.membership_end,
  SUM(sp.outstanding) as total_outstanding,
  COUNT(*) as outstanding_count,
  MAX(sp.sale_date) as last_sale_date,
  CASE
    WHEN SUM(sp.outstanding) >= 500000 THEN 'HIGH'
    WHEN SUM(sp.outstanding) >= 200000 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level
FROM students s
JOIN student_payments sp ON sp.student_id = s.id
WHERE sp.outstanding > 0
GROUP BY s.id, s.name, s.parent_phone, s.membership_status, s.membership_end
ORDER BY total_outstanding DESC;

COMMENT ON VIEW outstanding_summary IS '미수금 현황 요약 (위험도 포함)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 회원 현황 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW member_status_summary AS
SELECT
  membership_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM students
WHERE smartfit_idx IS NOT NULL
GROUP BY membership_status;

COMMENT ON VIEW member_status_summary IS '회원 상태별 현황';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 만료 예정 회원 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW expiring_memberships AS
SELECT
  id,
  name,
  parent_phone,
  membership_type,
  membership_end,
  (membership_end - CURRENT_DATE) as days_until_expiry
FROM students
WHERE membership_status = 'VALID'
  AND membership_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
ORDER BY membership_end;

COMMENT ON VIEW expiring_memberships IS '14일 내 만료 예정 회원';
