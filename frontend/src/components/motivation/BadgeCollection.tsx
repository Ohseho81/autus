/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏆 Badge Collection - 뱃지 컬렉션 (학생용)
 * 도파민 트리거: 수집의 쾌감 (포켓몬 심리)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
  isLocked?: boolean;
  unlockCondition?: string;
}

interface BadgeCollectionProps {
  badges: Badge[];
  showLocked?: boolean;
  onBadgeClick?: (badge: Badge) => void;
}

const RARITY_COLORS = {
  common: { bg: 'bg-slate-600', border: 'border-slate-500', text: 'text-slate-300' },
  rare: { bg: 'bg-blue-600/30', border: 'border-blue-500', text: 'text-blue-400' },
  epic: { bg: 'bg-purple-600/30', border: 'border-purple-500', text: 'text-purple-400' },
  legendary: { bg: 'bg-amber-600/30', border: 'border-amber-500', text: 'text-amber-400' },
};

const RARITY_LABELS = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
};

export default function BadgeCollection({
  badges,
  showLocked = true,
  onBadgeClick,
}: BadgeCollectionProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const earnedBadges = badges.filter(b => !b.isLocked);
  const lockedBadges = badges.filter(b => b.isLocked);

  const handleClick = (badge: Badge) => {
    setSelectedBadge(badge);
    onBadgeClick?.(badge);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🏆</span>
          <span>뱃지 컬렉션</span>
        </h3>
        <div className="text-sm text-slate-400">
          <span className="text-amber-400 font-bold">{earnedBadges.length}</span>
          <span> / {badges.length}개 획득</span>
        </div>
      </div>

      {/* 획득한 뱃지 */}
      <div className="grid grid-cols-4 gap-3">
        {earnedBadges.map(badge => {
          const colors = RARITY_COLORS[badge.rarity];
          return (
            <button
              key={badge.id}
              onClick={() => handleClick(badge)}
              className={`
                p-3 rounded-xl ${colors.bg} border-2 ${colors.border}
                hover:scale-105 transition-transform cursor-pointer
                flex flex-col items-center gap-1
              `}
            >
              <span className="text-3xl">{badge.icon}</span>
              <span className={`text-xs font-medium ${colors.text} text-center truncate w-full`}>
                {badge.name}
              </span>
            </button>
          );
        })}

        {/* 잠긴 뱃지 */}
        {showLocked && lockedBadges.map(badge => (
          <button
            key={badge.id}
            onClick={() => handleClick(badge)}
            className={`
              p-3 rounded-xl bg-slate-800/50 border border-slate-700
              hover:bg-slate-800 transition-colors cursor-pointer
              flex flex-col items-center gap-1 opacity-50
            `}
          >
            <span className="text-3xl grayscale">🔒</span>
            <span className="text-xs text-slate-500 text-center truncate w-full">
              ???
            </span>
          </button>
        ))}
      </div>

      {/* 선택된 뱃지 상세 */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedBadge(null)}
        >
          <div 
            className={`
              p-6 rounded-2xl max-w-sm mx-4
              ${RARITY_COLORS[selectedBadge.rarity].bg}
              border-2 ${RARITY_COLORS[selectedBadge.rarity].border}
            `}
            onClick={e => e.stopPropagation()}
          >
            {/* 뱃지 아이콘 */}
            <div className="text-center mb-4">
              <span className="text-6xl">{selectedBadge.isLocked ? '🔒' : selectedBadge.icon}</span>
            </div>

            {/* 뱃지 정보 */}
            <div className="text-center">
              <div className={`text-xl font-bold ${RARITY_COLORS[selectedBadge.rarity].text}`}>
                {selectedBadge.isLocked ? '???' : selectedBadge.name}
              </div>
              <div className={`text-xs mt-1 ${RARITY_COLORS[selectedBadge.rarity].text}`}>
                {RARITY_LABELS[selectedBadge.rarity]}
              </div>
              <div className="text-sm text-slate-300 mt-3">
                {selectedBadge.isLocked 
                  ? selectedBadge.unlockCondition || '조건을 달성하면 획득!'
                  : selectedBadge.description}
              </div>
              {selectedBadge.earnedAt && !selectedBadge.isLocked && (
                <div className="text-xs text-slate-500 mt-2">
                  획득일: {selectedBadge.earnedAt.toLocaleDateString()}
                </div>
              )}
            </div>

            {/* 닫기 */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
