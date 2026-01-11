import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 AUTUS Trinity Dashboard (Lite Version - No framer-motion)
// ═══════════════════════════════════════════════════════════════════════════════
// "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."

// Types
interface TargetNode {
  id: string;
  name: string;
  current: number;
  target: number;
}

interface CrystallizationData {
  rawDesire: string;
  targetNodes: TargetNode[];
  requiredMonths: number;
  requiredHours: number;
  feasibility: number;
  totalPain: number;
  painBreakdown: { financial: number; cognitive: number; temporal: number; emotional: number };
}

interface EnvironmentData {
  eliminated: number;
  automated: number;
  parallelized: number;
  preserved: number;
  energyEfficiency: number;
  cognitiveLeakage: number;
  friction: number;
  environmentScore: number;
}

interface ProgressData {
  progress: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  remainingDays: number;
  painEndDate: string;
  uncertainty: number;
  confidence: number;
  onTrack: boolean;
  deviation: number;
}

// Icons
const Icons = {
  Crystal: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /></svg>,
  Radar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
};

// Circular Progress with CSS transition
const CircularProgress: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = 54;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{animatedValue}%</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
};

// Progress Bar with CSS transition
const ProgressBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const colors: Record<string, string> = {
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    green: 'bg-gradient-to-r from-green-600 to-emerald-500',
    yellow: 'bg-gradient-to-r from-yellow-600 to-amber-500',
    red: 'bg-gradient-to-r from-red-600 to-rose-500',
    purple: 'bg-gradient-to-r from-purple-600 to-violet-500',
    cyan: 'bg-gradient-to-r from-cyan-600 to-blue-500',
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1 text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[color] || colors.blue}`}
          style={{ width: `${animatedValue}%`, transition: 'width 1s ease-out' }} />
      </div>
    </div>
  );
};

// Badge
const Badge: React.FC<{ children: React.ReactNode; color: 'blue' | 'green' | 'purple' }> = ({ children, color }) => {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${colors[color]}`}>{children}</span>;
};

// Main Dashboard
const TrinityEngineLite: React.FC = () => {
  const data = {
    crystallization: {
      rawDesire: '부자가 되고 싶다',
      targetNodes: [
        { id: 'n01', name: '현금', current: 55, target: 10 },
        { id: 'n03', name: '런웨이', current: 60, target: 5 },
        { id: 'n05', name: '부채', current: 40, target: 10 },
        { id: 'n07', name: '수익', current: 45, target: 20 },
      ],
      requiredMonths: 63, requiredHours: 2520, feasibility: 68, totalPain: 35,
      painBreakdown: { financial: 49, cognitive: 42, temporal: 35, emotional: 14 },
    } as CrystallizationData,
    environment: {
      eliminated: 30, automated: 40, parallelized: 20, preserved: 10,
      energyEfficiency: 82, cognitiveLeakage: 18, friction: 11, environmentScore: 84,
    } as EnvironmentData,
    progress: {
      progress: 10, currentCheckpoint: 1, totalCheckpoints: 5,
      remainingDays: 1279, painEndDate: '2029-07', uncertainty: 37, confidence: 63,
      onTrack: false, deviation: -166,
    } as ProgressData,
    actions: ['63개월간 인내할 결심', '10건의 핵심 업무에만 집중', '다음 체크포인트까지 255일 견디기'],
  };

  const optimizationRate = Math.round(
    ((data.environment.eliminated + data.environment.automated + data.environment.parallelized) /
    (data.environment.eliminated + data.environment.automated + data.environment.parallelized + data.environment.preserved)) * 100
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3 font-sans">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-gray-950 to-purple-900/20 pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Icons.Radar />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              AUTUS TRINITY
            </h1>
          </div>
          <p className="text-gray-500 text-xs italic">
            "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."
          </p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: '필요 기간', value: '63', unit: '개월', color: 'text-blue-400' },
            { label: '진행률', value: '10.4', unit: '%', color: 'text-green-400' },
            { label: '실현 가능성', value: '68', unit: '%', color: 'text-yellow-400' },
            { label: '환경 점수', value: '84', unit: '/100', color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-[10px]">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}<span className="text-xs text-gray-500">{stat.unit}</span></p>
            </div>
          ))}
        </div>

        {/* Trinity Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* 1. Crystallization */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-3 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400"><Icons.Crystal /></div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">CRYSTALLIZATION</h2>
                <p className="text-[10px] text-gray-500">목표 결정질화</p>
              </div>
              <Badge color="blue">1</Badge>
            </div>

            <div className="mb-3 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-[10px] text-gray-400">원본 욕망</p>
              <p className="text-sm font-bold">{data.crystallization.rawDesire}</p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {data.crystallization.targetNodes.map((node) => (
                <div key={node.id} className="p-1.5 bg-gray-800/30 rounded border border-gray-700/50">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">{node.id}</span>
                    <span className="text-[10px] text-cyan-400">{node.current}→{node.target}%</span>
                  </div>
                  <p className="text-xs">{node.name}</p>
                </div>
              ))}
            </div>

            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mb-3">
              <div className="grid grid-cols-3 text-center">
                <div>
                  <p className="text-base font-bold">{data.crystallization.requiredMonths}</p>
                  <p className="text-[10px] text-gray-400">개월</p>
                </div>
                <div>
                  <p className="text-base font-bold">{(data.crystallization.requiredHours/1000).toFixed(1)}k</p>
                  <p className="text-[10px] text-gray-400">시간</p>
                </div>
                <div>
                  <p className="text-base font-bold text-green-400">{data.crystallization.feasibility}%</p>
                  <p className="text-[10px] text-gray-400">실현</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <ProgressBar value={data.crystallization.painBreakdown.financial} color="blue" label="💰 재무적 절제" />
              <ProgressBar value={data.crystallization.painBreakdown.cognitive} color="purple" label="🧠 인지적 집중" />
              <ProgressBar value={data.crystallization.painBreakdown.temporal} color="yellow" label="⏰ 시간적 희생" />
            </div>
          </div>

          {/* 2. Environment */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-3 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"><Icons.Globe /></div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">ENVIRONMENT</h2>
                <p className="text-[10px] text-gray-500">최적 환경</p>
              </div>
              <Badge color="green">2</Badge>
            </div>

            <div className="flex justify-center mb-3">
              <CircularProgress value={optimizationRate} color="#10b981" label="유령화" />
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {[
                { icon: '🗑️', label: '삭제', value: data.environment.eliminated, color: 'text-red-400' },
                { icon: '🤖', label: '자동화', value: data.environment.automated, color: 'text-blue-400' },
                { icon: '🔀', label: '병렬화', value: data.environment.parallelized, color: 'text-purple-400' },
                { icon: '👤', label: '보존', value: data.environment.preserved, color: 'text-green-400' },
              ].map((item, i) => (
                <div key={i} className="p-1.5 bg-gray-800/30 rounded border border-gray-700/50 text-center">
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-gray-400">{item.icon} {item.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <ProgressBar value={data.environment.energyEfficiency} color="green" label="⚡ 에너지 효율" />
              <ProgressBar value={data.environment.cognitiveLeakage} color="yellow" label="🧠 인지 산란" />
              <ProgressBar value={data.environment.friction} color="cyan" label="🔥 마찰 계수" />
            </div>

            <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
              <span className="text-gray-400 text-xs">환경 점수 </span>
              <span className="text-xl font-bold text-emerald-400">{data.environment.environmentScore}</span>
              <span className="text-gray-400 text-xs">/100</span>
            </div>
          </div>

          {/* 3. Progress */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-3 hover:border-violet-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400"><Icons.Radar /></div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">NAVIGATION</h2>
                <p className="text-[10px] text-gray-500">불확실성 제거</p>
              </div>
              <Badge color="purple">3</Badge>
            </div>

            <div className="mb-2 p-1.5 bg-violet-500/10 rounded border border-violet-500/20">
              <p className="text-violet-300 text-center text-[10px] italic">"끝을 아는 고통은 견딜 수 있다"</p>
            </div>

            <div className="flex justify-center mb-3">
              <CircularProgress value={data.progress.progress} color="#8b5cf6" label="진행률" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-[10px] text-gray-400 flex items-center gap-1"><Icons.Clock /> 남은 고통</p>
                <p className="text-base font-bold">{data.progress.remainingDays}<span className="text-[10px] text-gray-400">일</span></p>
              </div>
              <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-[10px] text-gray-400">종료 예상</p>
                <p className="text-sm font-bold">{data.progress.painEndDate}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <ProgressBar value={data.progress.uncertainty} color="yellow" label="불확실성 (낮을수록 좋음)" />
              <ProgressBar value={data.progress.confidence} color="purple" label="확신 수준" />
            </div>

            <div className="mt-2 text-center text-xs">
              {data.progress.onTrack ? (
                <span className="text-green-400">✅ 정상 진행</span>
              ) : (
                <span className="text-yellow-400">⚠️ {data.progress.deviation}일 이탈</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400 animate-pulse">
              <Icons.Zap />
            </div>
            <div>
              <h3 className="text-sm font-semibold">💡 지금 해야 할 것</h3>
              <p className="text-[10px] text-gray-400">단 3가지만 집중하세요</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {data.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:translate-x-0.5 transition-transform cursor-pointer">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-xs flex-1">{action}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-700/50">
            <p className="text-center text-gray-500 italic text-[10px]">
              "인간의 의지와 아우투스의 지능이 만났습니다."
            </p>
          </div>
        </div>

        <footer className="mt-3 text-center text-gray-600 text-[10px]">
          AUTUS v3.0 Trinity Engine • 2026
        </footer>
      </div>
    </div>
  );
};

export default TrinityEngineLite;
