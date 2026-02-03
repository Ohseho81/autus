/**
 * P1 Decision Inbox
 * LOCKED: Single Decision Card + A/K/D buttons only
 */

import React from 'react';
import { Card, Button } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';
import { getShortcutHint } from '../keybindings';

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
    display: 'flex',
    gap: tokens.spacing.lg,
    marginTop: tokens.spacing.xl,
  },
  empty: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    textAlign: 'center' as const,
  },
  queueIndicator: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
};

export function P1DecisionInbox() {
  const currentDecision = useAutusStore((s) => s.currentDecision);
  const decisionQueue = useAutusStore((s) => s.decisionQueue);
  const approve = useAutusStore((s) => s.approve);
  const deny = useAutusStore((s) => s.deny);
  const defer = useAutusStore((s) => s.defer);

  if (!currentDecision) {
    return (
      <div style={styles.container}>
        <span style={styles.header}>P1 · Decision Inbox</span>
        <div style={styles.empty}>
          No pending decisions
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <span style={styles.header}>P1 · Decision Inbox</span>
      
      {decisionQueue.length > 1 && (
        <span style={styles.queueIndicator}>
          {decisionQueue.findIndex(d => d.id === currentDecision.id) + 1} / {decisionQueue.length}
        </span>
      )}
      
      <Card
        title={currentDecision.summary}
        subtitle={`${currentDecision.subject_type} · ${currentDecision.action_type}`}
        badge={{
          label: currentDecision.decision_cost,
          variant: currentDecision.decision_cost === 'HIGH' 
            ? 'BLOCKED' 
            : currentDecision.decision_cost === 'MED' 
              ? 'WARNING' 
              : 'AVAILABLE',
        }}
        metadata={{
          cost: currentDecision.decision_cost,
          reversibility: currentDecision.reversibility,
          blastRadius: currentDecision.blast_radius,
          deadline: currentDecision.deadline,
        }}
      />
      
      <div style={styles.actions}>
        <Button 
          variant="primary" 
          onClick={approve}
          shortcut={getShortcutHint('APPROVE')}
        >
          APPROVE
        </Button>
        <Button 
          variant="danger" 
          onClick={deny}
          shortcut={getShortcutHint('KILL')}
        >
          DENY
        </Button>
        <Button 
          variant="neutral" 
          onClick={defer}
          shortcut={getShortcutHint('DEFER')}
        >
          DEFER
        </Button>
      </div>
    </div>
  );
}
