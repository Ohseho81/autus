/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Student Ranking Page
 * 학생 랭킹 페이지 (동기부여 중심)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RankingEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  avatar: string;
  isMe: boolean;
  change: number; // +/- rank change from last week
}

interface MyStats {
  currentRank: number;
  totalParticipants: number;
  bestRank: number;
  weeksInTop3: number;
  xpThisWeek: number;
  xpToNextRank: number;
}

type RankingCategory = 'xp' | 'attendance' | 'homework' | 'questions';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const RANKING_DATA: RankingEntry[] = [
  { rank: 1, name: '오지훈', xp: 12500, level: 15, avatar: '🦊', isMe: false, change: 0 },
  { rank: 2, name: '신미래', xp: 11800, level: 14, avatar: '🐰', isMe: false, change: 2 },
  { rank: 3, name: '박준호', xp: 11200, level: 14, avatar: '🐻', isMe: false, change: -1 },
  { rank: 4, name: '김민수', xp: 10500, level: 13, avatar: '🐼', isMe: true, change: 1 },
  { rank: 5, name: '최유진', xp: 9800, level: 12, avatar: '🐨', isMe: false, change: -2 },
  { rank: 6, name: '이서연', xp: 9200, level: 12, avatar: '🦁', isMe: false, change: 0 },
  { rank: 7, name: '강예은', xp: 8700, level: 11, avatar: '🐯', isMe: false, change: 3 },
  { rank: 8, name: '정하늘', xp: 8100, level: 11, avatar: '🐸', isMe: false, change: -1 },
  { rank: 9, name: '윤서준', xp: 7500, level: 10, avatar: '🐵', isMe: false, change: 0 },
  { rank: 10, name: '임하은', xp: 7000, level: 10, avatar: '🐱', isMe: false, change: 2 },
];

const MY_STATS: MyStats = {
  currentRank: 4,
  totalParticipants: 32,
  bestRank: 2,
  weeksInTop3: 5,
  xpThisWeek: 850,
  xpToNextRank: 700,
};

// ─────────────────────────────────────────────────────────────────────────────
// Podium Component (Top 3)
// ─────────────────────────────────────────────────────────────────────────────

function Podium({ entries }: { entries: RankingEntry[] }) {
  const reducedMotion = useReducedMotion();
  const top3 = entries.slice(0, 3);
  const [first, second, third] = [top3[0], top3[1], top3[2]];

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [second, first, third];
  const heights = ['h-20', 'h-28', 'h-16'];
  const medals = ['🥈', '🥇', '🥉'];
  const delays = [0.2, 0, 0.3];

  return (
    <div className="flex items-end justify-center gap-2 px-4 py-6">
      {podiumOrder.map((entry, idx) => (
        <motion.div
          key={entry?.rank}
          className="flex-1 max-w-24"
          initial={reducedMotion ? {} : { y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delays[idx], duration: 0.5 }}
        >
          {/* Avatar */}
          <div className="text-center mb-2">
            <motion.div 
              className="text-4xl"
              animate={reducedMotion || idx !== 1 ? {} : { 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {entry?.avatar}
            </motion.div>
            <div className="text-sm font-bold text-white truncate">{entry?.name}</div>
            <div className="text-xs text-white/70">Lv.{entry?.level}</div>
          </div>
          
          {/* Podium */}
          <motion.div
            className={`
              ${heights[idx]} rounded-t-xl flex flex-col items-center justify-start pt-2
              ${idx === 1 ? 'bg-amber-400' : idx === 0 ? 'bg-slate-300' : 'bg-amber-600'}
            `}
            initial={reducedMotion ? {} : { height: 0 }}
            animate={{ height: 'auto' }}
            transition={{ delay: delays[idx] + 0.2, duration: 0.3 }}
          >
            <span className="text-2xl">{medals[idx]}</span>
            <span className="text-xs font-bold text-white/80 mt-1">
              {entry?.xp?.toLocaleString()} XP
            </span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking Row Component
// ─────────────────────────────────────────────────────────────────────────────

function RankingRow({ entry, index }: { entry: RankingEntry; index: number }) {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className={`
        flex items-center gap-3 p-3 rounded-xl
        ${entry.isMe ? 'bg-purple-100 border-2 border-purple-400' : 'bg-white'}
      `}
      initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Rank */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
        ${entry.rank <= 3 ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-600'}
      `}>
        {entry.rank}
      </div>
      
      {/* Avatar & Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-2xl">{entry.avatar}</span>
        <div className="min-w-0">
          <div className={`font-medium truncate ${entry.isMe ? 'text-purple-700' : 'text-slate-700'}`}>
            {entry.name} {entry.isMe && '(나)'}
          </div>
          <div className="text-xs text-slate-500">Lv.{entry.level}</div>
        </div>
      </div>
      
      {/* XP */}
      <div className="text-right">
        <div className="font-bold text-slate-700">{entry.xp.toLocaleString()}</div>
        <div className="text-xs text-slate-500">XP</div>
      </div>
      
      {/* Change Indicator */}
      <div className={`
        text-sm w-8 text-center
        ${entry.change > 0 ? 'text-green-500' : entry.change < 0 ? 'text-red-500' : 'text-slate-400'}
      `}>
        {entry.change > 0 ? `↑${entry.change}` : entry.change < 0 ? `↓${Math.abs(entry.change)}` : '-'}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Stats Card
// ─────────────────────────────────────────────────────────────────────────────

function MyStatsCard({ stats }: { stats: MyStats }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg">
      <h3 className="font-bold text-slate-700 mb-3">📊 내 기록</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.currentRank}위
          </div>
          <div className="text-xs text-slate-500">현재 순위</div>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-amber-600">
            {stats.bestRank}위
          </div>
          <div className="text-xs text-slate-500">최고 순위</div>
        </div>
        <div className="p-3 bg-green-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.weeksInTop3}주
          </div>
          <div className="text-xs text-slate-500">TOP3 유지</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-600">
            +{stats.xpThisWeek}
          </div>
          <div className="text-xs text-slate-500">이번 주 XP</div>
        </div>
      </div>
      
      {/* Next Rank Progress */}
      <div className="mt-4 p-3 bg-slate-50 rounded-xl">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">다음 순위까지</span>
          <span className="font-medium text-purple-600">{stats.xpToNextRank} XP</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '65%' }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-1 text-right">
          조금만 더 하면 3위! 💪
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentRankingPage() {
  const [category, setCategory] = useState<RankingCategory>('xp');
  
  const categories: { id: RankingCategory; label: string; icon: string }[] = [
    { id: 'xp', label: '총 XP', icon: '⭐' },
    { id: 'attendance', label: '출석왕', icon: '📚' },
    { id: 'homework', label: '숙제왕', icon: '📝' },
    { id: 'questions', label: '질문왕', icon: '❓' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 pb-24">
      {/* Header */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-white mb-1">🏆 랭킹</h1>
        <p className="text-white/80 text-sm">이번 주 순위를 확인하세요!</p>
      </div>
      
      {/* Category Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                transition-all font-medium text-sm
                ${category === cat.id
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
      
      {/* Podium (Top 3) */}
      <Podium entries={RANKING_DATA} />
      
      {/* Full Ranking List */}
      <div className="mx-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">전체 순위</h2>
          <span className="text-sm text-white/70">총 {MY_STATS.totalParticipants}명</span>
        </div>
        
        <div className="space-y-2">
          {RANKING_DATA.map((entry, idx) => (
            <RankingRow key={entry.rank} entry={entry} index={idx} />
          ))}
        </div>
        
        {/* Load More */}
        <button className="w-full mt-4 py-2 bg-white/20 text-white rounded-xl text-sm font-medium">
          더 보기
        </button>
      </div>
      
      {/* My Stats */}
      <div className="px-4">
        <MyStatsCard stats={MY_STATS} />
      </div>
      
      {/* Encouragement Banner */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <div className="font-bold">조금만 더 힘내!</div>
              <div className="text-sm text-white/90">
                700 XP만 더 모으면 TOP 3 진입!
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Reset Notice */}
      <div className="text-center text-white/60 text-xs mt-4 px-4">
        ⏰ 매주 월요일 00:00에 주간 랭킹이 초기화됩니다
      </div>
    </div>
  );
}

export default StudentRankingPage;
