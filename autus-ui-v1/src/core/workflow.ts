/**
 * AUTUS 9단계 글로벌 워크플로우
 * 
 * DISCOVER (발견): SENSE → ANALYZE → STRATEGIZE
 * EXECUTE (실행): DESIGN → BUILD → LAUNCH
 * LEARN (학습): MEASURE → LEARN → SCALE
 */

// ============================================================================
// Phase 정의
// ============================================================================

export type PhaseId = 
  | 'SENSE'      // 1. 감지 (Ray Dalio)
  | 'ANALYZE'    // 2. 분석 (Elon Musk)
  | 'STRATEGIZE' // 3. 전략 (Peter Thiel)
  | 'DESIGN'     // 4. 설계 (Jeff Bezos)
  | 'BUILD'      // 5. 구축 (Jeff Bezos)
  | 'LAUNCH'     // 6. 출시 (Reid Hoffman)
  | 'MEASURE'    // 7. 측정 (Andy Grove)
  | 'LEARN'      // 8. 학습 (Ray Dalio)
  | 'SCALE';     // 9. 확장 (Jeff Bezos)

export type PhaseGroup = 'DISCOVER' | 'EXECUTE' | 'LEARN';

export interface PhaseConfig {
  id: PhaseId;
  name: string;
  group: PhaseGroup;
  leader: string;
  principle: string;
  keyQuestion: string;
  engine: string;
  autusFunction: string;
}

export const PHASES: Record<PhaseId, PhaseConfig> = {
  SENSE: {
    id: 'SENSE',
    name: '감지',
    group: 'DISCOVER',
    leader: 'Ray Dalio (Bridgewater)',
    principle: '약한 신호 포착 (Weak Signal Detection)',
    keyQuestion: '무슨 변화가 감지되는가?',
    engine: 'Collect Engine + Predict Engine',
    autusFunction: '🔮 예측',
  },
  ANALYZE: {
    id: 'ANALYZE',
    name: '분석',
    group: 'DISCOVER',
    leader: 'Elon Musk (Tesla/SpaceX)',
    principle: '제1원리 사고 (First Principles Thinking)',
    keyQuestion: '왜 이 문제가 발생했는가?',
    engine: 'Compute Engine',
    autusFunction: '📋 구체화',
  },
  STRATEGIZE: {
    id: 'STRATEGIZE',
    name: '전략',
    group: 'DISCOVER',
    leader: 'Peter Thiel (PayPal/Palantir)',
    principle: '독점 가능성 (Monopoly Question)',
    keyQuestion: '10배 나은 전략은 무엇인가?',
    engine: 'ReAct Engine',
    autusFunction: '📐 표준화',
  },
  DESIGN: {
    id: 'DESIGN',
    name: '설계',
    group: 'EXECUTE',
    leader: 'Jeff Bezos (Amazon)',
    principle: 'Working Backwards (역순 사고)',
    keyQuestion: '성공하면 어떤 모습인가?',
    engine: 'Predict Engine',
    autusFunction: '📐 표준화',
  },
  BUILD: {
    id: 'BUILD',
    name: '구축',
    group: 'EXECUTE',
    leader: 'Jeff Bezos (Amazon)',
    principle: 'Two-Pizza Team (2피자 팀)',
    keyQuestion: '누가 무엇을 만드는가?',
    engine: 'CodeAct Engine',
    autusFunction: '⚡ 실행',
  },
  LAUNCH: {
    id: 'LAUNCH',
    name: '출시',
    group: 'EXECUTE',
    leader: 'Reid Hoffman (LinkedIn)',
    principle: 'MVP Rule (창피하지 않으면 너무 늦은 것)',
    keyQuestion: '최소한 뭘 내보낼 수 있는가?',
    engine: 'Alert Engine',
    autusFunction: '⚡ 실행',
  },
  MEASURE: {
    id: 'MEASURE',
    name: '측정',
    group: 'LEARN',
    leader: 'Andy Grove (Intel)',
    principle: 'OKR & Input Metrics',
    keyQuestion: '성과를 어떻게 측정하는가?',
    engine: 'Proof Engine',
    autusFunction: '📊 측정',
  },
  LEARN: {
    id: 'LEARN',
    name: '학습',
    group: 'LEARN',
    leader: 'Ray Dalio (Bridgewater)',
    principle: 'Blameless Post-Mortem (비난 없는 회고)',
    keyQuestion: '무엇을 배웠는가?',
    engine: 'Learn Engine',
    autusFunction: '🔄 개선',
  },
  SCALE: {
    id: 'SCALE',
    name: '확장',
    group: 'LEARN',
    leader: 'Jeff Bezos (Amazon)',
    principle: 'Flywheel Effect (플라이휠 효과)',
    keyQuestion: '어떻게 확장/삭제하는가?',
    engine: 'Predict Engine',
    autusFunction: '🔮 예측 + 🔄 개선',
  },
};

export const PHASE_ORDER: PhaseId[] = [
  'SENSE', 'ANALYZE', 'STRATEGIZE',
  'DESIGN', 'BUILD', 'LAUNCH',
  'MEASURE', 'LEARN', 'SCALE',
];

// ============================================================================
// 6W 정의
// ============================================================================

export interface SixW {
  WHO: string;      // 누가 (타겟)
  WHAT: string;     // 무엇을 (액션)
  WHEN: string;     // 언제 (타이밍)
  WHERE: string;    // 어디서 (채널)
  WHY: string;      // 왜 (목적)
  HOW_MUCH: string; // 얼마나 (비용/규모)
}

// ============================================================================
// Mission 정의
// ============================================================================

export type MissionStatus = 
  | 'DRAFT'
  | 'SENSING'
  | 'ANALYZING'
  | 'STRATEGIZING'
  | 'DESIGNING'
  | 'BUILDING'
  | 'LAUNCHING'
  | 'MEASURING'
  | 'LEARNING'
  | 'SCALING'
  | 'COMPLETED'
  | 'ELIMINATED';

export interface Mission {
  id: string;
  name: string;
  description: string;
  category: string;
  sixW: SixW;
  currentPhase: PhaseId;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  
  // K·I·Ω 지수
  indices: {
    K: number;  // 가치 지수 (0~1)
    I: number;  // 상호작용 지수 (-1~1)
    Omega: number; // 효율 지수 (0~1)
  };
  
  // 각 Phase 결과
  phaseResults: Partial<Record<PhaseId, PhaseResult>>;
}

// ============================================================================
// Phase 결과 타입들
// ============================================================================

export interface PhaseResult {
  phase: PhaseId;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  nextPhase?: PhaseId;
}

// SENSE Phase
export interface Signal {
  type: 'OPPORTUNITY' | 'THREAT';
  signal: string;
  value: number;
  threshold: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
}

export interface SenseResult extends PhaseResult {
  phase: 'SENSE';
  signals: Signal[];
  environmentIndex: number; // σ
  prediction: {
    current: number;
    predicted: number;
    change: string;
    months: number;
    sigma: number;
  };
  urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ANALYZE Phase
export interface FirstPrinciple {
  level: number;
  question: string;
  answer: string;
}

export interface AnalyzeResult extends PhaseResult {
  phase: 'ANALYZE';
  phenomenon: string;
  whys: FirstPrinciple[];
  rootCause: string;
  assumptions: string[];
  validatedAssumptions: string[];
}

// STRATEGIZE Phase
export interface Strategy {
  id: string;
  name: string;
  thielScore: number;
  monopolyPotential: number;
  recommendation: 'STRONG_PURSUE' | 'PURSUE' | 'CONSIDER' | 'AVOID';
}

export interface StrategizeResult extends PhaseResult {
  phase: 'STRATEGIZE';
  strategies: Strategy[];
  selected: Strategy;
  thielQuestions: {
    technology: number;
    timing: number;
    monopoly: number;
    team: number;
  };
}

// DESIGN Phase
export interface PressRelease {
  headline: string;
  subheadline: string;
  date: string;
  body: string;
  callToAction: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface DesignResult extends PhaseResult {
  phase: 'DESIGN';
  pressRelease: PressRelease;
  faq: FAQ[];
  requirements: {
    technical: string[];
    content: string[];
    process: string[];
    team: string[];
  };
}

// BUILD Phase
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  task: string;
  priority: number;
  color: string;
}

export interface BuildTask {
  assignee: string;
  task: string;
  deadline: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

export interface BuildResult extends PhaseResult {
  phase: 'BUILD';
  team: TeamMember[];
  automationScore: number;
  buildAction: 'AUTOMATE' | 'COMPRESS' | 'DELEGATE' | 'KEEP';
  tasks: BuildTask[];
  estimatedTimeSaving: string;
}

// LAUNCH Phase
export interface LaunchPhase {
  name: string;
  audience: string;
  duration: string;
  goal: string;
}

export interface LaunchResult extends PhaseResult {
  phase: 'LAUNCH';
  mvpFeatures: string[];
  launchPhases: LaunchPhase[];
  rollbackPlan: {
    trigger: string;
    action: string;
  };
  checklistCompleted: boolean;
}

// MEASURE Phase
export interface KeyResult {
  id: string;
  metric: string;
  baseline: number;
  target: number;
  actual?: number;
  unit: string;
  period: string;
  progress?: string;
  status?: '✅' | '⚠️' | '❌';
}

export interface OKR {
  objective: string;
  keyResults: KeyResult[];
}

export interface TSEL {
  T: number;  // Trust
  S: number;  // Satisfaction
  E: number;  // Engagement
  L: number;  // Loyalty
  R: number;  // Total (weighted)
}

export interface ProofPack {
  mission: string;
  period: { start: string; end: string };
  status: 'ACHIEVED' | 'PARTIAL' | 'FAILED';
  summary: {
    avgOKRProgress: string;
    tselBefore: string;
    tselAfter: string;
    tselChange: string;
  };
  okrResults: KeyResult[];
  tselBreakdown: {
    before: TSEL;
    after: TSEL;
  };
  evidence: string[];
  learningPoints: LearningPoint[];
}

export interface LearningPoint {
  type: 'SUCCESS' | 'IMPROVE';
  kr: string;
  insight: string;
}

export interface MeasureResult extends PhaseResult {
  phase: 'MEASURE';
  okr: OKR;
  okrProgress: KeyResult[];
  tsel: {
    before: TSEL;
    after: TSEL;
  };
  proofPack: ProofPack;
}

// LEARN Phase
export interface Pattern {
  condition: string;
  result: string;
  confidence?: number;
  avoidAction?: string;
}

export interface LearnResult extends PhaseResult {
  phase: 'LEARN';
  whatHappened: {
    objective: string;
    targetOKR: string[];
    actualOKR: string[];
    timeline: { start: string; end: string };
  };
  whyItHappened: Array<{
    kr: string;
    gap: string;
    possibleCauses: string[];
    rootCause: string;
  }>;
  howToImprove: Array<{
    area: string;
    current: string;
    proposed: string;
    expectedImpact: string;
  }>;
  patterns: {
    successPatterns: Pattern[];
    failurePatterns: Pattern[];
    shadowRuleCandidates: string[];
  };
}

// SCALE Phase
export interface FlywheelStep {
  step: number;
  action: string;
  metric: string;
}

export interface Flywheel {
  elements: FlywheelStep[];
  accelerators: string[];
  decelerators: string[];
}

export type ScaleAction = 'SCALE_UP' | 'MAINTAIN' | 'ELIMINATE';

export interface ScaleResult extends PhaseResult {
  phase: 'SCALE';
  scaleAction: ScaleAction;
  flywheel?: Flywheel;
  nextMissions?: string[];
  savedTime?: string;
  savedEnergy?: string;
  nextCycleRecommendation?: string;
}

// ============================================================================
// Workflow State
// ============================================================================

export interface WorkflowState {
  currentMission: Mission | null;
  missions: Mission[];
  activeMissionId: string | null;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

export function getNextPhase(current: PhaseId): PhaseId | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

export function getPreviousPhase(current: PhaseId): PhaseId | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return PHASE_ORDER[idx - 1];
}

export function getPhaseGroup(phase: PhaseId): PhaseGroup {
  return PHASES[phase].group;
}

export function getPhaseNumber(phase: PhaseId): number {
  return PHASE_ORDER.indexOf(phase) + 1;
}

export function calculateTotalScore(K: number, I: number, Omega: number): number {
  return (K + Omega) / 2 - Math.abs(Math.min(0, I));
}

export function shouldEliminate(K: number, I: number, Omega: number, stagnantDays: number): boolean {
  return K < 0.3 || I < -0.3 || (Omega < 0.4 && stagnantDays > 30);
}

export function shouldScaleUp(K: number, Omega: number): boolean {
  return K >= 0.7 && Omega >= 0.6;
}
