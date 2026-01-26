/**
 * ConsensusDashboard.jsx
 * 합의 엔진 대시보드
 * 
 * 활용 기반 자동 합의 + 표준화 현황
 * Truth Mode: 실효성 점수, 활용 횟수 표시
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// Mock 데이터
const MOCK_SOLUTIONS = [
  { id: 1, task: '출석 독려', solution: '알림톡 + 전화', usageCount: 47, effectiveness: 92, status: 'standardized', createdBy: '김선생' },
  { id: 2, task: '숙제 미제출', solution: '1:1 면담 + 학부모 알림', usageCount: 38, effectiveness: 85, status: 'standardized', createdBy: '이선생' },
  { id: 3, task: '성적 하락', solution: '보충 수업 + 동기부여 카드', usageCount: 25, effectiveness: 78, status: 'proposed', createdBy: 'AI' },
  { id: 4, task: '학부모 민원', solution: '즉시 통화 + 후속 메시지', usageCount: 18, effectiveness: 88, status: 'proposed', createdBy: '박원장' },
  { id: 5, task: '수업 태도', solution: '긍정 피드백 우선', usageCount: 12, effectiveness: 72, status: 'candidate', createdBy: '최선생' },
];

const STATUS_CONFIG = {
  standardized: { label: '표준', color: 'emerald', icon: '✅' },
  proposed: { label: '제안', color: 'yellow', icon: '💡' },
  candidate: { label: '후보', color: 'gray', icon: '📝' },
};

export default function ConsensusDashboard() {
  const [truthMode, setTruthMode] = useState(false);
  const [solutions, setSolutions] = useState(MOCK_SOLUTIONS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');

  // 통계
  const stats = {
    total: solutions.length,
    standardized: solutions.filter(s => s.status === 'standardized').length,
    proposed: solutions.filter(s => s.status === 'proposed').length,
    avgEffectiveness: Math.round(solutions.reduce((acc, s) => acc + s.effectiveness, 0) / solutions.length),
    totalUsage: solutions.reduce((acc, s) => acc + s.usageCount, 0),
  };

  const filteredSolutions = filter === 'all' 
    ? solutions 
    : solutions.filter(s => s.status === filter);

  const handleStandardize = (id) => {
    setSolutions(prev => prev.map(s => 
      s.id === id ? { ...s, status: 'standardized' } : s
    ));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            합의 엔진
          </h1>
          <p className="text-gray-500 mt-1">활용 기반 자동 합의 시스템</p>
        </div>
        <TruthModeToggle enabled={truthMode} onToggle={() => setTruthMode(!truthMode)} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">총 솔루션</p>
          {truthMode ? (
            <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
          ) : (
            <p className="text-2xl mt-2">📚 {stats.total}개</p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="emerald">
          <p className="text-xs text-gray-500 uppercase tracking-wider">표준화 완료</p>
          {truthMode ? (
            <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.standardized}</p>
          ) : (
            <p className="text-2xl mt-2">✅ {stats.standardized}개 확정</p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="purple">
          <p className="text-xs text-gray-500 uppercase tracking-wider">평균 실효성</p>
          {truthMode ? (
            <p className="text-3xl font-bold text-purple-400 mt-2">{stats.avgEffectiveness}%</p>
          ) : (
            <div className="mt-2">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.avgEffectiveness}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {stats.avgEffectiveness >= 80 ? '🎯 높음' : stats.avgEffectiveness >= 60 ? '📈 양호' : '📊 개선 필요'}
              </p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="cyan">
          <p className="text-xs text-gray-500 uppercase tracking-wider">총 활용 횟수</p>
          {truthMode ? (
            <p className="text-3xl font-bold text-cyan-400 mt-2">{stats.totalUsage}</p>
          ) : (
            <p className="text-2xl mt-2">🔄 {stats.totalUsage}회 사용</p>
          )}
        </GlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'standardized', 'proposed', 'candidate'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? '전체' : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Solutions List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredSolutions.map((solution, index) => {
            const statusConfig = STATUS_CONFIG[solution.status];
            const isTop = index === 0 && solution.status === 'standardized';

            return (
              <motion.div
                key={solution.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard 
                  className={`p-5 ${isTop ? 'border-2 border-yellow-500/50' : ''}`}
                  glowColor={isTop ? 'yellow' : statusConfig.color}
                  hoverable
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Top Badge */}
                      {isTop && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                            🏆 TOP 1
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{statusConfig.icon}</span>
                        <div>
                          <h3 className="font-bold text-lg">{solution.task}</h3>
                          <p className="text-gray-400 text-sm">{solution.solution}</p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">활용 횟수</p>
                          {truthMode ? (
                            <p className="font-mono text-cyan-400">{solution.usageCount}회</p>
                          ) : (
                            <div className="flex items-center gap-1">
                              {[...Array(Math.min(5, Math.ceil(solution.usageCount / 10)))].map((_, i) => (
                                <div key={i} className="w-2 h-4 bg-cyan-500/50 rounded" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">실효성</p>
                          {truthMode ? (
                            <p className={`font-mono ${
                              solution.effectiveness >= 80 ? 'text-emerald-400' :
                              solution.effectiveness >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {solution.effectiveness}%
                            </p>
                          ) : (
                            <p className="text-sm">
                              {solution.effectiveness >= 80 ? '🎯 높음' :
                               solution.effectiveness >= 60 ? '📈 양호' : '📊 개선'}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">제안자</p>
                          <p className="text-sm text-gray-300">{solution.createdBy}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                        {statusConfig.label}
                      </span>
                      
                      {solution.status === 'proposed' && (
                        <button
                          onClick={() => handleStandardize(solution.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-all"
                        >
                          표준화 →
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Info Banner */}
      <div className="mt-8 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-medium text-purple-300">자기반복 종말</p>
            <p className="text-sm text-gray-400">
              동일한 솔루션이 3회 이상 사용되면 자동으로 '제안' 상태로 승격됩니다.
              표준화된 솔루션은 전체 조직에서 공유됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
