/**
 * 알림톡 발송 서비스 (Solapi 연동)
 *
 * 12가지 알림 템플릿 지원:
 * - 출석 관련 (3): 출석확인, 결석, 지각
 * - 결제 관련 (3): 결제요청, 결제완료, 미납
 * - 스케줄 관련 (3): 수업리마인드, 스케줄변경, 휴원공지
 * - 피드백 관련 (3): 수업결과, 성취축하, 상담요청
 */

import axios, { AxiosInstance } from 'axios';
import { solapiConfig, normalizePhoneNumber, validateSolapiConfig, isDevMode } from '../config/solapiConfig';
import { eventService } from './eventService';
import type {
  AlimtalkRequest,
  AlimtalkResponse,
  AlimtalkTemplateId,
  AttendanceConfirmVariables,
  AbsenceNoticeVariables,
  LateNoticeVariables,
  PaymentRequestVariables,
  PaymentCompleteVariables,
  PaymentOverdueVariables,
  ClassReminderVariables,
  ScheduleChangeVariables,
  ClosureNoticeVariables,
  ClassResultVariables,
  AchievementVariables,
  ConsultationRequestVariables,
} from '../types/alimtalk';

class AlimtalkService {
  private client: AxiosInstance;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = validateSolapiConfig();

    // Axios 클라이언트 설정
    this.client = axios.create({
      baseURL: solapiConfig.apiUrl,
      timeout: solapiConfig.options.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: solapiConfig.apiKey,
        password: solapiConfig.apiSecret,
      },
    });

    if (!this.isConfigured && __DEV__) {
      console.warn('[AlimtalkService] Service not configured. Set SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PFID, SENDER_PHONE in .env');
    }
  }

  /**
   * 알림톡 발송 (핵심 메서드)
   */
  private async send(request: AlimtalkRequest): Promise<AlimtalkResponse> {
    // 설정 확인
    if (!this.isConfigured) {
      if (__DEV__) console.warn('[AlimtalkService] Configuration missing');
      return {
        success: false,
        statusCode: 500,
        errorMessage: 'Solapi configuration missing',
      };
    }

    // 개발 모드에서는 로그만 출력
    if (isDevMode()) {
      if (__DEV__) console.log('[AlimtalkService] DEV MODE - Message not sent:', {
        to: request.to,
        templateId: request.templateId,
        variables: request.variables,
      });
      return {
        success: true,
        messageId: 'dev-mode-' + Date.now(),
        statusCode: 200,
      };
    }

    try {
      // 전화번호 정규화
      const normalizedPhone = normalizePhoneNumber(request.to);

      // Solapi 메시지 생성
      const message = {
        to: normalizedPhone,
        from: normalizePhoneNumber(solapiConfig.senderPhone),
        kakaoOptions: {
          pfId: solapiConfig.kakaoPfId,
          templateId: request.templateId,
          variables: request.variables,
          buttons: request.buttons || [],
        },
        // SMS 대체 발송
        text: request.fallbackText || this.generateFallbackText(request),
      };

      // API 호출
      const response = await this.client.post('/messages/v4/send', {
        messages: [message],
      });

      const result = response.data;

      // 성공
      if (result.statusCode === '2000') {
        return {
          success: true,
          messageId: result.messageId,
          statusCode: 200,
        };
      }

      // 실패
      return {
        success: false,
        statusCode: parseInt(result.statusCode) || 500,
        errorMessage: result.errorMessage || 'Unknown error',
      };
    } catch (error: unknown) {
      if (__DEV__) console.warn('[AlimtalkService] Send error:', error);
      const err = error instanceof Error ? error : new Error(String(error));

      return {
        success: false,
        statusCode: (error as Record<string, { status?: number }>)?.response?.status || 500,
        errorMessage: err.message || 'Network error',
      };
    }
  }

  /**
   * SMS 대체 발송 텍스트 생성
   */
  private generateFallbackText(request: AlimtalkRequest): string {
    const vars = request.variables;

    switch (request.templateId) {
      case 'ATTENDANCE_CONFIRM':
        return `${vars.name}님, 오늘 ${vars.class_name} 출석 완료!`;

      case 'ABSENCE_NOTICE':
        return `${vars.name}님, 오늘 ${vars.class_name}에 결석하셨습니다.`;

      case 'LATE_NOTICE':
        return `${vars.name}님, 오늘 ${vars.class_name}에 지각하셨습니다.`;

      case 'PAYMENT_REQUEST':
        return `${vars.name} 학부모님, ${vars.month}월 수강료 ${vars.amount}원 결제 요청드립니다.`;

      case 'PAYMENT_COMPLETE':
        return `${vars.amount}원 결제가 완료되었습니다. 감사합니다!`;

      case 'PAYMENT_OVERDUE':
        return `${vars.name} 학부모님, ${vars.month}월 수강료가 미납입니다. 납부 기한: ${vars.due_date}`;

      case 'CLASS_REMINDER':
        return `내일 ${vars.class_name} 수업이 있습니다! 시간: ${vars.time}`;

      case 'SCHEDULE_CHANGE':
        return `${vars.class_name} 수업 시간이 ${vars.old_time}에서 ${vars.new_time}으로 변경되었습니다.`;

      case 'CLOSURE_NOTICE':
        return `${vars.date}은 ${vars.reason}으로 휴원합니다.`;

      case 'CLASS_RESULT':
        return `${vars.name}님, 오늘 ${vars.class_name} 수업 결과입니다.`;

      case 'ACHIEVEMENT':
        return `축하합니다! ${vars.name}님이 ${vars.achievement}를 달성했습니다!`;

      case 'CONSULTATION_REQUEST':
        return `${vars.name} 학부모님, ${vars.coach_name} 코치가 상담을 요청했습니다.`;

      default:
        return '알림톡 메시지';
    }
  }

  /**
   * Event Ledger 기록
   */
  private async logNotificationEvent(
    studentId: string,
    templateId: AlimtalkTemplateId,
    result: AlimtalkResponse
  ): Promise<void> {
    try {
      await eventService.logEvent({
        entity_id: studentId,
        event_type: 'notification_sent',
        metadata: {
          type: 'alimtalk',
          template: templateId,
          success: result.success,
          message_id: result.messageId,
          is_fallback: result.isFallback || false,
        },
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[AlimtalkService] Failed to log event:', error);
    }
  }

  // =========================================
  // 출석 관련 알림 (3종)
  // =========================================

  /**
   * 출석 확인 알림
   */
  async sendAttendanceConfirm(
    studentId: string,
    phone: string,
    variables: AttendanceConfirmVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'ATTENDANCE_CONFIRM',
      variables,
    });

    await this.logNotificationEvent(studentId, 'ATTENDANCE_CONFIRM', result);
    return result;
  }

  /**
   * 결석 알림
   */
  async sendAbsenceNotice(
    studentId: string,
    phone: string,
    variables: AbsenceNoticeVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'ABSENCE_NOTICE',
      variables,
      buttons: [
        {
          type: 'WL',
          name: '보강 수업 신청',
          url_mobile: variables.makeup_link,
          url_pc: variables.makeup_link,
        },
      ],
    });

    await this.logNotificationEvent(studentId, 'ABSENCE_NOTICE', result);
    return result;
  }

  /**
   * 지각 알림
   */
  async sendLateNotice(
    studentId: string,
    phone: string,
    variables: LateNoticeVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'LATE_NOTICE',
      variables,
    });

    await this.logNotificationEvent(studentId, 'LATE_NOTICE', result);
    return result;
  }

  // =========================================
  // 결제 관련 알림 (3종)
  // =========================================

  /**
   * 결제 요청 알림
   */
  async sendPaymentRequest(
    studentId: string,
    phone: string,
    variables: PaymentRequestVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'PAYMENT_REQUEST',
      variables,
      buttons: [
        {
          type: 'WL',
          name: '결제하기',
          url_mobile: variables.payment_link,
          url_pc: variables.payment_link,
        },
      ],
    });

    await this.logNotificationEvent(studentId, 'PAYMENT_REQUEST', result);
    return result;
  }

  /**
   * 결제 완료 알림
   */
  async sendPaymentComplete(
    studentId: string,
    phone: string,
    variables: PaymentCompleteVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'PAYMENT_COMPLETE',
      variables,
      buttons: [
        {
          type: 'WL',
          name: '영수증 보기',
          url_mobile: variables.receipt_link,
          url_pc: variables.receipt_link,
        },
      ],
    });

    await this.logNotificationEvent(studentId, 'PAYMENT_COMPLETE', result);
    return result;
  }

  /**
   * 미납 알림
   */
  async sendPaymentOverdue(
    studentId: string,
    phone: string,
    variables: PaymentOverdueVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'PAYMENT_OVERDUE',
      variables,
    });

    await this.logNotificationEvent(studentId, 'PAYMENT_OVERDUE', result);
    return result;
  }

  // =========================================
  // 스케줄 관련 알림 (3종)
  // =========================================

  /**
   * 수업 리마인드 알림
   */
  async sendClassReminder(
    studentId: string,
    phone: string,
    variables: ClassReminderVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'CLASS_REMINDER',
      variables,
    });

    await this.logNotificationEvent(studentId, 'CLASS_REMINDER', result);
    return result;
  }

  /**
   * 스케줄 변경 알림
   */
  async sendScheduleChange(
    studentId: string,
    phone: string,
    variables: ScheduleChangeVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'SCHEDULE_CHANGE',
      variables,
    });

    await this.logNotificationEvent(studentId, 'SCHEDULE_CHANGE', result);
    return result;
  }

  /**
   * 휴원 공지 알림
   */
  async sendClosureNotice(
    studentId: string,
    phone: string,
    variables: ClosureNoticeVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'CLOSURE_NOTICE',
      variables,
    });

    await this.logNotificationEvent(studentId, 'CLOSURE_NOTICE', result);
    return result;
  }

  // =========================================
  // 피드백 관련 알림 (3종)
  // =========================================

  /**
   * 수업 결과 알림
   */
  async sendClassResult(
    studentId: string,
    phone: string,
    variables: ClassResultVariables
  ): Promise<AlimtalkResponse> {
    const buttons = variables.video_link
      ? [
          {
            type: 'WL' as const,
            name: '영상 보기',
            url_mobile: variables.video_link,
            url_pc: variables.video_link,
          },
        ]
      : [];

    const result = await this.send({
      to: phone,
      templateId: 'CLASS_RESULT',
      variables,
      buttons,
    });

    await this.logNotificationEvent(studentId, 'CLASS_RESULT', result);
    return result;
  }

  /**
   * 성취 축하 알림
   */
  async sendAchievement(
    studentId: string,
    phone: string,
    variables: AchievementVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'ACHIEVEMENT',
      variables,
    });

    await this.logNotificationEvent(studentId, 'ACHIEVEMENT', result);
    return result;
  }

  /**
   * 상담 요청 알림
   */
  async sendConsultationRequest(
    studentId: string,
    phone: string,
    variables: ConsultationRequestVariables
  ): Promise<AlimtalkResponse> {
    const result = await this.send({
      to: phone,
      templateId: 'CONSULTATION_REQUEST',
      variables,
    });

    await this.logNotificationEvent(studentId, 'CONSULTATION_REQUEST', result);
    return result;
  }
}

// 싱글톤 인스턴스 생성
export const alimtalkService = new AlimtalkService();

export default alimtalkService;
