/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 QuickActionButton - 빠른 액션 버튼
 * 메인 대시보드 퀵 액션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { COLORS, ColorState } from '../design-system';
import { GlassCard } from './GlassCard';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  color?: ColorState;
  onClick?: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  label,
  color,
  onClick,
}) => {
  return (
    <GlassCard onClick={onClick} className="p-4">
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ background: color?.bg }}
        >
          <Icon size={20} color={color?.primary} />
        </div>
        <span className="text-white font-medium flex-1">{label}</span>
        <ChevronRight size={16} color={COLORS.textDim} />
      </div>
    </GlassCard>
  );
};

export default QuickActionButton;
