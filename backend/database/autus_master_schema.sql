-- ============================================
-- AUTUS v1.0 - Master Database Schema
-- 통합 마스터 스키마 (중복 제거, 명명 규칙 통일)
-- ============================================
-- 
-- 규칙:
-- 1. 테이블명: snake_case (복수형)
-- 2. 컬럼명: snake_case
-- 3. FK 참조: org_id (organization_id 대신)
-- 4. 시간: timestamptz (created_at, updated_at)
-- 5. UUID: gen_random_uuid() 사용
-- ============================================

-- ============================================
-- 0. 확장 기능 활성화
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. 핵심 조직/사용자 테이블
-- ============================================

-- 조직 테이블
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  type text default 'academy' check (type in ('academy', 'enterprise', 'individual')),
  region text default 'korea' check (region in ('korea', 'philippines', 'global')),
  timezone text default 'Asia/Seoul',
  logo_url text,
  settings jsonb default '{}',
  meta jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자 테이블
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique, -- Supabase Auth ID
  org_id uuid references public.orgs(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null check (role in ('c_level', 'fsd', 'optimus', 'consumer', 'regulatory', 'partner')),
  tier smallint check (tier in (1, 2, 3)),
  avatar_url text,
  phone text,
  permissions text[] default '{}',
  settings jsonb default '{}',
  meta jsonb default '{}',
  is_active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 조직 멤버십 테이블 (다대다 관계)
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('c_level', 'fsd', 'optimus')),
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  permissions jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, user_id)
);

-- ============================================
-- 2. 관계 노드 테이블 (Relational Physics)
-- ============================================

-- 관계 노드 (학생, 학부모, 교사 등)
create table if not exists public.relational_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references public.users(id),
  node_type text not null check (node_type in ('student', 'parent', 'teacher', 'staff', 'partner', 'lead')),
  external_id text, -- ERP 시스템 ID
  name text not null,
  grade text,
  class_name text,
  status text default 'active' check (status in ('active', 'inactive', 'churned', 'prospect')),
  contact_info jsonb default '{}',
  meta jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. Lambda/Sigma/Density 테이블 (AUTUS Physics)
-- ============================================

-- Node Lambda (λ) - 노드 시간 상수
create table if not exists public.node_lambdas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  lambda decimal(5,3) not null default 1.0 check (lambda between 0.5 and 10.0),
  lambda_base decimal(5,3) not null default 1.0,
  replaceability decimal(3,2) default 0.5 check (replaceability between 0 and 1),
  influence decimal(3,2) default 0.5 check (influence between 0 and 1),
  expertise decimal(3,2) default 0.5 check (expertise between 0 and 1),
  network_position decimal(3,2) default 0.5 check (network_position between 0 and 1),
  growth_rate decimal(5,4) default 0.01, -- γ (gamma)
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, node_id)
);

-- Relationship Sigma (σ) - 시너지 계수
create table if not exists public.relationship_sigmas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  sigma decimal(4,3) not null default 0.0 check (sigma between -1.0 and 1.0),
  compatibility decimal(3,2) default 0.5, -- C: 성격 궁합
  goal_alignment decimal(3,2) default 0.5, -- G: 목표 일치도
  value_match decimal(3,2) default 0.5, -- V: 가치관 일치도
  rhythm_sync decimal(3,2) default 0.5, -- R: 리듬 동기화
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, node_a_id, node_b_id)
);

-- Relationship Density (P) - 관계 밀도
create table if not exists public.relationship_densities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  density decimal(4,3) not null default 0.0 check (density between 0 and 1),
  frequency decimal(3,2) default 0.5, -- 접촉 빈도
  depth decimal(3,2) default 0.5, -- 대화 깊이
  quality decimal(3,2) default 0.5, -- 상호작용 품질
  decay_rate decimal(5,4) default 0.01, -- δ (decay)
  last_interaction_at timestamptz,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, node_a_id, node_b_id)
);

-- ============================================
-- 4. 시간 측정 테이블 (Time Value)
-- ============================================

-- 시간 활동 기록
create table if not exists public.time_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  from_node_id uuid not null references public.relational_nodes(id) on delete cascade,
  to_node_id uuid references public.relational_nodes(id) on delete set null,
  time_type text not null check (time_type in ('invested', 'saved', 'created')), -- T1, T2, T3
  activity_type text not null, -- 활동 유형
  real_minutes integer not null, -- 실제 시간 (분)
  lambda_at_time decimal(5,3) not null default 1.0,
  stu_value decimal(10,2) not null, -- 조정된 STU 값
  description text,
  source text, -- 'quick_tag', 'erp_sync', 'manual'
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 조직별 Omega (ω) - STU → KRW 변환율
create table if not exists public.org_omega (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  omega_value decimal(15,2) not null default 50000, -- 1 STU = 50,000 KRW
  total_revenue decimal(15,0) not null default 0,
  total_stu decimal(15,2) not null default 0,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(org_id)
);

-- ============================================
-- 5. Value Snapshots (가치 스냅샷)
-- ============================================

create table if not exists public.value_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  snapshot_type text not null check (snapshot_type in ('daily', 'weekly', 'monthly', 'manual')),
  snapshot_date date not null,
  total_value_stu decimal(15,2) not null,
  total_value_krw decimal(15,0),
  node_count integer not null,
  relationship_count integer not null,
  avg_lambda decimal(5,3),
  avg_sigma decimal(4,3),
  avg_density decimal(4,3),
  top_nodes jsonb default '[]',
  metrics jsonb default '{}',
  created_at timestamptz not null default now(),
  unique(org_id, snapshot_type, snapshot_date)
);

-- ============================================
-- 6. Physics Metrics (물리 메트릭)
-- ============================================

create table if not exists public.physics_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  s_index decimal(4,3) default 0.5, -- Synergy Index
  m_score decimal(4,3) default 0.5, -- Mass Score
  v_value decimal(15,2) default 0, -- V Value
  bond_strength decimal(4,3) default 0.5, -- 결합 강도
  r_score decimal(4,3) default 0, -- Risk Score
  churn_probability decimal(4,3) default 0, -- 이탈 확률
  momentum decimal(10,2) default 0, -- 모멘텀
  acceleration decimal(10,2) default 0, -- 가속도
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 7. Risk Queue (위험 대기열)
-- ============================================

create table if not exists public.risk_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  target_node uuid not null references public.relational_nodes(id) on delete cascade,
  priority integer not null default 50 check (priority between 1 and 100),
  risk_score decimal(4,3) not null,
  risk_type text not null check (risk_type in ('churn', 'payment', 'attendance', 'sentiment', 'other')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'escalated', 'ignored')),
  signals jsonb default '{}',
  predicted_churn_days integer,
  assigned_to uuid references public.users(id),
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  auto_actions_taken jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 8. Interaction Logs (상호작용 로그)
-- ============================================

create table if not exists public.interaction_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  source_node_id uuid references public.relational_nodes(id) on delete set null,
  target_node_id uuid references public.relational_nodes(id) on delete set null,
  interaction_type text not null, -- 'call', 'message', 'meeting', 'feedback', 'quick_tag'
  channel text, -- 'phone', 'kakao', 'email', 'in_person', 'app'
  sentiment_score decimal(3,2) check (sentiment_score between -1 and 1),
  raw_content text,
  vectorized_data jsonb, -- AI 분석 결과
  ai_analysis jsonb, -- Claude 분석 결과
  s_delta decimal(4,3), -- Synergy 변화량
  m_delta decimal(4,3), -- Mass 변화량
  duration_minutes integer,
  recorded_by uuid references public.users(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================
-- 9. Quick Tag Records
-- ============================================

create table if not exists public.quick_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  tagged_by uuid not null references public.users(id),
  tag_type text not null, -- 'mood', 'achievement', 'concern', 'note'
  tag_value text not null,
  emoji text,
  sentiment decimal(3,2) check (sentiment between -1 and 1),
  context jsonb default '{}',
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- 10. Chemistry Matching (케미스트리 매칭)
-- ============================================

create table if not exists public.chemistry_matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  match_score decimal(4,3) not null check (match_score between 0 and 1),
  compatibility_factors jsonb not null default '{}',
  recommendation text,
  status text default 'suggested' check (status in ('suggested', 'accepted', 'rejected', 'active')),
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 11. Global Consolidation (글로벌 통합)
-- ============================================

create table if not exists public.global_consolidation (
  id uuid primary key default gen_random_uuid(),
  consolidation_date date not null,
  korea_v_index decimal(15,2) not null default 0,
  philippines_v_index decimal(15,2) not null default 0,
  consolidated_v decimal(15,2) not null default 0,
  synergy_factor decimal(4,3) default 1.0,
  exit_value decimal(15,0),
  reinvestment_capacity decimal(15,0),
  peza_tax_benefit decimal(15,0) default 0,
  exchange_rate decimal(10,4) default 23.5, -- PHP per KRW
  notes text,
  created_at timestamptz not null default now(),
  unique(consolidation_date)
);

-- ============================================
-- 12. Assets (자산 포트폴리오)
-- ============================================

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  asset_type text not null check (asset_type in ('equity', 'ip', 'data', 'standard', 'partnership')),
  source_name text not null,
  source_id uuid,
  description text,
  t_value decimal(15,2) not null, -- 투입 시간 가치
  sigma_value decimal(5,3) not null, -- 시너지 계수
  a_value decimal(15,2) not null, -- 계산된 자산 가치
  a_krw decimal(15,0), -- KRW 환산
  status text default 'active' check (status in ('active', 'pending', 'realized')),
  acquired_at timestamptz not null default now(),
  realized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 13. Efficiency Metrics (효율 메트릭)
-- ============================================

create table if not exists public.efficiency_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_input_stu decimal(15,2) not null,
  total_input_krw decimal(15,0),
  total_output_stu decimal(15,2) not null,
  total_output_krw decimal(15,0),
  efficiency_ratio decimal(5,2) not null,
  efficiency_level text check (efficiency_level in ('excellent', 'good', 'break_even', 'loss')),
  by_activity_type jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ============================================
-- 14. Sigma Proxy Data (시그마 프록시 데이터)
-- ============================================

create table if not exists public.sigma_proxy_data (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  response_speed decimal(3,2) check (response_speed between 0 and 1),
  engagement_rate decimal(3,2) check (engagement_rate between 0 and 1),
  completion_rate decimal(3,2) check (completion_rate between 0 and 1),
  sentiment_score decimal(3,2) check (sentiment_score between -1 and 1),
  renewal_history decimal(3,2) check (renewal_history between 0 and 1),
  predicted_sigma decimal(4,3),
  confidence decimal(3,2),
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================
-- 15. Safety Mirror Reports
-- ============================================

create table if not exists public.safety_mirror_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  report_type text not null check (report_type in ('growth', 'alert', 'weekly', 'monthly')),
  title text not null,
  content text not null,
  ai_generated boolean default true,
  metrics jsonb default '{}',
  sent_to text[], -- 발송 대상 (parent phone numbers)
  sent_at timestamptz,
  opened_at timestamptz,
  feedback jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- 16. Shield Activation Logs
-- ============================================

create table if not exists public.shield_activation_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  risk_queue_id uuid references public.risk_queue(id),
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  trigger_type text not null, -- 'auto', 'manual'
  trigger_threshold decimal(4,3),
  actual_risk_score decimal(4,3),
  actions_taken jsonb not null default '[]',
  report_id uuid references public.safety_mirror_reports(id),
  outcome text, -- 'resolved', 'escalated', 'pending'
  activated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ============================================
-- 17. Workflow Execution Logs
-- ============================================

create table if not exists public.workflow_execution_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  workflow_name text not null,
  workflow_id text, -- n8n workflow ID
  trigger_type text not null, -- 'schedule', 'webhook', 'manual'
  status text not null check (status in ('started', 'completed', 'failed', 'timeout')),
  input_data jsonb,
  output_data jsonb,
  error_message text,
  duration_ms integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================
-- 18. Audit Logs
-- ============================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 19. Approval Codes
-- ============================================

create table if not exists public.approval_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  code text not null unique,
  target_role text not null check (target_role in ('fsd', 'optimus')),
  created_by uuid not null references public.users(id),
  used_by uuid references public.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- 20. Owner Goals (목표 설정)
-- ============================================

create table if not exists public.owner_goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 목표 기본 정보
  type text not null check (type in ('revenue', 'branch_expand', 'margin', 'closure', 'mna', 'cost_reduction', 'student_count', 'custom')),
  title text not null,
  description text,
  
  -- 목표값
  target_value decimal(15,2), -- 숫자형 목표
  target_text text, -- 텍스트형 목표
  current_value decimal(15,2), -- 현재 숫자값
  current_text text, -- 현재 텍스트값
  unit text, -- 단위 (원, %, 개, 명, 건 등)
  
  -- 기간
  timeframe text check (timeframe in ('monthly', 'quarterly', 'half_year', 'yearly', 'custom')),
  start_date date not null,
  end_date date not null,
  
  -- 상태 및 진행
  status text default 'active' check (status in ('draft', 'active', 'on_track', 'at_risk', 'behind', 'achieved', 'cancelled')),
  progress decimal(5,2) default 0 check (progress between 0 and 100),
  
  -- 전략 및 담당
  strategies text[] default '{}', -- 실행 전략 목록
  assigned_to text not null, -- 담당 역할 (C-Level, FSD, Optimus)
  
  -- 자동 추적
  auto_track boolean default false, -- 자동 진행률 추적 여부
  track_source text, -- 추적 데이터 소스 (physics_metrics, financial_transactions 등)
  track_formula text, -- 추적 수식
  
  -- 메타
  priority integer default 50 check (priority between 1 and 100),
  tags text[] default '{}',
  notes text,
  
  -- 감사
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 목표 마일스톤
create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.owner_goals(id) on delete cascade,
  
  label text not null,
  description text,
  target_value decimal(15,2),
  target_text text,
  actual_value decimal(15,2),
  actual_text text,
  due_date date not null,
  achieved boolean default false,
  achieved_at timestamptz,
  
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 목표 KPI
create table if not exists public.goal_kpis (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.owner_goals(id) on delete cascade,
  
  name text not null,
  description text,
  formula text, -- 계산 수식
  
  target_value decimal(15,4) not null,
  current_value decimal(15,4) default 0,
  unit text,
  
  weight decimal(3,2) default 0.5 check (weight between 0 and 1), -- 가중치
  
  data_source text, -- 데이터 소스 테이블
  auto_update boolean default false,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 목표 이력 (변경 추적)
create table if not exists public.goal_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.owner_goals(id) on delete cascade,
  
  change_type text not null check (change_type in ('created', 'updated', 'status_changed', 'progress_updated', 'milestone_achieved')),
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references public.users(id),
  notes text,
  
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_owner_goals_org_id on public.owner_goals(org_id);
create index if not exists idx_owner_goals_type on public.owner_goals(type);
create index if not exists idx_owner_goals_status on public.owner_goals(status);
create index if not exists idx_owner_goals_end_date on public.owner_goals(end_date);
create index if not exists idx_goal_milestones_goal_id on public.goal_milestones(goal_id);
create index if not exists idx_goal_kpis_goal_id on public.goal_kpis(goal_id);
create index if not exists idx_goal_history_goal_id on public.goal_history(goal_id);

-- RLS
alter table public.owner_goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.goal_kpis enable row level security;
alter table public.goal_history enable row level security;

-- 목표 자동 상태 업데이트 함수
create or replace function update_goal_status()
returns trigger as $$
declare
  v_progress decimal;
  v_expected decimal;
  v_total_days decimal;
  v_elapsed_days decimal;
begin
  -- 진행률 계산
  if new.target_value is not null and new.target_value > 0 then
    v_progress := least(100, (coalesce(new.current_value, 0) / new.target_value) * 100);
  else
    -- 마일스톤 기반 진행률
    select 
      case when count(*) > 0 
        then (sum(case when achieved then 1 else 0 end)::decimal / count(*)) * 100
        else 0
      end
    into v_progress
    from public.goal_milestones
    where goal_id = new.id;
  end if;
  
  new.progress := round(v_progress, 2);
  
  -- 예상 진행률 계산
  v_total_days := extract(epoch from (new.end_date - new.start_date)) / 86400;
  v_elapsed_days := extract(epoch from (current_date - new.start_date)) / 86400;
  
  if v_total_days > 0 then
    v_expected := least(100, (v_elapsed_days / v_total_days) * 100);
  else
    v_expected := 100;
  end if;
  
  -- 상태 자동 업데이트 (수동 설정 제외)
  if new.status not in ('achieved', 'cancelled', 'draft') then
    if new.progress >= 100 then
      new.status := 'achieved';
    elsif new.progress >= v_expected - 5 then
      new.status := 'on_track';
    elsif new.progress >= v_expected - 15 then
      new.status := 'at_risk';
    else
      new.status := 'behind';
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger goal_status_update
  before update of current_value, current_text on public.owner_goals
  for each row execute function update_goal_status();

-- ============================================
-- 21. Physics Config
-- ============================================

create table if not exists public.physics_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  config_key text not null,
  config_value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, config_key)
);

-- ============================================
-- INDEXES
-- ============================================

-- 조직별 조회 최적화
create index if not exists idx_users_org_id on public.users(org_id);
create index if not exists idx_relational_nodes_org_id on public.relational_nodes(org_id);
create index if not exists idx_node_lambdas_org_id on public.node_lambdas(org_id);
create index if not exists idx_relationship_sigmas_org_id on public.relationship_sigmas(org_id);
create index if not exists idx_relationship_densities_org_id on public.relationship_densities(org_id);
create index if not exists idx_time_records_org_id on public.time_records(org_id);
create index if not exists idx_physics_metrics_org_id on public.physics_metrics(org_id);
create index if not exists idx_risk_queue_org_id on public.risk_queue(org_id);
create index if not exists idx_interaction_logs_org_id on public.interaction_logs(org_id);

-- 노드별 조회 최적화
create index if not exists idx_node_lambdas_node_id on public.node_lambdas(node_id);
create index if not exists idx_physics_metrics_node_id on public.physics_metrics(node_id);
create index if not exists idx_time_records_from_node on public.time_records(from_node_id);
create index if not exists idx_interaction_logs_target on public.interaction_logs(target_node_id);

-- 관계 조회 최적화
create index if not exists idx_relationship_sigmas_nodes on public.relationship_sigmas(node_a_id, node_b_id);
create index if not exists idx_relationship_densities_nodes on public.relationship_densities(node_a_id, node_b_id);

-- 시간 기반 조회 최적화
create index if not exists idx_time_records_recorded_at on public.time_records(recorded_at);
create index if not exists idx_interaction_logs_recorded_at on public.interaction_logs(recorded_at);
create index if not exists idx_value_snapshots_date on public.value_snapshots(snapshot_date);
create index if not exists idx_risk_queue_created_at on public.risk_queue(created_at);

-- Risk Queue 상태 조회
create index if not exists idx_risk_queue_status on public.risk_queue(status);
create index if not exists idx_risk_queue_priority on public.risk_queue(priority desc);

-- ============================================
-- RLS POLICIES
-- ============================================

alter table public.orgs enable row level security;
alter table public.users enable row level security;
alter table public.org_members enable row level security;
alter table public.relational_nodes enable row level security;
alter table public.node_lambdas enable row level security;
alter table public.relationship_sigmas enable row level security;
alter table public.relationship_densities enable row level security;
alter table public.time_records enable row level security;
alter table public.value_snapshots enable row level security;
alter table public.physics_metrics enable row level security;
alter table public.risk_queue enable row level security;
alter table public.interaction_logs enable row level security;
alter table public.quick_tags enable row level security;
alter table public.chemistry_matches enable row level security;
alter table public.assets enable row level security;
alter table public.efficiency_metrics enable row level security;
alter table public.safety_mirror_reports enable row level security;
alter table public.shield_activation_logs enable row level security;
alter table public.workflow_execution_logs enable row level security;
alter table public.audit_logs enable row level security;

-- 조직 기반 접근 제어 함수
create or replace function get_user_org_ids()
returns setof uuid as $$
  select org_id from public.org_members 
  where user_id = auth.uid() and is_active = true
  union
  select org_id from public.users 
  where id = auth.uid()
$$ language sql security definer;

-- 기본 RLS 정책 (조직 기반)
do $$
declare
  t text;
  tables text[] := array[
    'relational_nodes', 'node_lambdas', 'relationship_sigmas', 
    'relationship_densities', 'time_records', 'value_snapshots',
    'physics_metrics', 'risk_queue', 'interaction_logs', 'quick_tags',
    'chemistry_matches', 'assets', 'efficiency_metrics',
    'safety_mirror_reports', 'shield_activation_logs'
  ];
begin
  foreach t in array tables
  loop
    execute format('
      create policy if not exists %I_org_access on public.%I
        for all using (org_id in (select get_user_org_ids()))
    ', t, t);
  end loop;
end $$;

-- Service role 전체 접근 정책
do $$
declare
  t text;
  tables text[] := array[
    'orgs', 'users', 'org_members', 'relational_nodes', 
    'node_lambdas', 'relationship_sigmas', 'relationship_densities',
    'time_records', 'value_snapshots', 'physics_metrics', 
    'risk_queue', 'interaction_logs', 'quick_tags', 'chemistry_matches',
    'global_consolidation', 'assets', 'efficiency_metrics',
    'sigma_proxy_data', 'safety_mirror_reports', 'shield_activation_logs',
    'workflow_execution_logs', 'audit_logs', 'approval_codes', 'physics_config'
  ];
begin
  foreach t in array tables
  loop
    execute format('
      create policy if not exists %I_service_role on public.%I
        for all using (true) with check (true)
    ', t, t);
  end loop;
end $$;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Lambda 계산 함수
create or replace function calculate_lambda(
  p_replaceability decimal,
  p_influence decimal,
  p_expertise decimal,
  p_network decimal,
  p_base decimal default 1.0
) returns decimal as $$
declare
  v_lambda decimal;
  v_r decimal;
begin
  -- R = 1 - Replaceability (대체 불가능성)
  v_r := 1.0 - p_replaceability;
  if v_r <= 0 then v_r := 0.1; end if;
  
  -- λ = λ_base × (1/R) × I × E × N
  v_lambda := p_base * (1.0 / v_r) * p_influence * p_expertise * p_network;
  
  -- Clamp: 0.5 ≤ λ ≤ 10.0
  v_lambda := greatest(0.5, least(10.0, v_lambda));
  
  return round(v_lambda, 3);
end;
$$ language plpgsql immutable;

-- Sigma 계산 함수
create or replace function calculate_sigma(
  p_compatibility decimal,
  p_goal_alignment decimal,
  p_value_match decimal,
  p_rhythm_sync decimal
) returns decimal as $$
declare
  v_sigma decimal;
begin
  -- σ = w₁C + w₂G + w₃V + w₄R
  -- weights: 0.3, 0.3, 0.2, 0.2
  v_sigma := (0.3 * p_compatibility) + 
             (0.3 * p_goal_alignment) + 
             (0.2 * p_value_match) + 
             (0.2 * p_rhythm_sync);
  
  -- 0-1 범위를 -1 ~ +1로 변환
  v_sigma := (v_sigma * 2) - 1;
  
  -- Clamp: -1.0 ≤ σ ≤ 1.0
  v_sigma := greatest(-1.0, least(1.0, v_sigma));
  
  return round(v_sigma, 3);
end;
$$ language plpgsql immutable;

-- Density 계산 함수
create or replace function calculate_density(
  p_frequency decimal,
  p_depth decimal,
  p_quality decimal
) returns decimal as $$
declare
  v_density decimal;
  v_quality_adj decimal;
begin
  -- Q_adj = Q (품질 조정 - 단순화)
  v_quality_adj := p_quality;
  
  -- P = √(F × D) × Q_adj
  v_density := sqrt(p_frequency * p_depth) * v_quality_adj;
  
  -- Clamp: 0 ≤ P ≤ 1
  v_density := greatest(0, least(1, v_density));
  
  return round(v_density, 3);
end;
$$ language plpgsql immutable;

-- Synergy Multiplier 계산 함수
create or replace function calculate_synergy_multiplier(
  p_sigma decimal,
  p_time_months decimal
) returns decimal as $$
declare
  v_multiplier decimal;
begin
  -- e^(σt)
  v_multiplier := exp(p_sigma * p_time_months);
  return round(v_multiplier, 4);
end;
$$ language plpgsql immutable;

-- Value 계산 함수 (MVP)
create or replace function calculate_value_mvp(
  p_lambda decimal,
  p_time_stu decimal,
  p_density decimal
) returns decimal as $$
begin
  -- V_simple = λ × T × P
  return round(p_lambda * p_time_stu * p_density, 2);
end;
$$ language plpgsql immutable;

-- Value 계산 함수 (Full)
create or replace function calculate_value_full(
  p_density decimal,
  p_lambda_a decimal,
  p_time_a decimal,
  p_lambda_b decimal,
  p_time_b decimal,
  p_sigma decimal,
  p_time_months decimal
) returns decimal as $$
declare
  v_lambda_mutual decimal;
  v_synergy decimal;
  v_value decimal;
begin
  -- Λ = λ_A × t_A→B + λ_B × t_B→A
  v_lambda_mutual := (p_lambda_a * p_time_a) + (p_lambda_b * p_time_b);
  
  -- Synergy = e^(σt)
  v_synergy := exp(p_sigma * p_time_months);
  
  -- V = P × Λ × e^(σt)
  v_value := p_density * v_lambda_mutual * v_synergy;
  
  return round(v_value, 2);
end;
$$ language plpgsql immutable;

-- Churn Risk 계산 함수
create or replace function calculate_churn_risk(
  p_sigma decimal,
  p_duration_months decimal,
  p_activity_drop decimal default 0
) returns jsonb as $$
declare
  v_base_risk decimal;
  v_activity_penalty decimal;
  v_risk decimal;
  v_level text;
  v_days integer;
  v_recommendation text;
begin
  -- 기본 위험도 (σ 기반)
  if p_sigma >= 0.5 then
    v_base_risk := 0.05;
  elsif p_sigma >= 0.2 then
    v_base_risk := 0.15;
  elsif p_sigma >= 0 then
    v_base_risk := 0.3;
  elsif p_sigma >= -0.3 then
    v_base_risk := 0.5;
  else
    v_base_risk := 0.7;
  end if;
  
  -- 활동 감소 페널티
  v_activity_penalty := coalesce(p_activity_drop, 0) * 0.3;
  
  -- 최종 위험도
  v_risk := least(1.0, v_base_risk + v_activity_penalty);
  
  -- 레벨 판정 (5단계)
  if v_risk < 0.1 then
    v_level := 'minimal';
    v_days := 90;
    v_recommendation := '정기 모니터링만 필요';
  elsif v_risk < 0.25 then
    v_level := 'low';
    v_days := 60;
    v_recommendation := '월간 체크인 권장';
  elsif v_risk < 0.45 then
    v_level := 'moderate';
    v_days := 30;
    v_recommendation := '주간 관계 강화 필요';
  elsif v_risk < 0.65 then
    v_level := 'high';
    v_days := 14;
    v_recommendation := '즉시 개입 필요';
  else
    v_level := 'critical';
    v_days := 7;
    v_recommendation := '긴급 대응 필요 - 이탈 임박';
  end if;
  
  return jsonb_build_object(
    'level', v_level,
    'probability', round(v_risk, 3),
    'days_to_action', v_days,
    'recommendation', v_recommendation
  );
end;
$$ language plpgsql immutable;

-- Efficiency 계산 함수
create or replace function calculate_efficiency(
  p_output_value decimal,
  p_input_value decimal
) returns decimal as $$
begin
  if p_input_value <= 0 then return 0; end if;
  return round(p_output_value / p_input_value, 2);
end;
$$ language plpgsql immutable;

-- Sigma from Results 역산 함수
create or replace function calculate_sigma_from_results(
  p_result_value decimal,
  p_input_value decimal
) returns decimal as $$
declare
  v_sigma decimal;
begin
  if p_input_value <= 0 or p_input_value = 1 or p_result_value <= 0 then
    return 0;
  end if;
  
  -- σ = log(A) / log(T)
  v_sigma := ln(p_result_value) / ln(p_input_value);
  
  -- Clamp: -1.0 ≤ σ ≤ 3.0
  v_sigma := greatest(-1.0, least(3.0, v_sigma));
  
  return round(v_sigma, 3);
end;
$$ language plpgsql immutable;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated At 자동 업데이트 함수
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 각 테이블에 Updated At 트리거 적용
do $$
declare
  t text;
  tables text[] := array[
    'orgs', 'users', 'org_members', 'relational_nodes',
    'node_lambdas', 'relationship_sigmas', 'relationship_densities',
    'physics_metrics', 'risk_queue', 'chemistry_matches',
    'assets', 'physics_config'
  ];
begin
  foreach t in array tables
  loop
    execute format('
      drop trigger if exists %I_updated_at on public.%I;
      create trigger %I_updated_at
        before update on public.%I
        for each row execute function update_updated_at();
    ', t, t, t, t);
  end loop;
end $$;

-- ============================================
-- VIEWS
-- ============================================

-- Node Value Summary View
create or replace view public.v_node_value_summary as
select
  n.id as node_id,
  n.org_id,
  n.name,
  n.node_type,
  n.status,
  nl.lambda,
  pm.v_value,
  pm.s_index,
  pm.m_score,
  pm.r_score,
  pm.churn_probability,
  nl.calculated_at as lambda_updated_at,
  pm.calculated_at as metrics_updated_at
from public.relational_nodes n
left join public.node_lambdas nl on n.id = nl.node_id
left join public.physics_metrics pm on n.id = pm.node_id;

-- Relationship Value Summary View
create or replace view public.v_relationship_summary as
select
  rs.org_id,
  rs.node_a_id,
  rs.node_b_id,
  na.name as node_a_name,
  nb.name as node_b_name,
  rs.sigma,
  rd.density,
  calculate_synergy_multiplier(rs.sigma, 12) as synergy_multiplier_12m
from public.relationship_sigmas rs
join public.relational_nodes na on rs.node_a_id = na.id
join public.relational_nodes nb on rs.node_b_id = nb.id
left join public.relationship_densities rd 
  on rs.node_a_id = rd.node_a_id 
  and rs.node_b_id = rd.node_b_id;

-- Risk Queue Dashboard View
create or replace view public.v_risk_dashboard as
select
  rq.org_id,
  rq.status,
  count(*) as count,
  avg(rq.risk_score) as avg_risk_score,
  avg(rq.priority) as avg_priority,
  min(rq.created_at) as oldest_item,
  max(rq.created_at) as newest_item
from public.risk_queue rq
group by rq.org_id, rq.status;

-- ============================================
-- COMMENTS
-- ============================================

comment on table public.orgs is 'AUTUS 조직 테이블';
comment on table public.users is 'AUTUS 사용자 테이블';
comment on table public.relational_nodes is '관계 노드 (학생, 학부모, 교사 등)';
comment on table public.node_lambdas is 'Node Lambda (λ) - 노드 시간 상수';
comment on table public.relationship_sigmas is 'Relationship Sigma (σ) - 시너지 계수';
comment on table public.relationship_densities is 'Relationship Density (P) - 관계 밀도';
comment on table public.time_records is '시간 활동 기록 (T1, T2, T3)';
comment on table public.value_snapshots is '가치 스냅샷 (조직 전체 V 값)';
comment on table public.physics_metrics is '물리 메트릭 (노드별 V, S, M, R 점수)';
comment on table public.risk_queue is '위험 대기열 (이탈 위험 관리)';
comment on table public.interaction_logs is '상호작용 로그 (AI 분석 포함)';
comment on table public.quick_tags is 'Quick Tag 기록 (실시간 태깅)';
comment on table public.chemistry_matches is '케미스트리 매칭 (최적 조합 추천)';
comment on table public.global_consolidation is '글로벌 통합 (한국+필리핀)';
comment on table public.assets is '자산 포트폴리오';
comment on table public.efficiency_metrics is '효율 메트릭';
comment on table public.sigma_proxy_data is '시그마 프록시 데이터 (예측용)';
comment on table public.safety_mirror_reports is 'Safety Mirror 리포트';
comment on table public.shield_activation_logs is 'Active Shield 작동 로그';

comment on function calculate_lambda is 'Lambda (λ) 계산: λ = λ_base × (1/R) × I × E × N';
comment on function calculate_sigma is 'Sigma (σ) 계산: σ = w₁C + w₂G + w₃V + w₄R';
comment on function calculate_density is 'Density (P) 계산: P = √(F × D) × Q_adj';
comment on function calculate_value_mvp is 'Value MVP 계산: V = λ × T × P';
comment on function calculate_value_full is 'Value Full 계산: V = P × Λ × e^(σt)';
comment on function calculate_churn_risk is '이탈 위험도 계산 (5단계)';
