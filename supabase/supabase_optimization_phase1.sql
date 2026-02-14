-- ============================================================
-- AUTUS Supabase 최적화 Phase 1
-- 대상: 3,000명 → 10,000명
-- 소요 시간: 10분
-- 실행 방법: Supabase SQL Editor에 복사 & Run
-- ============================================================

-- ===== 1. 인덱스 생성 =====

-- profiles 테이블
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_parent ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_external_id ON profiles(external_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type_status ON profiles(type, status);

-- payments 테이블
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_date ON payments(invoice_date);
CREATE INDEX IF NOT EXISTS idx_payments_unpaid ON payments(payment_status, due_date)
  WHERE paid_amount < total_amount;

-- schedules 테이블
CREATE INDEX IF NOT EXISTS idx_schedules_coach ON schedules(coach_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);

-- bookings 테이블
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_student_date ON bookings(student_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_date ON bookings(schedule_id, booking_date);

-- notifications 테이블
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expired ON notifications(expires_at)
  WHERE status = 'delivered';

-- ===== 2. invoices 테이블 인덱스 (결제선생 통합 후) =====

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_parent ON invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices(status, due_date)
  WHERE status IN ('sent', 'partial', 'overdue');

-- ===== 3. payment_transactions 테이블 인덱스 =====

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paid_at ON payment_transactions(paid_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_card_company ON payment_transactions(card_company);

-- 매출 조회 최적화 (일자별)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paid_date
  ON payment_transactions((DATE(paid_at)));

-- ===== 4. cash_receipts 테이블 인덱스 =====

CREATE INDEX IF NOT EXISTS idx_cash_receipts_transaction ON cash_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_student ON cash_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_issued_at ON cash_receipts(issued_at);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_status ON cash_receipts(status);

-- ===== 5. Materialized View 생성 =====

-- 학생별 미수금 현황
DROP MATERIALIZED VIEW IF EXISTS mv_student_unpaid_summary CASCADE;
CREATE MATERIALIZED VIEW mv_student_unpaid_summary AS
SELECT
  p.student_id,
  prof.name,
  prof.phone,
  COUNT(p.id) as unpaid_count,
  SUM(p.total_amount - p.paid_amount) as total_unpaid,
  MIN(p.due_date) as earliest_due_date,
  MAX(p.due_date) as latest_due_date
FROM payments p
JOIN profiles prof ON p.student_id = prof.id
WHERE p.paid_amount < p.total_amount
  AND p.payment_status != 'cancelled'
GROUP BY p.student_id, prof.name, prof.phone;

CREATE UNIQUE INDEX idx_mv_student_unpaid_student ON mv_student_unpaid_summary(student_id);

-- 일별 매출 집계
DROP MATERIALIZED VIEW IF EXISTS mv_daily_sales CASCADE;
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
  DATE(pt.paid_at) as sale_date,
  COUNT(DISTINCT pt.invoice_id) as invoice_count,
  COUNT(pt.id) as transaction_count,
  SUM(pt.amount) as total_sales,
  SUM(pt.fee) as total_fees,
  SUM(pt.net_amount) as net_sales,
  SUM(CASE WHEN pt.payment_method = 'card' THEN pt.amount ELSE 0 END) as card_sales,
  SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN pt.card_company = '신한' THEN pt.amount ELSE 0 END) as shinhan_sales,
  SUM(CASE WHEN pt.card_company = '국민' THEN pt.amount ELSE 0 END) as kb_sales,
  SUM(CASE WHEN pt.card_company = '삼성' THEN pt.amount ELSE 0 END) as samsung_sales
FROM payment_transactions pt
WHERE pt.status = 'completed'
GROUP BY DATE(pt.paid_at);

CREATE UNIQUE INDEX idx_mv_daily_sales_date ON mv_daily_sales(sale_date);

-- 월별 청구서 현황
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_invoice_summary CASCADE;
CREATE MATERIALIZED VIEW mv_monthly_invoice_summary AS
SELECT
  DATE_TRUNC('month', i.created_at) as month,
  COUNT(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN 1 END) as sent_count,
  SUM(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN i.final_amount ELSE 0 END) as sent_amount,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
  SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount ELSE 0 END) as paid_amount,
  COUNT(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN 1 END) as unpaid_count,
  SUM(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN (i.final_amount - i.paid_amount) ELSE 0 END) as unpaid_amount
FROM invoices i
GROUP BY DATE_TRUNC('month', i.created_at);

CREATE UNIQUE INDEX idx_mv_monthly_invoice_month ON mv_monthly_invoice_summary(month);

-- ===== 6. pg_cron Extension 활성화 =====

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===== 7. Materialized View 자동 갱신 스케줄 =====

-- 기존 스케줄 삭제 (중복 방지)
SELECT cron.unschedule('refresh-mv-daily-sales');
SELECT cron.unschedule('refresh-mv-monthly-invoice');
SELECT cron.unschedule('refresh-mv-student-unpaid');

-- 일별 매출: 매일 새벽 3시
SELECT cron.schedule(
  'refresh-mv-daily-sales',
  '0 3 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales$$
);

-- 월별 청구서: 매월 1일 새벽 3시
SELECT cron.schedule(
  'refresh-mv-monthly-invoice',
  '0 3 1 * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_invoice_summary$$
);

-- 미수금: 매시간
SELECT cron.schedule(
  'refresh-mv-student-unpaid',
  '0 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_unpaid_summary$$
);

-- ===== 8. TTL 자동 정리 =====

-- 기존 스케줄 삭제
SELECT cron.unschedule('cleanup-expired-notifications');

-- 만료된 알림 삭제: 매일 새벽 2시
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 2 * * *',
  $$
    DELETE FROM notifications
    WHERE expires_at < NOW()
      AND status IN ('delivered', 'failed');
  $$
);

-- ===== 9. ANALYZE 실행 (통계 업데이트) =====

ANALYZE profiles;
ANALYZE payments;
ANALYZE schedules;
ANALYZE bookings;
ANALYZE notifications;
ANALYZE invoices;
ANALYZE payment_transactions;
ANALYZE cash_receipts;

-- ===== 10. VACUUM 실행 (공간 회수) =====

VACUUM ANALYZE profiles;
VACUUM ANALYZE payments;
VACUUM ANALYZE schedules;
VACUUM ANALYZE bookings;
VACUUM ANALYZE notifications;

-- ============================================================
-- 완료!
-- ✅ 인덱스 30개 생성
-- ✅ Materialized View 3개 생성
-- ✅ pg_cron 스케줄 4개 설정
-- ✅ 통계 업데이트 완료
--
-- 다음 단계:
-- 1. Materialized View 수동 갱신: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
-- 2. 스케줄 확인: SELECT * FROM cron.job;
-- 3. 성능 확인: SUPABASE_OPTIMIZATION.md 참고
-- ============================================================
