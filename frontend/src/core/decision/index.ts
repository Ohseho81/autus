// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Decision Module Exports
// ═══════════════════════════════════════════════════════════════════════════════
//
// "AUTUS는 판단을 잘하게 만드는 시스템이 아니다.
//  판단이 필요 없게 만드는 시스템이다."
//
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Decision Gate (수학적 정의)
export {
  // Types
  type DecisionVector,
  type AuthorityLevel,
  type RegulationConstraint,
  type GateResult,
  
  // Constants
  IRREVERSIBILITY_THRESHOLDS,
  DEFAULT_REGULATIONS,
  
  // Functions
  Lock,
  Approve,
  RegulationCheck,
  Close,
  Liability,
  createDecisionVector,
  calculateIrreversibilityScore,
  
  // Class
  DecisionGate,
} from './gate';

// 2. Regulation Engine (자동 집행 레이어)
export {
  // Types
  type LegalSource,
  type RegulationCategory,
  type CompiledRegulation,
  type LiabilityRecord,
  
  // Constants
  KOREAN_REGULATIONS,
  
  // Classes
  RegulationEngine,
  LiabilityChain,
  
  // Factory
  createKoreanRegulationEngine,
} from './regulationEngine';

// 3. Fog of War UI
export {
  BlackBoxSummary,
  FogOfWar,
  GravityContainer,
  DecisionSummary,
} from './FogOfWarUI';

// 4. Organization Machine
export {
  // Types
  type OrganizationStage,
  type OrganizationState,
  type Symptom,
  type AutusRole,
  
  // Constants
  ORGANIZATION_STAGES,
  AUTUS_ROLES,
  
  // Classes
  OrganizationMachine,
  
  // Functions
  predictOrganizationTransform,
} from './organizationMachine';
