/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 TimelineItem - 타임라인 아이템 (Cycle 8)
 * 일정 및 이벤트 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { CheckCircle, Play, Clock } from 'lucide-react';
import { COLORS } from '../design-system';

interface TimelineItemData {
  id: number;
  time: string;
  type: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface TimelineItemProps {
  item: TimelineItemData;
  isLast?: boolean;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'completed':
      return { color: COLORS.success, icon: CheckCircle };
    case 'current':
      return { color: COLORS.caution, icon: Play };
    case 'upcoming':
      return { color: COLORS.safe, icon: Clock };
    default:
      return { color: { primary: COLORS.textDim, bg: 'rgba(255,255,255,0.05)' }, icon: Clock };
  }
};

export const TimelineItem: React.FC<TimelineItemProps> = ({ item, isLast = false }) => {
  const style = getStatusStyle(item.status);
  const Icon = style.icon;
  
  return (
    <div className="flex gap-4">
      {/* Timeline Connector */}
      <div className="flex flex-col items-center">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ 
            background: style.color.bg || 'rgba(255,255,255,0.05)',
            border: `2px solid ${style.color.primary}`,
          }}
        >
          <Icon size={18} color={style.color.primary} />
        </div>
        {!isLast && (
          <div 
            className="w-0.5 flex-1 my-2"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{item.title}</span>
          {item.status === 'current' && (
            <span 
              className="px-2 py-0.5 rounded text-xs animate-pulse"
              style={{ background: COLORS.caution.bg, color: COLORS.caution.primary }}
            >
              진행중
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
          {item.time}
        </p>
      </div>
    </div>
  );
};

export default TimelineItem;
