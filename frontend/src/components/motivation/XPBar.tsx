/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎮 XP Bar - 경험치 바 (학생용)
 * 도파민 트리거: 레벨업 (조금만 더 하면!)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';

interface XPBarProps {
  currentXP: number;
  maxXP: number;
  level: number;
  recentGains?: Array<{ source: string; amount: number }>;
  showLevelUp?: boolean;
}

export default function XPBar({
  currentXP,
  maxXP,
  level,
  recentGains = [],
  showLevelUp = false,
}: XPBarProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const percentage = (currentXP / maxXP) * 100;
  const remaining = maxXP - currentXP;

  useEffect(() => {
    if (showLevelUp) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showLevelUp]);

  return (
    <div className="w-full">
      {/* 레벨 & XP 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <span className="font-bold text-lg text-amber-400">Level {level}</span>
        </div>
        <div className="text-sm text-slate-400">
          <span className="text-white font-mono">{currentXP.toLocaleString()}</span>
          <span> / {maxXP.toLocaleString()} XP</span>
        </div>
      </div>

      {/* XP 바 */}
      <div className="relative h-6 bg-slate-700 rounded-full overflow-hidden">
        {/* 진행 바 */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        >
          {/* 반짝임 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>

        {/* 퍼센트 텍스트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 남은 XP 안내 */}
      <div className="mt-2 text-center text-sm text-slate-400">
        <span className="text-amber-400 font-bold">{remaining.toLocaleString()} XP</span>만 더 모으면 레벨업! 🚀
      </div>

      {/* 최근 획득 XP */}
      {recentGains.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs text-slate-500">오늘 얻은 XP:</div>
          {recentGains.map((gain, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">• {gain.source}</span>
              <span className="text-green-400 font-mono">+{gain.amount} XP</span>
            </div>
          ))}
        </div>
      )}

      {/* 레벨업 애니메이션 */}
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fadeIn">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-3xl font-bold text-amber-400 mb-2">LEVEL UP!</div>
            <div className="text-xl text-white">Level {level} 달성!</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
