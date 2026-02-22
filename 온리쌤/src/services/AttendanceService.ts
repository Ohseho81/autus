/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔵 AttendanceService - 베조스 방식 촘촘한 출석 프로세스
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 16단계 출석 체크 프로세스:
 * 사전(4) → 도착(6) → 알림(3) → 후처리(3)
 *
 * 모든 단계 측정, 모든 예외 처리
 */

import { supabase } from '../lib/supabase';
import personalAIService from './PersonalAIService';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Enums
// ═══════════════════════════════════════════════════════════════════════════════

interface StudentData {
  id: string;
  name: string;
  attendance_number: string;
  photo_url?: string;
  sessions_remaining?: number | null;
  payment_status?: string | null;
  parent_phone?: string;
  parent_kakao_id?: string;
}

interface SessionData {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status?: string;
  className?: string;
  atb_classes?: { name?: string } | { name?: string }[];
}

export enum AttendanceError {
  INVALID_NUMBER = 'E001',      // 잘못된 출석번호
  NOT_ENROLLED = 'E002',        // 미등록 학생
  WRONG_CLASS = 'E003',         // 다른 수업 시간
  ALREADY_CHECKED = 'E004',     // 이미 출석 완료
  SESSION_EXPIRED = 'E005',     // 수업 종료됨
  PAYMENT_OVERDUE = 'E006',     // 미납 상태
  SESSIONS_DEPLETED = 'E007',   // 회차 소진
  TOO_EARLY = 'E008',           // 너무 이른 출석
  SYSTEM_ERROR = 'E999',        // 시스템 오류
}

export enum AttendanceStatus {
  PENDING = 'pending',
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  EXCUSED = 'excused', // 사전 결석 신고
}

export interface AttendanceResult {
  success: boolean;
  error?: AttendanceError;
  errorMessage?: string;
  data?: {
    studentId: string;
    studentName: string;
    className: string;
    checkInTime: Date;
    status: AttendanceStatus;
    sessionsRemaining?: number;
  };
  metrics: AttendanceMetrics;
}

export interface AttendanceMetrics {
  startTime: number;
  lookupTime?: number;
  validationTime?: number;
  saveTime?: number;
  notificationTime?: number;
  totalTime?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Error Messages (다국어 지원 준비)
// ═══════════════════════════════════════════════════════════════════════════════

const ERROR_MESSAGES: Record<AttendanceError, string> = {
  [AttendanceError.INVALID_NUMBER]: '출석번호를 다시 확인해주세요',
  [AttendanceError.NOT_ENROLLED]: '등록되지 않은 학생입니다. 데스크에 문의하세요',
  [AttendanceError.WRONG_CLASS]: '현재 시간에 배정된 수업이 없습니다',
  [AttendanceError.ALREADY_CHECKED]: '이미 출석 처리되었습니다',
  [AttendanceError.SESSION_EXPIRED]: '수업이 이미 종료되었습니다',
  [AttendanceError.PAYMENT_OVERDUE]: '수강료 미납 상태입니다. 데스크에 문의하세요',
  [AttendanceError.SESSIONS_DEPLETED]: '잔여 회차가 없습니다. 충전이 필요합니다',
  [AttendanceError.TOO_EARLY]: '수업 시작 30분 전부터 출석 가능합니다',
  [AttendanceError.SYSTEM_ERROR]: '시스템 오류입니다. 잠시 후 다시 시도하세요',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Service Class
// ═══════════════════════════════════════════════════════════════════════════════

class AttendanceService {
  private metrics: AttendanceMetrics = { startTime: 0 };

  /**
   * 출석 체크 메인 함수 (16단계 프로세스)
   */
  async checkAttendance(
    attendanceNumber: string,
    sessionId?: string
  ): Promise<AttendanceResult> {
    this.metrics = { startTime: Date.now() };

    try {
      // ─────────────────────────────────────────────────────────────────────
      // Step 7: 학생 정보 조회 (0.3초 이내 목표)
      // ─────────────────────────────────────────────────────────────────────
      const lookupStart = Date.now();
      const student = await this.lookupStudent(attendanceNumber);
      this.metrics.lookupTime = Date.now() - lookupStart;

      if (!student) {
        return this.createErrorResult(AttendanceError.INVALID_NUMBER);
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 8: 출석 유효성 검증
      // ─────────────────────────────────────────────────────────────────────
      const validationStart = Date.now();
      const validation = await this.validateAttendance(student, sessionId);
      this.metrics.validationTime = Date.now() - validationStart;

      if (!validation.isValid) {
        return this.createErrorResult(validation.error!);
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 9: 출석 상태 업데이트 (DB 저장)
      // ─────────────────────────────────────────────────────────────────────
      const saveStart = Date.now();
      const attendanceRecord = await this.saveAttendance(
        student,
        validation.session!,
        validation.status!
      );
      this.metrics.saveTime = Date.now() - saveStart;

      // ─────────────────────────────────────────────────────────────────────
      // Step 11-12: 알림 발송 (비동기, 0.5초 이내 목표)
      // ─────────────────────────────────────────────────────────────────────
      const notificationStart = Date.now();
      this.sendNotificationsAsync(student, validation.session!, validation.status!);
      this.metrics.notificationTime = Date.now() - notificationStart;

      // ─────────────────────────────────────────────────────────────────────
      // Step 14-16: 후처리 (회차 차감, 통계, 로그)
      // ─────────────────────────────────────────────────────────────────────
      await this.postProcess(student, validation.session!);

      this.metrics.totalTime = Date.now() - this.metrics.startTime;

      // 성능 로깅
      this.logMetrics();

      return {
        success: true,
        data: {
          studentId: student.id,
          studentName: student.name,
          className: validation.session?.className || '수업',
          checkInTime: new Date(),
          status: validation.status!,
          sessionsRemaining: student.sessions_remaining ?? undefined,
        },
        metrics: this.metrics,
      };

    } catch (error: unknown) {
      if (__DEV__) console.error('[AttendanceService] Error:', error);
      this.metrics.totalTime = Date.now() - this.metrics.startTime;
      return this.createErrorResult(AttendanceError.SYSTEM_ERROR);
    }
  }

  /**
   * Step 7: 학생 정보 조회
   */
  private async lookupStudent(attendanceNumber: string): Promise<StudentData | null> {
    // 출석번호 형식 검증 (4자리 숫자)
    if (!/^\d{4}$/.test(attendanceNumber)) {
      return null;
    }

    const { data, error } = await supabase
      .from('atb_students')
      .select(`
        id,
        name,
        attendance_number,
        photo_url,
        sessions_remaining,
        payment_status,
        parent_phone,
        parent_kakao_id
      `)
      .eq('attendance_number', attendanceNumber)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return data as StudentData;
  }

  /**
   * Step 8: 출석 유효성 검증 (촘촘한 체크)
   */
  private async validateAttendance(
    student: StudentData,
    sessionId?: string
  ): Promise<{
    isValid: boolean;
    error?: AttendanceError;
    session?: SessionData;
    status?: AttendanceStatus;
  }> {
    const now = new Date();

    // 8-1: 미납 상태 체크
    if (student.payment_status === 'overdue') {
      return { isValid: false, error: AttendanceError.PAYMENT_OVERDUE };
    }

    // 8-2: 회차 소진 체크 (오픈반의 경우)
    if (student.sessions_remaining !== null && student.sessions_remaining !== undefined && student.sessions_remaining <= 0) {
      return { isValid: false, error: AttendanceError.SESSIONS_DEPLETED };
    }

    // 8-3: 현재 시간에 해당하는 수업 조회
    const session = await this.findCurrentSession(student.id, sessionId);

    if (!session) {
      return { isValid: false, error: AttendanceError.WRONG_CLASS };
    }

    // 8-4: 수업 시간 체크 (30분 전부터 출석 가능)
    const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
    const sessionEnd = new Date(`${session.session_date}T${session.end_time}`);
    const earlyCheckInLimit = new Date(sessionStart.getTime() - 30 * 60 * 1000);

    if (now < earlyCheckInLimit) {
      return { isValid: false, error: AttendanceError.TOO_EARLY };
    }

    if (now > sessionEnd) {
      return { isValid: false, error: AttendanceError.SESSION_EXPIRED };
    }

    // 8-5: 이미 출석 체크 여부
    const existingAttendance = await this.checkExistingAttendance(student.id, session.id);
    if (existingAttendance && existingAttendance.attendance_status === 'present') {
      return { isValid: false, error: AttendanceError.ALREADY_CHECKED };
    }

    // 8-6: 지각 여부 판단
    const lateThreshold = new Date(sessionStart.getTime() + 10 * 60 * 1000);
    const status = now > lateThreshold ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    return {
      isValid: true,
      session,
      status,
    };
  }

  /**
   * 현재 시간에 해당하는 수업 찾기
   */
  private async findCurrentSession(studentId: string, sessionId?: string): Promise<SessionData | null> {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    let query = supabase
      .from('atb_sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        status,
        atb_classes(name)
      `)
      .eq('session_date', today)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime);

    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    const { data } = await query.single();

    if (data) {
      // Supabase 조인 결과가 배열 또는 객체일 수 있음
      const classData = data.atb_classes as unknown;
      const className = Array.isArray(classData)
        ? (classData[0] as { name?: string })?.name
        : (classData as { name?: string })?.name;
      return {
        ...data,
        className: className || '수업',
      } as SessionData;
    }

    return null;
  }

  /**
   * 기존 출석 기록 확인
   */
  private async checkExistingAttendance(studentId: string, sessionId: string): Promise<any | null> {
    const { data } = await supabase
      .from('atb_session_students')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .single();

    return data;
  }

  /**
   * Step 9: 출석 상태 저장
   */
  private async saveAttendance(
    student: StudentData,
    session: SessionData,
    status: AttendanceStatus
  ): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('atb_session_students')
      .upsert({
        session_id: session.id,
        student_id: student.id,
        attendance_status: status,
        check_in_time: now,
        notification_sent: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Personal AI 로그
    try {
      const eventType = status === AttendanceStatus.ABSENT ? 'ATTENDANCE_ABSENT' : 'ATTENDANCE_PRESENT';
      await personalAIService.logEvent(eventType, { studentId: student.id, classId: session.id });
    } catch { /* ignore */ }

    return data || {};
  }

  /**
   * Step 11-12: 알림 발송 (비동기)
   */
  private async sendNotificationsAsync(
    student: StudentData,
    session: SessionData,
    status: AttendanceStatus
  ): Promise<void> {
    // 비동기로 실행 (출석 응답 시간에 영향 주지 않음)
    setImmediate(async () => {
      try {
        // 11: 학부모 앱 실시간 알림
        await this.sendAppNotification(student, session, status);

        // 12: 카카오톡 알림
        await this.sendKakaoNotification(student, session, status);

        // 알림 발송 완료 표시
        await supabase
          .from('atb_session_students')
          .update({ notification_sent: true })
          .eq('session_id', session.id)
          .eq('student_id', student.id);

      } catch (error: unknown) {
        if (__DEV__) console.error('[AttendanceService] Notification error:', error);
        // 알림 실패 로그 저장
        const errorMsg = error instanceof Error ? error.message : String(error);
        await this.logNotificationFailure(student.id, session.id, errorMsg);
      }
    });
  }

  /**
   * 앱 푸시 알림 발송
   */
  private async sendAppNotification(
    student: StudentData,
    session: SessionData,
    status: AttendanceStatus
  ): Promise<void> {
    const statusText = status === AttendanceStatus.LATE ? '지각' : '출석';
    const message = `${student.name} 학생이 ${session.className}에 ${statusText}했습니다.`;

    await supabase.from('atb_notifications').insert({
      recipient_type: 'parent',
      recipient_phone: student.parent_phone,
      channel: 'push',
      notification_type: 'attendance',
      title: `${statusText} 알림`,
      message,
      status: 'pending',
    });

    if (__DEV__) console.log(`[Notification] App push sent: ${message}`);
  }

  /**
   * 카카오톡 알림 발송
   */
  private async sendKakaoNotification(
    student: StudentData,
    session: SessionData,
    status: AttendanceStatus
  ): Promise<void> {
    const statusText = status === AttendanceStatus.LATE ? '지각' : '출석';
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const message = `[온리쌤 출석알림]
${student.name} 학생이 ${statusText}했습니다.

📍 수업: ${session.className}
⏰ 시간: ${time}

온리쌤과 함께 성장하세요! 🏀`;

    await supabase.from('atb_notifications').insert({
      recipient_type: 'parent',
      recipient_phone: student.parent_phone,
      recipient_kakao_id: student.parent_kakao_id,
      channel: 'kakao',
      notification_type: 'attendance',
      template_code: 'ATB_ATTENDANCE_001',
      title: `${statusText} 알림`,
      message,
      variables: {
        student_name: student.name,
        class_name: session.className,
        status: statusText,
        time,
      },
      status: 'pending',
    });

    if (__DEV__) console.log(`[Notification] Kakao sent: ${student.name} ${statusText}`);
  }

  /**
   * Step 14-16: 후처리
   */
  private async postProcess(student: StudentData, session: SessionData): Promise<void> {
    // 14: 회차 차감 (오픈반의 경우)
    if ((session as Record<string, unknown>).is_open_class && student.sessions_remaining && student.sessions_remaining > 0) {
      await supabase
        .from('atb_students')
        .update({ sessions_remaining: student.sessions_remaining - 1 })
        .eq('id', student.id);
    }

    // 15: 출석 통계 업데이트 (비동기)
    setImmediate(() => this.updateStatistics(session.id));

    // 16: 출석 로그 저장 (감사 추적)
    await this.saveAuditLog(student, session);
  }

  /**
   * 출석 통계 업데이트
   */
  private async updateStatistics(sessionId: string): Promise<void> {
    const { data } = await supabase
      .from('atb_session_students')
      .select('attendance_status')
      .eq('session_id', sessionId);

    if (data) {
      const stats = {
        total: data.length,
        present: data.filter(s => s.attendance_status === 'present').length,
        late: data.filter(s => s.attendance_status === 'late').length,
        absent: data.filter(s => s.attendance_status === 'absent').length,
      };

      await supabase
        .from('atb_sessions')
        .update({
          attendance_stats: stats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  }

  /**
   * 감사 로그 저장
   */
  private async saveAuditLog(student: StudentData, session: SessionData): Promise<void> {
    await supabase.from('atb_audit_logs').insert({
      action: 'ATTENDANCE_CHECK',
      entity_type: 'session_student',
      entity_id: session.id,
      actor_type: 'student',
      actor_id: student.id,
      details: {
        student_name: student.name,
        session_date: session.session_date,
        class_name: session.className,
        metrics: this.metrics,
      },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 알림 실패 로그
   */
  private async logNotificationFailure(
    studentId: string,
    sessionId: string,
    error: string
  ): Promise<void> {
    try {
      await supabase.from('atb_notification_failures').insert({
        student_id: studentId,
        session_id: sessionId,
        error_message: error || 'Unknown error',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
    } catch (e: unknown) {
      if (__DEV__) console.error('[AttendanceService] Failed to log notification failure:', e);
    }
  }

  /**
   * 에러 결과 생성
   */
  private createErrorResult(error: AttendanceError): AttendanceResult {
    this.metrics.totalTime = Date.now() - this.metrics.startTime;
    return {
      success: false,
      error,
      errorMessage: ERROR_MESSAGES[error],
      metrics: this.metrics,
    };
  }

  /**
   * 성능 메트릭 로깅
   */
  private logMetrics(): void {
    if (__DEV__) console.log('[AttendanceService] Metrics:', {
      lookup: `${this.metrics.lookupTime}ms`,
      validation: `${this.metrics.validationTime}ms`,
      save: `${this.metrics.saveTime}ms`,
      notification: `${this.metrics.notificationTime}ms`,
      total: `${this.metrics.totalTime}ms`,
      target: this.metrics.totalTime! < 3000 ? '✅ PASS' : '❌ FAIL (>3s)',
    });
  }
}

// Singleton export
export const attendanceService = new AttendanceService();
