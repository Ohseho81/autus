/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 KratonTimeline - 타임라인 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChevronLeft, Calendar, Plus } from 'lucide-react';
import { COLORS, MOCK_DATA } from '../../design-system';
import { GlassCard, TimelineItem } from '../index';

interface KratonTimelineProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonTimeline: React.FC<KratonTimelineProps> = ({ onNavigate }) => {
  const data = MOCK_DATA;
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate?.('cockpit')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} color={COLORS.text} />
          </button>
          <h1 className="text-xl font-bold text-white">타임라인</h1>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ background: COLORS.safe.bg, color: COLORS.safe.primary }}
        >
          <Plus size={18} />
          일정 추가
        </button>
      </div>
      
      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => {
          const isToday = i === 2;
          return (
            <button
              key={day}
              className={`
                flex flex-col items-center px-4 py-3 rounded-xl min-w-[60px] transition-all
                ${isToday ? 'scale-105' : 'hover:bg-white/5'}
              `}
              style={{
                background: isToday ? COLORS.safe.bg : 'transparent',
                border: `1px solid ${isToday ? COLORS.safe.primary : COLORS.border}`,
              }}
            >
              <span className="text-xs" style={{ color: COLORS.textMuted }}>{day}</span>
              <span 
                className="text-lg font-bold mt-1"
                style={{ color: isToday ? COLORS.safe.primary : COLORS.text }}
              >
                {15 + i}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Timeline */}
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} color={COLORS.safe.primary} />
          <span className="text-white font-semibold">오늘의 일정</span>
        </div>
        <div className="space-y-0">
          {data.timeline.map((item, i) => (
            <TimelineItem 
              key={item.id} 
              item={item} 
              isLast={i === data.timeline.length - 1}
            />
          ))}
        </div>
      </GlassCard>
      
      {/* Upcoming Summary */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>완료</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.success.primary }}>
            {data.timeline.filter(t => t.status === 'completed').length}
          </p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>진행중</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.caution.primary }}>
            {data.timeline.filter(t => t.status === 'current').length}
          </p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>예정</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.safe.primary }}>
            {data.timeline.filter(t => t.status === 'upcoming').length}
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default KratonTimeline;
