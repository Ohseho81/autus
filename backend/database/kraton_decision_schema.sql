-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎓 KRATON - 의사결정 로그 & 카카오 알림톡 자산화 스키마
-- 
-- "사람 × 시간" 노드 기반 설계
-- 원장의 판단 상수 추출을 위한 완전한 의사결정 추적
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PART 1: 의사결정 로그 (Decision Logs)
-- "모든 판단은 자산이다" - 원장의 판단 패턴을 학습하기 위한 로그
-- ============================================================================

-- 의사결정 유형 ENUM
create type decision_type as enum (
  -- 관계 관련 결정
  'student_enrollment',      -- 학생 등록 승인
  'student_withdrawal',      -- 학생 퇴원 처리
  'teacher_assignment',      -- 선생님 배정
  'class_change',            -- 반 변경
  'schedule_adjustment',     -- 일정 조정
  
  -- 위험 관련 결정
  'risk_intervention',       -- 위험 개입 결정
  'churn_prevention',        -- 이탈 방지 조치
  'complaint_resolution',    -- 민원 해결
  
  -- 재무 관련 결정
  'discount_approval',       -- 할인 승인
  'payment_exception',       -- 결제 예외 처리
  'refund_approval',         -- 환불 승인
  
  -- 운영 관련 결정
  'policy_change',           -- 정책 변경
  'exception_approval',      -- 예외 승인
  'escalation_decision',     -- 에스컬레이션 판단
  
  -- 기타
  'other'
);

-- 결정 결과 ENUM
create type decision_outcome as enum (
  'approved',      -- 승인
  'rejected',      -- 거절
  'modified',      -- 수정 후 승인
  'delegated',     -- 위임
  'deferred',      -- 보류
  'auto_executed'  -- 자동 실행됨
);

-- 의사결정 로그 테이블
create table if not exists public.decision_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 결정자 정보 (사람 축)
  decider_id uuid not null references public.users(id),
  decider_role text not null, -- c_level, fsd, optimus
  
  -- 결정 대상 (사람 축)
  target_node_id uuid references public.relational_nodes(id),
  target_node_type text, -- student, parent, teacher
  target_node_name text, -- 익명화 가능
  
  -- 결정 내용
  decision_type decision_type not null,
  decision_title text not null,
  decision_outcome decision_outcome not null,
  
  -- 결정 맥락 (시간 축)
  context_snapshot jsonb not null default '{}', -- 결정 시점의 상황
  -- {
  --   risk_score: 0.7,
  --   s_index: 0.4,
  --   recent_interactions: [...],
  --   contributing_factors: [...],
  --   suggested_by_ai: true/false
  -- }
  
  -- 결정 입력 (원장이 고려한 요소들)
  input_factors jsonb not null default '{}',
  -- {
  --   considered: ["학부모 요청", "학생 성적 하락", "다른 학생 영향"],
  --   weight_given: {"학부모_요청": 0.3, "성적_하락": 0.5, "다른_학생_영향": 0.2},
  --   gut_feeling: "부정적인 느낌이 있었음"
  -- }
  
  -- 결정 출력
  decision_reasoning text, -- 원장이 입력한 결정 이유
  decision_conditions text[], -- 조건부 승인의 경우 조건들
  
  -- AI 관련
  ai_suggested boolean default false,
  ai_suggestion_accepted boolean,
  ai_suggestion_modified boolean,
  ai_original_suggestion jsonb, -- AI가 제안한 원본
  
  -- 결과 추적 (나중에 업데이트)
  result_tracked boolean default false,
  result_outcome text, -- success, partial_success, failure, unknown
  result_measured_at timestamptz,
  result_delta_v numeric, -- 결정으로 인한 V 변화량
  result_notes text,
  
  -- 메타
  tags text[] default '{}',
  confidence_level numeric check (confidence_level between 0 and 1), -- 원장의 확신도
  time_spent_seconds integer, -- 결정에 소요된 시간
  
  -- 시간 축
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 인덱스
create index idx_decision_logs_org on public.decision_logs(org_id);
create index idx_decision_logs_decider on public.decision_logs(decider_id);
create index idx_decision_logs_target on public.decision_logs(target_node_id);
create index idx_decision_logs_type on public.decision_logs(decision_type);
create index idx_decision_logs_outcome on public.decision_logs(decision_outcome);
create index idx_decision_logs_decided_at on public.decision_logs(decided_at desc);
create index idx_decision_logs_ai_suggested on public.decision_logs(ai_suggested);

-- ============================================================================
-- PART 2: 판단 상수 추출 (Decision Patterns)
-- 원장의 패턴을 분석하여 자동화 가능한 규칙으로 변환
-- ============================================================================

-- 판단 패턴 테이블
create table if not exists public.decision_patterns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 패턴 식별
  pattern_name text not null,
  pattern_description text,
  decision_type decision_type not null,
  
  -- 추출된 조건 (원장의 판단 상수)
  conditions jsonb not null,
  -- {
  --   "if": {
  --     "risk_score": {"gte": 0.6},
  --     "s_index": {"lt": 0.4},
  --     "interaction_gap_days": {"gte": 14}
  --   },
  --   "and": [
  --     {"parent_requested": true}
  --   ],
  --   "or": [
  --     {"vip_status": true},
  --     {"tenure_months": {"gte": 12}}
  --   ]
  -- }
  
  -- 예측 결과
  predicted_outcome decision_outcome not null,
  confidence decimal(4,3) not null check (confidence between 0 and 1),
  
  -- 학습 기반
  sample_count integer not null default 0, -- 학습에 사용된 결정 수
  sample_decision_ids uuid[] default '{}', -- 대표 결정 ID들
  first_observed_at timestamptz,
  last_observed_at timestamptz,
  
  -- 자동화 설정
  automation_level text check (automation_level in (
    'suggest',      -- AI가 제안만
    'pre_approve',  -- 원장 확인 후 자동 승인
    'auto_execute', -- 완전 자동 실행
    'disabled'      -- 비활성화
  )) default 'suggest',
  
  -- 성과 추적
  times_applied integer default 0,
  success_rate decimal(4,3),
  avg_delta_v decimal(10,2),
  
  -- 원장 검토
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- 메타
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index idx_decision_patterns_org on public.decision_patterns(org_id);
create index idx_decision_patterns_type on public.decision_patterns(decision_type);
create index idx_decision_patterns_active on public.decision_patterns(is_active);

-- ============================================================================
-- PART 3: 카카오 알림톡 로그 (Kakao AlimTalk Logs)
-- 모든 대화를 자산으로 전환하기 위한 수집
-- ============================================================================

-- 메시지 채널 ENUM
create type message_channel as enum (
  'kakao_alimtalk',   -- 카카오 알림톡
  'kakao_friendtalk', -- 카카오 친구톡
  'sms',              -- 문자
  'push',             -- 앱 푸시
  'email',            -- 이메일
  'in_app'            -- 인앱 메시지
);

-- 메시지 방향 ENUM
create type message_direction as enum (
  'outbound', -- 학원 → 학부모/학생
  'inbound'   -- 학부모/학생 → 학원
);

-- 카카오 알림톡 로그 테이블
create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 메시지 정보
  channel message_channel not null,
  direction message_direction not null,
  
  -- 대상 노드 (사람 축)
  target_node_id uuid references public.relational_nodes(id),
  target_phone text, -- 전화번호 (익명화 가능)
  target_name text,
  target_type text, -- student, parent
  
  -- 발신자 (outbound인 경우)
  sender_id uuid references public.users(id),
  sender_role text,
  
  -- 메시지 내용
  template_id text, -- 알림톡 템플릿 ID
  template_name text,
  message_content text not null, -- 실제 발송 내용
  message_variables jsonb default '{}', -- 템플릿 변수
  
  -- 발송 상태
  status text not null check (status in (
    'pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'
  )),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  
  -- AI 분석 (자산화)
  ai_analyzed boolean default false,
  sentiment_score decimal(3,2), -- -1 ~ 1
  intent_detected text[], -- 감지된 의도들
  key_entities jsonb, -- 추출된 주요 엔터티
  -- {
  --   "dates": ["2026-02-01"],
  --   "amounts": [150000],
  --   "concerns": ["성적 하락"],
  --   "requests": ["상담 요청"]
  -- }
  
  -- 관련 이벤트
  related_risk_id uuid references public.risk_queue(id),
  related_decision_id uuid references public.decision_logs(id),
  triggered_by text, -- 'auto_shield', 'manual', 'cron', 'risk_alert'
  
  -- 응답 추적 (inbound 연결)
  reply_to_message_id uuid references public.message_logs(id),
  has_reply boolean default false,
  reply_message_id uuid,
  
  -- 시간 축
  created_at timestamptz not null default now()
);

-- 인덱스
create index idx_message_logs_org on public.message_logs(org_id);
create index idx_message_logs_target on public.message_logs(target_node_id);
create index idx_message_logs_channel on public.message_logs(channel);
create index idx_message_logs_direction on public.message_logs(direction);
create index idx_message_logs_status on public.message_logs(status);
create index idx_message_logs_sent_at on public.message_logs(sent_at desc);
create index idx_message_logs_template on public.message_logs(template_id);

-- ============================================================================
-- PART 4: 대화 자산 노드 (Message Assets)
-- 대화에서 추출된 가치 있는 정보
-- ============================================================================

-- 자산 유형 ENUM
create type message_asset_type as enum (
  'concern',        -- 우려사항 (이탈 신호)
  'praise',         -- 칭찬/긍정 피드백
  'request',        -- 요청사항
  'complaint',      -- 불만
  'suggestion',     -- 제안
  'commitment',     -- 약속/확답
  'milestone',      -- 마일스톤 (성과)
  'insight'         -- 인사이트 (학습용)
);

-- 메시지 자산 테이블
create table if not exists public.message_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- 원본 메시지
  message_id uuid not null references public.message_logs(id),
  
  -- 관련 노드 (사람 축)
  node_id uuid references public.relational_nodes(id),
  node_type text,
  node_name text,
  
  -- 자산 정보
  asset_type message_asset_type not null,
  asset_title text not null,
  asset_content text not null, -- 추출된 핵심 내용
  
  -- 가치 평가
  importance_score decimal(3,2) check (importance_score between 0 and 1),
  urgency_score decimal(3,2) check (urgency_score between 0 and 1),
  actionable boolean default false,
  
  -- 연결된 액션
  action_required text,
  action_assigned_to uuid references public.users(id),
  action_due_date date,
  action_completed boolean default false,
  action_completed_at timestamptz,
  
  -- Physics 영향
  estimated_delta_s decimal(4,3), -- 예상 S 영향
  estimated_delta_v decimal(10,2), -- 예상 V 영향
  actual_delta_s decimal(4,3),
  actual_delta_v decimal(10,2),
  
  -- 학습 연결
  contributed_to_pattern_id uuid references public.decision_patterns(id),
  
  -- 시간 축
  extracted_at timestamptz not null default now(),
  expires_at timestamptz, -- 일부 자산은 유효기간 있음
  created_at timestamptz not null default now()
);

-- 인덱스
create index idx_message_assets_org on public.message_assets(org_id);
create index idx_message_assets_node on public.message_assets(node_id);
create index idx_message_assets_type on public.message_assets(asset_type);
create index idx_message_assets_message on public.message_assets(message_id);
create index idx_message_assets_actionable on public.message_assets(actionable) where actionable = true;
create index idx_message_assets_extracted_at on public.message_assets(extracted_at desc);

-- ============================================================================
-- PART 5: 의사결정 학습 뷰 (Views for Learning)
-- ============================================================================

-- 원장 판단 패턴 분석 뷰
create or replace view v_decision_analysis as
select
  dl.org_id,
  dl.decision_type,
  dl.decision_outcome,
  count(*) as decision_count,
  avg(case when dl.result_outcome = 'success' then 1 else 0 end)::decimal(4,3) as success_rate,
  avg(dl.result_delta_v) as avg_delta_v,
  avg(dl.time_spent_seconds) as avg_time_spent,
  avg(dl.confidence_level) as avg_confidence,
  count(case when dl.ai_suggested then 1 end) as ai_suggested_count,
  count(case when dl.ai_suggestion_accepted then 1 end) as ai_accepted_count
from public.decision_logs dl
where dl.result_tracked = true
group by dl.org_id, dl.decision_type, dl.decision_outcome;

-- 조건별 결정 패턴 뷰
create or replace view v_decision_conditions as
select
  dl.org_id,
  dl.decision_type,
  dl.decision_outcome,
  dl.context_snapshot->>'risk_score' as risk_score_range,
  dl.context_snapshot->>'s_index' as s_index_range,
  dl.input_factors,
  count(*) as occurrence_count,
  avg(dl.result_delta_v) as avg_delta_v
from public.decision_logs dl
group by 
  dl.org_id, 
  dl.decision_type, 
  dl.decision_outcome,
  dl.context_snapshot->>'risk_score',
  dl.context_snapshot->>'s_index',
  dl.input_factors;

-- 메시지 자산 대시보드 뷰
create or replace view v_message_asset_dashboard as
select
  ma.org_id,
  ma.asset_type,
  count(*) as asset_count,
  count(case when ma.actionable then 1 end) as actionable_count,
  count(case when ma.action_completed then 1 end) as completed_count,
  avg(ma.importance_score) as avg_importance,
  avg(ma.urgency_score) as avg_urgency,
  sum(ma.actual_delta_v) as total_delta_v
from public.message_assets ma
where ma.extracted_at > now() - interval '30 days'
group by ma.org_id, ma.asset_type;

-- ============================================================================
-- PART 6: 자동화 함수 (Automation Functions)
-- ============================================================================

-- 결정 패턴 매칭 함수
create or replace function match_decision_pattern(
  p_org_id uuid,
  p_decision_type decision_type,
  p_context jsonb
) returns table (
  pattern_id uuid,
  pattern_name text,
  predicted_outcome decision_outcome,
  confidence decimal,
  automation_level text
) as $$
begin
  return query
  select 
    dp.id,
    dp.pattern_name,
    dp.predicted_outcome,
    dp.confidence,
    dp.automation_level
  from public.decision_patterns dp
  where dp.org_id = p_org_id
    and dp.decision_type = p_decision_type
    and dp.is_active = true
    and dp.confidence >= 0.7
  order by dp.confidence desc
  limit 3;
end;
$$ language plpgsql;

-- 의사결정 로그 후처리 함수
create or replace function process_decision_log()
returns trigger as $$
begin
  -- 1. 패턴 학습 큐에 추가 (비동기 처리)
  -- 2. 관련 노드의 Physics 메트릭 업데이트 트리거
  -- 3. AI 분석 요청 (result 추적 시)
  
  -- result_tracked가 true로 변경되면 패턴 분석 시작
  if new.result_tracked = true and old.result_tracked = false then
    -- 여기서 패턴 학습 로직 호출
    -- (실제 구현은 백엔드에서 n8n 워크플로우로 처리)
    null;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_process_decision_log
  after update of result_tracked on public.decision_logs
  for each row execute function process_decision_log();

-- 메시지 자산 자동 추출 함수 (AI 호출 후 결과 저장)
create or replace function extract_message_assets(
  p_message_id uuid,
  p_ai_analysis jsonb
) returns setof uuid as $$
declare
  v_asset_id uuid;
  v_asset jsonb;
begin
  -- AI 분석 결과에서 자산 추출
  for v_asset in select * from jsonb_array_elements(p_ai_analysis->'assets')
  loop
    insert into public.message_assets (
      message_id,
      org_id,
      node_id,
      asset_type,
      asset_title,
      asset_content,
      importance_score,
      urgency_score,
      actionable,
      action_required
    )
    select
      p_message_id,
      ml.org_id,
      ml.target_node_id,
      (v_asset->>'type')::message_asset_type,
      v_asset->>'title',
      v_asset->>'content',
      (v_asset->>'importance')::decimal,
      (v_asset->>'urgency')::decimal,
      (v_asset->>'actionable')::boolean,
      v_asset->>'action_required'
    from public.message_logs ml
    where ml.id = p_message_id
    returning id into v_asset_id;
    
    return next v_asset_id;
  end loop;
  
  return;
end;
$$ language plpgsql;

-- ============================================================================
-- PART 7: RLS 정책
-- ============================================================================

alter table public.decision_logs enable row level security;
alter table public.decision_patterns enable row level security;
alter table public.message_logs enable row level security;
alter table public.message_assets enable row level security;

-- 조직 기반 접근 정책
create policy decision_logs_org_access on public.decision_logs
  for all using (org_id in (select get_user_org_ids()));

create policy decision_patterns_org_access on public.decision_patterns
  for all using (org_id in (select get_user_org_ids()));

create policy message_logs_org_access on public.message_logs
  for all using (org_id in (select get_user_org_ids()));

create policy message_assets_org_access on public.message_assets
  for all using (org_id in (select get_user_org_ids()));

-- ============================================================================
-- PART 8: 코멘트
-- ============================================================================

comment on table public.decision_logs is '의사결정 로그 - 원장의 모든 판단을 추적하여 판단 상수 추출';
comment on table public.decision_patterns is '판단 패턴 - 학습된 의사결정 규칙, 자동화 가능 수준 설정';
comment on table public.message_logs is '메시지 로그 - 카카오 알림톡/SMS 등 모든 대화 수집';
comment on table public.message_assets is '메시지 자산 - 대화에서 추출된 가치 있는 정보 노드';

comment on function match_decision_pattern is '새로운 결정에 대해 유사한 과거 패턴 매칭';
comment on function extract_message_assets is 'AI 분석 결과에서 메시지 자산 추출 및 저장';

-- ============================================================================
-- 완료
-- ============================================================================
