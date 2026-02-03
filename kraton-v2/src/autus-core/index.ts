/**
 * 🚀 AUTUS Core
 *
 * Brand OS Factory
 * 고객의 비가역 행동만으로 프로세스 생성·수정·제거
 */

// Rules
export { default as outcomeRules } from './rules/outcome_rules.json';
export { default as synthesisRules } from './rules/synthesis_rules.json';
export { default as shadowPolicy } from './rules/shadow_policy.json';
export { default as thresholds } from './rules/thresholds.json';

// Engines
export { FactLedger, type OutcomeFact, type LedgerEntry } from './engine/fact_ledger';
export { VelocityCalc, type VelocityResult, type CLFInput, type CoachEfficiency } from './engine/velocity_calc';
export { ShadowEngine, type ShadowRequest, type ShadowDecision, type ShadowCategory } from './engine/shadow_engine';

// Brand: AllThatBasket
export { default as brandConfig } from './brand/allthatbasket/brand_config.json';
export { MetricsAdapter, type UIMetrics, type OwnerDashboardData, type CoachViewData } from './brand/allthatbasket/metrics_adapter';

// ============================================
// AUTUS Core API
// ============================================

import { FactLedger } from './engine/fact_ledger';
import { VelocityCalc } from './engine/velocity_calc';
import { ShadowEngine } from './engine/shadow_engine';
import { MetricsAdapter } from './brand/allthatbasket/metrics_adapter';

/**
 * AUTUS 메인 인터페이스
 */
export const AUTUS = {
  // Fact Ledger
  recordOutcome: FactLedger.append,
  getUnprocessedTriggers: FactLedger.getUnprocessedTriggers,
  markProcessed: FactLedger.markProcessed,
  getLedgerStats: FactLedger.getStats,

  // Velocity
  calculateVV: VelocityCalc.calculateVV,
  calculateSessionVV: VelocityCalc.calculateSessionVV,
  calculatePeriodVV: VelocityCalc.calculatePeriodVV,
  calculateCLF: VelocityCalc.calculateCLF,
  calculateCE: VelocityCalc.calculateCE,

  // Shadow
  addShadowRequest: ShadowEngine.add,
  decideShadow: ShadowEngine.decide,
  getPendingShadows: ShadowEngine.getPendingByAuthority,
  getShadowStats: ShadowEngine.getStats,

  // UI Adapters
  ui: MetricsAdapter,
};

export default AUTUS;
