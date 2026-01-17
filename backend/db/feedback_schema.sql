-- ═══════════════════════════════════════════════════════════════════════════════
--                    AUTUS Feedback Tables
--                    
--    LoRA 학습용 피드백 데이터 저장
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. feedback_logs - AI 제안에 대한 사용자 피드백
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 피드백 대상
    suggestion_id UUID,              -- AI 제안 ID
    task_id UUID,                    -- 관련 업무 ID
    
    -- 피드백 내용
    rating INTEGER CHECK (rating BETWEEN -1 AND 1),  -- -1: 나쁨, 0: 보통, 1: 좋음
    feedback_type TEXT NOT NULL DEFAULT 'rating',    -- rating, comment, correction
    comment TEXT,                    -- 상세 코멘트
    
    -- 컨텍스트 (LoRA 학습용)
    context JSONB DEFAULT '{}'::jsonb,  -- {input, output, expected, model_version}
    
    -- 메타데이터
    user_id UUID,
    session_id TEXT,
    source TEXT DEFAULT 'web',       -- web, api, mobile
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 인덱스용
    is_processed BOOLEAN DEFAULT FALSE  -- LoRA 학습에 사용되었는지
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback_logs(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_logs(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_processed ON feedback_logs(is_processed);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_logs(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ai_suggestions - AI 제안 이력
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 제안 내용
    title TEXT NOT NULL,
    description TEXT,
    suggestion_type TEXT NOT NULL,   -- automation, optimization, merge, delegate
    
    -- 입력 데이터
    input_data JSONB NOT NULL,       -- 제안 생성에 사용된 입력
    
    -- 출력 데이터
    output_data JSONB NOT NULL,      -- 생성된 제안 내용
    confidence REAL,                 -- 0.0 ~ 1.0
    
    -- 적용 상태
    status TEXT DEFAULT 'pending',   -- pending, applied, skipped, expired
    applied_at TIMESTAMPTZ,
    
    -- 효과 측정
    estimated_savings INTEGER,       -- 예상 절약 시간 (분)
    actual_savings INTEGER,          -- 실제 절약 시간 (분)
    
    -- 메타데이터
    user_id UUID,
    model_version TEXT,              -- 사용된 모델 버전
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON ai_suggestions(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. learning_metrics - LoRA 학습 메트릭
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 학습 정보
    training_id TEXT NOT NULL,       -- 학습 세션 ID
    model_version TEXT NOT NULL,
    
    -- 메트릭
    total_samples INTEGER,
    positive_samples INTEGER,
    negative_samples INTEGER,
    
    -- 성능
    accuracy REAL,
    precision_score REAL,
    recall REAL,
    f1_score REAL,
    
    -- 상태
    status TEXT DEFAULT 'running',   -- running, completed, failed
    error_message TEXT,
    
    -- 타임스탬프
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RLS Policies (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 모든 인증된 사용자가 자신의 피드백을 읽고 쓸 수 있음
ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON feedback_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert feedback" ON feedback_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- AI 제안은 읽기 전용 (시스템이 생성)
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suggestions" ON ai_suggestions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- learning_metrics는 관리자만 접근
ALTER TABLE learning_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only for metrics" ON learning_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. 샘플 데이터
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ai_suggestions (title, description, suggestion_type, input_data, output_data, confidence, status)
VALUES
    ('이메일 자동 분류', '수신 이메일을 자동으로 중요도별 분류합니다', 'automation', 
     '{"source": "gmail", "count": 50}'::jsonb, 
     '{"rules": ["sender:ceo -> urgent", "subject:invoice -> finance"]}'::jsonb, 
     0.92, 'applied'),
    ('주간 보고서 병합', '3개의 부서별 보고서를 하나로 통합합니다', 'merge',
     '{"reports": ["sales", "marketing", "ops"]}'::jsonb,
     '{"merged_template": "weekly_consolidated"}'::jsonb,
     0.88, 'pending'),
    ('반복 업무 위임', '데이터 입력 업무를 RPA로 위임합니다', 'delegate',
     '{"task": "data_entry", "frequency": "daily"}'::jsonb,
     '{"delegate_to": "n8n_workflow", "workflow_id": "xyz123"}'::jsonb,
     0.95, 'applied')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. 통계 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW feedback_stats AS
SELECT
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_feedback,
    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS positive,
    SUM(CASE WHEN rating = 0 THEN 1 ELSE 0 END) AS neutral,
    SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS negative,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating
FROM feedback_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW suggestion_stats AS
SELECT
    suggestion_type,
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied,
    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
    ROUND(AVG(confidence)::numeric, 2) AS avg_confidence,
    SUM(COALESCE(actual_savings, 0)) AS total_time_saved
FROM ai_suggestions
GROUP BY suggestion_type;


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done!
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'AUTUS Feedback tables created successfully!' AS status;
