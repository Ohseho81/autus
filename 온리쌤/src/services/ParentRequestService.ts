/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔵 ParentRequestService - 베조스 방식 촘촘한 요청 처리
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SLA 기반 자동 에스컬레이션:
 * Level 1 (시스템) → Level 2 (코치) → Level 3 (관리자) → Level 4 (대표)
 *
 * 모든 요청 추적, 만족도 측정
 */

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Enums
// ═══════════════════════════════════════════════════════════════════════════════

export enum RequestType {
  ABSENCE = 'absence',           // 결석 신고
  MAKEUP = 'makeup',             // 보강 신청
  SCHEDULE_CHANGE = 'schedule',  // 스케줄 변경
  REFUND = 'refund',             // 환불 요청
  COMPLAINT = 'complaint',       // 컴플레인
  INQUIRY = 'inquiry',           // 일반 문의
  FEEDBACK = 'feedback',         // 피드백
}

export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum RequestStatus {
  PENDING = 'pending',           // 대기
  AUTO_PROCESSING = 'auto',      // 자동 처리 중
  ASSIGNED = 'assigned',         // 담당자 배정
  IN_PROGRESS = 'in_progress',   // 처리 중
  WAITING_RESPONSE = 'waiting',  // 고객 응답 대기
  COMPLETED = 'completed',       // 완료
  REJECTED = 'rejected',         // 거절
  ESCALATED = 'escalated',       // 에스컬레이션
}

export enum EscalationLevel {
  SYSTEM = 1,      // 시스템 자동 처리
  COACH = 2,       // 담당 코치
  ADMIN = 3,       // 관리자
  EXECUTIVE = 4,   // 대표
}

// SLA 설정 (분 단위)
const SLA_CONFIG: Record<RequestType, {
  priority: RequestPriority;
  slaMinutes: number;
  autoProcessable: boolean;
  defaultLevel: EscalationLevel;
}> = {
  [RequestType.ABSENCE]: {
    priority: RequestPriority.NORMAL,
    slaMinutes: 0, // 즉시
    autoProcessable: true,
    defaultLevel: EscalationLevel.SYSTEM,
  },
  [RequestType.MAKEUP]: {
    priority: RequestPriority.NORMAL,
    slaMinutes: 0, // 즉시
    autoProcessable: true,
    defaultLevel: EscalationLevel.SYSTEM,
  },
  [RequestType.SCHEDULE_CHANGE]: {
    priority: RequestPriority.NORMAL,
    slaMinutes: 240, // 4시간
    autoProcessable: false,
    defaultLevel: EscalationLevel.COACH,
  },
  [RequestType.REFUND]: {
    priority: RequestPriority.HIGH,
    slaMinutes: 1440, // 24시간
    autoProcessable: false,
    defaultLevel: EscalationLevel.ADMIN,
  },
  [RequestType.COMPLAINT]: {
    priority: RequestPriority.URGENT,
    slaMinutes: 240, // 4시간
    autoProcessable: false,
    defaultLevel: EscalationLevel.EXECUTIVE,
  },
  [RequestType.INQUIRY]: {
    priority: RequestPriority.LOW,
    slaMinutes: 2880, // 48시간
    autoProcessable: false,
    defaultLevel: EscalationLevel.COACH,
  },
  [RequestType.FEEDBACK]: {
    priority: RequestPriority.LOW,
    slaMinutes: 2880, // 48시간
    autoProcessable: false,
    defaultLevel: EscalationLevel.ADMIN,
  },
};

export interface CreateRequestInput {
  studentId: string;
  parentName: string;
  parentPhone: string;
  requestType: RequestType;
  title?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface RequestResult {
  success: boolean;
  requestId?: string;
  status?: RequestStatus;
  message?: string;
  autoProcessed?: boolean;
  autoResult?: Record<string, unknown>;
  slaDeadline?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Service Class
// ═══════════════════════════════════════════════════════════════════════════════

class ParentRequestService {

  /**
   * 요청 생성 및 자동 라우팅
   */
  async createRequest(input: CreateRequestInput): Promise<RequestResult> {
    const config = SLA_CONFIG[input.requestType];
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + config.slaMinutes * 60 * 1000);

    try {
      // ─────────────────────────────────────────────────────────────────────
      // Step 1: 요청 저장
      // ─────────────────────────────────────────────────────────────────────
      const { data: request, error } = await supabase
        .from('atb_parent_requests')
        .insert({
          student_id: input.studentId,
          parent_name: input.parentName,
          parent_phone: input.parentPhone,
          request_type: input.requestType,
          title: input.title || this.getDefaultTitle(input.requestType),
          description: input.description,
          priority: config.priority,
          status: RequestStatus.PENDING,
          sla_deadline: slaDeadline.toISOString(),
          escalation_level: config.defaultLevel,
          metadata: input.metadata,
          created_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // ─────────────────────────────────────────────────────────────────────
      // Step 2: 자동 처리 가능 여부 확인
      // ─────────────────────────────────────────────────────────────────────
      if (config.autoProcessable) {
        const autoResult = await this.autoProcess(request);

        if (autoResult.success) {
          return {
            success: true,
            requestId: request.id,
            status: RequestStatus.COMPLETED,
            message: autoResult.message,
            autoProcessed: true,
            autoResult: autoResult.data,
            slaDeadline,
          };
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 3: 담당자 자동 배정
      // ─────────────────────────────────────────────────────────────────────
      const assignee = await this.autoAssign(request, config.defaultLevel);

      if (assignee) {
        await supabase
          .from('atb_parent_requests')
          .update({
            status: RequestStatus.ASSIGNED,
            assigned_to: assignee.id,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        // 담당자에게 알림 발송
        await this.notifyAssignee(assignee, request);
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 4: 요청자에게 접수 확인 알림
      // ─────────────────────────────────────────────────────────────────────
      await this.notifyRequester(input, request.id, slaDeadline);

      // ─────────────────────────────────────────────────────────────────────
      // Step 5: SLA 모니터링 스케줄 등록
      // ─────────────────────────────────────────────────────────────────────
      await this.scheduleSLAMonitoring(request.id, slaDeadline);

      return {
        success: true,
        requestId: request.id,
        status: RequestStatus.ASSIGNED,
        message: '요청이 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.',
        autoProcessed: false,
        slaDeadline,
      };

    } catch (error: unknown) {
      if (__DEV__) console.error('[ParentRequestService] Error:', error);
      return {
        success: false,
        message: '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      };
    }
  }

  /**
   * 자동 처리 (Level 1)
   */
  private async autoProcess(request: Record<string, unknown>): Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }> {
    switch (request.request_type) {
      case RequestType.ABSENCE:
        return this.processAbsenceRequest(request);

      case RequestType.MAKEUP:
        return this.processMakeupRequest(request);

      default:
        return { success: false };
    }
  }

  /**
   * 결석 신고 자동 처리
   */
  private async processAbsenceRequest(request: Record<string, unknown>): Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }> {
    try {
      // 1. 결석 처리
      const metadata = (request.metadata as Record<string, unknown>) || {};
      const sessionId = metadata.session_id as string | undefined;
      const reason = (metadata.reason as string) || 'other';

      if (sessionId) {
        await supabase
          .from('atb_session_students')
          .update({
            attendance_status: 'excused',
            absence_reason: reason,
            absence_reported_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)
          .eq('student_id', request.student_id);
      }

      // 2. 보강권 자동 발급
      const { data: makeupCredit } = await supabase
        .from('atb_makeup_credits')
        .insert({
          student_id: request.student_id,
          reason: 'absence_report',
          original_session_id: sessionId,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일
          status: 'available',
        })
        .select()
        .single();

      // 3. 요청 완료 처리
      await supabase
        .from('atb_parent_requests')
        .update({
          status: RequestStatus.COMPLETED,
          resolution_notes: '결석 처리 완료, 보강권 1회 발급',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      return {
        success: true,
        message: '결석 신고가 완료되었습니다. 보강권 1회가 발급되었습니다.',
        data: { makeupCreditId: makeupCredit?.id },
      };

    } catch (error: unknown) {
      if (__DEV__) console.error('[processAbsenceRequest] Error:', error);
      return { success: false };
    }
  }

  /**
   * 보강 신청 자동 처리
   */
  private async processMakeupRequest(request: Record<string, unknown>): Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }> {
    try {
      const metadata = (request.metadata as Record<string, unknown>) || {};
      const targetSessionId = metadata.target_session_id as string | undefined;
      const makeupCreditId = metadata.makeup_credit_id as string | undefined;

      // 1. 보강권 유효성 확인
      const { data: credit } = await supabase
        .from('atb_makeup_credits')
        .select('*')
        .eq('id', makeupCreditId)
        .eq('student_id', request.student_id)
        .eq('status', 'available')
        .single();

      if (!credit) {
        return {
          success: false,
          message: '사용 가능한 보강권이 없습니다.',
        };
      }

      // 2. 대상 수업 정원 확인
      const { data: session } = await supabase
        .from('atb_sessions')
        .select('*, atb_session_students(count)')
        .eq('id', targetSessionId)
        .single();

      if (!session) {
        return { success: false, message: '선택한 수업을 찾을 수 없습니다.' };
      }

      const currentCount = session.atb_session_students?.[0]?.count || 0;
      if (currentCount >= session.max_students) {
        return { success: false, message: '선택한 수업이 정원 초과입니다.' };
      }

      // 3. 보강 예약 생성
      await supabase
        .from('atb_session_students')
        .insert({
          session_id: targetSessionId,
          student_id: request.student_id,
          attendance_status: 'pending',
          is_makeup: true,
          makeup_credit_id: makeupCreditId,
        });

      // 4. 보강권 사용 처리
      await supabase
        .from('atb_makeup_credits')
        .update({
          status: 'used',
          used_session_id: targetSessionId,
          used_at: new Date().toISOString(),
        })
        .eq('id', makeupCreditId);

      // 5. 요청 완료 처리
      await supabase
        .from('atb_parent_requests')
        .update({
          status: RequestStatus.COMPLETED,
          resolution_notes: '보강 예약 완료',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      return {
        success: true,
        message: '보강 예약이 완료되었습니다.',
        data: { sessionId: targetSessionId },
      };

    } catch (error: unknown) {
      if (__DEV__) console.error('[processMakeupRequest] Error:', error);
      return { success: false };
    }
  }

  /**
   * 담당자 자동 배정
   */
  private async autoAssign(request: Record<string, unknown>, level: EscalationLevel): Promise<any | null> {
    let query = supabase.from('atb_coaches').select('*').eq('is_active', true);

    switch (level) {
      case EscalationLevel.COACH:
        // 학생의 담당 코치 또는 업무량 적은 코치
        query = query.eq('role', 'coach').order('current_workload', { ascending: true });
        break;

      case EscalationLevel.ADMIN:
        query = query.eq('role', 'admin');
        break;

      case EscalationLevel.EXECUTIVE:
        query = query.eq('role', 'executive');
        break;

      default:
        return null; // SYSTEM level은 담당자 배정 불필요
    }

    const { data } = await query.limit(1).single();
    return data;
  }

  /**
   * 담당자 알림
   */
  private async notifyAssignee(assignee: Record<string, unknown>, request: Record<string, unknown>): Promise<void> {
    await supabase.from('atb_notifications').insert({
      recipient_type: 'coach',
      recipient_id: assignee.id,
      channel: 'push',
      notification_type: 'request_assigned',
      title: '새 요청 배정',
      message: `[${this.getRequestTypeLabel(request.request_type as RequestType)}] ${request.title}`,
      status: 'pending',
    });
  }

  /**
   * 요청자 알림
   */
  private async notifyRequester(
    input: CreateRequestInput,
    requestId: string,
    slaDeadline: Date
  ): Promise<void> {
    const slaText = this.formatSLA(slaDeadline);

    await supabase.from('atb_notifications').insert({
      recipient_type: 'parent',
      recipient_phone: input.parentPhone,
      channel: 'kakao',
      notification_type: 'request_received',
      title: '요청 접수 완료',
      message: `[온리쌤] 요청이 접수되었습니다.

📋 요청: ${this.getRequestTypeLabel(input.requestType)}
⏰ 예상 처리: ${slaText}

빠른 시일 내에 답변 드리겠습니다.`,
      status: 'pending',
    });
  }

  /**
   * SLA 모니터링 스케줄 등록
   */
  private async scheduleSLAMonitoring(requestId: string, slaDeadline: Date): Promise<void> {
    // 50%, 80%, 100% 시점에 체크 스케줄 등록
    const checkpoints = [0.5, 0.8, 1.0];
    const now = Date.now();
    const deadline = slaDeadline.getTime();
    const duration = deadline - now;

    for (const checkpoint of checkpoints) {
      const checkTime = new Date(now + duration * checkpoint);

      await supabase.from('atb_scheduled_jobs').insert({
        job_type: 'sla_check',
        entity_type: 'parent_request',
        entity_id: requestId,
        scheduled_at: checkTime.toISOString(),
        payload: { checkpoint, requestId },
        status: 'pending',
      });
    }
  }

  /**
   * SLA 체크 및 에스컬레이션
   */
  async checkSLAAndEscalate(requestId: string): Promise<void> {
    const { data: request } = await supabase
      .from('atb_parent_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request || request.status === RequestStatus.COMPLETED) {
      return;
    }

    const now = new Date();
    const slaDeadline = new Date(request.sla_deadline);
    const elapsed = (now.getTime() - new Date(request.created_at).getTime());
    const total = (slaDeadline.getTime() - new Date(request.created_at).getTime());
    const progress = elapsed / total;

    // 80% 경과: 경고 알림
    if (progress >= 0.8 && progress < 1.0) {
      await this.sendSLAWarning(request);
    }

    // 100% 경과: 에스컬레이션
    if (progress >= 1.0 && request.escalation_level < EscalationLevel.EXECUTIVE) {
      await this.escalate(request);
    }
  }

  /**
   * 에스컬레이션
   */
  private async escalate(request: Record<string, unknown>): Promise<void> {
    const nextLevel = (request.escalation_level as number) + 1;

    // 다음 레벨 담당자 배정
    const newAssignee = await this.autoAssign(request, nextLevel);

    await supabase
      .from('atb_parent_requests')
      .update({
        status: RequestStatus.ESCALATED,
        escalation_level: nextLevel,
        assigned_to: newAssignee?.id,
        escalated_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // 에스컬레이션 알림
    if (newAssignee) {
      await supabase.from('atb_notifications').insert({
        recipient_type: 'coach',
        recipient_id: newAssignee.id,
        channel: 'push',
        notification_type: 'request_escalated',
        title: '🚨 긴급 에스컬레이션',
        message: `SLA 초과 요청이 에스컬레이션되었습니다: ${request.title}`,
        status: 'pending',
      });
    }

    // 로그 저장
    await supabase.from('atb_audit_logs').insert({
      action: 'REQUEST_ESCALATED',
      entity_type: 'parent_request',
      entity_id: request.id,
      details: {
        from_level: request.escalation_level,
        to_level: nextLevel,
        reason: 'SLA exceeded',
      },
    });
  }

  /**
   * SLA 경고 알림
   */
  private async sendSLAWarning(request: Record<string, unknown>): Promise<void> {
    if (request.assigned_to) {
      await supabase.from('atb_notifications').insert({
        recipient_type: 'coach',
        recipient_id: request.assigned_to,
        channel: 'push',
        notification_type: 'sla_warning',
        title: '⚠️ SLA 경고',
        message: `처리 기한이 20% 남았습니다: ${request.title}`,
        status: 'pending',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────

  private getDefaultTitle(type: RequestType): string {
    const titles: Record<RequestType, string> = {
      [RequestType.ABSENCE]: '결석 신고',
      [RequestType.MAKEUP]: '보강 신청',
      [RequestType.SCHEDULE_CHANGE]: '스케줄 변경 요청',
      [RequestType.REFUND]: '환불 요청',
      [RequestType.COMPLAINT]: '건의사항',
      [RequestType.INQUIRY]: '문의',
      [RequestType.FEEDBACK]: '피드백',
    };
    return titles[type] || '기타 요청';
  }

  private getRequestTypeLabel(type: RequestType): string {
    return this.getDefaultTitle(type);
  }

  private formatSLA(deadline: Date): string {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return '즉시';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}일 이내`;
    }

    if (hours > 0) {
      return `${hours}시간 이내`;
    }

    return `${minutes}분 이내`;
  }
}

// Singleton export
export const parentRequestService = new ParentRequestService();
