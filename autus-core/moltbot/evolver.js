/**
 * MoltBot Evolver - AUTUS 진화 엔진
 *
 * 몰트봇은 코드 생성기가 아님
 * 몰트봇의 입력은 사람의 개입(Intervention)
 *
 * 처리 루프:
 * 1. 사용자 요청 → Intent 컴파일
 * 2. 헌법 필터 → Auto / Approval / Forbidden 판정
 * 3. 기능 생성 ❌ → 행위 조합
 * 4. Shadow 실행
 * 5. 반복 개입 → Rule 후보
 * 6. 성과 없으면 폐기
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// 헌법 (Constitution)
// ============================================
const CONSTITUTION = {
  // 자동 허용 (저위험)
  AUTO: [
    'send_notification',           // 알림 발송
    'send_reminder',               // 리마인드 발송
    'update_status_display',       // 상태 표시 업데이트
    'generate_report'              // 리포트 생성
  ],

  // 승인 필요 (중/고위험)
  APPROVAL: [
    'discount_approval',           // 할인 승인
    'refund_approval',             // 환불 승인
    'instructor_change',           // 강사 교체
    'policy_exception',            // 정책 예외
    'rule_promotion',              // 규칙 승급
    'class_cancellation',          // 수업 취소
    'membership_change'            // 회원 상태 변경
  ],

  // 금지 (절대 자동화 불가)
  FORBIDDEN: [
    'delete_data',                 // 데이터 삭제
    'bypass_payment',              // 결제 우회
    'access_external_system',      // 외부 시스템 접근 (승인 없이)
    'modify_audit_log',            // 감사 로그 수정
    'disable_kill_switch'          // 킬스위치 비활성화
  ]
};

// ============================================
// Intent 컴파일러
// ============================================
function compileIntent(request) {
  // 요청을 의도(Intent)로 변환
  const intent = {
    original: request,
    action_type: null,
    target: null,
    params: {},
    constitution_class: null
  };

  // 키워드 기반 분류 (실제로는 LLM 사용)
  const keywords = {
    '알림': 'send_notification',
    '리마인드': 'send_reminder',
    '할인': 'discount_approval',
    '환불': 'refund_approval',
    '강사 교체': 'instructor_change',
    '삭제': 'delete_data'
  };

  for (const [keyword, action] of Object.entries(keywords)) {
    if (request.includes(keyword)) {
      intent.action_type = action;
      break;
    }
  }

  // 헌법 분류
  if (CONSTITUTION.FORBIDDEN.includes(intent.action_type)) {
    intent.constitution_class = 'FORBIDDEN';
  } else if (CONSTITUTION.APPROVAL.includes(intent.action_type)) {
    intent.constitution_class = 'APPROVAL';
  } else if (CONSTITUTION.AUTO.includes(intent.action_type)) {
    intent.constitution_class = 'AUTO';
  } else {
    intent.constitution_class = 'UNKNOWN';
  }

  return intent;
}

// ============================================
// Shadow 실행기
// ============================================
async function executeShadow(rule, targetMember, context) {
  // Shadow 모드: 예측만 하고 실행하지 않음
  const prediction = {
    rule_id: rule.id,
    action_type: rule.action_type,
    action_params: rule.action_params,
    target_member_id: targetMember.id,
    predicted_at: new Date().toISOString()
  };

  // 실행 로그 기록
  await supabase
    .from('autus_rule_executions')
    .insert({
      rule_id: rule.id,
      brand: rule.brand,
      trigger_event_type: context.event_type,
      trigger_event_id: context.event_id,
      target_member_id: targetMember.id,
      mode: 'shadow',
      action_type: rule.action_type,
      action_params: rule.action_params,
      predicted_action: prediction,
      execution_status: 'pending'
    });

  return prediction;
}

// ============================================
// Intervention 학습기
// ============================================
async function learnFromIntervention(intervention) {
  /**
   * 학습 대상:
   * - 기능 ❌
   * - 프롬프트 ❌
   * - 사람의 판단 기록 ⭕
   */

  // 1. 유사한 Shadow 예측 찾기
  const { data: pendingShadows } = await supabase
    .from('autus_rule_executions')
    .select('*')
    .eq('target_member_id', intervention.target_id)
    .eq('mode', 'shadow')
    .eq('execution_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!pendingShadows || pendingShadows.length === 0) {
    return { learned: false, reason: 'No pending shadow predictions' };
  }

  // 2. Shadow 예측과 실제 Intervention 비교
  const results = [];

  for (const shadow of pendingShadows) {
    const match = compareActions(shadow.predicted_action, intervention);

    // 결과 업데이트
    await supabase
      .from('autus_rule_executions')
      .update({
        human_action: {
          action_type: intervention.action_type,
          actor_id: intervention.actor_id,
          occurred_at: intervention.occurred_at
        },
        match_result: match,
        execution_status: 'compared'
      })
      .eq('id', shadow.id);

    results.push({ shadow_id: shadow.id, match });
  }

  // 3. 반복 패턴 감지 → Rule 후보
  const ruleCandidate = await detectRuleCandidate(intervention);

  return {
    learned: true,
    comparisons: results,
    rule_candidate: ruleCandidate
  };
}

// ============================================
// 액션 비교
// ============================================
function compareActions(predicted, actual) {
  if (!predicted || !actual) return false;

  // 액션 타입 비교
  if (predicted.action_type !== actual.action_type) return false;

  // 추가 비교 로직 (시간, 채널 등)
  // ...

  return true;
}

// ============================================
// Rule 후보 감지
// ============================================
async function detectRuleCandidate(intervention) {
  // 최근 30일간 동일 actor_role, action_type의 Intervention 수 조회
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentInterventions, count } = await supabase
    .from('autus_interventions')
    .select('*', { count: 'exact' })
    .eq('brand', intervention.brand)
    .eq('action_type', intervention.action_type)
    .gte('occurred_at', thirtyDaysAgo.toISOString());

  // 5회 이상 반복되면 Rule 후보
  if (count >= 5) {
    return {
      suggested: true,
      action_type: intervention.action_type,
      occurrence_count: count,
      message: `"${intervention.action_type}" 액션이 30일간 ${count}회 반복됨. Shadow Rule 생성 권장.`
    };
  }

  return { suggested: false };
}

// ============================================
// Rule 승급 체크
// ============================================
async function checkRulePromotion(ruleId) {
  const { data: rule } = await supabase
    .from('autus_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (!rule) return { eligible: false, reason: 'Rule not found' };

  // 승급 조건 체크
  const eligible =
    rule.mode === 'shadow' &&
    rule.shadow_accuracy >= rule.promotion_threshold &&
    rule.shadow_executions >= rule.min_shadow_executions &&
    rule.risk_level === 'low';

  if (!eligible) {
    return {
      eligible: false,
      reason: `Not eligible: accuracy=${rule.shadow_accuracy}%, executions=${rule.shadow_executions}, threshold=${rule.promotion_threshold}%`
    };
  }

  // 승인 카드 생성 (자동 승급 불가, Approval 필수)
  const { data: approvalCard } = await supabase
    .from('autus_approval_cards')
    .insert({
      brand: rule.brand,
      requested_by: 'moltbot',
      request_type: 'rule_promotion',
      target_type: 'rule',
      target_id: rule.id,
      context: {
        rule_name: rule.name,
        shadow_accuracy: rule.shadow_accuracy,
        shadow_executions: rule.shadow_executions
      }
    })
    .select()
    .single();

  return {
    eligible: true,
    approval_card_id: approvalCard?.id,
    message: `Rule "${rule.name}" is ready for promotion. Approval card created.`
  };
}

// ============================================
// 메인 처리 루프
// ============================================
export async function processRequest(request, context) {
  // 1. Intent 컴파일
  const intent = compileIntent(request);
  console.log('[MoltBot] Intent compiled:', intent);

  // 2. 헌법 필터
  if (intent.constitution_class === 'FORBIDDEN') {
    return {
      status: 'rejected',
      reason: 'Action is forbidden by constitution',
      intent
    };
  }

  if (intent.constitution_class === 'APPROVAL') {
    // 승인 카드 생성
    const { data: approvalCard } = await supabase
      .from('autus_approval_cards')
      .insert({
        brand: context.brand,
        requested_by: context.actor_id || 'moltbot',
        request_type: intent.action_type,
        target_type: context.target_type,
        target_id: context.target_id,
        context: { original_request: request, intent }
      })
      .select()
      .single();

    return {
      status: 'pending_approval',
      approval_card_id: approvalCard?.id,
      intent
    };
  }

  // 3. Auto 처리 (Shadow 모드에서는 예측만)
  if (intent.constitution_class === 'AUTO') {
    // 관련 Rule 찾기
    const { data: rules } = await supabase
      .from('autus_rules')
      .select('*')
      .eq('brand', context.brand)
      .eq('action_type', intent.action_type)
      .in('mode', ['shadow', 'auto']);

    for (const rule of rules || []) {
      if (rule.mode === 'shadow') {
        await executeShadow(rule, context.target, context);
      } else if (rule.mode === 'auto' && rule.kill_switch_enabled) {
        // Auto 실행
        // TODO: 실제 액션 실행
      }
    }

    return {
      status: 'processed',
      mode: rules?.[0]?.mode || 'no_rule',
      intent
    };
  }

  return {
    status: 'unknown',
    intent
  };
}

// ============================================
// Intervention 웹훅 핸들러
// ============================================
export async function handleInterventionWebhook(intervention) {
  console.log('[MoltBot] Intervention received:', intervention.action_type);

  // 학습
  const learningResult = await learnFromIntervention(intervention);

  // Rule 후보가 있으면 알림
  if (learningResult.rule_candidate?.suggested) {
    console.log('[MoltBot] Rule candidate detected:', learningResult.rule_candidate);
    // TODO: 관리자에게 알림
  }

  return learningResult;
}

// ============================================
// 내보내기
// ============================================
export {
  compileIntent,
  executeShadow,
  learnFromIntervention,
  checkRulePromotion,
  CONSTITUTION
};

/**
 * MoltBot 역할 요약:
 *
 * ✅ 사람의 판단(Intervention) 학습
 * ✅ Shadow 예측과 실제 행동 비교
 * ✅ 반복 패턴 → Rule 후보 감지
 * ✅ 승급 조건 충족 시 Approval Card 생성
 *
 * ❌ 코드 생성
 * ❌ 프롬프트 생성
 * ❌ 기능 생성
 */
