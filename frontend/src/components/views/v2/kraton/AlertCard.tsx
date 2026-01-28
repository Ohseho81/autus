/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚨 AlertCard - 위험 알림 카드 (Cycle 4)
 * 위험 상태에 따른 펄스 효과
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { AlertTriangle, AlertCircle, TrendingUp, Info, ChevronRight } from 'lucide-react';
import { COLORS } from '../design-system';
import { GlassCard } from './GlassCard';

interface Alert {
  id: number;
  type: 'danger' | 'caution' | 'success' | 'info';
  title: string;
  time: string;
}

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
}

const getAlertStyle = (type: string) => {
  switch (type) {
    case 'danger':
      return { color: COLORS.danger, icon: AlertTriangle, pulse: true };
    case 'caution':
      return { color: COLORS.caution, icon: AlertCircle, pulse: false };
    case 'success':
      return { color: COLORS.success, icon: TrendingUp, pulse: false };
    default:
      return { color: COLORS.safe, icon: Info, pulse: false };
  }
};

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
  const style = getAlertStyle(alert.type);
  const Icon = style.icon;
  
  return (
    <GlassCard
      onClick={onClick}
      glow={style.pulse ? style.color.glow : null}
      className={`p-4 ${style.pulse ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ background: style.color.bg }}
        >
          <Icon size={18} color={style.color.primary} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{alert.title}</p>
          <p className="text-xs mt-1" style={{ color: COLORS.textDim }}>{alert.time}</p>
        </div>
        <ChevronRight size={16} color={COLORS.textDim} />
      </div>
    </GlassCard>
  );
};

export default AlertCard;
