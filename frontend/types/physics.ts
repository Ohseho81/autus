/**
 * AUTUS Physics API Types
 * Semantic Neutrality Compliant
 * 
 * Node = 사람/기업/국가
 * Motion = 돈/시간/가치
 * All motion toward Origin
 */

// ============================================
// State Types
// ============================================

export interface State {
  /** ΔGoal - normalized distance to goal (0 = reached) */
  delta: number;
  /** Friction coefficient */
  mu: number;
  /** Momentum */
  rho: number;
  /** Variance */
  sigma: number;
  timestamp: string;
}

export interface VectorInput {
  /** Vector change (-1 to +1) */
  delta_v: number;
}

export interface StateTransition {
  previous: State;
  current: State;
  delta_v_applied: number;
  equation_used: string;
}

// ============================================
// Node Types (사람/기업/국가)
// ============================================

export type ProximityLevel = 1 | 2 | 3;

export interface Node {
  id: string;
  /** Distance from Origin */
  r: number;
  /** Angle in radians */
  theta: number;
  /** Node mass (affects size) */
  mass: number;
  /** Orbital velocity */
  velocity: number;
  /** Current flow toward Origin */
  flow: number;
  /** Proximity level (derived from r) */
  level: ProximityLevel;
  created_at: string;
  updated_at: string;
}

export interface NodeCreate {
  r: number;
  theta: number;
  mass: number;
}

export interface NodeUpdate {
  r?: number;
  theta?: number;
  mass?: number;
  velocity?: number;
}

export interface NodeListResponse {
  nodes: Node[];
  count: number;
}

export interface NodeListParams {
  level?: ProximityLevel;
  r_min?: number;
  r_max?: number;
}

// ============================================
// Motion Types (돈/시간/가치)
// ============================================

export interface Motion {
  id: string;
  /** Direction angle */
  angle: number;
  /** Progress toward Origin (0 = start, 1 = arrived) */
  progress: number;
  /** Flow intensity */
  intensity: number;
  /** Starting distance from Origin */
  start_r: number;
  /** Originating node (optional) */
  source_node_id?: string;
}

export interface MotionListResponse {
  motions: Motion[];
  /** Aggregate flow rate toward Origin */
  flow_rate: number;
}

// WebSocket message types
export interface MotionStreamMessage {
  type: 'motion_update';
  data: MotionListResponse;
  timestamp: string;
}

// ============================================
// Goal Types
// ============================================

export interface Goal {
  id: string;
  /** User-defined goal text (stored as-is, no interpretation) */
  anchor: string;
  created_at: string;
  state: State;
}

export interface GoalCreate {
  anchor: string;
}

// ============================================
// Physics Equation
// ============================================

export interface PhysicsEquation {
  equation: string;
  variables: {
    S: string;
    rho: string;
    mu: string;
    delta_v: string;
  };
}

// ============================================
// API Client Interface
// ============================================

export interface AutusAPI {
  // State
  getState(): Promise<State>;
  applyVector(input: VectorInput): Promise<StateTransition>;
  
  // Nodes
  listNodes(params?: NodeListParams): Promise<NodeListResponse>;
  getNode(id: string): Promise<Node>;
  createNode(data: NodeCreate): Promise<Node>;
  updateNode(id: string, data: NodeUpdate): Promise<Node>;
  deleteNode(id: string): Promise<void>;
  
  // Motions
  listMotions(): Promise<MotionListResponse>;
  streamMotions(onMessage: (msg: MotionStreamMessage) => void): WebSocket;
  
  // Goal
  getGoal(): Promise<Goal>;
  setGoal(data: GoalCreate): Promise<Goal>;
  
  // Physics
  getEquation(): Promise<PhysicsEquation>;
}

// ============================================
// Constants
// ============================================

export const PROXIMITY_LEVELS = {
  L1: { max: 80, label: 'L1' },
  L2: { max: 140, label: 'L2' },
  L3: { max: 200, label: 'L3' },
} as const;

export const STATE_EQUATION = 'S(t+1) = S(t) + ρ·Δv − μ·|v|';

// ============================================
// Utility Types
// ============================================

export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: {
    code: string;
    message: string;
  };
};

// ============================================
// Helper Functions
// ============================================

export function calculateLevel(r: number): ProximityLevel {
  if (r < PROXIMITY_LEVELS.L1.max) return 1;
  if (r < PROXIMITY_LEVELS.L2.max) return 2;
  return 3;
}

export function getNodePosition(node: Node): { x: number; y: number } {
  return {
    x: Math.cos(node.theta) * node.r,
    y: Math.sin(node.theta) * node.r,
  };
}

export function getMotionPosition(motion: Motion): { x: number; y: number } {
  const currentR = motion.start_r * (1 - motion.progress);
  return {
    x: Math.cos(motion.angle) * currentR,
    y: Math.sin(motion.angle) * currentR,
  };
}
