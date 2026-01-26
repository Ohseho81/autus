/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Main Export
 * 
 * V = P × Λ × e^(σt)
 * "META가 연결을 팔았다면, AUTUS는 시간을 증식한다"
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Types
export * from './types';

// Engine
export {
  // λ (Lambda)
  calculateLambda,
  getDefaultLambda,
  clampLambda,
  
  // σ (Sigma)
  calculateSigma,
  interpretSigma,
  
  // σ 역산 (NEW)
  calculateSigmaFromResults,
  compareSigma,
  
  // σ 프록시 예측 (NEW)
  predictSigmaFromProxy,
  assessProxyQuality,
  SIGMA_PROXY_WEIGHTS,
  
  // P (Density)
  calculateDensity,
  interpretDensity,
  
  // Synergy Multiplier
  calculateSynergyMultiplier,
  calculateSaturatedSynergyMultiplier,
  
  // V (Value)
  calculateValueMVP,
  calculateValueFull,
  
  // ω (Omega)
  calculateOmega,
  stuToKRW,
  realTimeToSTU,
  
  // NTV
  calculateNTV,
  interpretNTV,
  
  // 효율 (NEW)
  calculateEfficiency,
  interpretEfficiency,
  
  // 이탈 위험 (NEW)
  calculateChurnRisk,
  
  // Utils
  getMonthsDiff,
  getRelationKey,
  sortByValue,
  sortBySigma,
} from './engine';

// Types for new features
export type { SigmaProxyIndicators } from './engine';

// Calculator
export {
  calculateOrgValue,
  simulateAcademy,
} from './calculator';
