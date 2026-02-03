-- ============================================
-- 🏀 올댓바스켓 업무(Tasks) 테이블
-- 프로세스 맵에서 생성된 업무 관리
-- ============================================

-- 업무 테이블
CREATE TABLE IF NOT EXISTS atb_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- 담당 정보
  assignee TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'coach', 'parent')),

  -- 프로세스 연결
  process_id TEXT,
  process_name TEXT,

  -- 일정
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- 메타
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_atb_tasks_status ON atb_tasks(status);
CREATE INDEX IF NOT EXISTS idx_atb_tasks_priority ON atb_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_atb_tasks_role ON atb_tasks(role);
CREATE INDEX IF NOT EXISTS idx_atb_tasks_due_date ON atb_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_atb_tasks_process_id ON atb_tasks(process_id);

-- RLS 활성화
ALTER TABLE atb_tasks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능 (데모용)
CREATE POLICY "Allow all access to atb_tasks" ON atb_tasks
  FOR ALL USING (true) WITH CHECK (true);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_atb_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atb_tasks_updated_at
  BEFORE UPDATE ON atb_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_atb_tasks_updated_at();

-- 완료 시간 자동 기록
CREATE OR REPLACE FUNCTION set_atb_tasks_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atb_tasks_completed_at
  BEFORE UPDATE ON atb_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_atb_tasks_completed_at();

-- 샘플 데이터
INSERT INTO atb_tasks (title, description, priority, status, assignee, role, process_id, process_name, due_date) VALUES
('이번 달 학생 현황 분석', '정상/경고/위험 학생 비율 확인 및 대응 전략 수립', 'high', 'pending', '원장님', 'owner', 'student-status', '학생현황', CURRENT_DATE + INTERVAL '3 days'),
('네이버 예약 시스템 연동 완료', '예약 자동화 테스트 및 검증', 'medium', 'in_progress', '관리자', 'admin', 'system-connect', '시스템 연결', CURRENT_DATE + INTERVAL '7 days'),
('주간 출석 현황 리포트', '이번 주 출석률 및 이슈 사항 정리', 'medium', 'pending', '코치', 'coach', 'attendance', '출석 체크', CURRENT_DATE + INTERVAL '2 days');
