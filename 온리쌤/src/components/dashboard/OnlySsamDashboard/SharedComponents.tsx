/**
 * SharedComponents - Reusable UI components used across all dashboards
 */

import React from 'react';
import type {
  MetricCardProps,
  MiniCardProps,
  StatBlockProps,
  AlertPanelProps,
  QuickActionsProps,
} from './types';

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, positive, icon, color }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}10, ${color}05)`,
      borderRadius: '24px',
      padding: '28px',
      border: `1px solid ${color}30`,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        right: '-20px',
        top: '-20px',
        fontSize: '80px',
        opacity: 0.1,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>{title}</div>
    <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>{value}</div>
    <div
      style={{
        fontSize: '13px',
        color: positive ? '#00D4AA' : '#FF4757',
        fontWeight: 600,
      }}
    >
      {positive ? '↑' : '↓'} {change}
    </div>
  </div>
);

export const MiniCard: React.FC<MiniCardProps> = ({ title, value, icon, alert }) => (
  <div
    style={{
      background: alert ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 255, 255, 0.03)',
      borderRadius: '16px',
      padding: '20px',
      border: alert ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div
      style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '4px',
        color: alert ? '#FF4757' : '#FFF',
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: '12px', color: '#888' }}>{title}</div>
  </div>
);

export const StatBlock: React.FC<StatBlockProps> = ({ label, value, positive, warning }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}
  >
    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{label}</div>
    <div
      style={{
        fontSize: '20px',
        fontWeight: 700,
        color: positive ? '#00D4AA' : warning ? '#FFC107' : '#FFF',
      }}
    >
      {value}
    </div>
  </div>
);

export const AlertPanel: React.FC<AlertPanelProps> = ({ title, alerts }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>{title}</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: `4px solid ${
              alert.type === 'success' ? '#00D4AA' : alert.type === 'warning' ? '#FFC107' : '#7C5CFF'
            }`,
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>{alert.message}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{alert.time}</div>
        </div>
      ))}
    </div>
  </div>
);

export const QuickActions: React.FC<QuickActionsProps> = ({ title, actions }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>{title}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {actions.map((action, i) => (
        <button
          key={i}
          style={{
            background: 'rgba(255, 107, 0, 0.1)',
            border: '1px solid rgba(255, 107, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '20px' }}>{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  </div>
);
