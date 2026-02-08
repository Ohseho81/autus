/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 온리쌤 아카데미 테마 시스템
 * KRATON Design System + 농구 아카데미 특화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ColorState {
  primary: string;
  light: string;
  dark: string;
  glow: string;
  bg: string;
}

export interface RoleTheme {
  primary: string;
  light: string;
  dark: string;
  gradient: [string, string];
  glow: string;
}

// ═══════════════════════════════════════════════════════════════
// 온리쌤 컬러 팔레트
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // 배경색
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceSecondary: '#16213E',
  card: '#1F1F23',
  glass: 'rgba(255, 255, 255, 0.03)',

  // 역할별 컬러 (Role-based Colors)
  roles: {
    owner: {
      primary: '#FF6B00',
      light: '#FF8C42',
      dark: '#E55A00',
      gradient: ['#FF6B00', '#FF8C42'] as [string, string],
      glow: 'rgba(255, 107, 0, 0.4)',
    } as RoleTheme,
    director: {
      primary: '#00D4AA',
      light: '#00F5C4',
      dark: '#00B894',
      gradient: ['#00D4AA', '#00B894'] as [string, string],
      glow: 'rgba(0, 212, 170, 0.4)',
    } as RoleTheme,
    admin: {
      primary: '#7C5CFF',
      light: '#9D7AFF',
      dark: '#6B4CE0',
      gradient: ['#7C5CFF', '#9D7AFF'] as [string, string],
      glow: 'rgba(124, 92, 255, 0.4)',
    } as RoleTheme,
    coach: {
      primary: '#FF4757',
      light: '#FF6B7A',
      dark: '#E84050',
      gradient: ['#FF4757', '#FF6B7A'] as [string, string],
      glow: 'rgba(255, 71, 87, 0.4)',
    } as RoleTheme,
  },

  // 상태 컬러 (Status Colors)
  status: {
    success: {
      primary: '#00D4AA',
      light: '#00F5C4',
      dark: '#00B894',
      glow: 'rgba(0, 212, 170, 0.5)',
      bg: 'rgba(0, 212, 170, 0.08)',
    } as ColorState,
    warning: {
      primary: '#FFC107',
      light: '#FFD54F',
      dark: '#FFA000',
      glow: 'rgba(255, 193, 7, 0.5)',
      bg: 'rgba(255, 193, 7, 0.08)',
    } as ColorState,
    error: {
      primary: '#FF4757',
      light: '#FF6B7A',
      dark: '#E84050',
      glow: 'rgba(255, 71, 87, 0.5)',
      bg: 'rgba(255, 71, 87, 0.08)',
    } as ColorState,
    info: {
      primary: '#00B4D8',
      light: '#48CAE4',
      dark: '#0096C7',
      glow: 'rgba(0, 180, 216, 0.5)',
      bg: 'rgba(0, 180, 216, 0.08)',
    } as ColorState,
  },

  // 레벨 컬러 (Level Colors)
  levels: {
    beginner: '#00D4AA',    // 초급 - 틸
    intermediate: '#7C5CFF', // 중급 - 퍼플
    advanced: '#FF6B00',     // 상급 - 오렌지
    pro: '#FFD700',          // 프로 - 골드
  },

  // 텍스트 컬러
  text: {
    primary: '#FFFFFF',
    secondary: '#8B949E',
    muted: '#6E7681',
    disabled: '#484F58',
  },

  // 보더 컬러
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 107, 0, 0.3)',
  },

  // 특수 컬러
  special: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    basketball: '#FF6B00',
  },

  // 레거시 호환
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // KRATON 호환 (기존 AUTUS 컬러)
  safe: {
    primary: '#00D4AA',
    glow: 'rgba(0, 212, 170, 0.5)',
    bg: 'rgba(0, 212, 170, 0.08)',
  },
  caution: {
    primary: '#FF6B00',
    glow: 'rgba(255, 107, 0, 0.5)',
    bg: 'rgba(255, 107, 0, 0.08)',
  },
  danger: {
    primary: '#FF4757',
    glow: 'rgba(255, 71, 87, 0.5)',
    bg: 'rgba(255, 71, 87, 0.08)',
  },
  success: {
    primary: '#00D4AA',
    glow: 'rgba(0, 212, 170, 0.5)',
    bg: 'rgba(0, 212, 170, 0.08)',
  },
};

// ═══════════════════════════════════════════════════════════════
// Spacing System
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
// Border Radius
// ═══════════════════════════════════════════════════════════════

export const borderRadius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// ═══════════════════════════════════════════════════════════════
// Typography
// ═══════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: {
    primary: 'Pretendard',
    system: 'System',
    mono: 'SF Mono',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    display: 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ═══════════════════════════════════════════════════════════════
// Shadows
// ═══════════════════════════════════════════════════════════════

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  }),
};

// ═══════════════════════════════════════════════════════════════
// Glassmorphism Style
// ═══════════════════════════════════════════════════════════════

export const glassStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: colors.border.primary,
  borderRadius: borderRadius['2xl'],
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
    ...glassStyle,
    padding: spacing[6],
    ...shadows.md,
  },
  header: {
    height: 70,
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 0, 0.2)',
  },
  button: {
    primary: {
      backgroundColor: colors.roles.owner.primary,
      borderRadius: borderRadius.lg,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
    secondary: {
      backgroundColor: colors.transparent,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.roles.owner.primary,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    backgroundColor: colors.card,
    color: colors.text.primary,
  },
};

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

// 역할별 테마 가져오기
export const getRoleTheme = (role: 'owner' | 'director' | 'admin' | 'coach'): RoleTheme => {
  return colors.roles[role];
};

// 레벨 컬러 가져오기
export const getLevelColor = (level: string): string => {
  switch (level) {
    case '초급':
    case 'beginner':
      return colors.levels.beginner;
    case '중급':
    case 'intermediate':
      return colors.levels.intermediate;
    case '상급':
    case 'advanced':
      return colors.levels.advanced;
    case '프로':
    case 'pro':
      return colors.levels.pro;
    default:
      return colors.text.secondary;
  }
};

// 상태 컬러 가져오기
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info'): ColorState => {
  return colors.status[status];
};

// 농구 코트 패턴 (웹용)
export const courtPattern = `
  repeating-linear-gradient(
    0deg,
    transparent,
    transparent 50px,
    rgba(255, 107, 0, 0.5) 50px,
    rgba(255, 107, 0, 0.5) 51px
  ),
  repeating-linear-gradient(
    90deg,
    transparent,
    transparent 50px,
    rgba(255, 107, 0, 0.5) 50px,
    rgba(255, 107, 0, 0.5) 51px
  )
`;

export default colors;
