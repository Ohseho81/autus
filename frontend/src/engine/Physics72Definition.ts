/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72³ UPM (Universal Pressure Map) v2.5
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 72³는 예측 엔진이 아니다.
 * 72³는 대시보드도 아니다.
 * 72³는 "결정을 미루면 손해가 확정되는 지점만 표시하는 레이더"다.
 * 
 * 구조:
 * X축: Pressure Indicator (72개) = 물리법칙 6 × 개체성질 12
 * Y축: Cost Type (6개)
 * Z축: Irreversibility Horizon (5개)
 * 
 * 최대: 72 × 6 × 5 = 2,160
 * 실제 활성: 도메인별 200~500개
 * 
 * LOCK 원칙:
 * 1. 72 = 6 × 12 (고정)
 * 2. 모든 노드는 측정 가능
 * 3. 상태 = IGNORABLE / PRESSURING / IRREVERSIBLE
 * 4. 예측 ❌, 마감 표시 ⭕
 * 5. 학습 = Phase 3 사후 보정만
 * 6. UI = "미루면 비용 발생" 한 문장
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 물리법칙 6개 정의 (X축 기반)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsLaw {
  id: string;
  code: string;        // CON, FLO, INE, ACC, FRI, GRA
  index: number;       // 0-5
  name: string;
  nameEn: string;
  symbol: string;
  color: string;
  definition: string;
  formula: string;
}

export const PHYSICS_LAWS: Record<string, PhysicsLaw> = {
  CONSERVATION: {
    id: 'CONSERVATION',
    code: 'CON',
    index: 0,
    name: '보존',
    nameEn: 'Conservation',
    symbol: '⚖️',
    color: '#3b82f6',
    definition: '들어온 만큼 나간다',
    formula: 'Δ = In - Out',
  },
  FLOW: {
    id: 'FLOW',
    code: 'FLO',
    index: 1,
    name: '흐름',
    nameEn: 'Flow',
    symbol: '🌊',
    color: '#06b6d4',
    definition: '방향과 양',
    formula: 'Direction × Amount',
  },
  INERTIA: {
    id: 'INERTIA',
    code: 'INE',
    index: 2,
    name: '관성',
    nameEn: 'Inertia',
    symbol: '🔄',
    color: '#8b5cf6',
    definition: '유지하려는 힘',
    formula: 'Avg(past N)',
  },
  ACCELERATION: {
    id: 'ACCELERATION',
    code: 'ACC',
    index: 3,
    name: '가속',
    nameEn: 'Acceleration',
    symbol: '🚀',
    color: '#f59e0b',
    definition: '변화의 속도',
    formula: 'Δ(t) - Δ(t-1)',
  },
  FRICTION: {
    id: 'FRICTION',
    code: 'FRI',
    index: 4,
    name: '마찰',
    nameEn: 'Friction',
    symbol: '⚡',
    color: '#ef4444',
    definition: '이동 시 손실',
    formula: 'Loss / Transfer',
  },
  GRAVITY: {
    id: 'GRAVITY',
    code: 'GRA',
    index: 5,
    name: '인력',
    nameEn: 'Gravity',
    symbol: '🌑',
    color: '#1f2937',
    definition: '끌어당기는 힘',
    formula: 'Concentration',
  },
};

export const PHYSICS_LAW_LIST = Object.values(PHYSICS_LAWS);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 개체성질 12개 정의 (X축 기반)
// ═══════════════════════════════════════════════════════════════════════════════

export type PropertyCategory = 'STOCK' | 'FLOW' | 'RELATION';

export interface EntityProperty {
  id: string;
  code: string;        // CAS, REC, PAY, EQU, INC, EXP, INV, RET, CUS, SUP, COM, PAR
  index: number;       // 0-11
  category: PropertyCategory;
  name: string;
  nameEn: string;
  symbol: string;
  color: string;
  definition: string;
}

export const ENTITY_PROPERTIES: Record<string, EntityProperty> = {
  // STOCK (자산) - 정적 상태 (01-04)
  CASH: {
    id: 'CASH', code: 'CAS', index: 0, category: 'STOCK',
    name: '현금', nameEn: 'Cash', symbol: '💵', color: '#22c55e',
    definition: '즉시 사용 가능한 돈',
  },
  RECEIVABLE: {
    id: 'RECEIVABLE', code: 'REC', index: 1, category: 'STOCK',
    name: '채권', nameEn: 'Receivable', symbol: '📥', color: '#3b82f6',
    definition: '받을 예정인 돈',
  },
  PAYABLE: {
    id: 'PAYABLE', code: 'PAY', index: 2, category: 'STOCK',
    name: '부채', nameEn: 'Payable', symbol: '📤', color: '#ef4444',
    definition: '갚아야 할 돈',
  },
  EQUITY: {
    id: 'EQUITY', code: 'EQU', index: 3, category: 'STOCK',
    name: '자본', nameEn: 'Equity', symbol: '🏛️', color: '#8b5cf6',
    definition: '순자산 (자산 - 부채)',
  },

  // FLOW (흐름) - 동적 변화 (05-08)
  INCOME: {
    id: 'INCOME', code: 'INC', index: 4, category: 'FLOW',
    name: '수입', nameEn: 'Income', symbol: '📈', color: '#10b981',
    definition: '들어오는 돈',
  },
  EXPENSE: {
    id: 'EXPENSE', code: 'EXP', index: 5, category: 'FLOW',
    name: '지출', nameEn: 'Expense', symbol: '📉', color: '#f43f5e',
    definition: '나가는 돈',
  },
  INVESTMENT: {
    id: 'INVESTMENT', code: 'INV', index: 6, category: 'FLOW',
    name: '투자', nameEn: 'Investment', symbol: '🎯', color: '#6366f1',
    definition: '미래를 위해 쓰는 돈',
  },
  RETURN: {
    id: 'RETURN', code: 'RET', index: 7, category: 'FLOW',
    name: '회수', nameEn: 'Return', symbol: '🔙', color: '#14b8a6',
    definition: '투자에서 돌아오는 돈',
  },

  // RELATION (관계) - 상대방 (09-12)
  CUSTOMER: {
    id: 'CUSTOMER', code: 'CUS', index: 8, category: 'RELATION',
    name: '고객', nameEn: 'Customer', symbol: '👤', color: '#0ea5e9',
    definition: '나에게 돈 주는 상대',
  },
  SUPPLIER: {
    id: 'SUPPLIER', code: 'SUP', index: 9, category: 'RELATION',
    name: '공급자', nameEn: 'Supplier', symbol: '🏭', color: '#f97316',
    definition: '내가 돈 주는 상대',
  },
  COMPETITOR: {
    id: 'COMPETITOR', code: 'COM', index: 10, category: 'RELATION',
    name: '경쟁자', nameEn: 'Competitor', symbol: '⚔️', color: '#dc2626',
    definition: '내 돈을 뺏는 상대',
  },
  PARTNER: {
    id: 'PARTNER', code: 'PAR', index: 11, category: 'RELATION',
    name: '협력자', nameEn: 'Partner', symbol: '🤝', color: '#a855f7',
    definition: '돈을 나누는 상대',
  },
};

export const ENTITY_PROPERTY_LIST = Object.values(ENTITY_PROPERTIES);
export const STOCK_PROPERTIES = ENTITY_PROPERTY_LIST.filter(p => p.category === 'STOCK');
export const FLOW_PROPERTIES = ENTITY_PROPERTY_LIST.filter(p => p.category === 'FLOW');
export const RELATION_PROPERTIES = ENTITY_PROPERTY_LIST.filter(p => p.category === 'RELATION');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Y축: Cost Type (비용 유형) - 6개
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostType {
  id: string;
  code: string;
  index: number;
  name: string;
  nameEn: string;
  symbol: string;
  color: string;
  description: string;
}

export const COST_TYPES: Record<string, CostType> = {
  FINANCIAL: {
    id: 'FINANCIAL', code: 'FIN', index: 0,
    name: '금전 손실', nameEn: 'Financial',
    symbol: '💰', color: '#ef4444',
    description: '직접적인 금전적 손실',
  },
  TRUST: {
    id: 'TRUST', code: 'TRU', index: 1,
    name: '신뢰 손상', nameEn: 'Trust',
    symbol: '🤝', color: '#f59e0b',
    description: '관계/신뢰 손상',
  },
  OPPORTUNITY: {
    id: 'OPPORTUNITY', code: 'OPP', index: 2,
    name: '기회 상실', nameEn: 'Opportunity',
    symbol: '🚪', color: '#8b5cf6',
    description: '놓친 기회 비용',
  },
  TALENT: {
    id: 'TALENT', code: 'TAL', index: 3,
    name: '인재 이탈', nameEn: 'Talent',
    symbol: '👤', color: '#06b6d4',
    description: '핵심 인력 이탈 위험',
  },
  LEGAL: {
    id: 'LEGAL', code: 'LEG', index: 4,
    name: '법/규제 리스크', nameEn: 'Legal',
    symbol: '⚖️', color: '#1f2937',
    description: '법적/규제 리스크',
  },
  REPUTATION: {
    id: 'REPUTATION', code: 'REP', index: 5,
    name: '평판 손상', nameEn: 'Reputation',
    symbol: '📢', color: '#dc2626',
    description: '브랜드/평판 손상',
  },
};

export const COST_TYPE_LIST = Object.values(COST_TYPES);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Z축: Irreversibility Horizon (비가역성 시간대) - 5개
// ═══════════════════════════════════════════════════════════════════════════════

export interface IrreversibilityHorizon {
  id: string;
  code: string;
  index: number;
  name: string;
  nameEn: string;
  symbol: string;
  color: string;
  range: string;
  maxDays: number;
}

export const IRREVERSIBILITY_HORIZONS: Record<string, IrreversibilityHorizon> = {
  IMMEDIATE: {
    id: 'IMMEDIATE', code: 'IMM', index: 0,
    name: '즉시', nameEn: 'Immediate',
    symbol: '🔴', color: '#ef4444',
    range: '< 24시간', maxDays: 1,
  },
  DAYS: {
    id: 'DAYS', code: 'DAY', index: 1,
    name: '수일', nameEn: 'Days',
    symbol: '🟠', color: '#f59e0b',
    range: '1~7일', maxDays: 7,
  },
  WEEKS: {
    id: 'WEEKS', code: 'WEK', index: 2,
    name: '수주', nameEn: 'Weeks',
    symbol: '🟡', color: '#eab308',
    range: '1~4주', maxDays: 28,
  },
  MONTHS: {
    id: 'MONTHS', code: 'MON', index: 3,
    name: '수개월', nameEn: 'Months',
    symbol: '🟢', color: '#22c55e',
    range: '1~6개월', maxDays: 180,
  },
  PERMANENT: {
    id: 'PERMANENT', code: 'PRM', index: 4,
    name: '영구', nameEn: 'Permanent',
    symbol: '⚫', color: '#1f2937',
    range: '회복 불가', maxDays: Infinity,
  },
};

export const IRREVERSIBILITY_LIST = Object.values(IRREVERSIBILITY_HORIZONS);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 상태 분류 (3단계)
// ═══════════════════════════════════════════════════════════════════════════════

export type PressureState = 'IGNORABLE' | 'PRESSURING' | 'IRREVERSIBLE';

export interface StateDefinition {
  id: PressureState;
  code: string;
  name: string;
  color: string;
  bgColor: string;
  symbol: string;
  description: string;
}

export const PRESSURE_STATES: Record<PressureState, StateDefinition> = {
  IGNORABLE: {
    id: 'IGNORABLE', code: 'IGN',
    name: '무시 가능', color: '#22c55e', bgColor: '#22c55e20',
    symbol: '🟢', description: '지금 무시해도 됨',
  },
  PRESSURING: {
    id: 'PRESSURING', code: 'PRS',
    name: '압박 중', color: '#f59e0b', bgColor: '#f59e0b20',
    symbol: '🟡', description: '미루면 비용 발생',
  },
  IRREVERSIBLE: {
    id: 'IRREVERSIBLE', code: 'IRR',
    name: '비가역', color: '#ef4444', bgColor: '#ef444420',
    symbol: '🔴', description: '이미 늦음, 복구 비용 > 자산',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 72개 노드 정의 (X축)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Node72 {
  id: string;          // n01-n72
  index: number;       // 0-71
  law: PhysicsLaw;
  property: EntityProperty;
  name: string;        // "cash_balance"
  nameKo: string;      // "현금 잔고 변화"
  definition: string;
  formula: string;
  dataSource: string;
  dbColumn: string;
}

// 72개 노드 상세 정의
const NODE_DEFINITIONS: Array<{
  nameEn: string;
  nameKo: string;
  definition: string;
  formula: string;
  dataSource: string;
}> = [
  // Conservation (보존) 01-12
  { nameEn: 'cash_balance', nameKo: '현금 잔고 변화', definition: '현금 잔고 변화', formula: 'cash_in - cash_out', dataSource: '통장' },
  { nameEn: 'receivable_balance', nameKo: '받을 돈 변화', definition: '받을 돈 변화', formula: 'new_receivable - collected', dataSource: '미수금 장부' },
  { nameEn: 'payable_balance', nameKo: '줄 돈 변화', definition: '줄 돈 변화', formula: 'new_payable - paid', dataSource: '미지급 장부' },
  { nameEn: 'equity_balance', nameKo: '순자산 변화', definition: '순자산 변화', formula: 'n01 - n03', dataSource: '계산' },
  { nameEn: 'income_total', nameKo: '총 수입', definition: '총 수입', formula: 'sum(all_income)', dataSource: '매출' },
  { nameEn: 'expense_total', nameKo: '총 지출', definition: '총 지출', formula: 'sum(all_expense)', dataSource: '비용' },
  { nameEn: 'investment_total', nameKo: '총 투자', definition: '총 투자', formula: 'sum(all_investment)', dataSource: '투자 내역' },
  { nameEn: 'return_total', nameKo: '총 회수', definition: '총 회수', formula: 'sum(all_return)', dataSource: '수익 내역' },
  { nameEn: 'customer_count', nameKo: '고객 수 변화', definition: '고객 수 변화', formula: 'new - lost', dataSource: 'CRM' },
  { nameEn: 'supplier_count', nameKo: '공급자 수 변화', definition: '공급자 수 변화', formula: 'new - lost', dataSource: '거래처' },
  { nameEn: 'competitor_count', nameKo: '경쟁자 수 변화', definition: '경쟁자 수 변화', formula: 'new - exit', dataSource: '시장 조사' },
  { nameEn: 'partner_count', nameKo: '협력자 수 변화', definition: '협력자 수 변화', formula: 'new - lost', dataSource: '계약' },

  // Flow (흐름) 13-24
  { nameEn: 'cash_flow', nameKo: '현금 흐름 비율', definition: '현금 흐름 비율', formula: 'cash_in / cash_out', dataSource: '통장' },
  { nameEn: 'receivable_flow', nameKo: '채권 회수율', definition: '채권 회수율', formula: 'collected / total_receivable', dataSource: '미수금' },
  { nameEn: 'payable_flow', nameKo: '부채 상환율', definition: '부채 상환율', formula: 'paid / total_payable', dataSource: '미지급' },
  { nameEn: 'equity_flow', nameKo: '자본 증감률', definition: '자본 증감률', formula: 'Δequity / equity', dataSource: '계산' },
  { nameEn: 'income_flow', nameKo: '수입 성장률', definition: '수입 성장률', formula: 'this_month / last_month', dataSource: '매출' },
  { nameEn: 'expense_flow', nameKo: '지출 증감률', definition: '지출 증감률', formula: 'this_month / last_month', dataSource: '비용' },
  { nameEn: 'investment_flow', nameKo: '투자 증감률', definition: '투자 증감률', formula: 'this / last', dataSource: '투자' },
  { nameEn: 'return_flow', nameKo: '회수 증감률', definition: '회수 증감률', formula: 'this / last', dataSource: '수익' },
  { nameEn: 'customer_flow', nameKo: '고객 유입률', definition: '고객 유입률', formula: 'new / total', dataSource: 'CRM' },
  { nameEn: 'supplier_flow', nameKo: '공급자 변동률', definition: '공급자 변동률', formula: 'Δ / total', dataSource: '거래처' },
  { nameEn: 'competitor_flow', nameKo: '점유율 변화', definition: '점유율 변화', formula: 'my_share_Δ', dataSource: '시장' },
  { nameEn: 'partner_flow', nameKo: '협력 강도 변화', definition: '협력 강도 변화', formula: 'joint_revenue / total', dataSource: '계약' },

  // Inertia (관성) 25-36
  { nameEn: 'cash_inertia', nameKo: '현금 유지력', definition: '현금 유지력', formula: 'avg(3month) / current', dataSource: '통장' },
  { nameEn: 'receivable_inertia', nameKo: '미수금 고착도', definition: '미수금 고착도', formula: 'overdue / total', dataSource: '미수금' },
  { nameEn: 'payable_inertia', nameKo: '부채 고착도', definition: '부채 고착도', formula: 'long_term / total', dataSource: '미지급' },
  { nameEn: 'equity_inertia', nameKo: '자본 안정성', definition: '자본 안정성', formula: '1 - std(12month)', dataSource: '계산' },
  { nameEn: 'income_inertia', nameKo: '수입 안정성', definition: '수입 안정성 (반복 수입률)', formula: 'recurring / total', dataSource: '매출' },
  { nameEn: 'expense_inertia', nameKo: '고정비 비율', definition: '고정비 비율', formula: 'fixed / total', dataSource: '비용' },
  { nameEn: 'investment_inertia', nameKo: '투자 지속성', definition: '투자 지속성', formula: 'continuous / total', dataSource: '투자' },
  { nameEn: 'return_inertia', nameKo: '회수 안정성', definition: '회수 안정성', formula: 'avg(6month) / current', dataSource: '수익' },
  { nameEn: 'customer_inertia', nameKo: '고객 충성도', definition: '고객 충성도 (재구매율)', formula: 'repeat / total', dataSource: 'CRM' },
  { nameEn: 'supplier_inertia', nameKo: '공급 안정성', definition: '공급 안정성', formula: 'long_term / total', dataSource: '거래처' },
  { nameEn: 'competitor_inertia', nameKo: '경쟁 고착도', definition: '경쟁 고착도', formula: 'stable_share', dataSource: '시장' },
  { nameEn: 'partner_inertia', nameKo: '협력 지속성', definition: '협력 지속성', formula: 'long_term / total', dataSource: '계약' },

  // Acceleration (가속) 37-48
  { nameEn: 'cash_accel', nameKo: '현금 증감 가속', definition: '현금 증감 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '통장' },
  { nameEn: 'receivable_accel', nameKo: '채권 증감 가속', definition: '채권 증감 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '미수금' },
  { nameEn: 'payable_accel', nameKo: '부채 증감 가속', definition: '부채 증감 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '미지급' },
  { nameEn: 'equity_accel', nameKo: '자본 증감 가속', definition: '자본 증감 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '계산' },
  { nameEn: 'income_accel', nameKo: '수입 성장 가속', definition: '수입 성장 가속', formula: 'growth(t) - growth(t-1)', dataSource: '매출' },
  { nameEn: 'expense_accel', nameKo: '지출 증가 가속', definition: '지출 증가 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '비용' },
  { nameEn: 'investment_accel', nameKo: '투자 증가 가속', definition: '투자 증가 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '투자' },
  { nameEn: 'return_accel', nameKo: '회수 증가 가속', definition: '회수 증가 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '수익' },
  { nameEn: 'customer_accel', nameKo: '고객 증가 가속', definition: '고객 증가 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: 'CRM' },
  { nameEn: 'supplier_accel', nameKo: '공급자 변동 가속', definition: '공급자 변동 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '거래처' },
  { nameEn: 'competitor_accel', nameKo: '경쟁 강도 가속', definition: '경쟁 강도 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '시장' },
  { nameEn: 'partner_accel', nameKo: '협력 강화 가속', definition: '협력 강화 가속', formula: 'Δ(t) - Δ(t-1)', dataSource: '계약' },

  // Friction (마찰) 49-60
  { nameEn: 'cash_friction', nameKo: '현금 이동 비용', definition: '현금 이동 비용', formula: 'fee / transfer', dataSource: '수수료' },
  { nameEn: 'receivable_friction', nameKo: '채권 회수 비용', definition: '채권 회수 비용', formula: 'cost / collected', dataSource: '추심 비용' },
  { nameEn: 'payable_friction', nameKo: '부채 이자율', definition: '부채 이자율', formula: 'interest / principal', dataSource: '이자' },
  { nameEn: 'equity_friction', nameKo: '자본 조달 비용', definition: '자본 조달 비용', formula: 'cost / raised', dataSource: '금융 비용' },
  { nameEn: 'income_friction', nameKo: '수입 비용률', definition: '수입 비용률 (매출원가율)', formula: 'COGS / revenue', dataSource: '원가' },
  { nameEn: 'expense_friction', nameKo: '지출 낭비율', definition: '지출 낭비율', formula: 'waste / total', dataSource: '비효율' },
  { nameEn: 'investment_friction', nameKo: '투자 수수료', definition: '투자 수수료', formula: 'fee / investment', dataSource: '수수료' },
  { nameEn: 'return_friction', nameKo: '회수 세금률', definition: '회수 세금률', formula: 'tax / gross_return', dataSource: '세금' },
  { nameEn: 'customer_friction', nameKo: '고객 획득 비용', definition: '고객 획득 비용 (CAC)', formula: 'cost / new', dataSource: '마케팅' },
  { nameEn: 'supplier_friction', nameKo: '거래 비용', definition: '거래 비용', formula: 'cost / purchase', dataSource: '물류' },
  { nameEn: 'competitor_friction', nameKo: '경쟁 비용', definition: '경쟁 비용', formula: 'defensive_spend / revenue', dataSource: '마케팅' },
  { nameEn: 'partner_friction', nameKo: '협력 비용', definition: '협력 비용', formula: 'cost / joint_revenue', dataSource: '수수료' },

  // Gravity (인력) 61-72
  { nameEn: 'cash_gravity', nameKo: '현금 집중도', definition: '현금 집중도', formula: 'top_account / total', dataSource: '통장' },
  { nameEn: 'receivable_gravity', nameKo: '채권 집중도', definition: '채권 집중도', formula: 'top3 / total', dataSource: '미수금' },
  { nameEn: 'payable_gravity', nameKo: '부채 집중도', definition: '부채 집중도', formula: 'top_creditor / total', dataSource: '미지급' },
  { nameEn: 'equity_gravity', nameKo: '자본 집중도', definition: '자본 집중도', formula: 'top_investor / total', dataSource: '주주' },
  { nameEn: 'income_gravity', nameKo: '수입 집중도', definition: '수입 집중도', formula: 'top_customer / total', dataSource: '매출' },
  { nameEn: 'expense_gravity', nameKo: '지출 집중도', definition: '지출 집중도', formula: 'top_category / total', dataSource: '비용' },
  { nameEn: 'investment_gravity', nameKo: '투자 집중도', definition: '투자 집중도', formula: 'top / total', dataSource: '투자' },
  { nameEn: 'return_gravity', nameKo: '회수 집중도', definition: '회수 집중도', formula: 'top_source / total', dataSource: '수익' },
  { nameEn: 'customer_gravity', nameKo: '고객 집중도 (추천력)', definition: '고객 집중도 (추천력)', formula: 'referral / new', dataSource: 'CRM' },
  { nameEn: 'supplier_gravity', nameKo: '공급자 의존도', definition: '공급자 의존도', formula: 'top / total_purchase', dataSource: '거래처' },
  { nameEn: 'competitor_gravity', nameKo: '시장 집중도', definition: '시장 집중도', formula: 'top3_share', dataSource: '시장' },
  { nameEn: 'partner_gravity', nameKo: '협력 집중도', definition: '협력 집중도', formula: 'top / joint_total', dataSource: '계약' },
];

/**
 * 72개 노드 생성
 */
function generateNode72(lawIndex: number, propIndex: number): Node72 {
  const law = PHYSICS_LAW_LIST[lawIndex];
  const prop = ENTITY_PROPERTY_LIST[propIndex];
  const index = lawIndex * 12 + propIndex;
  const id = `n${String(index + 1).padStart(2, '0')}`;
  const def = NODE_DEFINITIONS[index];
  
  return {
    id,
    index,
    law,
    property: prop,
    name: def.nameEn,
    nameKo: def.nameKo,
    definition: def.definition,
    formula: def.formula,
    dataSource: def.dataSource,
    dbColumn: `${id}_${def.nameEn}`,
  };
}

// 72개 노드 전체 배열
export const ALL_72_NODES: Node72[] = [];
for (let lawIdx = 0; lawIdx < 6; lawIdx++) {
  for (let propIdx = 0; propIdx < 12; propIdx++) {
    ALL_72_NODES.push(generateNode72(lawIdx, propIdx));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. 노드 조회 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

export function getNodeById(id: string): Node72 | undefined {
  return ALL_72_NODES.find(n => n.id === id);
}

export function getNodeByIndex(index: number): Node72 | undefined {
  return ALL_72_NODES[index];
}

export function getNodeByCoords(lawIndex: number, propIndex: number): Node72 | undefined {
  return ALL_72_NODES[lawIndex * 12 + propIndex];
}

export function getNodesByLaw(lawId: string): Node72[] {
  return ALL_72_NODES.filter(n => n.law.id === lawId);
}

export function getNodesByProperty(propId: string): Node72[] {
  return ALL_72_NODES.filter(n => n.property.id === propId);
}

export function getNodeByName(name: string): Node72 | undefined {
  return ALL_72_NODES.find(n => n.name === name);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Legacy CubeCell (v2.0 호환)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CubeCell {
  coords: [number, number, number];
  nodeState: Node72;
  motion: Node72;
  timeIndex: number;
  interaction: string;
  resultForce: number;
}

/**
 * Legacy interaction calculation (v2.0 호환)
 */
export function calculateInteraction(nodeIndex: number, motionIndex: number): CubeCell {
  const nodeState = ALL_72_NODES[nodeIndex] || ALL_72_NODES[0];
  const motion = ALL_72_NODES[motionIndex] || ALL_72_NODES[0];
  
  let resultForce = 0;
  
  if (nodeState.law.id === motion.law.id) resultForce += 20;
  if (nodeState.property.id === motion.property.id) resultForce += 30;
  if (nodeState.property.category === motion.property.category) resultForce += 10;
  
  resultForce = Math.max(-100, Math.min(100, resultForce));
  
  return {
    coords: [nodeIndex, motionIndex, 0],
    nodeState,
    motion,
    timeIndex: 0,
    interaction: `${nodeState.nameKo} ← ${motion.nameKo}`,
    resultForce,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Pressure Cell (3D 좌표 - v2.5)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PressureCell {
  // 좌표
  nodeIndex: number;         // X: 0-71 (Pressure Indicator)
  costTypeIndex: number;     // Y: 0-5 (Cost Type)
  horizonIndex: number;      // Z: 0-4 (Irreversibility Horizon)
  
  // 참조
  node: Node72;
  costType: CostType;
  horizon: IrreversibilityHorizon;
  
  // 값
  pressure: number;          // 계산된 Pressure 값
  state: PressureState;      // 상태 분류
  
  // 컨텍스트
  deadlineDays: number;      // 마감까지 남은 일수
  estimatedLoss: number;     // 예상 손실액
  description: string;       // 설명
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. 요약 정보
// ═══════════════════════════════════════════════════════════════════════════════

export const PHYSICS_72_SUMMARY = {
  version: 'v2.5',
  name: 'Universal Pressure Map (UPM)',
  lastUpdated: '2025-01-09',
  
  // 72³ 아님! 72 × 6 × 5 = 2,160
  totalNodes: 72,
  totalCostTypes: 6,
  totalHorizons: 5,
  maxCells: 72 * 6 * 5, // 2,160
  
  // 핵심 정의
  coreDefinition: `
72³는 예측 엔진이 아니다.
72³는 대시보드도 아니다.
72³는 "결정을 미루면 손해가 확정되는 지점만 표시하는 레이더"다.
`,
  
  // 축 설명
  axes: {
    x: 'Pressure Indicator (72개) = 물리법칙 6 × 개체성질 12',
    y: 'Cost Type (6개) = 금전/신뢰/기회/인재/법적/평판',
    z: 'Irreversibility Horizon (5개) = 즉시/수일/수주/수개월/영구',
  },
  
  // 상태
  states: ['IGNORABLE', 'PRESSURING', 'IRREVERSIBLE'],
  
  // Pressure 공식
  pressureFormula: 'Pressure = Delay_Time × Exposure × Recovery_Difficulty',
  
  // LOCK 원칙
  lockPrinciples: [
    '72 = 물리법칙 6 × 개체성질 12 (고정)',
    '모든 노드는 측정 가능',
    '상태 = IGNORABLE / PRESSURING / IRREVERSIBLE',
    '예측 ❌, 마감 표시 ⭕',
    '학습 = Phase 3 사후 보정만',
    'UI = "미루면 비용 발생" 한 문장',
  ],
  
  // 폐기 항목
  deprecated: [
    'NORMAL/TENSION/CRITICAL (v2.0 상태명)',
    '72 × 72 × T 구조 (v2.0)',
    '예측/시뮬레이션',
    'ML/확률',
    '물리 법칙 "흉내"',
  ],
  
  // 매트릭스 시각화
  matrix: `
         │ CAS  REC  PAY  EQU  INC  EXP  INV  RET  CUS  SUP  COM  PAR
─────────┼──────────────────────────────────────────────────────────────
CON (보존)│ 01   02   03   04   05   06   07   08   09   10   11   12
FLO (흐름)│ 13   14   15   16   17   18   19   20   21   22   23   24
INE (관성)│ 25   26   27   28   29   30   31   32   33   34   35   36
ACC (가속)│ 37   38   39   40   41   42   43   44   45   46   47   48
FRI (마찰)│ 49   50   51   52   53   54   55   56   57   58   59   60
GRA (인력)│ 61   62   63   64   65   66   67   68   69   70   71   72
`,
};

console.log('🎯 AUTUS 72³ UPM v2.5 Loaded');
console.log(`  - ${PHYSICS_72_SUMMARY.totalNodes} pressure indicators`);
console.log(`  - ${PHYSICS_72_SUMMARY.totalCostTypes} cost types`);
console.log(`  - ${PHYSICS_72_SUMMARY.totalHorizons} horizons`);
console.log(`  - ${PHYSICS_72_SUMMARY.maxCells.toLocaleString()} max cells`);
