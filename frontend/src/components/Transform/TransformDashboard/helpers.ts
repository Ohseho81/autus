import { COLORS } from './types';

// ============================================
// HELPERS
// ============================================
export const getStatus = (resonance: number): 'green' | 'yellow' | 'red' => {
  if (resonance >= 70) return 'green';
  if (resonance >= 45) return 'yellow';
  return 'red';
};

export const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
  switch (status) {
    case 'green': return COLORS.green;
    case 'yellow': return COLORS.yellow;
    case 'red': return COLORS.red;
  }
};

export const formatTime = (days: number): string => {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const getDirectionLabel = (dir: string): string => {
  switch (dir) {
    case 'closer': return '→ closer';
    case 'further': return '← further';
    default: return '• maintain';
  }
};
