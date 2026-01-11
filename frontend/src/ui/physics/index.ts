/**
 * Physics UI Components Export
 */

// Re-export from bridge
export * from './PhysicsUIBridge';
export * from './PhysicsComponents';

// Additional exports for PhysicsDashboard
export type UncertaintyLevel = 'range' | 'estimate' | 'point';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
  uncertainty?: UncertaintyLevel;
  priority?: Priority;
  enabled?: boolean;
  onExecute?: () => void;
}

export const PHYSICS = {
  FINANCIAL: 0,
  CAPITAL: 1,
  COMPLIANCE: 2,
  CONTROL: 3,
  REPUTATION: 4,
  STAKEHOLDER: 5,
};

export function getNoiseClass(level: UncertaintyLevel): string {
  switch (level) {
    case 'range': return 'opacity-70';
    case 'estimate': return 'opacity-85';
    case 'point': return 'opacity-100';
    default: return '';
  }
}

export function getValueColor(value: number): string {
  if (value >= 0.7) return '#22c55e';
  if (value >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export function injectPhysicsStyles(): void {
  // Inject global physics styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes physics-pulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
    .physics-pulse { animation: physics-pulse 2s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

