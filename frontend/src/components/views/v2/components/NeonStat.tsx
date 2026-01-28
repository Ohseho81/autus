/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💫 NeonStat - 네온 글로우 통계 컴포넌트
 * Dribbble 하이엔드 대시보드 스타일
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NeonStatProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  color?: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const colorMap = {
  emerald: {
    primary: '#10b981',
    secondary: '#14b8a6',
    glow: 'rgba(16, 185, 129, 0.4)',
    bg: 'rgba(16, 185, 129, 0.1)',
  },
  amber: {
    primary: '#f59e0b',
    secondary: '#f97316',
    glow: 'rgba(245, 158, 11, 0.4)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  red: {
    primary: '#ef4444',
    secondary: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.4)',
    bg: 'rgba(239, 68, 68, 0.1)',
  },
  blue: {
    primary: '#3b82f6',
    secondary: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.4)',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    glow: 'rgba(139, 92, 246, 0.4)',
    bg: 'rgba(139, 92, 246, 0.1)',
  },
  cyan: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.4)',
    bg: 'rgba(6, 182, 212, 0.1)',
  },
};

const sizeMap = {
  sm: { value: 'text-2xl', label: 'text-xs', icon: 16, padding: 'p-3' },
  md: { value: 'text-3xl', label: 'text-sm', icon: 20, padding: 'p-4' },
  lg: { value: 'text-4xl', label: 'text-base', icon: 24, padding: 'p-5' },
};

export const NeonStat: React.FC<NeonStatProps> = ({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon: Icon,
  color = 'emerald',
  size = 'md',
  onClick,
}) => {
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b';

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl ${sizes.padding}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={{
        background: `linear-gradient(135deg, ${colors.bg}, rgba(15, 23, 42, 0.8))`,
        border: `1px solid ${colors.primary}22`,
        boxShadow: `0 0 30px ${colors.glow}`,
      }}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: `0 0 50px ${colors.glow}`,
        borderColor: `${colors.primary}44`,
      }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* 배경 글로우 */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
        style={{ backgroundColor: colors.primary, opacity: 0.15 }}
      />

      {/* 아이콘 */}
      {Icon && (
        <motion.div
          className="absolute top-3 right-3 p-2 rounded-lg"
          style={{ backgroundColor: colors.bg }}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon size={sizes.icon} style={{ color: colors.primary }} />
        </motion.div>
      )}

      {/* 라벨 */}
      <div className={`${sizes.label} text-slate-400 mb-1`}>
        {label}
      </div>

      {/* 메인 값 */}
      <motion.div
        className={`${sizes.value} font-bold`}
        style={{ 
          color: colors.primary,
          textShadow: `0 0 20px ${colors.glow}`,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {value}
      </motion.div>

      {/* 서브 값 또는 트렌드 */}
      <div className="flex items-center gap-2 mt-2">
        {subValue && (
          <span className="text-xs text-slate-500">{subValue}</span>
        )}
        {trend && (
          <motion.div 
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ 
              backgroundColor: `${trendColor}15`,
              color: trendColor,
            }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TrendIcon size={12} />
            {trendValue}
          </motion.div>
        )}
      </div>

      {/* 하단 악센트 라인 */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-full"
        style={{ 
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
        }}
        initial={{ width: 0 }}
        animate={{ width: '40%' }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />
    </motion.div>
  );
};

export default NeonStat;
