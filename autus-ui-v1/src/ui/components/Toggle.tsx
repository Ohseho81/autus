/**
 * Toggle Component
 * LOCKED: UP, DOWN, UNKNOWN only
 */

import React from 'react';
import { tokens } from '../tokens';
import type { LongTermDirection } from '../../core/schema';

export interface ToggleProps {
  value: LongTermDirection | null;
  onChange: (value: LongTermDirection) => void;
  disabled?: boolean;
}

const options: LongTermDirection[] = ['UP', 'DOWN', 'UNKNOWN'];

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing.lg,
  },
  label: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  toggleGroup: {
    display: 'flex',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xs,
    backgroundColor: tokens.colors.neutral.surface,
    borderRadius: tokens.radius,
    border: `1px solid ${tokens.colors.neutral.border}`,
  },
  option: {
    padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    fontFamily: tokens.typography.mono.fontFamily,
    transition: tokens.transitions.fast,
    minWidth: '100px',
  },
  optionUp: {
    backgroundColor: 'transparent',
    color: tokens.colors.neutral.textMuted,
  },
  optionUpSelected: {
    backgroundColor: tokens.colors.success.bg,
    color: tokens.colors.success.text,
  },
  optionDown: {
    backgroundColor: 'transparent',
    color: tokens.colors.neutral.textMuted,
  },
  optionDownSelected: {
    backgroundColor: tokens.colors.danger.bg,
    color: tokens.colors.danger.text,
  },
  optionUnknown: {
    backgroundColor: 'transparent',
    color: tokens.colors.neutral.textMuted,
  },
  optionUnknownSelected: {
    backgroundColor: tokens.colors.warn.bg,
    color: tokens.colors.warn.text,
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  hint: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
};

function getOptionStyle(
  option: LongTermDirection, 
  isSelected: boolean
): React.CSSProperties {
  switch (option) {
    case 'UP':
      return isSelected ? styles.optionUpSelected : styles.optionUp;
    case 'DOWN':
      return isSelected ? styles.optionDownSelected : styles.optionDown;
    case 'UNKNOWN':
      return isSelected ? styles.optionUnknownSelected : styles.optionUnknown;
  }
}

function getOptionLabel(option: LongTermDirection): string {
  switch (option) {
    case 'UP': return '↑ UP';
    case 'DOWN': return '↓ DOWN';
    case 'UNKNOWN': return '? UNKNOWN';
  }
}

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <div style={styles.container}>
      <span style={styles.label}>Long-Term Direction</span>
      <div style={styles.toggleGroup}>
        {options.map((option) => (
          <button
            key={option}
            style={{
              ...styles.option,
              ...getOptionStyle(option, value === option),
              ...(disabled ? styles.disabled : {}),
            }}
            onClick={() => onChange(option)}
            disabled={disabled}
          >
            {getOptionLabel(option)}
          </button>
        ))}
      </div>
      <span style={styles.hint}>
        {value === null ? 'Must choose to continue' : `Selected: ${value}`}
      </span>
    </div>
  );
}
