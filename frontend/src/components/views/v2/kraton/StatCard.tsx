/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 StatCard - 통계 카드
 * 핵심 지표 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { TrendingUp, LucideIcon } from 'lucide-react';
import { COLORS, ColorState } from '../design-system';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  color?: ColorState;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  onClick,
}) => {
  return (
    <GlassCard onClick={onClick} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>{label}</p>
          <p 
            className="text-3xl font-bold mt-1"
            style={{ color: color?.primary || COLORS.text }}
          >
            {value}
          </p>
          {subValue && (
            <p 
              className="text-sm mt-1 flex items-center gap-1"
              style={{ color: COLORS.success.primary }}
            >
              <TrendingUp size={14} />
              {subValue}
            </p>
          )}
        </div>
        <div 
          className="p-3 rounded-xl"
          style={{ background: color?.bg || 'rgba(255,255,255,0.05)' }}
        >
          <Icon size={24} color={color?.primary || COLORS.textMuted} />
        </div>
      </div>
    </GlassCard>
  );
};

export default StatCard;
