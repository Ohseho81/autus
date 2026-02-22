/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📦 Lesson Types - AUTUS 일체화 시스템 타입 정의
 * Flow 1: 수납 → 시간표 → 등록 → 출석부 생성
 * Flow 2: 출석 → 영상피드백 → 소통 → 레슨비 차감
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// 레슨 패키지 (수납 단위)
// ============================================================================
export interface LessonPackage {
  id: string;
  studentId: string;
  name: string;                    // "10회 레슨권", "월정액 4주"
  type: 'count' | 'period';        // 횟수제 or 기간제

  // 횟수제
  totalCount?: number;             // 총 횟수
  usedCount?: number;              // 사용 횟수
  remainingCount?: number;         // 잔여 횟수

  // 기간제
  startDate?: string;              // 시작일
  endDate?: string;                // 종료일

  // 금액
  price: number;                   // 총 금액
  paidAmount: number;              // 납부 금액
  unpaidAmount: number;            // 미납 금액
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overdue';

  // 일정
  schedule: LessonSchedule[];      // 연결된 시간표

  // 메타
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'expired' | 'paused';
}

// ============================================================================
// 레슨 시간표
// ============================================================================
export interface LessonSchedule {
  id: string;
  packageId: string;
  studentId: string;

  // 반복 설정
  dayOfWeek: number[];             // 0-6 (일-토)
  startTime: string;               // "14:00"
  endTime: string;                 // "15:00"

  // 장소/코치
  location?: string;
  coachId?: string;
  coachName?: string;

  // 상태
  isActive: boolean;
}

// ============================================================================
// 출석 기록
// ============================================================================
export interface AttendanceRecord {
  id: string;
  studentId: string;
  packageId: string;
  scheduleId?: string;
  lessonSessionId?: string;

  date: string;                    // "2024-01-15"
  scheduledTime: string;           // 예정 시간
  actualTime?: string;             // 실제 출석 시간

  status: 'present' | 'late' | 'absent' | 'excused' | 'cancelled';
  lateMinutes?: number;            // 지각 시 분

  // 체크인 방식
  checkInMethod: 'qr' | 'nfc' | 'manual' | 'auto';

  // 레슨비 차감
  deducted: boolean;               // 차감 여부
  deductedAt?: string;

  // V-Index 영향
  vIndexImpact?: number;           // -10 ~ +5

  // 메타
  note?: string;
  createdAt: string;
}

// ============================================================================
// 레슨 세션 (출석 후 생성되는 단위)
// ============================================================================
export interface LessonSession {
  id: string;
  attendanceId: string;
  studentId: string;
  packageId: string;
  coachId?: string;

  date: string;
  startTime: string;
  endTime: string;
  duration: number;                // 분

  // 피드백
  feedback?: LessonFeedback;

  // 노트/소통
  coachNote?: string;
  parentVisible: boolean;          // 학부모 공개 여부

  // 상태
  status: 'in_progress' | 'completed' | 'cancelled';
}

// ============================================================================
// 영상 피드백
// ============================================================================
export interface LessonFeedback {
  id: string;
  sessionId: string;
  studentId: string;
  coachId: string;

  // 영상
  videos: VideoClip[];

  // 평가
  rating?: number;                 // 1-5
  skills?: SkillRating[];

  // 코멘트
  coachComment?: string;
  aiAnalysis?: string;             // AI 분석 결과

  // 공유
  sharedWithParent: boolean;
  parentViewedAt?: string;

  createdAt: string;
}

export interface VideoClip {
  id: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;                // 초
  title?: string;
  timestamp?: number;              // 레슨 중 시점
}

export interface SkillRating {
  skill: string;                   // "드리블", "슛", "패스"
  rating: number;                  // 1-5
  previousRating?: number;         // 이전 평가
  trend: 'up' | 'down' | 'same';
}

// ============================================================================
// 레슨 채팅/소통
// ============================================================================
export interface LessonMessage {
  id: string;
  sessionId?: string;
  studentId: string;

  senderId: string;
  senderRole: 'coach' | 'parent' | 'student' | 'system';
  senderName: string;

  type: 'text' | 'image' | 'video' | 'file' | 'feedback' | 'attendance' | 'payment';
  content: string;

  // 첨부
  attachments?: {
    type: string;
    url: string;
    name: string;
  }[];

  // 읽음 상태
  readBy: string[];

  createdAt: string;
}

// ============================================================================
// 알림 타입
// ============================================================================
export interface LessonNotification {
  id: string;
  studentId: string;

  type:
    | 'attendance_reminder'        // 출석 리마인더
    | 'attendance_checked'         // 출석 완료
    | 'attendance_late'            // 지각 알림
    | 'attendance_absent'          // 결석 알림
    | 'lesson_deducted'            // 레슨 차감
    | 'package_low'                // 잔여 횟수 부족
    | 'package_expired'            // 패키지 만료
    | 'payment_due'                // 결제 필요
    | 'feedback_received'          // 피드백 도착
    | 'message_received';          // 메시지 도착

  title: string;
  body: string;
  data?: Record<string, unknown>;

  sentAt: string;
  readAt?: string;
}

// ============================================================================
// 통합 대시보드용 요약
// ============================================================================
export interface StudentLessonSummary {
  studentId: string;
  studentName: string;

  // 패키지 요약
  activePackages: number;
  totalRemaining: number;          // 총 잔여 횟수
  nearExpiry: boolean;             // 곧 만료

  // 출석 요약 (최근 30일)
  attendanceRate: number;          // 출석률
  lateCount: number;
  absentCount: number;
  consecutiveAbsent: number;       // 연속 결석

  // 수납 요약
  unpaidAmount: number;
  isOverdue: boolean;

  // V-Index 연동
  vIndexImpact: 'positive' | 'neutral' | 'negative';

  // 다음 레슨
  nextLesson?: {
    date: string;
    time: string;
    coachName?: string;
  };
}

// ============================================================================
// 위험도 계산용
// ============================================================================
export interface AttendanceRiskFactors {
  consecutiveAbsent: number;       // 연속 결석 (×3 = 위험)
  absentRate30Days: number;        // 30일 결석률
  lateRate30Days: number;          // 30일 지각률
  unpaidDays: number;              // 미납 일수
  lowRemainingCount: boolean;      // 잔여 3회 이하

  // 위험도 점수
  riskScore: number;               // 0-100 (높을수록 위험)
  riskLevel: 'safe' | 'caution' | 'danger';

  // 추천 액션
  recommendedActions: RecommendedAction[];
}

export interface RecommendedAction {
  type: 'call' | 'message' | 'consultation' | 'discount' | 'care';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}
