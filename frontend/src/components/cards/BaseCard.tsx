/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS BaseCard - 모든 역할 카드의 기본 컴포넌트
 * 카드 1장 규칙의 핵심 UI
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type CardType = 
  | 'decision'    // 결정 필요 (DECIDER)
  | 'conflict'    // 충돌 감지 (OPERATOR)
  | 'action'      // 다음 작업 (EXECUTOR)
  | 'proof'       // 품질 증명 (CONSUMER)
  | 'approval'    // 승인 대상 (APPROVER)
  | 'info'        // 일반 정보
  | 'warning'     // 경고
  | 'success';    // 완료

export type CardPriority = 'low' | 'normal' | 'high' | 'critical';

// ═══════════════════════════════════════════════════════════════════════════════
// Card Config
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_STYLES: Record<CardType, { 
  headerBg: string; 
  headerColor: string;
  icon: string;
  label: string;
}> = {
  decision: {
    headerBg: 'bg-amber-500/20',
    headerColor: 'text-amber-400',
    icon: '⚡',
    label: '결정 필요',
  },
  conflict: {
    headerBg: 'bg-orange-500/20',
    headerColor: 'text-orange-400',
    icon: '⚠️',
    label: '충돌 감지',
  },
  action: {
    headerBg: 'bg-blue-500/20',
    headerColor: 'text-blue-400',
    icon: '▶️',
    label: '다음 작업',
  },
  proof: {
    headerBg: 'bg-green-500/20',
    headerColor: 'text-green-400',
    icon: '✓',
    label: '품질 증명',
  },
  approval: {
    headerBg: 'bg-purple-500/20',
    headerColor: 'text-purple-400',
    icon: '📋',
    label: '승인 대상',
  },
  info: {
    headerBg: 'bg-gray-500/20',
    headerColor: 'text-gray-400',
    icon: 'ℹ️',
    label: '정보',
  },
  warning: {
    headerBg: 'bg-red-500/20',
    headerColor: 'text-red-400',
    icon: '🚨',
    label: '경고',
  },
  success: {
    headerBg: 'bg-emerald-500/20',
    headerColor: 'text-emerald-400',
    icon: '✅',
    label: '완료',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════════

interface BaseCardProps {
  type: CardType;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  priority?: CardPriority;
  className?: string;
  animate?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function BaseCard({
  type,
  title,
  subtitle,
  children,
  footer,
  priority = 'normal',
  className = '',
  animate = true,
}: BaseCardProps) {
  const style = CARD_STYLES[type];
  
  const priorityBorder = {
    low: 'border-gray-600',
    normal: 'border-gray-500',
    high: 'border-amber-500/50',
    critical: 'border-red-500 animate-pulse',
  };

  return (
    <div 
      className={`
        relative overflow-hidden
        bg-gray-800/90 backdrop-blur-md
        rounded-2xl border-2 ${priorityBorder[priority]}
        shadow-xl
        ${animate ? 'animate-fade-in' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className={`px-5 py-3 ${style.headerBg} border-b border-gray-700/50`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.icon}</span>
          <span className={`font-semibold ${style.headerColor}`}>
            [{style.label}]
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Title */}
        {title && (
          <h2 className="text-xl font-bold text-white mb-1">
            {title}
          </h2>
        )}
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-gray-400 mb-4">
            {subtitle}
          </p>
        )}

        {/* Content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-4 bg-gray-900/50 border-t border-gray-700/50">
          {footer}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// Info Row
interface CardInfoRowProps {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

export function CardInfoRow({ label, value, highlight = false }: CardInfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

// Status Badge
interface CardStatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'warning';
  label?: string;
}

export function CardStatusBadge({ status, label }: CardStatusBadgeProps) {
  const statusStyles = {
    pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', default: '대기 중' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', default: '진행 중' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', default: '완료' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', default: '실패' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', default: '주의' },
  };

  const style = statusStyles[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
      {label || style.default}
    </span>
  );
}

// Alert Box
interface CardAlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export function CardAlert({ type, message }: CardAlertProps) {
  const alertStyles = {
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'ℹ️' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '⚠️' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🚨' },
    success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '✅' },
  };

  const style = alertStyles[type];

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${style.bg} border ${style.border}`}>
      <span>{style.icon}</span>
      <span className={`text-sm ${style.text}`}>{message}</span>
    </div>
  );
}

// Action Buttons
interface CardActionsProps {
  children: ReactNode;
  variant?: 'horizontal' | 'vertical' | 'grid';
}

export function CardActions({ children, variant = 'horizontal' }: CardActionsProps) {
  const layoutClasses = {
    horizontal: 'flex gap-3',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-3 gap-2',
  };

  return (
    <div className={layoutClasses[variant]}>
      {children}
    </div>
  );
}

// Action Button
interface CardButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function CardButton({ 
  onClick, 
  variant = 'secondary', 
  children, 
  disabled = false,
  loading = false,
  fullWidth = false,
}: CardButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 border border-gray-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-4 py-3 rounded-xl font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          처리 중...
        </span>
      ) : children}
    </button>
  );
}

// Timer
interface CardTimerProps {
  label: string;
  seconds: number;
  critical?: boolean;
}

export function CardTimer({ label, seconds, critical = false }: CardTimerProps) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const timeString = hours > 0 
    ? `${hours}시간 ${minutes}분`
    : `${minutes}분`;

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-lg
      ${critical ? 'bg-red-500/20 text-red-400' : 'bg-gray-700/50 text-gray-300'}
    `}>
      <span className="text-sm">{label}:</span>
      <span className={`font-mono font-bold ${critical ? 'animate-pulse' : ''}`}>
        {timeString}
      </span>
    </div>
  );
}

export default BaseCard;
