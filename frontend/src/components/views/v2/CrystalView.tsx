/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔮 수정구 뷰 (Crystal View) - AUTUS 2.0 [고급]
 * 시나리오 시뮬레이션
 * "미래는 어떻게?"
 * Owner만 접근 가능
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, RotateCcw, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'optimistic' | 'moderate' | 'pessimistic';
  isRecommended?: boolean;
  prediction: {
    customers: { value: number; change: number };
    revenue: { value: number; change: number };
    churnRate: { value: number; change: number };
  };
  assumptions: string[];
}

interface CurrentState {
  customers: number;
  revenue: number;
  churnRate: number;
}

interface CrystalData {
  currentState: CurrentState;
  scenarios: Scenario[];
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: CrystalData = {
  currentState: { customers: 132, revenue: 5200, churnRate: 5 },
  scenarios: [
    {
      id: 's1',
      name: '현행 유지',
      description: '현재 전략을 그대로 유지',
      type: 'moderate',
      prediction: {
        customers: { value: 128, change: -3 },
        revenue: { value: 5100, change: -2 },
        churnRate: { value: 6, change: 20 },
      },
      assumptions: ['경쟁사 프로모션 대응 안함', '이탈 방지 미조치'],
    },
    {
      id: 's2',
      name: '적극 대응',
      description: 'D학원 대응 + 이탈 방지 강화',
      type: 'optimistic',
      isRecommended: true,
      prediction: {
        customers: { value: 145, change: 10 },
        revenue: { value: 5800, change: 12 },
        churnRate: { value: 3, change: -40 },
      },
      assumptions: ['D학원 대응 전략 실행', '위험 고객 상담 완료', '신규 프로모션 진행'],
    },
    {
      id: 's3',
      name: '위기 상황',
      description: '경쟁 심화 + 대응 실패',
      type: 'pessimistic',
      prediction: {
        customers: { value: 105, change: -20 },
        revenue: { value: 4200, change: -19 },
        churnRate: { value: 12, change: 140 },
      },
      assumptions: ['D학원 프로모션 성공', '핵심 강사 이탈', '위험 고객 전원 이탈'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const ScenarioCard: React.FC<{
  scenario: Scenario;
  selected: boolean;
  onSelect: () => void;
}> = ({ scenario, selected, onSelect }) => {
  const typeColors = {
    optimistic: 'border-emerald-500/50 bg-emerald-500/10',
    moderate: 'border-blue-500/50 bg-blue-500/10',
    pessimistic: 'border-red-500/50 bg-red-500/10',
  };
  
  const ChangeIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp size={12} className="text-emerald-400" />;
    if (value < 0) return <TrendingDown size={12} className="text-red-400" />;
    return <Minus size={12} className="text-slate-400" />;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        selected 
          ? `${typeColors[scenario.type]} ring-2 ring-offset-2 ring-offset-slate-900 ${
              scenario.type === 'optimistic' ? 'ring-emerald-500' : 
              scenario.type === 'moderate' ? 'ring-blue-500' : 'ring-red-500'
            }`
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{scenario.name}</span>
          {scenario.isRecommended && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
              <Brain size={10} /> AI 추천
            </span>
          )}
        </div>
      </div>
      
      <div className="text-xs text-slate-400 mb-3">{scenario.description}</div>
      
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '재원수', value: scenario.prediction.customers },
          { label: '매출', value: scenario.prediction.revenue },
          { label: '이탈률', value: scenario.prediction.churnRate },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className="text-sm font-bold">{value.value}{label === '이탈률' ? '%' : label === '매출' ? '만' : '명'}</div>
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <ChangeIcon value={value.change} />
              <span className={value.change > 0 && label !== '이탈률' ? 'text-emerald-400' : 
                              value.change < 0 && label === '이탈률' ? 'text-emerald-400' :
                              value.change !== 0 ? 'text-red-400' : 'text-slate-400'}>
                {value.change > 0 ? '+' : ''}{value.change}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface CrystalViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function CrystalView({ onNavigate = () => {} }: CrystalViewProps) {
  const [data] = useState<CrystalData>(MOCK_DATA);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!selectedScenario) return;
    
    setSimulating(true);
    setSimulationResult(null);
    
    // Simulate processing
    await new Promise(r => setTimeout(r, 2000));
    
    const scenario = data.scenarios.find(s => s.id === selectedScenario);
    setSimulationResult(`"${scenario?.name}" 시나리오 기반으로 3개월 후 예측이 완료되었습니다.`);
    setSimulating(false);
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setSimulationResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-lg font-bold flex items-center gap-2">
              수정구
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">고급</span>
            </div>
            <div className="text-[10px] text-slate-500">시나리오 시뮬레이션</div>
          </div>
        </div>
      </div>

      {/* Current State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 mb-4"
      >
        <div className="text-xs text-slate-400 mb-2">현재 상태</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{data.currentState.customers}명</div>
            <div className="text-xs text-slate-500">재원수</div>
          </div>
          <div>
            <div className="text-2xl font-bold">₩{data.currentState.revenue}만</div>
            <div className="text-xs text-slate-500">월 매출</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.currentState.churnRate}%</div>
            <div className="text-xs text-slate-500">이탈률</div>
          </div>
        </div>
      </motion.div>

      {/* Scenarios */}
      <div className="space-y-3 mb-4">
        <div className="text-xs text-slate-400">시나리오 선택</div>
        {data.scenarios.map((scenario, i) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <ScenarioCard
              scenario={scenario}
              selected={selectedScenario === scenario.id}
              onSelect={() => setSelectedScenario(scenario.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Simulation Result */}
      {simulationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30 mb-4"
        >
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles size={14} />
            <span className="text-sm">{simulationResult}</span>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSimulate}
          disabled={!selectedScenario || simulating}
          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl ${
            selectedScenario && !simulating
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play size={16} className={simulating ? 'animate-pulse' : ''} />
          <span className="text-sm">{simulating ? '시뮬레이션 중...' : '시뮬레이션 실행'}</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
          className="px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl"
        >
          <RotateCcw size={16} />
        </motion.button>
      </div>
    </div>
  );
}

export default CrystalView;
