/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 Streak Badge - 연속 기록 뱃지
 * 도파민 트리거: 끊기 싫은 심리 (손실 회피)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface StreakBadgeProps {
  count: number;
  type?: 'days' | 'tasks' | 'records';
  nextMilestone?: number;
  milestoneReward?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakBadge({
  count,
  type = 'days',
  nextMilestone,
  milestoneReward,
  size = 'md',
}: StreakBadgeProps) {
  const typeLabels = {
    days: '일 연속',
    tasks: '개 연속 완료',
    records: '일 연속 기록',
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  const fireSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  // 연속 기록에 따른 불꽃 강도
  const getFireIntensity = () => {
    if (count >= 30) return '🔥🔥🔥';
    if (count >= 14) return '🔥🔥';
    if (count >= 7) return '🔥';
    return '✨';
  };

  const daysToMilestone = nextMilestone ? nextMilestone - count : null;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      {/* 메인 뱃지 */}
      <div 
        className={`
          inline-flex items-center gap-2 
          bg-gradient-to-r from-orange-500/20 to-red-500/20 
          border border-orange-500/50 
          rounded-full font-bold text-orange-400
          ${sizeClasses[size]}
        `}
      >
        <span className={fireSize[size]}>{getFireIntensity()}</span>
        <span>{count}{typeLabels[type]}</span>
      </div>

      {/* 마일스톤 안내 */}
      {daysToMilestone !== null && daysToMilestone > 0 && (
        <div className="text-xs text-slate-400 text-center">
          {daysToMilestone}일 더 하면{' '}
          {milestoneReward && (
            <span className="text-amber-400">{milestoneReward}</span>
          )}
        </div>
      )}

      {/* 경고 (끊기면 리셋) */}
      {count >= 7 && (
        <div className="text-xs text-red-400/70 flex items-center gap-1">
          <span>⚠️</span>
          <span>내일 안 하면 처음부터!</span>
        </div>
      )}
    </div>
  );
}
