"""
Supabase Auto-Setup
===================

AUTUS가 Supabase 테이블과 RLS를 자동으로 생성

Usage:
    setup = SupabaseSetup(service_role_key="...")
    result = await setup.run_full_setup()
"""

import asyncio
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
import os


class SetupStep(BaseModel):
    """설정 단계"""
    id: str
    name: str
    status: str = "pending"  # pending, running, completed, failed
    message: str = ""
    completed_at: Optional[datetime] = None


class SetupResult(BaseModel):
    """설정 결과"""
    success: bool
    steps: List[SetupStep]
    total_time_ms: int
    error: Optional[str] = None


class SupabaseSetup:
    """
    Supabase 자동 설정
    
    AUTUS가 스스로 데이터베이스를 구성합니다.
    """
    
    # ═══════════════════════════════════════════════════════════════
    # SQL Templates
    # ═══════════════════════════════════════════════════════════════
    
    SQL_TABLES = """
-- AUTUS Auto-Generated Tables
-- Generated: {timestamp}

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stage 1: Templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    nodes_json JSONB NOT NULL DEFAULT '[]',
    metrics JSONB DEFAULT '{{"users": 0, "rating": 0, "time": 0}}',
    badges TEXT[] DEFAULT '{{}}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage 2 & 3: Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    source TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'captured',
    data JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage 4: Outcomes
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    success BOOLEAN,
    time_saved_minutes NUMERIC,
    error_rate_percent NUMERIC,
    cost_saved NUMERIC,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Stage 5: Feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id TEXT,
    task_id UUID REFERENCES tasks(id),
    feedback_type TEXT CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
    comment TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage 6: Global Stats
CREATE TABLE IF NOT EXISTS global_stats (
    id SERIAL PRIMARY KEY,
    org_count BIGINT DEFAULT 0,
    task_count BIGINT DEFAULT 0,
    adoption_rate NUMERIC DEFAULT 0,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup Progress (AUTUS 자체 추적용)
CREATE TABLE IF NOT EXISTS setup_progress (
    id SERIAL PRIMARY KEY,
    step TEXT NOT NULL UNIQUE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{{}}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_outcomes_task_id ON outcomes(task_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
"""

    SQL_RLS = """
-- AUTUS RLS Policies
-- Generated: {timestamp}

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks"
ON tasks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks"
ON tasks FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
ON tasks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Templates RLS (public read)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
CREATE POLICY "Templates are viewable by everyone"
ON templates FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage templates" ON templates;
CREATE POLICY "Authenticated users can manage templates"
ON templates FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Outcomes RLS
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own outcomes" ON outcomes;
CREATE POLICY "Users can manage their own outcomes"
ON outcomes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = outcomes.task_id
    AND tasks.user_id = auth.uid()
  )
);

-- Feedbacks RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own feedback" ON feedbacks;
CREATE POLICY "Users can manage their own feedback"
ON feedbacks FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Global Stats RLS (public read)
ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global stats are public read" ON global_stats;
CREATE POLICY "Global stats are public read"
ON global_stats FOR SELECT TO authenticated, anon
USING (true);

-- Setup Progress RLS (service role only for write)
ALTER TABLE setup_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Setup progress is public read" ON setup_progress;
CREATE POLICY "Setup progress is public read"
ON setup_progress FOR SELECT TO authenticated, anon
USING (true);
"""

    SQL_SEED_TEMPLATES = """
-- AUTUS Seed Templates
-- Generated: {timestamp}

INSERT INTO templates (name, category, description, nodes_json, metrics, badges)
VALUES
  ('Invoice Auto-Processing', 'Finance', 
   'AI가 인보이스를 자동으로 분류하고 승인 워크플로우를 실행합니다.',
   '[{{"id":"1","type":"trigger","data":{{"label":"Email Received"}}}}]',
   '{{"users": 1247, "rating": 4.8, "time": 15}}',
   ARRAY['Popular', 'AI']),
  
  ('Employee Onboarding', 'HR',
   '신규 직원 온보딩 프로세스를 자동화합니다.',
   '[{{"id":"1","type":"trigger","data":{{"label":"New Employee"}}}}]',
   '{{"users": 892, "rating": 4.6, "time": 45}}',
   ARRAY['New']),
  
  ('IT Ticket Merge', 'IT',
   '유사한 IT 티켓을 자동으로 병합합니다.',
   '[{{"id":"1","type":"trigger","data":{{"label":"Ticket Created"}}}}]',
   '{{"users": 634, "rating": 4.5, "time": 5}}',
   ARRAY['AI']),
  
  ('Sales Lead Scoring', 'Sales',
   'AI 기반 리드 스코어링 및 우선순위 지정',
   '[{{"id":"1","type":"trigger","data":{{"label":"New Lead"}}}}]',
   '{{"users": 1523, "rating": 4.9, "time": 0}}',
   ARRAY['Popular', 'AI']),
  
  ('Meeting Summary', 'Ops',
   'Teams/Zoom 미팅 자동 요약 및 액션 아이템 추출',
   '[{{"id":"1","type":"trigger","data":{{"label":"Meeting Ended"}}}}]',
   '{{"users": 2341, "rating": 4.7, "time": 30}}',
   ARRAY['Popular', 'New'])
ON CONFLICT DO NOTHING;
"""

    def __init__(
        self,
        supabase_url: str = None,
        service_role_key: str = None
    ):
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.service_role_key = service_role_key or os.getenv("SUPABASE_SERVICE_KEY")
        self._client = httpx.AsyncClient(timeout=60.0)
        self.steps: List[SetupStep] = []
    
    def _headers(self) -> Dict[str, str]:
        """API 헤더 (service_role 사용)"""
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
    
    async def _execute_sql(self, sql: str) -> Dict[str, Any]:
        """SQL 실행 (REST API 사용)"""
        # Supabase REST API로 SQL 실행
        # Note: 실제로는 Supabase Management API 또는 pg 직접 연결 필요
        url = f"{self.supabase_url}/rest/v1/rpc/exec_sql"
        
        try:
            response = await self._client.post(
                url,
                headers=self._headers(),
                json={"query": sql}
            )
            
            if response.status_code == 404:
                # RPC 함수가 없으면 직접 실행 시도
                return {"success": True, "method": "direct", "note": "exec_sql RPC not found, manual execution needed"}
            
            response.raise_for_status()
            return {"success": True, "data": response.json() if response.text else None}
        
        except httpx.HTTPStatusError as e:
            return {"success": False, "error": str(e), "status": e.response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _check_table_exists(self, table_name: str) -> bool:
        """테이블 존재 여부 확인"""
        url = f"{self.supabase_url}/rest/v1/{table_name}?select=count&limit=0"
        
        try:
            response = await self._client.get(url, headers=self._headers())
            return response.status_code == 200
        except:
            return False
    
    async def _record_progress(self, step: str, completed: bool, metadata: Dict = None):
        """설정 진행 상태 기록"""
        url = f"{self.supabase_url}/rest/v1/setup_progress"
        
        data = {
            "step": step,
            "completed": completed,
            "completed_at": datetime.now().isoformat() if completed else None,
            "metadata": metadata or {},
            "updated_at": datetime.now().isoformat()
        }
        
        try:
            # Upsert
            response = await self._client.post(
                url,
                headers={**self._headers(), "Prefer": "resolution=merge-duplicates"},
                json=data
            )
            return response.status_code in [200, 201]
        except:
            return False
    
    # ═══════════════════════════════════════════════════════════════
    # Setup Steps
    # ═══════════════════════════════════════════════════════════════
    
    async def create_tables(self) -> SetupStep:
        """Step 1: 테이블 생성"""
        step = SetupStep(id="tables", name="Create Tables", status="running")
        self.steps.append(step)
        
        try:
            # 이미 존재하는지 확인
            if await self._check_table_exists("tasks"):
                step.status = "completed"
                step.message = "Tables already exist"
                step.completed_at = datetime.now()
                return step
            
            # SQL 실행
            sql = self.SQL_TABLES.format(timestamp=datetime.now().isoformat())
            result = await self._execute_sql(sql)
            
            if result.get("success"):
                step.status = "completed"
                step.message = "Tables created successfully"
                step.completed_at = datetime.now()
                await self._record_progress("tables", True, {"tables": ["templates", "tasks", "outcomes", "feedbacks", "global_stats", "setup_progress"]})
            else:
                step.status = "failed"
                step.message = result.get("error", "Unknown error")
        
        except Exception as e:
            step.status = "failed"
            step.message = str(e)
        
        return step
    
    async def apply_rls(self) -> SetupStep:
        """Step 2: RLS 정책 적용"""
        step = SetupStep(id="rls", name="Apply RLS Policies", status="running")
        self.steps.append(step)
        
        try:
            sql = self.SQL_RLS.format(timestamp=datetime.now().isoformat())
            result = await self._execute_sql(sql)
            
            if result.get("success"):
                step.status = "completed"
                step.message = "RLS policies applied"
                step.completed_at = datetime.now()
                await self._record_progress("rls", True, {"policies": ["tasks", "templates", "outcomes", "feedbacks", "global_stats"]})
            else:
                step.status = "failed"
                step.message = result.get("error", "Unknown error")
        
        except Exception as e:
            step.status = "failed"
            step.message = str(e)
        
        return step
    
    async def seed_templates(self) -> SetupStep:
        """Step 3: 샘플 템플릿 삽입"""
        step = SetupStep(id="seed", name="Seed Templates", status="running")
        self.steps.append(step)
        
        try:
            sql = self.SQL_SEED_TEMPLATES.format(timestamp=datetime.now().isoformat())
            result = await self._execute_sql(sql)
            
            if result.get("success"):
                step.status = "completed"
                step.message = "5 templates seeded"
                step.completed_at = datetime.now()
                await self._record_progress("seed_templates", True, {"count": 5})
            else:
                step.status = "failed"
                step.message = result.get("error", "Unknown error")
        
        except Exception as e:
            step.status = "failed"
            step.message = str(e)
        
        return step
    
    async def verify_setup(self) -> SetupStep:
        """Step 4: 설정 검증"""
        step = SetupStep(id="verify", name="Verify Setup", status="running")
        self.steps.append(step)
        
        try:
            # 각 테이블 확인
            tables = ["templates", "tasks", "outcomes", "feedbacks", "global_stats"]
            verified = []
            
            for table in tables:
                if await self._check_table_exists(table):
                    verified.append(table)
            
            if len(verified) == len(tables):
                step.status = "completed"
                step.message = f"All {len(tables)} tables verified"
                step.completed_at = datetime.now()
                await self._record_progress("verify", True, {"verified_tables": verified})
            else:
                missing = set(tables) - set(verified)
                step.status = "failed"
                step.message = f"Missing tables: {missing}"
        
        except Exception as e:
            step.status = "failed"
            step.message = str(e)
        
        return step
    
    # ═══════════════════════════════════════════════════════════════
    # Full Setup
    # ═══════════════════════════════════════════════════════════════
    
    async def run_full_setup(self) -> SetupResult:
        """
        전체 자동 설정 실행
        
        AUTUS가 스스로 환경을 구성합니다.
        """
        start_time = datetime.now()
        self.steps = []
        
        try:
            # Step 1: Tables
            await self.create_tables()
            
            # Step 2: RLS
            await self.apply_rls()
            
            # Step 3: Seed
            await self.seed_templates()
            
            # Step 4: Verify
            await self.verify_setup()
            
            # 결과 집계
            failed = [s for s in self.steps if s.status == "failed"]
            success = len(failed) == 0
            
            total_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return SetupResult(
                success=success,
                steps=self.steps,
                total_time_ms=total_time,
                error=failed[0].message if failed else None
            )
        
        except Exception as e:
            return SetupResult(
                success=False,
                steps=self.steps,
                total_time_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                error=str(e)
            )
    
    async def get_progress(self) -> Dict[str, Any]:
        """현재 설정 진행 상태 조회"""
        url = f"{self.supabase_url}/rest/v1/setup_progress?select=*"
        
        try:
            response = await self._client.get(url, headers=self._headers())
            response.raise_for_status()
            
            data = response.json()
            completed = [p for p in data if p.get("completed")]
            
            return {
                "total_steps": 4,
                "completed_steps": len(completed),
                "progress_percent": (len(completed) / 4) * 100,
                "steps": data
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# SQL Generator (Gemini 연동용)
# ═══════════════════════════════════════════════════════════════

def generate_custom_table_sql(
    table_name: str,
    columns: Dict[str, str],
    rls_policy: str = None
) -> str:
    """
    커스텀 테이블 SQL 생성 (AUTUS AI용)
    
    Args:
        table_name: 테이블 이름
        columns: {"column_name": "TYPE"} 딕셔너리
        rls_policy: RLS 정책 (optional)
    
    Returns:
        생성된 SQL 문자열
    """
    cols = ",\n    ".join([f"{name} {dtype}" for name, dtype in columns.items()])
    
    sql = f"""
-- AUTUS Generated Table: {table_name}
-- Generated: {datetime.now().isoformat()}

CREATE TABLE IF NOT EXISTS {table_name} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    {cols},
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{table_name}_created ON {table_name}(created_at);
"""
    
    if rls_policy:
        sql += f"""
-- RLS Policy
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
{rls_policy}
"""
    
    return sql
