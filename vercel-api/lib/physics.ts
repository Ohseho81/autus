// ============================================
// AUTUS Physics Engine v2.3 (TypeScript)
// V = (Motions - Threats) × (1 + Relations)^t × Base × InteractionExponent
// 
// 용어 통일 (v2.3):
// - Mint → Motions (M: 생성 가치)
// - Tax → Threats (T: 비용/위험)
// - Synergy → Relations (s: 관계 계수)
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
  DEFAULT_BASE: 1.0,
  DEFAULT_INTERACTION_EXPONENT: 0.10,
};

// Impulse Profiles
export type ImpulseType = 'RECOVER' | 'DEFRICTION' | 'SHOCK_DAMP';

export const IMPULSE_PROFILES: Record<ImpulseType, {
  dMotions: number;
  dThreats: number;
  dRelations: number;
  dEntropy: number;
  tau: number;
  description: string;
  // Legacy aliases for backward compatibility
  dMint?: number;
  dTax?: number;
  dSynergy?: number;
}> = {
  RECOVER: {
    dMotions: 0.15,
    dThreats: -0.05,
    dRelations: 0.02,
    dEntropy: -0.1,
    tau: PHYSICS.TAU_FAST,
    description: '긴급 회복: 빠른 가치 상승 + 엔트로피 감소',
    // Legacy
    dMint: 0.15,
    dTax: -0.05,
    dSynergy: 0.02,
  },
  DEFRICTION: {
    dMotions: 0.05,
    dThreats: -0.15,
    dRelations: 0.05,
    dEntropy: -0.05,
    tau: PHYSICS.TAU_SLOW,
    description: '마찰 제거: 비용 대폭 감소 + 관계 상승',
    // Legacy
    dMint: 0.05,
    dTax: -0.15,
    dSynergy: 0.05,
  },
  SHOCK_DAMP: {
    dMotions: 0,
    dThreats: 0.05,
    dRelations: -0.02,
    dEntropy: -0.2,
    tau: PHYSICS.TAU_FAST,
    description: '충격 흡수: 비용 투입으로 엔트로피 급감',
    // Legacy
    dMint: 0,
    dTax: 0.05,
    dSynergy: -0.02,
  }
};

// Types
export interface OrganismState {
  // 새로운 용어 (v2.3)
  motions: number;     // M (Output Value, 생성 가치)
  threats: number;     // T (Input Cost, 비용/위험)
  relations: number;   // s (Connection Coefficient, 관계 계수)
  entropy: number;     // Entropy (Disorder)
  velocity: number;    // V Growth Rate
  friction: number;    // Friction (Resistance)
  // V2.3 추가 필드
  base?: number;       // Base value (패시브 상수)
  interactionExponent?: number; // 상호지수
  // Legacy aliases (하위 호환성)
  mint?: number;
  tax?: number;
  synergy?: number;
}

export interface VResult {
  value: number;
  growth: number;
  status: 'urgent' | 'warning' | 'stable' | 'opportunity';
  urgency: number;
}

// ============================================
// Core Functions (v2.3 - 용어 통일)
// ============================================

/**
 * V = (Motions - Threats) × (1 + InteractionExponent × Relations)^t × Base
 * 
 * @param motions - M: 생성 가치 (이전: mint)
 * @param threats - T: 비용/위험 (이전: tax)
 * @param relations - s: 관계 계수 (이전: synergy)
 * @param time - t: 시간 (기본값: 1)
 * @param base - Base 상수 (기본값: 1.0)
 * @param interactionExponent - 상호지수 (기본값: 0.10)
 */
export function calculateV(
  motions: number,
  threats: number,
  relations: number,
  time: number = 1,
  base: number = PHYSICS.DEFAULT_BASE,
  interactionExponent: number = PHYSICS.DEFAULT_INTERACTION_EXPONENT
): number {
  const netValue = motions - threats;
  const multiplier = Math.pow(1 + (interactionExponent * relations), time);
  return netValue * multiplier * base;
}

/**
 * Legacy calculateV for backward compatibility
 * @deprecated Use calculateV with new parameter names
 */
export function calculateVLegacy(
  mint: number,
  tax: number,
  synergy: number,
  time: number = 1
): number {
  return calculateV(mint, tax, synergy, time, 1.0, 1.0);
}

/**
 * V 성장률 계산
 */
export function calculateVGrowth(
  before: { motions: number; threats: number; relations: number; base?: number; interactionExponent?: number },
  after: { motions: number; threats: number; relations: number; base?: number; interactionExponent?: number },
  time: number = 1
): number {
  const vBefore = calculateV(
    before.motions, before.threats, before.relations, time,
    before.base ?? PHYSICS.DEFAULT_BASE,
    before.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT
  );
  const vAfter = calculateV(
    after.motions, after.threats, after.relations, time,
    after.base ?? PHYSICS.DEFAULT_BASE,
    after.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT
  );
  
  if (vBefore === 0) return vAfter > 0 ? 1 : 0;
  return (vAfter - vBefore) / Math.abs(vBefore);
}

/**
 * 상태 판정
 */
export function determineStatus(state: OrganismState): VResult['status'] {
  const motions = state.motions ?? state.mint ?? 0;
  const threats = state.threats ?? state.tax ?? 0;
  const relations = state.relations ?? state.synergy ?? 0.5;
  const base = state.base ?? PHYSICS.DEFAULT_BASE;
  const interactionExponent = state.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
  
  const v = calculateV(motions, threats, relations, 1, base, interactionExponent);
  
  if (state.entropy > PHYSICS.ENTROPY_THRESHOLD || v < 0) {
    return 'urgent';
  }
  if (state.entropy > 0.5 || state.velocity < 0) {
    return 'warning';
  }
  if (state.velocity > 0.1 && relations > 0.3) {
    return 'opportunity';
  }
  return 'stable';
}

/**
 * 긴급도 계산 (0~1)
 */
export function calculateUrgency(state: OrganismState): number {
  const motions = state.motions ?? state.mint ?? 0;
  const threats = state.threats ?? state.tax ?? 0;
  const relations = state.relations ?? state.synergy ?? 0.5;
  const base = state.base ?? PHYSICS.DEFAULT_BASE;
  const interactionExponent = state.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
  
  const v = calculateV(motions, threats, relations, 1, base, interactionExponent);
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
  const motions = state.motions ?? state.mint ?? 0;
  const threats = state.threats ?? state.tax ?? 0;
  const relations = state.relations ?? state.synergy ?? 0.5;
  
  const newMotions = Math.max(0, motions * (1 + profile.dMotions * intensity));
  const newThreats = Math.max(0, threats * (1 + profile.dThreats * intensity));
  const newRelations = Math.max(0, Math.min(1, relations + profile.dRelations * intensity));
  
  return {
    // 새로운 용어 (v2.3)
    motions: newMotions,
    threats: newThreats,
    relations: newRelations,
    entropy: Math.max(0, Math.min(1, state.entropy + profile.dEntropy * intensity)),
    velocity: state.velocity + (profile.dMotions - profile.dThreats) * intensity * 0.1,
    friction: Math.max(0, state.friction + profile.dThreats * intensity * 0.5),
    base: state.base ?? PHYSICS.DEFAULT_BASE,
    interactionExponent: state.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT,
    // Legacy aliases
    mint: newMotions,
    tax: newThreats,
    synergy: newRelations,
  };
}

/**
 * 최적 Impulse 추천
 */
export function recommendImpulse(state: OrganismState): ImpulseType {
  const motions = state.motions ?? state.mint ?? 0;
  const threats = state.threats ?? state.tax ?? 0;
  const relations = state.relations ?? state.synergy ?? 0.5;
  const base = state.base ?? PHYSICS.DEFAULT_BASE;
  const interactionExponent = state.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
  
  const v = calculateV(motions, threats, relations, 1, base, interactionExponent);
  
  // 긴급 상황: 엔트로피 급등 또는 V 음수
  if (state.entropy > PHYSICS.ENTROPY_THRESHOLD || v < 0) {
    return 'SHOCK_DAMP';
  }
  
  // 비용 과다: Threats가 Motions의 80% 이상
  if (threats > motions * 0.8) {
    return 'DEFRICTION';
  }
  
  // 성장 필요: 나머지 경우
  return 'RECOVER';
}

/**
 * 실효성 점수 계산 (합의 엔진용)
 * 
 * @param deltaMotions - Motions 증가율 (이전: deltaM)
 * @param deltaThreats - Threats 감소율 (이전: deltaT)
 * @param usageNorm - 사용 빈도 정규화 (0~1)
 * @param deltaRelations - Relations 증가율 (이전: deltaS)
 */
export function calculateEffectiveness(
  deltaMotions: number,     // Motions 증가율
  deltaThreats: number,     // Threats 감소율
  usageNorm: number,        // 사용 빈도 정규화 (0~1)
  deltaRelations: number    // Relations 증가율
): number {
  // 정규화
  const deltaMotionsNorm = Math.min(2.0, Math.max(0, deltaMotions));
  const deltaThreatsNorm = Math.min(0.95, Math.max(0, deltaThreats));
  const deltaRelationsNorm = Math.min(1.0, Math.max(0, deltaRelations));
  
  // 가중 합산
  return (
    0.40 * deltaMotionsNorm +
    0.40 * deltaThreatsNorm +
    0.10 * usageNorm +
    0.10 * deltaRelationsNorm
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
  const motions = state.motions ?? state.mint ?? 0;
  const threats = state.threats ?? state.tax ?? 0;
  const relations = state.relations ?? state.synergy ?? 0.5;
  const base = state.base ?? PHYSICS.DEFAULT_BASE;
  const interactionExponent = state.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
  
  const value = calculateV(motions, threats, relations, 1, base, interactionExponent);
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
