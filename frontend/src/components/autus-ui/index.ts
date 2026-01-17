/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS UI Components v4.0 - Complete
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "Operating System of Reality" - 현실의 운영체제
 * 
 * 핵심 원칙:
 * 1. LAPLACE OBSERVATION - 모든 것을 보되, 개입은 최소화
 * 2. SEMANTIC NEUTRALITY - 빨강/초록 대신 그라디언트 스펙트럼
 * 3. PROGRESSIVE DISCLOSURE - 처음엔 단순하게, 필요할 때 깊이
 * 4. PHYSICS-BASED MOTION - 모든 애니메이션은 물리 법칙 준수
 * 5. EDGE-FIRST PRIVACY - 개인정보는 로컬, 상수만 서버로
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Core Components
// ═══════════════════════════════════════════════════════════════════════════════

export { GlassCard } from './GlassCard';
export { KIGaugeCluster } from './KIGaugeCluster';
export { OmniIsland } from './OmniIsland';

// ═══════════════════════════════════════════════════════════════════════════════
// Layout Components
// ═══════════════════════════════════════════════════════════════════════════════

export { BentoGrid, ResponsiveBentoGrid, BentoItemPresets } from './BentoGrid';
export { SpatialCard, SpatialCardSimple } from './SpatialCard';

// ═══════════════════════════════════════════════════════════════════════════════
// Effects
// ═══════════════════════════════════════════════════════════════════════════════

export { AuroraBackground } from './AuroraBackground';
export { KIDashboard } from './KIDashboard';

// K/I Dashboard V2 (from autus_api_integration - 완전 버전)
export {
  KIGauge,
  Nodes48Grid,
  Slots144View,
  TrajectoryChart,
  AutomationTasks,
  AlertsList,
  Dashboard as KIDashboardV2,
} from './KIDashboardV2';

// ═══════════════════════════════════════════════════════════════════════════════
// Trinity Dashboard (570개 업무 K/I/Ω 물리 엔진 시각화)
// ═══════════════════════════════════════════════════════════════════════════════

export { default as TrinityDashboard } from './TrinityDashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// Design System
// ═══════════════════════════════════════════════════════════════════════════════

export {
  autusColors,
  autusTypography,
  autusSpacing,
  autusMotion,
  autusPrimitives,
  automationPhases,
  kIndexSpectrum,
  iIndexSpectrum,
  cn,
  formatKValue,
  formatDelta,
  getKGlowColor,
} from '../../styles/autus-design-system';

// ═══════════════════════════════════════════════════════════════════════════════
// Animation Presets
// ═══════════════════════════════════════════════════════════════════════════════

export {
  springs,
  variants,
  scrollVariants,
  hoverPresets,
  tapPresets,
  createValueAnimation,
  createStaggerAnimation,
  pathAnimation,
} from '../../lib/animations/framer-presets';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  EntityState,
  Node48,
  Slot144,
  Prediction,
  Task,
  Alert,
  AIPData,
} from '../../styles/autus-design-system';
