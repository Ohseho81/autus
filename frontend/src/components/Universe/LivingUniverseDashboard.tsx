/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌌 AUTUS Living Universe Dashboard v3.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "텅 빈 플랫폼"이 아닌 "이미 살아있는 우주"를 연출
 * 에너지 소비: 0 (물리법칙 기반 계산만)
 *
 * "5%의 완벽한 틀이 100%의 살아있는 우주를 만든다"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 상수 & 유틸
// ============================================

const GLOBAL_POPULATION = 8_000_000_000;

const REGIONS = [
  { id: 'asia', name: '아시아', flag: '🌏', population: 4700000000, color: '#FF6B6B' },
  { id: 'europe', name: '유럽', flag: '🌍', population: 750000000, color: '#4ECDC4' },
  { id: 'namerica', name: '북미', flag: '🌎', population: 580000000, color: '#45B7D1' },
  { id: 'samerica', name: '남미', flag: '🌎', population: 430000000, color: '#96CEB4' },
  { id: 'africa', name: '아프리카', flag: '🌍', population: 1400000000, color: '#FFEAA7' },
  { id: 'oceania', name: '오세아니아', flag: '🌏', population: 45000000, color: '#DDA0DD' },
];

const ARCHETYPES = [
  { id: 'A01', name: '창업가', emoji: '🚀', ratio: 0.02 },
  { id: 'A02', name: '직장인', emoji: '💼', ratio: 0.45 },
  { id: 'A03', name: '학생', emoji: '📚', ratio: 0.15 },
  { id: 'A04', name: '프리랜서', emoji: '🎨', ratio: 0.08 },
  { id: 'A05', name: '은퇴자', emoji: '🌅', ratio: 0.12 },
  { id: 'A06', name: '창작자', emoji: '✨', ratio: 0.05 },
  { id: 'A07', name: '투자자', emoji: '📈', ratio: 0.03 },
  { id: 'A08', name: '소상공인', emoji: '🏪', ratio: 0.06 },
  { id: 'A09', name: '구직자', emoji: '🔍', ratio: 0.04 },
  { id: 'A10', name: '양육자', emoji: '👨‍👩‍👧', ratio: 0.20 },
];

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};

// ============================================
// 시뮬레이터 훅
// ============================================

interface SimulatorState {
  totalSynced: number;
  activeNow: number;
  resonance: number;
  syncPerSecond: number;
}

const useGlobalSimulator = (): SimulatorState => {
  const [state, setState] = useState<SimulatorState>({
    totalSynced: 0,
    activeNow: 0,
    resonance: 0,
    syncPerSecond: 0,
  });

  useEffect(() => {
    // 초기 값 (런칭 후 경과일 기반)
    const launchDate = new Date('2025-01-01').getTime();
    const daysSinceLaunch = (Date.now() - launchDate) / (1000 * 60 * 60 * 24);
    const baseSynced = 10000 + Math.log10(daysSinceLaunch + 1) * 1000000;

    let synced = baseSynced;
    
    const interval = setInterval(() => {
      // 자연 성장 + 랜덤 변동
      synced += 0.5 + Math.random() * 0.5;
      
      // 시간대별 활성 사용자
      const hour = new Date().getHours();
      const activityMultiplier = hour >= 9 && hour <= 22 ? 1.2 : 0.7;
      const active = synced * 0.1 * activityMultiplier;
      
      // 공명값 (안정화될수록 높음)
      const resonance = 85 + Math.sin(Date.now() / 10000) * 10;
      
      setState({
        totalSynced: Math.floor(synced),
        activeNow: Math.floor(active),
        resonance: Math.floor(resonance),
        syncPerSecond: parseFloat((0.5 + Math.random() * 0.5).toFixed(1)),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return state;
};

// ============================================
// 컴포넌트: 실시간 카운터
// ============================================

interface LiveCounterProps {
  value: number;
  label: string;
  suffix?: string;
  highlight?: boolean;
}

const LiveCounter: React.FC<LiveCounterProps> = ({ value, label, suffix = '', highlight = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const diff = value - displayValue;
    if (Math.abs(diff) > 0) {
      const step = diff > 0 ? Math.ceil(diff / 20) : Math.floor(diff / 20);
      const timer = setTimeout(() => {
        setDisplayValue(prev => prev + step);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`text-center p-6 rounded-2xl ${
        highlight 
          ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
          : 'bg-white/5'
      }`}
    >
      <div className={`text-4xl font-bold font-mono ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {formatNumber(displayValue)}{suffix}
      </div>
      <div className="text-gray-400 text-sm mt-2">{label}</div>
      {highlight && (
        <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          실시간 동기화 중
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// 컴포넌트: 글로벌 파동 시각화
// ============================================

interface Pulse {
  id: number;
  regionId: string;
  color: string;
  x: number;
  y: number;
}

const GlobalWave: React.FC<{ totalSynced: number }> = ({ totalSynced }) => {
  const [pulses, setPulses] = useState<Pulse[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomRegion = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      const newPulse: Pulse = {
        id: Date.now(),
        regionId: randomRegion.id,
        color: randomRegion.color,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
      };
      setPulses(prev => [...prev.slice(-5), newPulse]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
      {/* 배경 그리드 */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-full h-px bg-white" style={{ top: `${i * 5}%` }} />
        ))}
      </div>
      
      {/* 파동 애니메이션 */}
      <AnimatePresence>
        {pulses.map(pulse => (
          <motion.div
            key={pulse.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute w-4 h-4 rounded-full"
            style={{
              backgroundColor: pulse.color,
              left: `${pulse.x}%`,
              top: `${pulse.y}%`,
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-6xl mb-2">🌍</div>
        <div className="text-white/60 text-sm">
          전 세계에서 동기화 파동이 발생하고 있습니다
        </div>
      </div>
      
      {/* 지역 인디케이터 */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
        {REGIONS.map(region => (
          <div key={region.id} className="flex items-center gap-1 text-xs text-white/60">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: region.color }} />
            <span>{region.flag}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// 컴포넌트: 지역별 싱크 현황
// ============================================

const RegionalSync: React.FC<{ totalSynced: number }> = ({ totalSynced }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white/80 font-medium">🌐 지역별 동기화 현황</h3>
      {REGIONS.map(region => {
        const regionSynced = Math.floor(totalSynced * (region.population / GLOBAL_POPULATION));
        const syncRate = ((regionSynced / region.population) * 100).toFixed(4);
        
        return (
          <motion.div
            key={region.id}
            whileHover={{ scale: 1.01 }}
            className="bg-white/5 rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{region.flag}</span>
                <span className="text-white/80">{region.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-mono">{formatNumber(regionSynced)}</div>
                <div className="text-xs text-white/40">{syncRate}%</div>
              </div>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(parseFloat(syncRate) * 10000, 100)}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: region.color }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================
// 컴포넌트: 아키타입 분포
// ============================================

const ArchetypeDistribution: React.FC<{ totalSynced: number }> = ({ totalSynced }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white/80 font-medium">🎭 아키타입 분포</h3>
      <div className="grid grid-cols-2 gap-2">
        {ARCHETYPES.map(arch => {
          const count = Math.floor(totalSynced * arch.ratio);
          return (
            <motion.div
              key={arch.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 rounded-lg p-2 flex items-center gap-2"
            >
              <span className="text-xl">{arch.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-sm truncate">{arch.name}</div>
                <div className="text-white/40 text-xs">{formatNumber(count)}</div>
              </div>
              <div className="text-white/30 text-xs">{(arch.ratio * 100).toFixed(0)}%</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// 컴포넌트: 공명 미터
// ============================================

const ResonanceMeter: React.FC<{ value: number }> = ({ value }) => {
  const getColor = (v: number) => {
    if (v >= 90) return 'text-green-400';
    if (v >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMessage = (v: number) => {
    if (v >= 90) return '🟢 인류 지성이 고도로 정렬되어 있습니다';
    if (v >= 70) return '🟡 정렬 진행 중 - 더 많은 동기화가 필요합니다';
    return '🔴 불협화음 감지 - 긴급 정렬 필요';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80">🌊 글로벌 공명 지수</h3>
        <div className={`text-3xl font-bold font-mono ${getColor(value)}`}>
          {value}%
        </div>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
          className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
        />
      </div>
      <div className="mt-3 text-white/40 text-xs">
        {getMessage(value)}
      </div>
    </motion.div>
  );
};

// ============================================
// 컴포넌트: 온보딩 프롬프트
// ============================================

interface OnboardingPromptProps {
  syncNumber: number;
  onStart: () => void;
}

const OnboardingPrompt: React.FC<OnboardingPromptProps> = ({ syncNumber, onStart }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-8 text-center border border-indigo-500/30"
    >
      <div className="text-6xl mb-4">🌌</div>
      <h2 className="text-2xl font-bold text-white mb-2">
        이미 {formatNumber(syncNumber)}명이 동기화되었습니다
      </h2>
      <p className="text-white/60 mb-6">
        이 우주에서 당신의 자리를 찾아보세요
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white font-bold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
      >
        나의 노드 조합 찾기 →
      </motion.button>
      <div className="mt-4 text-white/40 text-sm">
        3개의 질문으로 당신의 36노드 가중치를 계산합니다
      </div>
    </motion.div>
  );
};

// ============================================
// 메인 대시보드
// ============================================

const LivingUniverseDashboard: React.FC = () => {
  const { totalSynced, activeNow, resonance, syncPerSecond } = useGlobalSimulator();
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🏛️ AUTUS Universe
          </h1>
          <p className="text-white/60">
            80억 인류의 지성이 동기화되는 살아있는 우주
          </p>
        </motion.div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LiveCounter
            value={totalSynced}
            label="총 동기화"
            highlight
          />
          <LiveCounter
            value={activeNow}
            label="현재 활성"
          />
          <LiveCounter
            value={resonance}
            label="공명 지수"
            suffix="%"
          />
          <LiveCounter
            value={syncPerSecond}
            label="초당 동기화"
            suffix="/s"
          />
        </div>

        {/* 글로벌 파동 */}
        <GlobalWave totalSynced={totalSynced} />

        {/* 3열 레이아웃 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 지역별 현황 */}
          <RegionalSync totalSynced={totalSynced} />
          
          {/* 공명 미터 + 온보딩 */}
          <div className="space-y-4">
            <ResonanceMeter value={resonance} />
            
            {showOnboarding && (
              <OnboardingPrompt
                syncNumber={totalSynced}
                onStart={() => setShowOnboarding(false)}
              />
            )}
          </div>

          {/* 아키타입 분포 */}
          <ArchetypeDistribution totalSynced={totalSynced} />
        </div>

        {/* 푸터 */}
        <div className="text-center text-white/30 text-sm pt-8">
          AUTUS v3.0 • 5%의 완벽한 틀 + 물리법칙 = 100% 살아있는 우주
        </div>
      </div>
    </div>
  );
};

export default LivingUniverseDashboard;
