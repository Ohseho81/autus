'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, TrendingUp, Zap, Shield,
  DollarSign, Users, Bell, ArrowUp, ArrowDown, Clock,
  Target, Award, BarChart3, Network, Sparkles
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface RiskItem {
  id: string;
  name: string;
  score: number;
  reason: string;
  status: 'critical' | 'high' | 'medium' | 'low';
  sla: number;
}

interface RewardCard {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'achievement' | 'insight';
  icon: string;
}

// ============================================
// Mock Data
// ============================================

const mockRisks: RiskItem[] = [
  { id: '1', name: '김철수', score: 82, reason: '퇴원 위험 - 3주 연속 출석률 저하', status: 'critical', sla: 2 },
  { id: '2', name: '박영희', score: 65, reason: '미납금 3일 경과', status: 'high', sla: 4 },
  { id: '3', name: '이민수', score: 45, reason: '숙제 미제출 5회', status: 'medium', sla: 12 },
];

const mockCards: RewardCard[] = [
  { id: '1', title: '현금흐름 개선', description: '이번 달 미납금 회수율 15% 향상 기회', type: 'opportunity', icon: '💰' },
  { id: '2', title: '우수 학생 발견', description: '정수현 학생 성적 급상승 (상위 5%)', type: 'achievement', icon: '⭐' },
];

// ============================================
// Components
// ============================================

const HUDBar: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black text-cyan-400 tracking-tight">AUTUS LIVE</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Real-time Dashboard</p>
          </div>
        </div>

        {/* HUD Items - Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase">Mode</p>
            <p className="text-sm font-bold text-cyan-400">ASSISTED</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase">Confidence</p>
            <p className="text-sm font-bold text-green-400">88%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase">Safety</p>
            <p className="text-sm font-bold text-green-400">NOMINAL</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase">Data</p>
            <p className="text-sm font-bold text-white">LIVE</p>
          </div>
        </div>

        {/* Mobile HUD */}
        <div className="lg:hidden flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-gray-500">CONF</p>
            <p className="text-xs font-bold text-green-400">88%</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        {/* Time */}
        <div className="hidden md:block text-right">
          <p className="text-xs text-gray-500">{time.toLocaleDateString('ko-KR')}</p>
          <p className="text-sm font-mono font-bold text-white">
            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

const VSpiralPanel: React.FC = () => {
  const [vScore, setVScore] = useState(87.5);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('up');

  // Simulate V score changes
  useEffect(() => {
    const interval = setInterval(() => {
      setVScore(prev => {
        const change = (Math.random() - 0.5) * 2;
        const newScore = Math.max(0, Math.min(100, prev + change));
        setTrend(change > 0.3 ? 'up' : change < -0.3 ? 'down' : 'stable');
        return newScore;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base lg:text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          V Score 실시간
        </h2>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trend === 'up' && <ArrowUp className="w-4 h-4" />}
          {trend === 'down' && <ArrowDown className="w-4 h-4" />}
          {trend === 'stable' && <span>—</span>}
          {trend === 'up' ? '+0.3%' : trend === 'down' ? '-0.2%' : '0%'}
        </div>
      </div>

      {/* V Spiral Visualization */}
      <div className="flex-1 relative bg-black/30 rounded-xl border border-white/5 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Central V Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Animated Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute w-48 h-48 lg:w-64 lg:h-64 border border-cyan-500/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute w-56 h-56 lg:w-72 lg:h-72 border border-purple-500/20 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3.4, repeat: Infinity }}
            className="absolute w-40 h-40 lg:w-52 lg:h-52 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-xl"
          />

          {/* V Score Number */}
          <motion.div
            key={vScore.toFixed(1)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center z-10"
          >
            <p className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {vScore.toFixed(1)}
            </p>
            <p className="text-xs lg:text-sm text-gray-400 mt-2">V = (M-T) × (1+s)^t</p>
          </motion.div>

          {/* Status Ring */}
          <div className="absolute w-32 h-32 lg:w-44 lg:h-44">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${vScore * 2.83} 283`}
                initial={{ strokeDasharray: '0 283' }}
                animate={{ strokeDasharray: `${vScore * 2.83} 283` }}
                transition={{ duration: 1 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f5ff" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between">
          <div className="text-center">
            <p className="text-[10px] text-gray-500">M (수익)</p>
            <p className="text-sm font-bold text-cyan-400">₩127.5M</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500">T (비용)</p>
            <p className="text-sm font-bold text-orange-400">₩98.2M</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500">s (재등록)</p>
            <p className="text-sm font-bold text-green-400">89.2%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskQueuePanel: React.FC<{ risks: RiskItem[] }> = ({ risks }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'high': return 'bg-orange-900/30 border-orange-500/50 text-orange-400';
      case 'medium': return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400';
      default: return 'bg-green-900/30 border-green-500/50 text-green-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          위험 큐
        </h3>
        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
          {risks.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {risks.map((risk, idx) => (
          <motion.div
            key={risk.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${getStatusColor(risk.status)}`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs lg:text-sm font-bold text-white">{risk.name}</span>
              <span className="text-xs font-mono font-semibold">{risk.score}</span>
            </div>
            <p className="text-[10px] lg:text-xs opacity-70 line-clamp-1">{risk.reason}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {risk.sla}h SLA
              </span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-current"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const RewardCardsPanel: React.FC<{ cards: RewardCard[] }> = ({ cards }) => {
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-cyan-900/30 border-cyan-500/50';
      case 'achievement': return 'bg-purple-900/30 border-purple-500/50';
      case 'insight': return 'bg-green-900/30 border-green-500/50';
      default: return 'bg-gray-900/30 border-gray-500/50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          오늘의 카드
        </h3>
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            whileHover={{ scale: 1.02 }}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${getTypeStyle(card.type)}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{card.icon}</span>
              <div>
                <p className="text-xs lg:text-sm font-bold text-white">{card.title}</p>
                <p className="text-[10px] lg:text-xs text-gray-400 mt-1">{card.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const NetworkFlowPanel: React.FC = () => {
  // Simulated network nodes
  const nodes = [
    { id: 1, x: 20, y: 30, label: 'Owner', color: '#00f5ff' },
    { id: 2, x: 50, y: 20, label: 'Principal', color: '#a855f7' },
    { id: 3, x: 80, y: 40, label: 'Teacher', color: '#22c55e' },
    { id: 4, x: 30, y: 70, label: 'Admin', color: '#f59e0b' },
    { id: 5, x: 70, y: 75, label: 'Parent', color: '#ec4899' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base lg:text-lg font-bold flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-400" />
          집단 지성 흐름
        </h2>
        <span className="text-xs text-gray-500">실시간 연결</span>
      </div>

      <div className="flex-1 relative bg-black/30 rounded-xl border border-white/5 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <svg width="100%" height="100%" className="opacity-20">
            {/* Connection lines */}
            {nodes.map((node, i) =>
              nodes.slice(i + 1).map((target, j) => (
                <motion.line
                  key={`${node.id}-${target.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke="url(#lineGradient)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: (i + j) * 0.2 }}
                />
              ))
            )}
            <defs>
              <linearGradient id="lineGradient">
                <stop offset="0%" stopColor="#00f5ff" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Nodes */}
        {nodes.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.2, type: 'spring' }}
            className="absolute flex flex-col items-center"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${node.color}30`, border: `2px solid ${node.color}` }}
            >
              <Users className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: node.color }} />
            </motion.div>
            <span className="text-[10px] lg:text-xs font-semibold text-white mt-1">{node.label}</span>
          </motion.div>
        ))}

        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              5 Roles Connected
            </p>
            <p className="text-xs text-gray-500 mt-1">합의 기반 자동 운영</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function LiveDashboard() {
  return (
    <div className="w-full min-h-screen bg-[#05050a] text-white">
      {/* HUD Bar */}
      <HUDBar />

      {/* Main Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-3 lg:p-6 pt-20 lg:pt-24 pb-8">
        {/* V Score Spiral - col-span-8 on desktop */}
        <div className="lg:col-span-8 bg-[#0a0a0f] border border-white/10 rounded-2xl p-4 lg:p-6 min-h-[400px] lg:min-h-[500px]">
          <VSpiralPanel />
        </div>

        {/* Right Side Panels - col-span-4 on desktop */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6">
          {/* Risk Queue */}
          <div className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-2xl p-4 lg:p-6 min-h-[200px]">
            <RiskQueuePanel risks={mockRisks} />
          </div>

          {/* Reward Cards */}
          <div className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-2xl p-4 lg:p-6 min-h-[200px]">
            <RewardCardsPanel cards={mockCards} />
          </div>
        </div>

        {/* Network Flow - Full Width */}
        <div className="col-span-1 lg:col-span-12 bg-[#0a0a0f] border border-white/10 rounded-2xl p-4 lg:p-6 min-h-[300px] lg:min-h-[350px]">
          <NetworkFlowPanel />
        </div>
      </div>
    </div>
  );
}
