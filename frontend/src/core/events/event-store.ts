/**
 * AUTUS Sovereign Event Store
 * PostHog 대체. 내 DB에 내 데이터.
 *
 * 설계 원칙:
 * 1. Append-only (Afterimage 원칙)
 * 2. 로컬 버퍼 → 배치 플러시 (성능)
 * 3. V-Index delta는 서버(Postgres)가 자동 계산
 * 4. 무결성 해시도 서버(Postgres)가 자동 생성
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

export type ActivityEventType =
  // 출석
  | 'attendance.check_in'
  | 'attendance.check_out'
  | 'attendance.absent_marked'
  // 결제
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.overdue'
  // 수업
  | 'session.started'
  | 'session.completed'
  | 'session.cancelled'
  // 스킬
  | 'skill.assessed'
  | 'skill.improved'
  | 'skill.badge_earned'
  // 코치
  | 'coach.feedback_sent'
  | 'coach.report_generated'
  | 'coach.intervention'
  // 학부모
  | 'parent.report_viewed'
  | 'parent.payment_initiated'
  | 'parent.message_sent'
  // UI (신규)
  | 'ui.page_view'
  | 'ui.feature_used'
  | 'ui.menu_tap'
  | 'ui.session_start'
  | 'ui.session_end';

export type ActorRole = 'owner' | 'coach' | 'parent' | 'student' | 'system';

export interface ActivityLog {
  app_id?: string;
  brand?: string;
  actor_id?: string;
  actor_role: ActorRole;
  student_id?: string;
  coach_id?: string;
  event_type: ActivityEventType;
  raw_data: Record<string, unknown>;
  v_index_delta?: number;
  signature?: string;      // 'auto' → 서버가 자동 생성
  occurred_at?: string;
  session_id?: string;
  source?: string;
}

export interface EventStoreConfig {
  supabase: SupabaseClient;
  appId?: string;
  brand?: string;
  flushInterval?: number;  // ms, 기본 5000 (5초)
  maxBufferSize?: number;  // 기본 50
}

// ============================================================
// EventStore Class
// ============================================================

export class EventStore {
  private supabase: SupabaseClient;
  private buffer: ActivityLog[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private appId: string;
  private brand: string;
  private flushInterval: number;
  private maxBufferSize: number;

  // 동시 flush 방지
  private isFlushing = false;

  // 이벤트 리스너 참조 (cleanup용)
  private boundFlush: (() => void) | null = null;
  private boundVisibility: (() => void) | null = null;

  // 현재 사용자 컨텍스트
  private actorId: string | undefined;
  private actorRole: ActorRole = 'system';
  private coachId: string | undefined;

  constructor(config: EventStoreConfig) {
    this.supabase = config.supabase;
    this.appId = config.appId || 'allthatbasket';
    this.brand = config.brand || 'allthatbasket';
    this.flushInterval = config.flushInterval || 5000;
    this.maxBufferSize = config.maxBufferSize || 50;
    this.sessionId = this.generateSessionId();

    // 5초마다 배치 플러시
    this.startFlushTimer();

    // 페이지 떠날 때 남은 버퍼 플러시 (리스너 참조 저장)
    if (typeof window !== 'undefined') {
      this.boundFlush = () => this.flush();
      this.boundVisibility = () => {
        if (document.visibilityState === 'hidden') this.flush();
      };
      window.addEventListener('beforeunload', this.boundFlush);
      document.addEventListener('visibilitychange', this.boundVisibility);
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * 사용자 컨텍스트 설정 (로그인 후 1회 호출)
   */
  setActor(actorId: string, role: ActorRole, coachId?: string): void {
    this.actorId = actorId;
    this.actorRole = role;
    this.coachId = coachId;
  }

  /**
   * 이벤트 기록 (메인 API)
   * 버퍼에 쌓고, 가득 차면 자동 플러시.
   */
  track(eventType: ActivityEventType, data: Record<string, unknown> = {}, options?: {
    studentId?: string;
    vIndexDelta?: number;
    source?: string;
  }): void {
    const log: ActivityLog = {
      app_id: this.appId,
      brand: this.brand,
      actor_id: this.actorId,
      actor_role: this.actorRole,
      student_id: options?.studentId,
      coach_id: this.coachId,
      event_type: eventType,
      raw_data: data,
      v_index_delta: options?.vIndexDelta || 0, // 0이면 서버가 자동 계산
      signature: 'auto',                         // 서버가 자동 생성
      occurred_at: new Date().toISOString(),
      session_id: this.sessionId,
      source: options?.source || 'app',
    };

    this.buffer.push(log);

    // 버퍼 가득 차면 즉시 플러시
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * 편의 메서드: UI 이벤트
   */
  trackPageView(page: string, extra?: Record<string, unknown>): void {
    this.track('ui.page_view', { feature: page, page, ...extra });
  }

  trackFeatureUsed(feature: string, action: string, extra?: Record<string, unknown>): void {
    this.track('ui.feature_used', { feature, action, ...extra });
  }

  trackMenuTap(menuItem: string, extra?: Record<string, unknown>): void {
    this.track('ui.menu_tap', { feature: menuItem, menu: menuItem, ...extra });
  }

  /**
   * 편의 메서드: 비즈니스 이벤트
   */
  trackAttendance(
    eventType: 'attendance.check_in' | 'attendance.check_out' | 'attendance.absent_marked',
    studentId: string,
    data: Record<string, unknown>
  ): void {
    this.track(eventType, data, { studentId, source: data.method as string || 'app' });
  }

  trackPayment(
    eventType: 'payment.completed' | 'payment.failed' | 'payment.overdue',
    studentId: string,
    data: Record<string, unknown>
  ): void {
    this.track(eventType, data, { studentId, source: 'webhook' });
  }

  trackSkill(
    eventType: 'skill.assessed' | 'skill.improved' | 'skill.badge_earned',
    studentId: string,
    data: Record<string, unknown>
  ): void {
    this.track(eventType, data, { studentId });
  }

  // ============================================================
  // 플러시 (Supabase INSERT)
  // ============================================================

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await this.supabase
        .from('activity_logs')
        .insert(batch);

      if (error) {
        // 실패 시 버퍼 앞에 복원 (시간순 유지, 다음 플러시 때 재시도)
        console.error('[EventStore] Flush failed:', error.message);
        this.buffer = [...batch, ...this.buffer];
      }
    } catch (err) {
      console.error('[EventStore] Flush exception:', err);
      this.buffer = [...batch, ...this.buffer];
    } finally {
      this.isFlushing = false;
    }
  }

  // ============================================================
  // 조회 API (몰트봇/대시보드용)
  // ============================================================

  /**
   * 완료율 조회 (SystemMode 판단용)
   */
  async getCompletionRate(days: number = 7): Promise<{
    total_started: number;
    total_completed: number;
    completion_rate: number;
    mode_recommendation: string;
  } | null> {
    const { data, error } = await this.supabase
      .rpc('get_completion_rate', { p_app_id: this.appId, p_days: days });

    if (error || !data?.[0]) return null;
    return data[0];
  }

  /**
   * 이탈 위험 학생 조회
   */
  async getChurnRiskStudents(threshold: number = 5): Promise<Array<{
    student_id: string;
    monthly_v_index: number;
    last_activity: string;
    days_inactive: number;
    risk_level: string;
  }>> {
    const { data, error } = await this.supabase
      .rpc('get_churn_risk_students', { p_app_id: this.appId, p_threshold: threshold });

    if (error) return [];
    return data || [];
  }

  /**
   * 학부모 리포트 데이터 조회
   */
  async getParentReport(studentId: string, days: number = 30): Promise<{
    total_v_index: number;
    period_v_index: number;
    attendance_rate: number;
    skill_improvements: unknown[];
    badges_earned: number;
    coach_feedbacks: number;
    event_timeline: unknown[];
  } | null> {
    const { data, error } = await this.supabase
      .rpc('get_parent_report', { p_student_id: studentId, p_days: days });

    if (error || !data?.[0]) return null;
    return data[0];
  }

  /**
   * 기능별 사용량 조회 (Sunset Rule용)
   */
  async getFeatureUsage(): Promise<Array<{
    feature_key: string;
    uses_7d: number;
    uses_30d: number;
    unique_users_7d: number;
    last_used: string;
    sunset_candidate: boolean;
  }>> {
    const { data, error } = await this.supabase
      .from('feature_usage_summary')
      .select('*')
      .eq('app_id', this.appId);

    if (error) return [];
    return data || [];
  }

  /**
   * 학생 V-Index 요약 조회
   */
  async getStudentVIndex(studentId: string): Promise<{
    total_v_index: number;
    weekly_v_index: number;
    monthly_v_index: number;
    total_events: number;
    last_activity: string;
    attendance_rate_30d: number;
  } | null> {
    const { data, error } = await this.supabase
      .from('student_v_index_summary')
      .select('*')
      .eq('student_id', studentId)
      .eq('app_id', this.appId)
      .single();

    if (error) return null;
    return data;
  }

  // ============================================================
  // Internal
  // ============================================================

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  private generateSessionId(): string {
    return `${this.appId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 정리 (컴포넌트 언마운트 시)
   */
  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);

    // 이벤트 리스너 제거
    if (typeof window !== 'undefined') {
      if (this.boundFlush) window.removeEventListener('beforeunload', this.boundFlush);
      if (this.boundVisibility) document.removeEventListener('visibilitychange', this.boundVisibility);
    }

    this.flush();
  }
}
