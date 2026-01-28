/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💓 맥박 뷰 (Pulse View) - AUTUS 2.0
 * 조류 + 심전도 통합
 * "외부/내부 신호는?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Radio, TrendingUp, TrendingDown, Minus, Zap, BarChart3 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Keyword {
  word: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface Resonance {
  id: string;
  externalKeyword: string;
  internalKeyword: string;
  correlation: number;
  affectedCount: number;
}

interface TrendData {
  market: { trend: string; change: number };
  ours: { trend: string; change: number };
}

interface PulseData {
  external: Keyword[];
  internal: Keyword[];
  resonances: Resonance[];
  trend: TrendData;
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: PulseData = {
  external: [
    { word: '사교육비', count: 45, trend: 'up', change: 12 },
    { word: '학원비', count: 32, trend: 'stable', change: 0 },
    { word: '영어학원', count: 28, trend: 'stable', change: 0 },
    { word: '수학학원', count: 24, trend: 'down', change: -5 },
  ],
  internal: [
    { word: '비용', count: 8, trend: 'up', change: 3 },
    { word: '성적', count: 5, trend: 'stable', change: 0 },
    { word: '숙제', count: 3, trend: 'down', change: -2 },
    { word: '수업', count: 2, trend: 'stable', change: 0 },
  ],
  resonances: [
    { id: 'r1', externalKeyword: '사교육비', internalKeyword: '비용', correlation: 0.85, affectedCount: 8 },
  ],
  trend: {
    market: { trend: '썰물', change: -5.2 },
    ours: { trend: '역류', change: 8.3 },
  },
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const ECGWave: React.FC = () => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 2) % 400);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-20 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,40 L50,40 L60,15 L70,65 L80,40 L150,40 L160,10 L170,70 L180,40 L250,40 L260,20 L270,60 L280,40 L400,40`}
          fill="none"
          stroke="url(#ecgGrad)"
          strokeWidth="2"
          transform={`translate(${-offset}, 0)`}
        />
        <path
          d={`M400,40 L450,40 L460,15 L470,65 L480,40 L550,40 L560,10 L570,70 L580,40 L650,40 L660,20 L670,60 L680,40 L800,40`}
          fill="none"
          stroke="url(#ecgGrad)"
          strokeWidth="2"
          transform={`translate(${-offset}, 0)`}
        />
      </svg>
      <div className="absolute top-2 left-3 flex items-center gap-2 text-red-400">
        <Heart size={12} className="animate-pulse" />
        <span className="text-[10px]">실시간 모니터링</span>
      </div>
    </div>
  );
};

const KeywordList: React.FC<{ 
  title: string; 
  icon: React.ReactNode;
  keywords: Keyword[]; 
  color: string;
  onKeywordClick: (keyword: string) => void;
}> = ({ title, icon, keywords, color, onKeywordClick }) => (
  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-xs font-medium">{title}</span>
    </div>
    <div className="space-y-2">
      {keywords.map((kw) => (
        <motion.div
          key={kw.word}
          whileHover={{ x: 4 }}
          onClick={() => onKeywordClick(kw.word)}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-700/30 cursor-pointer"
        >
          <span className="text-sm">{kw.word}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{kw.count}건</span>
            {kw.trend === 'up' && (
              <span className="flex items-center text-red-400 text-xs">
                <TrendingUp size={12} /> +{kw.change}
              </span>
            )}
            {kw.trend === 'down' && (
              <span className="flex items-center text-emerald-400 text-xs">
                <TrendingDown size={12} /> {kw.change}
              </span>
            )}
            {kw.trend === 'stable' && (
              <span className="flex items-center text-slate-500 text-xs">
                <Minus size={12} /> 0
              </span>
            )}
          </div>
        </motion.div>
      ))}
      <button className="w-full text-center text-[10px] text-slate-400 hover:text-white py-1">
        더보기
      </button>
    </div>
  </div>
);

const ResonanceAlert: React.FC<{ 
  resonance: Resonance; 
  onViewCustomers: () => void;
  onCreateAction: () => void;
}> = ({ resonance, onViewCustomers, onCreateAction }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="p-4 bg-red-500/10 rounded-xl border border-red-500/30"
  >
    <div className="flex items-center gap-2 mb-2">
      <Zap className="text-red-400 animate-pulse" size={16} />
      <span className="text-sm font-bold text-red-400">공명 감지!</span>
    </div>
    <div className="text-sm mb-2">
      외부 "<span className="text-purple-400">{resonance.externalKeyword}</span>" 
      ←→ 
      내부 "<span className="text-blue-400">{resonance.internalKeyword}</span>"
    </div>
    <div className="text-xs text-slate-400 mb-3">
      상관계수: {resonance.correlation.toFixed(2)} | 영향 고객: {resonance.affectedCount}명
    </div>
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onViewCustomers}
        className="text-[10px] px-3 py-1.5 rounded bg-slate-700/50 hover:bg-slate-600/50"
      >
        영향 고객 보기
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCreateAction}
        className="text-[10px] px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
      >
        대응 전략
      </motion.button>
    </div>
  </motion.div>
);

const TrendComparison: React.FC<{ trend: TrendData }> = ({ trend }) => (
  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="flex items-center gap-2 mb-3">
      <BarChart3 className="text-blue-400" size={14} />
      <span className="text-xs font-medium">트렌드 비교</span>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="text-2xl mb-1">🌊</div>
        <div className="text-lg font-bold text-red-400">{trend.market.trend}</div>
        <div className="text-xs text-slate-400">시장</div>
        <div className="text-sm text-red-400">{trend.market.change}%</div>
      </div>
      <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
        <div className="text-2xl mb-1">🚀</div>
        <div className="text-lg font-bold text-emerald-400">{trend.ours.trend}</div>
        <div className="text-xs text-slate-400">우리</div>
        <div className="text-sm text-emerald-400">+{trend.ours.change}%</div>
      </div>
    </div>
    <button className="w-full mt-3 text-center text-[10px] text-blue-400 hover:text-blue-300 py-1">
      상세 분석
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface PulseViewProps {
  keyword?: string;
  onNavigate?: (view: string, params?: any) => void;
}

export function PulseView({ keyword, onNavigate = () => {} }: PulseViewProps) {
  const [data] = useState<PulseData>(MOCK_DATA);

  const handleKeywordClick = (kw: string) => {
    console.log('Keyword clicked:', kw);
    // TODO: Show keyword detail modal
  };

  const handleViewCustomers = (resonanceId: string) => {
    onNavigate('microscope', { resonanceId, filter: 'resonance' });
  };

  const handleCreateAction = () => {
    onNavigate('actions', { create: true, source: 'resonance' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Heart size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">맥박</div>
            <div className="text-[10px] text-slate-500">외부 여론 + 내부 Voice</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs">실시간</span>
        </div>
      </div>

      {/* ECG Wave */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ECGWave />
      </motion.div>

      {/* Keywords Grid */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <KeywordList
            title="외부 여론 (External)"
            icon={<Radio className="text-purple-400" size={14} />}
            keywords={data.external}
            color="purple"
            onKeywordClick={handleKeywordClick}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <KeywordList
            title="내부 Voice (Internal)"
            icon={<Heart className="text-blue-400" size={14} />}
            keywords={data.internal}
            color="blue"
            onKeywordClick={handleKeywordClick}
          />
        </motion.div>
      </div>

      {/* Resonance Alert */}
      {data.resonances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          {data.resonances.map((resonance) => (
            <ResonanceAlert
              key={resonance.id}
              resonance={resonance}
              onViewCustomers={() => handleViewCustomers(resonance.id)}
              onCreateAction={handleCreateAction}
            />
          ))}
        </motion.div>
      )}

      {/* Trend Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4"
      >
        <TrendComparison trend={data.trend} />
      </motion.div>
    </div>
  );
}

export default PulseView;
