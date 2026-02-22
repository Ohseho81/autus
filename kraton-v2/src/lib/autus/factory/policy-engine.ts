/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS Policy Engine
 *
 * JSON 규칙 기반 정책 평가 엔진
 * - OutcomeFact 분류 (S / A / TERMINAL)
 * - Shadow 요청 평가 (auto_approve / auto_reject / pending)
 * - Threshold 확인
 * - Loop / Process / Velocity 조회
 *
 * Rules are inlined from autus-core/rules/*.json
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export type OutcomeTier = 'S' | 'A' | 'TERMINAL';

export interface OutcomeClassification {
  tier: OutcomeTier;
  weight: number;
  process?: string;
  label?: string;
  urgency?: string;
  notify?: string[];
}

export interface ProcessStep {
  action: string;
  delay: number;
}

export interface ProcessDefinition {
  trigger: string;
  steps: ProcessStep[];
  success_outcome: string;
  fail_outcome: string;
  max_days: number;
}

export interface LoopDefinition {
  id: string;
  name: string;
  description: string;
  states: string[];
  close_condition: string;
  open_condition: string | null;
  timeout_days: number | null;
  value: number;
}

export interface ShadowCategory {
  label: string;
  approval_rate: number;
  auto_approve_condition: string | null;
  auto_reject_condition: string | null;
  approval_authority: string;
  description: string;
}

export interface ShadowEvaluation {
  decision: 'auto_approve' | 'auto_reject' | 'pending';
  authority: string;
  approval_rate: number;
  reason: string;
}

export interface ThresholdEntry {
  value: number;
  unit: string;
  description: string;
}

export interface VelocityStatus {
  status: 'green' | 'yellow' | 'red';
  label: string;
  color: string;
  action: string;
}

export interface OutcomeRouting {
  screen: string | null;
  role: string | null;
  priority: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Inlined Rules: outcome_rules.json
// ═══════════════════════════════════════════════════════════════════════════

const OUTCOME_TIERS: Record<OutcomeTier, { description: string; trigger: boolean }> = {
  S: {
    description: '즉시 프로세스 생성',
    trigger: true,
  },
  A: {
    description: '기록만, 트리거 아님',
    trigger: false,
  },
  TERMINAL: {
    description: '최종 상태, 더 이상 액션 없음',
    trigger: false,
  },
};

const OUTCOMES: Record<string, {
  tier: OutcomeTier;
  label: string;
  weight: number;
  description: string;
  process?: string;
  urgency?: string;
  notify?: string[];
  threshold_key?: string;
  log_only?: boolean;
  terminal?: boolean;
}> = {
  'renewal.failed': {
    tier: 'S',
    label: '재등록 실패',
    weight: -1.0,
    description: '재등록 결제 미완료',
    process: 'retention_process',
    urgency: 'critical',
    notify: ['owner', 'admin'],
  },
  'attendance.drop': {
    tier: 'S',
    label: '출석률 하락',
    weight: -0.5,
    description: '연속 결석 임계치 초과',
    threshold_key: 'consecutive_absence',
    process: 'recovery_process',
    urgency: 'high',
    notify: ['coach', 'admin'],
  },
  'notification.ignored': {
    tier: 'S',
    label: '알림 무응답',
    weight: -0.3,
    description: '알림 무응답 기간 초과',
    threshold_key: 'notification_ignore_days',
    process: 'engagement_process',
    urgency: 'medium',
    notify: ['admin'],
  },
  'renewal.succeeded': {
    tier: 'A',
    label: '재등록 성공',
    weight: 1.0,
    description: '재등록 결제 완료',
    log_only: true,
  },
  'attendance.normal': {
    tier: 'A',
    label: '정상 출석',
    weight: 0.3,
    description: '예정된 수업 출석 완료',
    log_only: true,
  },
  'notification.read': {
    tier: 'A',
    label: '알림 확인',
    weight: 0.2,
    description: '알림 확인 및 반응',
    log_only: true,
  },
  'churn.finalized': {
    tier: 'TERMINAL',
    label: '계약 종료',
    weight: -2.0,
    description: '환불 완료 또는 계약 만료',
    terminal: true,
  },
  'teacher.changed': {
    tier: 'TERMINAL',
    label: '강사 변경 완료',
    weight: 0,
    description: '강사 변경 처리 완료',
    terminal: true,
  },
};

const OUTCOME_ROUTING: Record<string, OutcomeRouting> = {
  'renewal.failed': { screen: 'dashboard', role: 'owner', priority: 'critical' },
  'attendance.drop': { screen: 'classes', role: 'coach', priority: 'high' },
  'notification.ignored': { screen: 'students', role: 'admin', priority: 'medium' },
  'renewal.succeeded': { screen: null, role: null, priority: 'none' },
  'attendance.normal': { screen: null, role: null, priority: 'none' },
  'notification.read': { screen: null, role: null, priority: 'none' },
  'churn.finalized': { screen: 'dashboard', role: 'owner', priority: 'info' },
  'teacher.changed': { screen: null, role: null, priority: 'none' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Inlined Rules: shadow_policy.json
// ═══════════════════════════════════════════════════════════════════════════

const SHADOW_CATEGORIES: Record<string, ShadowCategory> = {
  'makeup.requested': {
    label: '보강 요청',
    approval_rate: 70,
    auto_approve_condition: 'available_slot_exists',
    auto_reject_condition: null,
    approval_authority: 'admin',
    description: '가용 시간대 있으면 자동 승인',
  },
  'schedule.change_requested': {
    label: '시간 변경 요청',
    approval_rate: 50,
    auto_approve_condition: 'target_slot_available',
    auto_reject_condition: 'target_slot_full',
    approval_authority: 'admin',
    description: '목표 시간대 가용 여부에 따라',
  },
  'teacher.change_requested': {
    label: '강사 변경 요청',
    approval_rate: 30,
    auto_approve_condition: null,
    auto_reject_condition: null,
    approval_authority: 'owner',
    description: '원장 직접 판단 필요',
  },
  'discount.requested': {
    label: '할인 요청',
    approval_rate: 15,
    auto_approve_condition: 'first_time_request',
    auto_reject_condition: 'already_discounted',
    approval_authority: 'owner',
    description: '이미 할인 중이면 자동 거절',
  },
  'refund.requested': {
    label: '환불 요청',
    approval_rate: 100,
    auto_approve_condition: null,
    auto_reject_condition: null,
    approval_authority: 'owner',
    description: '반드시 처리 (법적 의무), 승인 후 churn.finalized',
  },
  'complaint.general': {
    label: '일반 불만',
    approval_rate: 5,
    auto_approve_condition: null,
    auto_reject_condition: null,
    approval_authority: 'owner',
    description: '불만 기반 요구는 신중하게',
  },
};

const SHADOW_ESCALATION = {
  admin_to_owner_threshold: 3,
  description: 'admin이 3건 이상 보류 시 owner에게 일괄 에스컬레이션',
};

// ═══════════════════════════════════════════════════════════════════════════
// Inlined Rules: synthesis_rules.json
// ═══════════════════════════════════════════════════════════════════════════

const CLOSED_LOOPS: Record<string, LoopDefinition> = {
  attendance_loop: {
    id: 'L1',
    name: '출석 순환',
    description: '수업예정 -> 출석 -> 다음수업예정',
    states: ['scheduled', 'attended', 'next_scheduled'],
    close_condition: 'attendance.normal',
    open_condition: null,
    timeout_days: null,
    value: 0.3,
  },
  recovery_loop: {
    id: 'L2',
    name: '결석 복귀 순환',
    description: '결석 -> 알림 -> 복귀출석',
    states: ['absent', 'notified', 'recovered'],
    close_condition: 'attendance.normal',
    open_condition: 'attendance.drop',
    timeout_days: 14,
    value: 0.5,
  },
  notification_loop: {
    id: 'L3',
    name: '알림 반응 순환',
    description: '알림발송 -> 확인 -> 반응',
    states: ['sent', 'read', 'responded'],
    close_condition: 'notification.read',
    open_condition: 'notification.ignored',
    timeout_days: 7,
    value: 0.2,
  },
  renewal_loop: {
    id: 'L4',
    name: '재등록 순환',
    description: '만료예정 -> 안내 -> 결제',
    states: ['expiring', 'notified', 'renewed'],
    close_condition: 'renewal.succeeded',
    open_condition: 'renewal.failed',
    timeout_days: 30,
    value: 1.0,
  },
};

const PROCESSES: Record<string, ProcessDefinition> = {
  retention_process: {
    trigger: 'renewal.failed',
    steps: [
      { action: 'send_reminder', delay: 0 },
      { action: 'call_attempt', delay: 3 },
      { action: 'escalate_owner', delay: 7 },
    ],
    success_outcome: 'renewal.succeeded',
    fail_outcome: 'churn.finalized',
    max_days: 14,
  },
  recovery_process: {
    trigger: 'attendance.drop',
    steps: [
      { action: 'send_concern', delay: 0 },
      { action: 'coach_contact', delay: 1 },
      { action: 'offer_makeup', delay: 3 },
    ],
    success_outcome: 'attendance.normal',
    fail_outcome: 'renewal.failed',
    max_days: 14,
  },
  engagement_process: {
    trigger: 'notification.ignored',
    steps: [
      { action: 'channel_switch', delay: 0 },
      { action: 'personal_contact', delay: 3 },
    ],
    success_outcome: 'notification.read',
    fail_outcome: 'attendance.drop',
    max_days: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Inlined Rules: thresholds.json
// ═══════════════════════════════════════════════════════════════════════════

const OUTCOME_THRESHOLDS: Record<string, ThresholdEntry> = {
  consecutive_absence: {
    value: 3,
    unit: '회',
    description: '연속 결석 3회 -> attendance.drop 트리거',
  },
  notification_ignore_days: {
    value: 7,
    unit: '일',
    description: '알림 무응답 7일 -> notification.ignored 트리거',
  },
  renewal_warning_days: {
    value: 30,
    unit: '일',
    description: '만료 30일 전 -> 재등록 안내 시작',
  },
  renewal_critical_days: {
    value: 7,
    unit: '일',
    description: '만료 7일 전 -> 긴급 알림',
  },
};

const VELOCITY_THRESHOLDS: Record<string, {
  min?: number;
  max?: number;
  action: string;
  color: string;
}> = {
  green: {
    min: 0.5,
    action: '확장 가능',
    color: '#10B981',
  },
  yellow: {
    min: -0.2,
    max: 0.5,
    action: '유지',
    color: '#F59E0B',
  },
  red: {
    max: -0.2,
    action: '개선 또는 Kill',
    color: '#EF4444',
  },
};

const CLF_THRESHOLDS = {
  low: {
    max: 15,
    label: '낮음',
    description: '학생 <=8, 연령대 1개, 프로그램 1개',
  },
  medium: {
    min: 15,
    max: 40,
    label: '보통',
    description: '학생 9-15, 연령대 2개, 프로그램 2개',
  },
  high: {
    min: 40,
    label: '높음',
    description: '학생 >15 또는 연령대 3개 이상',
  },
};

const LOOP_TIMEOUTS: Record<string, number | null> = {
  attendance_loop: null,
  recovery_loop: 14,
  notification_loop: 7,
  renewal_loop: 30,
};

const SHADOW_LIMITS = {
  max_pending_per_category: 10,
  auto_archive_days: 30,
  escalation_threshold: 3,
};

// ═══════════════════════════════════════════════════════════════════════════
// Policy Engine Class
// ═══════════════════════════════════════════════════════════════════════════

export class PolicyEngine {
  // ─────────────────────────────────────────────────────────────────────────
  // Outcome Classification
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Classify an outcome type into its tier.
   *
   * @param outcomeType - e.g. 'renewal.failed', 'attendance.normal'
   * @returns tier, weight, and optional process name
   * @throws Error if outcome type is unknown
   */
  classifyOutcome(outcomeType: string): OutcomeClassification {
    const outcome = OUTCOMES[outcomeType];

    if (!outcome) {
      throw new Error(`[PolicyEngine] Unknown outcome type: ${outcomeType}`);
    }

    return {
      tier: outcome.tier,
      weight: outcome.weight,
      process: outcome.process,
      label: outcome.label,
      urgency: outcome.urgency,
      notify: outcome.notify,
    };
  }

  /**
   * Check if an outcome should trigger an automated process.
   *
   * Only S-Tier outcomes with a defined process will trigger.
   */
  shouldTriggerProcess(outcomeType: string): { trigger: boolean; processName?: string } {
    const outcome = OUTCOMES[outcomeType];

    if (!outcome) {
      return { trigger: false };
    }

    const tierDef = OUTCOME_TIERS[outcome.tier];

    if (tierDef.trigger && outcome.process) {
      return { trigger: true, processName: outcome.process };
    }

    return { trigger: false };
  }

  /**
   * Get all outcome types for a given tier.
   */
  getOutcomesByTier(tier: OutcomeTier): string[] {
    return Object.entries(OUTCOMES)
      .filter(([, o]) => o.tier === tier)
      .map(([key]) => key);
  }

  /**
   * Get routing information for an outcome type.
   */
  getRouting(outcomeType: string): OutcomeRouting | null {
    return OUTCOME_ROUTING[outcomeType] ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Process Definitions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get a process definition by name.
   *
   * @param processName - e.g. 'retention_process', 'recovery_process'
   * @throws Error if process is not defined
   */
  getProcess(processName: string): ProcessDefinition {
    const process = PROCESSES[processName];

    if (!process) {
      throw new Error(`[PolicyEngine] Unknown process: ${processName}`);
    }

    return { ...process };
  }

  /**
   * Get all available process names.
   */
  getAllProcessNames(): string[] {
    return Object.keys(PROCESSES);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shadow Policy Evaluation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate a shadow request against policy rules.
   *
   * The context object should contain boolean flags matching the condition
   * keys defined in the shadow policy (e.g. { available_slot_exists: true }).
   *
   * Decision logic:
   * 1. If auto_reject_condition is defined and truthy in context -> auto_reject
   * 2. If auto_approve_condition is defined and truthy in context -> auto_approve
   * 3. Otherwise -> pending (manual review required)
   *
   * @param category - e.g. 'makeup.requested'
   * @param context - condition flags from the runtime environment
   */
  evaluateShadow(
    category: string,
    context: Record<string, unknown>,
  ): ShadowEvaluation {
    const policy = SHADOW_CATEGORIES[category];

    if (!policy) {
      throw new Error(`[PolicyEngine] Unknown shadow category: ${category}`);
    }

    // Check auto-reject first (higher priority)
    if (
      policy.auto_reject_condition &&
      context[policy.auto_reject_condition] === true
    ) {
      return {
        decision: 'auto_reject',
        authority: policy.approval_authority,
        approval_rate: policy.approval_rate,
        reason: `Auto-rejected: ${policy.auto_reject_condition}`,
      };
    }

    // Check auto-approve
    if (
      policy.auto_approve_condition &&
      context[policy.auto_approve_condition] === true
    ) {
      return {
        decision: 'auto_approve',
        authority: policy.approval_authority,
        approval_rate: policy.approval_rate,
        reason: `Auto-approved: ${policy.auto_approve_condition}`,
      };
    }

    // Manual review required
    return {
      decision: 'pending',
      authority: policy.approval_authority,
      approval_rate: policy.approval_rate,
      reason: `Manual review required by ${policy.approval_authority}`,
    };
  }

  /**
   * Get shadow category definition.
   */
  getShadowCategory(category: string): ShadowCategory | null {
    return SHADOW_CATEGORIES[category] ?? null;
  }

  /**
   * Get all shadow category names.
   */
  getAllShadowCategories(): string[] {
    return Object.keys(SHADOW_CATEGORIES);
  }

  /**
   * Get escalation threshold.
   */
  getShadowEscalationThreshold(): number {
    return SHADOW_ESCALATION.admin_to_owner_threshold;
  }

  /**
   * Get shadow limits configuration.
   */
  getShadowLimits(): typeof SHADOW_LIMITS {
    return { ...SHADOW_LIMITS };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Thresholds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if a current value has breached its threshold.
   *
   * @param key - threshold key (e.g. 'consecutive_absence')
   * @param currentValue - the current measured value
   * @returns true if currentValue >= threshold value (breached)
   */
  checkThreshold(key: string, currentValue: number): boolean {
    const threshold = OUTCOME_THRESHOLDS[key];

    if (!threshold) {
      throw new Error(`[PolicyEngine] Unknown threshold key: ${key}`);
    }

    return currentValue >= threshold.value;
  }

  /**
   * Get a threshold definition.
   */
  getThreshold(key: string): ThresholdEntry | null {
    return OUTCOME_THRESHOLDS[key] ?? null;
  }

  /**
   * Get all threshold keys.
   */
  getAllThresholdKeys(): string[] {
    return Object.keys(OUTCOME_THRESHOLDS);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loops
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get a closed-loop definition by ID (e.g. 'attendance_loop').
   *
   * @param loopId - loop identifier
   * @throws Error if loop is not defined
   */
  getLoop(loopId: string): LoopDefinition {
    const loop = CLOSED_LOOPS[loopId];

    if (!loop) {
      throw new Error(`[PolicyEngine] Unknown loop: ${loopId}`);
    }

    return { ...loop };
  }

  /**
   * Get all loop definitions.
   */
  getAllLoops(): Record<string, LoopDefinition> {
    return { ...CLOSED_LOOPS };
  }

  /**
   * Get timeout for a specific loop (in days, or null if no timeout).
   */
  getLoopTimeout(loopId: string): number | null {
    if (!(loopId in LOOP_TIMEOUTS)) {
      throw new Error(`[PolicyEngine] Unknown loop timeout key: ${loopId}`);
    }

    return LOOP_TIMEOUTS[loopId];
  }

  /**
   * Find loops that open on a given outcome.
   */
  findLoopsOpenedBy(outcomeType: string): LoopDefinition[] {
    return Object.values(CLOSED_LOOPS).filter(
      (loop) => loop.open_condition === outcomeType,
    );
  }

  /**
   * Find loops that close on a given outcome.
   */
  findLoopsClosedBy(outcomeType: string): LoopDefinition[] {
    return Object.values(CLOSED_LOOPS).filter(
      (loop) => loop.close_condition === outcomeType,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Velocity
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the velocity status for a given V-Velocity value.
   *
   * Thresholds:
   *   green:  vv >= 0.5
   *   yellow: -0.2 <= vv < 0.5
   *   red:    vv < -0.2
   */
  getVelocityStatus(vv: number): VelocityStatus {
    if (vv >= (VELOCITY_THRESHOLDS.green.min ?? 0.5)) {
      return {
        status: 'green',
        label: VELOCITY_THRESHOLDS.green.action,
        color: VELOCITY_THRESHOLDS.green.color,
        action: VELOCITY_THRESHOLDS.green.action,
      };
    }

    if (vv >= (VELOCITY_THRESHOLDS.yellow.min ?? -0.2)) {
      return {
        status: 'yellow',
        label: VELOCITY_THRESHOLDS.yellow.action,
        color: VELOCITY_THRESHOLDS.yellow.color,
        action: VELOCITY_THRESHOLDS.yellow.action,
      };
    }

    return {
      status: 'red',
      label: VELOCITY_THRESHOLDS.red.action,
      color: VELOCITY_THRESHOLDS.red.color,
      action: VELOCITY_THRESHOLDS.red.action,
    };
  }

  /**
   * Get CLF (Complexity-Level Factor) classification.
   */
  getCLFLevel(clfScore: number): { level: 'low' | 'medium' | 'high'; label: string; description: string } {
    if (clfScore >= (CLF_THRESHOLDS.high.min ?? 40)) {
      return { level: 'high', ...CLF_THRESHOLDS.high };
    }

    if (clfScore >= (CLF_THRESHOLDS.medium.min ?? 15)) {
      return { level: 'medium', ...CLF_THRESHOLDS.medium };
    }

    return { level: 'low', ...CLF_THRESHOLDS.low };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════

export const policyEngine = new PolicyEngine();
