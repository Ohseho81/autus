-- ═══════════════════════════════════════════════════════════════════════════
-- ⏱️ AUTUS 시간 측정 체계 - Database Schema
-- 
-- V = P × Λ × e^(σt)
-- NRV = P × (T₃ - T₁ + T₂) × e^(σt)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- node_lambda: 노드별 λ (시간상수) 정보
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.node_lambda (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 현재 λ 값
  lambda numeric(10, 4) not null default 1.0,
  
  -- λ 구성 요소 (LambdaFactors)
  replaceability numeric(5, 4) not null default 0.5,  -- R: 0~1
  influence numeric(5, 4) not null default 0.5,       -- I: 0~1
  expertise numeric(5, 4) not null default 0.5,       -- E: 0~1
  network numeric(5, 4) not null default 0.5,         -- N: 0~1
  
  -- 보정 상수
  industry_k numeric(5, 4) not null default 0.3,
  
  -- 성장률 (γ, 연간)
  growth_rate numeric(6, 4) not null default 0.0,
  
  -- 기준 시점 (λ 계산 기준일)
  base_date timestamptz not null default now(),
  
  -- 역할 기반 기본값
  role_default_lambda numeric(10, 4) not null default 1.0,
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 노드당 하나의 λ 레코드
  constraint unique_node_lambda unique (node_id)
);

-- 인덱스
create index idx_node_lambda_org on public.node_lambda (org_id);
create index idx_node_lambda_lambda on public.node_lambda (lambda desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- lambda_history: λ 변화 이력
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.lambda_history (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  lambda_before numeric(10, 4) not null,
  lambda_after numeric(10, 4) not null,
  
  change_reason text not null check (change_reason in (
    'performance', 'learning', 'network', 'role_change', 'manual', 'decay', 'system'
  )),
  
  change_details jsonb default '{}'::jsonb,
  
  recorded_at timestamptz not null default now()
);

-- 인덱스
create index idx_lambda_history_node on public.lambda_history (node_id, recorded_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- relationship_sigma: 관계별 σ (시너지 계수)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.relationship_sigma (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 노드
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  
  -- 현재 σ 값 (-1 ~ +1)
  sigma numeric(6, 4) not null default 0.0,
  
  -- σ 구성 요소 (SigmaFactors)
  compatibility numeric(6, 4) not null default 0.0,   -- C: -1 ~ +1
  goal_alignment numeric(6, 4) not null default 0.0,  -- G: -1 ~ +1
  value_match numeric(6, 4) not null default 0.0,     -- V: -1 ~ +1
  rhythm_sync numeric(6, 4) not null default 0.0,     -- R: -1 ~ +1
  
  -- 가중치
  weight_c numeric(4, 3) not null default 0.3,
  weight_g numeric(4, 3) not null default 0.3,
  weight_v numeric(4, 3) not null default 0.2,
  weight_r numeric(4, 3) not null default 0.2,
  
  -- 시너지 상태
  synergy_status text not null default 'neutral' check (synergy_status in ('positive', 'neutral', 'negative')),
  
  -- 측정 기반
  measurement_basis text not null default 'behavior' check (measurement_basis in (
    'survey', 'ai_analysis', 'behavior', 'combined'
  )),
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 관계당 하나의 σ 레코드 (방향 무관)
  constraint unique_relationship_sigma unique (least(node_a_id, node_b_id), greatest(node_a_id, node_b_id))
);

-- 인덱스
create index idx_relationship_sigma_org on public.relationship_sigma (org_id);
create index idx_relationship_sigma_nodes on public.relationship_sigma (node_a_id, node_b_id);
create index idx_relationship_sigma_value on public.relationship_sigma (sigma desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- relationship_density: 관계별 P (밀도)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.relationship_density (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 노드
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  
  -- 현재 P 값 (0 ~ 1)
  density numeric(5, 4) not null default 0.0,
  
  -- P 구성 요소 (DensityFactors)
  frequency numeric(5, 4) not null default 0.0,  -- F: 0~1
  quality numeric(5, 4) not null default 0.0,    -- Q: 0~1
  depth numeric(5, 4) not null default 0.0,      -- D: 0~1
  
  -- 관계 깊이 단계
  depth_level text not null default 'awareness' check (depth_level in (
    'awareness', 'familiarity', 'trust', 'dependence', 'partnership'
  )),
  
  -- 마지막 상호작용
  last_interaction_at timestamptz not null default now(),
  
  -- 유휴 일수
  idle_days integer not null default 0,
  
  -- 감쇠율 (δ)
  decay_rate numeric(6, 5) not null default 0.01,
  
  -- 감쇠 적용 후 P
  density_decayed numeric(5, 4) not null default 0.0,
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 관계당 하나의 밀도 레코드
  constraint unique_relationship_density unique (least(node_a_id, node_b_id), greatest(node_a_id, node_b_id))
);

-- 인덱스
create index idx_relationship_density_org on public.relationship_density (org_id);
create index idx_relationship_density_nodes on public.relationship_density (node_a_id, node_b_id);
create index idx_relationship_density_value on public.relationship_density (density desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- time_activities: 시간 활동 기록
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.time_activities (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 활동 유형
  activity_type text not null,
  
  -- 실제 시간 (시간 단위)
  real_time_hours numeric(10, 4) not null,
  
  -- 활동 시점의 λ
  lambda_at_time numeric(10, 4) not null,
  
  -- STU 값 (real_time_hours × lambda_at_time)
  stu_value numeric(12, 4) not null,
  
  -- 시간 성격
  time_nature text not null check (time_nature in ('t1_invested', 't2_saved', 't3_created')),
  
  -- 관련 대상
  target_id uuid,
  target_type text,
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  -- 기록 시점
  recorded_at timestamptz not null default now()
);

-- 인덱스
create index idx_time_activities_node on public.time_activities (node_id, recorded_at desc);
create index idx_time_activities_org on public.time_activities (org_id, recorded_at desc);
create index idx_time_activities_nature on public.time_activities (time_nature, recorded_at desc);
create index idx_time_activities_type on public.time_activities (activity_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- time_metrics: 노드별 시간 메트릭스 (집계)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.time_metrics (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.relational_nodes(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 기간
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  
  -- T₁, T₂, T₃ (STU)
  t1_invested numeric(12, 4) not null default 0,
  t2_saved numeric(12, 4) not null default 0,
  t3_created numeric(12, 4) not null default 0,
  
  -- 순시간가치 (NTV = T₃ - T₁ + T₂)
  net_time_value numeric(14, 4) not null default 0,
  
  -- 효율성 비율 = (T₂ + T₃) / T₁
  efficiency_ratio numeric(8, 4) not null default 0,
  
  -- 시간 ROI = NTV / T₁
  time_roi numeric(8, 4) not null default 0,
  
  -- 세부 내역
  breakdown jsonb default '{
    "t1_by_activity": {},
    "t2_by_automation": {},
    "t3_by_projection": {}
  }'::jsonb,
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 노드 + 기간 유니크
  constraint unique_time_metrics unique (node_id, period, period_start)
);

-- 인덱스
create index idx_time_metrics_node on public.time_metrics (node_id, period_start desc);
create index idx_time_metrics_org on public.time_metrics (org_id, period, period_start desc);
create index idx_time_metrics_ntv on public.time_metrics (net_time_value desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- org_omega: 조직별 ω (시간 단가)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.org_omega (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 현재 ω 값 (원/STU)
  omega numeric(12, 2) not null default 30000,
  
  -- 계산 기반
  total_revenue numeric(16, 2) not null default 0,
  total_stu_invested numeric(14, 4) not null default 0,
  calculation_period text not null default 'monthly',
  
  -- 기준 기간
  period_start timestamptz not null,
  period_end timestamptz not null,
  
  -- 업계 벤치마크
  industry_benchmark numeric(12, 2),
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint unique_org_omega unique (org_id, period_start)
);

-- 인덱스
create index idx_org_omega_org on public.org_omega (org_id, period_start desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- relationship_value: 관계 가치 계산 결과
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.relationship_value (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 노드
  node_a_id uuid not null references public.relational_nodes(id) on delete cascade,
  node_b_id uuid not null references public.relational_nodes(id) on delete cascade,
  
  -- V = P × Λ × e^(σt)
  value_stu numeric(14, 4) not null default 0,
  value_money numeric(16, 2) not null default 0,
  
  -- 구성 요소
  density numeric(5, 4) not null default 0,           -- P
  mutual_time_value numeric(12, 4) not null default 0, -- Λ
  sigma numeric(6, 4) not null default 0,             -- σ
  time_months integer not null default 0,             -- t
  synergy_multiplier numeric(10, 4) not null default 1, -- e^(σt)
  
  -- 관계 건강도
  health_score integer not null default 50,
  health_status text not null default 'fair' check (health_status in (
    'excellent', 'good', 'fair', 'poor', 'critical'
  )),
  
  -- 예측
  prediction_3months numeric(14, 4),
  prediction_6months numeric(14, 4),
  prediction_12months numeric(14, 4),
  
  -- 권장 사항
  recommendations text[],
  
  -- 메타데이터
  meta jsonb default '{}'::jsonb,
  
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 관계당 하나의 가치 레코드
  constraint unique_relationship_value unique (least(node_a_id, node_b_id), greatest(node_a_id, node_b_id))
);

-- 인덱스
create index idx_relationship_value_org on public.relationship_value (org_id);
create index idx_relationship_value_nodes on public.relationship_value (node_a_id, node_b_id);
create index idx_relationship_value_stu on public.relationship_value (value_stu desc);
create index idx_relationship_value_health on public.relationship_value (health_status, health_score desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- λ 계산 함수: λ = (1/R) × I × E × N × k
create or replace function calculate_lambda(
  p_replaceability numeric,
  p_influence numeric,
  p_expertise numeric,
  p_network numeric,
  p_industry_k numeric default 0.3
) returns numeric as $$
declare
  v_r_inverse numeric;
  v_raw_lambda numeric;
begin
  -- 대체가능성의 역수 (최소 1)
  v_r_inverse := 1.0 / greatest(0.05, p_replaceability);
  
  -- λ 계산
  v_raw_lambda := v_r_inverse * p_influence * p_expertise * p_network * p_industry_k;
  
  -- 최소값 1.0 보정
  return greatest(1.0, v_raw_lambda);
end;
$$ language plpgsql immutable;

-- σ 계산 함수: σ = w₁C + w₂G + w₃V + w₄R
create or replace function calculate_sigma(
  p_compatibility numeric,
  p_goal_alignment numeric,
  p_value_match numeric,
  p_rhythm_sync numeric,
  p_weight_c numeric default 0.3,
  p_weight_g numeric default 0.3,
  p_weight_v numeric default 0.2,
  p_weight_r numeric default 0.2
) returns numeric as $$
begin
  return (p_weight_c * p_compatibility) +
         (p_weight_g * p_goal_alignment) +
         (p_weight_v * p_value_match) +
         (p_weight_r * p_rhythm_sync);
end;
$$ language plpgsql immutable;

-- P 계산 함수: P = F × Q × D
create or replace function calculate_density(
  p_frequency numeric,
  p_quality numeric,
  p_depth numeric
) returns numeric as $$
begin
  return p_frequency * p_quality * p_depth;
end;
$$ language plpgsql immutable;

-- 시너지 배율 계산: e^(σt)
create or replace function calculate_synergy_multiplier(
  p_sigma numeric,
  p_time_months integer
) returns numeric as $$
declare
  v_years numeric;
begin
  v_years := p_time_months / 12.0;
  return exp(p_sigma * v_years);
end;
$$ language plpgsql immutable;

-- 관계 가치 계산: V = P × Λ × e^(σt)
create or replace function calculate_relationship_value(
  p_density numeric,
  p_mutual_time_value numeric,
  p_sigma numeric,
  p_time_months integer
) returns numeric as $$
begin
  return p_density * p_mutual_time_value * calculate_synergy_multiplier(p_sigma, p_time_months);
end;
$$ language plpgsql immutable;

-- NTV 계산: NTV = T₃ - T₁ + T₂
create or replace function calculate_ntv(
  p_t1 numeric,
  p_t2 numeric,
  p_t3 numeric
) returns numeric as $$
begin
  return p_t3 - p_t1 + p_t2;
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers
-- ═══════════════════════════════════════════════════════════════════════════

-- node_lambda 업데이트 시 λ 자동 계산
create or replace function trg_update_lambda() returns trigger as $$
begin
  -- λ 재계산
  new.lambda := calculate_lambda(
    new.replaceability,
    new.influence,
    new.expertise,
    new.network,
    new.industry_k
  );
  
  -- 시너지 상태 업데이트
  new.updated_at := now();
  
  -- 이력 기록
  if old.lambda is distinct from new.lambda then
    insert into public.lambda_history (
      node_id, org_id, lambda_before, lambda_after, change_reason, change_details
    ) values (
      new.node_id, new.org_id, coalesce(old.lambda, 0), new.lambda, 'system',
      jsonb_build_object(
        'trigger', 'trg_update_lambda',
        'factors_changed', jsonb_build_object(
          'replaceability', new.replaceability,
          'influence', new.influence,
          'expertise', new.expertise,
          'network', new.network
        )
      )
    );
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_node_lambda_update
  before update on public.node_lambda
  for each row
  execute function trg_update_lambda();

-- relationship_sigma 업데이트 시 σ 자동 계산
create or replace function trg_update_sigma() returns trigger as $$
begin
  -- σ 재계산
  new.sigma := calculate_sigma(
    new.compatibility,
    new.goal_alignment,
    new.value_match,
    new.rhythm_sync,
    new.weight_c,
    new.weight_g,
    new.weight_v,
    new.weight_r
  );
  
  -- 시너지 상태 업데이트
  if new.sigma > 0.1 then
    new.synergy_status := 'positive';
  elsif new.sigma < -0.1 then
    new.synergy_status := 'negative';
  else
    new.synergy_status := 'neutral';
  end if;
  
  new.updated_at := now();
  
  return new;
end;
$$ language plpgsql;

create trigger trg_relationship_sigma_update
  before insert or update on public.relationship_sigma
  for each row
  execute function trg_update_sigma();

-- relationship_density 업데이트 시 P 자동 계산
create or replace function trg_update_density() returns trigger as $$
begin
  -- P 재계산
  new.density := calculate_density(new.frequency, new.quality, new.depth);
  
  -- 유휴 일수 계산
  new.idle_days := extract(day from now() - new.last_interaction_at)::integer;
  
  -- 감쇠 적용
  new.density_decayed := new.density * exp(-new.decay_rate * new.idle_days);
  
  new.updated_at := now();
  
  return new;
end;
$$ language plpgsql;

create trigger trg_relationship_density_update
  before insert or update on public.relationship_density
  for each row
  execute function trg_update_density();

-- time_activities 삽입 시 STU 자동 계산
create or replace function trg_calculate_stu() returns trigger as $$
begin
  new.stu_value := new.real_time_hours * new.lambda_at_time;
  return new;
end;
$$ language plpgsql;

create trigger trg_time_activities_insert
  before insert on public.time_activities
  for each row
  execute function trg_calculate_stu();

-- time_metrics 업데이트 시 NTV 자동 계산
create or replace function trg_update_time_metrics() returns trigger as $$
begin
  -- NTV 재계산
  new.net_time_value := calculate_ntv(new.t1_invested, new.t2_saved, new.t3_created);
  
  -- 효율성 비율
  if new.t1_invested > 0 then
    new.efficiency_ratio := (new.t2_saved + new.t3_created) / new.t1_invested;
    new.time_roi := new.net_time_value / new.t1_invested;
  else
    new.efficiency_ratio := 0;
    new.time_roi := 0;
  end if;
  
  new.updated_at := now();
  
  return new;
end;
$$ language plpgsql;

create trigger trg_time_metrics_update
  before insert or update on public.time_metrics
  for each row
  execute function trg_update_time_metrics();

-- ═══════════════════════════════════════════════════════════════════════════
-- Views
-- ═══════════════════════════════════════════════════════════════════════════

-- 조직별 시간 가치 대시보드 뷰
create or replace view v_time_value_dashboard as
select
  o.id as org_id,
  o.name as org_name,
  oo.omega,
  coalesce(sum(tm.t1_invested), 0) as total_t1,
  coalesce(sum(tm.t2_saved), 0) as total_t2,
  coalesce(sum(tm.t3_created), 0) as total_t3,
  coalesce(sum(tm.net_time_value), 0) as total_ntv,
  coalesce(sum(tm.net_time_value) * oo.omega, 0) as total_ntv_money,
  coalesce(avg(tm.efficiency_ratio), 0) as avg_efficiency,
  count(distinct nl.node_id) as total_nodes,
  coalesce(avg(nl.lambda), 1) as avg_lambda,
  count(distinct rv.id) as total_relationships,
  coalesce(sum(rv.value_stu), 0) as total_relationship_value
from public.orgs o
left join public.org_omega oo on o.id = oo.org_id
left join public.time_metrics tm on o.id = tm.org_id and tm.period = 'monthly'
left join public.node_lambda nl on o.id = nl.org_id
left join public.relationship_value rv on o.id = rv.org_id
group by o.id, o.name, oo.omega;

-- 노드별 시간 가치 요약 뷰
create or replace view v_node_time_summary as
select
  nl.node_id,
  nl.org_id,
  rn.name as node_name,
  rn.role as node_role,
  nl.lambda,
  coalesce(tm.t1_invested, 0) as t1_invested,
  coalesce(tm.t2_saved, 0) as t2_saved,
  coalesce(tm.t3_created, 0) as t3_created,
  coalesce(tm.net_time_value, 0) as net_time_value,
  coalesce(tm.efficiency_ratio, 0) as efficiency_ratio,
  count(distinct rv.id) as relationship_count,
  coalesce(sum(rv.value_stu), 0) as total_relationship_value
from public.node_lambda nl
join public.relational_nodes rn on nl.node_id = rn.id
left join public.time_metrics tm on nl.node_id = tm.node_id and tm.period = 'monthly'
left join public.relationship_value rv on (nl.node_id = rv.node_a_id or nl.node_id = rv.node_b_id)
group by nl.node_id, nl.org_id, rn.name, rn.role, nl.lambda, tm.t1_invested, tm.t2_saved, tm.t3_created, tm.net_time_value, tm.efficiency_ratio;

-- 관계 가치 랭킹 뷰
create or replace view v_relationship_ranking as
select
  rv.id,
  rv.org_id,
  rv.node_a_id,
  rn_a.name as node_a_name,
  rv.node_b_id,
  rn_b.name as node_b_name,
  rv.value_stu,
  rv.value_money,
  rv.density,
  rv.sigma,
  rv.synergy_multiplier,
  rv.health_score,
  rv.health_status,
  rv.time_months,
  row_number() over (partition by rv.org_id order by rv.value_stu desc) as rank_by_value,
  row_number() over (partition by rv.org_id order by rv.sigma desc) as rank_by_sigma
from public.relationship_value rv
join public.relational_nodes rn_a on rv.node_a_id = rn_a.id
join public.relational_nodes rn_b on rv.node_b_id = rn_b.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.node_lambda enable row level security;
alter table public.lambda_history enable row level security;
alter table public.relationship_sigma enable row level security;
alter table public.relationship_density enable row level security;
alter table public.time_activities enable row level security;
alter table public.time_metrics enable row level security;
alter table public.org_omega enable row level security;
alter table public.relationship_value enable row level security;

-- 조직 접근 정책 (get_user_org_ids() 함수 사용 가정)
create policy "node_lambda_org" on public.node_lambda for all using (org_id in (select get_user_org_ids()));
create policy "lambda_history_org" on public.lambda_history for all using (org_id in (select get_user_org_ids()));
create policy "relationship_sigma_org" on public.relationship_sigma for all using (org_id in (select get_user_org_ids()));
create policy "relationship_density_org" on public.relationship_density for all using (org_id in (select get_user_org_ids()));
create policy "time_activities_org" on public.time_activities for all using (org_id in (select get_user_org_ids()));
create policy "time_metrics_org" on public.time_metrics for all using (org_id in (select get_user_org_ids()));
create policy "org_omega_org" on public.org_omega for all using (org_id in (select get_user_org_ids()));
create policy "relationship_value_org" on public.relationship_value for all using (org_id in (select get_user_org_ids()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 초기 데이터: 역할별 기본 λ 값
-- ═══════════════════════════════════════════════════════════════════════════

-- 역할별 기본 λ 참조 테이블
create table if not exists public.role_default_lambda (
  role text primary key,
  default_lambda numeric(10, 4) not null,
  description text
);

insert into public.role_default_lambda (role, default_lambda, description) values
  ('c_level', 5.0, '원장/CEO'),
  ('fsd', 3.0, '팀장급'),
  ('optimus', 1.5, '실무자'),
  ('consumer', 1.0, '학생/학부모'),
  ('regulatory', 2.0, '규제기관'),
  ('partner', 2.5, '파트너'),
  ('senior_teacher', 2.5, '시니어 강사'),
  ('teacher', 2.0, '강사'),
  ('junior_teacher', 1.5, '주니어 강사'),
  ('admin', 1.5, '행정직'),
  ('student', 1.0, '학생'),
  ('parent', 1.2, '학부모')
on conflict (role) do nothing;
