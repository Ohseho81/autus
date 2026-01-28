/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Student Home (Gamified)
 * 🎒 학생용 게임화 대시보드
 * autus-ai.com API 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { useLeaderboard, useRewards } from '../../../hooks/useAcademyData';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StudentProfile {
  name: string;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  ranking?: { position: number; scope: string };
  avatar: {
    base: string;
    accessories: string[];
  };
}

interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  isBonus: boolean;
  badgeReward?: string;
  progress?: { current: number; total: number };
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface StudentDashboardData {
  profile: StudentProfile;
  missions: Mission[];
  badges: Badge[];
  points: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockData: StudentDashboardData = {
  profile: {
    name: '민수',
    level: 12,
    currentXP: 2450,
    nextLevelXP: 3000,
    streak: 7,
    ranking: { position: 3, scope: '반에서' },
    avatar: {
      base: '🧑',
      accessories: ['🎓', '✨'],
    },
  },
  missions: [
    { id: '1', title: '수업 참여하기', description: '오늘 수업에 출석하기', xpReward: 100, completed: false, isBonus: false },
    { id: '2', title: '숙제 완료하기', description: '오늘 숙제 제출하기', xpReward: 150, completed: false, isBonus: false },
    { id: '3', title: '질문 1개 하기', description: '수업 중 질문하기', xpReward: 50, completed: true, isBonus: false },
    { id: '4', title: '시험 점수 10점 올리기', description: '이번 주 테스트에서 점수 향상', xpReward: 500, completed: false, isBonus: true, badgeReward: '📈', progress: { current: 6, total: 10 } },
  ],
  badges: [
    { id: '1', name: '7일 연속', icon: '🔥', description: '7일 연속 출석', earned: true, earnedDate: '오늘', rarity: 'rare' },
    { id: '2', name: '출석왕', icon: '📚', description: '한 달 개근', earned: true, rarity: 'epic' },
    { id: '3', name: '성적 UP', icon: '⭐', description: '성적 10점 이상 향상', earned: false, rarity: 'rare' },
    { id: '4', name: '숙제왕', icon: '📝', description: '10일 연속 숙제 제출', earned: true, rarity: 'common' },
    { id: '5', name: '노력가', icon: '💪', description: '주 3회 이상 질문', earned: false, rarity: 'common' },
    { id: '6', name: '1위!', icon: '🏆', description: '반에서 1위 달성', earned: false, rarity: 'legendary' },
  ],
  points: 1200,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentHome() {
  const reducedMotion = useReducedMotion();
  const [data] = useState<StudentDashboardData>(mockData);
  const [missions, setMissions] = useState(data.missions);

  const completeMission = (missionId: string) => {
    setMissions(prev => prev.map(m => 
      m.id === missionId ? { ...m, completed: true } : m
    ));
  };

  const completedCount = missions.filter(m => m.completed).length;
  const xpProgress = Math.round((data.profile.currentXP / data.profile.nextLevelXP) * 100);

  return (
    <div 
      className="min-h-screen pb-24"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Header */}
      <header className="px-4 pt-6 pb-4 flex items-center justify-between text-white">
        <div>
          <h1 className="text-lg font-medium flex items-center gap-2">
            🎒 {data.profile.name}야, 오늘도 파이팅!
            <motion.span
              animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
            >
              🔥
            </motion.span>
          </h1>
          <p className="text-sm text-white/70">
            <span className="text-amber-300 font-bold">{data.profile.streak}일</span> 연속 출석!
          </p>
        </div>
        <button
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl"
          aria-label="프로필"
        >
          {data.profile.avatar.base}
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-4">
        {/* Character & Level Card */}
        <CharacterCard profile={data.profile} xpProgress={xpProgress} />

        {/* Missions & Badges */}
        <div className="grid grid-cols-1 gap-4">
          <MissionsCard missions={missions} onComplete={completeMission} />
          <BadgesCard badges={data.badges} />
        </div>

        {/* Quick Feedback */}
        <QuickFeedbackCard />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Character Card
// ─────────────────────────────────────────────────────────────────────────────

function CharacterCard({ 
  profile, 
  xpProgress 
}: { 
  profile: StudentProfile;
  xpProgress: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-lg"
    >
      {/* Avatar & Level */}
      <div className="flex flex-col items-center">
        {/* Avatar Display */}
        <motion.div
          className="relative mb-4"
          animate={reducedMotion ? {} : { y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-7xl">
            {profile.avatar.base}
          </div>
          <div className="absolute -right-2 -top-2 flex gap-0.5">
            {profile.avatar.accessories.map((acc, i) => (
              <span key={i} className="text-2xl">{acc}</span>
            ))}
          </div>
        </motion.div>

        {/* Level Display */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            Lv.{profile.level}
          </span>
          <motion.span
            animate={reducedMotion ? {} : { rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl"
          >
            ⭐
          </motion.span>
        </div>

        {/* XP Bar */}
        <div className="w-full max-w-xs space-y-1">
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              {/* Sparkle effect */}
              {!reducedMotion && (
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/50"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              )}
            </motion.div>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">
              XP {profile.currentXP.toLocaleString()}
            </span>
            <span className="text-purple-600 font-medium">
              다음 레벨까지 {(profile.nextLevelXP - profile.currentXP).toLocaleString()} XP!
            </span>
          </div>
        </div>

        {/* Ranking */}
        {profile.ranking && (
          <motion.div
            initial={reducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full"
          >
            <span className="text-amber-600 font-bold">
              🏆 {profile.ranking.scope} {profile.ranking.position}위!
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Missions Card
// ─────────────────────────────────────────────────────────────────────────────

function MissionsCard({ 
  missions, 
  onComplete 
}: { 
  missions: Mission[];
  onComplete: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          🎯 오늘의 미션
        </h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
          {completedCount}/{missions.length}
        </span>
      </div>

      <div className="space-y-3">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative p-4 rounded-2xl border-2
              ${mission.isBonus 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300' 
                : mission.completed
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }
            `}
          >
            {/* Bonus Badge */}
            {mission.isBonus && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-400 text-white text-xs font-bold rounded-full">
                ⭐ BONUS
              </span>
            )}

            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => !mission.completed && onComplete(mission.id)}
                disabled={mission.completed}
                className={`
                  w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${mission.completed 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : 'border-slate-300 hover:border-purple-400'
                  }
                  min-w-[28px] min-h-[28px]
                `}
              >
                {mission.completed && (
                  <motion.span
                    initial={reducedMotion ? {} : { scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-sm"
                  >
                    ✓
                  </motion.span>
                )}
              </button>

              <div className="flex-1">
                <h3 className={`font-medium ${mission.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {mission.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{mission.description}</p>
                
                {/* Progress for bonus missions */}
                {mission.progress && !mission.completed && (
                  <div className="mt-2">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(mission.progress.current / mission.progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-600 mt-1">
                      {mission.progress.current}/{mission.progress.total}
                    </span>
                  </div>
                )}
              </div>

              {/* XP Reward */}
              <div className="text-right flex-shrink-0">
                <span className={`
                  font-bold text-lg
                  ${mission.completed ? 'text-slate-300' : 'text-purple-600'}
                `}>
                  +{mission.xpReward}
                </span>
                <span className="text-xs text-slate-400 block">XP</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges Card
// ─────────────────────────────────────────────────────────────────────────────

function BadgesCard({ badges }: { badges: Badge[] }) {
  const reducedMotion = useReducedMotion();
  const earnedCount = badges.filter(b => b.earned).length;

  const rarityStyles = {
    common: 'bg-slate-100 border-slate-300',
    rare: 'bg-blue-100 border-blue-400',
    epic: 'bg-purple-100 border-purple-400',
    legendary: 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-400',
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          🏅 내 뱃지
        </h2>
        <span className="text-sm text-slate-500">
          {earnedCount}/{badges.length} 획득
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative flex-shrink-0 w-20 h-24 rounded-2xl border-2 
              flex flex-col items-center justify-center gap-1 p-2
              ${badge.earned 
                ? rarityStyles[badge.rarity]
                : 'bg-slate-50 border-slate-200'
              }
            `}
          >
            <span 
              className={`
                text-3xl 
                ${badge.earned ? '' : 'grayscale opacity-30'}
              `}
            >
              {badge.icon}
            </span>
            <span 
              className={`
                text-xs font-medium text-center leading-tight
                ${badge.earned ? 'text-slate-700' : 'text-slate-400'}
              `}
            >
              {badge.name}
            </span>
            
            {/* New badge indicator */}
            {badge.earned && badge.earnedDate === '오늘' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full"
              >
                NEW
              </motion.span>
            )}

            {/* Lock icon for unearned */}
            {!badge.earned && (
              <span className="absolute bottom-1 text-slate-300">🔒</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Feedback Card
// ─────────────────────────────────────────────────────────────────────────────

function QuickFeedbackCard() {
  const [selected, setSelected] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const options = [
    { id: 'good', icon: '😊', label: '좋아요' },
    { id: 'ok', icon: '😐', label: '그냥' },
    { id: 'hard', icon: '😢', label: '힘들어요' },
    { id: 'question', icon: '❓', label: '질문있어요' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 shadow-lg">
      <h3 className="text-sm font-medium text-slate-600 mb-3 text-center">
        💬 선생님한테 할 말 있어?
      </h3>
      
      <div className="flex justify-center gap-3">
        {options.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => setSelected(option.id)}
            whileTap={reducedMotion ? {} : { scale: 0.9 }}
            className={`
              flex flex-col items-center gap-1 px-4 py-3 rounded-2xl
              transition-all min-w-[70px] min-h-[70px]
              ${selected === option.id 
                ? 'bg-purple-100 border-2 border-purple-400 scale-105' 
                : 'bg-slate-50 border-2 border-transparent hover:bg-purple-50'
              }
            `}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-xs font-medium text-slate-600">{option.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Confirmation */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 text-center"
          >
            <button
              className="px-6 py-2 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors min-h-[44px]"
              onClick={() => {
                // Handle feedback submission
                setSelected(null);
              }}
            >
              보내기! 📤
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentHome;
