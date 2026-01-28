/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 StatusCard - Kraton이 생성한 상태 카드 컴포넌트
 * 재원 현황, 알림 등을 표시하는 인터랙티브 카드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface StatusItem {
  label: string;
  value: number | string;
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
}

interface StatusCardProps {
  title: string;
  icon?: LucideIcon;
  mainValue?: string | number;
  mainLabel?: string;
  items?: StatusItem[];
  onClick?: () => void;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
}

const colorMap = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    glow: 'hover:shadow-emerald-500/20',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    glow: 'hover:shadow-amber-500/20',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    glow: 'hover:shadow-red-500/20',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    glow: 'hover:shadow-blue-500/20',
  },
  slate: {
    text: 'text-slate-400',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/30',
    glow: 'hover:shadow-slate-500/20',
  },
};

const variantStyles = {
  default: 'border-slate-700 hover:border-slate-600',
  highlight: 'border-emerald-500/30 hover:border-emerald-500/50',
  warning: 'border-amber-500/30 hover:border-amber-500/50',
  danger: 'border-red-500/30 hover:border-red-500/50 animate-pulse',
};

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  icon: Icon = Users,
  mainValue,
  mainLabel,
  items = [],
  onClick,
  variant = 'default',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`
        p-5 bg-slate-800/50 rounded-xl border cursor-pointer
        backdrop-blur-sm transition-all duration-300
        hover:shadow-lg ${variantStyles[variant]}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-slate-700/50">
          <Icon size={16} className="text-slate-300" />
        </div>
        <span className="text-sm font-medium text-slate-300">{title}</span>
      </div>

      {/* Main Value */}
      {mainValue && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="mb-4"
        >
          <div className="text-3xl font-bold text-white">{mainValue}</div>
          {mainLabel && (
            <div className="text-xs text-slate-500 mt-1">{mainLabel}</div>
          )}
        </motion.div>
      )}

      {/* Status Items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const colors = colorMap[item.color];
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-2 rounded-lg ${colors.bg}`}
              >
                <span className={`text-xs ${colors.text}`}>{item.label}</span>
                <span className={`text-sm font-bold ${colors.text}`}>{item.value}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// 프리셋 컴포넌트들

export const CustomerStatusCard: React.FC<{
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  onClick?: () => void;
}> = ({ total, healthy, warning, critical, onClick }) => (
  <StatusCard
    title="재원 현황"
    icon={Users}
    mainValue={`${total}명`}
    mainLabel="전체 재원"
    items={[
      { label: '양호', value: `${healthy}명`, color: 'emerald' },
      { label: '주의', value: `${warning}명`, color: 'amber' },
      { label: '위험', value: `${critical}명`, color: 'red' },
    ]}
    onClick={onClick}
    variant={critical > 0 ? 'danger' : 'default'}
  />
);

export const AlertStatusCard: React.FC<{
  criticalCount: number;
  warningCount: number;
  onClick?: () => void;
}> = ({ criticalCount, warningCount, onClick }) => (
  <StatusCard
    title="알림 현황"
    icon={AlertTriangle}
    mainValue={criticalCount + warningCount}
    mainLabel="미처리 알림"
    items={[
      { label: '긴급', value: criticalCount, color: 'red' },
      { label: '주의', value: warningCount, color: 'amber' },
    ]}
    onClick={onClick}
    variant={criticalCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'default'}
  />
);

export default StatusCard;
