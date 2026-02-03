/**
 * 교육서비스업 어댑터 (올댓바스켓)
 * 
 * AUTUS Core Engine과 교육서비스업 도메인을 연결하는 어댑터
 * - 용어 변환
 * - 지표 매핑
 * - 이벤트 템플릿
 * - 시즌 캘린더
 * - 위험 규칙
 */

import type { OKR, TSEL, TeamMember } from '../core/workflow';
import type { EnvironmentFactors } from '../core/phases/sense';

// ============================================================================
// 기본 설정
// ============================================================================

export const ADAPTER_CONFIG = {
  id: 'education_service',
  name: '교육서비스업',
  brandId: 'allthatbasket',
  brandName: '올댓바스켓',
  industry: '교육서비스업',
  subCategory: '체육교육 (농구)',
  
  market: {
    growth: 0.05,        // 시장 연간 성장률 5%
    companyGrowth: -0.03, // 올댓 성장률 -3%
    gap: -0.08,          // GAP -8%p
    status: 'WARNING' as const,
  },
};

// ============================================================================
// 용어 변환기
// ============================================================================

export const TERMINOLOGY = {
  generic_to_industry: {
    customer: '학생/회원',
    member: '회원',
    user: '학생',
    employee: '코치/강사',
    manager: '원장',
    product: '프로그램/수업',
    service: '레슨',
    purchase: '등록',
    subscription: '수강',
    churn: '이탈/휴원',
    retention: '재등록',
    revenue: '수강료',
    transaction: '결제',
    engagement: '출석률',
    satisfaction: '만족도',
    loyalty: '재등록 의향',
    referral: '추천',
  },
  industry_to_generic: {
    학생: 'user',
    회원: 'member',
    코치: 'employee',
    강사: 'employee',
    원장: 'manager',
    수업: 'product',
    레슨: 'service',
    등록: 'purchase',
    수강: 'subscription',
    휴원: 'churn',
    재등록: 'retention',
    수강료: 'revenue',
    출석률: 'engagement',
  },
} as const;

export function translateTerm(
  term: string,
  direction: 'generic_to_industry' | 'industry_to_generic' = 'generic_to_industry'
): string {
  const map = TERMINOLOGY[direction] as Record<string, string>;
  return map[term] || term;
}

// ============================================================================
// TSEL 지표 매핑
// ============================================================================

export const TSEL_METRICS = {
  T: {
    name: '신뢰도',
    sources: ['재등록 의향 설문', '추천 의향'],
    calculation: '(재등록의향 + 추천의향) / 2',
    weight: 0.25,
    benchmarks: { poor: 0.4, average: 0.6, good: 0.8 },
  },
  S: {
    name: '만족도',
    sources: ['수업 만족도', 'NPS 점수', '학부모 피드백'],
    calculation: 'NPS / 100',
    weight: 0.30,
    benchmarks: { poor: 0.3, average: 0.5, good: 0.7 },
  },
  E: {
    name: '참여도',
    sources: ['출석률', '보강 신청률', '이벤트 참여율'],
    calculation: '출석률 × 활동률',
    weight: 0.25,
    benchmarks: { poor: 0.5, average: 0.7, good: 0.85 },
  },
  L: {
    name: '충성도',
    sources: ['재등록률', '등록 기간', '추천 실적'],
    calculation: '재등록률 × (등록기간/12)',
    weight: 0.20,
    benchmarks: { poor: 0.3, average: 0.5, good: 0.7 },
  },
};

// ============================================================================
// 핵심 KPI
// ============================================================================

export const KPIS = {
  enrollment_rate: { name: '등록 전환율', target: 0.5, unit: '%' },
  retention_rate: { name: '재등록률', target: 0.8, unit: '%' },
  churn_rate: { name: '이탈률', target: 0.15, unit: '%' },
  attendance_rate: { name: '출석률', target: 0.85, unit: '%' },
  dormant_rate: { name: '휴면율', target: 0.1, unit: '%' },
  nps_score: { name: 'NPS', target: 70, unit: 'points' },
  ltv: { name: '고객생애가치', target: 3600000, unit: '원' },
  cac: { name: '고객획득비용', target: 100000, unit: '원' },
};

// ============================================================================
// 이벤트 템플릿 (대표 미션)
// ============================================================================

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  expectedROI: number;
  difficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  duration: string;
  targetAudience: string;
  okrTemplate: OKR;
  recommendedActions: string[];
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'dormant_reactivation',
    name: '휴면고객 재활성화',
    description: '30일+ 미방문 회원 복귀 유도',
    trigger: '휴면 전환 시점',
    expectedROI: 2440,
    difficulty: 'MEDIUM',
    duration: '2주',
    targetAudience: 'dormant_30d',
    okrTemplate: {
      objective: '30일+ 미방문 고객의 복귀율 향상',
      keyResults: [
        { id: 'KR1', metric: '복귀율', baseline: 15, target: 30, unit: '%', period: '2주' },
        { id: 'KR2', metric: '재이탈률', baseline: 50, target: 25, unit: '%', period: '1개월' },
        { id: 'KR3', metric: '휴면발생률', baseline: 20, target: 15, unit: '%', period: '1개월' },
      ],
    },
    recommendedActions: [
      '개인화 복귀 메시지 발송',
      '복귀 혜택 (1회 무료 수업)',
      '1:1 상담 제안',
      '새 프로그램 안내',
    ],
  },
  {
    id: 'retention_improvement',
    name: '재등록률 향상',
    description: '만료 예정 회원 리텐션',
    trigger: '만료 30일 전',
    expectedROI: 3200,
    difficulty: 'MEDIUM',
    duration: '1개월',
    targetAudience: 'expiring_30d',
    okrTemplate: {
      objective: '만료 예정 회원의 재등록 전환율 향상',
      keyResults: [
        { id: 'KR1', metric: '재등록률', baseline: 60, target: 80, unit: '%', period: '1개월' },
        { id: 'KR2', metric: '조기재등록률', baseline: 20, target: 40, unit: '%', period: '1개월' },
        { id: 'KR3', metric: '평균등록기간', baseline: 3, target: 6, unit: '개월', period: '1개월' },
      ],
    },
    recommendedActions: [
      '조기 재등록 할인 (10%)',
      '장기 등록 혜택 안내',
      '성과 리포트 공유',
      '다음 레벨 프로그램 소개',
    ],
  },
  {
    id: 'new_member_acquisition',
    name: '신규 회원 확보',
    description: '체험 → 정규 전환 극대화',
    trigger: '체험 완료 시점',
    expectedROI: 1850,
    difficulty: 'HIGH',
    duration: '1개월',
    targetAudience: 'trial_completed',
    okrTemplate: {
      objective: '체험 → 정규 전환율 극대화',
      keyResults: [
        { id: 'KR1', metric: '전환율', baseline: 30, target: 50, unit: '%', period: '1개월' },
        { id: 'KR2', metric: '체험신청', baseline: 20, target: 40, unit: '건', period: '1개월' },
        { id: 'KR3', metric: '3개월유지율', baseline: 70, target: 85, unit: '%', period: '3개월' },
      ],
    },
    recommendedActions: [
      '체험 후 즉시 등록 혜택',
      '학부모 상담 진행',
      '레벨 테스트 결과 공유',
      '친구 동반 할인',
    ],
  },
];

// ============================================================================
// 시즌 캘린더
// ============================================================================

export const SEASON_CALENDAR = {
  academic: {
    spring_semester: { start: '03-02', end: '07-15' },
    summer_vacation: { start: '07-16', end: '08-31' },
    fall_semester: { start: '09-01', end: '12-20' },
    winter_vacation: { start: '12-21', end: '03-01' },
  },
  
  highRiskPeriods: [
    { period: '방학 시작 전 2주', reason: '일정 변화', action: '지속 유도 이벤트' },
    { period: '학기 시작', reason: '학업 부담', action: '시간 조정 안내' },
    { period: '시험 기간', reason: '시간 부족', action: '보강 예약 권유' },
  ],
  
  goldenPeriods: [
    { period: '방학 시작', reason: '여유 시간 증가', action: '집중 프로그램 홍보' },
    { period: '새해', reason: '새로운 시작 심리', action: '신규 등록 프로모션' },
    { period: '개학 2주 전', reason: '일정 정리', action: '정규 수업 등록 유도' },
  ],
  
  monthlyFactor: {
    1: 1.2,   // 신년 효과
    2: 1.1,   // 봄학기 준비
    3: 0.9,   // 개학 적응
    4: 0.85,  // 중간고사
    5: 0.9,   // 회복
    6: 0.8,   // 기말고사
    7: 1.3,   // 여름방학 시작
    8: 1.2,   // 여름방학 중
    9: 0.85,  // 개학 적응
    10: 0.9,  // 중간고사
    11: 0.85, // 수능 영향
    12: 1.1,  // 겨울방학 준비
  } as Record<number, number>,
};

export function getSeasonFactor(date: Date = new Date()): number {
  const month = date.getMonth() + 1;
  return SEASON_CALENDAR.monthlyFactor[month] || 1.0;
}

export function isHighRiskPeriod(date: Date = new Date()): { isHighRisk: boolean; reason: string | null } {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 중간/기말고사 기간
  if ([4, 6, 10, 12].includes(month) && day >= 10 && day <= 25) {
    return { isHighRisk: true, reason: '시험 기간' };
  }

  return { isHighRisk: false, reason: null };
}

// ============================================================================
// 위험 규칙
// ============================================================================

export interface RiskRule {
  id: string;
  name: string;
  condition: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  action: string;
  automatable: boolean;
}

export const CHURN_RISK_RULES: RiskRule[] = [
  {
    id: 'consecutive_absence',
    name: '연속 결석',
    condition: 'absences >= 2 consecutive',
    severity: 'MEDIUM',
    action: '코치 1:1 연락',
    automatable: false,
  },
  {
    id: 'attendance_drop',
    name: '출석률 급락',
    condition: 'attendance_rate < 0.5 (2주)',
    severity: 'HIGH',
    action: '원장 상담 예약',
    automatable: false,
  },
  {
    id: 'payment_delay',
    name: '결제 지연',
    condition: 'payment_overdue > 7 days',
    severity: 'HIGH',
    action: '결제 안내 메시지',
    automatable: true,
  },
  {
    id: 'no_makeups',
    name: '보강 미신청',
    condition: 'missed_classes >= 3 AND makeups == 0',
    severity: 'MEDIUM',
    action: '보강 안내 발송',
    automatable: true,
  },
  {
    id: 'expiring_soon',
    name: '만료 임박',
    condition: 'days_to_expiry <= 14',
    severity: 'HIGH',
    action: '재등록 안내 + 혜택',
    automatable: true,
  },
];

export const OPPORTUNITY_RULES: RiskRule[] = [
  {
    id: 'perfect_attendance',
    name: '개근',
    condition: 'attendance_rate == 1.0 (1개월)',
    severity: 'LOW',
    action: '칭찬 메시지 + 추천 요청',
    automatable: true,
  },
  {
    id: 'skill_improvement',
    name: '실력 향상',
    condition: 'skill_score_delta > 0.2',
    severity: 'LOW',
    action: '성과 리포트 공유 + 상위 프로그램 안내',
    automatable: true,
  },
  {
    id: 'long_term_member',
    name: '장기 회원',
    condition: 'membership_months >= 12',
    severity: 'LOW',
    action: 'VIP 혜택 + 감사 메시지',
    automatable: true,
  },
];

// ============================================================================
// 조직 구조
// ============================================================================

export const ORGANIZATION: TeamMember[] = [
  { id: 'ceo', name: '오세호', role: '대표', task: '', priority: 0, color: '#F97316' },
  { id: 'coo', name: '김민수', role: 'COO', task: '', priority: 0, color: '#3B82F6' },
  { id: 'cmo', name: '이지현', role: 'CMO', task: '', priority: 0, color: '#EC4899' },
  { id: 'coach1', name: '박성준', role: '수석코치', task: '', priority: 0, color: '#10B981' },
  { id: 'coach2', name: '최영호', role: '코치', task: '', priority: 0, color: '#10B981' },
  { id: 'cs', name: '정수연', role: 'CS담당', task: '', priority: 0, color: '#06B6D4' },
  { id: 'dev', name: '한동훈', role: '개발', task: '', priority: 0, color: '#8B5CF6' },
];

// ============================================================================
// 헬퍼 함수
// ============================================================================

export function getMissionTemplate(name: string): MissionTemplate | undefined {
  return MISSION_TEMPLATES.find(m => m.name === name);
}

export function getOKRTemplate(missionName: string): OKR | null {
  const mission = getMissionTemplate(missionName);
  return mission ? mission.okrTemplate : null;
}

export function detectRisks(memberData: {
  consecutiveAbsences?: number;
  recentAttendanceRate?: number;
  paymentOverdueDays?: number;
  daysToExpiry?: number;
}): RiskRule[] {
  const risks: RiskRule[] = [];

  if (memberData.consecutiveAbsences && memberData.consecutiveAbsences >= 2) {
    risks.push(CHURN_RISK_RULES.find(r => r.id === 'consecutive_absence')!);
  }
  if (memberData.recentAttendanceRate && memberData.recentAttendanceRate < 0.5) {
    risks.push(CHURN_RISK_RULES.find(r => r.id === 'attendance_drop')!);
  }
  if (memberData.paymentOverdueDays && memberData.paymentOverdueDays > 7) {
    risks.push(CHURN_RISK_RULES.find(r => r.id === 'payment_delay')!);
  }
  if (memberData.daysToExpiry && memberData.daysToExpiry <= 14) {
    risks.push(CHURN_RISK_RULES.find(r => r.id === 'expiring_soon')!);
  }

  return risks.filter(Boolean);
}

export function getDefaultEnvironmentFactors(): EnvironmentFactors {
  return {
    competition: -2,  // 경쟁 심화
    economy: 0,       // 중립
    technology: 2,    // AI/디지털 기회
    society: 1,       // 건강 관심 증가
    policy: 0,        // 중립
    season: getSeasonFactor() > 1 ? 2 : -1,
    trend: 1,         // 체육 교육 관심 증가
    customer: -1,     // 가격 민감도 증가
  };
}

export default {
  config: ADAPTER_CONFIG,
  terminology: TERMINOLOGY,
  translateTerm,
  tselMetrics: TSEL_METRICS,
  kpis: KPIS,
  missionTemplates: MISSION_TEMPLATES,
  seasonCalendar: SEASON_CALENDAR,
  getSeasonFactor,
  isHighRiskPeriod,
  churnRiskRules: CHURN_RISK_RULES,
  opportunityRules: OPPORTUNITY_RULES,
  organization: ORGANIZATION,
  getMissionTemplate,
  getOKRTemplate,
  detectRisks,
  getDefaultEnvironmentFactors,
};
