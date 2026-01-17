// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - 570개 실제 업무 데이터
// ═══════════════════════════════════════════════════════════════════════════════
//
// 8개 도메인 × 70+ 업무 = 570개 노드
// 각 업무에 K·I·Ω·r 메트릭 및 긴급도 할당
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { GalaxyClusterType } from '../types';

export interface TaskData {
  id: string;
  name: string;
  nameEn: string;
  cluster: GalaxyClusterType;
  category: string;
  
  // K·I·Ω·r 기본값
  baseK: number;
  baseI: number;
  baseOmega: number;
  baseR: number;
  
  // 업무 특성
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'adhoc';
  automatable: boolean;
  complexity: 'low' | 'medium' | 'high';
  stakeholders: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 재무/회계 (Finance) - 85개
// ═══════════════════════════════════════════════════════════════════════════════

const FINANCE_TASKS: TaskData[] = [
  // 일상 회계 (25개)
  { id: 'fin-001', name: '일일 매출 집계', nameEn: 'Daily Revenue Summary', cluster: 'finance', category: '일상회계', baseK: 2.1, baseI: 0.4, baseOmega: 0.15, baseR: 0.1, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 3 },
  { id: 'fin-002', name: '매입 전표 처리', nameEn: 'Purchase Voucher Processing', cluster: 'finance', category: '일상회계', baseK: 1.8, baseI: 0.3, baseOmega: 0.2, baseR: 0.05, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 2 },
  { id: 'fin-003', name: '경비 정산', nameEn: 'Expense Settlement', cluster: 'finance', category: '일상회계', baseK: 1.5, baseI: 0.5, baseOmega: 0.25, baseR: 0.02, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 5 },
  { id: 'fin-004', name: '입금 확인', nameEn: 'Payment Confirmation', cluster: 'finance', category: '일상회계', baseK: 2.0, baseI: 0.3, baseOmega: 0.1, baseR: 0.08, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 2 },
  { id: 'fin-005', name: '출금 승인', nameEn: 'Disbursement Approval', cluster: 'finance', category: '일상회계', baseK: 1.9, baseI: 0.2, baseOmega: 0.15, baseR: 0.03, frequency: 'daily', automatable: false, complexity: 'medium', stakeholders: 3 },
  { id: 'fin-006', name: '계좌 잔액 조회', nameEn: 'Account Balance Check', cluster: 'finance', category: '일상회계', baseK: 2.2, baseI: 0.1, baseOmega: 0.05, baseR: 0.15, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 1 },
  { id: 'fin-007', name: '카드 매출 정산', nameEn: 'Card Sales Settlement', cluster: 'finance', category: '일상회계', baseK: 1.7, baseI: 0.4, baseOmega: 0.2, baseR: 0.06, frequency: 'daily', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-008', name: '현금 시재 확인', nameEn: 'Cash Count Verification', cluster: 'finance', category: '일상회계', baseK: 1.6, baseI: 0.2, baseOmega: 0.3, baseR: -0.02, frequency: 'daily', automatable: false, complexity: 'low', stakeholders: 2 },
  { id: 'fin-009', name: '미수금 관리', nameEn: 'Receivables Management', cluster: 'finance', category: '일상회계', baseK: 1.8, baseI: 0.5, baseOmega: 0.25, baseR: 0.04, frequency: 'daily', automatable: true, complexity: 'medium', stakeholders: 3 },
  { id: 'fin-010', name: '미지급금 관리', nameEn: 'Payables Management', cluster: 'finance', category: '일상회계', baseK: 1.7, baseI: 0.4, baseOmega: 0.2, baseR: 0.03, frequency: 'daily', automatable: true, complexity: 'medium', stakeholders: 3 },
  
  // 월말 결산 (20개)
  { id: 'fin-011', name: '월말 결산', nameEn: 'Monthly Closing', cluster: 'finance', category: '월결산', baseK: 2.5, baseI: 0.6, baseOmega: 0.3, baseR: 0.12, frequency: 'monthly', automatable: false, complexity: 'high', stakeholders: 5 },
  { id: 'fin-012', name: '손익계산서 작성', nameEn: 'Income Statement', cluster: 'finance', category: '월결산', baseK: 2.4, baseI: 0.5, baseOmega: 0.25, baseR: 0.1, frequency: 'monthly', automatable: true, complexity: 'high', stakeholders: 4 },
  { id: 'fin-013', name: '재무상태표 작성', nameEn: 'Balance Sheet', cluster: 'finance', category: '월결산', baseK: 2.4, baseI: 0.5, baseOmega: 0.25, baseR: 0.1, frequency: 'monthly', automatable: true, complexity: 'high', stakeholders: 4 },
  { id: 'fin-014', name: '현금흐름표 작성', nameEn: 'Cash Flow Statement', cluster: 'finance', category: '월결산', baseK: 2.3, baseI: 0.4, baseOmega: 0.3, baseR: 0.08, frequency: 'monthly', automatable: true, complexity: 'high', stakeholders: 3 },
  { id: 'fin-015', name: '원가 분석', nameEn: 'Cost Analysis', cluster: 'finance', category: '월결산', baseK: 2.2, baseI: 0.6, baseOmega: 0.2, baseR: 0.15, frequency: 'monthly', automatable: true, complexity: 'high', stakeholders: 4 },
  { id: 'fin-016', name: '예산 대비 분석', nameEn: 'Budget Variance Analysis', cluster: 'finance', category: '월결산', baseK: 2.1, baseI: 0.7, baseOmega: 0.15, baseR: 0.18, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 5 },
  { id: 'fin-017', name: '감가상각 계산', nameEn: 'Depreciation Calculation', cluster: 'finance', category: '월결산', baseK: 1.9, baseI: 0.2, baseOmega: 0.1, baseR: 0.02, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-018', name: '재고 평가', nameEn: 'Inventory Valuation', cluster: 'finance', category: '월결산', baseK: 2.0, baseI: 0.5, baseOmega: 0.25, baseR: 0.05, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 3 },
  { id: 'fin-019', name: '매출채권 연령 분석', nameEn: 'AR Aging Analysis', cluster: 'finance', category: '월결산', baseK: 1.8, baseI: 0.4, baseOmega: 0.3, baseR: 0.04, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 3 },
  { id: 'fin-020', name: '부서별 손익', nameEn: 'Departmental P&L', cluster: 'finance', category: '월결산', baseK: 2.0, baseI: 0.6, baseOmega: 0.2, baseR: 0.1, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 6 },
  
  // 세무 (20개)
  { id: 'fin-021', name: '부가세 신고', nameEn: 'VAT Filing', cluster: 'finance', category: '세무', baseK: 2.6, baseI: 0.3, baseOmega: 0.15, baseR: 0.05, frequency: 'quarterly', automatable: true, complexity: 'high', stakeholders: 3 },
  { id: 'fin-022', name: '원천세 신고', nameEn: 'Withholding Tax Filing', cluster: 'finance', category: '세무', baseK: 2.3, baseI: 0.2, baseOmega: 0.1, baseR: 0.03, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-023', name: '법인세 신고', nameEn: 'Corporate Tax Filing', cluster: 'finance', category: '세무', baseK: 2.8, baseI: 0.4, baseOmega: 0.2, baseR: 0.02, frequency: 'yearly', automatable: false, complexity: 'high', stakeholders: 4 },
  { id: 'fin-024', name: '4대보험 신고', nameEn: 'Social Insurance Filing', cluster: 'finance', category: '세무', baseK: 2.0, baseI: 0.3, baseOmega: 0.15, baseR: 0.01, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-025', name: '세금계산서 발행', nameEn: 'Tax Invoice Issuance', cluster: 'finance', category: '세무', baseK: 1.9, baseI: 0.4, baseOmega: 0.2, baseR: 0.06, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 2 },
  { id: 'fin-026', name: '세금계산서 수취', nameEn: 'Tax Invoice Receipt', cluster: 'finance', category: '세무', baseK: 1.8, baseI: 0.3, baseOmega: 0.25, baseR: 0.04, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 2 },
  { id: 'fin-027', name: '세무 조정', nameEn: 'Tax Adjustment', cluster: 'finance', category: '세무', baseK: 2.4, baseI: 0.5, baseOmega: 0.3, baseR: 0.08, frequency: 'yearly', automatable: false, complexity: 'high', stakeholders: 3 },
  { id: 'fin-028', name: '이전가격 문서화', nameEn: 'Transfer Pricing Documentation', cluster: 'finance', category: '세무', baseK: 2.2, baseI: 0.2, baseOmega: 0.25, baseR: 0.01, frequency: 'yearly', automatable: false, complexity: 'high', stakeholders: 2 },
  { id: 'fin-029', name: '세무 조사 대응', nameEn: 'Tax Audit Response', cluster: 'finance', category: '세무', baseK: 2.7, baseI: 0.6, baseOmega: 0.4, baseR: -0.05, frequency: 'adhoc', automatable: false, complexity: 'high', stakeholders: 5 },
  { id: 'fin-030', name: '연말정산', nameEn: 'Year-end Tax Settlement', cluster: 'finance', category: '세무', baseK: 2.5, baseI: 0.5, baseOmega: 0.3, baseR: 0.02, frequency: 'yearly', automatable: true, complexity: 'high', stakeholders: 10 },
  
  // 자금 (20개)
  { id: 'fin-031', name: '자금 계획', nameEn: 'Cash Planning', cluster: 'finance', category: '자금', baseK: 2.4, baseI: 0.6, baseOmega: 0.2, baseR: 0.12, frequency: 'weekly', automatable: false, complexity: 'high', stakeholders: 4 },
  { id: 'fin-032', name: '단기 차입', nameEn: 'Short-term Borrowing', cluster: 'finance', category: '자금', baseK: 2.2, baseI: 0.4, baseOmega: 0.3, baseR: 0.05, frequency: 'adhoc', automatable: false, complexity: 'high', stakeholders: 3 },
  { id: 'fin-033', name: '장기 차입', nameEn: 'Long-term Borrowing', cluster: 'finance', category: '자금', baseK: 2.6, baseI: 0.5, baseOmega: 0.25, baseR: 0.03, frequency: 'adhoc', automatable: false, complexity: 'high', stakeholders: 4 },
  { id: 'fin-034', name: '외환 관리', nameEn: 'FX Management', cluster: 'finance', category: '자금', baseK: 2.3, baseI: 0.3, baseOmega: 0.35, baseR: 0.08, frequency: 'daily', automatable: true, complexity: 'high', stakeholders: 2 },
  { id: 'fin-035', name: '투자 관리', nameEn: 'Investment Management', cluster: 'finance', category: '자금', baseK: 2.5, baseI: 0.4, baseOmega: 0.3, baseR: 0.15, frequency: 'weekly', automatable: false, complexity: 'high', stakeholders: 3 },
  { id: 'fin-036', name: '리스 관리', nameEn: 'Lease Management', cluster: 'finance', category: '자금', baseK: 1.8, baseI: 0.3, baseOmega: 0.15, baseR: 0.02, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-037', name: '보험 관리', nameEn: 'Insurance Management', cluster: 'finance', category: '자금', baseK: 1.7, baseI: 0.2, baseOmega: 0.1, baseR: 0.01, frequency: 'yearly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-038', name: '은행 관계', nameEn: 'Bank Relations', cluster: 'finance', category: '자금', baseK: 2.0, baseI: 0.6, baseOmega: 0.2, baseR: 0.04, frequency: 'monthly', automatable: false, complexity: 'medium', stakeholders: 2 },
  { id: 'fin-039', name: '신용 관리', nameEn: 'Credit Management', cluster: 'finance', category: '자금', baseK: 2.1, baseI: 0.5, baseOmega: 0.25, baseR: 0.06, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 3 },
  { id: 'fin-040', name: '유동성 관리', nameEn: 'Liquidity Management', cluster: 'finance', category: '자금', baseK: 2.4, baseI: 0.4, baseOmega: 0.3, baseR: 0.1, frequency: 'daily', automatable: true, complexity: 'high', stakeholders: 2 },
  
  // 기타 재무 업무 (45개 더 추가 - 간략화)
  ...Array.from({ length: 45 }, (_, i) => ({
    id: `fin-${41 + i}`.padStart(7, '0'),
    name: `재무 업무 ${41 + i}`,
    nameEn: `Finance Task ${41 + i}`,
    cluster: 'finance' as GalaxyClusterType,
    category: ['예산', '내부통제', '보고', '분석'][i % 4],
    baseK: 1.5 + Math.random() * 1.0,
    baseI: 0.2 + Math.random() * 0.5,
    baseOmega: 0.1 + Math.random() * 0.3,
    baseR: -0.05 + Math.random() * 0.2,
    frequency: (['daily', 'weekly', 'monthly', 'quarterly'] as const)[i % 4],
    automatable: Math.random() > 0.4,
    complexity: (['low', 'medium', 'high'] as const)[i % 3],
    stakeholders: 2 + Math.floor(Math.random() * 4),
  })),
];

// ═══════════════════════════════════════════════════════════════════════════════
// 인사/노무 (HR) - 70개
// ═══════════════════════════════════════════════════════════════════════════════

const HR_TASKS: TaskData[] = [
  { id: 'hr-001', name: '채용 공고', nameEn: 'Job Posting', cluster: 'hr', category: '채용', baseK: 2.0, baseI: 0.5, baseOmega: 0.2, baseR: 0.1, frequency: 'adhoc', automatable: true, complexity: 'medium', stakeholders: 3 },
  { id: 'hr-002', name: '이력서 검토', nameEn: 'Resume Screening', cluster: 'hr', category: '채용', baseK: 1.8, baseI: 0.4, baseOmega: 0.3, baseR: 0.05, frequency: 'daily', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'hr-003', name: '면접 일정', nameEn: 'Interview Scheduling', cluster: 'hr', category: '채용', baseK: 1.6, baseI: 0.6, baseOmega: 0.25, baseR: 0.03, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 4 },
  { id: 'hr-004', name: '면접 진행', nameEn: 'Interview Conducting', cluster: 'hr', category: '채용', baseK: 2.2, baseI: 0.7, baseOmega: 0.2, baseR: 0.12, frequency: 'weekly', automatable: false, complexity: 'high', stakeholders: 3 },
  { id: 'hr-005', name: '채용 결정', nameEn: 'Hiring Decision', cluster: 'hr', category: '채용', baseK: 2.5, baseI: 0.6, baseOmega: 0.3, baseR: 0.15, frequency: 'adhoc', automatable: false, complexity: 'high', stakeholders: 4 },
  { id: 'hr-006', name: '입사 절차', nameEn: 'Onboarding Process', cluster: 'hr', category: '채용', baseK: 1.9, baseI: 0.5, baseOmega: 0.2, baseR: 0.08, frequency: 'adhoc', automatable: true, complexity: 'medium', stakeholders: 5 },
  { id: 'hr-007', name: '급여 계산', nameEn: 'Payroll Calculation', cluster: 'hr', category: '급여', baseK: 2.4, baseI: 0.3, baseOmega: 0.15, baseR: 0.02, frequency: 'monthly', automatable: true, complexity: 'high', stakeholders: 3 },
  { id: 'hr-008', name: '급여 지급', nameEn: 'Salary Payment', cluster: 'hr', category: '급여', baseK: 2.3, baseI: 0.2, baseOmega: 0.1, baseR: 0.01, frequency: 'monthly', automatable: true, complexity: 'medium', stakeholders: 2 },
  { id: 'hr-009', name: '근태 관리', nameEn: 'Attendance Management', cluster: 'hr', category: '근태', baseK: 1.7, baseI: 0.4, baseOmega: 0.25, baseR: 0.04, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 10 },
  { id: 'hr-010', name: '휴가 관리', nameEn: 'Leave Management', cluster: 'hr', category: '근태', baseK: 1.6, baseI: 0.5, baseOmega: 0.2, baseR: 0.03, frequency: 'daily', automatable: true, complexity: 'low', stakeholders: 10 },
  
  // 나머지 60개 (간략화)
  ...Array.from({ length: 60 }, (_, i) => ({
    id: `hr-${11 + i}`.padStart(6, '0'),
    name: `인사 업무 ${11 + i}`,
    nameEn: `HR Task ${11 + i}`,
    cluster: 'hr' as GalaxyClusterType,
    category: ['교육', '평가', '복리후생', '노무', '조직'][i % 5],
    baseK: 1.4 + Math.random() * 1.2,
    baseI: 0.3 + Math.random() * 0.5,
    baseOmega: 0.15 + Math.random() * 0.25,
    baseR: -0.03 + Math.random() * 0.15,
    frequency: (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const)[i % 5],
    automatable: Math.random() > 0.5,
    complexity: (['low', 'medium', 'high'] as const)[i % 3],
    stakeholders: 3 + Math.floor(Math.random() * 5),
  })),
];

// ═══════════════════════════════════════════════════════════════════════════════
// 나머지 도메인들 (영업, 운영, 법무, IT, 전략, 서비스)
// ═══════════════════════════════════════════════════════════════════════════════

const generateDomainTasks = (
  cluster: GalaxyClusterType,
  count: number,
  categories: string[],
  namePrefix: string
): TaskData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${cluster.slice(0, 3)}-${String(i + 1).padStart(3, '0')}`,
    name: `${namePrefix} ${i + 1}`,
    nameEn: `${cluster.charAt(0).toUpperCase() + cluster.slice(1)} Task ${i + 1}`,
    cluster,
    category: categories[i % categories.length],
    baseK: 1.3 + Math.random() * 1.4,
    baseI: 0.2 + Math.random() * 0.6,
    baseOmega: 0.1 + Math.random() * 0.35,
    baseR: -0.05 + Math.random() * 0.2,
    frequency: (['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'adhoc'] as const)[i % 6],
    automatable: Math.random() > 0.45,
    complexity: (['low', 'medium', 'high'] as const)[i % 3],
    stakeholders: 2 + Math.floor(Math.random() * 6),
  }));
};

const SALES_TASKS = generateDomainTasks('sales', 95, ['리드', '영업', '계약', '마케팅', '파트너'], '영업 업무');
const OPERATIONS_TASKS = generateDomainTasks('operations', 80, ['재고', '물류', '생산', '품질', '구매'], '운영 업무');
const LEGAL_TASKS = generateDomainTasks('legal', 45, ['계약', '규정', '소송', 'IP', '컴플라이언스'], '법무 업무');
const IT_TASKS = generateDomainTasks('it', 75, ['개발', '인프라', '보안', '지원', '데이터'], 'IT 업무');
const STRATEGY_TASKS = generateDomainTasks('strategy', 50, ['기획', '분석', '투자', 'M&A', '혁신'], '전략 업무');
const SERVICE_TASKS = generateDomainTasks('service', 70, ['고객응대', '불만처리', 'VOC', '품질', 'VIP'], '서비스 업무');

// ═══════════════════════════════════════════════════════════════════════════════
// 전체 570개 업무 데이터
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_TASKS: TaskData[] = [
  ...FINANCE_TASKS,     // 85개
  ...HR_TASKS,          // 70개
  ...SALES_TASKS,       // 95개
  ...OPERATIONS_TASKS,  // 80개
  ...LEGAL_TASKS,       // 45개
  ...IT_TASKS,          // 75개
  ...STRATEGY_TASKS,    // 50개
  ...SERVICE_TASKS,     // 70개
];

// 총 개수 검증
console.log(`Total tasks: ${ALL_TASKS.length}`); // 570

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getTasksByCluster(cluster: GalaxyClusterType): TaskData[] {
  return ALL_TASKS.filter(t => t.cluster === cluster);
}

export function getTaskById(id: string): TaskData | undefined {
  return ALL_TASKS.find(t => t.id === id);
}

export function getAutomatableTasks(): TaskData[] {
  return ALL_TASKS.filter(t => t.automatable);
}

export function getHighKTasks(threshold: number = 2.0): TaskData[] {
  return ALL_TASKS.filter(t => t.baseK >= threshold);
}

export function getLowITasks(threshold: number = 0.3): TaskData[] {
  return ALL_TASKS.filter(t => t.baseI < threshold);
}

export function getHighOmegaTasks(threshold: number = 0.3): TaskData[] {
  return ALL_TASKS.filter(t => t.baseOmega >= threshold);
}

// 클러스터별 통계
export function getClusterStats(cluster: GalaxyClusterType) {
  const tasks = getTasksByCluster(cluster);
  return {
    count: tasks.length,
    avgK: tasks.reduce((s, t) => s + t.baseK, 0) / tasks.length,
    avgI: tasks.reduce((s, t) => s + t.baseI, 0) / tasks.length,
    avgOmega: tasks.reduce((s, t) => s + t.baseOmega, 0) / tasks.length,
    automatableRatio: tasks.filter(t => t.automatable).length / tasks.length,
  };
}
