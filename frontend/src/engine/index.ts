/**
 * AUTUS Engine Exports v2.5
 * 
 * Universal Pressure Map (UPM)
 * 72 = 6 물리법칙 × 12 개체성질
 * 
 * 72³는 예측 엔진이 아니다.
 * 72³는 "결정을 미루면 손해가 확정되는 지점만 표시하는 레이더"다.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Legacy Exports (기존 호환성 유지)
// ═══════════════════════════════════════════════════════════════════════════

export {
  CubeInterpreter,
  cubeInterpreter,
  DOMAIN_PHYSICS,
  CATEGORY_PHYSICS,
  type NodeID,
  type CubeCoordinate,
  type DomainPhysics,
} from './CubeInterpreter';

export {
  PhysicsEngine72,
  physicsEngine72,
  type Vector3,
  type PhysicsState,
  type NodeState,
  type NodeEntity,
  type Intervention,
  type Prediction,
  type Scenario,
} from './PhysicsEngine72';

// ═══════════════════════════════════════════════════════════════════════════
// v2.5: Universal Pressure Map (UPM)
// ═══════════════════════════════════════════════════════════════════════════

// 물리 정의 (X축: 72 Pressure Indicators)
export {
  // 법칙 정의
  PHYSICS_LAWS,
  PHYSICS_LAW_LIST,
  type PhysicsLaw,
  
  // 성질 정의
  ENTITY_PROPERTIES,
  ENTITY_PROPERTY_LIST,
  STOCK_PROPERTIES,
  FLOW_PROPERTIES,
  RELATION_PROPERTIES,
  type EntityProperty,
  type PropertyCategory,
  
  // 72개 노드
  ALL_72_NODES,
  getNodeById,
  getNodeByIndex,
  getNodeByCoords,
  getNodesByLaw,
  getNodesByProperty,
  getNodeByName,
  type Node72,
  
  // Y축: Cost Type (6개)
  COST_TYPES,
  COST_TYPE_LIST,
  type CostType,
  
  // Z축: Irreversibility Horizon (5개)
  IRREVERSIBILITY_HORIZONS,
  IRREVERSIBILITY_LIST,
  type IrreversibilityHorizon,
  
  // 상태 분류 (3단계)
  PRESSURE_STATES,
  type PressureState,
  type StateDefinition,
  
  // Pressure Cell
  type PressureCell,
  
  // 요약
  PHYSICS_72_SUMMARY,
} from './Physics72Definition';

// Pressure Calculator
export {
  PressureCalculator,
  pressureCalculator,
  DEFAULT_THRESHOLDS,
  type NodeThreshold,
  type ThresholdConfig,
  type PressureItem,
  type PressureResult,
} from './PressureCalculator';

// Academy Template
export {
  ACADEMY_ACTIVE_NODES,
  ACADEMY_NODE_DEFINITIONS,
  ACADEMY_THRESHOLDS,
  ACADEMY_EXPOSURE_WEIGHTS,
  ACADEMY_ENTITIES,
  ACADEMY_TEMPLATE,
  SAMPLE_ACADEMY_DATA,
  type AcademyNodeDefinition,
  type AcademyEntity,
  type AcademySampleData,
} from './AcademyTemplate';

// Node Calculator (실제 데이터 → 72 노드)
export {
  NodeCalculator,
  nodeCalculator,
  type RawBusinessData,
  type NodeSnapshot,
} from './NodeCalculator';

// Legacy Interpreter (v2.0 호환)
export {
  CubeInterpreter72,
  cubeInterpreter72,
  QUICK_REFERENCE,
  type InterpreterResult,
} from './CubeInterpreter72';

// ═══════════════════════════════════════════════════════════════════════════
// v3.0: 라플라스 결정론적 예측 시스템
// ═══════════════════════════════════════════════════════════════════════════

// 6개 라플라스 법칙
export {
  LAPLACE_LAWS,
  LAPLACE_LAW_LIST,
  LAW_TIERS,
  DEFAULT_PARAMS,
  LAPLACE_SUMMARY,
  
  // 법칙 함수
  applyConservation,
  applyEntropy,
  applyInertia,
  applyFriction,
  applyGravity,
  applyThreshold,
  
  // 고객 예측 예시
  predictCustomerCount,
  
  // 타입
  type LaplaceLaw,
  type LawTier,
  type LearnableParams,
  type StateVector as LaplaceStateVector,
  type Action,
  type CustomerPredictionInput,
} from './LaplaceLaws';

// 상태 예측 엔진
export {
  StatePredictor,
  statePredictor,
  SAMPLE_INITIAL_STATE,
  SAMPLE_ACTIONS,
  SAMPLE_EXTERNAL,
  type StateVector,
  type ActionInput,
  type ExternalFactors,
  type PredictionResult,
} from './StatePredictor';

// ═══════════════════════════════════════════════════════════════════════════
// v3.1: Bayesian Laplace System
// ═══════════════════════════════════════════════════════════════════════════

// Prior 행렬 (세상의 지식)
export {
  CORE_NODES,
  CORE_NODE_NAMES,
  ACADEMY_PRIOR_10x10,
  ACADEMY_BENCHMARKS,
  ACADEMY_PRIOR_METADATA,
  priorToMatrix,
  countConnections,
  filterByConfidence,
  printPriorMatrix,
  type CoreNode,
  type PriorCoefficient,
  type ConfidenceLevel,
  type EvidenceSource,
  type PriorMatrix,
} from './BayesianPrior';

// 비선형 방정식 시스템
export {
  NonlinearSystem,
  nonlinearSystem,
  SAMPLE_STATE,
  SAMPLE_ACTIONS as NL_SAMPLE_ACTIONS,
  SAMPLE_EXTERNAL as NL_SAMPLE_EXTERNAL,
  type CoreState,
  type ActionParams,
  type ExternalParams,
} from './NonlinearEquations';

// Bayesian Laplace 엔진 (Prior + Evidence = Posterior)
export {
  BayesianLaplace,
  bayesianLaplace,
  SAMPLE_12_MONTHS_ACTUAL,
  type Observation,
  type PredictionError,
  type LearningResult,
  type PosteriorMatrix,
} from './BayesianLaplace';

// ═══════════════════════════════════════════════════════════════════════════
// 72×72 인과 행렬
// ═══════════════════════════════════════════════════════════════════════════

export {
  NODE_IDS,
  NODE_NAMES,
  CAUSAL_LINKS,
  CausalMatrix72,
  causalMatrix72,
  toDenseMatrix,
  getCauses,
  getEffects,
  getLinksByLaw,
  getLinksByConfidence,
  getStatistics,
  type CausalLink,
  type CausalSource,
  type ConfidenceLevel as CausalConfidence,
} from './CausalMatrix72';

// ═══════════════════════════════════════════════════════════════════════════
// v3.2: 학습 루프 (Learning Loop)
// ═══════════════════════════════════════════════════════════════════════════

// 72×72 학습 루프
export {
  LearningLoop72,
  learningLoop72,
  SAMPLE_ACADEMY_STATES,
  DEFAULT_LEARNING_CONFIG,
  type State72,
  type Prediction72,
  type LearningStep,
  type LearningConfig,
} from './LearningLoop72';

// 데이터 연결 (Supabase)
export {
  DataConnector,
  SUPABASE_SCHEMA,
  type SupabaseConfig,
  type NodeSnapshot as DBNodeSnapshot,
  type LearningRecord,
  type CoefficientRecord,
  type PredictionRecord,
} from './DataConnector';

// 월간 학습 자동화
export {
  MonthlyLearningScheduler,
  generateMonthlyReport,
  DEFAULT_SCHEDULER_CONFIG,
  REQUIRED_NODES_BY_DOMAIN,
  type SchedulerConfig,
  type SchedulerStatus,
  type LearningResult as MonthlyLearningResult,
  type LearningInsight,
  type DataCollectionReminder,
} from './MonthlyLearningScheduler';

// ═══════════════════════════════════════════════════════════════════════════════
// v3.3: 변수 고도화 시스템 (Variable Evolution)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  VariableEvolutionEngine,
  variableEvolution,
  UNIVERSAL_PRIOR,
  INDUSTRY_PRIORS,
  SEGMENT_PRIORS,
  LEVEL_THRESHOLDS,
  calculateConfidence,
  getConfidenceLevel,
  getSeason,
  type ConfidenceLevel as EvolutionConfidence,
  type EvolutionLevel,
  type EvolvedCoefficient,
  type EvolvedThreshold,
  type PriorHierarchy,
  type EvolutionState,
} from './VariableEvolution';

// ═══════════════════════════════════════════════════════════════════════════════
// v4.0: 72⁴ HyperCube 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 상수
  DIMENSIONS,
  TOTAL_COMBINATIONS,
  
  // 노드 정의 (72개)
  NODES_72,
  NODE_CATEGORY_COLORS,
  type NodeCategory,
  type NodeDefinition,
  
  // 모션 정의 (72개)
  MOTIONS_72,
  MOTION_CATEGORY_COLORS,
  type MotionCategory,
  type MotionDefinition,
  
  // 좌표계
  coordinateToIndex,
  indexToCoordinate,
  coordinateToHash,
  hashToCoordinate,
  type HyperCoordinate,
  
  // 엔진
  HyperCubeEngine,
  hypercube,
  type TypeCharacteristics,
  type Observation as HyperCubeObservation,
  
  // 유틸리티
  getNodesByCategory,
  getMotionsByCategory,
} from './HyperCube72_4';
