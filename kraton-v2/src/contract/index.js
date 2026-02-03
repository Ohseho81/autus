/**
 * 🔒 AUTUS Contract System
 *
 * "시스템 = 계약"
 * "고객 로그가 모든 것을 만든다"
 *
 * 내보내기:
 * - rules: 계약 규칙 정의 (C1-C6)
 * - useContract: UI에서 계약 적용하는 훅
 * - outcomeEngine: OutcomeFact 10개 기반 프로세스 자동 생성
 */

export * from './rules.js';
export { useContract } from './useContract.js';
export { default as contractRules } from './rules.js';

// OutcomeFact Engine (LOCKED: 10개 고정)
export { default as outcomeEngine } from './outcomeEngine.js';
export {
  OUTCOME_TYPES,
  SYNTHESIS_LOOPS,
  STATES,
  createOutcomeFact,
  generateDecisionCard,
  calculateTransition,
  calculateSynthesis,
  checkGate,
  checkShadowEscalation,
  validateSource,
  generateReplayScenarios
} from './outcomeEngine.js';
