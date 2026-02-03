/**
 * P7 Long-Term Check (Forced)
 * LOCKED: UP/DOWN/UNKNOWN toggle only
 * Must choose before APPROVE completes
 */

import React from 'react';
import { Toggle, Button, Card } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';

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
  forced: {
    ...tokens.typography.mono,
    color: tokens.colors.warn.text,
    fontSize: '0.75rem',
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    backgroundColor: tokens.colors.warn.bg,
    border: `1px solid ${tokens.colors.warn.border}`,
    borderRadius: '4px',
  },
  question: {
    ...tokens.typography.title,
    color: tokens.colors.neutral.text,
    textAlign: 'center' as const,
    maxWidth: '400px',
  },
  actions: {
    marginTop: tokens.spacing.xl,
  },
};

export function P7LongTermCheck() {
  const pendingDirection = useAutusStore((s) => s.pendingLongTermDirection);
  const currentDecision = useAutusStore((s) => s.currentDecision);
  const setLongTermDirection = useAutusStore((s) => s.setLongTermDirection);
  const confirmLongTerm = useAutusStore((s) => s.confirmLongTerm);

  const canContinue = pendingDirection !== null;

  return (
    <div style={styles.container}>
      <span style={styles.header}>P7 · Long-Term Check</span>
      <span style={styles.forced}>⚠ FORCED STEP — Must choose to continue</span>
      
      <div style={styles.question}>
        Will this decision move us UP or DOWN in the long term?
      </div>

      {currentDecision && (
        <Card
          title={currentDecision.summary}
          subtitle={`${currentDecision.decision_cost} cost · ${currentDecision.reversibility} to reverse`}
        />
      )}

      <Toggle
        value={pendingDirection}
        onChange={setLongTermDirection}
      />

      <div style={styles.actions}>
        <Button 
          variant="primary" 
          onClick={confirmLongTerm}
          disabled={!canContinue}
        >
          {canContinue ? 'CONTINUE TO BUDGET CHECK' : 'CHOOSE DIRECTION FIRST'}
        </Button>
      </div>
    </div>
  );
}
