-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 기록선생 (Record Teacher) — 온리쌤의 핵심 정체성
-- 출결선생(Presence Truth) 연동 → 수업 결과 로그 누적 → 클론의 데이터 레이어
-- "로그를 모아서 클론을 만든다"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUM 정의
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE log_type AS ENUM (
    'movement',      -- 움직임 (유튜브 비공개 링크)
    'observation',   -- 관찰 (노션 피드백)
    'frequency',     -- 빈도 (출결선생 출석)
    'persistence',   -- 지속 (결제선생 수납)
    'pattern'        -- 패턴 (상담선생 스케줄)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 수업 기록 테이블 (클론의 원재료)
-- student_id는 org_id를 초월하는 독립 엔티티
-- 여러 학원에서 한 학생에게 로그가 수렴한다
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lesson_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 학생 (org를 초월하는 독립 엔티티)
  student_id UUID NOT NULL,

  -- 로그 출처 학원
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

  -- 수업 정보
  lesson_date DATE NOT NULL,
  log_type log_type NOT NULL DEFAULT 'observation',

  -- 미디어 링크 (비공개 URL 누적 → 포트폴리오)
  youtube_url TEXT,                   -- 유튜브 비공개 링크 (움직임 로그)
  notion_url TEXT,                    -- 노션 페이지 링크 (관찰 로그)

  -- 코치 피드백
  coach_feedback TEXT,                -- 한줄 피드백
  performance_score INTEGER CHECK (performance_score BETWEEN 0 AND 100),

  -- 확장 메타데이터
  metadata JSONB DEFAULT '{}',
  -- {skill_tags: ["드리블", "슈팅"], duration_minutes: 90, ...}

  -- 출석 연결 (출결선생 연동)
  attendance_event_id UUID,           -- events 테이블 FK (출석 이벤트)

  -- 중복 방지
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  -- 형식: RECORD-{org_id}-{student_id}-{YYYYMMDD}-{seq}

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lesson_records IS '기록선생: 학생별 수업 결과 로그 누적 — 클론의 원재료';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 인덱스
-- ═══════════════════════════════════════════════════════════════════════════════

-- 포트폴리오 조회 (학생별 최신순)
CREATE INDEX IF NOT EXISTS idx_lesson_records_student_date
  ON lesson_records(student_id, lesson_date DESC);

-- 학원별 조회
CREATE INDEX IF NOT EXISTS idx_lesson_records_org_date
  ON lesson_records(org_id, lesson_date DESC);

-- 크로스 org 포트폴리오 (student_id만으로 조회)
CREATE INDEX IF NOT EXISTS idx_lesson_records_student_only
  ON lesson_records(student_id);

-- 로그 타입별 조회
CREATE INDEX IF NOT EXISTS idx_lesson_records_log_type
  ON lesson_records(log_type, lesson_date DESC);

-- 미디어 있는 기록만 조회
CREATE INDEX IF NOT EXISTS idx_lesson_records_has_youtube
  ON lesson_records(student_id, lesson_date DESC)
  WHERE youtube_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_records_has_notion
  ON lesson_records(student_id, lesson_date DESC)
  WHERE notion_url IS NOT NULL;

-- 출석 이벤트 연결
CREATE INDEX IF NOT EXISTS idx_lesson_records_attendance
  ON lesson_records(attendance_event_id)
  WHERE attendance_event_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- updated_at 자동 갱신 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_lesson_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_records_updated_at
  BEFORE UPDATE ON lesson_records
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_records_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE lesson_records ENABLE ROW LEVEL SECURITY;

-- 관리자: 전체 접근
CREATE POLICY "Admins can manage lesson records"
  ON lesson_records FOR ALL
  USING (true);

-- 시스템: INSERT/UPDATE (Edge Function 용)
CREATE POLICY "System can insert lesson records"
  ON lesson_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update lesson records"
  ON lesson_records FOR UPDATE
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 학생 포트폴리오 통계 (크로스 org)
-- 학생이 커널, 학원이 모듈 — org 초월 집계
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW student_portfolio_stats AS
SELECT
  student_id,
  COUNT(*) AS total_records,
  COUNT(DISTINCT org_id) AS academy_count,
  MIN(lesson_date) AS first_record,
  MAX(lesson_date) AS last_record,
  (MAX(lesson_date) - MIN(lesson_date)) AS record_span_days,

  -- 로그 타입별 카운트
  COUNT(*) FILTER (WHERE log_type = 'movement') AS movement_count,
  COUNT(*) FILTER (WHERE log_type = 'observation') AS observation_count,
  COUNT(*) FILTER (WHERE log_type = 'frequency') AS frequency_count,
  COUNT(*) FILTER (WHERE log_type = 'persistence') AS persistence_count,
  COUNT(*) FILTER (WHERE log_type = 'pattern') AS pattern_count,

  -- 미디어 카운트
  COUNT(*) FILTER (WHERE youtube_url IS NOT NULL) AS youtube_count,
  COUNT(*) FILTER (WHERE notion_url IS NOT NULL) AS notion_count,

  -- 평균 퍼포먼스
  ROUND(AVG(performance_score), 1) AS avg_performance,

  -- 클론 준비도 (5대 로그가 모두 있는지)
  CASE
    WHEN COUNT(*) FILTER (WHERE log_type = 'movement') > 0
     AND COUNT(*) FILTER (WHERE log_type = 'observation') > 0
     AND COUNT(*) FILTER (WHERE log_type = 'frequency') > 0
     AND COUNT(*) FILTER (WHERE log_type = 'persistence') > 0
     AND COUNT(*) FILTER (WHERE log_type = 'pattern') > 0
    THEN true
    ELSE false
  END AS clone_ready,

  -- 클론 준비도 점수 (0~5, 각 로그 타입 존재 시 +1)
  (CASE WHEN COUNT(*) FILTER (WHERE log_type = 'movement') > 0 THEN 1 ELSE 0 END +
   CASE WHEN COUNT(*) FILTER (WHERE log_type = 'observation') > 0 THEN 1 ELSE 0 END +
   CASE WHEN COUNT(*) FILTER (WHERE log_type = 'frequency') > 0 THEN 1 ELSE 0 END +
   CASE WHEN COUNT(*) FILTER (WHERE log_type = 'persistence') > 0 THEN 1 ELSE 0 END +
   CASE WHEN COUNT(*) FILTER (WHERE log_type = 'pattern') > 0 THEN 1 ELSE 0 END
  ) AS clone_readiness_score

FROM lesson_records
GROUP BY student_id;

COMMENT ON VIEW student_portfolio_stats IS '학생 포트폴리오 통계 — 크로스 org, 클론 준비도 포함';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: 최근 7일 기록
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW recent_lesson_records AS
SELECT
  lr.*,
  CASE
    WHEN lr.log_type = 'movement' THEN '움직임'
    WHEN lr.log_type = 'observation' THEN '관찰'
    WHEN lr.log_type = 'frequency' THEN '빈도'
    WHEN lr.log_type = 'persistence' THEN '지속'
    WHEN lr.log_type = 'pattern' THEN '패턴'
  END AS log_type_label
FROM lesson_records lr
WHERE lr.lesson_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY lr.lesson_date DESC, lr.created_at DESC;

COMMENT ON VIEW recent_lesson_records IS '최근 7일 수업 기록';
