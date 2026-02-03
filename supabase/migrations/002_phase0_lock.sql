-- ============================================
-- 🔒 PHASE 0 - 철학·구조 잠금
-- ============================================
-- 원칙: Fact = Payment + Attendance 뿐
-- 메모/상담/수기수정 = 구조적으로 불가능
-- ============================================

-- ============================================
-- 1. notes 필드 제거 (자유 텍스트 금지)
-- ============================================
ALTER TABLE atb_students DROP COLUMN IF EXISTS notes;
ALTER TABLE atb_attendance DROP COLUMN IF EXISTS notes;
ALTER TABLE atb_payments DROP COLUMN IF EXISTS notes;

-- ============================================
-- 2. atb_feedback 테이블 삭제 (메모 테이블 금지)
-- ============================================
-- 피드백은 Intervention Log로만 기록
DROP TABLE IF EXISTS atb_feedback CASCADE;

-- ============================================
-- 3. 출석 입력 경로 잠금
-- ============================================
-- 출석은 QR 스캔으로만 가능 (check_in_method 강제)
ALTER TABLE atb_attendance
ADD COLUMN IF NOT EXISTS check_in_method TEXT DEFAULT 'qr'
CHECK (check_in_method IN ('qr', 'auto_timeout'));

-- 수기 입력 차단: checked_by가 NULL이면 시스템 자동
-- checked_by가 있으면 반드시 개입 로그 필요

-- ============================================
-- 4. 결제 입력 경로 잠금
-- ============================================
-- 결제는 웹훅으로만 가능 (source 강제)
ALTER TABLE atb_payments
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webhook'
CHECK (source IN ('webhook', 'portone', 'toss', 'system'));

-- 환불은 APPROVAL 필수
ALTER TABLE atb_payments
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- ============================================
-- 5. 개입 로그 강제 (핵심)
-- ============================================
-- 모든 "예외"는 intervention으로만 가능
-- 수동 변경 = 반드시 intervention 먼저 생성

CREATE OR REPLACE FUNCTION fn_require_intervention()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태 변경 시 intervention 로그 확인
    IF TG_OP = 'UPDATE' THEN
        -- enrollment_status 변경은 intervention 필요
        IF OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status THEN
            -- 최근 1분 내 intervention이 있는지 확인
            IF NOT EXISTS (
                SELECT 1 FROM atb_interventions
                WHERE student_id = NEW.id
                AND created_at > NOW() - INTERVAL '1 minute'
                AND action_code IN ('status_change', 'pause', 'withdraw')
            ) THEN
                RAISE EXCEPTION 'Status change requires intervention log first';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용 (선택적 - 운영 시 활성화)
-- DROP TRIGGER IF EXISTS trigger_require_intervention ON atb_students;
-- CREATE TRIGGER trigger_require_intervention
-- BEFORE UPDATE ON atb_students
-- FOR EACH ROW EXECUTE FUNCTION fn_require_intervention();

-- ============================================
-- 6. 입력 경로 뷰 (검증용)
-- ============================================
CREATE OR REPLACE VIEW atb_input_audit AS
SELECT
    'attendance' as fact_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE check_in_method = 'qr') as via_qr,
    COUNT(*) FILTER (WHERE check_in_method != 'qr') as non_qr
FROM atb_attendance
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT
    'payment' as fact_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE source IN ('webhook', 'portone', 'toss')) as via_webhook,
    COUNT(*) FILTER (WHERE source NOT IN ('webhook', 'portone', 'toss', 'system')) as non_webhook
FROM atb_payments
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================
-- 7. PHASE 0 잠금 확인 뷰
-- ============================================
CREATE OR REPLACE VIEW atb_phase0_check AS
SELECT
    -- Fact 테이블 2개만 존재하는가
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_name LIKE 'atb_%'
     AND table_name IN ('atb_attendance', 'atb_payments')) = 2 as fact_tables_only,

    -- notes 컬럼이 없는가
    NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name LIKE 'atb_%'
        AND column_name = 'notes'
    ) as no_notes_columns,

    -- feedback 테이블이 없는가
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'atb_feedback'
    ) as no_feedback_table,

    -- intervention 테이블이 있는가
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'atb_interventions'
    ) as has_intervention_log;

-- ============================================
-- PHASE 0 잠금 완료
-- ============================================
-- 이 마이그레이션 이후:
-- ✅ Fact = Payment + Attendance 뿐
-- ✅ 메모/자유텍스트 필드 없음
-- ✅ 피드백 테이블 삭제됨
-- ✅ 모든 예외는 Intervention으로만 가능
-- ============================================
