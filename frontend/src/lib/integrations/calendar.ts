/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 Calendar Integration — 일정 기반 결정
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Google Calendar API를 통해 일정을 수집하고 결정 포인트로 변환:
 * - OAuth2 인증 (Gmail과 공유)
 * - 오늘/내일 일정 조회
 * - 준비 필요 항목 추출
 * - V 델타 계산
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalendarConfig {
  clientId: string;
  redirectUri: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  attendeeCount: number;
  isOrganizer: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarDecision {
  id: string;
  text: string;
  delta: number;
  urgency: number;
  source: 'calendar';
  event: CalendarEvent;
  prepTime: number; // 분
}

export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// 회의 유형별 준비 시간 (분)
const PREP_TIMES: Record<string, number> = {
  meeting: 15,
  presentation: 30,
  interview: 20,
  review: 15,
  standup: 5,
  '1on1': 10,
  default: 10,
};

// 회의 키워드
const MEETING_KEYWORDS: Record<string, string[]> = {
  presentation: ['발표', 'presentation', '프레젠', 'demo', '데모'],
  interview: ['면접', 'interview', '인터뷰'],
  review: ['리뷰', 'review', '검토', 'retrospective'],
  standup: ['standup', '스탠드업', 'daily', '데일리'],
  '1on1': ['1:1', '1on1', 'one on one'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar Client
// ═══════════════════════════════════════════════════════════════════════════════

export class CalendarClient {
  private config: CalendarConfig;
  private tokens: CalendarTokens | null = null;

  constructor(config: CalendarConfig) {
    this.config = config;
  }

  /**
   * 토큰 설정 (Gmail OAuth와 공유 가능)
   */
  setTokens(tokens: CalendarTokens): void {
    this.tokens = tokens;
  }

  /**
   * API 요청
   */
  private async request<T>(endpoint: string): Promise<T> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 이벤트 목록 조회
   */
  async listEvents(
    timeMin: Date,
    timeMax: Date,
    maxResults = 20
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const data = await this.request<{ items?: any[] }>(
      `/calendars/primary/events?${params}`
    );

    return (data.items || [])
      .filter(item => item.status !== 'cancelled')
      .map(item => this.parseEvent(item));
  }

  /**
   * 이벤트 파싱
   */
  private parseEvent(item: any): CalendarEvent {
    const start = item.start?.dateTime 
      ? new Date(item.start.dateTime)
      : new Date(item.start?.date);
    
    const end = item.end?.dateTime
      ? new Date(item.end.dateTime)
      : new Date(item.end?.date);

    return {
      id: item.id,
      summary: item.summary || '(제목 없음)',
      start,
      end,
      location: item.location,
      description: item.description,
      attendeeCount: item.attendees?.length || 0,
      isOrganizer: item.organizer?.self || false,
      status: item.status || 'confirmed',
    };
  }

  /**
   * 오늘 일정 조회
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.listEvents(now, tomorrow);
  }

  /**
   * 내일 일정 조회
   */
  async getTomorrowEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return this.listEvents(tomorrow, dayAfter);
  }

  /**
   * 일정을 결정 포인트로 변환
   */
  async getDecisions(): Promise<CalendarDecision[]> {
    const todayEvents = await this.getTodayEvents();
    const tomorrowEvents = await this.getTomorrowEvents();
    
    const decisions: CalendarDecision[] = [];
    const now = new Date();

    // 오늘 일정
    for (const event of todayEvents) {
      const minutesUntil = (event.start.getTime() - now.getTime()) / (1000 * 60);
      
      // 2시간 이내 일정만
      if (minutesUntil > 0 && minutesUntil <= 120) {
        const decision = this.eventToDecision(event, minutesUntil, 'today');
        decisions.push(decision);
      }
    }

    // 내일 중요 일정 (준비 필요)
    for (const event of tomorrowEvents) {
      const meetingType = this.detectMeetingType(event.summary);
      
      if (meetingType !== 'default' || event.attendeeCount >= 3 || event.isOrganizer) {
        const decision = this.eventToDecision(event, 24 * 60, 'tomorrow');
        decisions.push(decision);
      }
    }

    return decisions.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * 이벤트 → 결정 포인트 변환
   */
  private eventToDecision(
    event: CalendarEvent, 
    minutesUntil: number,
    when: 'today' | 'tomorrow'
  ): CalendarDecision {
    const meetingType = this.detectMeetingType(event.summary);
    const prepTime = PREP_TIMES[meetingType] || PREP_TIMES.default;
    
    // 결정 텍스트 생성
    const timeStr = this.formatTime(event.start);
    const prepStr = this.formatPrepTime(prepTime);
    
    let text: string;
    if (when === 'today') {
      text = `[${timeStr}] "${event.summary}" 준비하시겠습니까? (${prepStr} 필요)`;
    } else {
      text = `[내일 ${timeStr}] "${event.summary}" 준비를 시작하시겠습니까?`;
    }

    // 델타 계산
    const delta = this.calculateDelta(event, meetingType);
    
    // 긴급도 계산
    const urgency = this.calculateUrgency(minutesUntil, meetingType, event);

    return {
      id: `calendar_${event.id}`,
      text,
      delta,
      urgency,
      source: 'calendar',
      event,
      prepTime,
    };
  }

  /**
   * 회의 유형 감지
   */
  private detectMeetingType(summary: string): string {
    const lower = summary.toLowerCase();
    
    for (const [type, keywords] of Object.entries(MEETING_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
        return type;
      }
    }
    
    return 'default';
  }

  /**
   * V 델타 계산
   */
  private calculateDelta(event: CalendarEvent, meetingType: string): number {
    let delta = 10; // 기본

    // 회의 유형별
    if (meetingType === 'presentation') delta += 15;
    else if (meetingType === 'interview') delta += 10;
    else if (meetingType === 'review') delta += 8;
    
    // 참석자 수
    if (event.attendeeCount >= 5) delta += 10;
    else if (event.attendeeCount >= 3) delta += 5;
    
    // 주최자 여부
    if (event.isOrganizer) delta += 5;

    return delta;
  }

  /**
   * 긴급도 계산 (0-100)
   */
  private calculateUrgency(
    minutesUntil: number, 
    meetingType: string,
    event: CalendarEvent
  ): number {
    let urgency = 50;

    // 시간 기반
    if (minutesUntil <= 30) urgency += 40;
    else if (minutesUntil <= 60) urgency += 25;
    else if (minutesUntil <= 120) urgency += 10;
    
    // 회의 유형
    if (meetingType === 'presentation') urgency += 15;
    else if (meetingType === 'interview') urgency += 10;
    
    // 주최자면 더 긴급
    if (event.isOrganizer) urgency += 10;

    return Math.max(0, Math.min(100, urgency));
  }

  /**
   * 시간 포맷
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * 준비 시간 포맷
   */
  private formatPrepTime(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
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

export function createCalendarClient(clientId: string, redirectUri: string): CalendarClient {
  return new CalendarClient({ clientId, redirectUri });
}

export default CalendarClient;
