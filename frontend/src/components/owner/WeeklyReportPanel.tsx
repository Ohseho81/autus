// ═══════════════════════════════════════════════════════════════════════════════
// 📊 주간 리포트 패널 (Weekly Report Panel)
// 오너가 결과를 한눈에 확인
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import type { WeeklyStats, OwnerGoal } from './index';

interface WeeklyReportPanelProps {
  stats?: WeeklyStats;
}

const MOCK_STATS: WeeklyStats = {
  week: '2025년 1월 4주차',
  autoProcessed: 47,
  ownerApproved: 3,
  successRate: 94,
  goals: [
    { id: 'customer_count', metric: 'customerCount', label: '재원수', current: 132, target: 150, unit: '명', progress: 88, status: 'at_risk' },
    { id: 'churn_rate', metric: 'churnRate', label: '이탈률', current: 5, target: 3, unit: '%', progress: 60, status: 'behind' },
    { id: 'satisfaction', metric: 'satisfaction', label: '만족도', current: 4.2, target: 4.5, unit: '점', progress: 93, status: 'on_track' },
  ],
  nextWeekForecast: [
    '시험 시즌 σ↓ 예상',
    'D학원 프로모션 대응 필요',
    '위험 고객 3명 집중 케어 필요',
  ],
};

export function WeeklyReportPanel({ stats = MOCK_STATS }: WeeklyReportPanelProps) {
  const getStatusEmoji = (status: OwnerGoal['status']) => {
    switch (status) {
      case 'achieved': return '✅';
      case 'on_track': return '🟢';
      case 'at_risk': return '🟡';
      case 'behind': return '🔴';
    }
  };

  const totalProcessed = stats.autoProcessed + stats.ownerApproved;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📊</span> Weekly Report
          </h2>
          <p className="text-sm text-gray-500 mt-1">{stats.week}</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
          상세 보기 →
        </button>
      </div>

      {/* Goals Progress */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">목표 진행률</h3>
        <div className="space-y-3">
          {stats.goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4"
            >
              <span className="text-lg">{getStatusEmoji(goal.status)}</span>
              <span className="w-20 text-sm font-medium">{goal.label}</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress}%` }}
                  transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                  className={`h-full rounded-full ${
                    goal.status === 'achieved' ? 'bg-green-500' :
                    goal.status === 'on_track' ? 'bg-blue-500' :
                    goal.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
              </div>
              <span className="text-sm font-medium w-24 text-right">
                {goal.current}{goal.unit} / {goal.target}{goal.unit}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Processing Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.autoProcessed}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">자동 처리</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats.ownerApproved}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">오너 승인</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.successRate}%
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">성공률</div>
        </motion.div>
      </div>

      {/* Automation Rate */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">자동화 비율</span>
          <span className="text-sm text-gray-500">
            {Math.round((stats.autoProcessed / totalProcessed) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(stats.autoProcessed / totalProcessed) * 100}%` }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-blue-500"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(stats.ownerApproved / totalProcessed) * 100}%` }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-full bg-purple-500"
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>🤖 자동 {stats.autoProcessed}건</span>
          <span>👑 수동 {stats.ownerApproved}건</span>
        </div>
      </motion.div>

      {/* Next Week Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4"
      >
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <span>🔮</span> 다음 주 예상
        </h3>
        <ul className="space-y-2">
          {stats.nextWeekForecast.map((forecast, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-orange-500">•</span>
              <span className="text-orange-700 dark:text-orange-300">{forecast}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

export default WeeklyReportPanel;
