// ═══════════════════════════════════════════════════════════════════════════════
// 👑 오너 대시보드 (Owner Dashboard)
// 목표 설정 + 예외 승인 + 결과 확인 통합 화면
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GoalSettingPanel } from './GoalSettingPanel';
import { ExceptionApprovalPanel } from './ExceptionApprovalPanel';
import { WeeklyReportPanel } from './WeeklyReportPanel';
import type { OwnerGoal, Exception } from './index';

type Tab = 'overview' | 'exceptions' | 'goals' | 'report';

export function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pendingExceptions, setPendingExceptions] = useState(2);

  const handleApprove = (exceptionId: string, alternativeId: string) => {
    console.log(`Approved: ${exceptionId} with ${alternativeId}`);
    setPendingExceptions(prev => Math.max(0, prev - 1));
  };

  const handleDelegate = (exceptionId: string, delegateTo: string) => {
    console.log(`Delegated: ${exceptionId} to ${delegateTo}`);
    setPendingExceptions(prev => Math.max(0, prev - 1));
  };

  const handleDirect = (exceptionId: string) => {
    console.log(`Direct handle: ${exceptionId}`);
  };

  const handleSaveGoals = (goals: OwnerGoal[]) => {
    console.log('Saved goals:', goals);
  };

  const tabs = [
    { id: 'overview' as Tab, label: '개요', icon: '🎛️' },
    { id: 'exceptions' as Tab, label: '예외 승인', icon: '⚠️', badge: pendingExceptions },
    { id: 'goals' as Tab, label: '목표', icon: '🎯' },
    { id: 'report' as Tab, label: '리포트', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <h1 className="text-xl font-bold">오너 조종석</h1>
              <p className="text-sm text-gray-500">온리쌤이 알아서 처리하고, 예외만 보고합니다</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">오늘</div>
              <div className="font-medium">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              O
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Quick Stats */}
            <div className="lg:col-span-2 grid grid-cols-4 gap-4">
              {[
                { label: '재원수', value: '132명', change: '+3', color: 'blue' },
                { label: '평균 온도', value: '68.5°', change: '+2.1', color: 'green' },
                { label: '위험 고객', value: '3명', change: '-1', color: 'red' },
                { label: '이번 주 자동 처리', value: '47건', change: '+12', color: 'purple' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
                >
                  <div className="text-sm text-gray-500">{stat.label}</div>
                  <div className="text-2xl font-bold mt-1">{stat.value}</div>
                  <div className={`text-sm mt-1 ${
                    stat.change.startsWith('+') 
                      ? stat.label === '위험 고객' ? 'text-red-500' : 'text-green-500'
                      : stat.label === '위험 고객' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.change}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pending Exceptions Summary */}
            {pendingExceptions > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚠️</span>
                      <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
                        예외 승인 대기
                      </h3>
                    </div>
                    <p className="text-red-600 dark:text-red-400 mt-1">
                      {pendingExceptions}건의 예외가 오너 결정을 기다리고 있습니다
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('exceptions')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    처리하기 →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Weekly Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <WeeklyReportPanel />
            </motion.div>

            {/* Goals Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <GoalSettingPanel goals={[]} onSaveGoals={handleSaveGoals} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'exceptions' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ExceptionApprovalPanel
              exceptions={[]}
              onApprove={handleApprove}
              onDelegate={handleDelegate}
              onDirect={handleDirect}
            />
          </motion.div>
        )}

        {activeTab === 'goals' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <GoalSettingPanel goals={[]} onSaveGoals={handleSaveGoals} />
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <WeeklyReportPanel />
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default OwnerDashboard;
