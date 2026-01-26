import React, { useState } from 'react';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// ============================================
// KRATON DOPAMINE GARDEN
// 학생 전용 게임화 UI
// ============================================

const TOKENS = {
  type: {
    h1: 'text-2xl font-black tracking-tight',
    h2: 'text-lg font-bold',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
  },
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl',
};

// ============================================
// LEVEL PROGRESS
// ============================================
const LevelProgress = ({ level, currentXP, nextLevelXP, truthMode }) => {
  const progress = (currentXP / nextLevelXP) * 100;

  return (
    <div className={`${TOKENS.glass} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <span className="text-2xl font-black text-white">Lv</span>
          </div>
          <div>
            <p className={TOKENS.type.h2}>Level {level}</p>
            <p className={TOKENS.type.meta}>
              {truthMode ? `${currentXP} / ${nextLevelXP} XP` : '다음 레벨까지 조금만!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          {truthMode ? (
            <p className={`${TOKENS.type.number} text-2xl text-purple-400`}>{progress.toFixed(0)}%</p>
          ) : (
            <span className="text-3xl">{progress > 80 ? '🔥' : progress > 50 ? '💪' : '🌱'}</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        >
          <div className="h-full w-full animate-pulse bg-white/20" />
        </div>
      </div>

      {/* Next Reward */}
      <div className="mt-4 flex items-center gap-2 text-yellow-400">
        <span>🎁</span>
        <span className={TOKENS.type.body}>다음 보상: 황금 뱃지</span>
      </div>
    </div>
  );
};

// ============================================
// BADGE COLLECTION
// ============================================
const BadgeCollection = ({ truthMode }) => {
  const allBadges = [
    { id: 1, icon: '🔥', name: '7일 연속', desc: '7일 연속 출석', earned: true, points: 100 },
    { id: 2, icon: '📚', name: '책벌레', desc: '숙제 10개 완료', earned: true, points: 150 },
    { id: 3, icon: '⚡', name: '스피드러너', desc: '제한시간 안에 완료', earned: true, points: 80 },
    { id: 4, icon: '🏆', name: '챔피언', desc: '월간 1등', earned: false, points: 500 },
    { id: 5, icon: '💎', name: '다이아몬드', desc: '30일 연속', earned: false, points: 300 },
    { id: 6, icon: '🌟', name: '올스타', desc: '모든 과목 만점', earned: false, points: 1000 },
  ];

  return (
    <div className={`${TOKENS.glass} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={TOKENS.type.h2}>🏅 뱃지 컬렉션</h3>
        <span className={TOKENS.type.meta}>
          {truthMode 
            ? `${allBadges.filter(b => b.earned).length}/${allBadges.length} 획득`
            : '모아보자!'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {allBadges.map(badge => (
          <div
            key={badge.id}
            className={`relative p-4 rounded-xl text-center ${TOKENS.motion.base}
              ${badge.earned 
                ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border border-yellow-500/30' 
                : 'bg-gray-800/50 border border-gray-700/50 opacity-50'}`}
          >
            <span className={`text-3xl ${badge.earned ? '' : 'grayscale'}`}>{badge.icon}</span>
            <p className={`${TOKENS.type.body} mt-2 ${badge.earned ? 'text-white' : 'text-gray-500'}`}>
              {badge.name}
            </p>
            {truthMode && badge.earned && (
              <p className={`${TOKENS.type.meta} text-yellow-400 mt-1`}>+{badge.points}P</p>
            )}
            
            {!badge.earned && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
                <span className="text-2xl">🔒</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// DAILY QUESTS
// ============================================
const DailyQuests = ({ truthMode }) => {
  const quests = [
    { id: 1, title: '오늘의 출석 체크', reward: 10, completed: true },
    { id: 2, title: '수학 문제 5개 풀기', reward: 30, completed: true },
    { id: 3, title: '영어 단어 10개 외우기', reward: 25, completed: false, progress: 6, total: 10 },
    { id: 4, title: '오늘의 복습 완료', reward: 40, completed: false, progress: 0, total: 1 },
  ];

  return (
    <div className={`${TOKENS.glass} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={TOKENS.type.h2}>📋 오늘의 퀘스트</h3>
        <span className={TOKENS.type.meta}>
          {quests.filter(q => q.completed).length}/{quests.length} 완료
        </span>
      </div>

      <div className="space-y-3">
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`p-4 rounded-xl ${TOKENS.motion.base}
              ${quest.completed 
                ? 'bg-emerald-900/30 border border-emerald-500/30' 
                : 'bg-gray-800/50 border border-gray-700/50'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{quest.completed ? '✅' : '⬜'}</span>
                <div>
                  <p className={`${TOKENS.type.body} ${quest.completed ? 'text-emerald-400 line-through' : 'text-white'}`}>
                    {quest.title}
                  </p>
                  {!quest.completed && quest.progress !== undefined && (
                    <p className={TOKENS.type.meta}>{quest.progress}/{quest.total} 진행 중</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {truthMode ? (
                  <span className={`${TOKENS.type.number} ${quest.completed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    +{quest.reward}P
                  </span>
                ) : (
                  <span>{quest.completed ? '🎉' : '💪'}</span>
                )}
              </div>
            </div>

            {!quest.completed && quest.progress !== undefined && (
              <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all"
                  style={{ width: `${(quest.progress / quest.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total rewards */}
      <div className="mt-4 p-3 bg-yellow-900/30 rounded-xl flex items-center justify-between">
        <span className={TOKENS.type.body}>오늘 획득 가능</span>
        {truthMode ? (
          <span className={`${TOKENS.type.number} text-yellow-400 font-bold`}>
            +{quests.reduce((sum, q) => sum + q.reward, 0)}P
          </span>
        ) : (
          <span className="text-yellow-400">🌟 최대 보상!</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// STREAK CALENDAR
// ============================================
const StreakCalendar = ({ truthMode }) => {
  const streak = 12;
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const thisWeek = [true, true, true, true, true, false, false];

  return (
    <div className={`${TOKENS.glass} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={TOKENS.type.h2}>🔥 연속 출석</h3>
        {truthMode ? (
          <span className={`${TOKENS.type.number} text-orange-400 font-bold`}>{streak}일</span>
        ) : (
          <span className="text-orange-400">불타오르는 중! 🔥</span>
        )}
      </div>

      <div className="flex justify-between gap-2">
        {days.map((day, idx) => (
          <div key={day} className="flex-1 text-center">
            <p className={TOKENS.type.meta}>{day}</p>
            <div className={`mt-2 w-10 h-10 mx-auto rounded-xl flex items-center justify-center
              ${thisWeek[idx] 
                ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                : idx < 5 ? 'bg-gray-800 border border-gray-700' : 'bg-gray-800/50'}`}>
              {thisWeek[idx] ? '🔥' : idx >= 5 ? '?' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-orange-900/30 rounded-xl text-center">
        <p className={TOKENS.type.body}>
          {streak >= 30 ? '🏆 전설의 학습러!' : streak >= 14 ? '💎 다이아몬드 연속!' : streak >= 7 ? '🌟 일주일 달성!' : '💪 계속 도전!'}
        </p>
        {truthMode && (
          <p className={`${TOKENS.type.meta} text-orange-400 mt-1`}>
            연속 보너스: x{Math.min(streak * 0.1 + 1, 3).toFixed(1)}배
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================
// QUICK ACTIONS (학생용)
// ============================================
const StudentQuickActions = () => {
  const actions = [
    { icon: '📝', label: '숙제 제출', color: 'blue' },
    { icon: '❓', label: '질문하기', color: 'purple' },
    { icon: '📊', label: '내 성적', color: 'emerald' },
    { icon: '🎮', label: '학습 게임', color: 'pink' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, idx) => (
        <button
          key={idx}
          className={`p-4 rounded-xl ${TOKENS.motion.base}
            bg-${action.color}-600/20 border border-${action.color}-500/30
            hover:bg-${action.color}-600/30 active:scale-95`}
        >
          <span className="text-2xl block mb-2">{action.icon}</span>
          <span className={`${TOKENS.type.body} text-${action.color}-400`}>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================
// MAIN DOPAMINE GARDEN
// ============================================
const DopamineGarden = () => {
  const [truthMode, setTruthMode] = useState(false);
  const [totalPoints] = useState(1250);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={TOKENS.type.h1}>🌸 나의 정원</h1>
            <p className={TOKENS.type.meta}>오늘도 성장하는 중!</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-yellow-600/20 rounded-xl border border-yellow-500/30">
              <span className="text-yellow-400 font-bold">
                {truthMode ? `${totalPoints.toLocaleString()}P` : '✨ 많이 모았어!'}
              </span>
            </div>
            <button
              onClick={() => setTruthMode(!truthMode)}
              className={`p-2 rounded-xl ${TOKENS.motion.base}
                ${truthMode ? 'bg-purple-600/30 text-purple-400' : 'bg-gray-800 text-gray-500'}`}
            >
              {truthMode ? '🔢' : '✨'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <LevelProgress level={12} currentXP={750} nextLevelXP={1000} truthMode={truthMode} />
        <StudentQuickActions />
        <DailyQuests truthMode={truthMode} />
        <StreakCalendar truthMode={truthMode} />
        <BadgeCollection truthMode={truthMode} />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-6 py-3">
        <div className="flex justify-around">
          {[
            { icon: '🏠', label: '홈', active: true },
            { icon: '📚', label: '학습', active: false },
            { icon: '🏅', label: '뱃지', active: false },
            { icon: '👤', label: '나', active: false },
          ].map((tab, idx) => (
            <button key={idx} className={`flex flex-col items-center gap-1 ${tab.active ? 'text-purple-400' : 'text-gray-500'}`}>
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default DopamineGarden;
