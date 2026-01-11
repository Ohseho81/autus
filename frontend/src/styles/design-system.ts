/**
 * AUTUS Design System v2.0
 * ========================
 * 
 * 통일된 색상, 스타일, 유틸리티
 */

// ════════════════════════════════════════════════════════════════════════════════
// Colors
// ════════════════════════════════════════════════════════════════════════════════

export const colors = {
  // Physics Colors
  financial: '#3b82f6',    // Blue
  capital: '#ef4444',      // Red
  compliance: '#10b981',   // Green
  control: '#f59e0b',      // Amber
  reputation: '#8b5cf6',   // Purple
  stakeholder: '#ec4899',  // Pink
  
  // Kernel Node Colors (6노드)
  kernel: {
    BIO: '#22c55e',         // Green
    CAPITAL: '#3b82f6',     // Blue
    COGNITION: '#8b5cf6',   // Purple
    RELATION: '#ec4899',    // Pink
    ENVIRONMENT: '#f59e0b', // Amber
    LEGACY: '#6366f1',      // Indigo
    SECURITY: '#ef4444',    // Red
  },
  
  // UI Port Colors (9포트)
  ui: {
    HEALTH: '#22c55e',
    WEALTH: '#3b82f6',
    CAREER: '#8b5cf6',
    SOCIAL: '#ec4899',
    FAMILY: '#f97316',
    LEARNING: '#06b6d4',
    SECURITY: '#ef4444',
    LEISURE: '#84cc16',
    VALUES: '#6366f1',
  },
  
  // UI Colors
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#475569',
  borderLight: '#64748b',
  
  // Text Colors
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  
  // Status Colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Value Colors (for gauges, etc)
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
};

// Physics별 색상
export const PHYSICS_COLORS: Record<number, string> = {
  0: colors.financial,
  1: colors.capital,
  2: colors.compliance,
  3: colors.control,
  4: colors.reputation,
  5: colors.stakeholder,
};

// Physics 이름
export const PHYSICS_NAMES: Record<number, string> = {
  0: 'FINANCIAL_HEALTH',
  1: 'CAPITAL_RISK',
  2: 'COMPLIANCE_IQ',
  3: 'CONTROL_ENV',
  4: 'REPUTATION',
  5: 'STAKEHOLDER',
};

export const PHYSICS_NAMES_KO: Record<number, string> = {
  0: '재무건전성',
  1: '자본위험',
  2: '규정준수',
  3: '통제환경',
  4: '평판',
  5: '이해관계자',
};

// ════════════════════════════════════════════════════════════════════════════════
// Value Utilities
// ════════════════════════════════════════════════════════════════════════════════

export function getValueColor(value: number): string {
  if (value >= 0.7) return colors.high;
  if (value >= 0.4) return colors.medium;
  return colors.low;
}

export function getValueColorClass(value: number): string {
  if (value >= 0.7) return 'text-green-400';
  if (value >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

export function getValueBgClass(value: number): string {
  if (value >= 0.7) return 'bg-green-500/20';
  if (value >= 0.4) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

// ════════════════════════════════════════════════════════════════════════════════
// Class Utilities
// ════════════════════════════════════════════════════════════════════════════════

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ════════════════════════════════════════════════════════════════════════════════
// Format Utilities
// ════════════════════════════════════════════════════════════════════════════════

export function formatCurrency(value: number): string {
  return `₩${Math.round(value).toLocaleString()}`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// Animation Constants
// ════════════════════════════════════════════════════════════════════════════════

export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  pulse: '2s ease-in-out infinite',
};

// ════════════════════════════════════════════════════════════════════════════════
// Common Styles
// ════════════════════════════════════════════════════════════════════════════════

export const cardStyle = 'bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl';
export const buttonStyle = 'px-4 py-2 rounded-lg transition-all';
export const inputStyle = 'bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500';

