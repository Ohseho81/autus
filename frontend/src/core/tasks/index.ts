// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v2.0 - 570개 업무 물리 시스템
// "의미가 아니라 물성으로 분류한다"
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// [PRIMARY] 물리 법칙 기반 분류 (AUTUS 핵심 철학)
// ─────────────────────────────────────────────────────────────────────────────
export {
  // 7대 물리 법칙
  type PhysicsLaw,
  PHYSICS_LAW_DEFINITIONS,
  
  // 물리 기반 업무
  type PhysicsTask,
  type PhysicsConstants,
  type OrbitCharacteristics,
  type EnergyState,
  type InterferencePattern,
  
  // 분류 함수
  determinePrimaryLaw,
  calculateLawDistribution,
  
  // 570개 데이터
  ALL_PHYSICS_TASKS,
  TASKS_BY_LAW,
  PHYSICS_STATISTICS,
} from './physicsClassification';

// ─────────────────────────────────────────────────────────────────────────────
// [LEGACY] 도메인 기반 분류 (인간 호환용 - 선택적)
// ─────────────────────────────────────────────────────────────────────────────
export {
  type TaskDNA,
  type TaskPhysics,
  type R1Insight,
  type InterferenceMap,
  type TaskPeriodicity,
  type AutomationProfile,
  type TaskMetadata,
  type TaskDomain,
  type RiskZone,
  
  DOMAIN_INFO,
  RISK_ZONE_COLORS,
  classifyRiskZone,
} from './taskDNA';

export {
  ALL_TASKS_570,
  TASKS_BY_DOMAIN,
  TASK_STATISTICS,
} from './tasks570';

// ─────────────────────────────────────────────────────────────────────────────
// R1 통찰 엔진
// ─────────────────────────────────────────────────────────────────────────────
export {
  R1InsightEngine,
  getR1InsightEngine,
  useR1Insight,
} from './r1InsightEngine';
