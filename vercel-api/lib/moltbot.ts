// ═══════════════════════════════════════════════════════════════════════════════
// 🦞 AUTUS × Moltbot 연동 헬퍼
// Moltbot Gateway API를 호출하여 AI 에이전트와 통신
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from './supabase';
import type { ActionType, AutomationLevel } from './types-agent';
import { captureError } from './monitoring';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type MoltbotRole = 'owner' | 'manager' | 'teacher' | 'assistant';

export interface MoltbotRequest {
  prompt: string;
  role?: MoltbotRole;
  context?: MoltbotContext;
  agentId?: string;
}

export interface MoltbotContext {
  userId?: string;
  customerId?: string;
  vIndex?: number;
  temperature?: number;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  recentActions?: string[];
  metadata?: Record<string, any>;
}

export interface MoltbotResponse {
  success: boolean;
  message: string;
  data?: {
    response: string;
    suggestedActions?: SuggestedAction[];
    reasoning?: string;
    confidence?: number;
  };
  error?: string;
}

export interface SuggestedAction {
  type: ActionType;
  description: string;
  params: Record<string, any>;
  automationLevel: AutomationLevel;
  requiresApproval: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const MOLTBOT_CONFIG = {
  gatewayUrl: process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18789',
  defaultAgentId: 'autus',
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 1000,
};

// Role별 시스템 프롬프트
const ROLE_PROMPTS: Record<MoltbotRole, string> = {
  owner: `당신은 AUTUS의 C-Level 어시스턴트입니다. 오너/대표에게 전략적 인사이트를 제공합니다.
핵심 역할:
- 전체 비즈니스 상태 요약
- 이탈 위험 고객 우선순위 분석
- 전략적 의사결정 지원
- 예외 상황 승인 요청 정리

간결하고 액션 중심으로 응답하세요.`,

  manager: `당신은 AUTUS의 FSD(풀스택 디렉터) 어시스턴트입니다. 관리자에게 운영 인사이트를 제공합니다.
핵심 역할:
- 일일 운영 현황 분석
- 팀 성과 모니터링
- 태스크 할당 및 추적
- 이상 징후 조기 감지

구체적인 데이터와 함께 응답하세요.`,

  teacher: `당신은 AUTUS의 선생님 어시스턴트입니다. 수업과 학생 관리를 지원합니다.
핵심 역할:
- 담당 학생 현황 분석
- 학부모 소통 지원
- 수업 준비 및 일정 관리
- 학생별 맞춤 피드백 제안

교육자의 관점에서 친절하게 응답하세요.`,

  assistant: `당신은 AUTUS 범용 어시스턴트입니다. 학원 운영 전반을 지원합니다.
핵심 역할:
- 질문에 대한 정확한 답변
- 데이터 조회 및 분석
- 액션 제안 및 실행 지원
- 일정 및 알림 관리

항상 한국어로 친절하게 응답하세요.`,
};

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

/**
 * V-Index와 관계 데이터를 가져와 컨텍스트 구성
 */
async function enrichContext(userId: string, customerId?: string): Promise<MoltbotContext> {
  const context: MoltbotContext = { userId };
  
  try {
    // 사용자의 Organism(관계) 데이터 조회
    const organisms = await db.getOrganisms(userId);
    
    if (customerId) {
      const customer = organisms.find(o => o.id === customerId);
      if (customer) {
        context.customerId = customerId;
        context.vIndex = customer.value_v;
        context.temperature = customer.sync_rate * 100;
        context.urgency = customer.status === 'urgent' ? 'critical' : 
                         customer.status === 'warning' ? 'high' : 
                         customer.status === 'opportunity' ? 'low' : 'medium';
      }
    }
    
    // 최근 액션 로그 조회 (최근 5개)
    context.recentActions = organisms
      .slice(0, 5)
      .map(o => `${o.name}: V=${o.value_v.toFixed(1)}, 상태=${o.status}`);
    
    // 전체 요약 메타데이터
    context.metadata = {
      totalCustomers: organisms.length,
      urgentCount: organisms.filter(o => o.status === 'urgent').length,
      warningCount: organisms.filter(o => o.status === 'warning').length,
      avgVIndex: organisms.reduce((sum, o) => sum + o.value_v, 0) / organisms.length || 0,
    };
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'moltbot.enrichContext' });
  }
  
  return context;
}

/**
 * 프롬프트에 컨텍스트 정보 주입
 */
function buildPromptWithContext(prompt: string, context: MoltbotContext, role: MoltbotRole): string {
  const rolePrompt = ROLE_PROMPTS[role];
  
  let contextInfo = '';
  if (context.metadata) {
    contextInfo = `
[현재 상태]
- 전체 고객: ${context.metadata.totalCustomers}명
- 긴급: ${context.metadata.urgentCount}명
- 주의: ${context.metadata.warningCount}명
- 평균 V-Index: ${context.metadata.avgVIndex?.toFixed(1)}

`;
  }
  
  if (context.customerId && context.vIndex !== undefined) {
    contextInfo += `[대상 고객]
- 고객 ID: ${context.customerId}
- V-Index: ${context.vIndex.toFixed(1)}
- 온도: ${context.temperature?.toFixed(0)}°
- 긴급도: ${context.urgency}

`;
  }
  
  if (context.recentActions?.length) {
    contextInfo += `[최근 현황]
${context.recentActions.join('\n')}

`;
  }
  
  return `${rolePrompt}

${contextInfo}[사용자 요청]
${prompt}`;
}

/**
 * HTTP 요청 with retry
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = MOLTBOT_CONFIG.retryAttempts
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MOLTBOT_CONFIG.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, MOLTBOT_CONFIG.retryDelay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// ─────────────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────────────

/**
 * Moltbot Gateway에 메시지 전송
 * 
 * @example
 * const response = await sendToMoltbot({
 *   prompt: "이탈 위험 고객 분석해줘",
 *   role: "owner",
 *   context: { userId: "user_123" }
 * });
 */
export async function sendToMoltbot(request: MoltbotRequest): Promise<MoltbotResponse> {
  const { prompt, role = 'assistant', context = {}, agentId = MOLTBOT_CONFIG.defaultAgentId } = request;
  
  try {
    // 컨텍스트 보강
    let enrichedContext = context;
    if (context.userId) {
      enrichedContext = await enrichContext(context.userId, context.customerId);
    }
    
    // 프롬프트 구성
    const fullPrompt = buildPromptWithContext(prompt, enrichedContext, role);
    
    // Gateway API 호출
    const response = await fetchWithRetry(
      `${MOLTBOT_CONFIG.gatewayUrl}/api/agent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          prompt: fullPrompt,
          metadata: {
            role,
            userId: enrichedContext.userId,
            customerId: enrichedContext.customerId,
            timestamp: new Date().toISOString(),
          },
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Moltbot Gateway error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      message: 'Moltbot 응답 성공',
      data: {
        response: data.response || data.message || data.content,
        suggestedActions: data.actions,
        reasoning: data.reasoning,
        confidence: data.confidence,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'moltbot.sendToMoltbot' });
    
    return {
      success: false,
      message: 'Moltbot 연결 실패',
      error: errorMessage,
    };
  }
}

/**
 * Moltbot을 통해 액션 실행 요청
 */
export async function executeMoltbotAction(
  actionType: ActionType,
  params: Record<string, any>,
  userId: string
): Promise<MoltbotResponse> {
  const actionPrompt = `다음 액션을 실행해주세요:
액션 타입: ${actionType}
파라미터: ${JSON.stringify(params, null, 2)}

실행 결과를 알려주세요.`;

  return sendToMoltbot({
    prompt: actionPrompt,
    role: 'assistant',
    context: { userId, metadata: { actionType, params } },
  });
}

/**
 * Moltbot 헬스 체크
 */
export async function checkMoltbotHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${MOLTBOT_CONFIG.gatewayUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { healthy: true, latency };
    }
    
    return { healthy: false, latency, error: `HTTP ${response.status}` };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * 이탈 위험 분석 요청 (특화 함수)
 */
export async function analyzeChurnRisk(
  userId: string,
  customerId: string
): Promise<MoltbotResponse> {
  return sendToMoltbot({
    prompt: `이 고객의 이탈 위험을 분석하고 대응 전략을 제안해주세요.
- 위험 수준 (1-10)
- 주요 위험 요인 3가지
- 권장 액션 2-3개
- 예상 효과`,
    role: 'manager',
    context: { userId, customerId },
  });
}

/**
 * 일일 브리핑 생성 (특화 함수)
 */
export async function generateDailyBriefing(userId: string): Promise<MoltbotResponse> {
  return sendToMoltbot({
    prompt: `오늘의 브리핑을 작성해주세요:
1. 긴급 대응 필요 고객 (있다면)
2. 오늘 예정된 상담/일정
3. 주목할 성과 또는 이슈
4. 추천 액션 3가지`,
    role: 'owner',
    context: { userId },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Export Default
// ─────────────────────────────────────────────────────────────────────

export default {
  send: sendToMoltbot,
  executeAction: executeMoltbotAction,
  healthCheck: checkMoltbotHealth,
  analyzeChurnRisk,
  generateDailyBriefing,
};
