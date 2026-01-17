// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Discovery System - 통합 Export
// ═══════════════════════════════════════════════════════════════════════════════
//
// AUTUS에서 발견할 수 있는 5가지 핵심 요소:
// 1. 사용자 상수 K (User Constant)
// 2. 상호 상수 I, Ω, r (Interaction Constants)
// 3. 사용자 타입 (User Types)
// 4. 업무 타입 (Task Types)
// 5. 네트워크 예측 (Network Prediction)
//
// ═══════════════════════════════════════════════════════════════════════════════

// 1 & 2 & 3. 상수 및 사용자 타입
export {
  // 타입
  type UserConstantK,
  type InteractionConstantI,
  type InteractionAnomaly,
  type EntropyConstantOmega,
  type EntropyWarning,
  type GrowthConstantR,
  type UserType,
  type UserTypeProfile,
  
  // 상수
  USER_TYPE_PROFILES,
  
  // 함수
  calculateK,
  determineUserType,
} from './constants';

// 4. 업무 타입 및 솔루션
export {
  // 타입
  type TaskType,
  type TaskTypeProfile,
  type TaskSolution,
  type SolutionStep,
  
  // 상수
  TASK_TYPE_PROFILES,
  
  // 함수
  getSolutionForTaskType,
  getOptimalTasksForUserType,
} from './taskTypes';

// 5. 네트워크 예측
export {
  // 타입
  type NetworkNode,
  type NetworkEdge,
  type NetworkGraph,
  type PredictionHorizon,
  type NetworkPrediction,
  type StructuralPrediction,
  type BehavioralPrediction,
  type RiskPrediction,
  type OpportunityPrediction,
  type PredictionScenario,
  
  // 클래스
  NetworkPredictionEngine,
  
  // 함수
  summarizePrediction,
  getRecommendedActions,
} from './networkPrediction';

// 통합 엔진
export {
  // 타입
  type UserProfile,
  
  // 클래스
  DiscoveryEngine,
  
  // 함수
  getDiscoveryEngine,
  
  // Hook
  useDiscovery,
} from './engine';
