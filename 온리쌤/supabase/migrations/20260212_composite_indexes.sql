-- ============================================
-- AUTUS Composite Indexes Migration
-- 자주 사용되는 쿼리 패턴 최적화
-- ============================================

-- Events: org_id + type + occurred_at (가장 빈번한 쿼리 패턴)
CREATE INDEX IF NOT EXISTS idx_events_org_type_occurred
  ON events(org_id, type, occurred_at DESC);

-- Events: entity + type + occurred_at (엔티티별 이벤트 조회)
CREATE INDEX IF NOT EXISTS idx_events_entity_type_occurred
  ON events(entity_id, type, occurred_at DESC);

-- Entities: org + status (조직별 활성 엔티티 조회)
CREATE INDEX IF NOT EXISTS idx_entities_org_status
  ON entities(org_id, status);

-- Student Payments: status + created_at (결제 상태별 조회)
CREATE INDEX IF NOT EXISTS idx_student_payments_status_created
  ON student_payments(status, created_at DESC);

-- Attendance: student + check-in time (학생별 출석 조회)
CREATE INDEX IF NOT EXISTS idx_attendance_student_checkin
  ON attendance_records(student_id, check_in_time DESC);

-- Coach Work Logs: coach + date (코치별 근무 기록)
CREATE INDEX IF NOT EXISTS idx_work_logs_coach_date_desc
  ON coach_work_logs(coach_id, work_date DESC);

-- Coach Salaries: coach + month (코치별 급여 조회)
CREATE INDEX IF NOT EXISTS idx_salaries_coach_month_desc
  ON coach_salaries(coach_id, salary_month DESC);
