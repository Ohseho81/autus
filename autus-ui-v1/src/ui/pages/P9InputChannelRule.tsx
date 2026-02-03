/**
 * P9 Input Channel Rule (System-Only)
 * LOCKED: Allowed input schema + ignored log list (read-only)
 */

import React from 'react';
import { List, Badge } from '../components';
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
  systemBadge: {
    marginBottom: tokens.spacing.md,
  },
  section: {
    width: '100%',
    maxWidth: '700px',
  },
  sectionTitle: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.text,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  schemaBox: {
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
    padding: tokens.spacing.lg,
    fontFamily: tokens.typography.mono.fontFamily,
    fontSize: tokens.typography.mono.fontSize,
    color: tokens.colors.neutral.text,
    whiteSpace: 'pre-wrap' as const,
    overflow: 'auto',
    maxHeight: '200px',
  },
  eventList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  eventTag: {
    ...tokens.typography.mono,
    fontSize: '0.75rem',
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    backgroundColor: tokens.colors.neutral.bg,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: '4px',
    color: tokens.colors.neutral.textMuted,
  },
  ignoredItem: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.danger.bg,
    border: `1px solid ${tokens.colors.danger.border}`,
    borderRadius: tokens.radius,
    marginBottom: tokens.spacing.sm,
  },
  ignoredReason: {
    ...tokens.typography.mono,
    color: tokens.colors.danger.text,
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  ignoredRaw: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
    marginTop: tokens.spacing.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  ignoredTime: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.625rem',
    marginTop: tokens.spacing.xs,
  },
  scrollArea: {
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
};

export function P9InputChannelRule() {
  const inputSchema = useAutusStore((s) => s.inputSchema);
  const ignoredInputs = useAutusStore((s) => s.ignoredInputs);

  const schemaJson = {
    version: inputSchema.version,
    required_fields: inputSchema.required_fields,
    example: {
      event_type: 'attendance.present',
      subject_id: 'student_123',
      value: { class_id: 'class_456' },
      source: 'allthatbasket',
    },
  };

  return (
    <div style={styles.container}>
      <span style={styles.header}>P9 · Input Channel Rule</span>
      
      <div style={styles.systemBadge}>
        <Badge variant="LIMITED">SYSTEM-ONLY</Badge>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Accepted Input Schema</h3>
        <div style={styles.schemaBox}>
          {JSON.stringify(schemaJson, null, 2)}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Allowed Events ({inputSchema.allowed_events.length})</h3>
        <div style={styles.eventList}>
          {inputSchema.allowed_events.map((event) => (
            <span key={event} style={styles.eventTag}>{event}</span>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Ignored Inputs Log ({ignoredInputs.length})</h3>
        <div style={styles.scrollArea}>
          {ignoredInputs.length === 0 ? (
            <div style={{ ...tokens.typography.body, color: tokens.colors.neutral.textMuted }}>
              No ignored inputs
            </div>
          ) : (
            ignoredInputs.slice().reverse().map((ignored) => (
              <div key={ignored.id} style={styles.ignoredItem}>
                <div style={styles.ignoredReason}>
                  IGNORED: {ignored.reason}
                </div>
                <div style={styles.ignoredRaw}>
                  {ignored.raw_input}
                </div>
                <div style={styles.ignoredTime}>
                  {new Date(ignored.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
