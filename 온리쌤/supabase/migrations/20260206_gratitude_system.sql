-- ═══════════════════════════════════════════════════════════════════════════════
-- 감사 시스템 (온리쌤 스타일) - AUTUS 통합
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. 감사 기록 테이블
CREATE TABLE IF NOT EXISTS gratitude_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 보낸 사람 (학부모)
  sender_name VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(20),
  
  -- 받는 사람 (코치/강사)
  recipient_staff_id UUID REFERENCES auth.users(id),
  recipient_name VARCHAR(100),
  
  -- 관련 학생
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(100),
  
  -- 감사 내용
  emoji VARCHAR(10) DEFAULT '💐',
  message TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  
  -- 메타데이터
  org_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, refunded
  payment_method VARCHAR(50), -- card, transfer, cash
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_gratitude_org ON gratitude_records(org_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_recipient ON gratitude_records(recipient_staff_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_student ON gratitude_records(student_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_created ON gratitude_records(created_at DESC);

-- 3. RLS 정책
ALTER TABLE gratitude_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "감사 기록 조회 - 인증된 사용자" ON gratitude_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "감사 기록 생성 - 모든 사용자" ON gratitude_records
  FOR INSERT WITH CHECK (true);

-- 4. 학생 테이블에 궁합 점수 필드 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS compatibility_score INTEGER DEFAULT 70;
ALTER TABLE students ADD COLUMN IF NOT EXISTS coach_match_note TEXT;

-- 5. 샘플 데이터 (테스트용)
INSERT INTO gratitude_records (
  sender_name, sender_phone, recipient_name, student_id, student_name,
  emoji, message, amount, org_id, status
) VALUES
  ('조하은 학부모님', '010-9000-1574', '김승현 코치', '55555555-5555-5555-5555-555555555555', '김승현', 
   '💐', '항상 잘 봐주셔서 감사합니다', 30000, '00000000-0000-0000-0000-000000000001', 'completed'),
  ('이현범 학부모님', '010-2371-2896', '김승현 코치', '55555555-5555-5555-5555-555555555555', '김승현', 
   '☕', '코치님 수업을 너무 좋아합니다', 5000, '00000000-0000-0000-0000-000000000001', 'completed'),
  ('강민준 학부모님', '010-5307-8111', '김승현 코치', '55555555-5555-5555-5555-555555555555', '김승현', 
   '☕', '실력이 눈에 띄게 늘었어요', 4500, '00000000-0000-0000-0000-000000000001', 'completed')
ON CONFLICT DO NOTHING;

-- 6. 김승현 학생 궁합 점수 업데이트
UPDATE students 
SET compatibility_score = 92, coach_match_note = '코치님의 교수법과 잘 맞습니다'
WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT '감사 시스템 테이블 생성 완료' AS result;
