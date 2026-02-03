/**
 * P5 Eligibility Engine
 * LOCKED: YES/NO list only (no scores)
 */

import React from 'react';
import { List, Button } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';
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
  subtitle: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  actions: {
    marginTop: tokens.spacing.xl,
  },
};

export function P5EligibilityEngine() {
  const eligibilities = useAutusStore((s) => s.eligibilities);
  const goToPage = useAutusStore((s) => s.goToPage);

  const items: ListItem[] = eligibilities.map((elig, index) => ({
    id: `${elig.subject_type}-${elig.action_type}-${index}`,
    primary: `${elig.subject_type} → ${elig.action_type}`,
    secondary: new Date(elig.evaluated_at).toLocaleString(),
    status: elig.eligible ? 'running' : 'killed', // Use existing status colors
  }));

  // Add YES/NO indicator to primary text
  const itemsWithIndicator: ListItem[] = eligibilities.map((elig, index) => ({
    id: `${elig.subject_type}-${elig.action_type}-${index}`,
    primary: `${elig.eligible ? '✓ YES' : '✗ NO'} — ${elig.subject_type} → ${elig.action_type}`,
    secondary: `Evaluated: ${new Date(elig.evaluated_at).toLocaleString()}`,
  }));

  return (
    <div style={styles.container}>
      <span style={styles.header}>P5 · Eligibility Engine</span>
      <span style={styles.subtitle}>YES/NO results only — no scores exposed</span>
      
      <List 
        items={itemsWithIndicator} 
        emptyMessage="No eligibility checks recorded" 
      />

      <div style={styles.actions}>
        <Button variant="neutral" onClick={() => goToPage('P1')}>
          BACK TO INBOX
        </Button>
      </div>
    </div>
  );
}
