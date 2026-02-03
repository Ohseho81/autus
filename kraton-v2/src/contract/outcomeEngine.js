/**
 * 🎯 AUTUS Outcome Engine
 *
 * OutcomeFact 10개 기반 프로세스 자동 생성 엔진
 *
 * 핵심 원칙:
 * - 고객 로그가 모든 것을 만든다
 * - OutcomeFact 10개 외 추가 금지 (LOCKED)
 * - Force는 OutcomeFact를 직접 생성할 수 없음
 */

import outcomeRules from './outcome_rules.json';
import synthesisRules from './synthesis_rules.json';

// ============================================
// 상수
// ============================================

export const OUTCOME_TYPES = Object.keys(outcomeRules.outcome_facts);
export const SYNTHESIS_LOOPS = synthesisRules.synthesis_loops;
export const STATES = synthesisRules.state_machine.states;

// ============================================
// OutcomeFact 생성
// ============================================

/**
 * OutcomeFact 생성 (유효성 검증 포함)
 */
export function createOutcomeFact(type, data) {
  // 타입 검증
  if (!OUTCOME_TYPES.includes(type)) {
    throw new Error(`Invalid OutcomeFact type: ${type}. Only 10 types allowed.`);
  }

  const rule = outcomeRules.outcome_facts[type];
  const commonFields = outcomeRules.common_fields;

  // 필수 필드 검증
  const requiredFields = Object.entries(commonFields)
    .filter(([_, schema]) => schema.required)
    .map(([field]) => field);

  for (const field of requiredFields) {
    if (!(field in data) && field !== 'outcome_type') {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // OutcomeFact 객체 생성
  const outcomeFact = {
    id: `OF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    outcome_type: type,
    consumer_id: data.consumer_id,
    subject_id: data.subject_id,
    value: data.value || {},
    timestamp: data.timestamp || new Date().toISOString(),
    channel: data.channel,
    context: data.context || {},

    // 메타데이터
    _meta: {
      outcome_id: rule.id,
      severity: rule.severity,
      requires_approval: rule.requires_approval || false,
      approval_level: rule.approval_level || null,
      shadow_first: rule.shadow_first || false,
      rule: rule.rule
    }
  };

  return outcomeFact;
}

// ============================================
// State Transition 계산
// ============================================

/**
 * OutcomeFact에서 State Transition 경로 계산
 */
export function calculateTransition(outcomeFact) {
  const mapping = synthesisRules.mappings[outcomeFact.outcome_type];

  if (!mapping) {
    throw new Error(`No mapping found for: ${outcomeFact.outcome_type}`);
  }

  const transition = mapping.transition;

  return {
    from: transition.from,
    path: transition.path,
    through: transition.through || [],
    to: transition.to,
    escalation_to: transition.escalation_to || null,
    escalation_condition: transition.escalation_condition || null,
    approval_required: transition.approval_required
  };
}

// ============================================
// Synthesis 조합 계산
// ============================================

/**
 * OutcomeFact에서 Synthesis 루프 조합 계산
 */
export function calculateSynthesis(outcomeFact, context = {}) {
  const mapping = synthesisRules.mappings[outcomeFact.outcome_type];

  if (!mapping) {
    throw new Error(`No mapping found for: ${outcomeFact.outcome_type}`);
  }

  let loops = [...mapping.synthesis];

  // 조건부 루프 추가
  if (mapping.synthesis_conditional) {
    const conditional = mapping.synthesis_conditional;

    // 예: renewal.failed에서 원인에 따라 A 또는 P 추가
    if (conditional.if_reason_attendance && context.reason === 'attendance') {
      loops.push(...conditional.if_reason_attendance);
    }
    if (conditional.if_reason_payment && context.reason === 'payment') {
      loops.push(...conditional.if_reason_payment);
    }
    if (conditional.if_escalated && context.escalated) {
      loops.push(...conditional.if_escalated);
    }
  }

  // 중복 제거
  loops = [...new Set(loops)];

  return {
    loops,
    description: mapping.synthesis_description,
    auto_actions: mapping.auto_actions || []
  };
}

// ============================================
// Gate (승인 게이트) 검사
// ============================================

/**
 * 승인 게이트 필요 여부 및 상세 정보
 */
export function checkGate(outcomeFact) {
  const mapping = synthesisRules.mappings[outcomeFact.outcome_type];
  const rule = outcomeRules.outcome_facts[outcomeFact.outcome_type];

  const isAlwaysApproval = outcomeRules.gate_rules.always_approval.includes(outcomeFact.outcome_type);
  const isShadowFirst = outcomeRules.gate_rules.shadow_first.includes(outcomeFact.outcome_type);

  if (!rule.requires_approval && !isAlwaysApproval) {
    return { required: false };
  }

  return {
    required: true,
    level: rule.approval_level,
    gate_type: mapping.gate?.type || 'STANDARD',
    shadow_first: isShadowFirst,
    s3_requirements: outcomeRules.gate_rules.s3_requirements,
    blocked_auto_actions: mapping.gate?.auto_actions_blocked || [],
    ttl: mapping.gate?.ttl || null,
    budget_cap: mapping.gate?.budget_cap || false,
    emotional_block: mapping.gate?.emotional_block || false
  };
}

// ============================================
// Decision Card 생성
// ============================================

/**
 * OutcomeFact에서 Decision Card 생성
 */
export function generateDecisionCard(outcomeFact, context = {}) {
  const transition = calculateTransition(outcomeFact);
  const synthesis = calculateSynthesis(outcomeFact, context);
  const gate = checkGate(outcomeFact);
  const rule = outcomeRules.outcome_facts[outcomeFact.outcome_type];

  const card = {
    id: `DC_${Date.now()}`,
    outcome_fact_id: outcomeFact.id,
    outcome_type: outcomeFact.outcome_type,
    created_at: new Date().toISOString(),

    // State
    current_state: transition.from[0],
    target_state: gate.shadow_first ? 'S7' : transition.to,
    path: transition.path,

    // Synthesis
    synthesis_loops: synthesis.loops,
    auto_actions: synthesis.auto_actions,

    // Gate
    gate_required: gate.required,
    gate_level: gate.level,
    gate_type: gate.gate_type,

    // S3 필수 필드 (승인 필요 시)
    decision: gate.required ? {
      ttl: null,           // 결정 기한 (필수)
      decision_cost: null, // 결정 비용 (필수)
      long_term: null,     // UP / DOWN / UNK (필수)
      approver: null,
      approved_at: null
    } : null,

    // 메타
    severity: rule.severity,
    rule: rule.rule,
    kill_candidate: synthesisRules.mappings[outcomeFact.outcome_type].kill_candidate || false
  };

  return card;
}

// ============================================
// Shadow 승격 검사
// ============================================

/**
 * Shadow 상태에서 승격 여부 판단
 */
export function checkShadowEscalation(outcomeFact, history = []) {
  const mapping = synthesisRules.mappings[outcomeFact.outcome_type];

  if (!mapping.shadow) {
    return { shouldEscalate: false, reason: 'Not a shadow type' };
  }

  const threshold = mapping.shadow.escalation_threshold;
  const severityTrigger = mapping.shadow.escalation_on_severity;

  // 심각도 기반 즉시 승격
  if (outcomeFact.value?.intensity === severityTrigger) {
    return {
      shouldEscalate: true,
      reason: `Severity: ${severityTrigger}`,
      escalate_to: mapping.transition.escalation_to
    };
  }

  // 반복 횟수 기반 승격
  const repeatCount = history.filter(h =>
    h.outcome_type === outcomeFact.outcome_type &&
    h.consumer_id === outcomeFact.consumer_id
  ).length + 1;

  if (repeatCount >= threshold) {
    return {
      shouldEscalate: true,
      reason: `Repeat count: ${repeatCount} >= ${threshold}`,
      escalate_to: mapping.transition.escalation_to
    };
  }

  return {
    shouldEscalate: false,
    reason: `Repeat count: ${repeatCount} < ${threshold}`,
    current_count: repeatCount,
    threshold
  };
}

// ============================================
// 리플레이 시나리오 생성 (테스트용)
// ============================================

/**
 * 리플레이 시나리오 템플릿 생성
 */
export function generateReplayScenarios() {
  const scenarios = [];
  const categories = synthesisRules.replay_validation.categories;

  categories.forEach((category, idx) => {
    // 각 카테고리별 3-4개 시나리오
    scenarios.push({
      id: `REPLAY_${String(idx + 1).padStart(2, '0')}_${category}_normal`,
      category,
      description: `${category} 정상 케이스`,
      outcome_type: getOutcomeTypeByCategory(category),
      context: { severity: 'normal' },
      expected_state: 'S6'
    });

    scenarios.push({
      id: `REPLAY_${String(idx + 1).padStart(2, '0')}_${category}_gate`,
      category,
      description: `${category} 승인 게이트 케이스`,
      outcome_type: getOutcomeTypeByCategory(category),
      context: { severity: 'high', requires_approval: true },
      expected_state: 'S3'
    });
  });

  return scenarios.slice(0, 30); // 30개 제한
}

function getOutcomeTypeByCategory(category) {
  const mapping = {
    inquiry: 'inquiry.created',
    renewal: 'renewal.failed',
    attendance: 'attendance.drop',
    payment: 'payment.friction',
    makeup: 'makeup.requested',
    discount: 'discount.requested',
    teacher_change: 'teacher.change_requested',
    complaint: 'complaint.mismatch',
    notification: 'notification.ignored'
  };
  return mapping[category] || 'inquiry.created';
}

// ============================================
// 제약 조건 검증
// ============================================

/**
 * Force가 OutcomeFact를 직접 생성하려는 시도 차단
 */
export function validateSource(source) {
  const invalidSources = ['force', 'external_force', 'internal_force', 'condition_force'];

  if (invalidSources.includes(source?.toLowerCase())) {
    throw new Error('CONSTRAINT VIOLATION: Force cannot directly create OutcomeFact. Force can only affect OutcomeFact delta.');
  }

  return true;
}

/**
 * OutcomeFact 타입 추가 시도 차단
 */
export function validateOutcomeTypeAddition(newType) {
  if (OUTCOME_TYPES.length >= outcomeRules.constraints.max_outcome_types) {
    throw new Error(`CONSTRAINT VIOLATION: Maximum ${outcomeRules.constraints.max_outcome_types} OutcomeFact types. Addition is ${outcomeRules.constraints.addition_policy}.`);
  }
  return false; // 항상 차단
}

// ============================================
// Export
// ============================================

export default {
  // 상수
  OUTCOME_TYPES,
  SYNTHESIS_LOOPS,
  STATES,

  // 생성
  createOutcomeFact,
  generateDecisionCard,
  generateReplayScenarios,

  // 계산
  calculateTransition,
  calculateSynthesis,
  checkGate,
  checkShadowEscalation,

  // 검증
  validateSource,
  validateOutcomeTypeAddition,

  // Raw 규칙
  outcomeRules,
  synthesisRules
};
