/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 n8n Integration — Webhook 자동화
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * n8n 워크플로우를 통한 자동화:
 * - Webhook 트리거
 * - 결정 완료 시 액션 실행
 * - 외부 서비스 연동
 * - 이벤트 로깅
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface N8NConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface WebhookTrigger {
  id: string;
  name: string;
  url: string;
  event: 'decision_accepted' | 'decision_rejected' | 'v_milestone' | 'daily_report';
  enabled: boolean;
  lastTriggered?: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    decisionId?: string;
    decisionText?: string;
    delta?: number;
    currentV?: number;
    synergy?: number;
    userId?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface WebhookResult {
  success: boolean;
  triggerId: string;
  responseTime: number;
  statusCode?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 10000; // 10초
const MAX_RETRIES = 3;

// 기본 이벤트 타입
export const WEBHOOK_EVENTS = {
  DECISION_ACCEPTED: 'decision_accepted',
  DECISION_REJECTED: 'decision_rejected',
  V_MILESTONE: 'v_milestone',
  DAILY_REPORT: 'daily_report',
  SYNC_COMPLETE: 'sync_complete',
  DELEGATE_SENT: 'delegate_sent',
  DELEGATE_RECEIVED: 'delegate_received',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// N8N Client
// ═══════════════════════════════════════════════════════════════════════════════

export class N8NClient {
  private config: N8NConfig;
  private triggers: Map<string, WebhookTrigger> = new Map();
  private eventLog: WebhookResult[] = [];

  constructor(config: N8NConfig) {
    this.config = config;
  }

  /**
   * 웹훅 트리거 등록
   */
  registerTrigger(trigger: Omit<WebhookTrigger, 'lastTriggered'>): void {
    this.triggers.set(trigger.id, {
      ...trigger,
      lastTriggered: undefined,
    });
  }

  /**
   * 웹훅 트리거 제거
   */
  unregisterTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId);
  }

  /**
   * 이벤트별 트리거 조회
   */
  getTriggersForEvent(event: string): WebhookTrigger[] {
    return Array.from(this.triggers.values())
      .filter(t => t.event === event && t.enabled);
  }

  /**
   * 웹훅 발송
   */
  async send(url: string, payload: WebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });

      const result: WebhookResult = {
        success: response.ok,
        triggerId: payload.data.decisionId || 'unknown',
        responseTime: Date.now() - startTime,
        statusCode: response.status,
      };

      this.eventLog.push(result);
      return result;

    } catch (error: any) {
      const result: WebhookResult = {
        success: false,
        triggerId: payload.data.decisionId || 'unknown',
        responseTime: Date.now() - startTime,
        error: error.message,
      };

      this.eventLog.push(result);
      return result;
    }
  }

  /**
   * 이벤트 발생 시 모든 관련 트리거 실행
   */
  async triggerEvent(
    event: string, 
    data: WebhookPayload['data']
  ): Promise<WebhookResult[]> {
    const triggers = this.getTriggersForEvent(event);
    const results: WebhookResult[] = [];

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const trigger of triggers) {
      const result = await this.send(trigger.url, payload);
      
      // 트리거 마지막 실행 시간 업데이트
      trigger.lastTriggered = payload.timestamp;
      
      results.push(result);
    }

    return results;
  }

  /**
   * 결정 수락 이벤트
   */
  async onDecisionAccepted(
    decisionId: string,
    decisionText: string,
    delta: number,
    currentV: number,
    synergy: number
  ): Promise<WebhookResult[]> {
    return this.triggerEvent(WEBHOOK_EVENTS.DECISION_ACCEPTED, {
      decisionId,
      decisionText,
      delta,
      currentV,
      synergy,
      action: 'accepted',
    });
  }

  /**
   * 결정 거절 이벤트
   */
  async onDecisionRejected(
    decisionId: string,
    decisionText: string
  ): Promise<WebhookResult[]> {
    return this.triggerEvent(WEBHOOK_EVENTS.DECISION_REJECTED, {
      decisionId,
      decisionText,
      action: 'rejected',
    });
  }

  /**
   * V 마일스톤 이벤트
   */
  async onVMilestone(
    milestone: string,
    currentV: number,
    growthRate: number
  ): Promise<WebhookResult[]> {
    return this.triggerEvent(WEBHOOK_EVENTS.V_MILESTONE, {
      milestone,
      currentV,
      growthRate,
    });
  }

  /**
   * 일일 리포트 이벤트
   */
  async onDailyReport(report: {
    date: string;
    totalDecisions: number;
    acceptedCount: number;
    rejectedCount: number;
    vChange: number;
    topCategories: string[];
  }): Promise<WebhookResult[]> {
    return this.triggerEvent(WEBHOOK_EVENTS.DAILY_REPORT, report);
  }

  /**
   * 동기화 완료 이벤트
   */
  async onSyncComplete(
    peerId: string,
    peerName: string,
    blocksExchanged: number
  ): Promise<WebhookResult[]> {
    return this.triggerEvent(WEBHOOK_EVENTS.SYNC_COMPLETE, {
      peerId,
      peerName,
      blocksExchanged,
    });
  }

  /**
   * 이벤트 로그 조회
   */
  getEventLog(limit = 50): WebhookResult[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * 통계 조회
   */
  getStats(): {
    totalSent: number;
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
  } {
    const total = this.eventLog.length;
    const success = this.eventLog.filter(r => r.success).length;
    const avgTime = total > 0
      ? this.eventLog.reduce((sum, r) => sum + r.responseTime, 0) / total
      : 0;

    return {
      totalSent: total,
      successCount: success,
      failureCount: total - success,
      avgResponseTime: Math.round(avgTime),
    };
  }

  /**
   * 모든 트리거 목록
   */
  getAllTriggers(): WebhookTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * 트리거 활성화/비활성화
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preset Webhooks
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESET_WEBHOOKS = {
  /**
   * Notion 연동 (결정 → 데이터베이스)
   */
  notion: (webhookUrl: string): WebhookTrigger => ({
    id: 'notion_sync',
    name: 'Notion 동기화',
    url: webhookUrl,
    event: 'decision_accepted',
    enabled: true,
  }),

  /**
   * Slack 알림 (마일스톤 달성)
   */
  slackMilestone: (webhookUrl: string): WebhookTrigger => ({
    id: 'slack_milestone',
    name: 'Slack 마일스톤 알림',
    url: webhookUrl,
    event: 'v_milestone',
    enabled: true,
  }),

  /**
   * 이메일 리포트 (일일 요약)
   */
  emailReport: (webhookUrl: string): WebhookTrigger => ({
    id: 'email_report',
    name: '이메일 일일 리포트',
    url: webhookUrl,
    event: 'daily_report',
    enabled: true,
  }),

  /**
   * Google Sheets 로깅
   */
  sheetsLog: (webhookUrl: string): WebhookTrigger => ({
    id: 'sheets_log',
    name: 'Google Sheets 로그',
    url: webhookUrl,
    event: 'decision_accepted',
    enabled: true,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createN8NClient(baseUrl: string, apiKey?: string): N8NClient {
  return new N8NClient({ baseUrl, apiKey });
}

export default N8NClient;
