// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Hooks Exports
// ═══════════════════════════════════════════════════════════════════════════════

// Physics Worker Hook
export { usePhysicsWorker } from './usePhysicsWorker';
export type { 
  WorkerNode, 
  WorkerCluster, 
  NodePosition 
} from '../workers/physicsWorker';

// Adaptive Performance Hook
export { 
  useAdaptivePerformance, 
  PerformanceOverlay 
} from './useAdaptivePerformance';
export type { 
  PerformanceLevel, 
  PerformanceSettings, 
  PerformanceStats 
} from './useAdaptivePerformance';
