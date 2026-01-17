/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📧 Gmail Integration — Zero Meaning 이메일 수집
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gmail API를 통해 이메일을 수집하고 결정 포인트로 변환:
 * - OAuth2 인증
 * - 중요 이메일 필터링
 * - 액션 아이템 추출
 * - V 델타 계산
 * 
 * 원칙:
 * - 원본 저장 금지 (변환된 벡터만)
 * - PII 제외
 * - 로컬 처리 우선
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface GmailConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}

export interface EmailMeta {
  id: string;
  threadId: string;
  timestamp: string;
  importance: 'high' | 'normal' | 'low';
  category: 'action' | 'info' | 'archive';
  hasAttachment: boolean;
  isUnread: boolean;
}

export interface EmailDecision {
  id: string;
  text: string;
  delta: number;
  urgency: number;
  source: 'gmail';
  meta: EmailMeta;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
];

// 중요도 키워드
const IMPORTANCE_KEYWORDS = {
  high: ['urgent', '긴급', 'asap', '즉시', 'important', '중요', 'deadline', '마감'],
  action: ['please', '부탁', 'confirm', '확인', 'review', '검토', 'approve', '승인', 'respond', '답변'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Gmail Client
// ═══════════════════════════════════════════════════════════════════════════════

export class GmailClient {
  private config: GmailConfig;
  private tokens: GmailTokens | null = null;

  constructor(config: GmailConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || DEFAULT_SCOPES,
    };
  }

  /**
   * OAuth2 인증 URL 생성
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });
    
    if (state) {
      params.set('state', state);
    }
    
    return `${GMAIL_AUTH_URL}?${params.toString()}`;
  }

  /**
   * 인증 코드로 토큰 교환
   */
  async exchangeCode(code: string): Promise<GmailTokens> {
    const response = await fetch(GMAIL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.tokens;
  }

  /**
   * 토큰 설정
   */
  setTokens(tokens: GmailTokens): void {
    this.tokens = tokens;
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(): Promise<GmailTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(GMAIL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: this.tokens.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.tokens;
  }

  /**
   * API 요청
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    // 토큰 만료 체크
    if (Date.now() >= this.tokens.expiresAt - 60000) {
      await this.refreshTokens();
    }

    const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${this.tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 이메일 목록 조회
   */
  async listMessages(query?: string, maxResults = 20): Promise<any[]> {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      q: query || 'is:unread OR is:important',
    });

    const data = await this.request<{ messages?: any[] }>(
      `/users/me/messages?${params}`
    );

    return data.messages || [];
  }

  /**
   * 이메일 상세 조회
   */
  async getMessage(messageId: string): Promise<any> {
    return this.request(`/users/me/messages/${messageId}`);
  }

  /**
   * 이메일을 결정 포인트로 변환
   */
  async getDecisions(maxCount = 10): Promise<EmailDecision[]> {
    const messages = await this.listMessages(undefined, maxCount * 2);
    const decisions: EmailDecision[] = [];

    for (const msg of messages.slice(0, maxCount)) {
      try {
        const full = await this.getMessage(msg.id);
        const decision = this.parseEmailToDecision(full);
        
        if (decision) {
          decisions.push(decision);
        }
      } catch (err) {
        console.error('Failed to parse email:', msg.id, err);
      }
    }

    return decisions.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * 이메일 → 결정 포인트 변환
   */
  private parseEmailToDecision(email: any): EmailDecision | null {
    const headers = email.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // 본문 추출 (snippet 사용)
    const snippet = email.snippet || '';

    // 중요도 분석
    const importance = this.analyzeImportance(subject, snippet);
    
    // 액션 아이템 체크
    const hasAction = this.hasActionItem(subject, snippet);
    
    if (!hasAction && importance === 'low') {
      return null; // 액션 없고 중요도 낮으면 건너뜀
    }

    // 결정 텍스트 생성 (PII 제거)
    const decisionText = this.generateDecisionText(subject, from, hasAction);
    
    // V 델타 계산
    const delta = this.calculateDelta(importance, hasAction);
    const urgency = this.calculateUrgency(importance, date, hasAction);

    return {
      id: `gmail_${email.id}`,
      text: decisionText,
      delta,
      urgency,
      source: 'gmail',
      meta: {
        id: email.id,
        threadId: email.threadId,
        timestamp: date,
        importance,
        category: hasAction ? 'action' : 'info',
        hasAttachment: email.payload?.parts?.some((p: any) => p.filename) || false,
        isUnread: email.labelIds?.includes('UNREAD') || false,
      },
    };
  }

  /**
   * 중요도 분석
   */
  private analyzeImportance(subject: string, body: string): 'high' | 'normal' | 'low' {
    const text = `${subject} ${body}`.toLowerCase();
    
    for (const keyword of IMPORTANCE_KEYWORDS.high) {
      if (text.includes(keyword.toLowerCase())) {
        return 'high';
      }
    }
    
    if (subject.length > 50 || body.length > 200) {
      return 'normal';
    }
    
    return 'low';
  }

  /**
   * 액션 아이템 체크
   */
  private hasActionItem(subject: string, body: string): boolean {
    const text = `${subject} ${body}`.toLowerCase();
    
    return IMPORTANCE_KEYWORDS.action.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
  }

  /**
   * 결정 텍스트 생성 (PII 제거)
   */
  private generateDecisionText(subject: string, from: string, hasAction: boolean): string {
    // 발신자 익명화
    const senderType = from.includes('@') 
      ? (from.includes('noreply') ? '시스템' : '연락처')
      : '알 수 없음';
    
    // 주제 정제
    const cleanSubject = subject
      .replace(/\[.*?\]/g, '') // 태그 제거
      .replace(/re:|fwd:/gi, '') // Re/Fwd 제거
      .trim()
      .slice(0, 50);

    if (hasAction) {
      return `[${senderType}] "${cleanSubject}" 에 응답하시겠습니까?`;
    }
    
    return `[${senderType}] "${cleanSubject}" 확인하시겠습니까?`;
  }

  /**
   * V 델타 계산
   */
  private calculateDelta(importance: string, hasAction: boolean): number {
    let delta = 5; // 기본
    
    if (importance === 'high') delta += 10;
    else if (importance === 'normal') delta += 5;
    
    if (hasAction) delta += 5;
    
    return delta;
  }

  /**
   * 긴급도 계산 (0-100)
   */
  private calculateUrgency(importance: string, dateStr: string, hasAction: boolean): number {
    let urgency = 50;
    
    if (importance === 'high') urgency += 30;
    else if (importance === 'normal') urgency += 10;
    
    if (hasAction) urgency += 10;
    
    // 시간 경과에 따른 감소
    try {
      const emailDate = new Date(dateStr);
      const hoursSince = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSince > 24) urgency -= 10;
      if (hoursSince > 72) urgency -= 20;
    } catch {}
    
    return Math.max(0, Math.min(100, urgency));
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return !!this.tokens && Date.now() < this.tokens.expiresAt;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createGmailClient(clientId: string, redirectUri: string): GmailClient {
  return new GmailClient({
    clientId,
    redirectUri,
    scopes: DEFAULT_SCOPES,
  });
}

export default GmailClient;
