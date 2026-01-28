/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ KratonActions - 오늘의 액션 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { ChevronLeft, Phone, MessageSquare, BarChart3 } from 'lucide-react';
import { COLORS, MOCK_DATA } from '../../design-system';
import { GlassCard, StatCard, ActionCard } from '../index';

interface KratonActionsProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonActions: React.FC<KratonActionsProps> = ({ onNavigate }) => {
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const data = MOCK_DATA;
  
  const handleComplete = (id: number) => {
    setCompletedIds(prev => [...prev, id]);
  };
  
  const pendingActions = data.actions.filter(a => !completedIds.includes(a.id));
  const completedActions = data.actions.filter(a => completedIds.includes(a.id));
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate?.('cockpit')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} color={COLORS.text} />
        </button>
        <h1 className="text-xl font-bold text-white">오늘의 액션</h1>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard 
          icon={Phone}
          label="전화 필요"
          value="2"
          color={COLORS.danger}
        />
        <StatCard 
          icon={MessageSquare}
          label="메시지"
          value="5"
          color={COLORS.caution}
        />
        <StatCard 
          icon={BarChart3}
          label="리포트"
          value="1"
          color={COLORS.safe}
        />
      </div>
      
      {/* Progress */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: COLORS.textMuted }}>오늘의 진행률</span>
          <span className="text-white font-semibold">
            {completedIds.length}/{data.actions.length}
          </span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${(completedIds.length / data.actions.length) * 100}%`,
              background: COLORS.success.gradient,
              boxShadow: `0 0 10px ${COLORS.success.glow}`,
            }}
          />
        </div>
      </GlassCard>
      
      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-4">대기 중인 액션</h3>
          <div className="space-y-3">
            {pendingActions.map((action) => (
              <ActionCard 
                key={action.id} 
                action={action}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Completed Actions */}
      {completedActions.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            완료된 액션
            <span 
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: COLORS.success.bg, color: COLORS.success.primary }}
            >
              {completedActions.length}
            </span>
          </h3>
          <div className="space-y-3 opacity-60">
            {completedActions.map((action) => (
              <ActionCard 
                key={action.id} 
                action={action}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* All Complete State */}
      {pendingActions.length === 0 && (
        <GlassCard className="p-8 text-center" hover={false}>
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-white font-semibold text-lg">모든 액션 완료!</h3>
          <p className="mt-2" style={{ color: COLORS.textMuted }}>
            오늘의 모든 액션을 완료했습니다
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default KratonActions;
