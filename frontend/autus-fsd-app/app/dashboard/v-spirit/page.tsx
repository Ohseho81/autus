'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, TrendingUp, Clock, Heart, Star, Award,
  ArrowUp, ChevronRight, Gift, Users, Zap, Activity
} from 'lucide-react';
import Link from 'next/link';
import {
  VLevel,
  generateEmotionalMessage,
  getProgressToNextLevel,
  LEVEL_VISUALS,
  calculateRetroPGF,
} from '@/lib/v-formula';

// ============================================
// Types
// ============================================

interface VData {
  total: number;
  level: VLevel;
  change: number;
  streak: number;
  recentActions: RecentAction[];
  rewards: number;
}

interface RecentAction {
  id: string;
  role: string;
  action: string;
  vImpact: number;
  timestamp: Date;
  emoji: string;
}

// ============================================
// Mock Data (실제로는 Supabase에서 가져옴)
// ============================================

const MOCK_V_DATA: VData = {
  total: 65,
  level: 'gold',
  change: 5.2,
  streak: 12,
  recentActions: [
    { id: '1', role: 'teacher', action: '학생 피드백 작성', vImpact: 2.3, timestamp: new Date(Date.now() - 20 * 60 * 1000), emoji: '📝' },
    { id: '2', role: 'principal', action: '위험 학생 상담', vImpact: 5.1, timestamp: new Date(Date.now() - 35 * 60 * 1000), emoji: '💬' },
    { id: '3', role: 'admin', action: '수납 데이터 정리', vImpact: 1.5, timestamp: new Date(Date.now() - 60 * 60 * 1000), emoji: '📊' },
    { id: '4', role: 'owner', action: '마케팅 전략 결정', vImpact: 8.2, timestamp: new Date(Date.now() - 120 * 60 * 1000), emoji: '🎯' },
  ],
  rewards: 245,
};

// ============================================
// Components
// ============================================

const VSpiral: React.FC<{ score: number; level: VLevel }> = ({ score, level }) => {
  const levelVisual = LEVEL_VISUALS[level];
  
  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* 외곽 나선 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${levelVisual.gradient} opacity-20`}
      />
      
      {/* 중간 나선 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className={`absolute inset-4 rounded-full bg-gradient-to-l ${levelVisual.gradient} opacity-30`}
      />
      
      {/* 내부 코어 */}
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 20px rgba(0,245,255,0.3)',
            '0 0 40px rgba(0,245,255,0.5)',
            '0 0 20px rgba(0,245,255,0.3)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute inset-8 rounded-full bg-gradient-to-br ${levelVisual.gradient} flex items-center justify-center ${levelVisual.glow}`}
      >
        <div className="text-center">
          <span className="text-4xl">{levelVisual.badge}</span>
        </div>
      </motion.div>
      
      {/* 파티클 효과 */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/50"
          style={{
            top: '50%',
            left: '50%',
          }}
          animate={{
            x: [0, Math.cos((i * 45 * Math.PI) / 180) * 100],
            y: [0, Math.sin((i * 45 * Math.PI) / 180) * 100],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

const ProgressRing: React.FC<{ progress: number; level: VLevel }> = ({ progress, level }) => {
  const levelVisual = LEVEL_VISUALS[level];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <svg className="w-full h-full" viewBox="0 0 100 100">
      {/* 배경 링 */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-gray-800"
      />
      {/* 진행 링 */}
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f5ff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const ActionTimeline: React.FC<{ actions: RecentAction[] }> = ({ actions }) => {
  const formatTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="space-y-3">
      {actions.map((action, idx) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-cyan-500/30 transition-colors"
        >
          <span className="text-2xl">{action.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{action.action}</p>
            <p className="text-xs text-gray-400">{formatTime(action.timestamp)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-400">+{action.vImpact.toFixed(1)}</p>
            <p className="text-xs text-gray-500">V</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function VSpiritDashboard() {
  const [vData, setVData] = useState<VData>(MOCK_V_DATA);
  const [userRole, setUserRole] = useState('owner');
  
  const emotionalMessage = generateEmotionalMessage(vData.total, userRole);
  const progressInfo = getProgressToNextLevel(vData.total);
  const levelVisual = LEVEL_VISUALS[vData.level];

  return (
    <div className="min-h-screen bg-[#05050a] text-white overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-cyan-500/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/10 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← 대시보드
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-bold">V Spirit</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400">{vData.rewards}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* V 나선 + 감성 메시지 */}
          <section className="text-center">
            <VSpiral score={vData.total} level={vData.level} />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <p className={`text-4xl mb-2 ${emotionalMessage.color}`}>{emotionalMessage.emoji}</p>
              <h1 className="text-2xl lg:text-3xl font-black mb-3">{emotionalMessage.title}</h1>
              <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                {emotionalMessage.message}
              </p>
              <p className="text-cyan-400 text-sm mt-4 italic">
                "{emotionalMessage.encouragement}"
              </p>
            </motion.div>
          </section>

          {/* 레벨 진행도 */}
          <section className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">레벨 진행도</span>
              </div>
              <span className="text-sm text-gray-400">
                {progressInfo.nextLevel 
                  ? `${progressInfo.nextLevel.toUpperCase()}까지 ${progressInfo.remaining.toFixed(1)} V`
                  : '최고 레벨 달성!'
                }
              </span>
            </div>
            
            <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${levelVisual.progressColor} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progressInfo.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                {LEVEL_VISUALS[progressInfo.currentLevel].badge}
                {progressInfo.currentLevel.toUpperCase()}
              </span>
              {progressInfo.nextLevel && (
                <span className="flex items-center gap-1">
                  {LEVEL_VISUALS[progressInfo.nextLevel].badge}
                  {progressInfo.nextLevel.toUpperCase()}
                </span>
              )}
            </div>
          </section>

          {/* 통계 그리드 */}
          <section className="grid grid-cols-3 gap-3 lg:gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/30 rounded-2xl p-4 text-center"
            >
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-black text-green-400">
                {vData.change > 0 ? '+' : ''}{vData.change.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400">이번 주 변화</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-500/30 rounded-2xl p-4 text-center"
            >
              <Zap className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-black text-purple-400">{vData.streak}</p>
              <p className="text-xs text-gray-400">연속 활동일</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border border-yellow-500/30 rounded-2xl p-4 text-center"
            >
              <Gift className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-black text-yellow-400">{vData.rewards}</p>
              <p className="text-xs text-gray-400">RetroPGF</p>
            </motion.div>
          </section>

          {/* 최근 기여 타임라인 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold">최근 기여</span>
              </div>
              <span className="text-xs text-gray-400">{vData.recentActions.length}개의 행동</span>
            </div>
            
            <ActionTimeline actions={vData.recentActions} />
          </section>

          {/* 보상 센터 */}
          <section className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">보상 센터</span>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1">
                확인하기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm">
              당신의 기여가 <span className="text-yellow-400 font-bold">{vData.rewards} RetroPGF 토큰</span>으로 
              누적되었습니다. 이 토큰은 분기별 보상 분배에 사용됩니다.
            </p>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">이번 달 예상</p>
                <p className="text-lg font-bold text-cyan-400">+42 토큰</p>
              </div>
              <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">순위</p>
                <p className="text-lg font-bold text-yellow-400">상위 15%</p>
              </div>
            </div>
          </section>

          {/* Footer Message */}
          <footer className="text-center py-8">
            <p className="text-gray-500 text-sm">
              숫자는 보이지 않지만, 당신의 가치는 계속 기록되고 있습니다.
            </p>
            <p className="text-cyan-400/50 text-xs mt-2">
              Powered by AUTUS V Engine
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
