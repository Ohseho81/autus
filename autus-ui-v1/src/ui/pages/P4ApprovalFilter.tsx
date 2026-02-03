/**
 * P4 Approval Filter (System-Only)
 * LOCKED: Allowed approval types + blocked log list (read-only)
 */

import React from 'react';
import { List, Badge } from '../components';
import { tokens } from '../tokens';
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
  systemBadge: {
    marginBottom: tokens.spacing.lg,
  },
  section: {
    width: '100%',
    maxWidth: '600px',
  },
  sectionTitle: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.text,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  },
  category: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
  },
  categoryIcon: {
    fontSize: '1.5rem',
  },
  categoryName: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.text,
    fontWeight: '500',
  },
  categoryDesc: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
  },
};

const APPROVAL_CATEGORIES = [
  { id: 'money', icon: '💰', name: 'Money', description: 'Payment, refund, discount decisions' },
  { id: 'relation', icon: '🤝', name: 'Relation', description: 'Teacher change, communication decisions' },
  { id: 'liability', icon: '⚖️', name: 'Liability', description: 'Claims, legal, safety decisions' },
];

// This page is system-only and read-only
export function P4ApprovalFilter() {
  const blockedItems: ListItem[] = [
    // This would be populated from store in real implementation
  ];

  return (
    <div style={styles.container}>
      <span style={styles.header}>P4 · Approval Filter</span>
      
      <div style={styles.systemBadge}>
        <Badge variant="LIMITED">SYSTEM-ONLY</Badge>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Allowed Approval Categories</h3>
        <div style={styles.categoryList}>
          {APPROVAL_CATEGORIES.map((cat) => (
            <div key={cat.id} style={styles.category}>
              <span style={styles.categoryIcon}>{cat.icon}</span>
              <div>
                <div style={styles.categoryName}>{cat.name}</div>
                <div style={styles.categoryDesc}>{cat.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Blocked Items Log</h3>
        <List items={blockedItems} emptyMessage="No blocked items" />
      </div>
    </div>
  );
}
