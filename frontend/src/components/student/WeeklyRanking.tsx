/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 WeeklyRanking - 주간 순위표
 * 
 * 도파민 트리거: 적절한 경쟁 = 동기부여
 * - 순위 표시
 * - 1등까지 남은 XP 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

export interface RankingItem {
  rank: number;
  name: string;
  xp: number;
  avatar?: string;
  isMe: boolean;
}

interface WeeklyRankingProps {
  title?: string;
  rankings: RankingItem[];
  showMotivation?: boolean;
}

export default function WeeklyRanking({
  title = '이번 주 우리 반 순위',
  rankings,
  showMotivation = true,
}: WeeklyRankingProps) {
  const myRanking = rankings.find(r => r.isMe);
  const topRanking = rankings[0];
  const xpToFirst = myRanking && topRanking && !myRanking.isMe 
    ? topRanking.xp - myRanking.xp 
    : 0;

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return { emoji: '🥇', color: 'text-yellow-400' };
      case 2: return { emoji: '🥈', color: 'text-slate-300' };
      case 3: return { emoji: '🥉', color: 'text-orange-400' };
      default: return { emoji: `${rank}.`, color: 'text-slate-400' };
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <h3 className="text-lg font-bold flex items-center gap-2">
        <span>📊</span>
        <span>{title}</span>
      </h3>

      {/* 순위표 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="space-y-2">
          {rankings.map((item) => {
            const { emoji, color } = getRankDisplay(item.rank);
            
            return (
              <div 
                key={item.rank}
                className={`
                  flex items-center justify-between p-3 rounded-lg transition-all
                  ${item.isMe 
                    ? 'bg-purple-500/20 border border-purple-500/30 scale-[1.02]' 
                    : 'bg-slate-700/30 hover:bg-slate-700/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* 순위 */}
                  <span className={`text-lg w-8 ${color}`}>{emoji}</span>
                  
                  {/* 아바타 */}
                  {item.avatar ? (
                    <img 
                      src={item.avatar} 
                      alt={item.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                      ${item.isMe ? 'bg-purple-500' : 'bg-slate-600'}
                    `}>
                      {item.name[0]}
                    </div>
                  )}
                  
                  {/* 이름 */}
                  <span className={item.isMe ? 'text-purple-300 font-medium' : 'text-slate-300'}>
                    {item.name}
                  </span>
                  
                  {/* 나 표시 */}
                  {item.isMe && (
                    <span className="text-xs text-purple-400 bg-purple-500/30 px-1.5 py-0.5 rounded">
                      ← 나!
                    </span>
                  )}
                </div>

                {/* XP */}
                <span className="text-sm text-slate-400 font-mono">
                  +{item.xp} XP
                </span>
              </div>
            );
          })}
        </div>

        {/* 동기부여 메시지 */}
        {showMotivation && xpToFirst > 0 && myRanking && myRanking.rank > 1 && (
          <div className="mt-4 text-center text-sm text-cyan-400 p-2 bg-cyan-500/10 rounded-lg">
            💪 {xpToFirst} XP만 더 얻으면 1등!
          </div>
        )}

        {/* 1등일 때 */}
        {myRanking?.rank === 1 && (
          <div className="mt-4 text-center text-sm text-yellow-400 p-2 bg-yellow-500/10 rounded-lg">
            🏆 대단해! 1등이야! 계속 유지하자!
          </div>
        )}
      </div>
    </div>
  );
}
