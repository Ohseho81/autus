/**
 * P8 Decision Cost Budget (Forced)
 * LOCKED: Weekly HIGH budget remaining only
 * If exceeded: APPROVE blocked, auto KILL
 */

import React from 'react';
import { Button, Badge, Card } from '../components';
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
  budgetDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing.lg,
    padding: tokens.spacing.xxl,
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
    minWidth: '300px',
  },
  budgetLabel: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    textTransform: 'uppercase' as const,
  },
  budgetValue: {
    fontFamily: tokens.typography.mono.fontFamily,
    fontSize: '3rem',
    fontWeight: '700',
  },
  budgetAvailable: {
    color: tokens.colors.success.text,
  },
  budgetExceeded: {
    color: tokens.colors.danger.text,
  },
  budgetSub: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.875rem',
  },
  weekRange: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  warning: {
    ...tokens.typography.body,
    color: tokens.colors.danger.text,
    textAlign: 'center' as const,
    maxWidth: '400px',
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.danger.bg,
    border: `1px solid ${tokens.colors.danger.border}`,
    borderRadius: tokens.radius,
  },
  actions: {
    marginTop: tokens.spacing.xl,
  },
};

export function P8DecisionCostBudget() {
  const weeklyBudget = useAutusStore((s) => s.weeklyBudget);
  const currentDecision = useAutusStore((s) => s.currentDecision);
  const pendingDirection = useAutusStore((s) => s.pendingLongTermDirection);
  const confirmBudget = useAutusStore((s) => s.confirmBudget);

  const remaining = weeklyBudget.high_decisions_cap - weeklyBudget.high_decisions_used;
  const isHighCost = currentDecision?.decision_cost === 'HIGH';
  const willExceed = isHighCost && remaining <= 0;
  const canApprove = !willExceed;

  return (
    <div style={styles.container}>
      <span style={styles.header}>P8 · Decision Cost Budget</span>
      <span style={styles.forced}>⚠ FORCED STEP — Budget check required</span>

      <div style={styles.budgetDisplay}>
        <span style={styles.budgetLabel}>Weekly HIGH Decisions Remaining</span>
        <span style={{
          ...styles.budgetValue,
          ...(remaining > 0 ? styles.budgetAvailable : styles.budgetExceeded),
        }}>
          {remaining} / {weeklyBudget.high_decisions_cap}
        </span>
        <span style={styles.budgetSub}>
          Used: {weeklyBudget.high_decisions_used}
        </span>
        <span style={styles.weekRange}>
          Week: {new Date(weeklyBudget.week_start).toLocaleDateString()} - {new Date(weeklyBudget.week_end).toLocaleDateString()}
        </span>
      </div>

      {currentDecision && (
        <Card
          title={currentDecision.summary}
          badge={{
            label: currentDecision.decision_cost,
            variant: currentDecision.decision_cost === 'HIGH' 
              ? willExceed ? 'BLOCKED' : 'WARNING'
              : 'AVAILABLE',
          }}
        >
          <div style={{ ...tokens.typography.mono, color: tokens.colors.neutral.textMuted, marginTop: tokens.spacing.md }}>
            Long-term direction: {pendingDirection}
          </div>
        </Card>
      )}

      {willExceed && (
        <div style={styles.warning}>
          ⚠ BUDGET EXCEEDED — This HIGH-cost decision will be AUTO KILLED
        </div>
      )}

      <div style={styles.actions}>
        <Button 
          variant={canApprove ? 'primary' : 'danger'} 
          onClick={confirmBudget}
        >
          {canApprove ? 'CONFIRM APPROVAL' : 'CONFIRM AUTO KILL'}
        </Button>
      </div>
    </div>
  );
}
