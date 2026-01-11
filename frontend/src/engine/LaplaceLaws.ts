/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 라플라스 법칙 체계 (Laplacian Law System)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "우주의 현재 상태를 완전히 알고 있는 지성이 있다면,
 *  그 지성은 과거와 미래를 모두 계산할 수 있다." - 라플라스
 * 
 * AUTUS = 닫힌 시스템
 * - 경계: 사용자가 상호작용하는 범위
 * - 변수: 72개 노드 (측정 가능)
 * - 법칙: 6개 (결정론적)
 * - 예측: State(t) + Law + Params → State(t+1)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 법칙 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type LawTier = 'INVARIANT' | 'QUASI_INVARIANT' | 'LEARNABLE';

export interface LaplaceLaw {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  symbol: string;
  color: string;
  tier: LawTier;
  
  // 수학적 정의
  formula: string;           // 공식 표기
  equation: string;          // 상세 방정식
  description: string;       // 설명
  
  // 비즈니스 적용
  application: string[];     // 적용 예시
  
  // 관련 노드
  primaryNodes: string[];    // 주요 관련 노드 (n01, n05 등)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6개 라플라스 법칙
// ═══════════════════════════════════════════════════════════════════════════════

export const LAPLACE_LAWS: Record<string, LaplaceLaw> = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제1법칙: 보존 (Conservation)
  // ═══════════════════════════════════════════════════════════════════════════
  CONSERVATION: {
    id: 'CONSERVATION',
    index: 0,
    name: '보존',
    nameEn: 'Conservation',
    symbol: '⚖️',
    color: '#3b82f6',
    tier: 'INVARIANT',
    
    formula: 'ΔStock = Flow_in - Flow_out',
    equation: 'S(t+1) = S(t) + ∫[F_in(τ) - F_out(τ)]dτ',
    description: '에너지/물질/돈은 생성되거나 소멸되지 않는다. 들어온 만큼 나간다.',
    
    application: [
      'Δ현금 = 수입 - 지출',
      'Δ고객 = 신규 - 이탈',
      'Δ강사 = 채용 - 퇴사',
      'A의 지출 = B의 수입 (작용-반작용)',
    ],
    
    primaryNodes: ['n01', 'n02', 'n03', 'n04', 'n05', 'n06', 'n09', 'n10', 'n11', 'n12'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제2법칙: 엔트로피 (Entropy)
  // ═══════════════════════════════════════════════════════════════════════════
  ENTROPY: {
    id: 'ENTROPY',
    index: 1,
    name: '엔트로피',
    nameEn: 'Entropy',
    symbol: '🌀',
    color: '#8b5cf6',
    tier: 'QUASI_INVARIANT',
    
    formula: 'dS/dt > 0 (외부 개입 없으면)',
    equation: 'Disorder(t+1) = Disorder(t) × (1 + λ) - Effort(t)',
    description: '폐쇄계에서 무질서는 항상 증가한다. 유지하려면 에너지(노력/비용)가 필요하다.',
    
    application: [
      '관리 안 하면 고객 이탈 증가',
      '관리 안 하면 강사 불만 증가',
      '관리 안 하면 시스템 붕괴',
      '유지 비용 = 엔트로피 저항 비용',
    ],
    
    primaryNodes: ['n33', 'n34', 'n29', 'n30', 'n31', 'n32'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제3법칙: 관성 (Inertia)
  // ═══════════════════════════════════════════════════════════════════════════
  INERTIA: {
    id: 'INERTIA',
    index: 2,
    name: '관성',
    nameEn: 'Inertia',
    symbol: '🔄',
    color: '#06b6d4',
    tier: 'LEARNABLE',
    
    formula: 'F = m × a (변화 = 힘 / 저항)',
    equation: 'a = ΔV/Δt = F/m, where m = 관성계수',
    description: '물체는 현재 상태를 유지하려 한다. 변화에는 힘이 필요하다.',
    
    application: [
      '습관 변화에는 큰 힘 필요',
      '기존 패턴은 유지되려 함',
      '가속도 = 투입한 힘 / 기존 관성',
      '관성 계수 m은 개체마다 다름 → 학습',
    ],
    
    primaryNodes: ['n25', 'n26', 'n27', 'n28', 'n29', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제4법칙: 마찰 (Friction)
  // ═══════════════════════════════════════════════════════════════════════════
  FRICTION: {
    id: 'FRICTION',
    index: 3,
    name: '마찰',
    nameEn: 'Friction',
    symbol: '⚡',
    color: '#f59e0b',
    tier: 'LEARNABLE',
    
    formula: 'Loss = μ × Transfer',
    equation: 'Net = Gross × (1 - μ), where μ = 마찰계수',
    description: '모든 이동에는 손실이 있다. 수수료, 세금, 시간, 노력.',
    
    application: [
      '결제 수수료 = μ × 거래액',
      '영업 비용 = μ × 매출',
      'CAC = μ × 마케팅 투입',
      '마찰 계수 μ는 거래마다 다름 → 학습',
    ],
    
    primaryNodes: ['n49', 'n50', 'n51', 'n52', 'n53', 'n54', 'n55', 'n56', 'n57', 'n58', 'n59', 'n60'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제5법칙: 중력 (Gravity)
  // ═══════════════════════════════════════════════════════════════════════════
  GRAVITY: {
    id: 'GRAVITY',
    index: 4,
    name: '중력',
    nameEn: 'Gravity',
    symbol: '🌑',
    color: '#1f2937',
    tier: 'LEARNABLE',
    
    formula: 'F = G × (m₁ × m₂) / r²',
    equation: 'Attraction = G × (Size_A × Size_B) / Distance²',
    description: '큰 것이 작은 것을 끌어당긴다. 네트워크 효과, 집중도.',
    
    application: [
      '큰 고객이 작은 고객 끌어옴 (추천)',
      '큰 학원이 작은 학원 흡수 (경쟁)',
      '집중도가 높을수록 의존도 위험',
      '중력 상수 G는 네트워크마다 다름 → 학습',
    ],
    
    primaryNodes: ['n61', 'n62', 'n63', 'n64', 'n65', 'n66', 'n67', 'n68', 'n69', 'n70', 'n71', 'n72'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 제6법칙: 임계 (Threshold / Phase Transition)
  // ═══════════════════════════════════════════════════════════════════════════
  THRESHOLD: {
    id: 'THRESHOLD',
    index: 5,
    name: '임계',
    nameEn: 'Threshold',
    symbol: '⚠️',
    color: '#ef4444',
    tier: 'LEARNABLE',
    
    formula: 'If X < θ: Phase Transition (급변)',
    equation: 'State = f(X) where f is discontinuous at θ',
    description: '특정 지점을 넘으면 급격한 상태 변화가 발생한다.',
    
    application: [
      '충성도 < 65%: 연쇄 이탈 시작',
      '현금 < 1개월 운영비: 붕괴 시작',
      '핵심 의존도 > 50%: 이탈 시 붕괴',
      '임계점 θ는 도메인마다 다름 → 학습',
    ],
    
    primaryNodes: ['n33', 'n70', 'n01', 'n41', 'n47'],
  },
};

export const LAPLACE_LAW_LIST = Object.values(LAPLACE_LAWS);

// ═══════════════════════════════════════════════════════════════════════════════
// 법칙 계층
// ═══════════════════════════════════════════════════════════════════════════════

export const LAW_TIERS = {
  INVARIANT: {
    name: '불변 (Invariant)',
    description: '항상 성립, 예외 없음. 방정식의 기본 구조.',
    laws: ['CONSERVATION'],
    color: '#3b82f6',
  },
  QUASI_INVARIANT: {
    name: '준불변 (Quasi-Invariant)',
    description: '방향은 확정, 크기는 가변. 부등식 제약.',
    laws: ['ENTROPY'],
    color: '#8b5cf6',
  },
  LEARNABLE: {
    name: '학습 가능 (Learnable)',
    description: '데이터로 학습. 개체별 파라미터.',
    laws: ['INERTIA', 'FRICTION', 'GRAVITY', 'THRESHOLD'],
    color: '#f59e0b',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학습 파라미터 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

export interface LearnableParams {
  // 관성 계수 (Inertia)
  inertia: {
    customer: number;    // 고객 관성 (0~1)
    supplier: number;    // 공급자 관성
    income: number;      // 수입 관성
    expense: number;     // 지출 관성
  };
  
  // 마찰 계수 (Friction)
  friction: {
    payment: number;     // 결제 마찰 (수수료율)
    acquisition: number; // 고객 획득 마찰 (CAC)
    operation: number;   // 운영 마찰
    competition: number; // 경쟁 마찰
  };
  
  // 중력 상수 (Gravity)
  gravity: {
    referral: number;    // 추천 중력
    market: number;      // 시장 중력
    concentration: number; // 집중도 중력
  };
  
  // 임계점 (Threshold)
  threshold: {
    loyalty: number;     // 충성도 임계점 (0.65)
    cash: number;        // 현금 임계점 (1개월 운영비)
    dependency: number;  // 의존도 임계점 (0.50)
    growth: number;      // 성장 임계점
  };
  
  // 엔트로피 증가율
  entropyRate: number;   // λ (0.01~0.05)
}

// 기본 파라미터 (학원 도메인)
export const DEFAULT_PARAMS: LearnableParams = {
  inertia: {
    customer: 0.85,      // 고객 85% 유지 관성
    supplier: 0.75,      // 강사 75% 유지 관성
    income: 0.90,        // 수입 90% 유지 관성
    expense: 0.95,       // 지출 95% 유지 관성 (고정비)
  },
  friction: {
    payment: 0.025,      // 2.5% 결제 수수료
    acquisition: 50000,  // CAC 5만원
    operation: 0.15,     // 운영비율 15%
    competition: 0.08,   // 경쟁비용 8%
  },
  gravity: {
    referral: 0.35,      // 추천율 35%
    market: 0.10,        // 시장 효과 10%
    concentration: 0.30, // 집중도 30%
  },
  threshold: {
    loyalty: 0.65,       // 충성도 임계 65%
    cash: 10000000,      // 현금 임계 1천만원
    dependency: 0.50,    // 의존도 임계 50%
    growth: -0.15,       // 성장 임계 -15%
  },
  entropyRate: 0.02,     // 월 2% 엔트로피 증가
};

// ═══════════════════════════════════════════════════════════════════════════════
// 방정식 체계
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateVector {
  [nodeId: string]: number;  // n01 ~ n72
}

export interface StateTransition {
  currentState: StateVector;
  nextState: StateVector;
  actions: Action[];
  params: LearnableParams;
  timestamp: Date;
}

export interface Action {
  type: string;              // 'marketing', 'retention', 'hiring', etc.
  target: string;            // 대상 노드
  intensity: number;         // 강도 (0~1)
  cost: number;              // 비용
}

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 방정식: State(t+1) = f(State(t), Action(t), Law, Params)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 제1법칙 적용: 보존
 * ΔStock = Flow_in - Flow_out
 */
export function applyConservation(
  current: number,
  flowIn: number,
  flowOut: number
): number {
  return current + flowIn - flowOut;
}

/**
 * 제2법칙 적용: 엔트로피
 * Disorder(t+1) = Disorder(t) × (1 + λ) - Effort
 */
export function applyEntropy(
  current: number,       // 현재 질서 수준 (0~1, 높을수록 좋음)
  entropyRate: number,   // λ
  effort: number         // 투입 노력 (0~1)
): number {
  // 엔트로피 증가 (질서 감소)
  const decay = current * entropyRate;
  // 노력으로 엔트로피 저항
  const resistance = effort * entropyRate * 1.5; // 노력은 1.5배 효과
  
  const next = current - decay + resistance;
  return Math.max(0, Math.min(1, next));
}

/**
 * 제3법칙 적용: 관성
 * a = F / m (변화 = 힘 / 저항)
 */
export function applyInertia(
  current: number,
  force: number,         // 변화 시키려는 힘
  inertiaMass: number    // 관성 질량 (높을수록 변화 어려움)
): number {
  const acceleration = force / Math.max(0.1, inertiaMass);
  return current + acceleration;
}

/**
 * 제4법칙 적용: 마찰
 * Net = Gross × (1 - μ)
 */
export function applyFriction(
  gross: number,
  frictionCoef: number   // μ
): number {
  return gross * (1 - frictionCoef);
}

/**
 * 제5법칙 적용: 중력
 * Attraction = G × (m₁ × m₂) / r²
 */
export function applyGravity(
  size1: number,
  size2: number,
  distance: number,
  gravityConst: number   // G
): number {
  const minDistance = 0.1; // 거리 최소값 (0 방지)
  return gravityConst * (size1 * size2) / Math.pow(Math.max(distance, minDistance), 2);
}

/**
 * 제6법칙 적용: 임계
 * Phase Transition at θ
 */
export function applyThreshold(
  value: number,
  threshold: number,
  direction: 'below' | 'above' = 'below'
): { crossed: boolean; severity: number } {
  const crossed = direction === 'below' 
    ? value < threshold 
    : value > threshold;
  
  // 임계점 대비 심각도 (0~1)
  const severity = crossed
    ? direction === 'below'
      ? (threshold - value) / threshold
      : (value - threshold) / threshold
    : 0;
  
  return { crossed, severity: Math.min(1, Math.abs(severity)) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 고객 수 예측 예시
// ═══════════════════════════════════════════════════════════════════════════════

export interface CustomerPredictionInput {
  currentCustomers: number;
  marketingSpend: number;
  cac: number;
  referralRate: number;
  loyalty: number;
  competitionPressure: number;
  serviceQuality: number;
  marketEffect: number;
}

/**
 * 고객 수 예측 (라플라스 법칙 적용)
 */
export function predictCustomerCount(
  input: CustomerPredictionInput,
  params: LearnableParams
): { nextCount: number; newCustomers: number; churn: number; breakdown: Record<string, number> } {
  
  // 신규 고객 = f(marketing, referral, market)
  const fromMarketing = input.marketingSpend / Math.max(1, input.cac);
  const fromReferral = input.currentCustomers * input.referralRate * params.gravity.referral;
  const fromMarket = input.currentCustomers * input.marketEffect * params.gravity.market;
  
  const newCustomers = fromMarketing + fromReferral + fromMarket;
  
  // 이탈 고객 = g(loyalty, competition, service)
  // 엔트로피 적용: 관리 안 하면 이탈 증가
  const baseChurnRate = 1 - input.loyalty;
  const entropyEffect = params.entropyRate;
  const competitionEffect = input.competitionPressure * params.friction.competition;
  const serviceEffect = (1 - input.serviceQuality) * 0.1;
  
  const churnRate = baseChurnRate + entropyEffect + competitionEffect + serviceEffect;
  const churn = input.currentCustomers * Math.min(0.5, churnRate); // 최대 50% 이탈
  
  // 임계점 확인
  const thresholdCheck = applyThreshold(input.loyalty, params.threshold.loyalty, 'below');
  
  // 임계점 초과 시 연쇄 이탈
  let additionalChurn = 0;
  if (thresholdCheck.crossed) {
    additionalChurn = input.currentCustomers * thresholdCheck.severity * 0.2;
  }
  
  // 보존 법칙: Δ고객 = 신규 - 이탈
  const delta = newCustomers - churn - additionalChurn;
  const nextCount = Math.max(0, input.currentCustomers + delta);
  
  return {
    nextCount: Math.round(nextCount),
    newCustomers: Math.round(newCustomers),
    churn: Math.round(churn + additionalChurn),
    breakdown: {
      fromMarketing: Math.round(fromMarketing),
      fromReferral: Math.round(fromReferral),
      fromMarket: Math.round(fromMarket),
      baseChurn: Math.round(input.currentCustomers * baseChurnRate),
      entropyChurn: Math.round(input.currentCustomers * entropyEffect),
      competitionChurn: Math.round(input.currentCustomers * competitionEffect),
      thresholdChurn: Math.round(additionalChurn),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 요약
// ═══════════════════════════════════════════════════════════════════════════════

export const LAPLACE_SUMMARY = {
  name: 'AUTUS Laplacian Law System',
  version: 'v3.0',
  
  core: `
"우주의 현재 상태를 완전히 알고 있는 지성이 있다면,
 그 지성은 과거와 미래를 모두 계산할 수 있다."

AUTUS = 닫힌 시스템
- 경계: 사용자 상호작용 범위
- 변수: 72개 노드 (측정 가능)
- 법칙: 6개 (결정론적)
- 예측: State(t) + Law + Params → State(t+1)
`,
  
  laws: [
    { name: '보존', formula: 'ΔStock = Flow_in - Flow_out', tier: 'INVARIANT' },
    { name: '엔트로피', formula: 'dS/dt > 0', tier: 'QUASI_INVARIANT' },
    { name: '관성', formula: 'F = m × a', tier: 'LEARNABLE' },
    { name: '마찰', formula: 'Loss = μ × Transfer', tier: 'LEARNABLE' },
    { name: '중력', formula: 'F = G × (m₁ × m₂) / r²', tier: 'LEARNABLE' },
    { name: '임계', formula: 'If X < θ: Phase Transition', tier: 'LEARNABLE' },
  ],
  
  stateEquation: 'State(t+1) = f(State(t), Action(t), Law, Params)',
  
  tiers: {
    invariant: '항상 성립, 예외 없음',
    quasiInvariant: '방향 확정, 크기 가변',
    learnable: '데이터로 학습, 개체별 파라미터',
  },
};

console.log('🧮 AUTUS Laplace Laws v3.0 Loaded');
console.log('  - 6 Laws: Conservation, Entropy, Inertia, Friction, Gravity, Threshold');
console.log('  - State(t+1) = f(State(t), Action(t), Law, Params)');
