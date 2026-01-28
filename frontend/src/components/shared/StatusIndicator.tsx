/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Status Indicator
 * 신호등 스타일 상태 표시기
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useAccessibility';
import { useRoleContext } from '../../contexts/RoleContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StatusLevel = 'good' | 'caution' | 'warning' | 'critical';

interface StatusIndicatorProps {
  status: StatusLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPulse?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Colors and Labels
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  labelKo: string;
  icon: string;
}> = {
  good: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    label: 'Good',
    labelKo: '양호',
    icon: '🟢',
  },
  caution: {
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    label: 'Caution',
    labelKo: '주의',
    icon: '🟡',
  },
  warning: {
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    label: 'Warning',
    labelKo: '경고',
    icon: '🟠',
  },
  critical: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    label: 'Critical',
    labelKo: '위험',
    icon: '🔴',
  },
};

const SIZE_CONFIG = {
  sm: { dot: 12, ring: 20, text: 'text-xs' },
  md: { dot: 16, ring: 28, text: 'text-sm' },
  lg: { dot: 24, ring: 40, text: 'text-base' },
  xl: { dot: 32, ring: 52, text: 'text-lg' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StatusIndicator({
  status,
  size = 'md',
  showPulse = true,
  showLabel = false,
  label,
  className = '',
}: StatusIndicatorProps) {
  const reducedMotion = useReducedMotion();
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  const shouldPulse = showPulse && (status === 'warning' || status === 'critical');

  return (
    <div 
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-label={label || `상태: ${config.labelKo}`}
    >
      {/* Status Dot with Ring */}
      <div 
        className="relative"
        style={{ width: sizeConfig.ring, height: sizeConfig.ring }}
      >
        {/* Pulse Animation */}
        {shouldPulse && !reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ 
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
        )}

        {/* Ring */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            backgroundColor: config.bgColor,
            border: `2px solid ${config.borderColor}`,
          }}
        />

        {/* Dot */}
        <div 
          className="absolute rounded-full"
          style={{ 
            backgroundColor: config.color,
            width: sizeConfig.dot,
            height: sizeConfig.dot,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${sizeConfig.dot / 2}px ${config.color}`,
          }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span className={`font-medium ${sizeConfig.text}`} style={{ color: config.color }}>
          {label || config.labelKo}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Light (All 3 lights)
// ─────────────────────────────────────────────────────────────────────────────

interface TrafficLightProps {
  status: StatusLevel;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TrafficLight({
  status,
  orientation = 'vertical',
  size = 'md',
  className = '',
}: TrafficLightProps) {
  const reducedMotion = useReducedMotion();
  const { theme } = useRoleContext();

  const sizes = {
    sm: 16,
    md: 24,
    lg: 36,
  };

  const dotSize = sizes[size];
  const padding = dotSize / 4;

  const lights: StatusLevel[] = ['critical', 'warning', 'good'];
  if (orientation === 'horizontal') lights.reverse();

  return (
    <div
      className={`
        inline-flex items-center justify-center gap-1 p-2 rounded-lg
        ${theme.mode === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${className}
      `}
      role="status"
      aria-label={`상태: ${STATUS_CONFIG[status].labelKo}`}
    >
      {lights.map((level) => {
        const config = STATUS_CONFIG[level];
        const isActive = level === status || 
          (status === 'caution' && level === 'warning'); // Show yellow for caution

        return (
          <motion.div
            key={level}
            className="relative rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: isActive ? config.color : theme.mode === 'dark' ? '#374151' : '#d1d5db',
              boxShadow: isActive ? `0 0 ${dotSize / 2}px ${config.color}` : 'none',
            }}
            animate={
              isActive && (level === 'warning' || level === 'critical') && !reducedMotion
                ? { opacity: [1, 0.6, 1] }
                : {}
            }
            transition={{ duration: 1, repeat: Infinity }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: StatusLevel;
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  status,
  children,
  className = '',
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-sm font-medium
        ${className}
      `}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
      }}
      role="status"
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{children || config.labelKo}</span>
    </span>
  );
}

export default StatusIndicator;
