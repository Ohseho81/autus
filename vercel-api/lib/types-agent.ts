// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - Agent Types
// ReAct + CodeAct Agentic Architecture
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────

export type AutomationLevel = 'L5_full_auto' | 'L4_approved_auto' | 'L3_suggest' | 'L2_human';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type AuthorizationStatus = 'approved' | 'pending_approval' | 'rejected';
export type ExecutionStatus = 'success' | 'failure' | 'skipped' | 'pending';
export type PipelineStatus = 'completed' | 'pending_approval' | 'failed' | 'running';
export type TriggerType = 'alert' | 'prediction' | 'manual' | 'schedule';
export type ExecutionMode = 'dry_run' | 'live';
export type VerifyRecommendation = 'proceed' | 'modify' | 'reject' | 'escalate';
export type CaseOutcome = 'success' | 'partial' | 'failure';

// ─────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────

export type ActionType = 
  // 커뮤니케이션
  | 'send_kakao_message'
  | 'send_sms'
  | 'send_email'
  | 'make_call_reservation'
  | 'create_consultation'
  // 데이터/리포트
  | 'generate_report'
  | 'create_progress_card'
  | 'export_attendance'
  | 'generate_comparison'
  // 캘린더/일정
  | 'create_calendar_event'
  | 'update_schedule'
  | 'send_reminder'
  // 태스크
  | 'create_task'
  | 'assign_task'
  | 'update_task_status'
  | 'escalate_task'
  // DB/상태
  | 'update_customer_status'
  | 'add_customer_tag'
  | 'record_voice'
  | 'update_relationship';

// Action 자동화 레벨 매핑
export const ACTION_AUTOMATION_LEVELS: Record<ActionType, AutomationLevel> = {
  // L5 완전자동
  send_kakao_message: 'L5_full_auto',
  generate_report: 'L5_full_auto',
  create_progress_card: 'L5_full_auto',
  export_attendance: 'L5_full_auto',
  generate_comparison: 'L5_full_auto',
  send_reminder: 'L5_full_auto',
  create_task: 'L5_full_auto',
  update_customer_status: 'L5_full_auto',
  add_customer_tag: 'L5_full_auto',
  record_voice: 'L5_full_auto',
  update_relationship: 'L5_full_auto',
  // L4 승인후자동
  send_sms: 'L4_approved_auto',
  send_email: 'L4_approved_auto',
  create_consultation: 'L4_approved_auto',
  create_calendar_event: 'L4_approved_auto',
  update_schedule: 'L4_approved_auto',
  assign_task: 'L4_approved_auto',
  update_task_status: 'L4_approved_auto',
  // L3 제안만
  make_call_reservation: 'L3_suggest',
  escalate_task: 'L3_suggest',
};

// ─────────────────────────────────────────────────────────────────────
// Reason Types
// ─────────────────────────────────────────────────────────────────────

export interface ReasonRequest {
  triggerId: string;
  customerId: string;
  context?: {
    source?: string;
    currentTemperature?: number;
    previousTemperature?: number;
    [key: string]: any;
  };
}

export interface ReasonResponse {
  reasoningId: string;
  reasoning: {
    situation: string;
    rootCauses: string[];
    urgency: UrgencyLevel;
    confidence: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Decide Types
// ─────────────────────────────────────────────────────────────────────

export interface DecideRequest {
  reasoningId: string;
  customerId: string;
}

export interface ActionItem {
  id: string;
  type: ActionType;
  description: string;
  params: Record<string, any>;
  automationLevel: AutomationLevel;
  requiresApproval: boolean;
  approver?: string;
}

export interface DecideResponse {
  decisionId: string;
  strategy: {
    id: string;
    name: string;
    reasoning: string;
  };
  actions: ActionItem[];
}

// ─────────────────────────────────────────────────────────────────────
// Verify Types
// ─────────────────────────────────────────────────────────────────────

export interface VerifyRequest {
  decisionId: string;
  strategy: string;
  context?: Record<string, any>;
}

export interface SimilarCase {
  caseId: string;
  similarity: number;
  outcome: CaseOutcome;
  details: {
    customerName?: string;
    initialTemperature?: number;
    finalTemperature?: number;
    strategy?: string;
    resultDate?: string;
    [key: string]: any;
  };
}

export interface VerifyResponse {
  verificationId: string;
  similarCases: SimilarCase[];
  validation: {
    policyConflicts: string[];
    riskAssessment: UrgencyLevel;
    confidence: number;
  };
  recommendation: VerifyRecommendation;
}

// ─────────────────────────────────────────────────────────────────────
// Authorize Types
// ─────────────────────────────────────────────────────────────────────

export interface AuthorizeRequest {
  decisionId: string;
  actions: string[];
  requesterId: string;
}

export interface AuthorizationItem {
  actionId: string;
  status: AuthorizationStatus;
  approver: string;
  reason: string;
}

export interface AuthorizeResponse {
  authorizationId: string;
  authorizations: AuthorizationItem[];
  approvedPlan?: {
    planId: string;
    actions: string[];
    createdAt: string;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Execute Types
// ─────────────────────────────────────────────────────────────────────

export interface ExecuteRequest {
  planId: string;
  mode: ExecutionMode;
}

export interface ExecutionResult {
  actionId: string;
  type?: ActionType;
  status: ExecutionStatus;
  output?: Record<string, any>;
  error?: string;
}

export interface ExecuteResponse {
  executionId: string;
  results: ExecutionResult[];
  proofPackId: string;
}

// ─────────────────────────────────────────────────────────────────────
// Proof Types
// ─────────────────────────────────────────────────────────────────────

export interface ProofPack {
  id: string;
  reasoning: {
    reasoningId: string;
    situation: string;
    rootCauses: string[];
    timestamp: string;
  };
  decision: {
    decisionId: string;
    strategy: string;
    actions: number;
    timestamp: string;
  };
  verification: {
    verificationId: string;
    similarCases: number;
    confidence: number;
    recommendation: VerifyRecommendation;
    timestamp: string;
  };
  authorization: {
    authorizationId: string;
    approved: number;
    pending: number;
    rejected: number;
    timestamp: string;
  };
  execution: {
    executionId: string;
    success: number;
    failed: number;
    timestamp: string;
  };
  timestamp: string;
  signature: string;
}

// ─────────────────────────────────────────────────────────────────────
// Pipeline (Run) Types
// ─────────────────────────────────────────────────────────────────────

export interface RunRequest {
  trigger: {
    type: TriggerType;
    id: string;
  };
  customerId: string;
  mode: ExecutionMode;
  autoApprove?: boolean;
}

export interface PipelineStep {
  status: 'completed' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  [key: string]: any;
}

export interface RunResponse {
  pipelineId: string;
  status: PipelineStatus;
  steps: {
    reason: PipelineStep & { reasoningId?: string };
    decide: PipelineStep & { decisionId?: string; actionsCount?: number };
    verify: PipelineStep & { verificationId?: string; confidence?: number };
    authorize: PipelineStep & { authorizationId?: string; approved?: number };
    execute: PipelineStep & { executionId?: string; success?: number };
  };
  proofPackId?: string;
  totalDuration?: number;
  pendingApprovals: Array<{ actionId: string; approver: string }>;
}

// ─────────────────────────────────────────────────────────────────────
// Strategy Templates
// ─────────────────────────────────────────────────────────────────────

export interface StrategyTemplate {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  applicableWhen: string[];
  actions: Array<{
    type: ActionType;
    description: string;
    params?: Record<string, any>;
  }>;
  expectedEffect: {
    temperatureChange: number;
    churnReduction: number;
  };
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'value_reinforcement',
    name: 'Value Reinforcement',
    nameKo: '가치 재인식 상담',
    description: '비용 민감 고객에게 가치 대비 효과를 강조',
    applicableWhen: ['cost_sensitive', 'competitor_exposure', 'grade_declining'],
    actions: [
      { type: 'create_consultation', description: '가치 상담 예약' },
      { type: 'generate_report', description: '성과 비교 리포트' },
      { type: 'send_kakao_message', description: '상담 초대 메시지' },
    ],
    expectedEffect: { temperatureChange: 15, churnReduction: 0.15 },
  },
  {
    id: 'engagement_boost',
    name: 'Engagement Boost',
    nameKo: '참여도 향상',
    description: '참여도가 낮은 고객에게 추가 관심 제공',
    applicableWhen: ['low_engagement', 'attendance_declining'],
    actions: [
      { type: 'create_task', description: '개별 면담 태스크' },
      { type: 'send_reminder', description: '수업 리마인더' },
      { type: 'add_customer_tag', description: '관심 필요 태그' },
    ],
    expectedEffect: { temperatureChange: 10, churnReduction: 0.1 },
  },
  {
    id: 'trust_recovery',
    name: 'Trust Recovery',
    nameKo: '신뢰 회복',
    description: '불만/이슈 발생 후 신뢰 회복',
    applicableWhen: ['complaint_received', 'trust_declining'],
    actions: [
      { type: 'create_consultation', description: '긴급 상담' },
      { type: 'record_voice', description: 'Voice 기록' },
      { type: 'escalate_task', description: '관리자 에스컬레이션' },
    ],
    expectedEffect: { temperatureChange: 20, churnReduction: 0.2 },
  },
  {
    id: 'loyalty_reward',
    name: 'Loyalty Reward',
    nameKo: '충성도 보상',
    description: '장기 고객에게 감사 표시',
    applicableWhen: ['long_tenure', 'stable_good'],
    actions: [
      { type: 'send_kakao_message', description: '감사 메시지' },
      { type: 'create_progress_card', description: '성장 기록 카드' },
    ],
    expectedEffect: { temperatureChange: 5, churnReduction: 0.05 },
  },
];
