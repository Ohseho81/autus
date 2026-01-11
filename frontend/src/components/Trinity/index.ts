/**
 * AUTUS Trinity - Component Exports
 */

// Main dashboard
export { default as TrinityDashboard } from './TrinityDashboard';
export { default as TrinityEngineDashboard } from './TrinityEngineDashboard';
export { default as TrinityEngineLite } from './TrinityEngineLite';
export { default } from './TrinityDashboard';

// Sub-components
export { default as Header } from './Header';
export { default as HexSVG } from './HexSVG';
export { default as DetailPanel } from './DetailPanel';
export { default as MatrixPanel } from './MatrixPanel';
export { default as ForecastCard } from './ForecastCard';
export { default as TaskList } from './TaskList';
export { default as MobileDrawer } from './MobileDrawer';
export { default as TrendChart } from './TrendChart';
export { default as TaskStatusPanel } from './TaskStatusPanel';
export { default as WorkflowPipeline } from './WorkflowPipeline';

// 72-Type System
export { default as Node72Matrix } from './Node72Matrix';
export { default as TransformationEngine } from './TransformationEngine';
export { default as MoneyFlowCube } from './MoneyFlowCube';
export * from './data/node72Types';
export * from './data/interactionMatrix';
export * from './data/forceTypes';
export * from './data/workTypes';
export * from './data/transformationMatrix';
export * from './data/populationDistribution';

// Physics system
export { 
  PhysicsEffectDisplay, 
  TotalPhysicsEffect, 
  calculatePhysicsEffect 
} from './PhysicsEffect';

// Game system
export {
  GameEngine,
  getGameEngine,
  resetGameEngine,
  createQuestFromTask,
  GAME_CONSTANTS
} from './GameEngine';

export {
  StatsBar,
  StatHexagon,
  ActionResultPopup,
  QuestPreview,
  RelationshipsPanel
} from './GameUI';

// Types
export * from './types';

// Constants
export * from './constants';

// Hooks
export * from './hooks';
