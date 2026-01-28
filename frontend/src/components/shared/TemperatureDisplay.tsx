/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Temperature Display
 * 역할별 온도 표시 컴포넌트 (전문가용 게이지 ~ 게임화 표시)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRoleContext, useCurrentRole } from '../../contexts/RoleContext';
import { useReducedMotion } from '../../hooks/useAccessibility';
import { RoleId } from '../../types/roles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TemperatureDisplayProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'auto' | 'gauge' | 'simple' | 'gamified';
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Temperature Thresholds
// ─────────────────────────────────────────────────────────────────────────────

function getTemperatureStatus(value: number): {
  status: 'good' | 'normal' | 'warning' | 'danger';
  color: string;
  label: string;
  labelKo: string;
  emoji: string;
} {
  if (value >= 60) {
    return {
      status: 'good',
      color: '#22c55e',
      label: 'Good',
      labelKo: '좋아요',
      emoji: '🟢',
    };
  }
  if (value >= 40) {
    return {
      status: 'normal',
      color: '#eab308',
      label: 'Normal',
      labelKo: '보통이에요',
      emoji: '🟡',
    };
  }
  if (value >= 20) {
    return {
      status: 'warning',
      color: '#f97316',
      label: 'Warning',
      labelKo: '주의가 필요해요',
      emoji: '🟠',
    };
  }
  return {
    status: 'danger',
    color: '#ef4444',
    label: 'Danger',
    labelKo: '관심이 필요해요',
    emoji: '🔴',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Role-based Variant Selection
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultVariant(role: RoleId): 'gauge' | 'simple' | 'gamified' {
  switch (role) {
    case 'owner':
    case 'manager':
    case 'teacher':
      return 'gauge';
    case 'parent':
      return 'simple';
    case 'student':
      return 'gamified';
    default:
      return 'gauge';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TemperatureDisplay({
  value,
  label,
  showValue = true,
  size = 'md',
  variant = 'auto',
  className = '',
}: TemperatureDisplayProps) {
  const currentRole = useCurrentRole();
  
  const actualVariant = variant === 'auto' 
    ? getDefaultVariant(currentRole) 
    : variant;

  switch (actualVariant) {
    case 'gauge':
      return (
        <GaugeDisplay 
          value={value} 
          label={label} 
          showValue={showValue} 
          size={size} 
          className={className}
        />
      );
    case 'simple':
      return (
        <SimpleDisplay 
          value={value} 
          label={label} 
          size={size} 
          className={className}
        />
      );
    case 'gamified':
      return (
        <GamifiedDisplay 
          value={value} 
          label={label} 
          size={size} 
          className={className}
        />
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauge Display (for Staff)
// ─────────────────────────────────────────────────────────────────────────────

function GaugeDisplay({
  value,
  label,
  showValue,
  size,
  className,
}: {
  value: number;
  label?: string;
  showValue: boolean;
  size: string;
  className: string;
}) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();
  const tempStatus = getTemperatureStatus(value);

  const sizes = {
    sm: { width: 80, stroke: 6, fontSize: 14 },
    md: { width: 120, stroke: 8, fontSize: 18 },
    lg: { width: 160, stroke: 10, fontSize: 24 },
    xl: { width: 200, stroke: 12, fontSize: 32 },
  };

  const config = sizes[size as keyof typeof sizes] || sizes.md;
  const radius = (config.width - config.stroke) / 2;
  const circumference = radius * Math.PI; // Half circle

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg 
        width={config.width} 
        height={config.width / 2 + 20}
        viewBox={`0 0 ${config.width} ${config.width / 2 + 20}`}
        aria-label={`온도: ${value}°, 상태: ${tempStatus.labelKo}`}
        role="img"
      >
        {/* Background Arc */}
        <path
          d={`M ${config.stroke / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.stroke / 2} ${config.width / 2}`}
          fill="none"
          stroke={theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth={config.stroke}
          strokeLinecap="round"
        />

        {/* Value Arc */}
        <motion.path
          d={`M ${config.stroke / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.stroke / 2} ${config.width / 2}`}
          fill="none"
          stroke={tempStatus.color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (circumference * value / 100) }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 ${config.stroke}px ${tempStatus.color}40)`,
          }}
        />

        {/* Value Text */}
        {showValue && (
          <text
            x={config.width / 2}
            y={config.width / 2 - 5}
            textAnchor="middle"
            fontSize={config.fontSize}
            fontWeight="bold"
            fill={theme.mode === 'dark' ? '#fff' : '#1e293b'}
          >
            {Math.round(value)}°
          </text>
        )}
      </svg>

      {/* Label */}
      {label && (
        <span className="mt-1 text-sm opacity-70">{label}</span>
      )}

      {/* Status */}
      <span 
        className="mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: `${tempStatus.color}20`,
          color: tempStatus.color,
        }}
      >
        {tempStatus.labelKo}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple Display (for Parents)
// ─────────────────────────────────────────────────────────────────────────────

function SimpleDisplay({
  value,
  label,
  size,
  className,
}: {
  value: number;
  label?: string;
  size: string;
  className: string;
}) {
  const tempStatus = getTemperatureStatus(value);
  const reducedMotion = useReducedMotion();

  const sizes = {
    sm: { emoji: 'text-3xl', text: 'text-sm', padding: 'p-3' },
    md: { emoji: 'text-5xl', text: 'text-base', padding: 'p-4' },
    lg: { emoji: 'text-6xl', text: 'text-lg', padding: 'p-5' },
    xl: { emoji: 'text-7xl', text: 'text-xl', padding: 'p-6' },
  };

  const config = sizes[size as keyof typeof sizes] || sizes.md;

  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        ${config.padding} rounded-2xl
        ${className}
      `}
      style={{
        backgroundColor: `${tempStatus.color}15`,
        border: `2px solid ${tempStatus.color}30`,
      }}
      role="status"
      aria-label={`상태: ${tempStatus.labelKo}`}
    >
      {/* Large Emoji */}
      <motion.span
        className={config.emoji}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring' }}
      >
        {tempStatus.status === 'good' && '😊'}
        {tempStatus.status === 'normal' && '😐'}
        {tempStatus.status === 'warning' && '😟'}
        {tempStatus.status === 'danger' && '😢'}
      </motion.span>

      {/* Status Label */}
      <span 
        className={`${config.text} font-bold mt-2`}
        style={{ color: tempStatus.color }}
      >
        {tempStatus.labelKo}
      </span>

      {/* Optional Label */}
      {label && (
        <span className="text-sm opacity-60 mt-1">{label}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gamified Display (for Students)
// ─────────────────────────────────────────────────────────────────────────────

function GamifiedDisplay({
  value,
  label,
  size,
  className,
}: {
  value: number;
  label?: string;
  size: string;
  className: string;
}) {
  const reducedMotion = useReducedMotion();
  const tempStatus = getTemperatureStatus(value);

  // Convert to "level" concept
  const level = Math.min(10, Math.floor(value / 10));
  const nextLevelProgress = value % 10 * 10;

  const sizes = {
    sm: { height: 8, text: 'text-xs' },
    md: { height: 12, text: 'text-sm' },
    lg: { height: 16, text: 'text-base' },
    xl: { height: 20, text: 'text-lg' },
  };

  const config = sizes[size as keyof typeof sizes] || sizes.md;

  // Star display based on level
  const stars = useMemo(() => {
    const filled = Math.floor(level / 2);
    const half = level % 2;
    const empty = 5 - filled - half;
    return { filled, half, empty };
  }, [level]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Stars */}
      <div className="flex items-center gap-1 mb-2" aria-label={`레벨 ${level}`}>
        {[...Array(stars.filled)].map((_, i) => (
          <motion.span
            key={`filled-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={reducedMotion ? {} : { delay: i * 0.1 }}
            className="text-2xl"
          >
            ⭐
          </motion.span>
        ))}
        {stars.half > 0 && (
          <span className="text-2xl opacity-50">⭐</span>
        )}
        {[...Array(stars.empty)].map((_, i) => (
          <span key={`empty-${i}`} className="text-2xl opacity-20">⭐</span>
        ))}
      </div>

      {/* Level */}
      <div className="flex items-center gap-2 mb-2">
        <span 
          className="text-xl font-bold"
          style={{ color: tempStatus.color }}
        >
          Lv.{level}
        </span>
        <span className="text-xl">
          {tempStatus.status === 'good' && '🎉'}
          {tempStatus.status === 'normal' && '💪'}
          {tempStatus.status === 'warning' && '📈'}
          {tempStatus.status === 'danger' && '🌱'}
        </span>
      </div>

      {/* Progress Bar */}
      <div 
        className="w-full rounded-full overflow-hidden bg-white/20"
        style={{ height: config.height }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: tempStatus.color }}
          initial={{ width: 0 }}
          animate={{ width: `${nextLevelProgress}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Progress Text */}
      <span className={`${config.text} mt-1 opacity-70`}>
        다음 레벨까지 {100 - nextLevelProgress}%!
      </span>

      {/* Label */}
      {label && (
        <span className="text-sm opacity-60 mt-2">{label}</span>
      )}
    </div>
  );
}

export default TemperatureDisplay;
