-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 V-Index 계산 함수들
-- AUTUS 2.0 - 관계 유지력 OS
-- A = R^σ (Attraction = Relationship^Sigma)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- V-Index 가중치 설정 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS v_index_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- TSEL 가중치
  trust_weight DECIMAL(3,2) DEFAULT 0.25,        -- T: 신뢰 (결제)
  satisfaction_weight DECIMAL(3,2) DEFAULT 0.30, -- S: 만족 (출석)
  engagement_weight DECIMAL(3,2) DEFAULT 0.25,   -- E: 참여 (응답)
  loyalty_weight DECIMAL(3,2) DEFAULT 0.20,      -- L: 충성 (기간)
  
  -- 위험 임계값
  high_risk_threshold DECIMAL(5,2) DEFAULT 40.0,
  medium_risk_threshold DECIMAL(5,2) DEFAULT 60.0,
  low_risk_threshold DECIMAL(5,2) DEFAULT 80.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(org_id)
);

-- 기본 가중치 삽입
INSERT INTO v_index_weights (org_id, trust_weight, satisfaction_weight, engagement_weight, loyalty_weight)
VALUES ('00000000-0000-0000-0000-000000000001', 0.25, 0.30, 0.25, 0.20)
ON CONFLICT (org_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 출석률 계산 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_attendance_rate(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
  v_attended INTEGER;
  v_expected INTEGER;
  v_rate DECIMAL;
BEGIN
  -- 출석 횟수
  SELECT COUNT(*) INTO v_attended
  FROM events
  WHERE entity_id = p_student_id
    AND event_type = 'attendance'
    AND status = 'completed'
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- 예상 수업 수 (최소 주 2회 가정)
  v_expected := GREATEST((p_days / 7) * 2, 1);
  
  -- 출석률 (최대 100%)
  v_rate := LEAST((v_attended::DECIMAL / v_expected) * 100, 100);
  
  RETURN ROUND(v_rate, 1);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 결제율 계산 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_payment_rate(
  p_student_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  v_success INTEGER;
  v_total INTEGER;
  v_rate DECIMAL;
BEGIN
  -- 성공한 결제
  SELECT COUNT(*) INTO v_success
  FROM events
  WHERE entity_id = p_student_id
    AND event_type = 'payment'
    AND status = 'completed'
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- 전체 결제 시도
  SELECT COUNT(*) INTO v_total
  FROM events
  WHERE entity_id = p_student_id
    AND event_type = 'payment'
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- 결제율
  IF v_total = 0 THEN
    v_rate := 100; -- 결제 시도가 없으면 100% (문제 없음)
  ELSE
    v_rate := (v_success::DECIMAL / v_total) * 100;
  END IF;
  
  RETURN ROUND(v_rate, 1);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 참여도 계산 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
  v_responses INTEGER;
  v_notifications INTEGER;
  v_score DECIMAL;
BEGIN
  -- 응답/피드백 횟수
  SELECT COUNT(*) INTO v_responses
  FROM events
  WHERE entity_id = p_student_id
    AND event_type IN ('feedback', 'response', 'interaction')
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- 발송된 알림 수
  SELECT COUNT(*) INTO v_notifications
  FROM events
  WHERE entity_id = p_student_id
    AND event_type = 'notification_sent'
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- 참여도 (응답률)
  IF v_notifications = 0 THEN
    v_score := 50; -- 알림이 없으면 중간값
  ELSE
    v_score := LEAST((v_responses::DECIMAL / v_notifications) * 100, 100);
  END IF;
  
  RETURN ROUND(v_score, 1);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 충성도 계산 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_loyalty_score(
  p_student_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_enrollment_days INTEGER;
  v_score DECIMAL;
BEGIN
  -- 등록 기간 (일)
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_enrollment_days
  FROM students
  WHERE id = p_student_id;
  
  IF v_enrollment_days IS NULL THEN
    -- students 테이블에 없으면 entities에서
    SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_enrollment_days
    FROM entities
    WHERE id = p_student_id;
  END IF;
  
  -- 충성도 (1년 기준, 최대 100)
  v_score := LEAST((COALESCE(v_enrollment_days, 0)::DECIMAL / 365) * 100, 100);
  
  RETURN ROUND(v_score, 1);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- V-Index 종합 계산 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_v_index(
  p_student_id UUID,
  p_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS TABLE (
  v_index DECIMAL,
  risk_level VARCHAR,
  attendance_rate DECIMAL,
  payment_rate DECIMAL,
  engagement_score DECIMAL,
  loyalty_score DECIMAL
) AS $$
DECLARE
  v_weights RECORD;
  v_attendance DECIMAL;
  v_payment DECIMAL;
  v_engagement DECIMAL;
  v_loyalty DECIMAL;
  v_index DECIMAL;
  v_risk VARCHAR;
BEGIN
  -- 가중치 조회
  SELECT * INTO v_weights
  FROM v_index_weights
  WHERE org_id = p_org_id;
  
  -- 기본값 설정
  IF v_weights IS NULL THEN
    v_weights.trust_weight := 0.25;
    v_weights.satisfaction_weight := 0.30;
    v_weights.engagement_weight := 0.25;
    v_weights.loyalty_weight := 0.20;
    v_weights.high_risk_threshold := 40;
    v_weights.medium_risk_threshold := 60;
    v_weights.low_risk_threshold := 80;
  END IF;
  
  -- 각 지표 계산
  v_attendance := calculate_attendance_rate(p_student_id);
  v_payment := calculate_payment_rate(p_student_id);
  v_engagement := calculate_engagement_score(p_student_id);
  v_loyalty := calculate_loyalty_score(p_student_id);
  
  -- V-Index 산출
  v_index := 
    v_attendance * v_weights.satisfaction_weight +
    v_payment * v_weights.trust_weight +
    v_engagement * v_weights.engagement_weight +
    v_loyalty * v_weights.loyalty_weight;
  
  -- 위험 레벨 판정
  IF v_index < v_weights.high_risk_threshold THEN
    v_risk := 'high';
  ELSIF v_index < v_weights.medium_risk_threshold THEN
    v_risk := 'medium';
  ELSIF v_index < v_weights.low_risk_threshold THEN
    v_risk := 'low';
  ELSE
    v_risk := 'safe';
  END IF;
  
  RETURN QUERY SELECT 
    ROUND(v_index, 1),
    v_risk,
    v_attendance,
    v_payment,
    v_engagement,
    v_loyalty;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 전체 학생 V-Index 업데이트 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_all_v_indexes(
  p_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS TABLE (
  updated_count INTEGER,
  high_risk_count INTEGER,
  medium_risk_count INTEGER,
  low_risk_count INTEGER,
  safe_count INTEGER,
  avg_v_index DECIMAL
) AS $$
DECLARE
  v_student RECORD;
  v_result RECORD;
  v_updated INTEGER := 0;
  v_high INTEGER := 0;
  v_medium INTEGER := 0;
  v_low INTEGER := 0;
  v_safe INTEGER := 0;
  v_sum DECIMAL := 0;
BEGIN
  FOR v_student IN 
    SELECT id FROM students WHERE status = 'active'
  LOOP
    -- V-Index 계산
    SELECT * INTO v_result FROM calculate_v_index(v_student.id, p_org_id);
    
    -- students 테이블 업데이트
    UPDATE students
    SET 
      v_index = v_result.v_index,
      risk_level = v_result.risk_level,
      updated_at = NOW()
    WHERE id = v_student.id;
    
    -- entities 테이블도 업데이트
    UPDATE entities
    SET 
      v_index = v_result.v_index,
      tier = CASE 
        WHEN v_result.risk_level = 'safe' THEN 'T3'
        WHEN v_result.risk_level = 'low' THEN 'T4'
        ELSE 'Ghost'
      END,
      updated_at = NOW()
    WHERE id = v_student.id;
    
    -- 카운터 업데이트
    v_updated := v_updated + 1;
    v_sum := v_sum + v_result.v_index;
    
    CASE v_result.risk_level
      WHEN 'high' THEN v_high := v_high + 1;
      WHEN 'medium' THEN v_medium := v_medium + 1;
      WHEN 'low' THEN v_low := v_low + 1;
      ELSE v_safe := v_safe + 1;
    END CASE;
  END LOOP;
  
  RETURN QUERY SELECT 
    v_updated,
    v_high,
    v_medium,
    v_low,
    v_safe,
    CASE WHEN v_updated > 0 THEN ROUND(v_sum / v_updated, 1) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 대시보드 요약 조회 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_total_students INTEGER;
  v_avg_v_index DECIMAL;
  v_attendance_rate DECIMAL;
  v_payment_rate DECIMAL;
  v_high_risk INTEGER;
  v_urgent_alerts JSON;
  v_today_attendance INTEGER;
  v_today_lessons INTEGER;
BEGIN
  -- 총 학생 수
  SELECT COUNT(*) INTO v_total_students
  FROM students
  WHERE status = 'active';
  
  -- 평균 V-Index
  SELECT COALESCE(AVG(v_index), 0) INTO v_avg_v_index
  FROM students
  WHERE status = 'active';
  
  -- 고위험 학생 수
  SELECT COUNT(*) INTO v_high_risk
  FROM students
  WHERE status = 'active' AND risk_level = 'high';
  
  -- 오늘 출석률
  SELECT 
    COUNT(*) FILTER (WHERE e.status = 'completed'),
    COUNT(*)
  INTO v_today_attendance, v_today_lessons
  FROM events e
  WHERE e.event_type = 'attendance'
    AND DATE(e.event_at) = CURRENT_DATE;
  
  v_attendance_rate := CASE 
    WHEN v_today_lessons > 0 THEN (v_today_attendance::DECIMAL / v_today_lessons) * 100
    ELSE 0 
  END;
  
  -- 이번 달 결제율
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      100
    ) INTO v_payment_rate
  FROM events
  WHERE event_type = 'payment'
    AND DATE_TRUNC('month', event_at) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- 긴급 알림 (고위험 학생 목록)
  SELECT COALESCE(json_agg(json_build_object(
    'id', s.id,
    'student_id', s.id,
    'name', s.name,
    'v_index', s.v_index,
    'risk_level', s.risk_level,
    'message', s.name || ' 학생의 이탈 위험이 높습니다.',
    'type', 'risk'
  )), '[]'::json) INTO v_urgent_alerts
  FROM students s
  WHERE s.status = 'active' 
    AND s.risk_level = 'high'
  LIMIT 5;
  
  -- 결과 조합
  v_result := json_build_object(
    'total_students', v_total_students,
    'v_index', ROUND(v_avg_v_index, 1),
    'v_change', -2.3, -- TODO: 이전 기간 대비 변화 계산
    'attendance_rate', ROUND(v_attendance_rate, 1),
    'payment_rate', ROUND(v_payment_rate, 1),
    'high_risk_count', v_high_risk,
    'overdue_count', v_high_risk, -- 미납 = 고위험으로 대체
    'urgent_alerts', v_urgent_alerts,
    'today_attendance', v_today_attendance,
    'today_lessons', v_today_lessons
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 위험 학생 목록 조회 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_at_risk_students(
  p_risk_level VARCHAR DEFAULT 'all',
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', s.id,
    'name', s.name,
    'phone', s.phone,
    'parent_phone', s.parent_phone,
    'v_index', s.v_index,
    'risk_level', s.risk_level,
    'grade', s.grade,
    'school', s.school,
    'created_at', s.created_at
  ) ORDER BY s.v_index ASC), '[]'::json) INTO v_result
  FROM students s
  WHERE s.status = 'active'
    AND (p_risk_level = 'all' OR s.risk_level = p_risk_level)
  LIMIT p_limit;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 학생 상세 정보 조회 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_student_detail(
  p_student_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_student RECORD;
  v_index RECORD;
  v_recent_attendance JSON;
  v_recent_payments JSON;
BEGIN
  -- 학생 기본 정보
  SELECT * INTO v_student
  FROM students
  WHERE id = p_student_id;
  
  IF v_student IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- V-Index 상세
  SELECT * INTO v_index
  FROM calculate_v_index(p_student_id);
  
  -- 최근 출석 기록
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id,
    'date', DATE(e.event_at),
    'status', e.status,
    'time', TO_CHAR(e.event_at, 'HH24:MI')
  ) ORDER BY e.event_at DESC), '[]'::json) INTO v_recent_attendance
  FROM events e
  WHERE e.entity_id = p_student_id
    AND e.event_type = 'attendance'
  LIMIT 10;
  
  -- 최근 결제 기록
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id,
    'date', DATE(e.event_at),
    'amount', e.value,
    'status', e.status
  ) ORDER BY e.event_at DESC), '[]'::json) INTO v_recent_payments
  FROM events e
  WHERE e.entity_id = p_student_id
    AND e.event_type = 'payment'
  LIMIT 10;
  
  -- 결과 조합
  v_result := json_build_object(
    'id', v_student.id,
    'name', v_student.name,
    'phone', v_student.phone,
    'parent_name', v_student.parent_name,
    'parent_phone', v_student.parent_phone,
    'school', v_student.school,
    'grade', v_student.grade,
    'status', v_student.status,
    'created_at', v_student.created_at,
    'v_index', v_index.v_index,
    'risk_level', v_index.risk_level,
    'attendance_rate', v_index.attendance_rate,
    'payment_rate', v_index.payment_rate,
    'engagement_score', v_index.engagement_score,
    'loyalty_score', v_index.loyalty_score,
    'recent_attendance', v_recent_attendance,
    'recent_payments', v_recent_payments
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 코멘트
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION calculate_v_index IS 'V-Index 종합 계산 (TSEL 가중치 기반)';
COMMENT ON FUNCTION get_dashboard_summary IS '대시보드 요약 데이터 조회';
COMMENT ON FUNCTION get_at_risk_students IS '위험 학생 목록 조회';
COMMENT ON FUNCTION get_student_detail IS '학생 상세 정보 조회 (V-Index 포함)';
