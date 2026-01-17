# Supabase AUTUS Evolution 스키마 설정 가이드

## Step 1: Supabase 대시보드 접속

```
https://supabase.com/dashboard
```

프로젝트 선택 (또는 새 프로젝트 생성)

---

## Step 2: SQL Editor에서 스키마 실행

### 2.1 SQL Editor 열기

1. 좌측 메뉴에서 **SQL Editor** 클릭
2. **+ New query** 클릭

### 2.2 스키마 복사 & 실행

아래 SQL을 복사하여 붙여넣기:

```sql
-- ============================================
-- AUTUS SELF-EVOLUTION DATABASE SCHEMA
-- ============================================

-- Evolution Logs Table
CREATE TABLE IF NOT EXISTS evolution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  before_score INTEGER NOT NULL,
  after_score INTEGER NOT NULL,
  features_added JSONB,
  lines_added INTEGER,
  deploy_url TEXT,
  status TEXT CHECK (status IN ('success', 'failed', 'pending', 'skipped')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Registry Table
CREATE TABLE IF NOT EXISTS feature_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('stage', 'navigation', 'sidebar', 'other')),
  weight INTEGER DEFAULT 5,
  selector TEXT NOT NULL,
  implemented BOOLEAN DEFAULT FALSE,
  implementation_date TIMESTAMPTZ,
  code_hash TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default features
INSERT INTO feature_registry (id, name, description, category, weight, selector, implemented) VALUES
  ('stage-1-templates', 'Template Marketplace', '247개 템플릿 라이브러리 + 검색/필터', 'stage', 15, '#stage1, .templates-grid', false),
  ('stage-6-collective', 'Collective Intelligence', '12,847 orgs 글로벌 네트워크', 'stage', 15, '#stage6, .collective-section', false),
  ('pipeline-nav', 'Pipeline Navigator', '상단 6-Stage 시각적 스테퍼', 'navigation', 5, '.pipeline-nav, .pipeline-steps', false),
  ('sidebar-left', 'Left Sidebar', 'Quick Templates + Pipeline List', 'sidebar', 3, '.sidebar-left', false),
  ('sidebar-right', 'Activity Feed', '실시간 활동 로그', 'sidebar', 3, '.sidebar-right, .activity-feed', false),
  ('operation-guide', 'Operation Guide', '진행 상태 가이드 바', 'navigation', 2, '.operation-guide', false)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evolution_logs_timestamp ON evolution_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_logs_status ON evolution_logs(status);
CREATE INDEX IF NOT EXISTS idx_feature_registry_implemented ON feature_registry(implemented);

-- Function to get current score
CREATE OR REPLACE FUNCTION get_current_score()
RETURNS INTEGER AS $$
DECLARE
  total_weight INTEGER;
  implemented_weight INTEGER;
BEGIN
  SELECT SUM(weight) INTO total_weight FROM feature_registry;
  SELECT SUM(weight) INTO implemented_weight FROM feature_registry WHERE implemented = true;
  RETURN 100 - (total_weight - COALESCE(implemented_weight, 0));
END;
$$ LANGUAGE plpgsql;

-- View for dashboard stats
CREATE OR REPLACE VIEW evolution_stats AS
SELECT 
  COUNT(*) as total_evolutions,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(after_score - before_score)::INTEGER as avg_score_improvement,
  SUM(lines_added) as total_lines_generated,
  MAX(timestamp) as last_evolution
FROM evolution_logs;
```

3. **Run** 버튼 클릭 (또는 Cmd/Ctrl + Enter)

### 2.3 실행 결과 확인

성공시 메시지:
```
Success. No rows returned
```

---

## Step 3: 테이블 확인

### 3.1 Table Editor에서 확인

1. 좌측 메뉴 **Table Editor** 클릭
2. 생성된 테이블 확인:
   - `evolution_logs`
   - `feature_registry`

### 3.2 데이터 확인

**feature_registry** 테이블 클릭:

| id | name | weight | implemented |
|----|------|--------|-------------|
| stage-1-templates | Template Marketplace | 15 | false |
| stage-6-collective | Collective Intelligence | 15 | false |
| pipeline-nav | Pipeline Navigator | 5 | false |
| sidebar-left | Left Sidebar | 3 | false |
| sidebar-right | Activity Feed | 3 | false |
| operation-guide | Operation Guide | 2 | false |

---

## Step 4: API 키 확인

### 4.1 Project Settings 열기

1. 좌측 하단 **Project Settings** (톱니바퀴) 클릭
2. **API** 섹션 클릭

### 4.2 필요한 정보 복사

n8n에서 사용할 정보:

```
Project URL: https://YOUR_PROJECT_ID.supabase.co
             ↓
             n8n Supabase Credential의 "Host"에 입력

service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  ↓
                  n8n Supabase Credential의 "Service Role Key"에 입력
```

⚠️ **중요**: `anon` key가 아닌 `service_role` key를 사용해야 합니다!

---

## Step 5: Real-time 활성화 (선택)

Self-Builder UI에서 실시간 업데이트를 보려면:

1. **Database** → **Replication** 클릭
2. `evolution_logs` 테이블 선택
3. **Enable** 클릭

---

## Step 6: 테스트 쿼리

SQL Editor에서 다음 쿼리로 확인:

```sql
-- 현재 점수 확인
SELECT get_current_score();
-- 결과: 57 (모든 기능이 미구현 상태)

-- 미구현 기능 목록
SELECT name, weight FROM feature_registry 
WHERE implemented = false 
ORDER BY weight DESC;

-- 진화 통계 (아직 데이터 없음)
SELECT * FROM evolution_stats;
```

---

## Step 7: 테스트 데이터 삽입 (선택)

워크플로우 테스트용 샘플 데이터:

```sql
INSERT INTO evolution_logs (before_score, after_score, features_added, lines_added, status)
VALUES (
  85,
  100,
  '["Template Marketplace", "Collective Intelligence"]'::jsonb,
  1247,
  'success'
);

-- 확인
SELECT * FROM evolution_logs;
```

---

## 유용한 쿼리 모음

```sql
-- 최근 10개 진화 내역
SELECT 
  timestamp,
  before_score || ' → ' || after_score as score_change,
  features_added,
  status
FROM evolution_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- 기능별 구현 현황
SELECT 
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE implemented) as done,
  SUM(weight) as total_weight
FROM feature_registry
GROUP BY category;

-- 진화 성공률
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::numeric / 
    COUNT(*)::numeric * 100, 
    1
  ) as success_rate_percent
FROM evolution_logs;
```

---

## 트러블슈팅

### "relation already exists" 에러
- 정상입니다. `IF NOT EXISTS`로 인해 무시됨

### "permission denied" 에러
- Project Settings → API → service_role key 사용 확인

### 테이블이 보이지 않음
- 브라우저 새로고침
- Schema가 `public`인지 확인
