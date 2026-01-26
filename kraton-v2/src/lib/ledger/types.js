// Ledger Types

export const ROLES = ['owner', 'principal', 'teacher', 'admin', 'parent', 'student'];

export const REPETITION_STATUS = ['candidate', 'proposed', 'standardized', 'dismissed'];

// action_type 표준 키
export const ACTION_TYPES = {
  // 위험 관련
  RISK_DETECTED: 'risk_detected',
  RISK_RESOLVED: 'risk_resolved',
  RISK_ESCALATED: 'risk_escalated',
  
  // 메시지/알림
  MESSAGE_SENT: 'message_sent',
  MESSAGE_SCHEDULED: 'message_scheduled',
  NOTIFICATION_SENT: 'notification_sent',
  
  // 승인/결정
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_DENIED: 'approval_denied',
  DECISION_MADE: 'decision_made',
  DECISION_DEFERRED: 'decision_deferred',
  
  // 피드백/평가
  FEEDBACK_RECEIVED: 'feedback_received',
  FEEDBACK_PROCESSED: 'feedback_processed',
  
  // 리포트/분석
  REPORT_GENERATED: 'report_generated',
  ANALYSIS_COMPLETED: 'analysis_completed',
  
  // 정책/표준
  POLICY_UPDATED: 'policy_updated',
  STANDARD_CREATED: 'standard_created',
  STANDARD_APPLIED: 'standard_applied',
  
  // 학생 관련
  STUDENT_STATE_CHANGED: 'student_state_changed',
  STUDENT_ENROLLED: 'student_enrolled',
  STUDENT_WITHDRAWN: 'student_withdrawn',
  
  // 결제 관련
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REMINDER_SENT: 'payment_reminder_sent',
};

// Action Type → 한글 라벨
export const ACTION_LABELS = {
  risk_detected: '위험 감지',
  risk_resolved: '위험 해결',
  risk_escalated: '위험 상향',
  message_sent: '메시지 발송',
  notification_sent: '알림 발송',
  approval_granted: '승인',
  approval_denied: '거절',
  decision_made: '결정',
  decision_deferred: '결정 유예',
  feedback_received: '피드백 수신',
  report_generated: '리포트 생성',
  standard_created: '표준화',
  student_state_changed: '학생 상태 변경',
  payment_received: '결제 완료',
  payment_failed: '결제 실패',
};

// Action Type → 아이콘
export const ACTION_ICONS = {
  risk_detected: '🚨',
  risk_resolved: '✅',
  risk_escalated: '⚠️',
  message_sent: '📱',
  notification_sent: '🔔',
  approval_granted: '✓',
  approval_denied: '✗',
  decision_made: '⚡',
  decision_deferred: '⏸️',
  feedback_received: '💬',
  report_generated: '📊',
  standard_created: '⭐',
  student_state_changed: '👤',
  payment_received: '💳',
  payment_failed: '❌',
  default: '📝',
};
