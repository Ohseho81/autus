/**
 * 🔍 MoltBot Brain - Intervention Detector
 *
 * PHASE 1 핵심: 매니저가 "손댄 순간"을 100% 감지
 * 이 데이터가 MoltBot 학습의 원천
 */

// ============================================
// 감지 대상 액션
// ============================================
export const MANUAL_ACTIONS = {
  // 학생 관련
  STUDENT_UPDATE: 'student.update',
  STUDENT_STATUS_CHANGE: 'student.status_change',
  STUDENT_CLASS_CHANGE: 'student.class_change',

  // 수업 관련
  CLASS_SCHEDULE_CHANGE: 'class.schedule_change',
  CLASS_COACH_CHANGE: 'class.coach_change',

  // 결제 관련
  PAYMENT_MANUAL_INPUT: 'payment.manual_input',
  PAYMENT_REFUND_REQUEST: 'payment.refund_request',
  PAYMENT_EXTENSION: 'payment.extension',

  // 출석 관련
  ATTENDANCE_MANUAL_OVERRIDE: 'attendance.manual_override',
  ATTENDANCE_EXCUSE: 'attendance.excuse',

  // 커뮤니케이션
  MESSAGE_MANUAL_SEND: 'message.manual_send',
  CALL_OUTBOUND: 'call.outbound',

  // 기타
  EXCEPTION_GRANT: 'exception.grant',
  RULE_OVERRIDE: 'rule.override',
};

// ============================================
// 액션별 위험도 (학습 가중치)
// ============================================
export const ACTION_RISK_LEVEL = {
  [MANUAL_ACTIONS.STUDENT_UPDATE]: 'low',
  [MANUAL_ACTIONS.STUDENT_STATUS_CHANGE]: 'high',
  [MANUAL_ACTIONS.STUDENT_CLASS_CHANGE]: 'high',
  [MANUAL_ACTIONS.CLASS_SCHEDULE_CHANGE]: 'medium',
  [MANUAL_ACTIONS.CLASS_COACH_CHANGE]: 'high',
  [MANUAL_ACTIONS.PAYMENT_MANUAL_INPUT]: 'high',
  [MANUAL_ACTIONS.PAYMENT_REFUND_REQUEST]: 'critical',
  [MANUAL_ACTIONS.PAYMENT_EXTENSION]: 'medium',
  [MANUAL_ACTIONS.ATTENDANCE_MANUAL_OVERRIDE]: 'high',
  [MANUAL_ACTIONS.ATTENDANCE_EXCUSE]: 'low',
  [MANUAL_ACTIONS.MESSAGE_MANUAL_SEND]: 'low',
  [MANUAL_ACTIONS.CALL_OUTBOUND]: 'medium',
  [MANUAL_ACTIONS.EXCEPTION_GRANT]: 'high',
  [MANUAL_ACTIONS.RULE_OVERRIDE]: 'critical',
};

// ============================================
// Intervention Detector
// ============================================
export class InterventionDetector {
  constructor(interventionLogger) {
    this.logger = interventionLogger;
    this.sessionInterventions = [];
    this.dailyStats = {
      date: new Date().toISOString().split('T')[0],
      total: 0,
      byAction: {},
      byActor: {},
    };
  }

  /**
   * 수동 액션 감지 및 기록
   */
  detect(action, actor, target, context = {}) {
    const intervention = {
      id: this.generateId(),
      action,
      actor,                    // 누가 (매니저 ID/이름)
      target,                   // 대상 (student_id, class_id 등)
      risk_level: ACTION_RISK_LEVEL[action] || 'medium',
      context,                  // 추가 컨텍스트
      detected_at: new Date().toISOString(),
      session_id: this.getSessionId(),
    };

    console.log(`[INTERVENTION DETECTED] ${action} by ${actor}`);

    // 로거에 기록
    if (this.logger) {
      this.logger.log(
        actor,
        action,
        `student:${target.student_id || target.id || 'unknown'}`,
        {
          ...context,
          risk_level: intervention.risk_level,
          detected_by: 'intervention_detector',
        }
      );
    }

    // 세션 기록
    this.sessionInterventions.push(intervention);

    // 일일 통계 업데이트
    this.updateDailyStats(intervention);

    return intervention;
  }

  // ============================================
  // 특수 감지 메서드
  // ============================================

  /**
   * 학생 상태 변경 감지
   */
  detectStatusChange(actor, studentId, fromStatus, toStatus, reason = '') {
    return this.detect(
      MANUAL_ACTIONS.STUDENT_STATUS_CHANGE,
      actor,
      { student_id: studentId },
      {
        from_status: fromStatus,
        to_status: toStatus,
        reason,
      }
    );
  }

  /**
   * 반 변경 감지
   */
  detectClassChange(actor, studentId, fromClassId, toClassId, reason = '') {
    return this.detect(
      MANUAL_ACTIONS.STUDENT_CLASS_CHANGE,
      actor,
      { student_id: studentId },
      {
        from_class_id: fromClassId,
        to_class_id: toClassId,
        reason,
      }
    );
  }

  /**
   * 수동 메시지 발송 감지
   */
  detectManualMessage(actor, studentId, messageType, channel) {
    return this.detect(
      MANUAL_ACTIONS.MESSAGE_MANUAL_SEND,
      actor,
      { student_id: studentId },
      {
        message_type: messageType,
        channel,
      }
    );
  }

  /**
   * 수동 출석 수정 감지
   */
  detectAttendanceOverride(actor, studentId, date, fromStatus, toStatus) {
    return this.detect(
      MANUAL_ACTIONS.ATTENDANCE_MANUAL_OVERRIDE,
      actor,
      { student_id: studentId },
      {
        date,
        from_status: fromStatus,
        to_status: toStatus,
      }
    );
  }

  /**
   * 수동 결제 처리 감지
   */
  detectManualPayment(actor, studentId, amount, month, reason = '') {
    return this.detect(
      MANUAL_ACTIONS.PAYMENT_MANUAL_INPUT,
      actor,
      { student_id: studentId },
      {
        amount,
        month,
        reason,
      }
    );
  }

  /**
   * 전화 발신 감지
   */
  detectOutboundCall(actor, studentId, duration, outcome) {
    return this.detect(
      MANUAL_ACTIONS.CALL_OUTBOUND,
      actor,
      { student_id: studentId },
      {
        duration,
        outcome, // 'answered', 'no_answer', 'busy', 'voicemail'
      }
    );
  }

  // ============================================
  // 통계 및 분석
  // ============================================

  updateDailyStats(intervention) {
    const today = new Date().toISOString().split('T')[0];

    // 날짜 변경 시 리셋
    if (this.dailyStats.date !== today) {
      this.dailyStats = {
        date: today,
        total: 0,
        byAction: {},
        byActor: {},
      };
    }

    this.dailyStats.total++;

    // 액션별 집계
    const action = intervention.action;
    this.dailyStats.byAction[action] = (this.dailyStats.byAction[action] || 0) + 1;

    // 액터별 집계
    const actor = intervention.actor;
    this.dailyStats.byActor[actor] = (this.dailyStats.byActor[actor] || 0) + 1;
  }

  /**
   * 일일 리포트 생성
   */
  getDailyReport() {
    const topActions = Object.entries(this.dailyStats.byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topActors = Object.entries(this.dailyStats.byActor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 위험 개입 수
    const highRiskCount = this.sessionInterventions.filter(
      i => i.risk_level === 'high' || i.risk_level === 'critical'
    ).length;

    return {
      date: this.dailyStats.date,
      total_interventions: this.dailyStats.total,
      high_risk_count: highRiskCount,
      top_actions: topActions.map(([action, count]) => ({
        action,
        count,
        percentage: Math.round((count / this.dailyStats.total) * 100),
      })),
      top_actors: topActors.map(([actor, count]) => ({
        actor,
        count,
      })),
      recommendation: this.getRecommendation(),
    };
  }

  /**
   * 자동화 추천 (Shadow 후보)
   */
  getRecommendation() {
    const recommendations = [];

    // 반복 패턴 감지
    const actionCounts = this.dailyStats.byAction;

    // 메시지 발송이 많으면 → 자동화 후보
    if ((actionCounts[MANUAL_ACTIONS.MESSAGE_MANUAL_SEND] || 0) >= 5) {
      recommendations.push({
        action: MANUAL_ACTIONS.MESSAGE_MANUAL_SEND,
        suggestion: '자동 메시지 발송 규칙 생성 검토',
        shadow_candidate: true,
      });
    }

    // 상태 변경이 많으면 → 패턴 분석 필요
    if ((actionCounts[MANUAL_ACTIONS.STUDENT_STATUS_CHANGE] || 0) >= 3) {
      recommendations.push({
        action: MANUAL_ACTIONS.STUDENT_STATUS_CHANGE,
        suggestion: '상태 변경 패턴 분석 필요',
        shadow_candidate: false,
      });
    }

    // 출석 수정이 있으면 → QR 프로세스 점검
    if ((actionCounts[MANUAL_ACTIONS.ATTENDANCE_MANUAL_OVERRIDE] || 0) >= 1) {
      recommendations.push({
        action: MANUAL_ACTIONS.ATTENDANCE_MANUAL_OVERRIDE,
        suggestion: 'QR 출석 프로세스 점검 필요',
        shadow_candidate: false,
        alert: true,
      });
    }

    return recommendations;
  }

  /**
   * Telegram 리포트 포맷
   */
  getTelegramReport() {
    const report = this.getDailyReport();

    let message = `
📊 *일일 개입 리포트*
${report.date}

*총 개입:* ${report.total_interventions}건
*고위험:* ${report.high_risk_count}건

*Top 액션:*
${report.top_actions.map(a =>
  `• ${this.translateAction(a.action)}: ${a.count}건 (${a.percentage}%)`
).join('\n') || '없음'}

*Top 담당자:*
${report.top_actors.map(a =>
  `• ${a.actor}: ${a.count}건`
).join('\n') || '없음'}
`;

    if (report.recommendation.length > 0) {
      message += `
*💡 권고사항:*
${report.recommendation.map(r =>
  `• ${r.suggestion}${r.alert ? ' ⚠️' : ''}`
).join('\n')}
`;
    }

    return message;
  }

  translateAction(action) {
    const translations = {
      [MANUAL_ACTIONS.STUDENT_UPDATE]: '학생 정보 수정',
      [MANUAL_ACTIONS.STUDENT_STATUS_CHANGE]: '학생 상태 변경',
      [MANUAL_ACTIONS.STUDENT_CLASS_CHANGE]: '반 변경',
      [MANUAL_ACTIONS.CLASS_SCHEDULE_CHANGE]: '수업 시간 변경',
      [MANUAL_ACTIONS.CLASS_COACH_CHANGE]: '강사 변경',
      [MANUAL_ACTIONS.PAYMENT_MANUAL_INPUT]: '수동 결제 처리',
      [MANUAL_ACTIONS.PAYMENT_REFUND_REQUEST]: '환불 요청',
      [MANUAL_ACTIONS.PAYMENT_EXTENSION]: '결제 연장',
      [MANUAL_ACTIONS.ATTENDANCE_MANUAL_OVERRIDE]: '출석 수정',
      [MANUAL_ACTIONS.ATTENDANCE_EXCUSE]: '결석 사유 처리',
      [MANUAL_ACTIONS.MESSAGE_MANUAL_SEND]: '수동 메시지 발송',
      [MANUAL_ACTIONS.CALL_OUTBOUND]: '전화 발신',
      [MANUAL_ACTIONS.EXCEPTION_GRANT]: '예외 승인',
      [MANUAL_ACTIONS.RULE_OVERRIDE]: '규칙 무시',
    };
    return translations[action] || action;
  }

  // ============================================
  // 유틸
  // ============================================

  generateId() {
    return `INT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    if (!this._sessionId) {
      this._sessionId = `SESSION_${Date.now()}`;
    }
    return this._sessionId;
  }

  getSessionInterventions() {
    return this.sessionInterventions;
  }

  clearSession() {
    this.sessionInterventions = [];
    this._sessionId = null;
  }
}

// 싱글톤 인스턴스는 index.js에서 생성
export default InterventionDetector;
