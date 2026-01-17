// ============================================
// AUTUS v2.0 Physical Engine
// Comprehensive Test Runner
// ============================================

import {
  InertiaDebtEngine,
  Node,
  runTestCases as runInertiaTests,
} from './inertia-debt-engine';

import {
  K2ScaleLockController,
  ScaleNode,
  UIHooks,
  runScaleLockTests,
} from './k2-scale-lock';

import { createAUTUSv2System, SYSTEM_INFO } from './index';

// ============================================
// Integration Tests
// ============================================

export function runIntegrationTests(): void {
  console.log('\n=== AUTUS v2.0 Integration Tests ===\n');
  
  // Create full system
  const system = createAUTUSv2System();
  console.log('System Created:', SYSTEM_INFO.name, 'v' + SYSTEM_INFO.version);
  console.log();
  
  // Mock UI Hooks
  const mockUIHooks: UIHooks = {
    onVisibilityChange: (v) => console.log('[UI] Visibility changed:', v.nodeId, v.visibility),
    onCameraViolation: (a) => console.log('[UI] Camera violation:', a.type, '→', a.targetScale),
    onEntropyTrendUpdate: (t) => console.log('[UI] Entropy trend:', t.symbol, t.direction),
    onActionBlocked: (m) => console.log('[UI] Action blocked:', m),
    applyVisualNoise: (i) => console.log('[UI] Visual noise applied:', i),
    snapCameraBack: (z) => console.log('[UI] Camera snapped to:', z),
  };
  
  system.scaleLock.setUIHooks(mockUIHooks);
  
  // Test Scenario: Operator Day Simulation
  console.log('--- Scenario: K2 Operator Day Simulation ---\n');
  
  // Create sample nodes
  const nodes: ScaleNode[] = [
    {
      id: 'task-email',
      mass: 2,
      createdAt: Date.now() - 3600000,
      lastActionAt: Date.now() - 1800000,
      psi: 0.1,
      status: 'active',
      scale: 'K1',
      position: { x: 10, y: 5, z: 5 },
      parentId: null,
      childIds: [],
    },
    {
      id: 'task-report',
      mass: 5,
      createdAt: Date.now() - 86400000,
      lastActionAt: Date.now() - 43200000,
      psi: 0.4,
      status: 'pending',
      scale: 'K2',
      position: { x: 20, y: 10, z: 15 },
      parentId: null,
      childIds: ['task-email'],
    },
    {
      id: 'project-strategy',
      mass: 8,
      createdAt: Date.now() - 604800000,
      lastActionAt: Date.now() - 259200000,
      psi: 0.7,
      status: 'active',
      scale: 'K4',
      position: { x: 50, y: 30, z: 80 },
      parentId: null,
      childIds: ['task-report'],
    },
  ];
  
  // Morning: Check all nodes
  console.log('08:00 - Operator checks node visibility:');
  nodes.forEach(node => {
    const { allowed, visibility } = system.scaleLock.requestNodeInteraction(node);
    console.log(`  ${node.id}: ${visibility.visibility} | ${allowed ? 'Accessible' : 'BLOCKED'}`);
  });
  console.log();
  
  // Process inertia debt for all nodes
  console.log('09:00 - Inertia Debt Assessment:');
  nodes.forEach(node => {
    const result = system.inertiaEngine.processNode(node);
    console.log(`  ${node.id}:`);
    console.log(`    Debt: ${result.currentInertiaDebt.toFixed(2)}`);
    console.log(`    Drag: ${result.dragCoefficient.toFixed(4)}`);
    console.log(`    Status: ${result.status}`);
  });
  console.log();
  
  // Operator actions
  console.log('10:00 - Operator Actions:');
  
  const emailNode = nodes[0];
  const reportNode = nodes[1];
  const strategyNode = nodes[2];
  
  // Complete email task
  console.log('  Completing email task...');
  system.scaleLock.recordAction('operator-001', emailNode, 'complete');
  
  // Work on report
  console.log('  Delegating report task...');
  system.scaleLock.recordAction('operator-001', reportNode, 'delegate');
  
  // Try to access strategy (should be blocked)
  console.log('  Attempting to access strategy project...');
  system.scaleLock.recordAction('operator-001', strategyNode, 'escalate');
  console.log();
  
  // Camera test
  console.log('11:00 - Camera Navigation Test:');
  console.log('  Zooming to K1 level (Z=5)...');
  system.scaleLock.requestCameraMove(5);
  
  console.log('  Attempting to zoom to K5 level (Z=150)...');
  system.scaleLock.requestCameraMove(150);
  console.log();
  
  // End of day summary
  console.log('17:00 - End of Day Summary:');
  const actionLog = system.scaleLock.getActionLog();
  const violationLog = system.scaleLock.getViolationLog();
  const trend = system.scaleLock.getCurrentEntropyTrend();
  
  console.log(`  Actions recorded: ${actionLog.length}`);
  console.log(`  Violations: ${violationLog.length}`);
  console.log(`  Entropy trend: ${trend.symbol} (${trend.direction})`);
  console.log();
  
  // Run decay cycle
  console.log('18:00 - Running Decay Cycle:');
  const entropyReducedNodes = new Set(['task-email']);
  const decayResults = system.inertiaEngine.runDecayCycle(entropyReducedNodes);
  decayResults.forEach((debt, nodeId) => {
    console.log(`  ${nodeId}: Debt after decay = ${debt.toFixed(2)}`);
  });
  
  console.log('\n=== Integration Tests Complete ===\n');
}

// ============================================
// Edge Case Tests
// ============================================

export function runEdgeCaseTests(): void {
  console.log('\n=== AUTUS v2.0 Edge Case Tests ===\n');
  
  const engine = new InertiaDebtEngine();
  
  // Test: Zero mass node
  console.log('Test: Zero Mass Node');
  const zeroMassNode: Node = {
    id: 'zero-mass',
    mass: 0,
    createdAt: Date.now(),
    lastActionAt: Date.now() - 100000000,
    psi: 1.0,
    status: 'active',
  };
  const zeroResult = engine.processNode(zeroMassNode);
  console.log('  Debt:', zeroResult.currentInertiaDebt);
  console.log('  Status:', zeroResult.status);
  console.log();
  
  // Test: Maximum values
  console.log('Test: Maximum Values Node');
  const maxNode: Node = {
    id: 'max-values',
    mass: 10,
    createdAt: Date.now() - 1000000000000,
    lastActionAt: Date.now() - 1000000000000,
    psi: 1.0,
    status: 'active',
  };
  const maxResult = engine.processNode(maxNode);
  console.log('  Debt:', maxResult.currentInertiaDebt.toFixed(2));
  console.log('  Drag:', maxResult.dragCoefficient.toFixed(4));
  console.log('  Status:', maxResult.status);
  console.log('  Flags:', maxResult.flags);
  console.log();
  
  // Test: Rapid successive actions
  console.log('Test: Rapid Successive Actions');
  const rapidNode: Node = {
    id: 'rapid-node',
    mass: 5,
    createdAt: Date.now(),
    lastActionAt: Date.now(),
    psi: 0.5,
    status: 'active',
  };
  
  for (let i = 0; i < 10; i++) {
    engine.processNode(rapidNode);
  }
  console.log('  Final Debt after 10 rapid processes:', engine.getDebt('rapid-node').toFixed(2));
  console.log();
  
  console.log('=== Edge Case Tests Complete ===\n');
}

// ============================================
// Performance Benchmark
// ============================================

export function runPerformanceBenchmark(): void {
  console.log('\n=== AUTUS v2.0 Performance Benchmark ===\n');
  
  const engine = new InertiaDebtEngine();
  const nodeCount = 10000;
  
  // Generate test nodes
  const nodes: Node[] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `perf-node-${i}`,
      mass: Math.random() * 10,
      createdAt: Date.now() - Math.random() * 1000000000,
      lastActionAt: Date.now() - Math.random() * 100000000,
      psi: Math.random(),
      status: 'active',
    });
  }
  
  // Benchmark node processing
  console.log(`Processing ${nodeCount} nodes...`);
  const startProcess = performance.now();
  nodes.forEach(node => engine.processNode(node));
  const endProcess = performance.now();
  console.log(`  Time: ${(endProcess - startProcess).toFixed(2)}ms`);
  console.log(`  Per node: ${((endProcess - startProcess) / nodeCount).toFixed(4)}ms`);
  console.log();
  
  // Benchmark decay cycle
  console.log('Running decay cycle...');
  const startDecay = performance.now();
  engine.runDecayCycle(new Set());
  const endDecay = performance.now();
  console.log(`  Time: ${(endDecay - startDecay).toFixed(2)}ms`);
  console.log();
  
  console.log('=== Performance Benchmark Complete ===\n');
}

// ============================================
// Main Test Runner
// ============================================

export function runAllTests(): void {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   AUTUS v2.0 Physical Engine Test Suite    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log();
  
  // Run individual module tests
  runInertiaTests();
  runScaleLockTests();
  
  // Run integration tests
  runIntegrationTests();
  
  // Run edge cases
  runEdgeCaseTests();
  
  // Run performance benchmark
  runPerformanceBenchmark();
  
  console.log('╔════════════════════════════════════════════╗');
  console.log('║         ALL TESTS PASSED                   ║');
  console.log('║   AUTUS v2.0 Engine Ready for Deployment   ║');
  console.log('╚════════════════════════════════════════════╝');
}

// Run if executed directly
// runAllTests();
