-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏷️ 카테고리 계층 구조 (AUTUS Universal Category System)
-- 
-- 목적: 무한 확장 가능한 산업 분류 체계
-- 구조: L0(대분류) → L1 → L2 → L3 → L4(세부)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. 카테고리 테이블
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,              -- 'EDU.SPORTS.BASKETBALL'
  name VARCHAR(200) NOT NULL,                     -- '농구 스포츠 교육 서비스'
  name_en VARCHAR(200),                           -- 'Basketball Sports Education'
  
  -- 계층 구조
  level INTEGER NOT NULL DEFAULT 0,               -- 0=대분류, 1, 2, 3, 4
  parent_id UUID REFERENCES categories(id),
  path VARCHAR(500),                              -- '/서비스/교육서비스/스포츠교육서비스/농구'
  path_ids UUID[],                                -- 상위 카테고리 ID 배열
  
  -- 메타데이터
  icon VARCHAR(50),                               -- 'basketball', 'education'
  color VARCHAR(20),                              -- '#FF6B00'
  description TEXT,
  
  -- AUTUS 확장
  default_entity_types TEXT[] DEFAULT '{}',       -- ['student', 'coach', 'parent']
  default_event_types TEXT[] DEFAULT '{}',        -- ['attendance', 'payment', 'consultation']
  tsel_weights JSONB DEFAULT '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}',
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_path ON categories(path);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. Organizations 테이블 업데이트
-- ════════════════════════════════════════════════════════════════════════════════

-- 카테고리 참조 추가
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS category_path VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_organizations_category ON organizations(category_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. 기본 카테고리 데이터 삽입
-- ════════════════════════════════════════════════════════════════════════════════

-- L0: 대분류
INSERT INTO categories (code, name, name_en, level, path, icon, description) VALUES
('SERVICE', '서비스', 'Service', 0, '/서비스', 'briefcase', '모든 서비스 산업')
ON CONFLICT (code) DO NOTHING;

-- L1: 중분류
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, description, default_entity_types) VALUES
('SERVICE.EDU', '교육서비스', 'Education Service', 1, 
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/교육서비스', 'school', '교육 관련 서비스',
  ARRAY['student', 'teacher', 'parent']),
('SERVICE.HEALTH', '헬스케어서비스', 'Healthcare Service', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/헬스케어서비스', 'heart', '건강/의료 관련 서비스',
  ARRAY['patient', 'doctor', 'caregiver']),
('SERVICE.RETAIL', '리테일서비스', 'Retail Service', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/리테일서비스', 'cart', '소매/판매 서비스',
  ARRAY['customer', 'staff']),
('SERVICE.FNB', 'F&B서비스', 'F&B Service', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/F&B서비스', 'restaurant', '식음료 서비스',
  ARRAY['customer', 'staff', 'chef'])
ON CONFLICT (code) DO NOTHING;

-- L2: 소분류 (교육서비스 하위)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, description, default_entity_types) VALUES
('SERVICE.EDU.SPORTS', '스포츠교육서비스', 'Sports Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/스포츠교육서비스', 'fitness', '스포츠 교육 서비스',
  ARRAY['student', 'coach', 'parent']),
('SERVICE.EDU.MUSIC', '음악교육서비스', 'Music Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/음악교육서비스', 'musical-notes', '음악 교육 서비스',
  ARRAY['student', 'instructor', 'parent']),
('SERVICE.EDU.LANGUAGE', '어학교육서비스', 'Language Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/어학교육서비스', 'language', '어학/언어 교육 서비스',
  ARRAY['student', 'teacher', 'parent']),
('SERVICE.EDU.ACADEMIC', '입시교육서비스', 'Academic Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/입시교육서비스', 'book', '입시/학원 교육 서비스',
  ARRAY['student', 'teacher', 'parent']),
('SERVICE.EDU.ART', '예술교육서비스', 'Art Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/예술교육서비스', 'color-palette', '미술/예술 교육 서비스',
  ARRAY['student', 'instructor', 'parent']),
('SERVICE.EDU.CODING', '코딩교육서비스', 'Coding Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/코딩교육서비스', 'code', '코딩/IT 교육 서비스',
  ARRAY['student', 'instructor', 'parent'])
ON CONFLICT (code) DO NOTHING;

-- L3: 세부분류 (스포츠교육 하위)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, color, description, default_entity_types, default_event_types, tsel_weights) VALUES
('SERVICE.EDU.SPORTS.BASKETBALL', '농구교육서비스', 'Basketball Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/농구교육서비스', 
  'basketball', '#FF6B00', '농구 아카데미/클럽 서비스',
  ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'skill_assessment', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.SOCCER', '축구교육서비스', 'Soccer Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/축구교육서비스',
  'football', '#00AA55', '축구 아카데미/클럽 서비스',
  ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'skill_assessment', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.SWIMMING', '수영교육서비스', 'Swimming Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/수영교육서비스',
  'water', '#0088CC', '수영 아카데미/클럽 서비스',
  ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'level_test'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.TENNIS', '테니스교육서비스', 'Tennis Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/테니스교육서비스',
  'tennisball', '#AADD00', '테니스 아카데미/클럽 서비스',
  ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.GOLF', '골프교육서비스', 'Golf Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/골프교육서비스',
  'golf', '#228B22', '골프 아카데미/레슨 서비스',
  ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'round'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.TAEKWONDO', '태권도교육서비스', 'Taekwondo Education', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/태권도교육서비스',
  'fitness', '#FF0000', '태권도 도장 서비스',
  ARRAY['student', 'master', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'belt_test'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.FITNESS', '피트니스서비스', 'Fitness Service', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육서비스/피트니스서비스',
  'barbell', '#FF4500', '헬스장/PT 서비스',
  ARRAY['member', 'trainer'],
  ARRAY['attendance', 'payment', 'pt_session', 'inbody'],
  '{"T":0.20,"S":0.35,"E":0.25,"L":0.20}')
ON CONFLICT (code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. 온리쌤 조직에 카테고리 연결
-- ════════════════════════════════════════════════════════════════════════════════

UPDATE organizations 
SET 
  category_id = (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS.BASKETBALL'),
  category_path = '/서비스/교육서비스/스포츠교육서비스/농구교육서비스'
WHERE industry = 'basketball';

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. 카테고리 조회 함수
-- ════════════════════════════════════════════════════════════════════════════════

-- 하위 카테고리 조회
CREATE OR REPLACE FUNCTION get_subcategories(p_parent_code VARCHAR)
RETURNS TABLE (
  id UUID,
  code VARCHAR,
  name VARCHAR,
  level INTEGER,
  path VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.code, c.name, c.level, c.path
  FROM categories c
  WHERE c.parent_id = (SELECT cat.id FROM categories cat WHERE cat.code = p_parent_code)
  AND c.is_active = true
  ORDER BY c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql;

-- 카테고리 경로 조회
CREATE OR REPLACE FUNCTION get_category_path(p_code VARCHAR)
RETURNS TABLE (
  level INTEGER,
  code VARCHAR,
  name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    SELECT c.id, c.code, c.name, c.level, c.parent_id
    FROM categories c
    WHERE c.code = p_code
    
    UNION ALL
    
    SELECT p.id, p.code, p.name, p.level, p.parent_id
    FROM categories p
    JOIN category_tree ct ON p.id = ct.parent_id
  )
  SELECT ct.level, ct.code, ct.name
  FROM category_tree ct
  ORDER BY ct.level;
END;
$$ LANGUAGE plpgsql;

-- 카테고리별 조직 수 조회
CREATE OR REPLACE FUNCTION get_category_stats(p_level INTEGER DEFAULT NULL)
RETURNS TABLE (
  code VARCHAR,
  name VARCHAR,
  level INTEGER,
  org_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.code, c.name, c.level, COUNT(o.id)::BIGINT as org_count
  FROM categories c
  LEFT JOIN organizations o ON o.category_id = c.id
  WHERE (p_level IS NULL OR c.level = p_level)
  AND c.is_active = true
  GROUP BY c.code, c.name, c.level
  ORDER BY c.level, c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. 카테고리 변경 트리거 (path 자동 업데이트)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_path VARCHAR;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT path INTO v_parent_path FROM categories WHERE id = NEW.parent_id;
    NEW.path := v_parent_path || '/' || NEW.name;
  ELSE
    NEW.path := '/' || NEW.name;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_path
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  WHEN (NEW.path IS NULL OR NEW.parent_id IS DISTINCT FROM OLD.parent_id)
  EXECUTE FUNCTION update_category_path();

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. 뷰: 카테고리 계층 전체
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_category_tree AS
WITH RECURSIVE tree AS (
  SELECT 
    id, code, name, name_en, level, parent_id, path,
    ARRAY[id] as path_ids,
    name as full_name
  FROM categories
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT 
    c.id, c.code, c.name, c.name_en, c.level, c.parent_id, c.path,
    t.path_ids || c.id,
    t.full_name || ' > ' || c.name
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree
ORDER BY path;

-- ════════════════════════════════════════════════════════════════════════════════
-- 완료
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE categories IS 'AUTUS 범용 카테고리 시스템 - 무한 확장 가능한 산업 분류';
