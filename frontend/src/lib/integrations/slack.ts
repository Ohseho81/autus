/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 Slack Integration — 메시지 기반 결정
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Slack API를 통해 메시지를 수집하고 결정 포인트로 변환:
 * - OAuth2 인증
 * - DM/멘션 필터링
 * - 액션 아이템 추출
 * - V 델타 계산
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SlackConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  timestamp: string;
  type: 'dm' | 'mention' | 'channel';
  hasThread: boolean;
  reactionCount: number;
}

export interface SlackDecision {
  id: string;
  text: string;
  delta: number;
  urgency: number;
  source: 'slack';
  message: SlackMessage;
}

export interface SlackTokens {
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
  expiresAt?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_API_BASE = 'https://slack.com/api';

const DEFAULT_SCOPES = [
  'channels:history',
  'channels:read',
  'groups:history',
  'groups:read',
  'im:history',
  'im:read',
  'mpim:history',
  'mpim:read',
  'users:read',
];

// 액션 키워드
const ACTION_KEYWORDS = [
  'please', '부탁', 'help', '도와', 'urgent', '긴급',
  'review', '리뷰', 'check', '확인', 'approve', '승인',
  'asap', 'today', '오늘', 'tomorrow', '내일',
];

// ═══════════════════════════════════════════════════════════════════════════════
// Slack Client
// ═══════════════════════════════════════════════════════════════════════════════

export class SlackClient {
  private config: SlackConfig;
  private tokens: SlackTokens | null = null;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  /**
   * OAuth2 인증 URL 생성
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: DEFAULT_SCOPES.join(','),
      user_scope: 'identity.basic',
    });
    
    if (state) {
      params.set('state', state);
    }
    
    return `${SLACK_AUTH_URL}?${params.toString()}`;
  }

  /**
   * 인증 코드로 토큰 교환
   */
  async exchangeCode(code: string): Promise<SlackTokens> {
    const response = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack auth failed: ${data.error}`);
    }

    this.tokens = {
      accessToken: data.access_token,
      teamId: data.team?.id || '',
      teamName: data.team?.name || '',
      userId: data.authed_user?.id || '',
    };

    return this.tokens;
  }

  /**
   * 토큰 설정
   */
  setTokens(tokens: SlackTokens): void {
    this.tokens = tokens;
  }

  /**
   * API 요청
   */
  private async request<T>(method: string, params?: Record<string, string>): Promise<T> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${SLACK_API_BASE}/${method}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * DM 채널 목록
   */
  async listDMs(): Promise<any[]> {
    const data = await this.request<{ channels: any[] }>('conversations.list', {
      types: 'im,mpim',
      limit: '20',
    });
    return data.channels || [];
  }

  /**
   * 채널 메시지 조회
   */
  async getMessages(channelId: string, limit = 20): Promise<any[]> {
    const oldest = Math.floor(Date.now() / 1000) - 86400; // 24시간 전
    
    const data = await this.request<{ messages: any[] }>('conversations.history', {
      channel: channelId,
      limit: limit.toString(),
      oldest: oldest.toString(),
    });
    
    return data.messages || [];
  }

  /**
   * 멘션 조회
   */
  async getMentions(): Promise<any[]> {
    const data = await this.request<{ items: any[] }>('search.messages', {
      query: `<@${this.tokens?.userId}>`,
      count: '20',
    });
    
    return data.items || [];
  }

  /**
   * 메시지를 결정 포인트로 변환
   */
  async getDecisions(maxCount = 10): Promise<SlackDecision[]> {
    const decisions: SlackDecision[] = [];

    // DM 수집
    const dms = await this.listDMs();
    for (const dm of dms.slice(0, 5)) {
      const messages = await this.getMessages(dm.id, 5);
      
      for (const msg of messages) {
        if (msg.user === this.tokens?.userId) continue; // 내 메시지 제외
        
        const decision = this.parseMessageToDecision(msg, dm, 'dm');
        if (decision) {
          decisions.push(decision);
        }
      }
    }

    return decisions
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, maxCount);
  }

  /**
   * 메시지 → 결정 포인트 변환
   */
  private parseMessageToDecision(
    msg: any, 
    channel: any, 
    type: 'dm' | 'mention' | 'channel'
  ): SlackDecision | null {
    const text = msg.text || '';
    
    // 액션 아이템 체크
    const hasAction = this.hasActionItem(text);
    
    if (!hasAction && type === 'channel') {
      return null; // 채널 메시지는 액션 있는 것만
    }

    // 결정 텍스트 생성
    const decisionText = this.generateDecisionText(text, type);
    
    // V 델타 계산
    const delta = this.calculateDelta(type, hasAction, msg);
    const urgency = this.calculateUrgency(type, hasAction, msg);

    return {
      id: `slack_${msg.ts}`,
      text: decisionText,
      delta,
      urgency,
      source: 'slack',
      message: {
        id: msg.ts,
        channelId: channel.id,
        channelName: channel.name || 'DM',
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        type,
        hasThread: !!msg.thread_ts,
        reactionCount: msg.reactions?.length || 0,
      },
    };
  }

  /**
   * 액션 아이템 체크
   */
  private hasActionItem(text: string): boolean {
    const lower = text.toLowerCase();
    return ACTION_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }

  /**
   * 결정 텍스트 생성
   */
  private generateDecisionText(text: string, type: string): string {
    // 멘션 제거 및 정제
    const clean = text
      .replace(/<@[A-Z0-9]+>/g, '') // 멘션 제거
      .replace(/<#[A-Z0-9]+\|[^>]+>/g, '') // 채널 링크 제거
      .replace(/<https?:\/\/[^>]+>/g, '[링크]') // URL 변환
      .trim()
      .slice(0, 60);

    const prefix = type === 'dm' ? '[DM]' : type === 'mention' ? '[멘션]' : '[채널]';
    
    return `${prefix} "${clean}..." 에 응답하시겠습니까?`;
  }

  /**
   * V 델타 계산
   */
  private calculateDelta(type: string, hasAction: boolean, msg: any): number {
    let delta = 5;
    
    if (type === 'dm') delta += 8;
    else if (type === 'mention') delta += 5;
    
    if (hasAction) delta += 5;
    
    if (msg.reactions?.length > 0) delta += 2;
    if (msg.thread_ts) delta += 3;
    
    return delta;
  }

  /**
   * 긴급도 계산 (0-100)
   */
  private calculateUrgency(type: string, hasAction: boolean, msg: any): number {
    let urgency = 40;
    
    if (type === 'dm') urgency += 25;
    else if (type === 'mention') urgency += 15;
    
    if (hasAction) urgency += 20;
    
    // 시간 경과
    const msgTime = parseFloat(msg.ts) * 1000;
    const hoursSince = (Date.now() - msgTime) / (1000 * 60 * 60);
    
    if (hoursSince < 1) urgency += 15;
    else if (hoursSince < 4) urgency += 5;
    else if (hoursSince > 12) urgency -= 10;
    
    return Math.max(0, Math.min(100, urgency));
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return !!this.tokens?.accessToken;
  }

  /**
   * 팀 정보
   */
  get teamInfo(): { id: string; name: string } | null {
    return this.tokens ? {
      id: this.tokens.teamId,
      name: this.tokens.teamName,
    } : null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createSlackClient(clientId: string, redirectUri: string): SlackClient {
  return new SlackClient({ clientId, redirectUri });
}

export default SlackClient;
