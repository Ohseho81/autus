/**
 * 알림톡 템플릿 타입 정의
 */

// 템플릿 ID 타입
export type AlimtalkTemplateId =
  // 출석 관련
  | 'ATTENDANCE_CONFIRM' // 출석 확인
  | 'ABSENCE_NOTICE' // 결석 알림
  | 'LATE_NOTICE' // 지각 알림
  // 결제 관련
  | 'PAYMENT_REQUEST' // 결제 요청
  | 'PAYMENT_COMPLETE' // 결제 완료
  | 'PAYMENT_OVERDUE' // 미납 알림
  // 스케줄 관련
  | 'CLASS_REMINDER' // 수업 리마인드
  | 'SCHEDULE_CHANGE' // 스케줄 변경
  | 'CLOSURE_NOTICE' // 휴원 공지
  // 피드백 관련
  | 'CLASS_RESULT' // 수업 결과
  | 'ACHIEVEMENT' // 성취 축하
  | 'CONSULTATION_REQUEST'; // 상담 요청

// 템플릿 변수 기본 타입
export type AlimtalkVariables = Record<string, string | number>;

// 알림톡 버튼 타입
export interface AlimtalkButton {
  type: 'WL' | 'AL' | 'DS' | 'BK' | 'MD' | 'BC' | 'BT' | 'AC';
  name: string;
  url_mobile?: string;
  url_pc?: string;
  scheme_ios?: string;
  scheme_android?: string;
}

// 알림톡 메시지 요청
export interface AlimtalkRequest {
  to: string; // 수신번호
  templateId: AlimtalkTemplateId;
  variables: AlimtalkVariables;
  buttons?: AlimtalkButton[];
  // SMS 대체 발송용 텍스트
  fallbackText?: string;
}

// 알림톡 발송 결과
export interface AlimtalkResponse {
  success: boolean;
  messageId?: string;
  statusCode: number;
  errorMessage?: string;
  // SMS로 대체 발송되었는지
  isFallback?: boolean;
}

// 출석 확인 알림 변수
export interface AttendanceConfirmVariables {
  name: string;
  class_name: string;
  time: string;
  attendance_count: number;
}

// 결석 알림 변수
export interface AbsenceNoticeVariables {
  name: string;
  class_name: string;
  makeup_link: string;
}

// 지각 알림 변수
export interface LateNoticeVariables {
  name: string;
  class_name: string;
  time: string;
}

// 결제 요청 변수
export interface PaymentRequestVariables {
  name: string;
  month: string;
  amount: string;
  due_date: string;
  payment_link: string;
}

// 결제 완료 변수
export interface PaymentCompleteVariables {
  amount: string;
  receipt_link: string;
}

// 미납 알림 변수
export interface PaymentOverdueVariables {
  name: string;
  month: string;
  due_date: string;
  days: number;
}

// 수업 리마인드 변수
export interface ClassReminderVariables {
  class_name: string;
  time: string;
  location: string;
}

// 스케줄 변경 변수
export interface ScheduleChangeVariables {
  class_name: string;
  old_time: string;
  new_time: string;
}

// 휴원 공지 변수
export interface ClosureNoticeVariables {
  date: string;
  reason: string;
  makeup_date: string;
}

// 수업 결과 변수
export interface ClassResultVariables {
  name: string;
  class_name: string;
  feedback: string;
  video_link?: string;
}

// 성취 축하 변수
export interface AchievementVariables {
  name: string;
  achievement: string;
  date: string;
}

// 상담 요청 변수
export interface ConsultationRequestVariables {
  name: string;
  coach_name: string;
  phone: string;
}
