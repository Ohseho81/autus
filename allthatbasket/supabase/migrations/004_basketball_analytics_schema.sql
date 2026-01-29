-- ============================================
-- 올댓바스켓 아카데미 농구 분석/게이미피케이션 스키마
-- Supabase Migration 004
--
-- 🏀 농구 특화 기능:
-- - 스킬 트래킹 & 성장 분석
-- - 포인트/배지 시스템
-- - 리더보드 & 랭킹
-- ============================================

-- ────────────────────────────────────────────
-- Enum Types
-- ────────────────────────────────────────────
CREATE TYPE skill_category AS ENUM (
  'dribble',      -- 드리블
  'shooting',     -- 슈팅
  'passing',      -- 패스
  'defense',      -- 수비
  'rebounding',   -- 리바운드
  'teamwork',     -- 팀워크
  'stamina',      -- 체력
  'speed'         -- 스피드
);

CREATE TYPE badge_category AS ENUM (
  'attendance',   -- 출석
  'skill',        -- 기술
  'achievement',  -- 달성
  'special'       -- 특별
);

-- ────────────────────────────────────────────
-- 스킬 평가 기록
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attendance_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,

  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 스킬 점수 (1-10)
  dribble_score DECIMAL(3,1),
  shooting_score DECIMAL(3,1),
  passing_score DECIMAL(3,1),
  defense_score DECIMAL(3,1),
  rebounding_score DECIMAL(3,1),
  teamwork_score DECIMAL(3,1),
  stamina_score DECIMAL(3,1),
  speed_score DECIMAL(3,1),

  -- 종합 점수 (자동 계산)
  overall_score DECIMAL(3,1),

  -- 코멘트
  coach_comment TEXT,
  strength_points TEXT[],           -- 강점
  improvement_points TEXT[],        -- 개선점

  -- 멀티미디어
  video_url TEXT,
  video_thumbnail TEXT,
  photos TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 스킬 히스토리 (트렌드 분석용)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  skill_category skill_category NOT NULL,
  score DECIMAL(3,1) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, skill_category, recorded_at)
);

-- ────────────────────────────────────────────
-- 배지 정의
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                    -- 'ATTENDANCE_10', 'SHOOTER_MASTER'
  name TEXT NOT NULL,                           -- '출석왕'
  name_en TEXT,                                 -- 'Attendance King'
  description TEXT,

  category badge_category NOT NULL,
  icon_url TEXT,
  color TEXT DEFAULT '#FFD700',                 -- 골드 기본

  -- 획득 조건
  requirement_type TEXT NOT NULL,               -- 'attendance_count' | 'skill_score' | 'streak' | 'manual'
  requirement_value INT,                        -- 조건 값 (예: 출석 10회)
  requirement_skill skill_category,             -- 스킬 관련 배지일 때

  -- 포인트 보상
  points_reward INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 학생 획득 배지
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,

  earned_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by UUID REFERENCES users(id),         -- 수동 지급 시

  UNIQUE(student_id, badge_id)
);

-- ────────────────────────────────────────────
-- 포인트 시스템
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- 현재 포인트
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,               -- 사용 가능 포인트
  spent_points INT DEFAULT 0,                   -- 사용한 포인트

  -- 레벨 시스템
  level INT DEFAULT 1,
  exp_to_next_level INT DEFAULT 100,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id)
);

-- ────────────────────────────────────────────
-- 포인트 거래 내역
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  transaction_type TEXT NOT NULL,               -- 'earn' | 'spend' | 'bonus' | 'penalty'
  amount INT NOT NULL,
  balance_after INT NOT NULL,

  -- 출처/사유
  source_type TEXT,                             -- 'attendance' | 'badge' | 'skill' | 'reward' | 'purchase'
  source_id UUID,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 리더보드 캐시 (주간/월간)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  period_type TEXT NOT NULL,                    -- 'weekly' | 'monthly' | 'all_time'
  period_start DATE NOT NULL,
  category TEXT NOT NULL,                       -- 'points' | 'attendance' | 'skill_improvement'

  rankings JSONB NOT NULL,                      -- [{student_id, rank, value, name, ...}]

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(branch_id, period_type, period_start, category)
);

-- ────────────────────────────────────────────
-- 챌린지/미션
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                           -- '주간 3점슛 챌린지'
  description TEXT,
  challenge_type TEXT NOT NULL,                 -- 'skill' | 'attendance' | 'social'

  -- 기간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 목표
  target_type TEXT NOT NULL,                    -- 'count' | 'score' | 'streak'
  target_value INT NOT NULL,
  target_skill skill_category,

  -- 보상
  points_reward INT DEFAULT 0,
  badge_reward_id UUID REFERENCES badge_definitions(id),

  max_participants INT,
  current_participants INT DEFAULT 0,

  status TEXT DEFAULT 'upcoming',               -- 'upcoming' | 'active' | 'completed' | 'cancelled'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 챌린지 참가
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  UNIQUE(challenge_id, student_id)
);

-- ────────────────────────────────────────────
-- 인덱스
-- ────────────────────────────────────────────
CREATE INDEX idx_skill_assessments_student ON skill_assessments(student_id);
CREATE INDEX idx_skill_assessments_date ON skill_assessments(assessment_date);
CREATE INDEX idx_skill_history_student ON skill_history(student_id);
CREATE INDEX idx_skill_history_category ON skill_history(skill_category);
CREATE INDEX idx_student_badges_student ON student_badges(student_id);
CREATE INDEX idx_point_transactions_student ON point_transactions(student_id);
CREATE INDEX idx_point_transactions_date ON point_transactions(created_at);
CREATE INDEX idx_challenges_branch ON challenges(branch_id);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- ────────────────────────────────────────────
-- 스킬 평가 종합 점수 자동 계산
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_overall_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_score := ROUND((
    COALESCE(NEW.dribble_score, 0) +
    COALESCE(NEW.shooting_score, 0) +
    COALESCE(NEW.passing_score, 0) +
    COALESCE(NEW.defense_score, 0) +
    COALESCE(NEW.rebounding_score, 0) +
    COALESCE(NEW.teamwork_score, 0) +
    COALESCE(NEW.stamina_score, 0) +
    COALESCE(NEW.speed_score, 0)
  ) / 8.0, 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_overall_score
BEFORE INSERT OR UPDATE ON skill_assessments
FOR EACH ROW
EXECUTE FUNCTION calculate_overall_score();

-- ────────────────────────────────────────────
-- 스킬 평가 후 히스토리 자동 기록
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_skill_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 각 스킬 카테고리별로 히스토리 저장
  IF NEW.dribble_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'dribble', NEW.dribble_score);
  END IF;

  IF NEW.shooting_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'shooting', NEW.shooting_score);
  END IF;

  IF NEW.passing_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'passing', NEW.passing_score);
  END IF;

  IF NEW.defense_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'defense', NEW.defense_score);
  END IF;

  IF NEW.rebounding_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'rebounding', NEW.rebounding_score);
  END IF;

  IF NEW.teamwork_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'teamwork', NEW.teamwork_score);
  END IF;

  IF NEW.stamina_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'stamina', NEW.stamina_score);
  END IF;

  IF NEW.speed_score IS NOT NULL THEN
    INSERT INTO skill_history (student_id, skill_category, score)
    VALUES (NEW.student_id, 'speed', NEW.speed_score);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_skill_history
AFTER INSERT ON skill_assessments
FOR EACH ROW
EXECUTE FUNCTION record_skill_history();

-- ────────────────────────────────────────────
-- 출석 시 포인트 자동 지급
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_attendance_points()
RETURNS TRIGGER AS $$
DECLARE
  v_base_points INT := 10;                      -- 기본 출석 포인트
  v_streak_bonus INT := 0;
  v_current_streak INT;
  v_new_balance INT;
BEGIN
  -- 연속 출석 계산
  SELECT COUNT(*) INTO v_current_streak
  FROM attendance_records
  WHERE student_id = NEW.student_id
    AND check_in_time >= CURRENT_DATE - INTERVAL '7 days'
    AND status IN ('present', 'late');

  -- 연속 출석 보너스
  IF v_current_streak >= 5 THEN
    v_streak_bonus := 20;
  ELSIF v_current_streak >= 3 THEN
    v_streak_bonus := 10;
  END IF;

  -- 포인트 계정 생성 또는 업데이트
  INSERT INTO student_points (student_id, total_points, available_points)
  VALUES (NEW.student_id, v_base_points + v_streak_bonus, v_base_points + v_streak_bonus)
  ON CONFLICT (student_id)
  DO UPDATE SET
    total_points = student_points.total_points + v_base_points + v_streak_bonus,
    available_points = student_points.available_points + v_base_points + v_streak_bonus,
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;

  -- 거래 기록
  INSERT INTO point_transactions (
    student_id, transaction_type, amount, balance_after,
    source_type, source_id, description
  )
  VALUES (
    NEW.student_id, 'earn', v_base_points + v_streak_bonus, v_new_balance,
    'attendance', NEW.id,
    CASE
      WHEN v_streak_bonus > 0 THEN '출석 + 연속출석 보너스 (' || v_current_streak || '일)'
      ELSE '출석 포인트'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attendance_points
AFTER INSERT ON attendance_records
FOR EACH ROW
WHEN (NEW.status IN ('present', 'late'))
EXECUTE FUNCTION award_attendance_points();

-- ────────────────────────────────────────────
-- 배지 자동 체크 및 지급
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_badge RECORD;
  v_count INT;
  v_score DECIMAL;
BEGIN
  -- 출석 관련 배지 체크
  FOR v_badge IN
    SELECT * FROM badge_definitions
    WHERE is_active = TRUE
    AND requirement_type = 'attendance_count'
    AND id NOT IN (SELECT badge_id FROM student_badges WHERE student_id = NEW.student_id)
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM attendance_records
    WHERE student_id = NEW.student_id AND status IN ('present', 'late');

    IF v_count >= v_badge.requirement_value THEN
      INSERT INTO student_badges (student_id, badge_id)
      VALUES (NEW.student_id, v_badge.id);

      -- 배지 포인트 보상
      IF v_badge.points_reward > 0 THEN
        UPDATE student_points
        SET
          total_points = total_points + v_badge.points_reward,
          available_points = available_points + v_badge.points_reward,
          updated_at = NOW()
        WHERE student_id = NEW.student_id;

        INSERT INTO point_transactions (
          student_id, transaction_type, amount, balance_after,
          source_type, source_id, description
        )
        VALUES (
          NEW.student_id, 'bonus', v_badge.points_reward,
          (SELECT available_points FROM student_points WHERE student_id = NEW.student_id),
          'badge', v_badge.id,
          '배지 획득: ' || v_badge.name
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_badges_on_attendance
AFTER INSERT ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();

-- ────────────────────────────────────────────
-- 학생 스킬 요약 뷰
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_student_skill_summary AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  s.level,

  -- 최신 스킬 평가
  sa.overall_score AS current_overall,
  sa.dribble_score AS current_dribble,
  sa.shooting_score AS current_shooting,
  sa.passing_score AS current_passing,
  sa.defense_score AS current_defense,
  sa.assessment_date AS last_assessment,

  -- 성장률 (최근 3개월 대비)
  (
    SELECT ROUND(AVG(recent.score) - AVG(older.score), 1)
    FROM skill_history recent
    JOIN skill_history older ON recent.student_id = older.student_id
      AND recent.skill_category = older.skill_category
    WHERE recent.student_id = s.id
      AND recent.recorded_at >= CURRENT_DATE - INTERVAL '1 month'
      AND older.recorded_at BETWEEN CURRENT_DATE - INTERVAL '4 months' AND CURRENT_DATE - INTERVAL '1 month'
  ) AS growth_rate,

  -- 포인트 & 배지
  COALESCE(sp.total_points, 0) AS total_points,
  COALESCE(sp.level, 1) AS point_level,
  (SELECT COUNT(*) FROM student_badges WHERE student_id = s.id) AS badge_count

FROM students s
LEFT JOIN LATERAL (
  SELECT * FROM skill_assessments
  WHERE student_id = s.id
  ORDER BY assessment_date DESC
  LIMIT 1
) sa ON TRUE
LEFT JOIN student_points sp ON s.id = sp.student_id;

-- ────────────────────────────────────────────
-- 지점별 리더보드 업데이트 함수
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_leaderboard(p_branch_id UUID, p_period_type TEXT)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_rankings JSONB;
BEGIN
  -- 기간 계산
  IF p_period_type = 'weekly' THEN
    v_period_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  ELSIF p_period_type = 'monthly' THEN
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  ELSE
    v_period_start := '2000-01-01'::DATE;
  END IF;

  -- 포인트 랭킹 계산
  SELECT jsonb_agg(row_to_json(r))
  INTO v_rankings
  FROM (
    SELECT
      s.id AS student_id,
      s.name,
      COALESCE(sp.total_points, 0) AS value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(sp.total_points, 0) DESC) AS rank
    FROM students s
    LEFT JOIN student_points sp ON s.id = sp.student_id
    WHERE s.branch_id = p_branch_id
    ORDER BY COALESCE(sp.total_points, 0) DESC
    LIMIT 50
  ) r;

  -- 캐시 저장
  INSERT INTO leaderboard_cache (branch_id, period_type, period_start, category, rankings)
  VALUES (p_branch_id, p_period_type, v_period_start, 'points', COALESCE(v_rankings, '[]'::jsonb))
  ON CONFLICT (branch_id, period_type, period_start, category)
  DO UPDATE SET rankings = COALESCE(v_rankings, '[]'::jsonb), updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 기본 배지 데이터
-- ────────────────────────────────────────────
INSERT INTO badge_definitions (code, name, name_en, description, category, requirement_type, requirement_value, points_reward, color) VALUES
  ('ATTENDANCE_10', '첫 발자국', 'First Steps', '10회 출석 달성', 'attendance', 'attendance_count', 10, 50, '#00D4AA'),
  ('ATTENDANCE_30', '꾸준한 농구인', 'Consistent Player', '30회 출석 달성', 'attendance', 'attendance_count', 30, 100, '#00D4AA'),
  ('ATTENDANCE_50', '출석왕', 'Attendance King', '50회 출석 달성', 'attendance', 'attendance_count', 50, 200, '#FFD700'),
  ('ATTENDANCE_100', '레전드', 'Legend', '100회 출석 달성', 'attendance', 'attendance_count', 100, 500, '#FFD700'),
  ('STREAK_7', '7일 연속출석', 'Week Warrior', '7일 연속 출석', 'attendance', 'streak', 7, 100, '#FF6B00'),
  ('STREAK_30', '30일 연속출석', 'Iron Will', '30일 연속 출석', 'attendance', 'streak', 30, 500, '#FF6B00'),
  ('SHOOTER_BASIC', '슈터 입문', 'Shooter Rookie', '슈팅 스킬 5점 이상', 'skill', 'skill_score', 5, 30, '#7C5CFF'),
  ('SHOOTER_MASTER', '슈팅 마스터', 'Shooting Master', '슈팅 스킬 9점 이상', 'skill', 'skill_score', 9, 200, '#7C5CFF'),
  ('DRIBBLE_MASTER', '드리블 마스터', 'Dribble Master', '드리블 스킬 9점 이상', 'skill', 'skill_score', 9, 200, '#7C5CFF'),
  ('ALL_ROUNDER', '올라운더', 'All-Rounder', '모든 스킬 7점 이상', 'achievement', 'manual', 0, 300, '#FF4757'),
  ('MVP', 'MVP', 'MVP', '월간 MVP 선정', 'special', 'manual', 0, 500, '#FFD700')
ON CONFLICT (code) DO NOTHING;
