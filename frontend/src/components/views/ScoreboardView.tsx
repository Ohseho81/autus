// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 스코어보드 뷰 (Scoreboard View)
// 경쟁 비교 - "몇 대 몇인가?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { scoreApi } from '@/api/views';

interface CompetitorComparison {
  competitor: { id: string; name: string };
  metrics: Array<{
    metric: string;
    label: string;
    ourValue: number;
    theirValue: number;
    result: string;
    difference: number;
  }>;
  summary: { wins: number; losses: number; ties: number; overallResult: string };
}

interface Goal {
  metric: string;
  label: string;
  current: number;
  target: number;
  progress: number;
  status: string;
  gap: number;
  trend: string;
}

export function ScoreboardView() {
  const [comparisons, setComparisons] = useState<CompetitorComparison[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vs' | 'goals'>('vs');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [compData, goalsData] = await Promise.all([
        scoreApi.getCompetitors(),
        scoreApi.getGoals(),
      ]);
      // Transform API response to component format
      const rawComps = Array.isArray(compData) ? compData : [];
      setComparisons(rawComps.map((c: any) => ({
        competitor: { id: c.name, name: c.name },
        metrics: [
          { metric: 'win', label: '승리', ourValue: c.win || 0, theirValue: c.lose || 0, result: c.win > c.lose ? 'win' : 'loss', difference: (c.win || 0) - (c.lose || 0) },
        ],
        summary: { wins: c.win || 0, losses: c.lose || 0, ties: 0, overallResult: c.win > c.lose ? '우위' : '열세' },
      })));
      
      const rawGoals = Array.isArray(goalsData) ? goalsData : [];
      setGoals(rawGoals.map((g: any) => ({
        metric: g.name,
        label: g.name,
        current: g.current,
        target: g.target,
        progress: g.progress,
        status: g.progress >= 80 ? 'good' : g.progress >= 50 ? 'warning' : 'danger',
        gap: g.target - g.current,
        trend: 'stable',
      })));
      
      const avgProgress = rawGoals.length > 0 ? rawGoals.reduce((s: number, g: any) => s + g.progress, 0) / rawGoals.length : 0;
      setOverallProgress(Math.round(avgProgress));
    } catch (error) {
      console.error('Scoreboard load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // 전체 승패 계산
  const totalWins = comparisons.reduce((sum, c) => sum + c.summary.wins, 0);
  const totalLosses = comparisons.reduce((sum, c) => sum + c.summary.losses, 0);

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🏆</span> 스코어보드
        </h1>
        
        {/* 전체 스코어 */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">
              <span className="text-green-500">{totalWins}</span>
              <span className="text-gray-400 mx-2">:</span>
              <span className="text-red-500">{totalLosses}</span>
            </div>
            <div className="text-xs text-gray-500">vs 경쟁사</div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('vs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'vs'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚔️ 경쟁사 비교
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'goals'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🎯 목표 달성
        </button>
      </div>

      {activeTab === 'vs' ? (
        /* 경쟁사 비교 */
        <div className="space-y-6">
          {comparisons.map((comp, index) => (
            <motion.div
              key={comp.competitor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">vs {comp.competitor.name}</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  comp.summary.overallResult === 'winning' ? 'bg-green-100 text-green-700' :
                  comp.summary.overallResult === 'losing' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {comp.summary.wins}승 {comp.summary.losses}패 {comp.summary.ties}무
                </div>
              </div>

              <div className="space-y-3">
                {comp.metrics.map(metric => (
                  <div key={metric.metric} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-500">{metric.label}</div>
                    <div className="flex-1 flex items-center gap-2">
                      {/* 우리 값 */}
                      <div className={`w-20 text-right font-bold ${
                        metric.result === 'win' ? 'text-green-500' :
                        metric.result === 'lose' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {metric.ourValue.toFixed(1)}
                      </div>
                      
                      {/* 바 */}
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all ${
                            metric.result === 'win' ? 'bg-green-500' :
                            metric.result === 'lose' ? 'bg-red-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${(metric.ourValue / (metric.ourValue + metric.theirValue)) * 100}%` }}
                        />
                      </div>
                      
                      {/* 경쟁사 값 */}
                      <div className="w-20 text-left text-gray-500">
                        {metric.theirValue.toFixed(1)}
                      </div>
                    </div>
                    
                    {/* 결과 */}
                    <div className="w-8 text-center text-lg">
                      {metric.result === 'win' ? '🏆' : metric.result === 'lose' ? '❌' : '➖'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* 목표 달성 */
        <div className="space-y-6">
          {/* 전체 진행률 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-80">전체 목표 달성률</div>
                <div className="text-4xl font-bold mt-1">{overallProgress}%</div>
              </div>
              <div className="w-24 h-24 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    className="stroke-white/20"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    className="stroke-white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(overallProgress / 100) * 251} 251`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* 개별 목표 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.metric}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{goal.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    goal.status === 'achieved' ? 'bg-green-100 text-green-700' :
                    goal.status === 'on_track' ? 'bg-blue-100 text-blue-700' :
                    goal.status === 'at_risk' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {goal.status === 'achieved' ? '달성' :
                     goal.status === 'on_track' ? '정상' :
                     goal.status === 'at_risk' ? '주의' : '위험'}
                  </span>
                </div>
                
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold">{typeof goal.current === 'number' && goal.current > 1000000 
                    ? `${(goal.current / 1000000).toFixed(1)}M` 
                    : goal.current.toLocaleString()}</span>
                  <span className="text-gray-500">/ {typeof goal.target === 'number' && goal.target > 1000000 
                    ? `${(goal.target / 1000000).toFixed(1)}M` 
                    : goal.target.toLocaleString()}</span>
                </div>
                
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      goal.progress >= 100 ? 'bg-green-500' :
                      goal.progress >= 80 ? 'bg-blue-500' :
                      goal.progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{goal.progress}%</span>
                  <span className={goal.trend === 'improving' ? 'text-green-500' : goal.trend === 'declining' ? 'text-red-500' : ''}>
                    {goal.trend === 'improving' ? '↑ 개선 중' : goal.trend === 'declining' ? '↓ 하락 중' : '→ 유지'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreboardView;
