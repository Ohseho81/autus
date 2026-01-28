/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎯 MissionCard - What/How/Why 미션 카드
 * 
 * 핵심: "내가 뭘 왜 어떻게 해야 해?"
 * - What: 뭘 해야 해?
 * - How: 어떻게 해?
 * - Why: 왜 해야 해? (꿈과 연결)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';

export interface Mission {
  id: string;
  title: string;
  what: string;           // 뭘 해야 해?
  how: string[];          // 어떻게 해? (단계별)
  why: string;            // 왜 해야 해? (꿈 연결)
  estimatedTime: string;  // 예상 시간
  xpReward: number;       // XP 보상
  badgeReward?: string;   // 뱃지 보상 (선택)
  dreamConnection?: string; // 꿈과의 연결
  isCompleted?: boolean;
}

interface MissionCardProps {
  mission: Mission;
  onStart?: () => void;
  onComplete?: () => void;
  showDetails?: boolean;
}

export default function MissionCard({
  mission,
  onStart,
  onComplete,
  showDetails = true,
}: MissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = () => {
    setIsStarted(true);
    onStart?.();
  };

  const handleComplete = () => {
    onComplete?.();
  };

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/30 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>🎯</span>
            <span>{mission.title}</span>
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* What - 뭘 해야 해? */}
          <div>
            <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
              <span>📚</span>
              <span>뭘 해야 해?</span>
            </div>
            <div className="text-lg font-medium text-white">{mission.what}</div>
          </div>

          <div className="border-t border-slate-700/50" />

          {/* How - 어떻게 해? */}
          {showDetails && (
            <>
              <div>
                <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                  <span>🔧</span>
                  <span>어떻게 해?</span>
                </div>
                <div className="space-y-2">
                  {mission.how.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center text-xs text-green-400 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700/50" />
            </>
          )}

          {/* Why - 왜 해야 해? */}
          <div>
            <div className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
              <span>💡</span>
              <span>왜 해야 해?</span>
            </div>
            <div className="text-sm text-yellow-200 leading-relaxed">{mission.why}</div>
            
            {/* 꿈과의 연결 */}
            {mission.dreamConnection && (
              <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="text-xs text-purple-300 flex items-center gap-1">
                  <span>🌟</span>
                  <span>{mission.dreamConnection}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700/50" />

          {/* 보상 정보 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400">⏱️ </span>
                <span className="text-white">{mission.estimatedTime}</span>
              </div>
              <div>
                <span className="text-slate-400">🏆 </span>
                <span className="text-purple-400">+{mission.xpReward} XP</span>
              </div>
            </div>
            {mission.badgeReward && (
              <div className="px-2 py-1 bg-yellow-500/20 rounded-full text-xs text-yellow-300">
                🎖️ {mission.badgeReward}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="pt-2">
            {!isStarted ? (
              <button
                onClick={handleStart}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/30"
              >
                🚀 시작하기
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/30"
              >
                ✅ 완료!
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
