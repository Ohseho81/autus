/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 KRATON DESIGN SYSTEM - Colors & Theme
 * 12 Cycles Integrated Design System
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ColorState {
  primary: string;
  glow: string;
  bg: string;
  gradient: string;
}

export const COLORS = {
  // Temperature States
  safe: {
    primary: '#00D4FF',
    glow: 'rgba(0, 212, 255, 0.5)',
    bg: 'rgba(0, 212, 255, 0.08)',
    gradient: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
  } as ColorState,
  
  caution: {
    primary: '#FF6B35',
    glow: 'rgba(255, 107, 53, 0.5)',
    bg: 'rgba(255, 107, 53, 0.08)',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)',
  } as ColorState,
  
  danger: {
    primary: '#FF2E63',
    glow: 'rgba(255, 46, 99, 0.5)',
    bg: 'rgba(255, 46, 99, 0.08)',
    gradient: 'linear-gradient(135deg, #FF2E63 0%, #DC143C 100%)',
  } as ColorState,
  
  success: {
    primary: '#00F5A0',
    glow: 'rgba(0, 245, 160, 0.5)',
    bg: 'rgba(0, 245, 160, 0.08)',
    gradient: 'linear-gradient(135deg, #00F5A0 0%, #00D48A 100%)',
  } as ColorState,

  // UI Colors
  background: '#0A0E17',
  surface: '#111827',
  surfaceLight: '#1F2937',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDim: 'rgba(255, 255, 255, 0.4)',
};

// Temperature-based color selection
export const getTemperatureColor = (temp: number): ColorState => {
  if (temp < 60) return COLORS.safe;
  if (temp < 80) return COLORS.caution;
  return COLORS.danger;
};

// Sigma-based color selection
export const getSigmaColor = (sigma: number): ColorState => {
  if (sigma >= 0.8) return COLORS.success;
  if (sigma >= 0.6) return COLORS.caution;
  return COLORS.danger;
};

// Status-based color selection
export const getStatusColor = (status: string): ColorState => {
  switch (status) {
    case 'safe':
    case 'good':
    case 'healthy':
      return COLORS.success;
    case 'caution':
    case 'warning':
      return COLORS.caution;
    case 'danger':
    case 'critical':
      return COLORS.danger;
    default:
      return COLORS.safe;
  }
};

// Priority-based styling
export const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'high':
    case 'urgent':
      return { color: COLORS.danger, label: '긴급' };
    case 'medium':
      return { color: COLORS.caution, label: '중요' };
    case 'low':
      return { color: COLORS.safe, label: '일반' };
    default:
      return { color: COLORS.safe, label: '' };
  }
};

export default COLORS;
