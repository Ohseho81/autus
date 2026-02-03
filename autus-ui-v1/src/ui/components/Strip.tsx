/**
 * Strip Component
 * LOCKED: Delta-only numbers (Δ)
 */

import React from 'react';
import { tokens } from '../tokens';

export interface StripItem {
  label: string;
  delta: number;
  threshold?: number;
}

export interface StripProps {
  items: StripItem[];
  title?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '600px',
  },
  title: {
    ...tokens.typography.title,
    color: tokens.colors.neutral.text,
    marginBottom: tokens.spacing.lg,
  },
  strip: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
  },
  label: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  deltaContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacing.sm,
  },
  delta: {
    fontFamily: tokens.typography.mono.fontFamily,
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  deltaPrefix: {
    fontFamily: tokens.typography.mono.fontFamily,
    fontSize: '1rem',
    opacity: 0.7,
  },
  threshold: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  exceeded: {
    backgroundColor: tokens.colors.danger.bg,
    borderColor: tokens.colors.danger.border,
  },
  warning: {
    backgroundColor: tokens.colors.warn.bg,
    borderColor: tokens.colors.warn.border,
  },
};

function getDeltaColor(delta: number, threshold?: number): string {
  if (threshold !== undefined && delta >= threshold) {
    return tokens.colors.danger.text;
  }
  if (threshold !== undefined && delta >= threshold * 0.8) {
    return tokens.colors.warn.text;
  }
  if (delta > 0) {
    return tokens.colors.warn.text;
  }
  return tokens.colors.success.text;
}

function getItemStyle(delta: number, threshold?: number): React.CSSProperties {
  if (threshold !== undefined && delta >= threshold) {
    return { ...styles.item, ...styles.exceeded };
  }
  if (threshold !== undefined && delta >= threshold * 0.8) {
    return { ...styles.item, ...styles.warning };
  }
  return styles.item;
}

export function Strip({ items, title }: StripProps) {
  return (
    <div style={styles.container}>
      {title && <h2 style={styles.title}>{title}</h2>}
      <div style={styles.strip}>
        {items.map((item, index) => (
          <div key={index} style={getItemStyle(item.delta, item.threshold)}>
            <span style={styles.label}>{item.label}</span>
            <div style={styles.deltaContainer}>
              <span style={{ ...styles.delta, color: getDeltaColor(item.delta, item.threshold) }}>
                <span style={styles.deltaPrefix}>Δ</span>
                {item.delta >= 0 ? `+${item.delta}` : item.delta}
              </span>
              {item.threshold !== undefined && (
                <span style={styles.threshold}>/ {item.threshold}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
