/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 AUTUS Design System v2.0
 * Apple Human Interface + 온리쌤 스타일 통합
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: "명품은 디테일에서 결정된다"
 * - 순수 블랙 배경 (#000000)
 * - Apple 시스템 컬러
 * - SF Pro 타이포그래피
 * - 0.5px 보더
 * - Blur 글래스모피즘
 */

import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// 온리쌤 v5 + Apple Design System 컬러
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // 배경 (Pure Black)
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  surfaceTertiary: '#3A3A3C',
  surfaceQuaternary: '#48484A',
  card: '#1C1C1E',
  glass: 'rgba(255, 255, 255, 0.03)',

  // Apple 시스템 컬러 (iOS 17+)
  apple: {
    blue: '#007AFF',
    green: '#30D158',
    indigo: '#5856D6',
    orange: '#FF9500',
    pink: '#FF375F',
    purple: '#BF5AF2',
    red: '#FF453A',
    teal: '#64D2FF',
    yellow: '#FFD60A',
    mint: '#66D4CF',
  },

  // 프라이머리 (농구 오렌지)
  primary: '#FF6B2C',
  primaryLight: '#FF8C42',
  primaryDark: '#E55A00',
  primaryGlow: 'rgba(255, 107, 44, 0.4)',
  primaryBg: 'rgba(255, 107, 44, 0.15)',

  // 상태 컬러 (Apple 시스템)
  success: {
    primary: '#30D158',
    light: '#34C759',
    glow: 'rgba(48, 209, 88, 0.5)',
    bg: 'rgba(48, 209, 88, 0.14)',
  },
  caution: {
    primary: '#FFD60A',
    light: '#FFE620',
    glow: 'rgba(255, 214, 10, 0.5)',
    bg: 'rgba(255, 214, 10, 0.14)',
  },
  danger: {
    primary: '#FF453A',
    light: '#FF6961',
    glow: 'rgba(255, 69, 58, 0.5)',
    bg: 'rgba(255, 69, 58, 0.14)',
  },
  safe: {
    primary: '#30D158',
    glow: 'rgba(48, 209, 88, 0.5)',
    bg: 'rgba(48, 209, 88, 0.14)',
  },

  // 감사 (핑크)
  gratitude: {
    primary: '#FF375F',
    light: '#FF6B8A',
    glow: 'rgba(255, 55, 95, 0.5)',
    bg: 'rgba(255, 55, 95, 0.14)',
  },

  // 궁합 (퍼플)
  compatibility: {
    primary: '#BF5AF2',
    light: '#D17DF5',
    glow: 'rgba(191, 90, 242, 0.5)',
    bg: 'rgba(191, 90, 242, 0.14)',
  },

  // 텍스트 (Apple Label Colors)
  text: {
    primary: '#FFFFFF',
    secondary: '#EBEBF5',
    tertiary: 'rgba(235, 235, 245, 0.6)',
    quaternary: 'rgba(235, 235, 245, 0.3)',
    muted: 'rgba(235, 235, 245, 0.18)',
    disabled: 'rgba(235, 235, 245, 0.1)',
  },

  // 보더
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 107, 44, 0.3)',
  },

  // 역할별 컬러
  roles: {
    owner: {
      primary: '#FF6B2C',
      gradient: ['#FF6B2C', '#FF8C42'] as [string, string],
      glow: 'rgba(255, 107, 44, 0.4)',
    },
    coach: {
      primary: '#FF453A',
      gradient: ['#FF453A', '#FF6B7A'] as [string, string],
      glow: 'rgba(255, 69, 58, 0.4)',
    },
    admin: {
      primary: '#BF5AF2',
      gradient: ['#BF5AF2', '#D17DF5'] as [string, string],
      glow: 'rgba(191, 90, 242, 0.4)',
    },
  },

  // 레거시 호환
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textMuted: 'rgba(235, 235, 245, 0.3)',
  textDim: 'rgba(235, 235, 245, 0.18)',
  borderPrimary: 'rgba(255, 255, 255, 0.08)',
  surfaceLight: '#2C2C2E',
  
  // 레거시 special 컬러
  special: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    basketball: '#FF6B2C',
  },

  // 레거시 status 컬러 (전체)
  status: {
    success: {
      primary: '#30D158',
      light: '#34C759',
      dark: '#28B94F',
      glow: 'rgba(48, 209, 88, 0.5)',
      bg: 'rgba(48, 209, 88, 0.14)',
    },
    warning: {
      primary: '#FFD60A',
      light: '#FFE620',
      dark: '#E5C009',
      glow: 'rgba(255, 214, 10, 0.5)',
      bg: 'rgba(255, 214, 10, 0.14)',
    },
    error: {
      primary: '#FF453A',
      light: '#FF6961',
      dark: '#E53E35',
      glow: 'rgba(255, 69, 58, 0.5)',
      bg: 'rgba(255, 69, 58, 0.14)',
    },
    info: {
      primary: '#64D2FF',
      light: '#7DDBFF',
      dark: '#5BC4ED',
      glow: 'rgba(100, 210, 255, 0.5)',
      bg: 'rgba(100, 210, 255, 0.14)',
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// Timing & Performance Constants
// ═══════════════════════════════════════════════════════════════

export const REFRESH_INTERVAL = 30000; // 30 seconds
export const SCROLL_DELAY = 100; // 100ms scroll delay
export const PAGE_SIZE = 20; // Pagination size

// Animation durations (ms)
export const animations = {
  fastest: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  slowest: 800,
};

// ═══════════════════════════════════════════════════════════════
// Spacing System (4px 기준)
// ═══════════════════════════════════════════════════════════════

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

// ═══════════════════════════════════════════════════════════════
// Border Radius (Apple 스타일)
// ═══════════════════════════════════════════════════════════════

export const borderRadius = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 22,
  '3xl': 32,
  full: 9999,
  pill: 100,
};

// ═══════════════════════════════════════════════════════════════
// Typography (SF Pro 스타일)
// ═══════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: {
    primary: Platform.select({
      ios: '-apple-system',
      android: 'Roboto',
      default: "-apple-system, 'SF Pro Display', 'Pretendard Variable', sans-serif",
    }),
    mono: Platform.select({
      ios: 'SF Mono',
      android: 'monospace',
      default: "'SF Mono', 'Menlo', monospace",
    }),
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
    '5xl': 40,
    display: 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    heavy: '800' as const,
  },
  letterSpacing: {
    tight: -0.04,
    normal: -0.02,
    wide: 0.02,
  },
  // Apple 타이포 프리셋
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.04 },
  title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.03 },
  title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.02 },
  title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.02 },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  callout: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption1: { fontSize: 12, fontWeight: '400' as const },
  caption2: { fontSize: 11, fontWeight: '400' as const },
  // 레거시 호환
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
};

// ═══════════════════════════════════════════════════════════════
// Shadows (Apple 스타일)
// ═══════════════════════════════════════════════════════════════

const createShadow = (offsetY: number, blur: number, opacity: number, elevation: number) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
};

export const shadows = {
  sm: createShadow(2, 4, 0.2, 2),
  md: createShadow(4, 12, 0.3, 4),
  lg: createShadow(8, 24, 0.4, 8),
  xl: createShadow(12, 40, 0.5, 12),
  glow: (color: string) => {
    if (Platform.OS === 'web') {
      return { boxShadow: `0px 4px 20px ${color}` };
    }
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// Glassmorphism (블러 + 반투명)
// ═══════════════════════════════════════════════════════════════

export const glassStyle = {
  backgroundColor: 'rgba(28, 28, 30, 0.8)',
  borderWidth: 0.5,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: borderRadius.xl,
  // 웹에서만 backdrop-filter 적용
  ...(Platform.OS === 'web' && {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }),
};

// ═══════════════════════════════════════════════════════════════
// Common Styles
// ═══════════════════════════════════════════════════════════════

export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: spacing[4],
  },
  cardGlass: {
    ...glassStyle,
    padding: spacing[4],
  },
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      height: 50,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
    secondary: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      height: 50,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
    pill: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.pill,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
    },
  },
  input: {
    height: 48,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    backgroundColor: colors.surface,
    color: colors.text.primary,
  },
  tag: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
  },
};

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

export interface ColorState {
  primary: string;
  light?: string;
  dark?: string;
  glow: string;
  bg: string;
}

export interface RoleTheme {
  primary: string;
  gradient: [string, string];
  glow: string;
}

// 역할별 테마
export const getRoleTheme = (role: 'owner' | 'coach' | 'admin'): RoleTheme => {
  return colors.roles[role];
};

// 온도/지수 컬러 (V-Index)
export const getTemperatureColor = (value: number): ColorState => {
  if (value >= 80) return colors.success;
  if (value >= 60) return { 
    primary: colors.apple.teal, 
    glow: 'rgba(100, 210, 255, 0.5)', 
    bg: 'rgba(100, 210, 255, 0.14)' 
  };
  if (value >= 40) return colors.caution;
  if (value >= 20) return { 
    primary: colors.apple.orange, 
    glow: 'rgba(255, 149, 0, 0.5)', 
    bg: 'rgba(255, 149, 0, 0.14)' 
  };
  return colors.danger;
};

// 상태 컬러
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info'): ColorState => {
  switch (status) {
    case 'success': return colors.success;
    case 'warning': return colors.caution;
    case 'error': return colors.danger;
    case 'info': return { 
      primary: colors.apple.blue, 
      glow: 'rgba(0, 122, 255, 0.5)', 
      bg: 'rgba(0, 122, 255, 0.14)' 
    };
  }
};

// 레벨 컬러
export const getLevelColor = (level: string): string => {
  switch (level) {
    case '초급':
    case 'beginner':
      return colors.apple.green;
    case '중급':
    case 'intermediate':
      return colors.apple.teal;
    case '상급':
    case 'advanced':
      return colors.apple.orange;
    case '프로':
    case 'pro':
      return colors.apple.yellow;
    default:
      return colors.text.tertiary;
  }
};

// 출석 상태 컬러 (온리쌤 스타일)
export const getAttendanceColor = (status: 'present' | 'late' | 'absent' | 'pending') => {
  switch (status) {
    case 'present':
      return { color: colors.apple.green, bg: colors.success.bg, icon: '✓', label: '출석' };
    case 'late':
      return { color: colors.apple.yellow, bg: colors.caution.bg, icon: '⏰', label: '지각' };
    case 'absent':
      return { color: colors.apple.red, bg: colors.danger.bg, icon: '✕', label: '결석' };
    case 'pending':
    default:
      return { color: colors.text.quaternary, bg: 'transparent', icon: '', label: '대기' };
  }
};
