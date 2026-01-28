/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ ActionCard - 액션 카드 (Cycle 9)
 * 드래그 앤 드롭 준비된 액션 카드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { Phone, MessageSquare, BarChart3, Zap, Check } from 'lucide-react';
import { COLORS, getPriorityStyle } from '../design-system';
import { GlassCard } from './GlassCard';

interface Action {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  type: 'call' | 'message' | 'report';
  dueTime: string;
  target: string;
}

interface ActionCardProps {
  action: Action;
  onComplete?: (id: number) => void;
}

const TypeIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  switch (type) {
    case 'call': return <Phone size={18} color={color} />;
    case 'message': return <MessageSquare size={18} color={color} />;
    case 'report': return <BarChart3 size={18} color={color} />;
    default: return <Zap size={18} color={color} />;
  }
};

export const ActionCard: React.FC<ActionCardProps> = ({ action, onComplete }) => {
  const style = getPriorityStyle(action.priority);
  
  return (
    <GlassCard className="p-4 cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-3">
        {/* Priority Indicator */}
        <div 
          className="w-1 self-stretch rounded-full"
          style={{ background: style.color.primary }}
        />
        
        {/* Icon */}
        <div 
          className="p-2 rounded-lg shrink-0"
          style={{ background: style.color.bg }}
        >
          <TypeIcon type={action.type} color={style.color.primary} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{action.title}</span>
            <span 
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: style.color.bg, color: style.color.primary }}
            >
              {style.label}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            {action.target} · {action.dueTime}
          </p>
        </div>
        
        {/* Complete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(action.id);
          }}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
        >
          <Check size={18} color={COLORS.textMuted} />
        </button>
      </div>
    </GlassCard>
  );
};

export default ActionCard;
