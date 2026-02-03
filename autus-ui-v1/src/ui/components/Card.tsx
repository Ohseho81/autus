/**
 * Card Component
 * LOCKED: Fixed layout, no variants except danger/warn badge
 */

import React from 'react';
import { tokens } from '../tokens';
import { Badge, BadgeVariant } from './Badge';
import type { DecisionCost, Reversibility, BlastRadius } from '../../core/schema';

export interface CardProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant: BadgeVariant;
  };
  metadata?: {
    cost?: DecisionCost;
    reversibility?: Reversibility;
    blastRadius?: BlastRadius;
    deadline?: string;
  };
  children?: React.ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: tokens.colors.neutral.surface,
    border: `1px solid ${tokens.colors.neutral.border}`,
    borderRadius: tokens.radius,
    padding: tokens.spacing.xl,
    maxWidth: '480px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.lg,
  },
  title: {
    ...tokens.typography.title,
    color: tokens.colors.neutral.text,
    margin: 0,
  },
  subtitle: {
    ...tokens.typography.body,
    color: tokens.colors.neutral.textMuted,
    marginTop: tokens.spacing.xs,
  },
  metadata: {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap' as const,
    marginTop: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    borderTop: `1px solid ${tokens.colors.neutral.border}`,
  },
  metaItem: {
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
  },
  metaLabel: {
    color: tokens.colors.neutral.textMuted,
    marginRight: tokens.spacing.xs,
  },
  metaValue: {
    color: tokens.colors.neutral.text,
  },
};

function formatDeadline(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function Card({ title, subtitle, badge, metadata, children }: CardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{title}</h2>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      
      {children}
      
      {metadata && (
        <div style={styles.metadata}>
          {metadata.cost && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>COST:</span>
              <span style={{
                ...styles.metaValue,
                color: metadata.cost === 'HIGH' 
                  ? tokens.colors.danger.text 
                  : metadata.cost === 'MED' 
                    ? tokens.colors.warn.text 
                    : tokens.colors.neutral.text
              }}>
                {metadata.cost}
              </span>
            </span>
          )}
          {metadata.reversibility && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>REV:</span>
              <span style={{
                ...styles.metaValue,
                color: metadata.reversibility === 'hard' 
                  ? tokens.colors.danger.text 
                  : tokens.colors.success.text
              }}>
                {metadata.reversibility}
              </span>
            </span>
          )}
          {metadata.blastRadius && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>BLAST:</span>
              <span style={styles.metaValue}>{metadata.blastRadius}</span>
            </span>
          )}
          {metadata.deadline && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>TTL:</span>
              <span style={{
                ...styles.metaValue,
                color: new Date(metadata.deadline).getTime() - Date.now() < 3600000 
                  ? tokens.colors.danger.text 
                  : tokens.colors.neutral.text
              }}>
                {formatDeadline(metadata.deadline)}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
