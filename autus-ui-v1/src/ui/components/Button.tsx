/**
 * Button Component
 * LOCKED: primary (A), danger (K), neutral (D) only
 */

import React from 'react';
import { tokens } from '../tokens';

export type ButtonVariant = 'primary' | 'danger' | 'neutral';

export interface ButtonProps {
  variant: ButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: tokens.colors.success.bg,
    borderColor: tokens.colors.success.border,
    color: tokens.colors.success.text,
  },
  danger: {
    backgroundColor: tokens.colors.danger.bg,
    borderColor: tokens.colors.danger.border,
    color: tokens.colors.danger.text,
  },
  neutral: {
    backgroundColor: tokens.colors.neutral.surface,
    borderColor: tokens.colors.neutral.border,
    color: tokens.colors.neutral.text,
  },
};

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.spacing.sm,
  padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
  borderRadius: tokens.radius,
  border: '1px solid',
  fontSize: tokens.typography.body.fontSize,
  fontWeight: '600',
  cursor: 'pointer',
  transition: tokens.transitions.fast,
  minWidth: '100px',
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

const shortcutStyle: React.CSSProperties = {
  ...tokens.typography.mono,
  opacity: 0.7,
  marginLeft: tokens.spacing.sm,
  padding: `2px ${tokens.spacing.xs}`,
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: '4px',
};

export function Button({ variant, onClick, disabled, shortcut, children }: ButtonProps) {
  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(disabled ? disabledStyle : {}),
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {shortcut && <span style={shortcutStyle}>{shortcut}</span>}
    </button>
  );
}
