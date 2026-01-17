/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Card Components
 * 역할별 카드 1장 UI 시스템
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Base Card
export {
  BaseCard,
  CardInfoRow,
  CardStatusBadge,
  CardAlert,
  CardActions,
  CardButton,
  CardTimer,
  type CardType,
  type CardPriority,
} from './BaseCard';

// EXECUTOR Cards (K1~K2)
export {
  NextActionCard,
  AutoReportCard,
  RiskAlertCard,
  TaskDeletedCard,
  type NextAction,
} from './ExecutorCard';

// DECIDER Cards (K5~K7)
export {
  TopDecisionCard,
  AssetStatusCard,
  FutureScenarioCard,
  DecisionLogCard,
  type Decision,
} from './DeciderCard';

// OPERATOR Cards (K3~K5)
export {
  ConflictCard,
  TaskRedefinitionCard,
  PressureHeatmapCard,
  PlanRealityCard,
  ApprovalAutomationCard,
  type Conflict,
} from './OperatorCard';

// CONSUMER Cards
export {
  ProofResultCard,
  SignalInputCard,
  ConfidenceCard,
  ProgressCard,
  type ProofResult,
} from './ConsumerCard';

// APPROVER Cards (K7+)
export {
  ApprovalStatusCard,
  AuditReplayCard,
  ImmutableLogCard,
  SafetyStatusCard,
  type ApprovalTarget,
} from './ApproverCard';
