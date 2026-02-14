/**
 * 🏀 Brand Module
 *
 * Core는 불변, Brand는 어댑터
 *
 * 현재 브랜드: 온리쌤
 * 추후 확장: 다른 학원/산업은 adapter만 추가
 */

// Adapter
export { default as adapter } from './allthatbasket.adapter.js';
export {
  BRAND,
  ROLES,
  ROUTING_TABLE,
  SCREENS,
  OUTCOME_LABELS,
  getRouting,
  getLabel,
  getScreensForRole,
  getOutcomeTypesForRole,
  getCardStyle,
} from './allthatbasket.adapter.js';

// UI Components
export { default as DecisionCard, DecisionCardList } from './DecisionCard.jsx';
