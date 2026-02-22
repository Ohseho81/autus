/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏷️ Label Map - 타입 안전 라벨 접근 헬퍼
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 이 파일은 IndustryConfig의 라벨에 타입 안전하게 접근하는 헬퍼입니다.
 *
 * 사용법:
 * const { config } = useIndustryConfig();
 * <Text>{L.entity(config)} 목록</Text>        // "학생 목록"
 * <Text>{L.format.entityList(config)}</Text>  // "학생 목록"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { IndustryConfig, RequiredLabels } from './industryConfig';

// ════════════════════════════════════════════════════════════════════════════════
// 1. 기본 라벨 접근자 (L.*)
// ════════════════════════════════════════════════════════════════════════════════

type LabelKey = keyof RequiredLabels;

// 포맷된 라벨 헬퍼
const formatHelpers = {
  // 목록
  entityList: (c: IndustryConfig) => `${c.labels.entity} 목록`,
  serviceList: (c: IndustryConfig) => `${c.labels.service} 목록`,
  staffList: (c: IndustryConfig) => `${c.labels.staff} 목록`,
  
  // 신규/등록
  newEntity: (c: IndustryConfig) => `신규 ${c.labels.entity}`,
  newService: (c: IndustryConfig) => `신규 ${c.labels.service}`,
  registerEntity: (c: IndustryConfig) => `${c.labels.entity} 등록`,
  
  // 관리
  manageEntity: (c: IndustryConfig) => `${c.labels.entity} 관리`,
  manageService: (c: IndustryConfig) => `${c.labels.service} 관리`,
  
  // 상세
  entityDetail: (c: IndustryConfig) => `${c.labels.entity} 상세`,
  serviceDetail: (c: IndustryConfig) => `${c.labels.service} 상세`,
  
  // 서비스 액션
  serviceStart: (c: IndustryConfig) => `${c.labels.service} 시작`,
  serviceEnd: (c: IndustryConfig) => `${c.labels.service} 종료`,
  todayServices: (c: IndustryConfig) => `오늘의 ${c.labels.service}`,
  
  // 출석/방문
  attendanceCheck: (c: IndustryConfig) => `${c.labels.attendance} 체크`,
  attendanceRate: (c: IndustryConfig) => `${c.labels.attendance}률`,
  
  // 상담
  consultationRecord: (c: IndustryConfig) => `${c.labels.consultation} 기록`,
  consultationHistory: (c: IndustryConfig) => `${c.labels.consultation} 내역`,
  
  // 결제
  paymentStatus: (c: IndustryConfig) => `${c.labels.payment} 현황`,
  unpaidAmount: (c: IndustryConfig) => `미${c.labels.payment}`,
  
  // 위험
  atRiskEntities: (c: IndustryConfig) => `${c.labels.riskHigh} ${c.labels.entities}`,
  
  // 역할
  adminRole: (c: IndustryConfig) => '관리자',
  staffRole: (c: IndustryConfig) => c.labels.staff,
} as const;

/**
 * 라벨 접근 헬퍼
 * 
 * @example
 * L.entity(config)    // "학생"
 * L.service(config)   // "수업"
 * L.staff(config)     // "코치"
 * L.format.entityList(config) // "학생 목록"
 */
export const L = {
  // 엔티티
  entity: (c: IndustryConfig) => c.labels.entity,
  entities: (c: IndustryConfig) => c.labels.entities,
  entityParent: (c: IndustryConfig) => c.labels.entityParent,
  
  // 서비스
  service: (c: IndustryConfig) => c.labels.service,
  services: (c: IndustryConfig) => c.labels.services,
  
  // 담당자
  staff: (c: IndustryConfig) => c.labels.staff,
  staffs: (c: IndustryConfig) => c.labels.staffs,
  
  // 장소/행위
  location: (c: IndustryConfig) => c.labels.location,
  attendance: (c: IndustryConfig) => c.labels.attendance,
  
  // 출석 상태
  absent: (c: IndustryConfig) => c.labels.absent,
  late: (c: IndustryConfig) => c.labels.late,
  excused: (c: IndustryConfig) => c.labels.excused,
  
  // 공통
  consultation: (c: IndustryConfig) => c.labels.consultation,
  payment: (c: IndustryConfig) => c.labels.payment,
  emergency: (c: IndustryConfig) => c.labels.emergency,
  
  // 위험
  riskHigh: (c: IndustryConfig) => c.labels.riskHigh,
  riskAction: (c: IndustryConfig) => c.labels.riskAction,
  churn: (c: IndustryConfig) => c.labels.churn,
  
  // UI 공통
  risk: (c: IndustryConfig) => c.labels.risk,
  action: (c: IndustryConfig) => c.labels.action,
  settings: (c: IndustryConfig) => c.labels.settings,
  admin: (c: IndustryConfig) => c.labels.admin,
  
  // 상태
  stateScheduled: (c: IndustryConfig) => c.states.scheduled.label,
  stateInProgress: (c: IndustryConfig) => c.states.in_progress.label,
  stateCompleted: (c: IndustryConfig) => c.states.completed.label,
  
  // 이모지
  emojiScheduled: (c: IndustryConfig) => c.states.scheduled.emoji,
  emojiInProgress: (c: IndustryConfig) => c.states.in_progress.emoji,
  emojiCompleted: (c: IndustryConfig) => c.states.completed.emoji,
  
  // 브랜드
  brandName: (c: IndustryConfig) => c.name,
  brandIcon: (c: IndustryConfig) => c.icon,
  brandFull: (c: IndustryConfig) => `${c.icon} ${c.name}`,
  
  // 포맷된 라벨 (L.format.*)
  format: formatHelpers,
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// 3. 동적 라벨 생성 함수
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 동적으로 라벨 생성
 * 
 * @example
 * createLabel(config, 'entity', 'count', 10)  // "학생 10명"
 * createLabel(config, 'service', 'time', '16:00')  // "수업 16:00"
 */
export function createLabel(
  config: IndustryConfig,
  labelKey: LabelKey,
  suffix: 'count' | 'time' | 'rate' | 'status',
  value: string | number
): string {
  const label = config.labels[labelKey];
  
  switch (suffix) {
    case 'count':
      return `${label} ${value}명`;
    case 'time':
      return `${label} ${value}`;
    case 'rate':
      return `${label}률 ${value}%`;
    case 'status':
      return `${label} ${value}`;
    default:
      return `${label} ${value}`;
  }
}

/**
 * 상태에 따른 라벨/이모지 가져오기
 */
export function getStateLabel(
  config: IndustryConfig,
  state: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
): { emoji: string; label: string } {
  const stateConfig = config.states[state];
  if (!stateConfig) {
    return { emoji: '❓', label: '알 수 없음' };
  }
  return stateConfig;
}

/**
 * 버튼 라벨 가져오기 (상태 기반)
 */
export function getActionLabel(
  config: IndustryConfig,
  currentState: 'scheduled' | 'in_progress'
): string {
  switch (currentState) {
    case 'scheduled':
      return `${config.labels.service} 시작`;
    case 'in_progress':
      return `${config.labels.service} 종료`;
    default:
      return '';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. 네비게이션 타이틀 맵
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 화면별 네비게이션 타이틀
 */
export function getScreenTitle(
  config: IndustryConfig,
  screenName: string
): string {
  const titleMap: Record<string, string> = {
    // 메인
    Home: '대시보드',
    Dashboard: '대시보드',
    
    // 엔티티
    StudentList: `${config.labels.entity} 목록`,
    StudentCreate: `${config.labels.entity} 등록`,
    StudentDetail: `${config.labels.entity} 상세`,
    StudentEdit: `${config.labels.entity} 수정`,
    
    // 서비스
    LessonList: `${config.labels.service} 목록`,
    LessonRegistration: `${config.labels.service} 등록`,
    
    // 출석
    Attendance: `${config.labels.attendance} 현황`,
    
    // 상담
    ConsultationList: `${config.labels.consultation} 목록`,
    ConsultationCreate: `${config.labels.consultation} 기록`,
    ConsultationDetail: `${config.labels.consultation} 상세`,
    
    // 결제
    Payment: `${config.labels.payment} 현황`,
    
    // 위험
    Risk: `${config.labels.riskHigh} ${config.labels.entities}`,
    
    // 리포트
    Reports: '리포트',
    Forecast: '예측 분석',
    Timeline: '타임라인',
    
    // 설정
    Settings: '설정',
    ProfileSettings: '프로필 설정',
    AcademySettings: '조직 설정',
    NotificationSettings: '알림 설정',
    RiskSettings: '위험 기준 설정',
    
    // Staff (코치/담당자) 앱
    CoachHome: `${config.labels.staff} 홈`,
    StaffHome: `${config.labels.staff} 홈`,
  };
  
  return titleMap[screenName] ?? screenName;
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. 타입 익스포트
// ════════════════════════════════════════════════════════════════════════════════

export type { LabelKey };

// ════════════════════════════════════════════════════════════════════════════════
// 6. T 레이어 재익스포트 (편의상)
// ════════════════════════════════════════════════════════════════════════════════

export { T, OUTCOME_ACTIONS, getOutcomeActions, isActionAllowed } from './textMap';
