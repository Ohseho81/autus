/**
 * AUTUS Color Palette
 */

// Re-export from design system
export { colors, PHYSICS_COLORS, PHYSICS_NAMES, PHYSICS_NAMES_KO, getValueColor } from './design-system';

// Additional color utilities
export const physicsGradients = {
  0: 'from-blue-500 to-cyan-500',
  1: 'from-red-500 to-orange-500',
  2: 'from-green-500 to-emerald-500',
  3: 'from-amber-500 to-yellow-500',
  4: 'from-purple-500 to-violet-500',
  5: 'from-pink-500 to-rose-500',
};

export const statusColors = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#64748b',
};

export const chartColors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

