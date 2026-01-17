// ============================================
// AUTUS v2.0 Physical Engine
// Inertia Debt Engine
// ============================================
//
// 핵심 공식: D = m × Δt × ψ
// - m (mass): 업무 중요도 (1-10)
// - Δt (deltaTime): 지연 시간 (hours)
// - ψ (psi): 비가역성 상수 (0-1)
//
// ============================================

// Types
export interface Node {
  id: string;
  mass: number;           // m: task importance (1-10)
  createdAt: number;      // timestamp
  lastActionAt: number;   // timestamp
  psi: number;            // ψ: irreversibility constant (0-1)
  status: 'active' | 'pending' | 'blocked' | 'dark_matter';
}

export interface InertiaDebtResult {
  nodeId: string;
  currentInertiaDebt: number;
  dragCoefficient: number;
  entropyDeltaContribution: number;
  status: 'normal' | 'warning' | 'critical' | 'dark_matter';
  flags: string[];
}

export interface EngineConfig {
  debtThresholdWarning: number;
  debtThresholdCritical: number;
  debtThresholdDarkMatter: number;
  decayRate: number;
  maxDragCoefficient: number;
  entropyScale: number;
}

// Default Configuration
export const DEFAULT_CONFIG: EngineConfig = {
  debtThresholdWarning: 50,
  debtThresholdCritical: 150,
  debtThresholdDarkMatter: 300,
  decayRate: 0.05,
  maxDragCoefficient: 0.95,
  entropyScale: 0.1,
};

// ============================================
// Core Functions
// ============================================

/**
 * Calculate Inertia Debt for a node
 * D = m * Δt * ψ
 */
export function calculateInertiaDebt(
  mass: number,
  deltaTimeHours: number,
  psi: number
): number {
  // Validate inputs
  const m = Math.max(1, Math.min(10, mass));
  const dt = Math.max(0, deltaTimeHours);
  const irreversibility = Math.max(0, Math.min(1, psi));
  
  return m * dt * irreversibility;
}

/**
 * Calculate delta time in hours from timestamps
 */
export function calculateDeltaTime(
  lastActionAt: number,
  currentTime: number = Date.now()
): number {
  const deltaMs = currentTime - lastActionAt;
  return Math.max(0, deltaMs / (1000 * 60 * 60)); // Convert to hours
}

/**
 * Calculate drag coefficient from inertia debt
 * Higher debt = higher drag (0 to maxDragCoefficient)
 */
export function calculateDragCoefficient(
  debt: number,
  config: EngineConfig = DEFAULT_CONFIG
): number {
  const normalized = debt / config.debtThresholdDarkMatter;
  const drag = Math.tanh(normalized) * config.maxDragCoefficient;
  return Math.min(config.maxDragCoefficient, Math.max(0, drag));
}

/**
 * Calculate entropy delta contribution
 * Measures how much this node contributes to system entropy
 */
export function calculateEntropyDelta(
  debt: number,
  mass: number,
  config: EngineConfig = DEFAULT_CONFIG
): number {
  return debt * mass * config.entropyScale;
}

/**
 * Determine node status based on debt level
 */
export function determineStatus(
  debt: number,
  config: EngineConfig = DEFAULT_CONFIG
): 'normal' | 'warning' | 'critical' | 'dark_matter' {
  if (debt >= config.debtThresholdDarkMatter) return 'dark_matter';
  if (debt >= config.debtThresholdCritical) return 'critical';
  if (debt >= config.debtThresholdWarning) return 'warning';
  return 'normal';
}

/**
 * Generate flags based on debt status
 */
export function generateFlags(
  status: 'normal' | 'warning' | 'critical' | 'dark_matter',
  dragCoefficient: number
): string[] {
  const flags: string[] = [];
  
  if (status === 'dark_matter') {
    flags.push('DARK_MATTER_VISUAL');
    flags.push('INTERACTION_BLOCKED');
    flags.push('REQUIRES_INTERVENTION');
  }
  
  if (status === 'critical') {
    flags.push('HIGH_LATENCY');
    flags.push('REDUCED_ACTIONS');
  }
  
  if (status === 'warning') {
    flags.push('INCREASED_LATENCY');
  }
  
  if (dragCoefficient > 0.7) {
    flags.push('SEVERE_DRAG');
  } else if (dragCoefficient > 0.4) {
    flags.push('MODERATE_DRAG');
  }
  
  return flags;
}

/**
 * Apply decay to inertia debt
 * Only decays if conditions are met
 */
export function applyDecay(
  currentDebt: number,
  entropyReduced: boolean,
  noNewViolations: boolean,
  config: EngineConfig = DEFAULT_CONFIG
): number {
  if (entropyReduced && noNewViolations) {
    return currentDebt * (1 - config.decayRate);
  }
  return currentDebt;
}

// ============================================
// Main Engine
// ============================================

export class InertiaDebtEngine {
  private config: EngineConfig;
  private debtLedger: Map<string, number>;
  private violationLog: Map<string, number[]>;
  
  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.debtLedger = new Map();
    this.violationLog = new Map();
  }
  
  /**
   * Process a node and compute its inertia debt metrics
   */
  processNode(node: Node, currentTime: number = Date.now()): InertiaDebtResult {
    const deltaTime = calculateDeltaTime(node.lastActionAt, currentTime);
    const newDebt = calculateInertiaDebt(node.mass, deltaTime, node.psi);
    
    // Get existing debt and accumulate
    const existingDebt = this.debtLedger.get(node.id) || 0;
    const totalDebt = existingDebt + newDebt;
    
    // Update ledger
    this.debtLedger.set(node.id, totalDebt);
    
    // Calculate derived metrics
    const dragCoefficient = calculateDragCoefficient(totalDebt, this.config);
    const entropyDelta = calculateEntropyDelta(totalDebt, node.mass, this.config);
    const status = determineStatus(totalDebt, this.config);
    const flags = generateFlags(status, dragCoefficient);
    
    return {
      nodeId: node.id,
      currentInertiaDebt: totalDebt,
      dragCoefficient,
      entropyDeltaContribution: entropyDelta,
      status,
      flags,
    };
  }
  
  /**
   * Record an action that reduces entropy
   */
  recordEntropyReduction(nodeId: string, amount: number): void {
    const currentDebt = this.debtLedger.get(nodeId) || 0;
    const reducedDebt = Math.max(0, currentDebt - amount);
    this.debtLedger.set(nodeId, reducedDebt);
  }
  
  /**
   * Record a violation for a node
   */
  recordViolation(nodeId: string, timestamp: number = Date.now()): void {
    const violations = this.violationLog.get(nodeId) || [];
    violations.push(timestamp);
    this.violationLog.set(nodeId, violations);
  }
  
  /**
   * Check if node has recent violations
   */
  hasRecentViolations(nodeId: string, windowHours: number = 24): boolean {
    const violations = this.violationLog.get(nodeId) || [];
    const cutoff = Date.now() - (windowHours * 60 * 60 * 1000);
    return violations.some(v => v > cutoff);
  }
  
  /**
   * Apply decay cycle to all nodes
   */
  runDecayCycle(entropyReducedNodes: Set<string>): Map<string, number> {
    const results = new Map<string, number>();
    
    for (const [nodeId, debt] of this.debtLedger) {
      const entropyReduced = entropyReducedNodes.has(nodeId);
      const noViolations = !this.hasRecentViolations(nodeId);
      const newDebt = applyDecay(debt, entropyReduced, noViolations, this.config);
      
      this.debtLedger.set(nodeId, newDebt);
      results.set(nodeId, newDebt);
    }
    
    return results;
  }
  
  /**
   * Get interaction latency modifier based on debt
   */
  getLatencyModifier(nodeId: string): number {
    const debt = this.debtLedger.get(nodeId) || 0;
    const status = determineStatus(debt, this.config);
    
    switch (status) {
      case 'dark_matter': return 5.0;  // 5x latency
      case 'critical': return 2.5;     // 2.5x latency
      case 'warning': return 1.5;      // 1.5x latency
      default: return 1.0;             // Normal
    }
  }
  
  /**
   * Get available actions based on debt level
   */
  getAvailableActions(nodeId: string, allActions: string[]): string[] {
    const debt = this.debtLedger.get(nodeId) || 0;
    const status = determineStatus(debt, this.config);
    
    switch (status) {
      case 'dark_matter':
        return ['request_intervention'];
      case 'critical':
        return allActions.slice(0, Math.ceil(allActions.length * 0.3));
      case 'warning':
        return allActions.slice(0, Math.ceil(allActions.length * 0.6));
      default:
        return allActions;
    }
  }
  
  /**
   * Get current debt for a node
   */
  getDebt(nodeId: string): number {
    return this.debtLedger.get(nodeId) || 0;
  }
  
  /**
   * Get all debts
   */
  getAllDebts(): Map<string, number> {
    return new Map(this.debtLedger);
  }
  
  /**
   * Get config
   */
  getConfig(): EngineConfig {
    return { ...this.config };
  }
  
  /**
   * Reset engine state
   */
  reset(): void {
    this.debtLedger.clear();
    this.violationLog.clear();
  }
}

// ============================================
// Test Cases
// ============================================

export function runTestCases(): void {
  console.log('=== AUTUS v2.0 Inertia Debt Engine Tests ===\n');
  
  const engine = new InertiaDebtEngine();
  
  // Test Case 1: Low Debt Node
  console.log('--- Test Case 1: Low Debt Node ---');
  const lowDebtNode: Node = {
    id: 'node-001',
    mass: 3,
    createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    lastActionAt: Date.now() - 1000 * 60 * 30,   // 30 min ago
    psi: 0.2,
    status: 'active',
  };
  
  const lowResult = engine.processNode(lowDebtNode);
  console.log('Node:', lowDebtNode.id);
  console.log('Inertia Debt:', lowResult.currentInertiaDebt.toFixed(2));
  console.log('Drag Coefficient:', lowResult.dragCoefficient.toFixed(4));
  console.log('Entropy Delta:', lowResult.entropyDeltaContribution.toFixed(4));
  console.log('Status:', lowResult.status);
  console.log('Flags:', lowResult.flags);
  console.log();
  
  // Test Case 2: High Debt Node
  console.log('--- Test Case 2: High Debt Node ---');
  const highDebtNode: Node = {
    id: 'node-002',
    mass: 9,
    createdAt: Date.now() - 1000 * 60 * 60 * 72,  // 72 hours ago
    lastActionAt: Date.now() - 1000 * 60 * 60 * 48, // 48 hours ago
    psi: 0.8,
    status: 'pending',
  };
  
  const highResult = engine.processNode(highDebtNode);
  console.log('Node:', highDebtNode.id);
  console.log('Inertia Debt:', highResult.currentInertiaDebt.toFixed(2));
  console.log('Drag Coefficient:', highResult.dragCoefficient.toFixed(4));
  console.log('Entropy Delta:', highResult.entropyDeltaContribution.toFixed(4));
  console.log('Status:', highResult.status);
  console.log('Flags:', highResult.flags);
  console.log('Latency Modifier:', engine.getLatencyModifier(highDebtNode.id));
  console.log();
  
  // Test Case 3: Dark Matter Node
  console.log('--- Test Case 3: Dark Matter Node ---');
  const darkMatterNode: Node = {
    id: 'node-003',
    mass: 10,
    createdAt: Date.now() - 1000 * 60 * 60 * 168,  // 1 week ago
    lastActionAt: Date.now() - 1000 * 60 * 60 * 120, // 5 days ago
    psi: 0.95,
    status: 'blocked',
  };
  
  const darkResult = engine.processNode(darkMatterNode);
  console.log('Node:', darkMatterNode.id);
  console.log('Inertia Debt:', darkResult.currentInertiaDebt.toFixed(2));
  console.log('Drag Coefficient:', darkResult.dragCoefficient.toFixed(4));
  console.log('Status:', darkResult.status);
  console.log('Flags:', darkResult.flags);
  
  const allActions = ['execute', 'delegate', 'reschedule', 'escalate', 'archive'];
  console.log('Available Actions:', engine.getAvailableActions(darkMatterNode.id, allActions));
  console.log();
  
  // Test Case 4: Decay Cycle
  console.log('--- Test Case 4: Decay Cycle ---');
  const entropyReducedNodes = new Set(['node-001']);
  const beforeDecay = engine.getDebt('node-001');
  engine.runDecayCycle(entropyReducedNodes);
  const afterDecay = engine.getDebt('node-001');
  console.log('Node-001 Debt Before Decay:', beforeDecay.toFixed(2));
  console.log('Node-001 Debt After Decay:', afterDecay.toFixed(2));
  console.log('Decay Applied:', (beforeDecay - afterDecay).toFixed(4));
  console.log();
  
  console.log('=== All Tests Complete ===');
}
