-- ============================================
-- 🏀 AllThatBasket Complete Schema
-- ============================================
-- 실행: supabase db push
-- 또는: psql로 직접 실행
-- ============================================

-- ============================================
-- 1. 학원 정보 (academies)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_academies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 코치 (coaches)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES atb_academies(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'coach', -- 'owner', 'head_coach', 'coach', 'assistant'
    hourly_rate INTEGER DEFAULT 0,
    profile_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 수업 (classes)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES atb_academies(id),
    name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=일, 1=월, ..., 6=토
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    coach_id UUID REFERENCES atb_coaches(id),
    max_students INTEGER DEFAULT 20,
    monthly_fee INTEGER DEFAULT 100000,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 학생 (students)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES atb_academies(id),
    name TEXT NOT NULL,
    phone TEXT,
    parent_phone TEXT,
    parent_name TEXT,
    grade TEXT, -- '초1', '초2', ... '중3', '고1' 등
    school TEXT,
    birth_date DATE,
    gender TEXT, -- 'M', 'F'
    profile_url TEXT,

    -- 등록 정보
    enrollment_date DATE DEFAULT CURRENT_DATE,
    enrollment_status TEXT DEFAULT 'active', -- 'active', 'paused', 'withdrawn'

    -- V-Index 관련
    v_index NUMERIC(5,2) DEFAULT 0,
    risk_score NUMERIC(5,2) DEFAULT 0,

    -- 통계 (캐시)
    attendance_rate NUMERIC(5,2) DEFAULT 100,
    consecutive_absent INTEGER DEFAULT 0,
    total_outstanding INTEGER DEFAULT 0,

    -- 메타
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 학생-수업 등록 (enrollments)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES atb_classes(id) ON DELETE CASCADE,
    enrolled_at DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'dropped'
    UNIQUE(student_id, class_id)
);

-- ============================================
-- 6. 출석 (attendance)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES atb_classes(id),
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'present', 'absent', 'late', 'excused'
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    checked_by UUID REFERENCES atb_coaches(id),
    notes TEXT,
    parent_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)
);

-- ============================================
-- 7. 결제 (payments)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES atb_academies(id),

    -- 결제 정보
    amount INTEGER NOT NULL,
    month TEXT NOT NULL, -- '2026-02'
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'partial', 'refunded'

    -- 결제 상세
    paid_amount INTEGER DEFAULT 0,
    paid_at TIMESTAMPTZ,
    payment_method TEXT, -- 'card', 'transfer', 'cash'
    transaction_id TEXT,

    -- 마감
    due_date DATE,

    -- 메타
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, month)
);

-- ============================================
-- 8. 피드백 (feedback)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES atb_classes(id),
    coach_id UUID REFERENCES atb_coaches(id),
    date DATE NOT NULL,

    -- 피드백 내용
    content TEXT,
    skills_practiced TEXT[],
    improvements TEXT[],
    highlights TEXT[],

    -- 미디어
    video_url TEXT,
    photo_urls TEXT[],

    -- 발송
    sent_to_parent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    parent_viewed BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. QR 코드 (qr_codes)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. MoltBot 개입 로그 (interventions)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id),

    -- 개입 정보
    trigger_type TEXT NOT NULL, -- 'attendance', 'payment', 'risk', 'manual'
    action_code TEXT NOT NULL,  -- 'attendance_reminder', 'payment_contact', etc.
    rule_id TEXT,

    -- 실행
    executed_by TEXT DEFAULT 'moltbot', -- 'moltbot', 'coach', 'owner'
    mode TEXT, -- 'auto', 'shadow', 'manual'

    -- 결과
    outcome TEXT, -- 'success', 'partial', 'failed', 'pending'
    outcome_data JSONB,
    outcome_at TIMESTAMPTZ,

    -- 스냅샷
    context_snapshot JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 알림 로그 (notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id),
    recipient_phone TEXT,

    -- 알림 정보
    type TEXT NOT NULL, -- 'attendance', 'payment', 'feedback', 'general'
    channel TEXT NOT NULL, -- 'kakao', 'sms', 'push', 'email'

    -- 내용
    title TEXT,
    message TEXT,

    -- 상태
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. 포인트 (points)
-- ============================================
CREATE TABLE IF NOT EXISTS atb_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,

    -- 포인트 정보
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'attendance', 'achievement', 'referral', 'used'
    description TEXT,

    -- 관련 정보
    related_id UUID,
    related_type TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEWS
-- ============================================

-- 학생 대시보드 뷰
CREATE OR REPLACE VIEW atb_student_dashboard AS
SELECT
    s.id,
    s.name,
    s.grade,
    s.phone,
    s.parent_phone,
    s.enrollment_status,
    s.enrollment_date,

    -- 출석 통계
    COALESCE(att.attendance_rate, 100) as attendance_rate,
    COALESCE(att.total_classes, 0) as total_classes,
    COALESCE(att.present_count, 0) as present_count,
    COALESCE(att.absent_count, 0) as absent_count,

    -- 결제 통계
    COALESCE(pay.total_outstanding, 0) as total_outstanding,
    COALESCE(pay.months_paid, 0) as months_paid,

    -- V-Index 계산
    -- V = (M - T) × (1 + s)^t
    -- 간소화: V = attendance_rate × (1 - outstanding_ratio) × tenure_bonus
    ROUND(
        COALESCE(att.attendance_rate, 100) *
        (1 - LEAST(COALESCE(pay.total_outstanding, 0)::numeric / 100000, 1)) *
        (1 + EXTRACT(MONTH FROM AGE(NOW(), s.enrollment_date))::numeric * 0.01),
        2
    ) as v_index,

    -- 위험 점수
    ROUND(
        (100 - COALESCE(att.attendance_rate, 100)) * 0.5 +
        LEAST(COALESCE(pay.total_outstanding, 0)::numeric / 10000, 50),
        2
    ) as risk_score,

    s.created_at,
    s.updated_at
FROM atb_students s
LEFT JOIN (
    SELECT
        student_id,
        ROUND(COUNT(*) FILTER (WHERE status = 'present')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as attendance_rate,
        COUNT(*) as total_classes,
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count
    FROM atb_attendance
    WHERE date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY student_id
) att ON s.id = att.student_id
LEFT JOIN (
    SELECT
        student_id,
        SUM(amount - paid_amount) FILTER (WHERE status != 'paid') as total_outstanding,
        COUNT(*) FILTER (WHERE status = 'paid') as months_paid
    FROM atb_payments
    GROUP BY student_id
) pay ON s.id = pay.student_id;

-- 오늘 출석 현황 뷰
CREATE OR REPLACE VIEW atb_today_attendance AS
SELECT
    c.id as class_id,
    c.name as class_name,
    c.start_time,
    c.end_time,
    coach.name as coach_name,
    COUNT(e.student_id) as total_students,
    COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count,
    COUNT(a.id) FILTER (WHERE a.status = 'absent') as absent_count,
    COUNT(a.id) FILTER (WHERE a.status = 'late') as late_count,
    COUNT(e.student_id) - COUNT(a.id) as unchecked_count
FROM atb_classes c
LEFT JOIN atb_coaches coach ON c.coach_id = coach.id
LEFT JOIN atb_enrollments e ON c.id = e.class_id AND e.status = 'active'
LEFT JOIN atb_attendance a ON e.student_id = a.student_id
    AND a.class_id = c.id
    AND a.date = CURRENT_DATE
WHERE c.is_active = true
    AND c.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
GROUP BY c.id, c.name, c.start_time, c.end_time, coach.name;

-- 월별 결제 현황 뷰
CREATE OR REPLACE VIEW atb_monthly_payments AS
SELECT
    month,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
    SUM(amount) as total_amount,
    SUM(paid_amount) as collected_amount,
    SUM(amount - paid_amount) FILTER (WHERE status != 'paid') as outstanding_amount
FROM atb_payments
GROUP BY month
ORDER BY month DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- 출석 체크 함수 (체인 반응 트리거)
CREATE OR REPLACE FUNCTION fn_check_attendance(
    p_student_id UUID,
    p_class_id UUID,
    p_status TEXT,
    p_coach_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_consecutive INTEGER;
    v_attendance_rate NUMERIC;
BEGIN
    -- 1. 출석 기록 삽입/업데이트
    INSERT INTO atb_attendance (student_id, class_id, date, status, check_in_time, checked_by)
    VALUES (p_student_id, p_class_id, CURRENT_DATE, p_status, NOW(), p_coach_id)
    ON CONFLICT (student_id, class_id, date)
    DO UPDATE SET status = p_status, check_in_time = NOW(), checked_by = p_coach_id;

    -- 2. 연속 결석 계산
    SELECT COUNT(*)
    INTO v_consecutive
    FROM (
        SELECT date, status,
            ROW_NUMBER() OVER (ORDER BY date DESC) as rn
        FROM atb_attendance
        WHERE student_id = p_student_id
        ORDER BY date DESC
        LIMIT 10
    ) sub
    WHERE status = 'absent' AND rn <= 5;

    -- 3. 출석률 계산 (최근 90일)
    SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'present')::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
    )
    INTO v_attendance_rate
    FROM atb_attendance
    WHERE student_id = p_student_id
        AND date >= CURRENT_DATE - INTERVAL '90 days';

    -- 4. 학생 통계 업데이트
    UPDATE atb_students
    SET
        attendance_rate = COALESCE(v_attendance_rate, 100),
        consecutive_absent = CASE WHEN p_status = 'absent' THEN v_consecutive ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_student_id;

    -- 5. 결과 반환
    v_result := jsonb_build_object(
        'student_id', p_student_id,
        'status', p_status,
        'consecutive_absent', v_consecutive,
        'attendance_rate', v_attendance_rate,
        'needs_notification', p_status IN ('absent', 'late'),
        'needs_intervention', v_consecutive >= 2 OR v_attendance_rate < 70
    );

    RETURN v_result;
END;
$$;

-- 결제 처리 함수
CREATE OR REPLACE FUNCTION fn_process_payment(
    p_student_id UUID,
    p_amount INTEGER,
    p_month TEXT,
    p_payment_method TEXT DEFAULT 'card',
    p_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_total_outstanding INTEGER;
BEGIN
    -- 1. 결제 기록 업데이트
    INSERT INTO atb_payments (student_id, amount, month, status, paid_amount, paid_at, payment_method, transaction_id)
    VALUES (p_student_id, p_amount, p_month, 'paid', p_amount, NOW(), p_payment_method, p_transaction_id)
    ON CONFLICT (student_id, month)
    DO UPDATE SET
        status = 'paid',
        paid_amount = atb_payments.paid_amount + p_amount,
        paid_at = NOW(),
        payment_method = p_payment_method,
        transaction_id = p_transaction_id,
        updated_at = NOW();

    -- 2. 미수금 총액 계산
    SELECT COALESCE(SUM(amount - paid_amount), 0)
    INTO v_total_outstanding
    FROM atb_payments
    WHERE student_id = p_student_id AND status != 'paid';

    -- 3. 학생 통계 업데이트
    UPDATE atb_students
    SET total_outstanding = v_total_outstanding, updated_at = NOW()
    WHERE id = p_student_id;

    -- 4. 결과 반환
    v_result := jsonb_build_object(
        'student_id', p_student_id,
        'month', p_month,
        'paid_amount', p_amount,
        'total_outstanding', v_total_outstanding,
        'status', 'success'
    );

    RETURN v_result;
END;
$$;

-- QR 코드 생성 함수
CREATE OR REPLACE FUNCTION fn_generate_qr_code(p_student_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- 유니크 코드 생성
    v_code := 'ATB-' || UPPER(SUBSTRING(p_student_id::TEXT, 1, 8)) || '-' ||
              TO_CHAR(NOW(), 'YYMM');

    -- QR 코드 저장
    INSERT INTO atb_qr_codes (student_id, code)
    VALUES (p_student_id, v_code)
    ON CONFLICT (code) DO NOTHING;

    RETURN v_code;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'atb_academies', 'atb_coaches', 'atb_classes',
        'atb_students', 'atb_payments'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON %I;
            CREATE TRIGGER trigger_update_timestamp
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
        ', t, t);
    END LOOP;
END;
$$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_academy ON atb_students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON atb_students(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON atb_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON atb_attendance(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_month ON atb_payments(month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON atb_payments(status);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON atb_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON atb_qr_codes(code);

-- ============================================
-- RLS (Row Level Security) - 선택적
-- ============================================
-- ALTER TABLE atb_students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE atb_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE atb_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 초기 데이터 (테스트용)
-- ============================================
-- INSERT INTO atb_academies (name, owner_name, phone)
-- VALUES ('올댓바스켓 농구교실', '김코치', '010-1234-5678');
