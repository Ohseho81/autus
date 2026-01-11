/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Academy Template v2.5
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 학원 도메인 전용 템플릿
 * - 활성 노드: 25개
 * - 전문가 설정 임계값
 * - 학원 개체 매핑
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ThresholdConfig, NodeThreshold } from './PressureCalculator';

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 활성 노드 (25개)
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_ACTIVE_NODES = [
  // 재무 (6개)
  'n01', // cash_balance: 현금 잔고
  'n05', // income_total: 월 매출
  'n06', // expense_total: 월 비용
  'n17', // income_flow: 매출 성장률
  'n41', // income_accel: 매출 가속도
  'n49', // cash_friction: 결제 수수료
  
  // 고객 (8개)
  'n02', // receivable_balance: 미수금
  'n09', // customer_count: 학생 수
  'n21', // customer_flow: 신규 등록률
  'n33', // customer_inertia: 재등록률 (충성도)
  'n45', // customer_accel: 학생 증가 가속
  'n57', // customer_friction: CAC (학생 획득 비용)
  'n65', // income_gravity: 매출 집중도 (핵심 학생)
  'n69', // customer_gravity: 추천 입학률
  
  // 인력 (6개)
  'n10', // supplier_count: 강사 수
  'n30', // expense_inertia: 고정비 비율
  'n34', // supplier_inertia: 강사 근속률
  'n46', // supplier_accel: 강사 변동 가속
  'n58', // supplier_friction: 강사 비용률
  'n70', // supplier_gravity: 핵심 강사 의존도
  
  // 경쟁 (3개)
  'n11', // competitor_count: 경쟁 학원 수
  'n47', // competitor_accel: 경쟁 강도 변화
  'n59', // competitor_friction: 마케팅 비용률
  
  // 협력 (2개)
  'n12', // partner_count: 협력 학원 수
  'n72', // partner_gravity: 협력 집중도
];

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 노드 상세 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface AcademyNodeDefinition {
  id: string;
  name: string;
  nameKo: string;
  category: '재무' | '고객' | '인력' | '경쟁' | '협력';
  definition: string;
  formula: string;
  dataSource: string;
  unit: string;
}

export const ACADEMY_NODE_DEFINITIONS: Record<string, AcademyNodeDefinition> = {
  // 재무 (6개)
  n01: {
    id: 'n01', name: 'cash_balance', nameKo: '현금 잔고',
    category: '재무', definition: '현금 잔고', formula: '잔액',
    dataSource: '통장', unit: 'KRW',
  },
  n05: {
    id: 'n05', name: 'income_total', nameKo: '월 수업료 총액',
    category: '재무', definition: '월 수업료 총액', formula: 'sum(tuition)',
    dataSource: 'CMS', unit: 'KRW',
  },
  n06: {
    id: 'n06', name: 'expense_total', nameKo: '월 비용 총액',
    category: '재무', definition: '월 비용 총액', formula: 'sum(salary + rent + etc)',
    dataSource: '지출 내역', unit: 'KRW',
  },
  n17: {
    id: 'n17', name: 'income_flow', nameKo: '매출 성장률',
    category: '재무', definition: '전월 대비 매출 비율', formula: 'this_month / last_month',
    dataSource: 'CMS', unit: '비율',
  },
  n41: {
    id: 'n41', name: 'income_accel', nameKo: '매출 가속도',
    category: '재무', definition: '매출 성장의 가속도', formula: 'growth(t) - growth(t-1)',
    dataSource: 'CMS', unit: '%',
  },
  n49: {
    id: 'n49', name: 'cash_friction', nameKo: '결제 수수료율',
    category: '재무', definition: '결제 수수료율', formula: 'fee / revenue',
    dataSource: 'CMS', unit: '%',
  },
  
  // 고객 (8개)
  n02: {
    id: 'n02', name: 'receivable_balance', nameKo: '미수금',
    category: '고객', definition: '미납 수업료', formula: 'unpaid_tuition',
    dataSource: 'CMS', unit: 'KRW',
  },
  n09: {
    id: 'n09', name: 'customer_count', nameKo: '학생 수 변화',
    category: '고객', definition: '학생 수 변화', formula: 'new - withdrawn',
    dataSource: '학생 DB', unit: '명',
  },
  n21: {
    id: 'n21', name: 'customer_flow', nameKo: '신규 등록률',
    category: '고객', definition: '신규 학생 비율', formula: 'new / total',
    dataSource: '학생 DB', unit: '%',
  },
  n33: {
    id: 'n33', name: 'customer_inertia', nameKo: '재등록률',
    category: '고객', definition: '재등록률 (학생 충성도)', formula: 're_enrolled / expiring',
    dataSource: '학생 DB', unit: '%',
  },
  n45: {
    id: 'n45', name: 'customer_accel', nameKo: '학생 증가 가속',
    category: '고객', definition: '학생 증가 가속도', formula: 'Δ(t) - Δ(t-1)',
    dataSource: '학생 DB', unit: '명/월²',
  },
  n57: {
    id: 'n57', name: 'customer_friction', nameKo: 'CAC',
    category: '고객', definition: '학생 획득 비용', formula: 'ad_spend / new_student',
    dataSource: '마케팅', unit: 'KRW/명',
  },
  n65: {
    id: 'n65', name: 'income_gravity', nameKo: '매출 집중도',
    category: '고객', definition: '상위 10% 매출 비중', formula: 'top10_revenue / total',
    dataSource: 'CMS', unit: '%',
  },
  n69: {
    id: 'n69', name: 'customer_gravity', nameKo: '추천 입학률',
    category: '고객', definition: '추천 입학 비율', formula: 'referral / new',
    dataSource: '학생 DB', unit: '%',
  },
  
  // 인력 (6개)
  n10: {
    id: 'n10', name: 'supplier_count', nameKo: '강사 수 변화',
    category: '인력', definition: '강사 수 변화', formula: 'new - resigned',
    dataSource: '강사 DB', unit: '명',
  },
  n30: {
    id: 'n30', name: 'expense_inertia', nameKo: '고정비 비율',
    category: '인력', definition: '고정비 비율', formula: 'fixed / total_expense',
    dataSource: '비용', unit: '%',
  },
  n34: {
    id: 'n34', name: 'supplier_inertia', nameKo: '강사 근속률',
    category: '인력', definition: '1년 이상 근속 비율', formula: 'tenure > 1year / total',
    dataSource: '강사 DB', unit: '%',
  },
  n46: {
    id: 'n46', name: 'supplier_accel', nameKo: '강사 변동 가속',
    category: '인력', definition: '강사 변동 가속도', formula: 'Δ(t) - Δ(t-1)',
    dataSource: '강사 DB', unit: '명/월²',
  },
  n58: {
    id: 'n58', name: 'supplier_friction', nameKo: '강사 비용률',
    category: '인력', definition: '매출 대비 강사 인건비', formula: 'salary / revenue',
    dataSource: '급여', unit: '%',
  },
  n70: {
    id: 'n70', name: 'supplier_gravity', nameKo: '핵심 강사 의존도',
    category: '인력', definition: '핵심 강사 담당 학생 비율', formula: 'top_teacher_students / total',
    dataSource: '강사 DB', unit: '%',
  },
  
  // 경쟁 (3개)
  n11: {
    id: 'n11', name: 'competitor_count', nameKo: '경쟁 학원 수',
    category: '경쟁', definition: '동일 상권 경쟁 학원 수', formula: 'count_in_area',
    dataSource: '시장 조사', unit: '개',
  },
  n47: {
    id: 'n47', name: 'competitor_accel', nameKo: '경쟁 강도 변화',
    category: '경쟁', definition: '경쟁 강도 변화율', formula: 'market_pressure_Δ',
    dataSource: '시장 조사', unit: '%',
  },
  n59: {
    id: 'n59', name: 'competitor_friction', nameKo: '마케팅 비용률',
    category: '경쟁', definition: '매출 대비 마케팅 비용', formula: 'marketing / revenue',
    dataSource: '마케팅', unit: '%',
  },
  
  // 협력 (2개)
  n12: {
    id: 'n12', name: 'partner_count', nameKo: '협력 학원 수',
    category: '협력', definition: '연합 학원 수', formula: 'count_partners',
    dataSource: '계약', unit: '개',
  },
  n72: {
    id: 'n72', name: 'partner_gravity', nameKo: '협력 집중도',
    category: '협력', definition: '최대 협력 학원 비중', formula: 'top_partner_share',
    dataSource: '계약', unit: '%',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 임계값 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_THRESHOLDS: ThresholdConfig = {
  // 재무
  n01: {
    warning: 10_000_000,     // 1천만원 이하 PRESSURING
    critical: 5_000_000,     // 5백만원 이하 IRREVERSIBLE
    direction: 'below',
    unit: 'KRW',
  },
  n05: {
    warning: 30_000_000,     // 3천만원 이하 PRESSURING
    critical: 20_000_000,    // 2천만원 이하 IRREVERSIBLE
    direction: 'below',
    unit: 'KRW',
  },
  n06: {
    warning: 40_000_000,     // 4천만원 이상 PRESSURING
    critical: 50_000_000,    // 5천만원 이상 IRREVERSIBLE
    direction: 'above',
    unit: 'KRW',
  },
  n17: {
    warning: 0.95,           // 전월 대비 95% 이하 PRESSURING
    critical: 0.85,          // 85% 이하 IRREVERSIBLE
    direction: 'below',
    duration: 2,
  },
  n41: {
    warning: -0.05,          // -5% PRESSURING
    critical: -0.15,         // -15% IRREVERSIBLE
    direction: 'below',
    duration: 3,
  },
  n49: {
    warning: 0.03,           // 3% 이상 PRESSURING
    critical: 0.05,          // 5% 이상 IRREVERSIBLE
    direction: 'above',
  },
  
  // 고객
  n02: {
    warning: 2_000_000,      // 미수금 200만원 이상 PRESSURING
    critical: 5_000_000,     // 500만원 이상 IRREVERSIBLE
    direction: 'above',
    unit: 'KRW',
  },
  n09: {
    warning: -3,             // 월 -3명 PRESSURING
    critical: -5,            // 월 -5명 IRREVERSIBLE
    direction: 'below',
  },
  n21: {
    warning: 0.03,           // 신규 3% 이하 PRESSURING
    critical: 0.01,          // 1% 이하 IRREVERSIBLE
    direction: 'below',
  },
  n33: {
    warning: 0.80,           // 재등록률 80% 이하 PRESSURING
    critical: 0.65,          // 65% 이하 IRREVERSIBLE
    direction: 'below',
    deadlineWarningDays: 30,
  },
  n45: {
    warning: -0.02,          // -2%p PRESSURING
    critical: -0.05,         // -5%p IRREVERSIBLE
    direction: 'below',
  },
  n57: {
    warning: 50_000,         // CAC 5만원 이상 PRESSURING
    critical: 100_000,       // 10만원 이상 IRREVERSIBLE
    direction: 'above',
    unit: 'KRW',
  },
  n65: {
    warning: 0.30,           // 상위 집중도 30% 이상 PRESSURING
    critical: 0.50,          // 50% 이상 IRREVERSIBLE
    direction: 'above',
  },
  n69: {
    warning: 0.20,           // 추천율 20% 이하 PRESSURING
    critical: 0.10,          // 10% 이하 IRREVERSIBLE
    direction: 'below',
  },
  
  // 인력
  n10: {
    warning: -1,             // 강사 -1명 PRESSURING
    critical: -2,            // -2명 IRREVERSIBLE
    direction: 'below',
  },
  n30: {
    warning: 0.70,           // 고정비 70% 이상 PRESSURING
    critical: 0.85,          // 85% 이상 IRREVERSIBLE
    direction: 'above',
  },
  n34: {
    warning: 0.70,           // 근속률 70% 이하 PRESSURING
    critical: 0.50,          // 50% 이하 IRREVERSIBLE
    direction: 'below',
  },
  n46: {
    warning: -0.10,          // 변동 가속 -10% PRESSURING
    critical: -0.20,         // -20% IRREVERSIBLE
    direction: 'below',
  },
  n58: {
    warning: 0.50,           // 강사 비용률 50% 이상 PRESSURING
    critical: 0.65,          // 65% 이상 IRREVERSIBLE
    direction: 'above',
  },
  n70: {
    warning: 0.30,           // 핵심 강사 의존도 30% 이상 PRESSURING
    critical: 0.50,          // 50% 이상 IRREVERSIBLE
    direction: 'above',
  },
  
  // 경쟁
  n11: {
    warning: 1,              // 경쟁자 +1 PRESSURING
    critical: 2,             // +2 IRREVERSIBLE
    direction: 'above',
  },
  n47: {
    warning: 0.10,           // 경쟁 강도 +10% PRESSURING
    critical: 0.25,          // +25% IRREVERSIBLE
    direction: 'above',
  },
  n59: {
    warning: 0.10,           // 마케팅 비용률 10% 이상 PRESSURING
    critical: 0.20,          // 20% 이상 IRREVERSIBLE
    direction: 'above',
  },
  
  // 협력
  n12: {
    warning: 0,              // 협력 학원 0개 PRESSURING
    critical: -1,            // (해당 없음)
    direction: 'below',
  },
  n72: {
    warning: 0.70,           // 협력 집중도 70% 이상 PRESSURING
    critical: 0.90,          // 90% 이상 IRREVERSIBLE
    direction: 'above',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 Exposure 가중치 (비중)
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_EXPOSURE_WEIGHTS: Record<string, number> = {
  // 매우 중요 (25%)
  n33: 0.25,  // 재등록률 - 학원 생명선
  
  // 중요 (15~20%)
  n41: 0.20,  // 매출 가속도
  n70: 0.18,  // 핵심 강사 의존도
  n09: 0.15,  // 학생 수 변화
  
  // 보통 (10%)
  n17: 0.10,  // 매출 성장률
  n47: 0.10,  // 경쟁 강도
  n57: 0.08,  // CAC
  n34: 0.08,  // 강사 근속률
  
  // 낮음 (5% 이하)
  n01: 0.05,  // 현금 잔고
  n05: 0.05,  // 월 매출
  n06: 0.05,  // 월 비용
  n02: 0.05,  // 미수금
  n21: 0.05,  // 신규 등록률
  n45: 0.05,  // 학생 증가 가속
  n65: 0.05,  // 매출 집중도
  n69: 0.05,  // 추천 입학률
  n10: 0.05,  // 강사 수
  n30: 0.05,  // 고정비 비율
  n46: 0.05,  // 강사 변동 가속
  n58: 0.05,  // 강사 비용률
  n11: 0.05,  // 경쟁 학원 수
  n59: 0.05,  // 마케팅 비용률
  n49: 0.03,  // 결제 수수료
  n12: 0.03,  // 협력 학원 수
  n72: 0.03,  // 협력 집중도
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 개체 매핑
// ═══════════════════════════════════════════════════════════════════════════════

export interface AcademyEntity {
  category: 'C' | 'I' | 'P' | 'S' | 'G';
  name: string;
  nameEn: string;
  role: string;
}

export const ACADEMY_ENTITIES: Record<string, AcademyEntity> = {
  parent: {
    category: 'C', name: '학부모', nameEn: 'Parent',
    role: '결제 주체',
  },
  student: {
    category: 'C', name: '학생', nameEn: 'Student',
    role: '서비스 수혜자',
  },
  academy: {
    category: 'I', name: '학원', nameEn: 'Academy',
    role: '사업체',
  },
  owner: {
    category: 'I', name: '원장', nameEn: 'Owner',
    role: '의사결정자',
  },
  teacher: {
    category: 'P', name: '강사', nameEn: 'Teacher',
    role: '서비스 제공자',
  },
  autus: {
    category: 'S', name: 'AUTUS', nameEn: 'AUTUS',
    role: '결제/관리 플랫폼',
  },
  authority: {
    category: 'G', name: '교육청', nameEn: 'Education Authority',
    role: '규제 기관',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 샘플 데이터 (시대인재 시나리오)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AcademySampleData {
  name: string;
  students: number;
  teachers: number;
  monthlyRevenue: number;
  situation: string;
  nodeValues: Record<string, number>;
  deadlines: Record<string, number>;
}

export const SAMPLE_ACADEMY_DATA: AcademySampleData = {
  name: '대치영어학원',
  students: 127,
  teachers: 8,
  monthlyRevenue: 52_000_000,
  situation: '시대인재가 대치동 초등 영어 진출',
  
  nodeValues: {
    // 재무
    n01: 23_000_000,    // 현금 2,300만원
    n05: 52_000_000,    // 월매출 5,200만원
    n06: 41_000_000,    // 월비용 4,100만원
    n17: 0.98,          // 전월 대비 98%
    n41: -0.03,         // 가속도 -3%
    n49: 0.025,         // 수수료 2.5%
    
    // 고객
    n02: 3_200_000,     // 미수금 320만원
    n09: -2,            // 월 -2명
    n21: 0.05,          // 신규 5%
    n33: 0.78,          // 재등록률 78%
    n45: -0.01,         // 증가 가속 -1%
    n57: 45_000,        // CAC 4.5만원
    n65: 0.22,          // 상위 10% 매출 22%
    n69: 0.35,          // 추천 입학 35%
    
    // 인력
    n10: 0,             // 강사 변동 없음
    n30: 0.65,          // 고정비 65%
    n34: 0.75,          // 근속률 75%
    n46: 0,             // 변동 가속 없음
    n58: 0.45,          // 강사 비용률 45%
    n70: 0.38,          // 핵심 강사 의존도 38%
    
    // 경쟁
    n11: 1,             // 경쟁자 +1 (시대인재)
    n47: 0.15,          // 경쟁 강도 +15%
    n59: 0.08,          // 마케팅 비용 8%
    
    // 협력
    n12: 3,             // 연합 학원 3개
    n72: 0.40,          // 연합 집중도 40%
  },
  
  deadlines: {
    n33: 42,  // 재등록 시즌 6주 후
    n70: 45,  // 강사 계약 갱신 45일 후
    n47: 30,  // 시대인재 오픈 30일 후
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학원 템플릿 Export
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_TEMPLATE = {
  name: '학원',
  activeNodes: ACADEMY_ACTIVE_NODES,
  nodeCount: ACADEMY_ACTIVE_NODES.length,
  definitions: ACADEMY_NODE_DEFINITIONS,
  thresholds: ACADEMY_THRESHOLDS,
  exposureWeights: ACADEMY_EXPOSURE_WEIGHTS,
  entities: ACADEMY_ENTITIES,
  sampleData: SAMPLE_ACADEMY_DATA,
};

console.log('🏫 Academy Template v2.5 Loaded');
console.log(`  - Active nodes: ${ACADEMY_TEMPLATE.nodeCount}`);
console.log(`  - Categories: 재무(6), 고객(8), 인력(6), 경쟁(3), 협력(2)`);
