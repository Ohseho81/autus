/**
 * Badge Component
 * LOCKED: AVAILABLE, LIMITED, WARNING, BLOCKED only
 */

import React from 'react';
import { tokens } from '../tokens';

export type BadgeVariant = 'AVAILABLE' | 'LIMITED' | 'WARNING' | 'BLOCKED';

export interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  AVAILABLE: {
    backgroundColor: tokens.colors.success.bg,
    borderColor: tokens.colors.success.border,
    color: tokens.colors.success.text,
  },
  LIMITED: {
    backgroundColor: tokens.colors.warn.bg,
    borderColor: tokens.colors.warn.border,
    color: tokens.colors.warn.text,
  },
  WARNING: {
    backgroundColor: tokens.colors.warn.bg,
    borderColor: tokens.colors.warn.border,
    color: tokens.colors.warn.text,
  },
  BLOCKED: {
    backgroundColor: tokens.colors.danger.bg,
    borderColor: tokens.colors.danger.border,
    color: tokens.colors.danger.text,
  },
};

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
  borderRadius: '4px',
  border: '1px solid',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: tokens.typography.mono.fontFamily,
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span style={{ ...baseStyle, ...variantStyles[variant] }}>
      {children}
    </span>
  );
}
