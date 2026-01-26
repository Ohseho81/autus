/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔬 KRATON Physics Engine
 * 
 * 핵심 수식:
 * - V = (M - T) × (1 + s)^t          (V-Index)
 * - R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α     (Risk Score)
 * - P = (M × I × A) / R              (Performance)
 * - V = P × Λ × e^(σt)               (Time Value)
 * - NRV = P × (T₃ - T₁ + T₂) × e^(σt) (Net Relationship Value)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Types
export * from './types';
export * from './time-types';

// V-Index Engine
export {
  calculateVIndex,
  calculateSatisfactionIndex,
  simulateVIndex,
  calculateVGrowthRate,
  calculateExitValuation,
  consolidateGlobalVIndex,
} from './v-index';

// Risk Engine
export {
  calculateRiskScore,
  riskScoreToState,
  calculateEstimatedLossValue,
  batchRiskAnalysis,
  analyzeRiskTrend,
} from './risk-engine';

// Chemistry Engine
export {
  analyzeChemistry,
  recommendOptimalMatching,
  learnFromMatchingHistory,
} from './chemistry';

// Time Value Engine (AUTUS 시간 측정 체계)
export {
  // λ (Lambda) - 노드 시간상수
  calculateLambda,
  calculateLambdaGrowth,
  adjustLambdaByPerformance,
  clampLambda,
  DEFAULT_LAMBDA_BY_ROLE,
  LAMBDA_CONSTRAINTS,
  
  // σ (Sigma) - 시너지 계수
  calculateSigma,
  getStyleCompatibility,
  calculateGoalAlignment,
  calculateSynergyMultiplier,
  calculateSaturatedSynergyMultiplier,
  STYLE_COMPATIBILITY_MATRIX,
  
  // P (Density) - 관계 밀도
  calculateDensity,
  frequencyToScore,
  applyDensityDecay,
  RELATIONSHIP_DEPTH_LEVELS,
  
  // STU 변환
  toSTU,
  stuToMoney,
  realTimeToMoney,
  calculateOmega,
  convertTime,
  
  // T₁, T₂, T₃ 측정
  calculateT1,
  calculateT2,
  calculateT3,
  calculateNetTimeValue,
  
  // MVP 공식 (v1.0 단순화)
  calculateSimpleValue,
  calculateMVPValue,
  
  // 관계 가치 계산 (Full Version)
  calculateRelationshipValue,
  calculateNetRelationshipValue,
  
  // 집계 및 분석
  aggregateNodeTimeValue,
  generateTimeValueDashboard,
} from './time-value';
