/**
 * 🔒 AUTUS Contract Rules
 *
 * 시스템 = 계약
 * 이 파일에 정의된 규칙이 곧 계약 조항이다.
 *
 * C1: 행동 불가능성 - 허용되지 않은 상태 전이는 UI에 존재하지 않음
 * C2: 자동 책임 분기 - Fact → 책임자 자동 지정
 * C3: 사전 승인 게이트 - 승인 없이 실행 불가
 * C4: 되돌림 비용 - 해지/취소 시 비용 명시
 * C5: 자동 증빙 - 모든 행위 불변 기록
 * C6: 보험 트리거 - 조건 충족 시 자동 실행
 */

// ============================================
// 상태 정의
// ============================================
export const STUDENT_STATUS = {
  REGISTERED: 'registered',    // 등록완료
  ACTIVE: 'active',           // 수강중
  PAUSED: 'paused',           // 휴강
  QUIT: 'quit',               // 퇴원
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',         // 결제대기
  APPROVED: 'approved',       // 결제승인
  FAILED: 'failed',           // 결제실패
  REFUND: 'refund',           // 환불처리
};

export const CLASS_STATUS = {
  SCHEDULED: 'scheduled',     // 수업예정
  ONGOING: 'ongoing',         // 수업중
  COMPLETED: 'completed',     // 수업완료
  CANCELLED: 'cancelled',     // 수업취소
};

// ============================================
// C1: 허용된 상태 전이 규칙 (행동 불가능성)
// ============================================
export const ALLOWED_TRANSITIONS = {
  student: {
    [STUDENT_STATUS.REGISTERED]: [STUDENT_STATUS.ACTIVE],  // 등록 → 수강만 가능
    [STUDENT_STATUS.ACTIVE]: [STUDENT_STATUS.PAUSED, STUDENT_STATUS.QUIT],
    [STUDENT_STATUS.PAUSED]: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.QUIT],
    [STUDENT_STATUS.QUIT]: [],  // 퇴원 후 전이 불가 (재등록 필요)
  },
  payment: {
    [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.APPROVED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.APPROVED]: [PAYMENT_STATUS.REFUND],  // 승인 후 환불만 가능
    [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING],   // 실패 후 재시도
    [PAYMENT_STATUS.REFUND]: [],  // 환불 후 전이 불가
  },
  class: {
    [CLASS_STATUS.SCHEDULED]: [CLASS_STATUS.ONGOING, CLASS_STATUS.CANCELLED],
    [CLASS_STATUS.ONGOING]: [CLASS_STATUS.COMPLETED],
    [CLASS_STATUS.COMPLETED]: [],  // 완료 후 전이 불가
    [CLASS_STATUS.CANCELLED]: [],  // 취소 후 전이 불가
  },
};

// ============================================
// C3: 사전 승인 게이트 규칙
// ============================================
export const GATE_RULES = {
  // 학생 상태 변경 게이트
  'student.active': {
    required: ['payment.approved'],  // 결제 승인 필수
    approver: 'owner',               // 원장 승인
  },
  'student.paused': {
    required: [],
    approver: 'owner',               // 원장 승인
    maxDays: 30,                     // 최대 30일 휴강
  },
  'student.quit': {
    required: [],
    approver: 'owner',               // 원장 승인
    lockIn: { type: 'refund_fee', rate: 0.1 },  // C4: 환불 수수료 10%
  },

  // 결제 게이트
  'payment.approved': {
    required: [],
    approver: 'owner',               // 원장 승인
  },
  'payment.refund': {
    required: [],
    approver: 'owner',
    condition: { withinDays: 7 },    // C6: 7일 이내만 환불
    lockIn: { type: 'refund_fee', rate: 0.1 },
  },

  // 수업 게이트
  'class.cancelled': {
    required: [],
    approver: 'admin',
    autoLiability: 'coach',          // C2: 취소 시 코치 책임 자동 지정
  },
};

// ============================================
// C2: 자동 책임 분기 규칙
// ============================================
export const LIABILITY_RULES = {
  'class.cancelled.coach_absent': {
    liability: 'coach',
    action: 'salary_deduction',
    rate: 0.1,
  },
  'class.cancelled.system_error': {
    liability: 'autus',
    action: 'credit_compensation',
  },
  'class.cancelled.weather': {
    liability: 'none',
    action: 'reschedule',
  },
  'payment.failed.card_declined': {
    liability: 'parent',
    action: 'notify_retry',
  },
  'student.quit.attendance_below_50': {
    liability: 'coach',
    action: 'review_required',
  },
};

// ============================================
// C4: 되돌림 비용 규칙
// ============================================
export const LOCK_IN_COSTS = {
  'student.quit': {
    fee_type: 'refund_fee',
    rate: 0.1,  // 10% 수수료
    description: '환불 수수료 10%',
  },
  'payment.refund': {
    fee_type: 'processing_fee',
    rate: 0.05,  // 5% 수수료
    description: '결제 취소 수수료 5%',
    condition: {
      after_days: 7,
      rate_increase: 0.1,  // 7일 후 10%로 증가
    },
  },
  'class.cancelled.by_parent': {
    fee_type: 'cancellation_fee',
    rate: 0.2,  // 20% 수수료
    condition: {
      within_hours: 24,  // 24시간 이내 취소 시
    },
    description: '당일 취소 수수료 20%',
  },
};

// ============================================
// C6: 보험/보증 트리거 규칙
// ============================================
export const INSURANCE_TRIGGERS = {
  'attendance.streak_broken': {
    condition: { consecutive_absences: 3 },
    action: 'auto_pause',
    notify: ['owner', 'parent'],
  },
  'payment.overdue': {
    condition: { days_overdue: 30 },
    action: 'auto_suspend',
    notify: ['owner', 'parent', 'admin'],
  },
  'class.injury': {
    condition: { type: 'injury_report' },
    action: 'insurance_claim',
    notify: ['owner', 'parent', 'insurance'],
  },
};

// ============================================
// 계약 검증 함수들
// ============================================

/**
 * C1: 상태 전이 가능 여부 확인
 */
export function canTransition(category, currentStatus, targetStatus) {
  const allowed = ALLOWED_TRANSITIONS[category]?.[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * C3: 게이트 통과 여부 확인
 */
export function checkGate(action, context) {
  const gate = GATE_RULES[action];
  if (!gate) return { allowed: true };

  // 필수 조건 확인
  for (const req of gate.required || []) {
    if (!context[req]) {
      return {
        allowed: false,
        reason: `Required condition not met: ${req}`,
        gate: gate,
      };
    }
  }

  // 승인자 확인
  if (gate.approver && context.currentRole !== gate.approver) {
    return {
      allowed: false,
      reason: `Requires ${gate.approver} approval`,
      gate: gate,
      requiresApproval: true,
    };
  }

  return { allowed: true, gate };
}

/**
 * C4: 되돌림 비용 계산
 */
export function calculateLockInCost(action, context) {
  const cost = LOCK_IN_COSTS[action];
  if (!cost) return null;

  let rate = cost.rate;
  let description = cost.description;

  // 조건부 비용 증가
  if (cost.condition) {
    if (cost.condition.after_days && context.daysSinceAction > cost.condition.after_days) {
      rate = cost.condition.rate_increase || rate;
      description += ` (${cost.condition.after_days}일 경과)`;
    }
    if (cost.condition.within_hours && context.hoursUntilClass < cost.condition.within_hours) {
      description += ` (${cost.condition.within_hours}시간 이내)`;
    }
  }

  return {
    fee_type: cost.fee_type,
    rate,
    amount: context.baseAmount ? Math.round(context.baseAmount * rate) : null,
    description,
  };
}

/**
 * C2: 책임 자동 분기
 */
export function autoAssignLiability(event, context) {
  const key = `${event.category}.${event.action}.${event.reason}`;
  const rule = LIABILITY_RULES[key] || LIABILITY_RULES[`${event.category}.${event.action}`];

  if (!rule) return null;

  return {
    liability: rule.liability,
    action: rule.action,
    rate: rule.rate,
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * C6: 보험/보증 트리거 체크
 */
export function checkInsuranceTriggers(event, context) {
  const triggers = [];

  for (const [key, trigger] of Object.entries(INSURANCE_TRIGGERS)) {
    const [category, action] = key.split('.');

    if (event.category === category) {
      let shouldTrigger = false;

      // 조건 확인
      if (trigger.condition.consecutive_absences) {
        shouldTrigger = context.consecutiveAbsences >= trigger.condition.consecutive_absences;
      }
      if (trigger.condition.days_overdue) {
        shouldTrigger = context.daysOverdue >= trigger.condition.days_overdue;
      }
      if (trigger.condition.type && event.type === trigger.condition.type) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        triggers.push({
          key,
          action: trigger.action,
          notify: trigger.notify,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return triggers;
}

/**
 * C5: 증빙 생성 (모든 행위 기록)
 */
export function createEvidence(action, context, result) {
  return {
    id: `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    actor: context.currentUser?.id,
    actorRole: context.currentRole,
    target: context.targetId,
    before: context.beforeState,
    after: result.afterState,
    gate: result.gate || null,
    lockInCost: result.lockInCost || null,
    liability: result.liability || null,
    triggers: result.triggers || [],
    immutable: true,  // 불변 표시
    hash: generateHash(action, context, result),  // 무결성 해시
  };
}

/**
 * 간단한 해시 생성 (실제로는 SHA-256 등 사용)
 */
function generateHash(action, context, result) {
  const data = JSON.stringify({ action, context: { ...context, timestamp: undefined }, result });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================
// 역할별 허용 액션 (C1 구현)
// ============================================
export const ROLE_PERMISSIONS = {
  owner: {
    canApprove: true,
    canAssignRoles: true,
    canViewAll: true,
    canDecide: ['payment', 'refund', 'quit', 'pause'],
    cannotDo: [],
  },
  admin: {
    canApprove: false,
    canAssignRoles: false,
    canViewAll: true,
    canDecide: ['class.cancel'],
    canRequestApproval: ['payment', 'refund'],
    cannotDo: ['decide.payment', 'decide.quit'],
  },
  coach: {
    canApprove: false,
    canAssignRoles: false,
    canViewAll: false,
    canDecide: ['class.start', 'class.end', 'attendance'],
    canRequestApproval: [],
    cannotDo: ['decide.payment', 'decide.quit', 'view.payments'],
  },
  parent: {
    canApprove: false,
    canAssignRoles: false,
    canViewAll: false,
    canDecide: [],
    canRequest: ['pause', 'quit', 'refund'],
    cannotDo: ['view.other_students', 'decide.anything'],
  },
};

/**
 * 역할 기반 액션 가능 여부
 */
export function canPerformAction(role, action) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // 금지된 액션 확인
  if (permissions.cannotDo.includes(action)) return false;

  // 결정 권한 확인
  if (action.startsWith('decide.')) {
    const target = action.replace('decide.', '');
    return permissions.canDecide?.includes(target);
  }

  // 요청 권한 확인
  if (action.startsWith('request.')) {
    const target = action.replace('request.', '');
    return permissions.canRequest?.includes(target) || permissions.canRequestApproval?.includes(target);
  }

  return true;
}

export default {
  STUDENT_STATUS,
  PAYMENT_STATUS,
  CLASS_STATUS,
  ALLOWED_TRANSITIONS,
  GATE_RULES,
  LIABILITY_RULES,
  LOCK_IN_COSTS,
  INSURANCE_TRIGGERS,
  ROLE_PERMISSIONS,
  canTransition,
  checkGate,
  calculateLockInCost,
  autoAssignLiability,
  checkInsuranceTriggers,
  createEvidence,
  canPerformAction,
};
