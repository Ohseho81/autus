/**
 * P6 Fact Ledger
 * LOCKED: Append-only event timeline only
 */

import React from 'react';
import { List, Button, Badge } from '../components';
import { tokens } from '../tokens';
import { useAutusStore } from '../store';
import type { ListItem } from '../components';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: tokens.spacing.xxl,
    gap: tokens.spacing.xl,
  },
  header: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  subtitle: {
    ...tokens.typography.mono,
    color: tokens.colors.warn.text,
    fontSize: '0.75rem',
  },
  scrollArea: {
    width: '100%',
    maxWidth: '700px',
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  factItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
    marginBottom: tokens.spacing.sm,
  },
  factHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factType: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.text,
    fontWeight: '600',
  },
  factTime: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  factMeta: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
  factValue: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
    backgroundColor: tokens.colors.neutral.bg,
    padding: tokens.spacing.sm,
    borderRadius: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    marginTop: tokens.spacing.lg,
  },
  count: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
};

export function P6FactLedger() {
  const facts = useAutusStore((s) => s.facts);
  const goToPage = useAutusStore((s) => s.goToPage);

  // Show facts in reverse chronological order
  const sortedFacts = [...facts].reverse();

  return (
    <div style={styles.container}>
      <span style={styles.header}>P6 · Fact Ledger</span>
      <span style={styles.subtitle}>⚠ APPEND-ONLY — No edits, no deletes</span>
      <span style={styles.count}>{facts.length} facts recorded</span>
      
      <div style={styles.scrollArea}>
        {sortedFacts.length === 0 ? (
          <div style={{ ...tokens.typography.body, color: tokens.colors.neutral.textMuted, textAlign: 'center' as const }}>
            No facts recorded yet
          </div>
        ) : (
          sortedFacts.map((fact, index) => (
            <div key={`${fact.timestamp}-${index}`} style={styles.factItem}>
              <div style={styles.factHeader}>
                <span style={styles.factType}>{fact.event_type}</span>
                <span style={styles.factTime}>
                  {new Date(fact.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.factMeta}>
                subject: {fact.subject_id} · source: {fact.source}
              </div>
              <div style={styles.factValue}>
                {JSON.stringify(fact.value)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.actions}>
        <Button variant="neutral" onClick={() => goToPage('P1')}>
          BACK TO INBOX
        </Button>
      </div>
    </div>
  );
}
