/**
 * P3 Kill Board
 * LOCKED: List of running rules + kill button
 */

import React from 'react';
import { List, Button } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';
import { isInCooldown, getTimeRemaining } from '../../core/rules';
import type { ListItem } from '../components';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: tokens.spacing.xxl,
    gap: tokens.spacing.xxl,
  },
  header: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  actions: {
    marginTop: tokens.spacing.xl,
  },
};

export function P3KillBoard() {
  const rules = useAutusStore((s) => s.rules);
  const killRule = useAutusStore((s) => s.killRule);
  const goToPage = useAutusStore((s) => s.goToPage);

  const items: ListItem[] = rules.map((rule) => {
    const inCooldown = isInCooldown(rule);
    let secondary = `Started: ${new Date(rule.started_at).toLocaleString()}`;
    
    if (rule.status === 'killed' && rule.cooldown_until) {
      const remaining = getTimeRemaining(rule.cooldown_until);
      if (!remaining.expired) {
        secondary = `Cooldown: ${remaining.minutes}m remaining`;
      }
    }

    return {
      id: rule.id,
      primary: rule.name,
      secondary,
      status: inCooldown ? 'cooldown' : rule.status,
      action: rule.status === 'running' ? {
        label: 'KILL',
        onClick: () => killRule(rule.id),
        disabled: false,
        variant: 'danger' as const,
      } : undefined,
    };
  });

  return (
    <div style={styles.container}>
      <span style={styles.header}>P3 · Kill Board</span>
      
      <List 
        items={items} 
        emptyMessage="No active rules" 
      />

      <div style={styles.actions}>
        <Button variant="neutral" onClick={() => goToPage('P1')}>
          BACK TO INBOX
        </Button>
      </div>
    </div>
  );
}
