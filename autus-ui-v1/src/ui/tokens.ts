/**
 * AUTUS Design Tokens (TypeScript version)
 * LOCKED: No custom CSS outside tokens
 */

export const tokens = {
  colors: {
    neutral: {
      bg: '#0a0a0a',
      surface: '#141414',
      border: '#262626',
      text: '#fafafa',
      textMuted: '#a1a1a1',
    },
    warn: {
      bg: '#422006',
      border: '#854d0e',
      text: '#fbbf24',
    },
    danger: {
      bg: '#450a0a',
      border: '#991b1b',
      text: '#f87171',
    },
    success: {
      bg: '#052e16',
      border: '#166534',
      text: '#4ade80',
    },
  },
  
  typography: {
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      lineHeight: '1.2',
    },
    body: {
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    mono: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: '0.875rem',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  
  radius: '8px',
  
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
  },
} as const;

// CSS Variables injection
export function injectTokens(): void {
  const root = document.documentElement;
  
  // Colors
  Object.entries(tokens.colors).forEach(([category, colors]) => {
    Object.entries(colors).forEach(([name, value]) => {
      root.style.setProperty(`--color-${category}-${name}`, value);
    });
  });
  
  // Spacing
  Object.entries(tokens.spacing).forEach(([name, value]) => {
    root.style.setProperty(`--spacing-${name}`, value);
  });
  
  // Other
  root.style.setProperty('--radius', tokens.radius);
  root.style.setProperty('--transition-fast', tokens.transitions.fast);
  root.style.setProperty('--transition-normal', tokens.transitions.normal);
}
