/**
 * List Component
 * LOCKED: Single column, no nested
 */

import React from 'react';
import { tokens } from '../tokens';

export interface ListItem {
  id: string;
  primary: string;
  secondary?: string;
  status?: 'running' | 'killed' | 'cooldown' | 'pending';
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'danger' | 'neutral';
  };
}

export interface ListProps {
  items: ListItem[];
  emptyMessage?: string;
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    width: '100%',
    maxWidth: '600px',
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
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  },
  primary: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.text,
    fontWeight: '500',
  },
  secondary: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
  },
  status: {
    ...tokens.typography.mono,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: '4px',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
  },
  statusRunning: {
    backgroundColor: tokens.colors.success.bg,
    color: tokens.colors.success.text,
  },
  statusKilled: {
    backgroundColor: tokens.colors.danger.bg,
    color: tokens.colors.danger.text,
  },
  statusCooldown: {
    backgroundColor: tokens.colors.warn.bg,
    color: tokens.colors.warn.text,
  },
  statusPending: {
    backgroundColor: tokens.colors.neutral.surface,
    color: tokens.colors.neutral.textMuted,
    border: `1px solid ${tokens.colors.neutral.border}`,
  },
  actionButton: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    borderRadius: tokens.radius,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: tokens.transitions.fast,
  },
  actionDanger: {
    backgroundColor: tokens.colors.danger.bg,
    borderColor: tokens.colors.danger.border,
    color: tokens.colors.danger.text,
  },
  actionNeutral: {
    backgroundColor: tokens.colors.neutral.surface,
    borderColor: tokens.colors.neutral.border,
    color: tokens.colors.neutral.text,
  },
  empty: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    textAlign: 'center' as const,
    padding: tokens.spacing.xxl,
  },
};

function getStatusStyle(status: ListItem['status']): React.CSSProperties {
  switch (status) {
    case 'running': return { ...styles.status, ...styles.statusRunning };
    case 'killed': return { ...styles.status, ...styles.statusKilled };
    case 'cooldown': return { ...styles.status, ...styles.statusCooldown };
    case 'pending': return { ...styles.status, ...styles.statusPending };
    default: return styles.status;
  }
}

export function List({ items, emptyMessage = 'No items' }: ListProps) {
  if (items.length === 0) {
    return <div style={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <div style={styles.list}>
      {items.map((item) => (
        <div key={item.id} style={styles.item}>
          <div style={styles.content}>
            <span style={styles.primary}>{item.primary}</span>
            {item.secondary && <span style={styles.secondary}>{item.secondary}</span>}
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center' }}>
            {item.status && (
              <span style={getStatusStyle(item.status)}>{item.status}</span>
            )}
            {item.action && (
              <button
                style={{
                  ...styles.actionButton,
                  ...(item.action.variant === 'danger' ? styles.actionDanger : styles.actionNeutral),
                  ...(item.action.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
                onClick={item.action.onClick}
                disabled={item.action.disabled}
              >
                {item.action.label}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
