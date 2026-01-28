-- ═══════════════════════════════════════════════════════════════════════════
-- 🏛️ KRATON v2 - 전체 통합 스키마
-- 
-- V = (M - T) × (1 + s)^t
-- R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
-- P = (M × I × A) / R
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PART 1: Core Tables
-- ============================================================================

-- 조직 (학원/센터)
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'academy',
  region text default 'korea', -- korea, philippines
  timezone text default 'Asia/Seoul',
  settings jsonb default '{}',
  meta jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  name text not null,
  avatar_url text,
  meta jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 조직 멤버 (3-Tier 역할)
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('c_level', 'fsd', 'optimus', 'consumer', 'regulatory', 'partner')),
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  permissions jsonb default '[]',
  meta jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, user_id)
);

-- ============================================================================
-- PART 2: Relational Physics Tables
-- ============================================================================

-- 관계 노드 (학생, 학부모, 선생님)
create table if not exists public.relational_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_type text not null check (node_type in ('student', 'parent', 'teacher', 'staff')),
  name text not null,
  status text default 'active' check (status in ('active', 'inactive', 'churned')),
  grade text,
  class_name text,
  phone text,
  email text,
  tags text[] default '{}',
  meta jsonb default '{}', -- s_index, bond_strength, ai_flags 등
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index relational_nodes_org_type_idx on public.relational_nodes (org_id, node_type, status);

-- 상호작용 로그 (Quick Tag 데이터)
create table if not exists public.interaction_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references public.users(id),
  target_id uuid not null,
  target_type text not null check (target_type in ('student', 'parent', 'teacher')),
  interaction_type text not null, -- quick_tag, call, meeting, message
  raw_content text, -- Voice-to-Insight 원본
  tags text[] default '{}',
  vectorized_data jsonb default '{}', -- emotion_delta, bond_strength, issue_triggers
  ai_analysis jsonb, -- Claude 분석 결과
  created_at timestamptz not null default now()
);

create index interaction_logs_org_type_idx on public.interaction_logs (org_id, interaction_type, created_at desc);
create index interaction_logs_target_idx on public.interaction_logs (target_id, created_at desc);

-- Physics 메트릭스
create table if not exists public.physics_metrics (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null unique,
  s_index numeric default 50, -- 만족도 (0-100)
  m_score numeric default 50, -- 성과 점수 (0-100)
  bond_strength numeric default 50, -- 유대 강도 (0-100)
  r_score numeric default 0, -- 위험도 (0-100)
  churn_probability numeric default 0, -- 이탈 확률 (0-1)
  predicted_v numeric default 0, -- 예상 V 창출
  last_interaction_at timestamptz,
  meta jsonb default '{}',
  updated_at timestamptz not null default now()
);

create index physics_metrics_r_score_idx on public.physics_metrics (r_score desc);

-- ============================================================================
-- PART 3: Risk Queue (FSD)
-- ============================================================================

-- 위험 큐
create table if not exists public.risk_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  target_node uuid not null unique,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score numeric not null default 0, -- R(t) 계산 결과
  signals text[] default '{}', -- 위험 신호 목록
  suggested_action text,
  predicted_churn_days integer,
  estimated_value numeric default 0, -- 예상 손실 가치
  status text default 'open' check (status in ('open', 'resolved', 'dismissed', 'escalated')),
  assigned_to uuid references public.users(id),
  assigned_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  meta jsonb default '{}', -- contributing_factors, auto_actuation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index risk_queue_org_status_idx on public.risk_queue (org_id, status, priority desc);
create index risk_queue_risk_score_idx on public.risk_queue (risk_score desc);

-- ============================================================================
-- PART 4: 3-Tier Authentication
-- ============================================================================

-- 승인 코드
create table if not exists public.approval_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  org_id uuid not null references public.orgs(id) on delete cascade,
  issued_by uuid not null references public.users(id),
  issuer_role text not null,
  target_role text not null check (target_role in ('fsd', 'optimus')),
  expires_at timestamptz not null,
  used boolean default false,
  used_by uuid references public.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index approval_codes_lookup_idx on public.approval_codes (code, org_id, used);

-- ============================================================================
-- PART 5: Immortal Ledger
-- ============================================================================

-- 불변 이벤트 로그
create table if not exists public.immortal_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references public.users(id),
  role text, -- 실행자 역할
  action_type text not null, -- quick_tag, risk_resolve, chemistry_match, tier_login, etc.
  entity_type text, -- student, risk, user, etc.
  entity_id text,
  semantic_hash text, -- 의미론적 해시
  content_redacted text, -- PII 마스킹된 내용
  outcome_delta_v numeric default 0, -- V 변화량
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

create index immortal_events_org_action_idx on public.immortal_events (org_id, action_type, created_at desc);
create index immortal_events_entity_idx on public.immortal_events (entity_type, entity_id, created_at desc);

-- ============================================================================
-- PART 6: Financial & Global
-- ============================================================================

-- 재무 트랜잭션
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  type text not null check (type in ('revenue', 'cost', 'salary', 'tax', 'investment')),
  amount numeric not null,
  currency text default 'KRW',
  region text default 'korea',
  category text,
  description text,
  reference_id text,
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

create index financial_transactions_org_type_idx on public.financial_transactions (org_id, type, created_at desc);

-- 글로벌 통합 로그
create table if not exists public.consolidation_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  consolidation_type text not null, -- daily, weekly, monthly
  korea_v numeric default 0,
  philippines_v numeric default 0,
  global_v numeric default 0,
  synergy_factor numeric default 1.0,
  exchange_rate jsonb default '{}',
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Owner Console State
create table if not exists public.owner_console_state (
  id text primary key,
  org_id uuid references public.orgs(id),
  consolidated_v numeric default 0,
  exit_valuation numeric default 0,
  reinvestment_capacity numeric default 0,
  last_consolidation_at timestamptz,
  meta jsonb default '{}',
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PART 7: Chemistry Matching
-- ============================================================================

-- Chemistry 매칭 기록
create table if not exists public.chemistry_matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  teacher_id uuid not null,
  student_id uuid not null,
  compatibility_score numeric not null, -- 0-100
  teaching_style text,
  learning_style text,
  predicted_v_creation numeric default 0,
  recommendation text check (recommendation in ('excellent', 'good', 'neutral', 'poor')),
  synergy_points text[] default '{}',
  risk_points text[] default '{}',
  status text default 'active' check (status in ('active', 'ended', 'pending')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  outcome text, -- success, neutral, failure
  actual_duration_months integer,
  actual_v_created numeric default 0,
  meta jsonb default '{}',
  created_at timestamptz not null default now(),
  unique(teacher_id, student_id)
);

create index chemistry_matches_org_idx on public.chemistry_matches (org_id, status);

-- ============================================================================
-- PART 8: Audit Logs
-- ============================================================================

-- 감사 로그
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  audit_type text not null, -- perception, physics_calibration, v_curve_validation
  audit_result jsonb not null,
  created_at timestamptz not null default now()
);

-- Physics 설정
create table if not exists public.physics_config (
  id text primary key,
  org_id uuid references public.orgs(id),
  weight_i numeric[] default '{1.0, 1.2, 1.4, 1.6, 1.8}',
  alpha numeric default 1.5,
  critical_threshold numeric default 70,
  high_threshold numeric default 50,
  medium_threshold numeric default 30,
  meta jsonb default '{}',
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PART 9: Functions & Triggers
-- ============================================================================

-- R(t) 계산 함수
create or replace function calculate_risk_score(
  p_satisfaction numeric,
  p_performance_delta numeric,
  p_alpha numeric default 1.5
) returns numeric as $$
declare
  v_result numeric;
begin
  -- R(t) = -delta / s^alpha
  v_result := -p_performance_delta / power(greatest(0.1, p_satisfaction / 100), p_alpha);
  -- 정규화: 50 + result * 10
  v_result := 50 + v_result * 10;
  -- 0-100 범위로 클램프
  return least(100, greatest(0, v_result));
end;
$$ language plpgsql;

-- V-Index 계산 함수
create or replace function calculate_v_index(
  p_mint numeric,
  p_tax numeric,
  p_satisfaction numeric,
  p_months integer
) returns numeric as $$
begin
  -- V = (M - T) × (1 + s)^t
  return (p_mint - p_tax) * power(1 + (p_satisfaction / 100), p_months);
end;
$$ language plpgsql;

-- 위험도 업데이트 트리거
create or replace function update_risk_on_interaction()
returns trigger as $$
declare
  v_current_s numeric;
  v_delta numeric;
  v_risk_score numeric;
  v_priority text;
begin
  -- 현재 s_index 조회
  select coalesce(s_index, 50) into v_current_s
  from public.physics_metrics
  where node_id = new.target_id;
  
  -- emotion_delta 추출
  v_delta := coalesce((new.vectorized_data->>'emotion_delta')::numeric, 0);
  
  -- 위험도 계산
  v_risk_score := calculate_risk_score(v_current_s, v_delta);
  
  -- 우선순위 결정
  if v_risk_score >= 80 then
    v_priority := 'CRITICAL';
  elsif v_risk_score >= 60 then
    v_priority := 'HIGH';
  elsif v_risk_score >= 40 then
    v_priority := 'MEDIUM';
  else
    v_priority := 'LOW';
  end if;
  
  -- Physics 메트릭스 업데이트
  insert into public.physics_metrics (node_id, s_index, r_score, updated_at)
  values (new.target_id, v_current_s + v_delta, v_risk_score, now())
  on conflict (node_id) do update set
    s_index = greatest(0, least(100, physics_metrics.s_index + v_delta)),
    r_score = v_risk_score,
    last_interaction_at = now(),
    updated_at = now();
  
  -- 위험도가 높으면 Risk Queue 업데이트
  if v_risk_score >= 40 then
    insert into public.risk_queue (org_id, target_node, priority, risk_score, status, updated_at)
    values (new.org_id, new.target_id, v_priority, v_risk_score, 'open', now())
    on conflict (target_node) do update set
      priority = v_priority,
      risk_score = v_risk_score,
      updated_at = now();
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_update_risk_on_interaction
  after insert on public.interaction_logs
  for each row
  when (new.interaction_type = 'quick_tag')
  execute function update_risk_on_interaction();

-- ============================================================================
-- PART 10: Row Level Security
-- ============================================================================

-- RLS 활성화
alter table public.orgs enable row level security;
alter table public.users enable row level security;
alter table public.org_members enable row level security;
alter table public.relational_nodes enable row level security;
alter table public.interaction_logs enable row level security;
alter table public.physics_metrics enable row level security;
alter table public.risk_queue enable row level security;
alter table public.approval_codes enable row level security;
alter table public.immortal_events enable row level security;
alter table public.financial_transactions enable row level security;

-- 조직 접근 함수
create or replace function get_user_org_ids()
returns setof uuid as $$
  select org_id from public.org_members
  where user_id = auth.uid()
$$ language sql security definer;

-- 기본 RLS 정책
create policy "org_members_policy" on public.org_members
  for all using (org_id in (select get_user_org_ids()));

create policy "relational_nodes_policy" on public.relational_nodes
  for all using (org_id in (select get_user_org_ids()));

create policy "interaction_logs_policy" on public.interaction_logs
  for all using (org_id in (select get_user_org_ids()));

create policy "risk_queue_policy" on public.risk_queue
  for all using (org_id in (select get_user_org_ids()));

create policy "approval_codes_policy" on public.approval_codes
  for all using (org_id in (select get_user_org_ids()));

create policy "immortal_events_policy" on public.immortal_events
  for all using (org_id in (select get_user_org_ids()));

-- ============================================================================
-- PART 11: Views
-- ============================================================================

-- Risk Dashboard View
create or replace view v_risk_dashboard as
select
  rq.id,
  rq.org_id,
  rq.target_node,
  rq.priority,
  rq.risk_score,
  rq.signals,
  rq.predicted_churn_days,
  rq.estimated_value,
  rq.status,
  rn.name as student_name,
  rn.grade,
  rn.class_name,
  pm.s_index,
  pm.bond_strength,
  rq.created_at
from public.risk_queue rq
left join public.relational_nodes rn on rq.target_node = rn.id
left join public.physics_metrics pm on rq.target_node = pm.node_id
where rq.status = 'open'
order by rq.risk_score desc;

-- Global V-Index View
create or replace view v_global_trend as
select
  date_trunc('day', created_at) as date,
  sum(case when region = 'korea' then amount else 0 end) as korea_revenue,
  sum(case when region = 'philippines' then amount else 0 end) as philippines_revenue,
  sum(amount) as total_revenue
from public.financial_transactions
where type = 'revenue'
group by date_trunc('day', created_at)
order by date desc;

-- ============================================================================
-- 완료
-- ============================================================================
