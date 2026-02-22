// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 목표 설정 패널 (Goal Setting Panel)
// 오너가 핵심 목표를 설정하면 온리쌤이 모든 것을 정렬
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { OwnerGoal } from './index';

interface GoalSettingPanelProps {
  goals: OwnerGoal[];
  onSaveGoals: (goals: OwnerGoal[]) => void;
}

const DEFAULT_GOALS: OwnerGoal[] = [
  { id: 'customer_count', metric: 'customerCount', label: '재원수', current: 132, target: 150, unit: '명', progress: 88, status: 'at_risk' },
  { id: 'churn_rate', metric: 'churnRate', label: '이탈률', current: 5, target: 3, unit: '%', progress: 60, status: 'behind' },
  { id: 'satisfaction', metric: 'satisfaction', label: '만족도', current: 4.2, target: 4.5, unit: '점', progress: 93, status: 'on_track' },
];

export function GoalSettingPanel({ goals = DEFAULT_GOALS, onSaveGoals }: GoalSettingPanelProps) {
  const [editingGoals, setEditingGoals] = useState<OwnerGoal[]>(goals);
  const [isEditing, setIsEditing] = useState(false);

  const handleTargetChange = (goalId: string, newTarget: number) => {
    setEditingGoals(prev => 
      prev.map(g => g.id === goalId ? { ...g, target: newTarget } : g)
    );
  };

  const handleSave = () => {
    onSaveGoals(editingGoals);
    setIsEditing(false);
  };

  const getStatusColor = (status: OwnerGoal['status']) => {
    switch (status) {
      case 'achieved': return 'text-green-500';
      case 'on_track': return 'text-blue-500';
      case 'at_risk': return 'text-yellow-500';
      case 'behind': return 'text-red-500';
    }
  };

  const getStatusIcon = (status: OwnerGoal['status']) => {
    switch (status) {
      case 'achieved': return '✅';
      case 'on_track': return '🟢';
      case 'at_risk': return '🟡';
      case 'behind': return '🔴';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🎯</span> 핵심 목표
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            목표를 설정하면 온리쌤이 모든 것을 정렬합니다
          </p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            수정
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              저장
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {editingGoals.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border dark:border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getStatusIcon(goal.status)}</span>
                <div>
                  <h3 className="font-semibold">{goal.label}</h3>
                  <p className={`text-sm ${getStatusColor(goal.status)}`}>
                    {goal.status === 'achieved' ? '달성' :
                     goal.status === 'on_track' ? '정상 진행' :
                     goal.status === 'at_risk' ? '주의 필요' : '목표 미달'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {goal.current}{goal.unit}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">목표:</span>
                    <input
                      type="number"
                      value={goal.target}
                      onChange={(e) => handleTargetChange(goal.id, parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-500">{goal.unit}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    목표: {goal.target}{goal.unit}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className={`absolute h-full rounded-full ${
                  goal.status === 'achieved' ? 'bg-green-500' :
                  goal.status === 'on_track' ? 'bg-blue-500' :
                  goal.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0</span>
              <span>{goal.progress}%</span>
              <span>{goal.target}{goal.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI 추천 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <span>🤖</span>
          <span className="font-medium text-purple-700 dark:text-purple-300">AI 추천</span>
        </div>
        <p className="text-sm text-purple-600 dark:text-purple-400">
          현재 이탈률을 낮추기 위해 <strong>위험 고객 8명</strong>에 대한 집중 케어가 필요합니다.
          가치 상담 전략을 적용하면 목표 달성 확률이 <strong>78%</strong>로 상승합니다.
        </p>
        <button className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors">
          전략 시뮬레이션 →
        </button>
      </motion.div>
    </div>
  );
}

export default GoalSettingPanel;
