// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - Agent Engine
// ReAct + CodeAct 실행 엔진
// ═══════════════════════════════════════════════════════════════════════════════

import { generateUUID } from './api-utils';
import {
  type ActionType,
  type ActionItem,
  type SimilarCase,
  type ExecutionResult,
  type StrategyTemplate,
  type UrgencyLevel,
  type VerifyRecommendation,
  ACTION_AUTOMATION_LEVELS,
  STRATEGY_TEMPLATES,
} from './types-agent';

// ─────────────────────────────────────────────────────────────────────
// ReAct Engine - Reason
// ─────────────────────────────────────────────────────────────────────

export function analyzeReason(
  triggerId: string,
  customerId: string,
  context?: Record<string, any>
): {
  reasoningId: string;
  situation: string;
  rootCauses: string[];
  urgency: UrgencyLevel;
  confidence: number;
} {
  const reasoningId = `reason-${generateUUID().slice(0, 8)}`;
  
  // 컨텍스트 분석
  const currentTemp = context?.currentTemperature || 50;
  const previousTemp = context?.previousTemperature || 60;
  const tempDrop = previousTemp - currentTemp;
  
  // 상황 요약 생성
  let situation = '';
  const rootCauses: string[] = [];
  let urgency: UrgencyLevel = 'medium';
  
  if (tempDrop > 15) {
    situation = `고객 온도가 ${previousTemp}°에서 ${currentTemp}°로 급락 (${tempDrop}° 하락)`;
    urgency = 'high';
  } else if (tempDrop > 5) {
    situation = `고객 온도가 ${previousTemp}°에서 ${currentTemp}°로 하락`;
    urgency = 'medium';
  } else {
    situation = `고객 현재 온도 ${currentTemp}° 상태`;
    urgency = 'low';
  }
  
  // 원인 분석 (Mock)
  if (context?.source === 'temperature_drop') {
    rootCauses.push('최근 출석률 하락');
  }
  if (currentTemp < 40) {
    rootCauses.push('낮은 온도 위험 상태');
    urgency = 'critical';
  }
  if (context?.voiceStage === 'complaint' || context?.voiceStage === 'churn_signal') {
    rootCauses.push('부정적 Voice 감지');
    urgency = 'high';
  }
  if (context?.competitorExposure) {
    rootCauses.push('경쟁사 프로모션 노출');
  }
  if (context?.gradeDeclining) {
    rootCauses.push('성적 하락 추세');
  }
  if (context?.costSensitive) {
    rootCauses.push('비용 민감 Voice');
  }
  
  // 기본 원인
  if (rootCauses.length === 0) {
    rootCauses.push('정기 모니터링 대상');
  }
  
  // 신뢰도 계산
  const confidence = Math.min(0.95, 0.6 + (rootCauses.length * 0.1));
  
  return { reasoningId, situation, rootCauses, urgency, confidence };
}

// ─────────────────────────────────────────────────────────────────────
// ReAct Engine - Decide
// ─────────────────────────────────────────────────────────────────────

export function decideStrategy(
  rootCauses: string[],
  urgency: UrgencyLevel
): StrategyTemplate {
  // 원인에 맞는 전략 선택
  const applicableStrategies = STRATEGY_TEMPLATES.filter(strategy =>
    strategy.applicableWhen.some(condition =>
      rootCauses.some(cause => cause.toLowerCase().includes(condition.replace('_', ' ')))
    )
  );
  
  if (applicableStrategies.length > 0) {
    // 가장 적합한 전략 반환 (첫 번째)
    return applicableStrategies[0];
  }
  
  // 기본 전략
  return STRATEGY_TEMPLATES[0]; // value_reinforcement
}

export function generateActions(
  strategy: StrategyTemplate,
  customerId: string,
  context?: Record<string, any>
): ActionItem[] {
  return strategy.actions.map((actionTemplate, index) => {
    const actionType = actionTemplate.type;
    const automationLevel = ACTION_AUTOMATION_LEVELS[actionType];
    const requiresApproval = automationLevel === 'L4_approved_auto' || 
                            automationLevel === 'L3_suggest' ||
                            automationLevel === 'L2_human';
    
    return {
      id: `action-${generateUUID().slice(0, 8)}-${index}`,
      type: actionType,
      description: actionTemplate.description,
      params: {
        customerId,
        ...actionTemplate.params,
        ...(context || {}),
      },
      automationLevel,
      requiresApproval,
      approver: requiresApproval ? 'manager' : undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// ReAct Engine - Verify (Agentic RAG Mock)
// ─────────────────────────────────────────────────────────────────────

export function verifySimilarCases(
  strategy: string,
  context?: Record<string, any>
): SimilarCase[] {
  // Mock: 과거 유사 케이스 생성
  const mockCases: SimilarCase[] = [
    {
      caseId: `case-${Date.now() - 86400000 * 30}`,
      similarity: 0.85,
      outcome: 'success',
      details: {
        customerName: '이준호',
        initialTemperature: 35,
        finalTemperature: 68,
        strategy,
        resultDate: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0],
      },
    },
    {
      caseId: `case-${Date.now() - 86400000 * 60}`,
      similarity: 0.72,
      outcome: 'partial',
      details: {
        customerName: '박서연',
        initialTemperature: 42,
        finalTemperature: 55,
        strategy,
        resultDate: new Date(Date.now() - 86400000 * 60).toISOString().split('T')[0],
      },
    },
  ];
  
  return mockCases;
}

export function validateDecision(
  strategy: string,
  actions: ActionItem[]
): {
  policyConflicts: string[];
  riskAssessment: UrgencyLevel;
  confidence: number;
  recommendation: VerifyRecommendation;
} {
  const policyConflicts: string[] = [];
  let riskAssessment: UrgencyLevel = 'low';
  
  // 정책 충돌 검사
  const hasHighCostAction = actions.some(a => 
    a.type === 'send_sms' || a.type === 'send_email'
  );
  
  if (hasHighCostAction && actions.length > 5) {
    policyConflicts.push('일일 메시지 발송 한도 초과 가능');
    riskAssessment = 'medium';
  }
  
  // 신뢰도 계산
  const confidence = policyConflicts.length === 0 ? 0.85 : 0.65;
  
  // 추천
  let recommendation: VerifyRecommendation = 'proceed';
  if (policyConflicts.length > 2) {
    recommendation = 'modify';
  } else if (confidence < 0.5) {
    recommendation = 'escalate';
  }
  
  return { policyConflicts, riskAssessment, confidence, recommendation };
}

// ─────────────────────────────────────────────────────────────────────
// Authority Gate
// ─────────────────────────────────────────────────────────────────────

export function authorizeActions(
  actions: ActionItem[],
  requesterId: string,
  autoApprove: boolean = true
): Array<{
  actionId: string;
  status: 'approved' | 'pending_approval' | 'rejected';
  approver: string;
  reason: string;
}> {
  return actions.map(action => {
    const isAutoApproved = 
      action.automationLevel === 'L5_full_auto' ||
      (autoApprove && action.automationLevel === 'L4_approved_auto');
    
    return {
      actionId: action.id,
      status: isAutoApproved ? 'approved' as const : 'pending_approval' as const,
      approver: isAutoApproved ? 'system' : (action.approver || 'manager'),
      reason: isAutoApproved 
        ? `${action.automationLevel} 자동 승인`
        : `${action.automationLevel} 수동 승인 필요`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// CodeAct Engine - Execute
// ─────────────────────────────────────────────────────────────────────

export async function executeAction(
  action: ActionItem,
  mode: 'dry_run' | 'live'
): Promise<ExecutionResult> {
  // Dry-run 모드
  if (mode === 'dry_run') {
    return {
      actionId: action.id,
      type: action.type,
      status: 'success',
      output: {
        mode: 'dry_run',
        wouldExecute: action.type,
        params: action.params,
      },
    };
  }
  
  // Live 모드 (Mock 실행)
  try {
    const output = await mockExecuteAction(action);
    return {
      actionId: action.id,
      type: action.type,
      status: 'success',
      output,
    };
  } catch (error) {
    return {
      actionId: action.id,
      type: action.type,
      status: 'failure',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function mockExecuteAction(action: ActionItem): Promise<Record<string, any>> {
  // 실행 시뮬레이션 딜레이
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const timestamp = new Date().toISOString();
  
  switch (action.type) {
    case 'send_kakao_message':
      return {
        messageId: `kakao-${generateUUID().slice(0, 8)}`,
        deliveredAt: timestamp,
        recipient: action.params.customerId,
      };
    
    case 'create_consultation':
      return {
        consultationId: `consult-${generateUUID().slice(0, 8)}`,
        datetime: action.params.datetime || new Date(Date.now() + 86400000 * 2).toISOString(),
        calendarEventId: `cal-${generateUUID().slice(0, 8)}`,
      };
    
    case 'generate_report':
      return {
        reportId: `report-${generateUUID().slice(0, 8)}`,
        path: `/reports/${action.params.customerId}_${Date.now()}.pdf`,
        generatedAt: timestamp,
      };
    
    case 'create_task':
      return {
        taskId: `task-${generateUUID().slice(0, 8)}`,
        createdAt: timestamp,
      };
    
    case 'send_reminder':
      return {
        reminderId: `remind-${generateUUID().slice(0, 8)}`,
        scheduledAt: timestamp,
      };
    
    case 'add_customer_tag':
      return {
        tagId: `tag-${generateUUID().slice(0, 8)}`,
        tag: action.params.tag || 'attention_needed',
        addedAt: timestamp,
      };
    
    case 'record_voice':
      return {
        voiceId: `voice-${generateUUID().slice(0, 8)}`,
        recordedAt: timestamp,
      };
    
    default:
      return {
        executed: true,
        actionType: action.type,
        timestamp,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Proof Engine
// ─────────────────────────────────────────────────────────────────────

export function generateProofPack(data: {
  reasoning: { reasoningId: string; situation: string; rootCauses: string[]; timestamp: string };
  decision: { decisionId: string; strategy: string; actionsCount: number; timestamp: string };
  verification: { verificationId: string; similarCases: number; confidence: number; recommendation: VerifyRecommendation; timestamp: string };
  authorization: { authorizationId: string; approved: number; pending: number; rejected: number; timestamp: string };
  execution: { executionId: string; success: number; failed: number; timestamp: string };
}): string {
  const proofPackId = `proof-${generateUUID().slice(0, 8)}`;
  
  // 서명 생성 (실제로는 암호화)
  const signature = `AUTUS-v2.0-proof-sha256:${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32)}`;
  
  // 실제로는 DB에 저장
  console.log(`[Proof Pack] Generated: ${proofPackId}`);
  
  return proofPackId;
}
