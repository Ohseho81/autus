/**
 * P2 Friction Delta
 * LOCKED: Strip with Δ only (questions/interventions/exceptions/escalations)
 */

import React from 'react';
import { Strip, Button } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';
import { FRICTION_THRESHOLDS } from '../../core/rules';

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
  timestamp: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  actions: {
    marginTop: tokens.spacing.xl,
  },
};

export function P2FrictionDelta() {
  const frictionDelta = useAutusStore((s) => s.frictionDelta);
  const navigation = useAutusStore((s) => s.navigation);
  const navigate = useAutusStore((s) => s.navigate);

  const handleDismiss = () => {
    if (navigation.riskJump.active) {
      navigate({ type: 'RISK_CLEARED' });
    } else {
      navigate({ type: 'GOTO', pageId: 'P1' });
    }
  };

  const items = [
    { label: 'Questions', delta: frictionDelta.questions, threshold: FRICTION_THRESHOLDS.questions },
    { label: 'Interventions', delta: frictionDelta.interventions, threshold: FRICTION_THRESHOLDS.interventions },
    { label: 'Exceptions', delta: frictionDelta.exceptions, threshold: FRICTION_THRESHOLDS.exceptions },
    { label: 'Escalations', delta: frictionDelta.escalations, threshold: FRICTION_THRESHOLDS.escalations },
  ];

  return (
    <div style={styles.container}>
      <span style={styles.header}>P2 · Friction Delta</span>
      
      <Strip items={items} title="Current Period" />
      
      <span style={styles.timestamp}>
        Last computed: {new Date(frictionDelta.computed_at).toLocaleTimeString()}
      </span>

      <div style={styles.actions}>
        <Button variant="neutral" onClick={handleDismiss}>
          {navigation.riskJump.active ? 'ACKNOWLEDGE & RETURN' : 'BACK TO INBOX'}
        </Button>
      </div>
    </div>
  );
}
