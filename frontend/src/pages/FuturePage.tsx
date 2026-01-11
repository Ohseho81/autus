/**
 * AUTUS Future Prediction Page
 * ==============================
 * 선택별 미래 예측 시뮬레이션
 */

import React, { useState, useMemo } from 'react';

// ============================================
// Types
// ============================================

interface Scenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  assumptions: string[];
  outcomes: {
    node: string;
    currentValue: number;
    predictedValue: number;
    change: number;
  }[];
  timeline: {
    month: number;
    values: Record<string, number>;
  }[];
}

interface Choice {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'investment' | 'strategy' | 'lifestyle';
  cost: number;
  timeRequired: string;
  scenarios: Scenario[];
}

// ============================================
// Mock Data
// ============================================

const MOCK_CHOICES: Choice[] = [
  {
    id: 'c1',
    title: 'SaaS 제품 출시',
    description: '6개월 내 MVP 출시하고 시장 검증',
    category: 'strategy',
    cost: 50000000,
    timeRequired: '6개월',
    scenarios: [
      {
        id: 's1',
        name: '낙관적',
        description: 'PMF 달성, 빠른 성장',
        probability: 25,
        assumptions: ['시장 니즈 일치', '경쟁 부재', '마케팅 효과'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 30000000, change: 500 },
          { node: 'Customers', currentValue: 10, predictedValue: 200, change: 1900 },
          { node: 'Cash', currentValue: 100000000, predictedValue: 80000000, change: -20 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 5000000, Customers: 10, Cash: 95000000 } },
          { month: 2, values: { Revenue: 5500000, Customers: 15, Cash: 90000000 } },
          { month: 3, values: { Revenue: 8000000, Customers: 35, Cash: 85000000 } },
          { month: 4, values: { Revenue: 12000000, Customers: 70, Cash: 82000000 } },
          { month: 5, values: { Revenue: 20000000, Customers: 130, Cash: 85000000 } },
          { month: 6, values: { Revenue: 30000000, Customers: 200, Cash: 95000000 } },
        ],
      },
      {
        id: 's2',
        name: '기본',
        description: '느린 성장, 피벗 필요',
        probability: 50,
        assumptions: ['부분적 PMF', '경쟁 존재', '학습 필요'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 10000000, change: 100 },
          { node: 'Customers', currentValue: 10, predictedValue: 50, change: 400 },
          { node: 'Cash', currentValue: 100000000, predictedValue: 60000000, change: -40 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 5000000, Customers: 10, Cash: 95000000 } },
          { month: 2, values: { Revenue: 5200000, Customers: 12, Cash: 88000000 } },
          { month: 3, values: { Revenue: 6000000, Customers: 20, Cash: 78000000 } },
          { month: 4, values: { Revenue: 7000000, Customers: 30, Cash: 70000000 } },
          { month: 5, values: { Revenue: 8500000, Customers: 40, Cash: 65000000 } },
          { month: 6, values: { Revenue: 10000000, Customers: 50, Cash: 62000000 } },
        ],
      },
      {
        id: 's3',
        name: '비관적',
        description: '실패, 피벗 또는 철수',
        probability: 25,
        assumptions: ['시장 무반응', '강력한 경쟁', '자금 소진'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 3000000, change: -40 },
          { node: 'Customers', currentValue: 10, predictedValue: 5, change: -50 },
          { node: 'Cash', currentValue: 100000000, predictedValue: 40000000, change: -60 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 5000000, Customers: 10, Cash: 95000000 } },
          { month: 2, values: { Revenue: 4500000, Customers: 8, Cash: 85000000 } },
          { month: 3, values: { Revenue: 4000000, Customers: 7, Cash: 72000000 } },
          { month: 4, values: { Revenue: 3500000, Customers: 6, Cash: 58000000 } },
          { month: 5, values: { Revenue: 3200000, Customers: 5, Cash: 48000000 } },
          { month: 6, values: { Revenue: 3000000, Customers: 5, Cash: 42000000 } },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: '풀타임 프리랜서 전환',
    description: '현재 직장을 그만두고 프리랜서로 전환',
    category: 'career',
    cost: 0,
    timeRequired: '즉시',
    scenarios: [
      {
        id: 's4',
        name: '낙관적',
        description: '안정적 클라이언트 확보',
        probability: 30,
        assumptions: ['네트워크 활용', '실력 검증', '꾸준한 프로젝트'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 12000000, change: 140 },
          { node: 'Risk', currentValue: 3, predictedValue: 4, change: 33 },
          { node: 'Satisfaction', currentValue: 5, predictedValue: 9, change: 80 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 3000000, Risk: 6, Satisfaction: 6 } },
          { month: 2, values: { Revenue: 5000000, Risk: 5, Satisfaction: 7 } },
          { month: 3, values: { Revenue: 7000000, Risk: 5, Satisfaction: 8 } },
          { month: 4, values: { Revenue: 9000000, Risk: 4, Satisfaction: 8 } },
          { month: 5, values: { Revenue: 10000000, Risk: 4, Satisfaction: 9 } },
          { month: 6, values: { Revenue: 12000000, Risk: 4, Satisfaction: 9 } },
        ],
      },
      {
        id: 's5',
        name: '기본',
        description: '불안정한 수입',
        probability: 45,
        assumptions: ['프로젝트 간헐적', '단가 경쟁', '불확실성'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 6000000, change: 20 },
          { node: 'Risk', currentValue: 3, predictedValue: 7, change: 133 },
          { node: 'Satisfaction', currentValue: 5, predictedValue: 6, change: 20 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 2000000, Risk: 8, Satisfaction: 5 } },
          { month: 2, values: { Revenue: 4000000, Risk: 7, Satisfaction: 6 } },
          { month: 3, values: { Revenue: 3000000, Risk: 8, Satisfaction: 5 } },
          { month: 4, values: { Revenue: 7000000, Risk: 6, Satisfaction: 7 } },
          { month: 5, values: { Revenue: 5000000, Risk: 7, Satisfaction: 6 } },
          { month: 6, values: { Revenue: 6000000, Risk: 7, Satisfaction: 6 } },
        ],
      },
      {
        id: 's6',
        name: '비관적',
        description: '재취업 고려',
        probability: 25,
        assumptions: ['프로젝트 없음', '자금 고갈', '스트레스'],
        outcomes: [
          { node: 'Revenue', currentValue: 5000000, predictedValue: 2000000, change: -60 },
          { node: 'Risk', currentValue: 3, predictedValue: 9, change: 200 },
          { node: 'Satisfaction', currentValue: 5, predictedValue: 3, change: -40 },
        ],
        timeline: [
          { month: 1, values: { Revenue: 1000000, Risk: 8, Satisfaction: 4 } },
          { month: 2, values: { Revenue: 500000, Risk: 9, Satisfaction: 3 } },
          { month: 3, values: { Revenue: 2000000, Risk: 8, Satisfaction: 4 } },
          { month: 4, values: { Revenue: 1500000, Risk: 9, Satisfaction: 3 } },
          { month: 5, values: { Revenue: 1000000, Risk: 9, Satisfaction: 3 } },
          { month: 6, values: { Revenue: 2000000, Risk: 9, Satisfaction: 3 } },
        ],
      },
    ],
  },
];

const CATEGORY_CONFIG = {
  career: { icon: '💼', label: '커리어', color: 'text-blue-400' },
  investment: { icon: '💰', label: '투자', color: 'text-green-400' },
  strategy: { icon: '🎯', label: '전략', color: 'text-purple-400' },
  lifestyle: { icon: '🌟', label: '라이프', color: 'text-yellow-400' },
};

// ============================================
// Components
// ============================================

const ScenarioChart = ({ scenario }: { scenario: Scenario }) => {
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const nodes = Object.keys(scenario.timeline[0].values);
  const colors = ['#3b82f6', '#22c55e', '#f59e0b'];
  
  // 스케일 계산
  const allValues = scenario.timeline.flatMap(t => Object.values(t.values));
  const minValue = Math.min(...allValues) * 0.9;
  const maxValue = Math.max(...allValues) * 1.1;
  
  const xScale = (month: number) => 
    padding.left + ((month - 1) / (scenario.timeline.length - 1)) * chartWidth;
  const yScale = (value: number) => 
    padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
  
  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid */}
      {scenario.timeline.map((t, i) => (
        <g key={i}>
          <line
            x1={xScale(t.month)}
            y1={padding.top}
            x2={xScale(t.month)}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.05)"
          />
          <text
            x={xScale(t.month)}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-slate-500"
          >
            {t.month}M
          </text>
        </g>
      ))}
      
      {/* Lines */}
      {nodes.map((node, nodeIndex) => {
        const path = scenario.timeline.map((t, i) => 
          `${i === 0 ? 'M' : 'L'} ${xScale(t.month)} ${yScale(t.values[node])}`
        ).join(' ');
        
        return (
          <g key={node}>
            <path
              d={path}
              fill="none"
              stroke={colors[nodeIndex % colors.length]}
              strokeWidth="2"
            />
            {scenario.timeline.map((t, i) => (
              <circle
                key={i}
                cx={xScale(t.month)}
                cy={yScale(t.values[node])}
                r="4"
                fill={colors[nodeIndex % colors.length]}
              />
            ))}
          </g>
        );
      })}
      
      {/* Legend */}
      <g transform={`translate(${padding.left}, ${padding.top - 5})`}>
        {nodes.map((node, i) => (
          <g key={node} transform={`translate(${i * 80}, 0)`}>
            <circle cx="0" cy="0" r="4" fill={colors[i % colors.length]} />
            <text x="10" y="4" className="text-xs fill-slate-400">{node}</text>
          </g>
        ))}
      </g>
    </svg>
  );
};

const ScenarioCard = ({ 
  scenario,
  isSelected,
  onSelect
}: { 
  scenario: Scenario;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const bgColor = scenario.name === '낙관적' 
    ? 'from-green-500/10 to-green-500/5' 
    : scenario.name === '비관적'
      ? 'from-red-500/10 to-red-500/5'
      : 'from-blue-500/10 to-blue-500/5';
  
  return (
    <div 
      className={`p-4 rounded-xl border cursor-pointer transition-all bg-gradient-to-br ${bgColor} ${
        isSelected ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">{scenario.name}</h4>
        <span className={`px-2 py-1 rounded text-sm ${
          scenario.probability >= 40 
            ? 'bg-green-500/20 text-green-400' 
            : scenario.probability >= 25
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
        }`}>
          {scenario.probability}% 확률
        </span>
      </div>
      
      <p className="text-sm text-slate-400 mb-3">{scenario.description}</p>
      
      {/* Key Outcomes */}
      <div className="space-y-2">
        {scenario.outcomes.map((outcome) => (
          <div key={outcome.node} className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{outcome.node}</span>
            <span className={outcome.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {outcome.change >= 0 ? '+' : ''}{outcome.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChoiceCard = ({ 
  choice, 
  onSelect, 
  isSelected 
}: { 
  choice: Choice;
  onSelect: () => void;
  isSelected: boolean;
}) => {
  const category = CATEGORY_CONFIG[choice.category];
  
  // 기대값 계산
  const expectedOutcome = useMemo(() => {
    const result: Record<string, number> = {};
    
    choice.scenarios[0].outcomes.forEach((o) => {
      result[o.node] = 0;
    });
    
    choice.scenarios.forEach((scenario) => {
      scenario.outcomes.forEach((o) => {
        result[o.node] += o.predictedValue * (scenario.probability / 100);
      });
    });
    
    return result;
  }, [choice]);
  
  return (
    <div 
      className={`p-5 rounded-xl border cursor-pointer transition-all ${
        isSelected 
          ? 'bg-blue-500/20 border-blue-500' 
          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-2xl ${category.color}`}>{category.icon}</span>
        <span className="text-sm text-slate-400">{category.label}</span>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-2">{choice.title}</h3>
      <p className="text-sm text-slate-400 mb-4">{choice.description}</p>
      
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          💰 {choice.cost > 0 ? `₩${(choice.cost / 10000).toLocaleString()}만원` : '비용 없음'}
        </span>
        <span className="text-slate-400">⏱️ {choice.timeRequired}</span>
      </div>
      
      {/* Scenario Summary */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex gap-2">
          {choice.scenarios.map((s) => (
            <div 
              key={s.id}
              className={`flex-1 px-2 py-1 rounded text-center text-xs ${
                s.name === '낙관적' 
                  ? 'bg-green-500/20 text-green-400' 
                  : s.name === '비관적'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {s.name} {s.probability}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ComparisonTable = ({ scenarios }: { scenarios: Scenario[] }) => {
  const allNodes = [...new Set(scenarios.flatMap(s => s.outcomes.map(o => o.node)))];
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 overflow-x-auto">
      <h3 className="text-lg font-bold text-white mb-4">📊 시나리오 비교</h3>
      
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 text-slate-400 font-medium">지표</th>
            {scenarios.map((s) => (
              <th key={s.id} className="text-right py-2 text-slate-400 font-medium">
                {s.name} ({s.probability}%)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allNodes.map((node) => (
            <tr key={node} className="border-b border-slate-700/50">
              <td className="py-3 text-white">{node}</td>
              {scenarios.map((s) => {
                const outcome = s.outcomes.find(o => o.node === node);
                if (!outcome) return <td key={s.id} />;
                
                return (
                  <td key={s.id} className="text-right">
                    <div className="text-white">
                      {outcome.predictedValue.toLocaleString()}
                    </div>
                    <div className={`text-sm ${outcome.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {outcome.change >= 0 ? '↑' : '↓'} {Math.abs(outcome.change)}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function FuturePage() {
  const [choices] = useState<Choice[]>(MOCK_CHOICES);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  
  const selectedChoice = choices.find(c => c.id === selectedChoiceId);
  const selectedScenario = selectedChoice?.scenarios.find(s => s.id === selectedScenarioId);
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🔮 미래 예측</h1>
        <p className="text-slate-400 mt-1">
          선택에 따른 미래를 시뮬레이션하고 최선의 결정을 내리세요
        </p>
      </div>
      
      {/* Choices */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-white mb-4">선택지</h2>
        <div className="grid grid-cols-3 gap-4">
          {choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              isSelected={selectedChoiceId === choice.id}
              onSelect={() => {
                setSelectedChoiceId(choice.id);
                setSelectedScenarioId(choice.scenarios[0].id);
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Scenarios */}
      {selectedChoice && (
        <div className="grid grid-cols-12 gap-6">
          {/* Scenarios List */}
          <div className="col-span-4 space-y-4">
            <h2 className="text-lg font-medium text-white">시나리오</h2>
            {selectedChoice.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isSelected={selectedScenarioId === scenario.id}
                onSelect={() => setSelectedScenarioId(scenario.id)}
              />
            ))}
          </div>
          
          {/* Scenario Detail */}
          <div className="col-span-8 space-y-6">
            {selectedScenario && (
              <>
                {/* Timeline Chart */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4">
                    📈 {selectedScenario.name} 시나리오 타임라인
                  </h3>
                  <ScenarioChart scenario={selectedScenario} />
                </div>
                
                {/* Assumptions */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4">💡 가정</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScenario.assumptions.map((assumption, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-300"
                      >
                        {assumption}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Comparison */}
                <ComparisonTable scenarios={selectedChoice.scenarios} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
