-- ═══════════════════════════════════════════════════════════════════════════
-- AUTUS v1.0 Database Schema
-- V = P × Λ × e^(σt)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 노드 시간상수 (λ) 테이블
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.node_lambdas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  node_id uuid not null,                    -- users.id 또는 students.id
  node_type text not null check (node_type in ('staff', 'student', 'parent')),
  
  -- λ 값
  lambda decimal(4,2) not null default 1.0,
  lambda_base decimal(4,2) not null default 1.0,
  
  -- λ 구성요소
  replaceability decimal(3,2) default 0.5,  -- R: 대체 가능성 (0~1)
  influence decimal(3,2) default 0.5,       -- I: 영향력 (0~1)
  expertise decimal(3,2) default 0.5,       -- E: 전문성 (0~1)
  network_position decimal(3,2) default 0.5, -- N: 네트워크 위치 (0~1)
  
  -- 메타
  role text,                                -- 역할 (owner, teacher, student 등)
  name text,                                -- 표시 이름
  calculated_at timestamptz default now(),
  version int default 1,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint lambda_range check (lambda >= 0.5 and lambda <= 10.0),
  constraint unique_node_lambda unique (org_id, node_id, node_type)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 관계 시너지 (σ) 테이블
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.relation_sigmas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 당사자
  node_a_id uuid not null,
  node_a_type text not null,
  node_b_id uuid not null,
  node_b_type text not null,
  
  -- σ 값
  sigma decimal(4,3) not null default 0.0,  -- -1.0 ~ +1.0
  
  -- σ 구성요소
  compatibility decimal(4,3) default 0.0,   -- C: 스타일 호환 (-1~+1)
  goal_alignment decimal(4,3) default 0.0,  -- G: 목표 일치 (-1~+1)
  value_match decimal(4,3) default 0.0,     -- V: 가치관 일치 (-1~+1)
  rhythm_sync decimal(4,3) default 0.0,     -- R: 리듬 동기화 (-1~+1)
  
  -- 측정 상태
  measurement_type text default 'estimated' check (measurement_type in ('estimated', 'measured', 'ai_predicted')),
  measured_at timestamptz,
  confidence decimal(3,2) default 0.5,      -- 신뢰도 (0~1)
  
  -- 관계 기간
  relation_started_at timestamptz not null default now(),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint sigma_range check (sigma >= -1.0 and sigma <= 1.0),
  constraint unique_relation_sigma unique (org_id, node_a_id, node_b_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 관계 밀도 (P) 테이블
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.relation_densities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 당사자
  node_a_id uuid not null,
  node_b_id uuid not null,
  
  -- P 값
  density decimal(4,3) not null default 0.5,  -- 0 ~ 1
  
  -- P 구성요소
  frequency decimal(4,3) default 0.5,         -- F: 접촉 빈도 (0~1)
  depth decimal(4,3) default 0.5,             -- D: 관계 깊이 (0~1)
  quality decimal(4,3) default 1.0,           -- Q: 품질 보정 (0~1)
  
  -- 측정 기간
  period_start date not null,
  period_end date not null,
  
  -- 상호작용 통계
  interaction_count int default 0,
  total_duration_minutes int default 0,
  
  created_at timestamptz not null default now(),
  
  constraint density_range check (density >= 0 and density <= 1),
  constraint unique_density_period unique (org_id, node_a_id, node_b_id, period_start)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 시간 기록 테이블
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.time_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 관계 당사자
  from_node_id uuid not null,
  from_node_type text not null,
  to_node_id uuid not null,
  to_node_type text not null,
  
  -- 시간 유형
  time_type text not null check (time_type in ('t1_input', 't2_saved', 't3_created')),
  
  -- 시간 값 (분 단위)
  real_minutes int not null,
  lambda_adjusted_stu decimal(10,2),          -- λ 적용된 STU
  
  -- 활동 정보
  activity_type text,                         -- class, consult, call, message 등
  activity_id uuid,                           -- 연결된 활동 ID
  description text,
  
  -- 날짜
  recorded_date date not null,
  
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- V 스냅샷 (일일/주간/월간 가치 기록)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.value_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 스냅샷 유형
  snapshot_type text not null check (snapshot_type in ('daily', 'weekly', 'monthly')),
  snapshot_date date not null,
  
  -- 전체 조직 V
  total_value_stu decimal(15,2) not null,
  total_value_krw decimal(15,0),
  
  -- 구성요소 합계
  total_lambda_weighted_time decimal(15,2),
  avg_density decimal(4,3),
  avg_sigma decimal(4,3),
  
  -- ω (시간 단가)
  omega decimal(10,0),                        -- ₩/STU
  
  -- 노드 통계
  node_count int default 0,
  relation_count int default 0,
  
  -- 상세 데이터 (JSON)
  node_breakdown jsonb,
  relation_breakdown jsonb,
  
  -- 전기 대비
  prev_value_stu decimal(15,2),
  value_change_pct decimal(6,2),
  
  created_at timestamptz not null default now(),
  
  constraint unique_snapshot unique (org_id, snapshot_type, snapshot_date)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 인덱스
-- ═══════════════════════════════════════════════════════════════════════════
create index if not exists node_lambdas_org_idx on public.node_lambdas (org_id);
create index if not exists node_lambdas_role_idx on public.node_lambdas (org_id, role);

create index if not exists relation_sigmas_org_idx on public.relation_sigmas (org_id);
create index if not exists relation_sigmas_nodes_idx on public.relation_sigmas (node_a_id, node_b_id);
create index if not exists relation_sigmas_sigma_idx on public.relation_sigmas (org_id, sigma);

create index if not exists relation_densities_org_period_idx on public.relation_densities (org_id, period_start);
create index if not exists relation_densities_nodes_idx on public.relation_densities (node_a_id, node_b_id);

create index if not exists time_records_org_date_idx on public.time_records (org_id, recorded_date);
create index if not exists time_records_from_node_idx on public.time_records (from_node_id, recorded_date);

create index if not exists value_snapshots_org_type_date_idx on public.value_snapshots (org_id, snapshot_type, snapshot_date desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 함수: λ 자동 계산
-- λ = λ_base × (1/R) × I × E × N
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_node_lambda(
  p_replaceability decimal,
  p_influence decimal,
  p_expertise decimal,
  p_network decimal
) returns decimal as $$
declare
  v_r_factor decimal;
  v_raw decimal;
  v_lambda decimal;
begin
  -- R factor (대체 가능성의 역수)
  v_r_factor := case 
    when p_replaceability > 0 then 1.0 / p_replaceability 
    else 10.0 
  end;
  
  -- Raw calculation
  v_raw := v_r_factor * p_influence * p_expertise * p_network;
  
  -- Normalize to 0.5 ~ 10.0 range
  v_lambda := greatest(0.5, least(10.0, v_raw * 0.5));
  
  return round(v_lambda, 2);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 함수: σ 자동 계산
-- σ = w₁C + w₂G + w₃V + w₄R
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_sigma(
  p_compatibility decimal,
  p_goal_alignment decimal,
  p_value_match decimal,
  p_rhythm_sync decimal
) returns decimal as $$
declare
  w_c decimal := 0.3;
  w_g decimal := 0.3;
  w_v decimal := 0.2;
  w_r decimal := 0.2;
  v_sigma decimal;
begin
  v_sigma := (w_c * p_compatibility) + 
             (w_g * p_goal_alignment) + 
             (w_v * p_value_match) + 
             (w_r * p_rhythm_sync);
  
  -- Clamp to -1 ~ +1
  v_sigma := greatest(-1.0, least(1.0, v_sigma));
  
  return round(v_sigma, 3);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 함수: P 자동 계산
-- P = √(F × D) × Q
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_density(
  p_frequency decimal,
  p_depth decimal,
  p_quality decimal default 1.0
) returns decimal as $$
declare
  v_density decimal;
begin
  v_density := sqrt(p_frequency * p_depth) * p_quality;
  
  -- Clamp to 0 ~ 1
  v_density := greatest(0.0, least(1.0, v_density));
  
  return round(v_density, 3);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 함수: 시너지 배율 계산 (포화 함수)
-- S(t) = S_max × (1 - e^(-σt/τ)) for σ > 0
-- S(t) = e^(σt) for σ ≤ 0
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_synergy_multiplier(
  p_sigma decimal,
  p_duration_months decimal,
  p_s_max decimal default 50,
  p_tau decimal default 24
) returns decimal as $$
declare
  v_multiplier decimal;
begin
  if p_sigma > 0 then
    -- Saturation function for positive synergy
    v_multiplier := p_s_max * (1 - exp(-p_sigma * p_duration_months / p_tau));
    v_multiplier := greatest(1.0, v_multiplier);
  elsif p_sigma < 0 then
    -- Exponential decay for negative synergy
    v_multiplier := exp(p_sigma * p_duration_months);
  else
    v_multiplier := 1.0;
  end if;
  
  return round(v_multiplier, 2);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 함수: 관계 가치 (V) 계산
-- V = P × Λ × S(t)
-- Λ = λ_A × t_A + λ_B × t_B
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_relation_value(
  p_density decimal,
  p_lambda_a decimal,
  p_lambda_b decimal,
  p_time_a_hours decimal,
  p_time_b_hours decimal,
  p_sigma decimal,
  p_duration_months decimal
) returns decimal as $$
declare
  v_mutual_time_value decimal;
  v_synergy decimal;
  v_value decimal;
begin
  -- Λ = mutual time value
  v_mutual_time_value := (p_lambda_a * p_time_a_hours) + (p_lambda_b * p_time_b_hours);
  
  -- Synergy multiplier
  v_synergy := calculate_synergy_multiplier(p_sigma, p_duration_months);
  
  -- V = P × Λ × S(t)
  v_value := p_density * v_mutual_time_value * v_synergy;
  
  return round(v_value, 2);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 트리거: node_lambdas 업데이트 시 λ 자동 재계산
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_update_node_lambda() returns trigger as $$
begin
  -- λ 자동 계산 (구성요소가 있을 때만)
  if new.replaceability is not null and 
     new.influence is not null and 
     new.expertise is not null and 
     new.network_position is not null then
    new.lambda := calculate_node_lambda(
      new.replaceability,
      new.influence,
      new.expertise,
      new.network_position
    );
  end if;
  
  new.calculated_at := now();
  new.updated_at := now();
  new.version := coalesce(old.version, 0) + 1;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_node_lambdas_update
  before update on public.node_lambdas
  for each row
  execute function trg_update_node_lambda();

-- ═══════════════════════════════════════════════════════════════════════════
-- 트리거: relation_sigmas 업데이트 시 σ 자동 재계산
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_update_relation_sigma() returns trigger as $$
begin
  -- σ 자동 계산
  new.sigma := calculate_sigma(
    new.compatibility,
    new.goal_alignment,
    new.value_match,
    new.rhythm_sync
  );
  
  new.updated_at := now();
  
  return new;
end;
$$ language plpgsql;

create trigger trg_relation_sigmas_update
  before update on public.relation_sigmas
  for each row
  execute function trg_update_relation_sigma();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.node_lambdas enable row level security;
alter table public.relation_sigmas enable row level security;
alter table public.relation_densities enable row level security;
alter table public.time_records enable row level security;
alter table public.value_snapshots enable row level security;

-- 조직 기반 접근 정책
create policy "node_lambdas_org" on public.node_lambdas
  for all using (org_id in (select get_user_org_ids()));

create policy "relation_sigmas_org" on public.relation_sigmas
  for all using (org_id in (select get_user_org_ids()));

create policy "relation_densities_org" on public.relation_densities
  for all using (org_id in (select get_user_org_ids()));

create policy "time_records_org" on public.time_records
  for all using (org_id in (select get_user_org_ids()));

create policy "value_snapshots_org" on public.value_snapshots
  for all using (org_id in (select get_user_org_ids()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 뷰: 조직 가치 요약
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view public.org_value_summary as
select 
  org_id,
  count(distinct nl.node_id) as node_count,
  avg(nl.lambda) as avg_lambda,
  (select count(*) from public.relation_sigmas rs where rs.org_id = nl.org_id) as relation_count,
  (select avg(sigma) from public.relation_sigmas rs where rs.org_id = nl.org_id) as avg_sigma,
  (select sum(total_value_stu) from public.value_snapshots vs 
   where vs.org_id = nl.org_id 
   and vs.snapshot_type = 'daily' 
   order by snapshot_date desc limit 1) as latest_value_stu
from public.node_lambdas nl
group by nl.org_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 코멘트
-- ═══════════════════════════════════════════════════════════════════════════
comment on table public.node_lambdas is 'AUTUS: 노드별 시간상수 (λ)';
comment on table public.relation_sigmas is 'AUTUS: 관계별 시너지 계수 (σ)';
comment on table public.relation_densities is 'AUTUS: 관계 밀도 (P)';
comment on table public.time_records is 'AUTUS: 시간 기록 (T₁, T₂, T₃)';
comment on table public.value_snapshots is 'AUTUS: 가치 스냅샷 (V)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 자산 포트폴리오 테이블 (NEW)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 자산 유형
  asset_type text not null check (asset_type in ('equity', 'ip', 'data', 'standard', 'partnership')),
  
  -- 출처
  source_name text not null,
  source_id uuid,
  description text,
  
  -- 가치 요소
  t_value decimal(15,2) not null,          -- T (투입 가치 시간)
  sigma_value decimal(5,3) not null,       -- σ (관계 시너지)
  a_value decimal(15,2) not null,          -- A (증폭된 가치)
  a_krw decimal(15,0),                     -- ₩ 환산
  
  -- 상태
  status text default 'active' check (status in ('active', 'pending', 'realized')),
  
  -- 날짜
  acquired_at timestamptz not null default now(),
  realized_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 자산 인덱스
create index if not exists assets_org_idx on public.assets (org_id);
create index if not exists assets_type_idx on public.assets (org_id, asset_type);
create index if not exists assets_status_idx on public.assets (org_id, status);

-- 자산 RLS
alter table public.assets enable row level security;
create policy "assets_org" on public.assets
  for all using (org_id in (select get_user_org_ids()));

comment on table public.assets is 'AUTUS: 자산 포트폴리오 (Equity, IP, Data, Standard, Partnership)';

-- ═══════════════════════════════════════════════════════════════════════════
-- σ 프록시 지표 테이블 (NEW)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.sigma_proxy_data (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  relation_id uuid not null references public.relation_sigmas(id) on delete cascade,
  
  -- 프록시 지표 (0~1)
  response_speed decimal(4,3),
  engagement_rate decimal(4,3),
  completion_rate decimal(4,3),
  sentiment_score decimal(4,3),        -- -1 ~ +1
  renewal_history decimal(4,3),
  
  -- 산출값
  predicted_sigma decimal(5,3),
  confidence decimal(4,3),
  
  measured_at timestamptz not null default now()
);

-- σ 프록시 인덱스
create index if not exists sigma_proxy_relation_idx on public.sigma_proxy_data (relation_id);

-- σ 프록시 RLS
alter table public.sigma_proxy_data enable row level security;
create policy "sigma_proxy_org" on public.sigma_proxy_data
  for all using (org_id in (select get_user_org_ids()));

comment on table public.sigma_proxy_data is 'AUTUS: σ 프록시 지표 측정 기록';

-- ═══════════════════════════════════════════════════════════════════════════
-- 효율 메트릭 테이블 (NEW)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.efficiency_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 기간
  period_start date not null,
  period_end date not null,
  
  -- 투입
  total_input_stu decimal(15,2) not null,
  total_input_krw decimal(15,0),
  
  -- 산출
  total_output_stu decimal(15,2) not null,
  total_output_krw decimal(15,0),
  
  -- 효율
  efficiency_ratio decimal(6,2) not null,   -- E = output / input
  efficiency_level text check (efficiency_level in ('excellent', 'good', 'break_even', 'loss')),
  
  -- 상세 (활동 유형별)
  by_activity_type jsonb,
  
  created_at timestamptz not null default now(),
  
  constraint unique_efficiency_period unique (org_id, period_start, period_end)
);

-- 효율 인덱스
create index if not exists efficiency_org_period_idx on public.efficiency_metrics (org_id, period_start);

-- 효율 RLS
alter table public.efficiency_metrics enable row level security;
create policy "efficiency_org" on public.efficiency_metrics
  for all using (org_id in (select get_user_org_ids()));

comment on table public.efficiency_metrics is 'AUTUS: 효율 메트릭 (E = A_out / A_in)';

-- ═══════════════════════════════════════════════════════════════════════════
-- σ 역산 함수 (NEW)
-- σ = log(A) / log(T)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_sigma_from_results(
  p_result_value decimal,   -- A
  p_input_value decimal     -- T
) returns decimal as $$
begin
  if p_input_value <= 0 or p_input_value = 1 or p_result_value <= 0 then
    return 0;
  end if;
  
  return round(ln(p_result_value) / ln(p_input_value), 3);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- 효율 계산 함수 (NEW)
-- E = A_out / A_in
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function calculate_efficiency(
  p_output decimal,
  p_input decimal
) returns decimal as $$
begin
  if p_input <= 0 then
    return 0;
  end if;
  
  return round(p_output / p_input, 2);
end;
$$ language plpgsql immutable;

-- ═══════════════════════════════════════════════════════════════════════════
-- σ 프록시 예측 함수 (NEW)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function predict_sigma_from_proxy(
  p_response_speed decimal,
  p_engagement_rate decimal,
  p_completion_rate decimal,
  p_sentiment_score decimal,
  p_renewal_history decimal
) returns decimal as $$
declare
  w_response decimal := 0.15;
  w_engagement decimal := 0.25;
  w_completion decimal := 0.20;
  w_sentiment decimal := 0.20;
  w_renewal decimal := 0.20;
  v_normalized_sentiment decimal;
  v_score decimal;
  v_sigma decimal;
begin
  -- 감정 점수 정규화 (-1~+1 → 0~1)
  v_normalized_sentiment := (coalesce(p_sentiment_score, 0) + 1) / 2;
  
  -- 가중 평균
  v_score := 
    w_response * coalesce(p_response_speed, 0.5) +
    w_engagement * coalesce(p_engagement_rate, 0.5) +
    w_completion * coalesce(p_completion_rate, 0.5) +
    w_sentiment * v_normalized_sentiment +
    w_renewal * coalesce(p_renewal_history, 0.5);
  
  -- 0~1 → -1~+1 변환
  v_sigma := (v_score * 2) - 1;
  
  return round(v_sigma, 3);
end;
$$ language plpgsql immutable;
