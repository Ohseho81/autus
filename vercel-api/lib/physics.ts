// ============================================
// AUTUS Physics Engine v2.2 (TypeScript)
// V = (M - T) × (1 + s)^t
// ============================================

// Constants
export const PHYSICS = {
  TAU_SLOW: 2.0,
  TAU_FAST: 0.3,
  FRICTION_COEF: 0.02,
  ENTROPY_THRESHOLD: 0.7,
  V_GROWTH_THRESHOLD: 0.15,
  STANDARD_EFFECTIVENESS: 0.80,
  STANDARD_USAGE_COUNT: 50,
};

// Impulse Profiles
export type ImpulseType = 'RECOVER' | 'DEFRICTION' | 'SHOCK_DAMP';

export const IMPULSE_PROFILES: Record<ImpulseType, {
  dMint: number;
  dTax: number;
  dSynergy: number;
  dEntropy: number;
  tau: number;
  description: string;
}> = {
  RECOVER: {
    dMint: 0.15,
    dTax: -0.05,
    dSynergy: 0.02,
    dEntropy: -0.1,
    tau: PHYSICS.TAU_FAST,
    description: '긴급 회복: 빠른 가치 상승 + 엔트로피 감소'
  },
  DEFRICTION: {
    dMint: 0.05,
    dTax: -0.15,
    dSynergy: 0.05,
    dEntropy: -0.05,
    tau: PHYSICS.TAU_SLOW,
    description: '마찰 제거: 비용 대폭 감소 + 시너지 상승'
  },
  SHOCK_DAMP: {
    dMint: 0,
    dTax: 0.05,
    dSynergy: -0.02,
    dEntropy: -0.2,
    tau: PHYSICS.TAU_FAST,
    description: '충격 흡수: 비용 투입으로 엔트로피 급감'
  }
};

// Types
export interface OrganismState {
  mint: number;      // M (Output Value)
  tax: number;       // T (Input Cost)
  synergy: number;   // s (Connection Coefficient)
  entropy: number;   // Entropy (Disorder)
  velocity: number;  // V Growth Rate
  friction: number;  // Friction (Resistance)
}

export interface VResult {
  value: number;
  growth: number;
  status: 'urgent' | 'warning' | 'stable' | 'opportunity';
  urgency: number;
}

// ============================================
// Core Functions
// ============================================

/**
 * V = (M - T) × (1 + s)^t 계산
 */
export function calculateV(
  mint: number,
  tax: number,
  synergy: number,
  time: number = 1
): number {
  const base = mint - tax;
  const multiplier = Math.pow(1 + synergy, time);
  return base * multiplier;
}

/**
 * V 성장률 계산
 */
export function calculateVGrowth(
  before: { mint: number; tax: number; synergy: number },
  after: { mint: number; tax: number; synergy: number },
  time: number = 1
): number {
  const vBefore = calculateV(before.mint, before.tax, before.synergy, time);
  const vAfter = calculateV(after.mint, after.tax, after.synergy, time);
  
  if (vBefore === 0) return vAfter > 0 ? 1 : 0;
  return (vAfter - vBefore) / Math.abs(vBefore);
}

/**
 * 상태 판정
 */
export function determineStatus(state: OrganismState): VResult['status'] {
  const v = calculateV(state.mint, state.tax, state.synergy);
  
  if (state.entropy > PHYSICS.ENTROPY_THRESHOLD || v < 0) {
    return 'urgent';
  }
  if (state.entropy > 0.5 || state.velocity < 0) {
    return 'warning';
  }
  if (state.velocity > 0.1 && state.synergy > 0.3) {
    return 'opportunity';
  }
  return 'stable';
}

/**
 * 긴급도 계산 (0~1)
 */
export function calculateUrgency(state: OrganismState): number {
  const v = calculateV(state.mint, state.tax, state.synergy);
  const vComponent = v < 0 ? 1 : Math.max(0, 1 - v / 100000);
  const entropyComponent = state.entropy;
  const velocityComponent = state.velocity < 0 ? Math.abs(state.velocity) : 0;
  
  return Math.min(1, (vComponent * 0.4) + (entropyComponent * 0.4) + (velocityComponent * 0.2));
}

/**
 * Impulse 적용
 */
export function applyImpulse(
  state: OrganismState,
  impulseType: ImpulseType,
  intensity: number = 1.0
): OrganismState {
  const profile = IMPULSE_PROFILES[impulseType];
  
  return {
    mint: Math.max(0, state.mint * (1 + profile.dMint * intensity)),
    tax: Math.max(0, state.tax * (1 + profile.dTax * intensity)),
    synergy: Math.max(0, Math.min(1, state.synergy + profile.dSynergy * intensity)),
    entropy: Math.max(0, Math.min(1, state.entropy + profile.dEntropy * intensity)),
    velocity: state.velocity + (profile.dMint - profile.dTax) * intensity * 0.1,
    friction: Math.max(0, state.friction + profile.dTax * intensity * 0.5)
  };
}

/**
 * 최적 Impulse 추천
 */
export function recommendImpulse(state: OrganismState): ImpulseType {
  const v = calculateV(state.mint, state.tax, state.synergy);
  
  // 긴급 상황: 엔트로피 급등 또는 V 음수
  if (state.entropy > PHYSICS.ENTROPY_THRESHOLD || v < 0) {
    return 'SHOCK_DAMP';
  }
  
  // 비용 과다: T가 M의 80% 이상
  if (state.tax > state.mint * 0.8) {
    return 'DEFRICTION';
  }
  
  // 성장 필요: 나머지 경우
  return 'RECOVER';
}

/**
 * 실효성 점수 계산 (합의 엔진용)
 */
export function calculateEffectiveness(
  deltaM: number,     // M 증가율
  deltaT: number,     // T 감소율
  usageNorm: number,  // 사용 빈도 정규화 (0~1)
  deltaS: number      // s 증가율
): number {
  // 정규화
  const deltaMNorm = Math.min(2.0, Math.max(0, deltaM));
  const deltaTNorm = Math.min(0.95, Math.max(0, deltaT));
  const deltaSNorm = Math.min(1.0, Math.max(0, deltaS));
  
  // 가중 합산
  return (
    0.40 * deltaMNorm +
    0.40 * deltaTNorm +
    0.10 * usageNorm +
    0.10 * deltaSNorm
  );
}

/**
 * 표준 솔루션 자격 판정
 */
export function checkStandardQualification(
  effectiveness: number,
  usageCount: number,
  avgVGrowth: number
): boolean {
  return (
    effectiveness >= PHYSICS.STANDARD_EFFECTIVENESS &&
    usageCount >= PHYSICS.STANDARD_USAGE_COUNT &&
    avgVGrowth >= PHYSICS.V_GROWTH_THRESHOLD
  );
}

/**
 * 물리 상태 요약
 */
export function summarizeState(state: OrganismState): VResult {
  const value = calculateV(state.mint, state.tax, state.synergy);
  const status = determineStatus(state);
  const urgency = calculateUrgency(state);
  
  return {
    value,
    growth: state.velocity,
    status,
    urgency
  };
}

/**
 * τ 기반 지수 접근 (애니메이션용)
 */
export function lerpTau(
  current: number,
  target: number,
  dt: number,
  tau: number
): number {
  const alpha = 1 - Math.exp(-dt / tau);
  return current + (target - current) * alpha;
}
