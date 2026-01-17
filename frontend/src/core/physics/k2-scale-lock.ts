// ============================================
// AUTUS v2.0 Scale Lock System
// K2 Operator Perception Limiter
// ============================================
//
// K2 오퍼레이터는 K1~K2 범위만 관측/조작 가능
// K3 이상은 형체만 보이거나 완전히 숨겨짐
//
// ============================================

import {
  InertiaDebtEngine,
  InertiaDebtResult,
  Node,
} from './inertia-debt-engine';

// ============================================
// Types
// ============================================

export type ScaleLevel = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7' | 'K8' | 'K9' | 'K10';

export interface ScaleNode extends Node {
  scale: ScaleLevel;
  position: { x: number; y: number; z: number };
  parentId: string | null;
  childIds: string[];
}

export type VisibilityLevel = 'full' | 'shape_only' | 'hidden';
export type InteractionLevel = 'full' | 'limited' | 'blocked';

export interface NodeVisibility {
  nodeId: string;
  scale: ScaleLevel;
  visibility: VisibilityLevel;
  interaction: InteractionLevel;
  showMetrics: boolean;
  showText: boolean;
  showUrgencyGlow: boolean;
  clickMessage: string | null;
}

export interface OperatorAction {
  id: string;
  operatorId: string;
  nodeId: string;
  action: string;
  timestamp: number;
  entropyDelta: number;
}

export interface EntropyTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: 'low' | 'medium' | 'high';
  symbol: string;
}

export interface CameraConstraints {
  minZ: number;
  maxZ: number;
  currentZ: number;
  locked: boolean;
  lockedScale: ScaleLevel;
}

export interface ViolationAttempt {
  type: 'zoom_out' | 'access_higher_orbit' | 'view_restricted';
  timestamp: number;
  targetScale: ScaleLevel;
  blocked: boolean;
}

// UI Hook Interfaces
export interface UIHooks {
  onVisibilityChange: (visibility: NodeVisibility) => void;
  onCameraViolation: (attempt: ViolationAttempt) => void;
  onEntropyTrendUpdate: (trend: EntropyTrend) => void;
  onActionBlocked: (message: string) => void;
  applyVisualNoise: (intensity: number) => void;
  snapCameraBack: (targetZ: number) => void;
}

// ============================================
// Scale Configuration
// ============================================

export const SCALE_Z_LEVELS: Record<ScaleLevel, { min: number; max: number }> = {
  K1: { min: 0, max: 10 },
  K2: { min: 10, max: 25 },
  K3: { min: 25, max: 50 },
  K4: { min: 50, max: 100 },
  K5: { min: 100, max: 200 },
  K6: { min: 200, max: 400 },
  K7: { min: 400, max: 700 },
  K8: { min: 700, max: 1000 },
  K9: { min: 1000, max: 1500 },
  K10: { min: 1500, max: 2000 },
};

export const K2_CAMERA_CONSTRAINTS: CameraConstraints = {
  minZ: SCALE_Z_LEVELS.K1.min,
  maxZ: SCALE_Z_LEVELS.K2.max,
  currentZ: 15,
  locked: true,
  lockedScale: 'K2',
};

// ============================================
// Core Functions
// ============================================

/**
 * Determine scale level from Z position
 */
export function getScaleFromZ(z: number): ScaleLevel {
  for (const [scale, range] of Object.entries(SCALE_Z_LEVELS)) {
    if (z >= range.min && z < range.max) {
      return scale as ScaleLevel;
    }
  }
  return 'K10';
}

/**
 * Get numeric value of scale for comparison
 */
export function getScaleNumeric(scale: ScaleLevel): number {
  return parseInt(scale.substring(1));
}

/**
 * Check if scale is within K2 operator range
 */
export function isWithinK2Range(scale: ScaleLevel): boolean {
  const num = getScaleNumeric(scale);
  return num <= 2;
}

/**
 * Determine visibility level for a node based on operator scale lock
 */
export function determineVisibility(
  nodeScale: ScaleLevel,
  operatorScale: ScaleLevel = 'K2'
): VisibilityLevel {
  const nodeNum = getScaleNumeric(nodeScale);
  const opNum = getScaleNumeric(operatorScale);
  
  if (nodeNum <= opNum) {
    return 'full';
  } else if (nodeNum === opNum + 1) {
    return 'shape_only';
  } else {
    return 'hidden';
  }
}

/**
 * Determine interaction level for a node
 */
export function determineInteraction(
  nodeScale: ScaleLevel,
  operatorScale: ScaleLevel = 'K2'
): InteractionLevel {
  const nodeNum = getScaleNumeric(nodeScale);
  const opNum = getScaleNumeric(operatorScale);
  
  if (nodeNum <= opNum) {
    return 'full';
  } else {
    return 'blocked';
  }
}

/**
 * Get node visibility configuration for K2 operator
 */
export function getNodeVisibility(node: ScaleNode, operatorScale: ScaleLevel = 'K2'): NodeVisibility {
  const visibility = determineVisibility(node.scale, operatorScale);
  const interaction = determineInteraction(node.scale, operatorScale);
  
  return {
    nodeId: node.id,
    scale: node.scale,
    visibility,
    interaction,
    showMetrics: visibility === 'full',
    showText: visibility === 'full',
    showUrgencyGlow: visibility === 'full',
    clickMessage: interaction === 'blocked' 
      ? 'Higher orbit approval required' 
      : null,
  };
}

/**
 * Validate camera Z position against K2 constraints
 */
export function validateCameraZ(
  requestedZ: number,
  constraints: CameraConstraints = K2_CAMERA_CONSTRAINTS
): { valid: boolean; clampedZ: number; violation: boolean } {
  const clampedZ = Math.max(constraints.minZ, Math.min(constraints.maxZ, requestedZ));
  const violation = requestedZ > constraints.maxZ;
  
  return {
    valid: requestedZ >= constraints.minZ && requestedZ <= constraints.maxZ,
    clampedZ,
    violation,
  };
}

/**
 * Calculate entropy delta from operator action
 */
export function calculateActionEntropyDelta(
  action: string,
  nodeDebt: number,
  nodeMass: number
): number {
  const actionWeights: Record<string, number> = {
    'complete': -0.3,      // Reduces entropy
    'delegate': -0.1,      // Slightly reduces
    'reschedule': 0.1,     // Slightly increases
    'delay': 0.3,          // Increases entropy
    'ignore': 0.5,         // Significantly increases
    'escalate': -0.2,      // Reduces by transferring
  };
  
  const weight = actionWeights[action] || 0;
  return weight * nodeMass * (1 + nodeDebt / 100);
}

/**
 * Determine entropy trend from recent actions
 */
export function calculateEntropyTrend(
  recentDeltas: number[],
  windowSize: number = 10
): EntropyTrend {
  if (recentDeltas.length === 0) {
    return { direction: 'stable', magnitude: 'low', symbol: '○' };
  }
  
  const recent = recentDeltas.slice(-windowSize);
  const sum = recent.reduce((a, b) => a + b, 0);
  const avg = sum / recent.length;
  
  let direction: 'increasing' | 'decreasing' | 'stable';
  let magnitude: 'low' | 'medium' | 'high';
  let symbol: string;
  
  if (avg > 0.2) {
    direction = 'increasing';
  } else if (avg < -0.2) {
    direction = 'decreasing';
  } else {
    direction = 'stable';
  }
  
  const absAvg = Math.abs(avg);
  if (absAvg > 0.5) {
    magnitude = 'high';
  } else if (absAvg > 0.2) {
    magnitude = 'medium';
  } else {
    magnitude = 'low';
  }
  
  // Symbol mapping (no numbers, visual only)
  if (direction === 'increasing') {
    symbol = magnitude === 'high' ? '▲▲' : magnitude === 'medium' ? '▲' : '△';
  } else if (direction === 'decreasing') {
    symbol = magnitude === 'high' ? '▼▼' : magnitude === 'medium' ? '▼' : '▽';
  } else {
    symbol = '○';
  }
  
  return { direction, magnitude, symbol };
}

// ============================================
// K2 Scale Lock Controller
// ============================================

export class K2ScaleLockController {
  private constraints: CameraConstraints;
  private inertiaEngine: InertiaDebtEngine;
  private actionLog: OperatorAction[];
  private entropyDeltas: number[];
  private uiHooks: UIHooks | null;
  private violationLog: ViolationAttempt[];
  private operatorScale: ScaleLevel;
  
  constructor(inertiaEngine: InertiaDebtEngine, uiHooks?: UIHooks, operatorScale: ScaleLevel = 'K2') {
    this.operatorScale = operatorScale;
    this.constraints = this.createConstraintsForScale(operatorScale);
    this.inertiaEngine = inertiaEngine;
    this.actionLog = [];
    this.entropyDeltas = [];
    this.uiHooks = uiHooks || null;
    this.violationLog = [];
  }
  
  private createConstraintsForScale(scale: ScaleLevel): CameraConstraints {
    const scaleNum = getScaleNumeric(scale);
    let maxZ = SCALE_Z_LEVELS.K1.max;
    
    for (let i = 1; i <= scaleNum; i++) {
      const levelKey = `K${i}` as ScaleLevel;
      maxZ = SCALE_Z_LEVELS[levelKey].max;
    }
    
    return {
      minZ: SCALE_Z_LEVELS.K1.min,
      maxZ,
      currentZ: maxZ / 2,
      locked: true,
      lockedScale: scale,
    };
  }
  
  /**
   * Set UI hooks for visual feedback
   */
  setUIHooks(hooks: UIHooks): void {
    this.uiHooks = hooks;
  }
  
  /**
   * Get operator's scale
   */
  getOperatorScale(): ScaleLevel {
    return this.operatorScale;
  }
  
  /**
   * Process camera movement request
   */
  requestCameraMove(targetZ: number): { allowed: boolean; finalZ: number } {
    const validation = validateCameraZ(targetZ, this.constraints);
    
    if (validation.violation) {
      const attempt: ViolationAttempt = {
        type: 'zoom_out',
        timestamp: Date.now(),
        targetScale: getScaleFromZ(targetZ),
        blocked: true,
      };
      this.violationLog.push(attempt);
      
      if (this.uiHooks) {
        this.uiHooks.onCameraViolation(attempt);
        this.uiHooks.applyVisualNoise(0.7);
        this.uiHooks.snapCameraBack(this.constraints.currentZ);
      }
      
      return { allowed: false, finalZ: this.constraints.currentZ };
    }
    
    this.constraints.currentZ = validation.clampedZ;
    return { allowed: true, finalZ: validation.clampedZ };
  }
  
  /**
   * Process node interaction request
   */
  requestNodeInteraction(node: ScaleNode): {
    allowed: boolean;
    visibility: NodeVisibility;
  } {
    const visibility = getNodeVisibility(node, this.operatorScale);
    
    if (visibility.interaction === 'blocked') {
      const attempt: ViolationAttempt = {
        type: 'access_higher_orbit',
        timestamp: Date.now(),
        targetScale: node.scale,
        blocked: true,
      };
      this.violationLog.push(attempt);
      
      if (this.uiHooks) {
        this.uiHooks.onActionBlocked(visibility.clickMessage || 'Access denied');
      }
      
      return { allowed: false, visibility };
    }
    
    if (this.uiHooks) {
      this.uiHooks.onVisibilityChange(visibility);
    }
    
    return { allowed: true, visibility };
  }
  
  /**
   * Record and process operator action
   */
  recordAction(
    operatorId: string,
    node: ScaleNode,
    action: string
  ): { recorded: boolean; entropyDelta: number; trend: EntropyTrend } {
    // Check if action is allowed
    const { allowed } = this.requestNodeInteraction(node);
    if (!allowed) {
      return {
        recorded: false,
        entropyDelta: 0,
        trend: this.getCurrentEntropyTrend(),
      };
    }
    
    // Get node debt for entropy calculation
    const debtResult = this.inertiaEngine.processNode(node);
    const entropyDelta = calculateActionEntropyDelta(
      action,
      debtResult.currentInertiaDebt,
      node.mass
    );
    
    // Record action
    const operatorAction: OperatorAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operatorId,
      nodeId: node.id,
      action,
      timestamp: Date.now(),
      entropyDelta,
    };
    this.actionLog.push(operatorAction);
    this.entropyDeltas.push(entropyDelta);
    
    // Update inertia engine if entropy was reduced
    if (entropyDelta < 0) {
      this.inertiaEngine.recordEntropyReduction(node.id, Math.abs(entropyDelta) * 10);
    }
    
    const trend = this.getCurrentEntropyTrend();
    
    if (this.uiHooks) {
      this.uiHooks.onEntropyTrendUpdate(trend);
    }
    
    return { recorded: true, entropyDelta, trend };
  }
  
  /**
   * Get current entropy trend for operator
   */
  getCurrentEntropyTrend(): EntropyTrend {
    return calculateEntropyTrend(this.entropyDeltas);
  }
  
  /**
   * Get visibility for multiple nodes
   */
  getNodesVisibility(nodes: ScaleNode[]): NodeVisibility[] {
    return nodes.map(node => getNodeVisibility(node, this.operatorScale));
  }
  
  /**
   * Check what operator CAN see (K2 restrictions)
   */
  canSee(feature: string): boolean {
    const blockedFeatures = [
      'global_graphs',
      'strategic_flows',
      'future_projections',
      'k3_details',
      'k4_details',
      'system_metrics',
      'cross_region_data',
    ];
    return !blockedFeatures.includes(feature);
  }
  
  /**
   * Check what operator CAN affect (K2 restrictions)
   */
  canAffect(target: string): boolean {
    const allowedTargets = [
      'local_node_state',
      'execution_logs',
      'k1_nodes',
      'k2_nodes',
      'personal_metrics',
    ];
    return allowedTargets.includes(target);
  }
  
  /**
   * Get operator's action log
   */
  getActionLog(limit?: number): OperatorAction[] {
    if (limit) {
      return this.actionLog.slice(-limit);
    }
    return [...this.actionLog];
  }
  
  /**
   * Get violation log
   */
  getViolationLog(): ViolationAttempt[] {
    return [...this.violationLog];
  }
  
  /**
   * Get current camera constraints
   */
  getCameraConstraints(): CameraConstraints {
    return { ...this.constraints };
  }
  
  /**
   * Reset controller state
   */
  reset(): void {
    this.constraints = this.createConstraintsForScale(this.operatorScale);
    this.actionLog = [];
    this.entropyDeltas = [];
    this.violationLog = [];
  }
}

// ============================================
// Interface Contracts for UI
// ============================================

export interface IScaleLockUIContract {
  // Visual state updates
  updateNodeVisibility(visibility: NodeVisibility): void;
  updateEntropyIndicator(trend: EntropyTrend): void;
  
  // Camera control
  setCameraZ(z: number): void;
  applyCameraShake(intensity: number): void;
  
  // Feedback
  showBlockedMessage(message: string): void;
  showVisualNoise(duration: number, intensity: number): void;
  
  // Node rendering hints
  renderNodeAsShape(nodeId: string): void;
  renderNodeFull(nodeId: string): void;
  hideNode(nodeId: string): void;
}

export interface IScaleLockDataContract {
  // Data queries (what K2 can access)
  getLocalNodes(): ScaleNode[];
  getExecutionLogs(): OperatorAction[];
  
  // Data mutations (what K2 can modify)
  updateLocalNodeState(nodeId: string, state: Partial<Node>): void;
  appendExecutionLog(action: OperatorAction): void;
}

// ============================================
// Test Cases
// ============================================

export function runScaleLockTests(): void {
  console.log('=== AUTUS v2.0 K2 Scale Lock Tests ===\n');
  
  const inertiaEngine = new InertiaDebtEngine();
  const controller = new K2ScaleLockController(inertiaEngine);
  
  // Test Case 1: Camera Movement
  console.log('--- Test 1: Camera Movement ---');
  
  const validMove = controller.requestCameraMove(20);
  console.log('Move to Z=20:', validMove.allowed ? 'ALLOWED' : 'BLOCKED', '→', validMove.finalZ);
  
  const invalidMove = controller.requestCameraMove(100);
  console.log('Move to Z=100:', invalidMove.allowed ? 'ALLOWED' : 'BLOCKED', '→', invalidMove.finalZ);
  console.log();
  
  // Test Case 2: Node Visibility
  console.log('--- Test 2: Node Visibility ---');
  
  const k1Node: ScaleNode = {
    id: 'k1-node',
    mass: 5,
    createdAt: Date.now(),
    lastActionAt: Date.now(),
    psi: 0.3,
    status: 'active',
    scale: 'K1',
    position: { x: 0, y: 0, z: 5 },
    parentId: null,
    childIds: [],
  };
  
  const k3Node: ScaleNode = {
    id: 'k3-node',
    mass: 7,
    createdAt: Date.now(),
    lastActionAt: Date.now(),
    psi: 0.5,
    status: 'active',
    scale: 'K3',
    position: { x: 0, y: 0, z: 40 },
    parentId: null,
    childIds: [],
  };
  
  const k1Vis = getNodeVisibility(k1Node);
  console.log('K1 Node Visibility:', k1Vis.visibility, '| Interaction:', k1Vis.interaction);
  
  const k3Vis = getNodeVisibility(k3Node);
  console.log('K3 Node Visibility:', k3Vis.visibility, '| Interaction:', k3Vis.interaction);
  console.log('K3 Click Message:', k3Vis.clickMessage);
  console.log();
  
  // Test Case 3: Action Recording
  console.log('--- Test 3: Action Recording ---');
  
  const result1 = controller.recordAction('op-001', k1Node, 'complete');
  console.log('Action on K1 node:', result1.recorded ? 'RECORDED' : 'BLOCKED');
  console.log('Entropy Delta:', result1.entropyDelta.toFixed(4));
  console.log('Trend:', result1.trend.symbol, result1.trend.direction);
  
  const result2 = controller.recordAction('op-001', k3Node, 'complete');
  console.log('Action on K3 node:', result2.recorded ? 'RECORDED' : 'BLOCKED');
  console.log();
  
  // Test Case 4: Permission Checks
  console.log('--- Test 4: Permission Checks ---');
  console.log('Can see global_graphs:', controller.canSee('global_graphs'));
  console.log('Can see local_node_state:', controller.canSee('local_node_state'));
  console.log('Can affect local_node_state:', controller.canAffect('local_node_state'));
  console.log('Can affect strategic_flows:', controller.canAffect('strategic_flows'));
  console.log();
  
  // Test Case 5: Entropy Trend
  console.log('--- Test 5: Entropy Trend Simulation ---');
  
  // Simulate multiple actions
  for (let i = 0; i < 5; i++) {
    controller.recordAction('op-001', k1Node, 'complete');
  }
  for (let i = 0; i < 3; i++) {
    controller.recordAction('op-001', k1Node, 'delay');
  }
  
  const finalTrend = controller.getCurrentEntropyTrend();
  console.log('Final Entropy Trend:', finalTrend.symbol);
  console.log('Direction:', finalTrend.direction);
  console.log('Magnitude:', finalTrend.magnitude);
  console.log();
  
  console.log('=== All Scale Lock Tests Complete ===');
}
