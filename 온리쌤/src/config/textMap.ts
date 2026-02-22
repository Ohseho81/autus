/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📝 Text Map (T) - 문장 템플릿 레이어
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * L = 단어 라벨 (entity, service, staff...)
 * T = 문장 템플릿 (오늘의 수업, 학생 목록, 수업 시작...)
 *
 * 왜 필요한가:
 * - L만으로는 "오늘의 수업", "학생 목록" 같은 조합 문장이 하드코딩으로 남음
 * - T는 문장 패턴을 정의하여 모든 산업에서 재사용 가능하게 함
 *
 * 사용법:
 * const { config } = useIndustryConfig();
 * <Text>{T.todayService(config)}</Text>  // "오늘의 수업" | "오늘의 프로젝트"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { IndustryConfig } from './industryConfig';
import { L } from './labelMap';

// ════════════════════════════════════════════════════════════════════════════════
// 1. 문장 템플릿 (T.*)
// ════════════════════════════════════════════════════════════════════════════════

export const T = {
  // ──────────────────────────────────────────────────────────────────────────────
  // 오늘의 ~ (Today's)
  // ──────────────────────────────────────────────────────────────────────────────
  todayService: (c: IndustryConfig) => `오늘의 ${L.service(c)}`,
  todaySchedule: (c: IndustryConfig) => `오늘 ${L.service(c)} 일정`,

  // ──────────────────────────────────────────────────────────────────────────────
  // ~ 목록 (List)
  // ──────────────────────────────────────────────────────────────────────────────
  entityList: (c: IndustryConfig) => `${L.entity(c)} 목록`,
  entitiesList: (c: IndustryConfig) => `${L.entities(c)} 목록`,
  serviceList: (c: IndustryConfig) => `${L.service(c)} 목록`,
  staffList: (c: IndustryConfig) => `${L.staff(c)} 목록`,

  // ──────────────────────────────────────────────────────────────────────────────
  // ~ 관리 (Management)
  // ──────────────────────────────────────────────────────────────────────────────
  manageEntity: (c: IndustryConfig) => `${L.entity(c)} 관리`,
  manageService: (c: IndustryConfig) => `${L.service(c)} 관리`,
  manageStaff: (c: IndustryConfig) => `${L.staff(c)} 관리`,

  // ──────────────────────────────────────────────────────────────────────────────
  // ~ 등록/생성 (Create/Register)
  // ──────────────────────────────────────────────────────────────────────────────
  registerEntity: (c: IndustryConfig) => `${L.entity(c)} 등록`,
  createEntity: (c: IndustryConfig) => `신규 ${L.entity(c)}`,
  newEntity: (c: IndustryConfig) => `신규 ${L.entity(c)}`,
  addEntity: (c: IndustryConfig) => `${L.entity(c)} 추가`,
  registerService: (c: IndustryConfig) => `${L.service(c)} 등록`,

  // ──────────────────────────────────────────────────────────────────────────────
  // ~ 상세/수정 (Detail/Edit)
  // ──────────────────────────────────────────────────────────────────────────────
  entityDetail: (c: IndustryConfig) => `${L.entity(c)} 상세`,
  editEntity: (c: IndustryConfig) => `${L.entity(c)} 수정`,
  serviceDetail: (c: IndustryConfig) => `${L.service(c)} 상세`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 서비스 액션 (Service Actions)
  // ──────────────────────────────────────────────────────────────────────────────
  startService: (c: IndustryConfig) => `${L.service(c)} 시작`,
  endService: (c: IndustryConfig) => `${L.service(c)} 종료`,
  cancelService: (c: IndustryConfig) => `${L.service(c)} 취소`,
  serviceSchedule: (c: IndustryConfig) => `${L.service(c)} 일정`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 출석/이벤트 (Attendance/Event)
  // ──────────────────────────────────────────────────────────────────────────────
  attendanceCheck: (c: IndustryConfig) => `${c.labels.attendance} 체크`,
  attendanceRate: (c: IndustryConfig) => `${c.labels.attendance}률`,
  attendanceStatus: (c: IndustryConfig) => `${c.labels.attendance} 현황`,
  attendanceComplete: (c: IndustryConfig) => `${c.labels.attendance} 완료!`,
  attendanceRecord: (c: IndustryConfig) => `${c.labels.attendance} 기록`,
  attendanceRecordFailed: (c: IndustryConfig) => `${c.labels.attendance} 기록 실패`,
  entityNotFound: (c: IndustryConfig) => `${L.entity(c)} 정보를 찾을 수 없습니다`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 상담 (Consultation)
  // ──────────────────────────────────────────────────────────────────────────────
  consultationRecord: (c: IndustryConfig) => `${c.labels.consultation} 기록`,
  consultationHistory: (c: IndustryConfig) => `${c.labels.consultation} 내역`,
  recentConsultation: (c: IndustryConfig) => `최근 ${c.labels.consultation}`,
  scheduleConsultation: (c: IndustryConfig) => `${c.labels.consultation} 예약`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 결제 (Payment)
  // ──────────────────────────────────────────────────────────────────────────────
  paymentStatus: (c: IndustryConfig) => `${c.labels.payment} 현황`,
  unpaidAmount: (c: IndustryConfig) => `미${c.labels.payment}`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 위험/V-Index (Risk)
  // ──────────────────────────────────────────────────────────────────────────────
  atRiskEntities: (c: IndustryConfig) => `${c.labels.riskHigh} ${L.entities(c)}`,
  riskManagement: (c: IndustryConfig) => `${c.labels.riskHigh} 관리`,
  churnForecast: (c: IndustryConfig) => `${c.labels.churn} 예측`,
  churnProbability: (c: IndustryConfig) => `${c.labels.churn} 확률`,
  avgChurnProbability: (c: IndustryConfig) => `평균 ${c.labels.churn} 확률`,
  atRiskEntitiesForChurn: (c: IndustryConfig) => `${c.labels.churn} 위험 ${L.entities(c)}`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 빈 상태 (Empty State)
  // ──────────────────────────────────────────────────────────────────────────────
  noEntity: (c: IndustryConfig) => `${L.entity(c)}이 없습니다`,
  noService: (c: IndustryConfig) => `${L.service(c)}이 없습니다`,
  noScheduledService: (c: IndustryConfig) => `예정된 ${L.service(c)}이 없습니다`,
  pleaseRegisterEntity: (c: IndustryConfig) => `${L.entity(c)}을 등록해주세요`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 검색 (Search)
  // ──────────────────────────────────────────────────────────────────────────────
  searchEntity: (c: IndustryConfig) => `${L.entity(c)} 이름 검색...`,
  searchService: (c: IndustryConfig) => `${L.service(c)} 검색...`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 로딩 (Loading)
  // ──────────────────────────────────────────────────────────────────────────────
  loadingService: (c: IndustryConfig) => `${L.service(c)} 정보 불러오는 중...`,
  loadingEntity: (c: IndustryConfig) => `${L.entity(c)} 정보 불러오는 중...`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 역할 (Role)
  // ──────────────────────────────────────────────────────────────────────────────
  staffRole: (c: IndustryConfig) => L.staff(c),
  staffSubtitle: (c: IndustryConfig) => `${L.service(c)} 진행 관리`,
  adminSubtitle: (c: IndustryConfig) => '전체 관리',

  // ──────────────────────────────────────────────────────────────────────────────
  // 기능 목록 (Feature List)
  // ──────────────────────────────────────────────────────────────────────────────
  featureEntityManagement: (c: IndustryConfig) => `${L.entity(c)}/${L.staff(c)} 관리`,
  featureAttendanceStats: (c: IndustryConfig) => `${c.labels.attendance} 통계`,
  featureQrAttendance: (c: IndustryConfig) => `QR ${c.labels.attendance} 체크`,

  // ──────────────────────────────────────────────────────────────────────────────
  // 브랜드 (Brand)
  // ──────────────────────────────────────────────────────────────────────────────
  brandFull: (c: IndustryConfig) => `${c.icon} ${c.name}`,
  systemName: (c: IndustryConfig) => `AUTUS 2.0 • ${c.name} 관리 시스템`,
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// 2. Outcome-Based Action Map (ODE)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Outcome → Required Actions 매핑
 * 
 * 사용자에게 Outcome 달성에 필요한 행동만 노출
 * "삭제"가 아니라 "정의되지 않음"
 */
export const OUTCOME_ACTIONS = {
  // 🏀 교육: 학생 성장
  STUDENT_GROWTH: ['start_session', 'end_session', 'incident', 'video'] as const,
  
  // 🏗️ 건축: 현장 완성
  SITE_COMPLETION: ['start_work', 'end_work', 'incident', 'photo_report'] as const,
  
  // 🏥 의료: 환자 치료
  PATIENT_TREATMENT: ['start_care', 'end_care', 'emergency', 'prescription'] as const,
  
  // 💪 피트니스: 고객 건강
  MEMBER_FITNESS: ['start_session', 'end_session', 'incident', 'inbody'] as const,
} as const;

/**
 * 산업 코드 → Outcome 매핑
 */
export const INDUSTRY_OUTCOME: Record<string, keyof typeof OUTCOME_ACTIONS> = {
  'SERVICE.EDU.SPORTS.BASKETBALL': 'STUDENT_GROWTH',
  'SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE': 'SITE_COMPLETION',
  'SERVICE.CONSTRUCTION.INTERIOR.HOME': 'SITE_COMPLETION',
  'SERVICE.HEALTH.CLINIC': 'PATIENT_TREATMENT',
  'SERVICE.EDU.SPORTS.FITNESS': 'MEMBER_FITNESS',
};

/**
 * 산업 코드로 허용된 액션 가져오기
 */
export function getOutcomeActions(industryCode: string): readonly string[] {
  const outcome = INDUSTRY_OUTCOME[industryCode];
  if (!outcome) return OUTCOME_ACTIONS.STUDENT_GROWTH; // 기본값
  return OUTCOME_ACTIONS[outcome];
}

/**
 * 특정 액션이 현재 산업에서 허용되는지 확인
 */
export function isActionAllowed(industryCode: string, action: string): boolean {
  const allowedActions = getOutcomeActions(industryCode);
  return allowedActions.some((a) => a === action);
}
