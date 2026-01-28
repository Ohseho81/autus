/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Student Mission Page
 * 학생 미션/퀘스트 페이지 (게임화)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Mission {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'special' | 'achievement';
  xpReward: number;
  pointReward?: number;
  badgeReward?: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  claimed: boolean;
  expiresAt?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

type CategoryFilter = 'all' | 'daily' | 'weekly' | 'special' | 'achievement';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_MISSIONS: Mission[] = [
  // Daily Missions
  {
    id: 'd1',
    title: '📚 오늘 수업 참여하기',
    description: '오늘 예정된 수업에 모두 참석하세요',
    category: 'daily',
    xpReward: 100,
    pointReward: 50,
    progress: 1,
    maxProgress: 2,
    completed: false,
    claimed: false,
    expiresAt: '오늘 자정',
    difficulty: 'easy',
  },
  {
    id: 'd2',
    title: '📝 숙제 완료하기',
    description: '오늘 배운 내용의 숙제를 완료하세요',
    category: 'daily',
    xpReward: 150,
    pointReward: 75,
    progress: 0,
    maxProgress: 1,
    completed: false,
    claimed: false,
    expiresAt: '오늘 자정',
    difficulty: 'easy',
  },
  {
    id: 'd3',
    title: '❓ 질문 1개 하기',
    description: '수업 중 모르는 것을 질문하세요',
    category: 'daily',
    xpReward: 50,
    pointReward: 30,
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    expiresAt: '오늘 자정',
    difficulty: 'easy',
  },
  // Weekly Missions
  {
    id: 'w1',
    title: '🔥 5일 연속 출석',
    description: '이번 주 5일 연속으로 출석하세요',
    category: 'weekly',
    xpReward: 500,
    pointReward: 200,
    badgeReward: '출석왕',
    progress: 3,
    maxProgress: 5,
    completed: false,
    claimed: false,
    expiresAt: '일요일',
    difficulty: 'medium',
  },
  {
    id: 'w2',
    title: '📖 복습 3회 완료',
    description: '이번 주 복습을 3회 완료하세요',
    category: 'weekly',
    xpReward: 300,
    pointReward: 150,
    progress: 2,
    maxProgress: 3,
    completed: false,
    claimed: false,
    expiresAt: '일요일',
    difficulty: 'medium',
  },
  // Special Missions
  {
    id: 's1',
    title: '⭐ 시험 점수 10점 올리기',
    description: '다음 시험에서 10점 이상 향상하세요',
    category: 'special',
    xpReward: 1000,
    pointReward: 500,
    badgeReward: '성적 UP',
    progress: 0,
    maxProgress: 1,
    completed: false,
    claimed: false,
    difficulty: 'hard',
  },
  {
    id: 's2',
    title: '🎯 숙제 10회 연속 완료',
    description: '숙제를 10회 연속으로 완료하세요',
    category: 'special',
    xpReward: 800,
    pointReward: 400,
    badgeReward: '숙제왕',
    progress: 7,
    maxProgress: 10,
    completed: false,
    claimed: false,
    difficulty: 'hard',
  },
  // Achievement Missions
  {
    id: 'a1',
    title: '🏆 레벨 10 달성',
    description: '레벨 10에 도달하세요',
    category: 'achievement',
    xpReward: 2000,
    pointReward: 1000,
    badgeReward: '성장의 증거',
    progress: 8,
    maxProgress: 10,
    completed: false,
    claimed: false,
    difficulty: 'hard',
  },
  {
    id: 'a2',
    title: '💪 30일 연속 출석',
    description: '30일 연속으로 출석하세요',
    category: 'achievement',
    xpReward: 3000,
    pointReward: 1500,
    badgeReward: '철인',
    progress: 12,
    maxProgress: 30,
    completed: false,
    claimed: false,
    difficulty: 'hard',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mission Card Component
// ─────────────────────────────────────────────────────────────────────────────

function MissionCard({ 
  mission, 
  onClaim 
}: { 
  mission: Mission; 
  onClaim: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const progressPercent = (mission.progress / mission.maxProgress) * 100;
  
  const categoryColors = {
    daily: 'from-blue-500 to-cyan-500',
    weekly: 'from-purple-500 to-pink-500',
    special: 'from-amber-500 to-orange-500',
    achievement: 'from-emerald-500 to-teal-500',
  };
  
  const difficultyStars = {
    easy: '⭐',
    medium: '⭐⭐',
    hard: '⭐⭐⭐',
  };

  return (
    <motion.div
      className={`
        relative bg-white rounded-2xl overflow-hidden shadow-lg
        ${mission.completed && !mission.claimed ? 'ring-2 ring-green-400 ring-offset-2' : ''}
        ${mission.claimed ? 'opacity-60' : ''}
      `}
      initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: mission.claimed ? 0.6 : 1, y: 0 }}
      whileHover={reducedMotion || mission.claimed ? {} : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header Gradient */}
      <div className={`h-2 bg-gradient-to-r ${categoryColors[mission.category]}`} />
      
      <div className="p-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-lg">{mission.title}</h3>
          <span className="text-xs text-slate-400">{difficultyStars[mission.difficulty]}</span>
        </div>
        
        {/* Description */}
        <p className="text-sm text-slate-500 mb-3">{mission.description}</p>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>진행도</span>
            <span>{mission.progress}/{mission.maxProgress}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${categoryColors[mission.category]} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
        
        {/* Rewards */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            +{mission.xpReward} XP
          </span>
          {mission.pointReward && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              +{mission.pointReward}P
            </span>
          )}
          {mission.badgeReward && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              🏅 {mission.badgeReward}
            </span>
          )}
        </div>
        
        {/* Expiry / Action */}
        <div className="flex items-center justify-between">
          {mission.expiresAt && (
            <span className="text-xs text-slate-400">
              ⏰ {mission.expiresAt}까지
            </span>
          )}
          
          {mission.completed && !mission.claimed ? (
            <motion.button
              onClick={() => onClaim(mission.id)}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-bold text-sm shadow-lg"
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
            >
              🎁 보상 받기
            </motion.button>
          ) : mission.claimed ? (
            <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-full text-sm">
              ✅ 완료
            </span>
          ) : (
            <span className="px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
              도전 중...
            </span>
          )}
        </div>
      </div>
      
      {/* Completed Overlay */}
      {mission.claimed && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <span className="text-4xl">✅</span>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim Animation Modal
// ─────────────────────────────────────────────────────────────────────────────

function ClaimModal({ 
  mission, 
  onClose 
}: { 
  mission: Mission; 
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-1 shadow-2xl"
        initial={reducedMotion ? {} : { scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={reducedMotion ? {} : { scale: 0, rotate: 10 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-[22px] p-6 text-center">
          {/* Confetti Effect */}
          <motion.div
            className="text-6xl mb-4"
            animate={reducedMotion ? {} : { 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            🎉
          </motion.div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">미션 완료!</h2>
          <p className="text-slate-500 mb-6">{mission.title}</p>
          
          {/* Rewards */}
          <div className="space-y-2 mb-6">
            <motion.div
              className="px-4 py-3 bg-amber-100 rounded-xl"
              initial={reducedMotion ? {} : { x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-2xl font-bold text-amber-600">+{mission.xpReward} XP</span>
            </motion.div>
            
            {mission.pointReward && (
              <motion.div
                className="px-4 py-3 bg-green-100 rounded-xl"
                initial={reducedMotion ? {} : { x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-2xl font-bold text-green-600">+{mission.pointReward}P</span>
              </motion.div>
            )}
            
            {mission.badgeReward && (
              <motion.div
                className="px-4 py-3 bg-purple-100 rounded-xl"
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-2xl">🏅</span>
                <span className="text-lg font-bold text-purple-600 ml-2">{mission.badgeReward}</span>
              </motion.div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg"
          >
            확인
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentMissionPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS);
  const [claimingMission, setClaimingMission] = useState<Mission | null>(null);
  
  const filteredMissions = categoryFilter === 'all'
    ? missions
    : missions.filter(m => m.category === categoryFilter);
  
  const categories: { id: CategoryFilter; label: string; icon: string }[] = [
    { id: 'all', label: '전체', icon: '📋' },
    { id: 'daily', label: '일일', icon: '☀️' },
    { id: 'weekly', label: '주간', icon: '📅' },
    { id: 'special', label: '특별', icon: '⭐' },
    { id: 'achievement', label: '업적', icon: '🏆' },
  ];
  
  const handleClaim = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      setClaimingMission(mission);
    }
  };
  
  const handleClaimComplete = () => {
    if (claimingMission) {
      setMissions(prev => prev.map(m => 
        m.id === claimingMission.id ? { ...m, claimed: true } : m
      ));
      setClaimingMission(null);
    }
  };
  
  // Stats
  const completedCount = missions.filter(m => m.completed).length;
  const claimedCount = missions.filter(m => m.claimed).length;
  const pendingRewards = missions.filter(m => m.completed && !m.claimed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pb-24">
      {/* Header */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-white mb-2">🎯 미션 센터</h1>
        <p className="text-white/80 text-sm">미션을 완료하고 보상을 받으세요!</p>
        
        {/* Stats Bar */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{completedCount}</div>
            <div className="text-xs text-white/70">완료</div>
          </div>
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{missions.length - completedCount}</div>
            <div className="text-xs text-white/70">진행중</div>
          </div>
          {pendingRewards > 0 && (
            <div className="flex-1 bg-amber-400/80 backdrop-blur-sm rounded-xl p-3 text-center animate-pulse">
              <div className="text-2xl font-bold text-white">{pendingRewards}</div>
              <div className="text-xs text-white/90">보상 대기</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                transition-all font-medium text-sm
                ${categoryFilter === cat.id
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Mission List */}
      <div className="px-4 space-y-4">
        {filteredMissions.map(mission => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onClaim={handleClaim}
          />
        ))}
        
        {filteredMissions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-white/80">해당 카테고리의 미션이 없습니다</div>
          </div>
        )}
      </div>
      
      {/* Daily Login Bonus Banner */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div>
              <div className="font-bold">일일 로그인 보너스!</div>
              <div className="text-sm text-white/80">매일 접속하면 추가 보상!</div>
            </div>
            <button className="ml-auto px-4 py-2 bg-white/20 rounded-full text-sm font-bold">
              받기
            </button>
          </div>
        </div>
      </div>
      
      {/* Claim Modal */}
      <AnimatePresence>
        {claimingMission && (
          <ClaimModal
            mission={claimingMission}
            onClose={handleClaimComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentMissionPage;
