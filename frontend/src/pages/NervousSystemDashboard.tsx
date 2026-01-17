/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Nervous System Dashboard
 * 신경계 대시보드 - LLM 효율화 현황
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AUTUS = AI 시대의 신경계
 * - 뇌 (LLM): 추론/판단/창의성
 * - 신경계 (AUTUS): 체득/무의식/반사
 * - 신체 (Robotics): 실행/물리적 작업
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface NeuralEfficiency {
  neural_efficiency: string;
  embodiment_completion: string;
  statistics: {
    total_executions: number;
    llm_calls: number;
    llm_avoided: number;
    tokens_saved: number;
    cost_saved_usd: string;
  };
  stage_summary: {
    REFLEX_ready: number;
    EMBODIED_ready: number;
    CONSCIOUS_needed: number;
  };
  message: string;
}

interface EmbodimentScore {
  task_id: string;
  score: number;
  stage: string;
  components: {
    repetition: number;
    consistency: number;
    speed: number;
    independence: number;
  };
}

interface RoutineStats {
  total_executions: number;
  reflex_executions: number;
  embodied_executions: number;
  conscious_executions: number;
  llm_calls_saved: number;
  l1_tasks: number;
  l2_tasks: number;
  l3_tasks: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchNeuralEfficiency(): Promise<NeuralEfficiency> {
  try {
    const res = await fetch(`${API_BASE}/api/nervous/embodiment/neural-efficiency`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    // Mock data
    return {
      neural_efficiency: "78.5%",
      embodiment_completion: "45.2%",
      statistics: {
        total_executions: 1250,
        llm_calls: 268,
        llm_avoided: 982,
        tokens_saved: 147300,
        cost_saved_usd: "$1.47",
      },
      stage_summary: {
        REFLEX_ready: 12,
        EMBODIED_ready: 28,
        CONSCIOUS_needed: 45,
      },
      message: "⚡ 신경계 효율적 - 대부분 무의식 처리",
    };
  }
}

async function fetchRoutineStats(): Promise<RoutineStats> {
  try {
    const res = await fetch(`${API_BASE}/api/nervous/routine/stats`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    return {
      total_executions: 1250,
      reflex_executions: 450,
      embodied_executions: 532,
      conscious_executions: 268,
      llm_calls_saved: 982,
      l1_tasks: 12,
      l2_tasks: 28,
      l3_tasks: 45,
    };
  }
}

async function fetchEmbodimentScores(): Promise<EmbodimentScore[]> {
  try {
    const res = await fetch(`${API_BASE}/api/nervous/embodiment/scores`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.scores || [];
  } catch {
    return [
      { task_id: "invoice_generate", score: 0.95, stage: "UNCONSCIOUS_COMPETENCE", components: { repetition: 0.98, consistency: 0.95, speed: 0.92, independence: 0.96 } },
      { task_id: "email_classify", score: 0.82, stage: "CONSCIOUS_COMPETENCE", components: { repetition: 0.88, consistency: 0.85, speed: 0.78, independence: 0.76 } },
      { task_id: "report_generate", score: 0.65, stage: "CONSCIOUS_COMPETENCE", components: { repetition: 0.72, consistency: 0.68, speed: 0.62, independence: 0.58 } },
      { task_id: "schedule_manage", score: 0.45, stage: "CONSCIOUS_INCOMPETENCE", components: { repetition: 0.52, consistency: 0.48, speed: 0.42, independence: 0.38 } },
      { task_id: "customer_analysis", score: 0.28, stage: "UNCONSCIOUS_INCOMPETENCE", components: { repetition: 0.32, consistency: 0.25, speed: 0.28, independence: 0.26 } },
    ];
  }
}

async function simulateLearning(taskId: string, iterations: number): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/nervous/demo/simulate-learning?task_id=${taskId}&iterations=${iterations}`, {
      method: 'POST',
    });
    return await res.json();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

// Neural Architecture Diagram
function NeuralArchitecture() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-white font-bold mb-4 text-center">AI 시대의 인체 구조</h3>
      <div className="flex flex-col items-center gap-4">
        {/* Brain (LLM) */}
        <motion.div 
          className="w-32 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-center">
            <div className="text-2xl">🧠</div>
            <div className="text-white text-xs font-bold">뇌 (LLM)</div>
            <div className="text-white/70 text-[10px]">추론/판단</div>
          </div>
        </motion.div>
        
        {/* Connection */}
        <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-cyan-500" />
        
        {/* Nervous System (AUTUS) */}
        <motion.div 
          className="w-48 h-24 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-cyan-400"
          animate={{ boxShadow: ['0 0 20px rgba(34,211,238,0.3)', '0 0 40px rgba(34,211,238,0.5)', '0 0 20px rgba(34,211,238,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-center">
            <div className="text-2xl">⚡</div>
            <div className="text-white font-bold">AUTUS (신경계)</div>
            <div className="text-white/70 text-xs">체득 / 무의식 / 반사</div>
          </div>
        </motion.div>
        
        {/* Connection */}
        <div className="h-8 w-0.5 bg-gradient-to-b from-cyan-500 to-green-500" />
        
        {/* Body (Robotics) */}
        <motion.div 
          className="w-32 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
        >
          <div className="text-center">
            <div className="text-2xl">🦾</div>
            <div className="text-white text-xs font-bold">신체 (Robotics)</div>
            <div className="text-white/70 text-[10px]">실행/물리적 작업</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Efficiency Gauge
function EfficiencyGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          stroke="#1e293b"
          strokeWidth="10"
          fill="none"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute mt-8">
        <div className="text-2xl font-bold text-white">{value.toFixed(1)}%</div>
      </div>
      <div className="text-slate-400 text-sm mt-2">{label}</div>
    </div>
  );
}

// Level Distribution Bar
function LevelDistribution({ stats }: { stats: RoutineStats }) {
  const total = stats.l1_tasks + stats.l2_tasks + stats.l3_tasks;
  const l1Pct = (stats.l1_tasks / total) * 100;
  const l2Pct = (stats.l2_tasks / total) * 100;
  const l3Pct = (stats.l3_tasks / total) * 100;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">자동화 레벨 분포</span>
        <span className="text-white font-mono">{total} tasks</span>
      </div>
      <div className="h-6 bg-slate-700 rounded-full overflow-hidden flex">
        <motion.div 
          className="h-full bg-green-500 flex items-center justify-center"
          initial={{ width: 0 }}
          animate={{ width: `${l1Pct}%` }}
          transition={{ duration: 1 }}
        >
          <span className="text-[10px] text-white font-bold">L1</span>
        </motion.div>
        <motion.div 
          className="h-full bg-cyan-500 flex items-center justify-center"
          initial={{ width: 0 }}
          animate={{ width: `${l2Pct}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <span className="text-[10px] text-white font-bold">L2</span>
        </motion.div>
        <motion.div 
          className="h-full bg-purple-500 flex items-center justify-center"
          initial={{ width: 0 }}
          animate={{ width: `${l3Pct}%` }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <span className="text-[10px] text-white font-bold">L3</span>
        </motion.div>
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded" />
          <span className="text-slate-400">Reflex ({stats.l1_tasks})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-cyan-500 rounded" />
          <span className="text-slate-400">Embodied ({stats.l2_tasks})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-500 rounded" />
          <span className="text-slate-400">Conscious ({stats.l3_tasks})</span>
        </div>
      </div>
    </div>
  );
}

// Embodiment Score Card
function EmbodimentCard({ score }: { score: EmbodimentScore }) {
  const stageColor = {
    UNCONSCIOUS_COMPETENCE: 'text-green-400',
    CONSCIOUS_COMPETENCE: 'text-cyan-400',
    CONSCIOUS_INCOMPETENCE: 'text-yellow-400',
    UNCONSCIOUS_INCOMPETENCE: 'text-red-400',
  }[score.stage] || 'text-slate-400';
  
  const stageLabel = {
    UNCONSCIOUS_COMPETENCE: '체득 완료',
    CONSCIOUS_COMPETENCE: '학습 중',
    CONSCIOUS_INCOMPETENCE: '인식 중',
    UNCONSCIOUS_INCOMPETENCE: '미인식',
  }[score.stage] || score.stage;
  
  return (
    <motion.div 
      className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
      whileHover={{ scale: 1.02, borderColor: 'rgb(34 211 238 / 0.5)' }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-white font-medium">{score.task_id}</h4>
          <span className={`text-xs ${stageColor}`}>{stageLabel}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{(score.score * 100).toFixed(0)}%</div>
        </div>
      </div>
      
      {/* Component bars */}
      <div className="space-y-2">
        {Object.entries(score.components).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 capitalize">{key}</span>
              <span className="text-slate-400">{(value * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export function NervousSystemDashboard() {
  const [efficiency, setEfficiency] = useState<NeuralEfficiency | null>(null);
  const [routineStats, setRoutineStats] = useState<RoutineStats | null>(null);
  const [scores, setScores] = useState<EmbodimentScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [eff, stats, scoreData] = await Promise.all([
      fetchNeuralEfficiency(),
      fetchRoutineStats(),
      fetchEmbodimentScores(),
    ]);
    setEfficiency(eff);
    setRoutineStats(stats);
    setScores(scoreData);
    setIsLoading(false);
  }, []);
  
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);
  
  const handleSimulate = async () => {
    setSimulating(true);
    await simulateLearning('demo_task_' + Date.now(), 30);
    await loadData();
    setSimulating(false);
  };
  
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading Nervous System...</div>
      </div>
    );
  }
  
  const neuralEffNum = parseFloat(efficiency?.neural_efficiency || '0');
  const embodimentNum = parseFloat(efficiency?.embodiment_completion || '0');
  
  return (
    <div className="min-h-screen w-full bg-slate-900 p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">AUTUS Nervous System</h1>
        <p className="text-slate-400">AI 시대의 신경계 - LLM 효율화 대시보드</p>
      </header>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Architecture + Gauges */}
        <div className="col-span-4 space-y-6">
          <NeuralArchitecture />
          
          {/* Efficiency Gauges */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-bold mb-4">신경계 효율성</h3>
            <div className="flex justify-around relative">
              <EfficiencyGauge value={neuralEffNum} label="LLM 절약률" color="#22d3ee" />
              <EfficiencyGauge value={embodimentNum} label="체득 완료율" color="#a855f7" />
            </div>
          </div>
          
          {/* Message */}
          <motion.div 
            className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 rounded-xl p-4 border border-cyan-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-cyan-300 text-center">{efficiency?.message}</p>
          </motion.div>
        </div>
        
        {/* Center: Stats + Scores */}
        <div className="col-span-5 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
              <div className="text-3xl font-bold text-green-400">{efficiency?.statistics.llm_avoided || 0}</div>
              <div className="text-slate-400 text-sm">LLM 호출 절약</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
              <div className="text-3xl font-bold text-cyan-400">{((efficiency?.statistics.tokens_saved || 0) / 1000).toFixed(0)}K</div>
              <div className="text-slate-400 text-sm">토큰 절약</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
              <div className="text-3xl font-bold text-purple-400">{efficiency?.statistics.cost_saved_usd || '$0'}</div>
              <div className="text-slate-400 text-sm">비용 절약</div>
            </div>
          </div>
          
          {/* Level Distribution */}
          {routineStats && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <LevelDistribution stats={routineStats} />
            </div>
          )}
          
          {/* Embodiment Scores */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">체득 진척도</h3>
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 rounded text-white text-sm transition-colors"
              >
                {simulating ? '시뮬레이션 중...' : '학습 시뮬레이션'}
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {scores.map(score => (
                <EmbodimentCard key={score.task_id} score={score} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Right: Stage Summary */}
        <div className="col-span-3 space-y-6">
          {/* Stage Summary */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-bold mb-4">단계별 현황</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                <div>
                  <div className="text-green-400 font-bold">L1 REFLEX</div>
                  <div className="text-green-300/70 text-xs">무의식 자동 실행</div>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {efficiency?.stage_summary.REFLEX_ready || 0}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
                <div>
                  <div className="text-cyan-400 font-bold">L2 EMBODIED</div>
                  <div className="text-cyan-300/70 text-xs">체득 진행 중</div>
                </div>
                <div className="text-2xl font-bold text-cyan-400">
                  {efficiency?.stage_summary.EMBODIED_ready || 0}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-900/30 rounded-lg border border-purple-700/50">
                <div>
                  <div className="text-purple-400 font-bold">L3 CONSCIOUS</div>
                  <div className="text-purple-300/70 text-xs">LLM 추론 필요</div>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {efficiency?.stage_summary.CONSCIOUS_needed || 0}
                </div>
              </div>
            </div>
          </div>
          
          {/* Execution Breakdown */}
          {routineStats && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-bold mb-4">실행 분석</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">총 실행</span>
                  <span className="text-white font-mono">{routineStats.total_executions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">반사 실행</span>
                  <span className="text-green-400 font-mono">{routineStats.reflex_executions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cyan-400">체득 실행</span>
                  <span className="text-cyan-400 font-mono">{routineStats.embodied_executions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-400">의식 실행</span>
                  <span className="text-purple-400 font-mono">{routineStats.conscious_executions}</span>
                </div>
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">LLM 호출 절약</span>
                    <span className="text-green-400 font-bold">{routineStats.llm_calls_saved}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Refresh Button */}
          <button
            onClick={loadData}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
          >
            🔄 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}

export default NervousSystemDashboard;
