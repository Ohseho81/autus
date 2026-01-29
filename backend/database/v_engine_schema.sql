-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔬 AUTUS V-Engine Schema v1.0
-- V = (Motions - Threats) × (1 + Relations)^t × Base × InteractionExponent
-- 
-- 핵심 테이블:
-- 1. v_current - V-Index 실시간 값
-- 2. interaction_exponents - 상호지수 관리
-- 3. users 확장 - 1-12-144 제한 컬럼
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PART 1: V-Current 테이블 (실시간 V-Index)
-- ============================================================================

-- V-Index 실시간 저장 테이블
create table if not exists public.v_current (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_id uuid not null, -- relational_nodes.id 또는 users.id
  entity_type text not null check (entity_type in ('student', 'parent', 'teacher', 'staff', 'org', 'owner')),
  
  -- V-Index 핵심 변수 (용어 통일: Motions/Threats)
  motions numeric not null default 0, -- M: 생성 가치 (이전: mint)
  threats numeric not null default 0, -- T: 비용/위험 (이전: tax)
  relations numeric not null default 0.5 check (relations between 0 and 1), -- s: 관계 계수
  
  -- Base (상수) - 패시브 변화
  base_value numeric not null default 1.0 check (base_value between 0.5 and 2.0),
  base_streak_months integer default 0, -- 연속 상승 개월 수
  base_last_direction text default 'stable' check (base_last_direction in ('up', 'down', 'stable')),
  
  -- 상호지수 (Interaction Exponent)
  interaction_exponent numeric not null default 0.10 check (interaction_exponent between 0.05 and 0.50),
  interaction_frequency integer default 0, -- 최근 30일 상호작용 횟수
  
  -- 계산된 V 값
  v_value numeric generated always as (
    (motions - threats) * power(1 + (interaction_exponent * relations), 1) * base_value
  ) stored,
  
  -- 추적
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(org_id, entity_id)
);

-- 인덱스
create index if not exists idx_v_current_org_id on public.v_current(org_id);
create index if not exists idx_v_current_entity on public.v_current(entity_id, entity_type);
create index if not exists idx_v_current_v_value on public.v_current(v_value desc);

-- ============================================================================
-- PART 2: V-Index 히스토리 (시계열 추적)
-- ============================================================================

create table if not exists public.v_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_id uuid not null,
  entity_type text not null,
  
  -- 스냅샷 시점의 값들
  motions numeric not null,
  threats numeric not null,
  relations numeric not null,
  base_value numeric not null,
  interaction_exponent numeric not null,
  v_value numeric not null,
  
  -- 변화량
  v_delta numeric default 0,
  delta_reason text, -- 'interaction', 'passive', 'manual', 'decay'
  
  -- 메타
  snapshot_type text not null check (snapshot_type in ('hourly', 'daily', 'weekly', 'monthly', 'event')),
  recorded_at timestamptz not null default now()
);

create index if not exists idx_v_history_entity on public.v_history(entity_id, recorded_at desc);
create index if not exists idx_v_history_org_date on public.v_history(org_id, snapshot_type, recorded_at desc);

-- ============================================================================
-- PART 3: 상호지수 (Interaction Exponent) 관리
-- ============================================================================

-- 상호지수 설정 테이블
create table if not exists public.interaction_exponents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_id uuid not null,
  
  -- 상호지수 값 (0.05 ~ 0.50)
  exponent_value numeric not null default 0.10 check (exponent_value between 0.05 and 0.50),
  
  -- 계산 요소
  interaction_count_30d integer default 0, -- 최근 30일 상호작용 수
  avg_interaction_quality numeric default 0.5, -- 상호작용 품질 (0-1)
  response_speed_avg numeric default 0.5, -- 평균 응답 속도 (0-1)
  engagement_rate numeric default 0.5, -- 참여율 (0-1)
  
  -- 자동 조정 규칙
  auto_adjust boolean default true,
  min_exponent numeric default 0.05,
  max_exponent numeric default 0.50,
  adjust_step numeric default 0.01, -- 조정 단위
  
  -- 추적
  last_calculated_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(org_id, entity_id)
);

-- 상호지수 자동 계산 함수
create or replace function calculate_interaction_exponent(
  p_interaction_count integer,
  p_quality numeric,
  p_response_speed numeric,
  p_engagement numeric
) returns numeric as $$
declare
  v_base numeric := 0.10;
  v_count_factor numeric;
  v_quality_factor numeric;
  v_result numeric;
begin
  -- 상호작용 횟수 기반 계수 (0-30회 → 0-0.2 추가)
  v_count_factor := least(0.20, p_interaction_count * 0.00667);
  
  -- 품질 기반 계수 (평균 0.5 기준)
  v_quality_factor := ((p_quality + p_response_speed + p_engagement) / 3 - 0.5) * 0.20;
  
  -- 최종 상호지수
  v_result := v_base + v_count_factor + v_quality_factor;
  
  -- 범위 제한 (0.05 ~ 0.50)
  return least(0.50, greatest(0.05, v_result));
end;
$$ language plpgsql immutable;

-- ============================================================================
-- PART 4: Users 테이블 확장 (1-12-144 제한)
-- ============================================================================

-- max_direct_child, max_influence_count 컬럼 추가
alter table public.users 
  add column if not exists max_direct_child integer default 12 check (max_direct_child between 1 and 12),
  add column if not exists max_influence_count integer default 144 check (max_influence_count between 1 and 144),
  add column if not exists current_direct_count integer default 0,
  add column if not exists current_influence_count integer default 0;

-- 1-12-144 제한 체크 함수
create or replace function check_1_12_144_limit(
  p_user_id uuid,
  p_limit_type text -- 'direct' 또는 'influence'
) returns boolean as $$
declare
  v_max_limit integer;
  v_current_count integer;
begin
  if p_limit_type = 'direct' then
    select max_direct_child, current_direct_count 
    into v_max_limit, v_current_count
    from public.users where id = p_user_id;
  else
    select max_influence_count, current_influence_count 
    into v_max_limit, v_current_count
    from public.users where id = p_user_id;
  end if;
  
  return v_current_count < v_max_limit;
end;
$$ language plpgsql;

-- 초대 가능 여부 체크 함수
create or replace function can_invite(p_inviter_id uuid) returns jsonb as $$
declare
  v_user record;
  v_can_direct boolean;
  v_can_influence boolean;
begin
  select * into v_user from public.users where id = p_inviter_id;
  
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'User not found');
  end if;
  
  v_can_direct := v_user.current_direct_count < v_user.max_direct_child;
  v_can_influence := v_user.current_influence_count < v_user.max_influence_count;
  
  return jsonb_build_object(
    'allowed', v_can_direct and v_can_influence,
    'direct', jsonb_build_object(
      'current', v_user.current_direct_count,
      'max', v_user.max_direct_child,
      'remaining', v_user.max_direct_child - v_user.current_direct_count
    ),
    'influence', jsonb_build_object(
      'current', v_user.current_influence_count,
      'max', v_user.max_influence_count,
      'remaining', v_user.max_influence_count - v_user.current_influence_count
    ),
    'reason', case 
      when not v_can_direct then '직접 관리 한도(12명) 초과'
      when not v_can_influence then '영향력 한도(144명) 초과'
      else 'OK'
    end
  );
end;
$$ language plpgsql;

-- ============================================================================
-- PART 5: 거짓말/사기 도태 메커니즘
-- ============================================================================

-- 불일치 감지 로그
create table if not exists public.inconsistency_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_id uuid not null,
  
  -- 불일치 유형
  inconsistency_type text not null check (inconsistency_type in (
    'data_mismatch', -- 데이터 불일치
    'timeline_conflict', -- 타임라인 충돌
    'behavior_anomaly', -- 행동 이상
    'report_discrepancy', -- 보고서 불일치
    'fraud_suspected' -- 사기 의심
  )),
  
  -- 상세 정보
  source_a jsonb, -- 비교 데이터 A
  source_b jsonb, -- 비교 데이터 B
  discrepancy_details text,
  confidence_score numeric check (confidence_score between 0 and 1),
  
  -- 자동 적용된 패널티
  threats_penalty numeric default 0.35,
  penalty_applied boolean default false,
  penalty_applied_at timestamptz,
  
  -- 처리 상태
  status text default 'detected' check (status in ('detected', 'reviewed', 'confirmed', 'dismissed')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  resolution_notes text,
  
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inconsistency_entity on public.inconsistency_logs(entity_id, detected_at desc);
create index if not exists idx_inconsistency_status on public.inconsistency_logs(status, confidence_score desc);

-- Threats 자동 증가 함수
create or replace function apply_threats_penalty(
  p_entity_id uuid,
  p_penalty numeric default 0.35,
  p_reason text default 'inconsistency_detected'
) returns numeric as $$
declare
  v_current_threats numeric;
  v_new_threats numeric;
begin
  -- 현재 Threats 조회
  select threats into v_current_threats
  from public.v_current
  where entity_id = p_entity_id;
  
  if not found then
    return null;
  end if;
  
  -- Threats 증가
  v_new_threats := v_current_threats + p_penalty;
  
  -- 업데이트
  update public.v_current
  set 
    threats = v_new_threats,
    updated_at = now()
  where entity_id = p_entity_id;
  
  -- 히스토리 기록
  insert into public.v_history (
    org_id, entity_id, entity_type, 
    motions, threats, relations, base_value, interaction_exponent, v_value,
    v_delta, delta_reason, snapshot_type
  )
  select 
    org_id, entity_id, entity_type,
    motions, v_new_threats, relations, base_value, interaction_exponent,
    (motions - v_new_threats) * power(1 + (interaction_exponent * relations), 1) * base_value,
    -p_penalty * power(1 + (interaction_exponent * relations), 1) * base_value,
    p_reason, 'event'
  from public.v_current
  where entity_id = p_entity_id;
  
  return v_new_threats;
end;
$$ language plpgsql;

-- 불일치 감지 시 자동 Threats 적용 트리거
create or replace function auto_apply_threats_on_inconsistency()
returns trigger as $$
begin
  -- 신뢰도 70% 이상일 때만 자동 적용
  if new.confidence_score >= 0.70 and not new.penalty_applied then
    perform apply_threats_penalty(new.entity_id, new.threats_penalty, new.inconsistency_type);
    
    new.penalty_applied := true;
    new.penalty_applied_at := now();
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_auto_threats_penalty
  before insert or update on public.inconsistency_logs
  for each row
  execute function auto_apply_threats_on_inconsistency();

-- ============================================================================
-- PART 6: Base 패시브 변화 로직
-- ============================================================================

-- Base 값 패시브 업데이트 함수 (3개월 연속 상승 시 +0.1)
create or replace function update_base_passive(p_entity_id uuid) returns numeric as $$
declare
  v_current record;
  v_prev_v numeric;
  v_new_base numeric;
  v_new_direction text;
begin
  -- 현재 값 조회
  select * into v_current from public.v_current where entity_id = p_entity_id;
  
  if not found then
    return null;
  end if;
  
  -- 이전 달 V 값 조회
  select v_value into v_prev_v
  from public.v_history
  where entity_id = p_entity_id 
    and snapshot_type = 'monthly'
    and recorded_at < date_trunc('month', now())
  order by recorded_at desc
  limit 1;
  
  -- 방향 결정
  if v_prev_v is null then
    v_new_direction := 'stable';
  elsif v_current.v_value > v_prev_v then
    v_new_direction := 'up';
  elsif v_current.v_value < v_prev_v then
    v_new_direction := 'down';
  else
    v_new_direction := 'stable';
  end if;
  
  -- Base 업데이트 로직
  v_new_base := v_current.base_value;
  
  if v_new_direction = 'up' and v_current.base_last_direction = 'up' then
    -- 연속 상승
    if v_current.base_streak_months >= 2 then
      -- 3개월 연속 상승 → +0.1
      v_new_base := least(2.0, v_current.base_value + 0.1);
    end if;
    
    update public.v_current set
      base_value = v_new_base,
      base_streak_months = v_current.base_streak_months + 1,
      base_last_direction = 'up',
      updated_at = now()
    where entity_id = p_entity_id;
  elsif v_new_direction = 'down' then
    -- 하락 시 streak 리셋
    update public.v_current set
      base_streak_months = 0,
      base_last_direction = 'down',
      updated_at = now()
    where entity_id = p_entity_id;
  else
    update public.v_current set
      base_last_direction = v_new_direction,
      updated_at = now()
    where entity_id = p_entity_id;
  end if;
  
  return v_new_base;
end;
$$ language plpgsql;

-- ============================================================================
-- PART 7: V-Index 통합 계산 함수
-- ============================================================================

-- 완전한 V-Index 계산 (모든 요소 반영)
create or replace function calculate_v_full(
  p_motions numeric,
  p_threats numeric,
  p_relations numeric,
  p_base numeric,
  p_interaction_exponent numeric,
  p_time_months integer default 1
) returns numeric as $$
begin
  -- V = (M - T) × (1 + IE × R)^t × Base
  return (p_motions - p_threats) * 
         power(1 + (p_interaction_exponent * p_relations), p_time_months) * 
         p_base;
end;
$$ language plpgsql immutable;

-- 조직 전체 V-Index 합산
create or replace function get_org_total_v(p_org_id uuid) returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_v', coalesce(sum(v_value), 0),
    'total_motions', coalesce(sum(motions), 0),
    'total_threats', coalesce(sum(threats), 0),
    'avg_relations', coalesce(avg(relations), 0.5),
    'avg_base', coalesce(avg(base_value), 1.0),
    'avg_interaction_exponent', coalesce(avg(interaction_exponent), 0.10),
    'entity_count', count(*),
    'calculated_at', now()
  ) into v_result
  from public.v_current
  where org_id = p_org_id;
  
  return v_result;
end;
$$ language plpgsql;

-- 멀티 테넌시 V-Index 통합 (회사별 + 전체)
create or replace function get_global_v_consolidation() returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'by_org', (
      select jsonb_agg(jsonb_build_object(
        'org_id', org_id,
        'org_name', (select name from public.orgs where id = org_id),
        'total_v', sum(v_value),
        'entity_count', count(*)
      ))
      from public.v_current
      group by org_id
    ),
    'global', jsonb_build_object(
      'total_v', (select coalesce(sum(v_value), 0) from public.v_current),
      'total_orgs', (select count(distinct org_id) from public.v_current),
      'total_entities', (select count(*) from public.v_current)
    ),
    'calculated_at', now()
  ) into v_result;
  
  return v_result;
end;
$$ language plpgsql;

-- ============================================================================
-- PART 8: RLS 정책
-- ============================================================================

alter table public.v_current enable row level security;
alter table public.v_history enable row level security;
alter table public.interaction_exponents enable row level security;
alter table public.inconsistency_logs enable row level security;

-- 조직 기반 접근 정책
create policy "v_current_org_access" on public.v_current
  for all using (org_id in (select get_user_org_ids()));

create policy "v_history_org_access" on public.v_history
  for all using (org_id in (select get_user_org_ids()));

create policy "interaction_exponents_org_access" on public.interaction_exponents
  for all using (org_id in (select get_user_org_ids()));

create policy "inconsistency_logs_org_access" on public.inconsistency_logs
  for all using (org_id in (select get_user_org_ids()));

-- Service role 전체 접근
create policy "v_current_service" on public.v_current
  for all using (true) with check (true);

create policy "v_history_service" on public.v_history
  for all using (true) with check (true);

create policy "interaction_exponents_service" on public.interaction_exponents
  for all using (true) with check (true);

create policy "inconsistency_logs_service" on public.inconsistency_logs
  for all using (true) with check (true);

-- ============================================================================
-- PART 9: 뷰
-- ============================================================================

-- V-Index 대시보드 뷰
create or replace view v_dashboard as
select
  vc.id,
  vc.org_id,
  o.name as org_name,
  vc.entity_id,
  vc.entity_type,
  rn.name as entity_name,
  vc.motions,
  vc.threats,
  vc.relations,
  vc.base_value,
  vc.interaction_exponent,
  vc.v_value,
  vc.base_streak_months,
  vc.base_last_direction,
  vc.calculated_at
from public.v_current vc
left join public.orgs o on vc.org_id = o.id
left join public.relational_nodes rn on vc.entity_id = rn.id
order by vc.v_value desc;

-- 1-12-144 현황 뷰
create or replace view v_1_12_144_status as
select
  u.id as user_id,
  u.name,
  u.email,
  om.role,
  u.max_direct_child,
  u.current_direct_count,
  u.max_direct_child - u.current_direct_count as direct_remaining,
  u.max_influence_count,
  u.current_influence_count,
  u.max_influence_count - u.current_influence_count as influence_remaining,
  case 
    when u.current_direct_count >= u.max_direct_child then 'BLOCKED'
    when u.current_direct_count >= u.max_direct_child * 0.8 then 'WARNING'
    else 'OK'
  end as direct_status,
  case 
    when u.current_influence_count >= u.max_influence_count then 'BLOCKED'
    when u.current_influence_count >= u.max_influence_count * 0.8 then 'WARNING'
    else 'OK'
  end as influence_status
from public.users u
left join public.org_members om on u.id = om.user_id;

-- ============================================================================
-- 완료
-- ============================================================================

comment on table public.v_current is 'V-Index 실시간 값 저장 (V = (M-T) × (1+IE×R)^t × Base)';
comment on table public.v_history is 'V-Index 시계열 히스토리';
comment on table public.interaction_exponents is '상호지수 관리 테이블';
comment on table public.inconsistency_logs is '거짓말/사기 감지 로그';
comment on column public.users.max_direct_child is '1-12-144 원칙: 직접 관리 한도 (기본 12명)';
comment on column public.users.max_influence_count is '1-12-144 원칙: 영향력 한도 (기본 144명)';
