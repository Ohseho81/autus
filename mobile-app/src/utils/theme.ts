/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 KRATON DESIGN SYSTEM - Mobile Theme
 * AUTUS 2.0 - Glassmorphism + Neon
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ColorState {
  primary: string;
  glow: string;
  bg: string;
}

// KRATON Color Palette
export const colors = {
  // Temperature States (온도 상태)
  safe: {
    primary: '#00D4FF',
    glow: 'rgba(0, 212, 255, 0.5)',
    bg: 'rgba(0, 212, 255, 0.08)',
  } as ColorState,

  caution: {
    primary: '#FF6B35',
    glow: 'rgba(255, 107, 53, 0.5)',
    bg: 'rgba(255, 107, 53, 0.08)',
  } as ColorState,

  danger: {
    primary: '#FF2E63',
    glow: 'rgba(255, 46, 99, 0.5)',
    bg: 'rgba(255, 46, 99, 0.08)',
  } as ColorState,

  success: {
    primary: '#00F5A0',
    glow: 'rgba(0, 245, 160, 0.5)',
    bg: 'rgba(0, 245, 160, 0.08)',
  } as ColorState,

  // UI Colors
  background: '#0A0E17',
  surface: '#111827',
  surfaceLight: '#1F2937',
  card: 'rgba(17, 24, 39, 0.8)',

  // Border
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',

  // Text
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDim: 'rgba(255, 255, 255, 0.4)',

  // Legacy compatibility
  primary: {
    100: '#E3F2FD',
    300: '#90CAF9',
    500: '#00D4FF',
    700: '#0099CC',
    900: '#006688',
  },

  gray: {
    50: '#0A0E17',
    100: '#111827',
    200: '#1F2937',
    300: '#374151',
    400: '#4B5563',
    500: 'rgba(255, 255, 255, 0.4)',
    600: 'rgba(255, 255, 255, 0.6)',
    700: 'rgba(255, 255, 255, 0.8)',
    800: 'rgba(255, 255, 255, 0.9)',
    900: '#FFFFFF',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Spacing System
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

// Border Radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
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
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Shadows (for iOS)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// Glassmorphism Style
export const glassStyle = {
  backgroundColor: 'rgba(17, 24, 39, 0.6)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: borderRadius['2xl'],
};

// Common Styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    ...glassStyle,
    padding: spacing[4],
    ...shadows.md,
  },
  header: {
    height: 56,
    backgroundColor: colors.surface,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  button: {
    primary: {
      backgroundColor: colors.safe.primary,
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
      borderColor: colors.safe.primary,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    backgroundColor: colors.surface,
    color: colors.text,
  },
};

// Temperature-based color selection
export const getTemperatureColor = (temp: number): ColorState => {
  if (temp < 60) return colors.safe;
  if (temp < 80) return colors.caution;
  return colors.danger;
};

// Risk Level Colors
export const riskColors = {
  high: colors.danger.primary,
  medium: colors.caution.primary,
  low: colors.success.primary,
};

export const riskBackgrounds = {
  high: colors.danger.bg,
  medium: colors.caution.bg,
  low: colors.success.bg,
};

export default colors;
