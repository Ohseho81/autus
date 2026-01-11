import React from 'react';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

const colorClasses = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30',
  yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  red: 'from-red-500/20 to-red-600/10 border-red-500/30',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
};

const textColors = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
};

/**
 * KPI 카드 컴포넌트
 * 핵심 성과 지표를 시각적으로 표시
 */
export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  color = 'blue',
  loading = false,
}) => {
  const isPositiveChange = change !== undefined && change >= 0;

  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 animate-pulse`}>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/3" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 transition-all`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        {icon && <span className={textColors[color]}>{icon}</span>}
      </div>

      {/* 값 */}
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${textColors[color]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>

      {/* 변화량 */}
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <span className={isPositiveChange ? 'text-green-400' : 'text-red-400'}>
            {isPositiveChange ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-gray-500 text-xs">{changeLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default KPICard;
