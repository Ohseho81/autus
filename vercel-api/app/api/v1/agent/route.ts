// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🤖 Agent API
// ReAct + CodeAct Agentic Architecture
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  optionsResponse,
  serverErrorResponse,
  generateUUID,
} from '@/lib/api-utils';
import {
  analyzeReason,
  decideStrategy,
  generateActions,
  verifySimilarCases,
  validateDecision,
  authorizeActions,
  executeAction,
  generateProofPack,
} from '@/lib/agent-engine';
import type {
  ReasonRequest,
  DecideRequest,
  VerifyRequest,
  AuthorizeRequest,
  ExecuteRequest,
  RunRequest,
  ActionItem,
  PipelineStatus,
} from '@/lib/types-agent';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/agent - Agent 상태 조회
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'status';
    const id = searchParams.get('id');
    
    switch (endpoint) {
      case 'status':
        return getAgentStatus();
      case 'proof':
        return getProofPack(id || '');
      case 'actions':
        return getAvailableActions();
      case 'strategies':
        return getStrategies();
      default:
        return getAgentStatus();
    }
  } catch (error) {
    return serverErrorResponse(error, 'Agent API GET');
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/agent - Agent 작업 실행
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'run';
    const body = await request.json();
    
    switch (endpoint) {
      case 'reason':
        return handleReason(body as ReasonRequest);
      case 'decide':
        return handleDecide(body as DecideRequest);
      case 'verify':
        return handleVerify(body as VerifyRequest);
      case 'authorize':
        return handleAuthorize(body as AuthorizeRequest);
      case 'execute':
        return handleExecute(body as ExecuteRequest);
      case 'run':
        return handleRun(body as RunRequest);
      default:
        return handleRun(body as RunRequest);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Agent API POST');
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// GET Handlers
// ─────────────────────────────────────────────────────────────────────

function getAgentStatus() {
  return successResponse({
    status: 'active',
    version: '2.0.0',
    engines: {
      react: { status: 'ready', modules: ['reason', 'decide', 'verify', 'authority_gate'] },
      codeact: { status: 'ready', modules: ['action_generator', 'executor', 'observer'] },
      proof: { status: 'ready' },
      learn: { status: 'ready' },
    },
    actionsAvailable: 20,
    strategiesAvailable: 4,
    automationLevels: ['L5_full_auto', 'L4_approved_auto', 'L3_suggest', 'L2_human'],
  }, 'Agent 상태 조회 성공');
}

function getProofPack(id: string) {
  if (!id) {
    return errorResponse('Proof Pack ID 필요', 400);
  }
  
  // Mock Proof Pack
  const now = new Date().toISOString();
  return successResponse({
    id,
    reasoning: {
      reasoningId: 'reason-001',
      situation: '고객 온도 급락 감지',
      rootCauses: ['성적 하락', '비용 민감', '경쟁사 노출'],
      timestamp: now,
    },
    decision: {
      decisionId: 'decision-001',
      strategy: 'value_reinforcement',
      actions: 3,
      timestamp: now,
    },
    verification: {
      verificationId: 'verify-001',
      similarCases: 2,
      confidence: 0.85,
      recommendation: 'proceed',
      timestamp: now,
    },
    authorization: {
      authorizationId: 'auth-001',
      approved: 3,
      pending: 0,
      rejected: 0,
      timestamp: now,
    },
    execution: {
      executionId: 'exec-001',
      success: 3,
      failed: 0,
      timestamp: now,
    },
    timestamp: now,
    signature: `AUTUS-v2.0-proof-sha256:${id}`,
  }, 'Proof Pack 조회 성공');
}

function getAvailableActions() {
  const actions = [
    // 커뮤니케이션
    { type: 'send_kakao_message', category: 'communication', level: 'L5_full_auto', nameKo: '카카오톡 발송' },
    { type: 'send_sms', category: 'communication', level: 'L4_approved_auto', nameKo: 'SMS 발송' },
    { type: 'send_email', category: 'communication', level: 'L4_approved_auto', nameKo: '이메일 발송' },
    { type: 'make_call_reservation', category: 'communication', level: 'L3_suggest', nameKo: '전화 예약' },
    { type: 'create_consultation', category: 'communication', level: 'L4_approved_auto', nameKo: '상담 생성' },
    // 데이터/리포트
    { type: 'generate_report', category: 'data', level: 'L5_full_auto', nameKo: '리포트 생성' },
    { type: 'create_progress_card', category: 'data', level: 'L5_full_auto', nameKo: '성장 카드' },
    { type: 'export_attendance', category: 'data', level: 'L5_full_auto', nameKo: '출석 내보내기' },
    { type: 'generate_comparison', category: 'data', level: 'L5_full_auto', nameKo: '비교 자료' },
    // 캘린더
    { type: 'create_calendar_event', category: 'calendar', level: 'L4_approved_auto', nameKo: '일정 생성' },
    { type: 'update_schedule', category: 'calendar', level: 'L4_approved_auto', nameKo: '일정 변경' },
    { type: 'send_reminder', category: 'calendar', level: 'L5_full_auto', nameKo: '리마인더' },
    // 태스크
    { type: 'create_task', category: 'task', level: 'L5_full_auto', nameKo: '태스크 생성' },
    { type: 'assign_task', category: 'task', level: 'L4_approved_auto', nameKo: '태스크 배분' },
    { type: 'update_task_status', category: 'task', level: 'L4_approved_auto', nameKo: '상태 변경' },
    { type: 'escalate_task', category: 'task', level: 'L3_suggest', nameKo: '에스컬레이션' },
    // DB
    { type: 'update_customer_status', category: 'database', level: 'L5_full_auto', nameKo: '고객 상태' },
    { type: 'add_customer_tag', category: 'database', level: 'L5_full_auto', nameKo: '태그 추가' },
    { type: 'record_voice', category: 'database', level: 'L5_full_auto', nameKo: 'Voice 기록' },
    { type: 'update_relationship', category: 'database', level: 'L5_full_auto', nameKo: '관계 업데이트' },
  ];
  
  return successResponse({ actions, total: actions.length }, 'Action 목록 조회 성공');
}

function getStrategies() {
  const strategies = [
    {
      id: 'value_reinforcement',
      name: '가치 재인식 상담',
      description: '비용 민감 고객에게 가치 대비 효과를 강조',
      applicableWhen: ['cost_sensitive', 'competitor_exposure'],
      expectedEffect: { temperatureChange: 15, churnReduction: 0.15 },
    },
    {
      id: 'engagement_boost',
      name: '참여도 향상',
      description: '참여도가 낮은 고객에게 추가 관심 제공',
      applicableWhen: ['low_engagement', 'attendance_declining'],
      expectedEffect: { temperatureChange: 10, churnReduction: 0.1 },
    },
    {
      id: 'trust_recovery',
      name: '신뢰 회복',
      description: '불만/이슈 발생 후 신뢰 회복',
      applicableWhen: ['complaint_received', 'trust_declining'],
      expectedEffect: { temperatureChange: 20, churnReduction: 0.2 },
    },
    {
      id: 'loyalty_reward',
      name: '충성도 보상',
      description: '장기 고객에게 감사 표시',
      applicableWhen: ['long_tenure', 'stable_good'],
      expectedEffect: { temperatureChange: 5, churnReduction: 0.05 },
    },
  ];
  
  return successResponse({ strategies, total: strategies.length }, '전략 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// POST Handlers
// ─────────────────────────────────────────────────────────────────────

function handleReason(body: ReasonRequest) {
  const { triggerId, customerId, context } = body;
  
  if (!triggerId || !customerId) {
    return errorResponse('triggerId, customerId 필수', 400);
  }
  
  const result = analyzeReason(triggerId, customerId, context);
  
  return successResponse({
    reasoningId: result.reasoningId,
    reasoning: {
      situation: result.situation,
      rootCauses: result.rootCauses,
      urgency: result.urgency,
      confidence: result.confidence,
    },
  }, 'Reason 단계 완료');
}

function handleDecide(body: DecideRequest) {
  const { reasoningId, customerId } = body;
  
  if (!reasoningId || !customerId) {
    return errorResponse('reasoningId, customerId 필수', 400);
  }
  
  // Mock: 이전 reason 결과에서 rootCauses 가져오기
  const mockRootCauses = ['비용 민감', '경쟁사 노출', '성적 하락'];
  
  const strategy = decideStrategy(mockRootCauses, 'high');
  const actions = generateActions(strategy, customerId);
  
  return successResponse({
    decisionId: `decision-${generateUUID().slice(0, 8)}`,
    strategy: {
      id: strategy.id,
      name: strategy.nameKo,
      reasoning: strategy.description,
    },
    actions,
  }, 'Decide 단계 완료');
}

function handleVerify(body: VerifyRequest) {
  const { decisionId, strategy, context } = body;
  
  if (!decisionId || !strategy) {
    return errorResponse('decisionId, strategy 필수', 400);
  }
  
  const similarCases = verifySimilarCases(strategy, context);
  
  // Mock actions for validation
  const mockActions: ActionItem[] = [
    { id: 'a1', type: 'send_kakao_message', description: '', params: {}, automationLevel: 'L5_full_auto', requiresApproval: false },
  ];
  
  const validation = validateDecision(strategy, mockActions);
  
  return successResponse({
    verificationId: `verify-${generateUUID().slice(0, 8)}`,
    similarCases,
    validation,
    recommendation: validation.recommendation,
  }, 'Verify 단계 완료');
}

function handleAuthorize(body: AuthorizeRequest) {
  const { decisionId, actions, requesterId } = body;
  
  if (!decisionId || !actions || !requesterId) {
    return errorResponse('decisionId, actions, requesterId 필수', 400);
  }
  
  // Mock actions 생성
  const mockActions: ActionItem[] = actions.map(id => ({
    id,
    type: 'send_kakao_message',
    description: 'Mock action',
    params: {},
    automationLevel: 'L5_full_auto',
    requiresApproval: false,
  }));
  
  const authorizations = authorizeActions(mockActions, requesterId, true);
  const approved = authorizations.filter(a => a.status === 'approved');
  
  return successResponse({
    authorizationId: `auth-${generateUUID().slice(0, 8)}`,
    authorizations,
    approvedPlan: approved.length > 0 ? {
      planId: `plan-${generateUUID().slice(0, 8)}`,
      actions: approved.map(a => a.actionId),
      createdAt: new Date().toISOString(),
    } : undefined,
  }, 'Authorize 단계 완료');
}

async function handleExecute(body: ExecuteRequest) {
  const { planId, mode = 'dry_run' } = body;
  
  if (!planId) {
    return errorResponse('planId 필수', 400);
  }
  
  // Mock actions 생성
  const mockActions: ActionItem[] = [
    { id: 'action-001', type: 'create_consultation', description: '상담 예약', params: {}, automationLevel: 'L5_full_auto', requiresApproval: false },
    { id: 'action-002', type: 'generate_report', description: '리포트 생성', params: {}, automationLevel: 'L5_full_auto', requiresApproval: false },
    { id: 'action-003', type: 'send_kakao_message', description: '메시지 발송', params: {}, automationLevel: 'L5_full_auto', requiresApproval: false },
  ];
  
  const results = await Promise.all(
    mockActions.map(action => executeAction(action, mode))
  );
  
  const proofPackId = generateProofPack({
    reasoning: { reasoningId: 'r', situation: '', rootCauses: [], timestamp: new Date().toISOString() },
    decision: { decisionId: 'd', strategy: 'v', actionsCount: 3, timestamp: new Date().toISOString() },
    verification: { verificationId: 'v', similarCases: 2, confidence: 0.85, recommendation: 'proceed', timestamp: new Date().toISOString() },
    authorization: { authorizationId: 'a', approved: 3, pending: 0, rejected: 0, timestamp: new Date().toISOString() },
    execution: { executionId: 'e', success: results.filter(r => r.status === 'success').length, failed: results.filter(r => r.status === 'failure').length, timestamp: new Date().toISOString() },
  });
  
  return successResponse({
    executionId: `exec-${generateUUID().slice(0, 8)}`,
    results,
    proofPackId,
  }, `Execute 완료 (mode: ${mode})`);
}

async function handleRun(body: RunRequest) {
  const { trigger, customerId, mode = 'dry_run', autoApprove = true } = body;
  const startTime = Date.now();
  
  if (!trigger || !customerId) {
    return errorResponse('trigger, customerId 필수', 400);
  }
  
  const pipelineId = `pipeline-${generateUUID().slice(0, 8)}`;
  const timestamps: Record<string, string> = {};
  
  // Step 1: Reason
  timestamps.reason = new Date().toISOString();
  const reasonResult = analyzeReason(trigger.id, customerId, { source: trigger.type });
  const reasonDuration = Date.now() - startTime;
  
  // Step 2: Decide
  timestamps.decide = new Date().toISOString();
  const strategy = decideStrategy(reasonResult.rootCauses, reasonResult.urgency);
  const actions = generateActions(strategy, customerId);
  const decideDuration = Date.now() - startTime - reasonDuration;
  
  // Step 3: Verify
  timestamps.verify = new Date().toISOString();
  const similarCases = verifySimilarCases(strategy.id);
  const validation = validateDecision(strategy.id, actions);
  const verifyDuration = Date.now() - startTime - reasonDuration - decideDuration;
  
  // Step 4: Authorize
  timestamps.authorize = new Date().toISOString();
  const authorizations = authorizeActions(actions, 'system', autoApprove);
  const approvedActions = actions.filter(a => 
    authorizations.find(auth => auth.actionId === a.id && auth.status === 'approved')
  );
  const authorizeDuration = Date.now() - startTime - reasonDuration - decideDuration - verifyDuration;
  
  // Step 5: Execute
  timestamps.execute = new Date().toISOString();
  const executionResults = await Promise.all(
    approvedActions.map(action => executeAction(action, mode))
  );
  const executeDuration = Date.now() - startTime - reasonDuration - decideDuration - verifyDuration - authorizeDuration;
  
  // Generate Proof Pack
  const proofPackId = generateProofPack({
    reasoning: {
      reasoningId: reasonResult.reasoningId,
      situation: reasonResult.situation,
      rootCauses: reasonResult.rootCauses,
      timestamp: timestamps.reason,
    },
    decision: {
      decisionId: `decision-${pipelineId}`,
      strategy: strategy.id,
      actionsCount: actions.length,
      timestamp: timestamps.decide,
    },
    verification: {
      verificationId: `verify-${pipelineId}`,
      similarCases: similarCases.length,
      confidence: validation.confidence,
      recommendation: validation.recommendation,
      timestamp: timestamps.verify,
    },
    authorization: {
      authorizationId: `auth-${pipelineId}`,
      approved: authorizations.filter(a => a.status === 'approved').length,
      pending: authorizations.filter(a => a.status === 'pending_approval').length,
      rejected: authorizations.filter(a => a.status === 'rejected').length,
      timestamp: timestamps.authorize,
    },
    execution: {
      executionId: `exec-${pipelineId}`,
      success: executionResults.filter(r => r.status === 'success').length,
      failed: executionResults.filter(r => r.status === 'failure').length,
      timestamp: timestamps.execute,
    },
  });
  
  const totalDuration = Date.now() - startTime;
  const pendingApprovals = authorizations
    .filter(a => a.status === 'pending_approval')
    .map(a => ({ actionId: a.actionId, approver: a.approver }));
  
  const status: PipelineStatus = pendingApprovals.length > 0 
    ? 'pending_approval' 
    : executionResults.some(r => r.status === 'failure') 
      ? 'failed' 
      : 'completed';
  
  return successResponse({
    pipelineId,
    status,
    steps: {
      reason: {
        status: 'completed',
        reasoningId: reasonResult.reasoningId,
        duration: reasonDuration,
      },
      decide: {
        status: 'completed',
        decisionId: `decision-${pipelineId}`,
        actionsCount: actions.length,
        duration: decideDuration,
      },
      verify: {
        status: 'completed',
        verificationId: `verify-${pipelineId}`,
        confidence: validation.confidence,
        duration: verifyDuration,
      },
      authorize: {
        status: 'completed',
        authorizationId: `auth-${pipelineId}`,
        approved: authorizations.filter(a => a.status === 'approved').length,
        duration: authorizeDuration,
      },
      execute: {
        status: 'completed',
        executionId: `exec-${pipelineId}`,
        success: executionResults.filter(r => r.status === 'success').length,
        duration: executeDuration,
      },
    },
    proofPackId,
    totalDuration,
    pendingApprovals,
  }, `Agent Pipeline ${status}`);
}
