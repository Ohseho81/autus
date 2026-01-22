/**
 * AUTUS Design System - Theme
 */

export const colors = {
  // Primary Blue
  primary: {
    100: '#E3F2FD',
    300: '#90CAF9',
    500: '#3B5998',
    700: '#2B4978',
    900: '#1A2F58',
  },
  
  // Semantic Colors
  danger: {
    100: '#FFEBEE',
    500: '#E53935',
    700: '#C62828',
  },
  warning: {
    100: '#FFF3E0',
    500: '#FB8C00',
    700: '#EF6C00',
  },
  success: {
    100: '#E8F5E9',
    500: '#43A047',
    700: '#2E7D32',
  },
  info: {
    100: '#E3F2FD',
    500: '#2196F3',
    700: '#1976D2',
  },
  
  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

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

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'Pretendard-Regular',
    medium: 'Pretendard-Medium',
    semiBold: 'Pretendard-SemiBold',
    bold: 'Pretendard-Bold',
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
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Common Styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  header: {
    height: 56,
    backgroundColor: colors.white,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  button: {
    primary: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.md,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
    secondary: {
      backgroundColor: colors.transparent,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary[500],
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
    },
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    backgroundColor: colors.white,
  },
};

// Risk Level Colors
export const riskColors = {
  high: colors.danger[500],
  medium: colors.warning[500],
  low: colors.success[500],
};

export const riskBackgrounds = {
  high: colors.danger[100],
  medium: colors.warning[100],
  low: colors.success[100],
};
