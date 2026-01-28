-- ═══════════════════════════════════════════════════════════════════════════
-- 🏛️ AUTUS v2.0 - 가치의 법칙 (The Law of Value)
-- 
-- 핵심 공식: A = T^σ
-- - A: 증폭된 시간 (Amplified Time) = 가치
-- - T: 가치 시간 (Value Time) = λ × t
-- - σ: 시너지 계수 (0.5 ~ 3.0)
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================
-- ENUM Types
-- ============================================

-- 노드 타입
create type node_type as enum (
  'OWNER',      -- 오너 (λ=5.0)
  'MANAGER',    -- 관리자 (λ=3.0)
  'STAFF',      -- 실무자/교사 (λ=1.5-2.5)
  'STUDENT',    -- 학생 (λ=1.0)
  'PARENT',     -- 학부모 (λ=1.2)
  'PROSPECT',   -- 잠재고객 (λ=0.8)
  'CHURNED',    -- 이탈고객 (λ=0.5)
  'EXTERNAL'    -- 외부노드 (λ=1.0)
);

-- 행위 타입 (14개)
create type behavior_type as enum (
  -- Tier 1: 결정적
  'REENROLLMENT',         -- 재등록
  'REFERRAL',             -- 소개등록
  -- Tier 2: 확장
  'ADDITIONAL_CLASS',     -- 추가수강
  'PAID_EVENT',           -- 유료이벤트
  -- Tier 3: 참여
  'VOLUNTARY_STAY',       -- 자발적체류
  'FREE_EVENT',           -- 무료이벤트
  'CLASS_PARTICIPATION',  -- 수업참여
  -- Tier 4: 유지
  'ATTENDANCE',           -- 출결
  'PAYMENT',              -- 수납
  'COMMUNICATION',        -- 소통반응
  -- Tier 5: 표현
  'POSITIVE_FEEDBACK',    -- 긍정피드백
  'MERCHANDISE',          -- 굿즈소지
  -- Tier 6: 부정
  'COMPLAINT',            -- 불만
  'CHURN_SIGNAL'          -- 이탈신호
);

-- 외부 데이터 소스 (8개)
create type external_source as enum (
  'EMAIL',      -- 이메일
  'CALENDAR',   -- 캘린더
  'MESSENGER',  -- 메신저
  'SOCIAL',     -- 소셜미디어
  'REPUTATION', -- 리뷰/평판
  'LOCATION',   -- 위치
  'PAYMENT',    -- 결제
  'NETWORK'     -- 네트워크
);

-- σ 등급
create type sigma_grade as enum (
  'critical',   -- σ < 0.7  ⚫
  'at_risk',    -- 0.7 ≤ σ < 1.0  🔴
  'neutral',    -- 1.0 ≤ σ < 1.3  🟡
  'good',       -- 1.3 ≤ σ < 1.6  🟢
  'loyal',      -- 1.6 ≤ σ < 2.0  🔵
  'advocate'    -- σ ≥ 2.0  💜
);

-- 관계 상태
create type relationship_status as enum (
  'active',
  'inactive',
  'churned'
);

-- ============================================
-- Core Tables
-- ============================================

-- 노드 (모든 참여자)
create table if not exists autus_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  type node_type not null,
  name text not null,
  email text unique,
  phone text,
  lambda decimal(4,2) default 1.0 check (lambda between 0.1 and 10.0),
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 노드 타입별 기본 λ
comment on column autus_nodes.lambda is 'OWNER=5.0, MANAGER=3.0, STAFF=2.0, STUDENT=1.0, PARENT=1.2, PROSPECT=0.8, CHURNED=0.5, EXTERNAL=1.0';

-- 관계 (노드 간 연결)
create table if not exists autus_relationships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  node_a_id uuid not null references autus_nodes(id) on delete cascade,
  node_b_id uuid not null references autus_nodes(id) on delete cascade,
  sigma decimal(4,2) default 1.0 check (sigma between 0.5 and 3.0),
  sigma_history jsonb default '[]',  -- [{date, sigma}]
  t_total decimal(15,2) default 0,   -- 누적 가치 시간
  a_value decimal(20,2) default 0,   -- 현재 가치 (A = T^σ)
  status relationship_status default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(node_a_id, node_b_id)
);

comment on column autus_relationships.sigma is 'σ: 시너지 계수 (0.5 ~ 3.0)';
comment on column autus_relationships.t_total is 'T: 가치 시간 = Σ(λ × t)';
comment on column autus_relationships.a_value is 'A: 증폭된 시간 = T^σ';

-- 행위 기록
create table if not exists autus_behaviors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  node_id uuid not null references autus_nodes(id) on delete cascade,
  behavior_type behavior_type not null,
  tier smallint not null check (tier between 1 and 6),
  sigma_contribution decimal(5,3) not null,  -- σ 기여값
  modifiers jsonb default '{}',  -- 적용된 modifier들
  metadata jsonb default '{}',
  recorded_at timestamptz not null default now()
);

comment on table autus_behaviors is '14개 행위 기록 (Tier 1~6)';

-- 시간 기록
create table if not exists autus_time_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  node_id uuid references autus_nodes(id) on delete cascade,
  relationship_id uuid references autus_relationships(id) on delete cascade,
  t_physical integer not null,  -- 물리 시간 (분)
  t_value decimal(10,2) not null,  -- 가치 시간 (λ × t)
  activity_type text not null,  -- class, consultation, event, etc.
  metadata jsonb default '{}',
  recorded_at timestamptz not null default now()
);

comment on column autus_time_logs.t_physical is 't: 물리 시간 (분)';
comment on column autus_time_logs.t_value is 'T = λ × t';

-- 외부 데이터
create table if not exists autus_external_data (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  node_id uuid not null references autus_nodes(id) on delete cascade,
  source external_source not null,
  sigma_contribution decimal(5,3) not null,  -- σ 기여값
  raw_data jsonb default '{}',
  recorded_at timestamptz not null default now()
);

comment on table autus_external_data is '8개 외부 데이터 소스';

-- 조직 가치 스냅샷
create table if not exists autus_org_values (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  omega decimal(25,2) not null,  -- Ω = Σ(T^σ)
  avg_sigma decimal(4,2) not null,
  node_count integer not null,
  relationship_count integer not null,
  sigma_distribution jsonb not null,  -- {critical, at_risk, neutral, good, loyal, advocate}
  calculated_at timestamptz not null default now()
);

comment on column autus_org_values.omega is 'Ω: 조직 가치 = Σ(T^σ)';

-- 알림
create table if not exists autus_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  node_id uuid references autus_nodes(id) on delete cascade,
  relationship_id uuid references autus_relationships(id) on delete cascade,
  type text not null,  -- churn_risk, sigma_drop, milestone, etc.
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  metadata jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- Indexes
-- ============================================

create index if not exists idx_autus_nodes_org on autus_nodes(org_id);
create index if not exists idx_autus_nodes_type on autus_nodes(type);
create index if not exists idx_autus_nodes_email on autus_nodes(email) where email is not null;

create index if not exists idx_autus_relationships_org on autus_relationships(org_id);
create index if not exists idx_autus_relationships_nodes on autus_relationships(node_a_id, node_b_id);
create index if not exists idx_autus_relationships_sigma on autus_relationships(sigma);
create index if not exists idx_autus_relationships_status on autus_relationships(status);

create index if not exists idx_autus_behaviors_org on autus_behaviors(org_id);
create index if not exists idx_autus_behaviors_node on autus_behaviors(node_id);
create index if not exists idx_autus_behaviors_type on autus_behaviors(behavior_type);
create index if not exists idx_autus_behaviors_tier on autus_behaviors(tier);
create index if not exists idx_autus_behaviors_recorded on autus_behaviors(recorded_at desc);

create index if not exists idx_autus_time_logs_node on autus_time_logs(node_id);
create index if not exists idx_autus_time_logs_relationship on autus_time_logs(relationship_id);
create index if not exists idx_autus_time_logs_recorded on autus_time_logs(recorded_at desc);

create index if not exists idx_autus_external_node on autus_external_data(node_id);
create index if not exists idx_autus_external_source on autus_external_data(source);

create index if not exists idx_autus_org_values_org on autus_org_values(org_id);
create index if not exists idx_autus_org_values_calculated on autus_org_values(calculated_at desc);

create index if not exists idx_autus_alerts_org on autus_alerts(org_id);
create index if not exists idx_autus_alerts_node on autus_alerts(node_id);
create index if not exists idx_autus_alerts_unread on autus_alerts(is_read) where is_read = false;

-- ============================================
-- Functions
-- ============================================

-- A = T^σ 계산
create or replace function calculate_a(
  t_total decimal,
  lambda decimal,
  sigma decimal
) returns decimal as $$
declare
  t decimal;
  a decimal;
begin
  t := lambda * t_total;
  if t <= 0 then
    return 0;
  end if;
  a := power(t, sigma);
  return a;
end;
$$ language plpgsql immutable;

comment on function calculate_a is 'A = T^σ where T = λ × t';

-- σ 역산
create or replace function measure_sigma(
  a decimal,
  t_total decimal,
  lambda decimal default 1.0
) returns decimal as $$
declare
  t decimal;
  sigma decimal;
begin
  t := lambda * t_total;
  if t <= 1 or a <= 0 then
    return 1.0;
  end if;
  sigma := ln(a) / ln(t);
  return greatest(0.5, least(3.0, sigma));
end;
$$ language plpgsql immutable;

comment on function measure_sigma is 'σ = log(A) / log(T)';

-- σ 등급 판정
create or replace function get_sigma_grade(sigma decimal)
returns sigma_grade as $$
begin
  if sigma < 0.7 then return 'critical';
  elsif sigma < 1.0 then return 'at_risk';
  elsif sigma < 1.3 then return 'neutral';
  elsif sigma < 1.6 then return 'good';
  elsif sigma < 2.0 then return 'loyal';
  else return 'advocate';
  end if;
end;
$$ language plpgsql immutable;

-- 관계 가치 업데이트 (행위 발생 시)
create or replace function update_relationship_value()
returns trigger as $$
declare
  rel record;
  total_sigma decimal;
  internal_sigma decimal;
  external_sigma decimal;
  new_sigma decimal;
begin
  -- 해당 노드의 모든 관계 가져오기
  for rel in 
    select * from autus_relationships 
    where (node_a_id = NEW.node_id or node_b_id = NEW.node_id)
      and status = 'active'
  loop
    -- 내부 σ (행위 기반)
    select coalesce(sum(sigma_contribution), 0) into internal_sigma
    from autus_behaviors
    where node_id in (rel.node_a_id, rel.node_b_id);
    
    -- 외부 σ (데이터 기반)
    select coalesce(sum(sigma_contribution * 
      case source
        when 'EMAIL' then 0.10
        when 'CALENDAR' then 0.15
        when 'MESSENGER' then 0.20
        when 'SOCIAL' then 0.15
        when 'REPUTATION' then 0.15
        when 'LOCATION' then 0.10
        when 'PAYMENT' then 0.10
        when 'NETWORK' then 0.05
      end
    ), 0) into external_sigma
    from autus_external_data
    where node_id in (rel.node_a_id, rel.node_b_id);
    
    -- 전체 σ 계산
    new_sigma := greatest(0.5, least(3.0, 1.0 + internal_sigma + external_sigma));
    
    -- 관계 업데이트
    update autus_relationships
    set 
      sigma = new_sigma,
      sigma_history = sigma_history || jsonb_build_object(
        'date', now()::text,
        'sigma', new_sigma
      ),
      a_value = calculate_a(t_total, 1.0, new_sigma),
      updated_at = now()
    where id = rel.id;
  end loop;
  
  return NEW;
end;
$$ language plpgsql;

-- 행위 기록 시 관계 업데이트 트리거
drop trigger if exists trg_behavior_update_relationship on autus_behaviors;
create trigger trg_behavior_update_relationship
  after insert on autus_behaviors
  for each row
  execute function update_relationship_value();

-- 시간 기록 시 T 업데이트
create or replace function update_time_total()
returns trigger as $$
begin
  if NEW.relationship_id is not null then
    update autus_relationships
    set 
      t_total = t_total + NEW.t_value,
      a_value = calculate_a(t_total + NEW.t_value, 1.0, sigma),
      updated_at = now()
    where id = NEW.relationship_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_time_update_total on autus_time_logs;
create trigger trg_time_update_total
  after insert on autus_time_logs
  for each row
  execute function update_time_total();

-- Ω 계산 함수
create or replace function calculate_omega(p_org_id uuid)
returns decimal as $$
declare
  omega decimal;
begin
  select coalesce(sum(a_value), 0) into omega
  from autus_relationships
  where org_id = p_org_id and status = 'active';
  return omega;
end;
$$ language plpgsql stable;

-- 조직 가치 스냅샷 생성
create or replace function create_org_value_snapshot(p_org_id uuid)
returns uuid as $$
declare
  v_omega decimal;
  v_avg_sigma decimal;
  v_node_count integer;
  v_rel_count integer;
  v_distribution jsonb;
  v_id uuid;
begin
  -- Ω 계산
  select coalesce(sum(a_value), 0) into v_omega
  from autus_relationships
  where org_id = p_org_id and status = 'active';
  
  -- 평균 σ
  select coalesce(avg(sigma), 1.0) into v_avg_sigma
  from autus_relationships
  where org_id = p_org_id and status = 'active';
  
  -- 노드 수
  select count(*) into v_node_count
  from autus_nodes
  where org_id = p_org_id;
  
  -- 관계 수
  select count(*) into v_rel_count
  from autus_relationships
  where org_id = p_org_id and status = 'active';
  
  -- σ 분포
  select jsonb_build_object(
    'critical', count(*) filter (where sigma < 0.7),
    'at_risk', count(*) filter (where sigma >= 0.7 and sigma < 1.0),
    'neutral', count(*) filter (where sigma >= 1.0 and sigma < 1.3),
    'good', count(*) filter (where sigma >= 1.3 and sigma < 1.6),
    'loyal', count(*) filter (where sigma >= 1.6 and sigma < 2.0),
    'advocate', count(*) filter (where sigma >= 2.0)
  ) into v_distribution
  from autus_relationships
  where org_id = p_org_id and status = 'active';
  
  -- 스냅샷 저장
  insert into autus_org_values (
    org_id, omega, avg_sigma, node_count, relationship_count, sigma_distribution
  ) values (
    p_org_id, v_omega, v_avg_sigma, v_node_count, v_rel_count, v_distribution
  ) returning id into v_id;
  
  return v_id;
end;
$$ language plpgsql;

-- ============================================
-- Views
-- ============================================

-- 노드 가치 요약
create or replace view v_autus_node_summary as
select 
  n.id,
  n.org_id,
  n.type,
  n.name,
  n.lambda,
  count(distinct r.id) as relationship_count,
  coalesce(avg(r.sigma), 1.0) as avg_sigma,
  coalesce(sum(r.a_value), 0) as total_a_value,
  get_sigma_grade(coalesce(avg(r.sigma), 1.0)) as sigma_grade
from autus_nodes n
left join autus_relationships r 
  on (r.node_a_id = n.id or r.node_b_id = n.id)
  and r.status = 'active'
group by n.id, n.org_id, n.type, n.name, n.lambda;

-- 이탈 위험 노드
create or replace view v_autus_churn_risk as
select 
  n.id,
  n.org_id,
  n.name,
  n.type,
  r.sigma,
  r.sigma_history,
  r.a_value,
  get_sigma_grade(r.sigma) as sigma_grade,
  case 
    when r.sigma < 0.7 then 'critical'
    when r.sigma < 1.0 then 'high'
    else 'medium'
  end as risk_level
from autus_nodes n
join autus_relationships r 
  on (r.node_a_id = n.id or r.node_b_id = n.id)
where r.status = 'active' and r.sigma < 1.3
order by r.sigma asc;

-- 행위 통계
create or replace view v_autus_behavior_stats as
select 
  org_id,
  behavior_type,
  tier,
  count(*) as behavior_count,
  avg(sigma_contribution) as avg_contribution,
  sum(sigma_contribution) as total_contribution
from autus_behaviors
group by org_id, behavior_type, tier
order by tier, behavior_type;

-- ============================================
-- RLS Policies
-- ============================================

alter table autus_nodes enable row level security;
alter table autus_relationships enable row level security;
alter table autus_behaviors enable row level security;
alter table autus_time_logs enable row level security;
alter table autus_external_data enable row level security;
alter table autus_org_values enable row level security;
alter table autus_alerts enable row level security;

-- RLS 정책은 get_user_org_ids() 함수를 사용
-- (autus_master_schema.sql에 정의됨)

-- ============================================
-- Comments
-- ============================================

comment on table autus_nodes is '🏛️ AUTUS 노드 - 모든 참여자';
comment on table autus_relationships is '🔗 AUTUS 관계 - 노드 간 연결, A = T^σ';
comment on table autus_behaviors is '📊 AUTUS 행위 - 14개 행위 기록 (6 Tier)';
comment on table autus_time_logs is '⏱️ AUTUS 시간 기록 - T = λ × t';
comment on table autus_external_data is '🌐 AUTUS 외부 데이터 - 8개 소스';
comment on table autus_org_values is '📈 AUTUS 조직 가치 - Ω = Σ(T^σ)';
comment on table autus_alerts is '🔔 AUTUS 알림';
