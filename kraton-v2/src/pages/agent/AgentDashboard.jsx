/**
 * AgentDashboard.jsx
 * AI 에이전트 대시보드 - Claude 상태 및 로그
 * 
 * AI 호출 로그, 토큰 사용량, 에러 추적
 * Truth Mode: 토큰 사용량 상세 표시
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// Mock 데이터
const MOCK_LOGS = [
  { id: 1, action: 'generateRewardCard', status: 'success', tokens: 1250, latency: 1.2, time: '10:32' },
  { id: 2, action: 'analyzeChurnRisk', status: 'success', tokens: 890, latency: 0.8, time: '10:30' },
  { id: 3, action: 'generateContent', status: 'success', tokens: 2100, latency: 2.1, time: '10:28' },
  { id: 4, action: 'generateThreeOptions', status: 'error', tokens: 0, latency: 0, time: '10:25', error: 'Rate limit exceeded' },
  { id: 5, action: 'generateRewardCard', status: 'success', tokens: 1180, latency: 1.1, time: '10:20' },
  { id: 6, action: 'analyzeData', status: 'success', tokens: 1560, latency: 1.4, time: '10:15' },
];

const MOCK_STATS = {
  totalCalls: 147,
  successRate: 96.5,
  totalTokens: 185420,
  avgLatency: 1.3,
  costToday: 0.42,
  costMonth: 12.85,
};

const ACTION_CONFIG = {
  generateRewardCard: { icon: '🎴', label: '보상 카드' },
  analyzeChurnRisk: { icon: '🚨', label: '퇴원 위험 분석' },
  generateContent: { icon: '📝', label: '콘텐츠 생성' },
  generateThreeOptions: { icon: '🎯', label: '3지 선택' },
  analyzeData: { icon: '📊', label: '데이터 분석' },
};

export default function AgentDashboard() {
  const [truthMode, setTruthMode] = useState(false);
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [stats, setStats] = useState(MOCK_STATS);
  const [aiStatus, setAiStatus] = useState('active'); // active, busy, error

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalCalls: prev.totalCalls + (Math.random() > 0.7 ? 1 : 0),
        totalTokens: prev.totalTokens + Math.floor(Math.random() * 500),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <span className="text-3xl">🤖</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              AI Agent
            </h1>
            <p className="text-gray-500">Claude AI 상태 모니터링</p>
          </div>
        </div>
        <TruthModeToggle enabled={truthMode} onToggle={() => setTruthMode(!truthMode)} />
      </div>

      {/* AI Status */}
      <GlassCard className="p-6 mb-8" glowColor="purple">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ 
                scale: aiStatus === 'active' ? [1, 1.1, 1] : 1,
                opacity: aiStatus === 'error' ? 0.5 : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-4 h-4 rounded-full ${
                aiStatus === 'active' ? 'bg-emerald-500' :
                aiStatus === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
            <div>
              <h3 className="font-bold text-lg">
                {aiStatus === 'active' ? 'Claude AI Active' :
                 aiStatus === 'busy' ? 'Processing...' : 'Error Detected'}
              </h3>
              <p className="text-gray-500 text-sm">
                claude-3-5-sonnet-20241022 · Anthropic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500">응답 시간</p>
              {truthMode ? (
                <p className="font-mono text-cyan-400">{stats.avgLatency.toFixed(2)}s</p>
              ) : (
                <p className="text-sm">{stats.avgLatency < 1.5 ? '⚡ 빠름' : '🔄 보통'}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">성공률</p>
              {truthMode ? (
                <p className="font-mono text-emerald-400">{stats.successRate}%</p>
              ) : (
                <p className="text-sm">{stats.successRate >= 95 ? '🎯 최적' : '📊 양호'}</p>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">오늘 호출</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-white mt-2">{stats.totalCalls}</p>
          ) : (
            <p className="text-2xl mt-2">📊 {stats.totalCalls}회</p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="cyan">
          <p className="text-xs text-gray-500 uppercase tracking-wider">총 토큰</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-cyan-400 mt-2">
              {(stats.totalTokens / 1000).toFixed(1)}K
            </p>
          ) : (
            <div className="mt-2">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.totalTokens / 500000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {stats.totalTokens > 300000 ? '📈 높음' : '📊 보통'}
              </p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="yellow">
          <p className="text-xs text-gray-500 uppercase tracking-wider">오늘 비용</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-yellow-400 mt-2">
              ${stats.costToday.toFixed(2)}
            </p>
          ) : (
            <p className="text-2xl mt-2">
              {stats.costToday < 0.5 ? '💰 절약' : stats.costToday < 1 ? '📊 보통' : '⚠️ 주의'}
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="purple">
          <p className="text-xs text-gray-500 uppercase tracking-wider">이번 달 비용</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-purple-400 mt-2">
              ${stats.costMonth.toFixed(2)}
            </p>
          ) : (
            <p className="text-2xl mt-2">
              {stats.costMonth < 10 ? '✅ 예산 내' : '📊 관리 필요'}
            </p>
          )}
        </GlassCard>
      </div>

      {/* Logs Table */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">호출 로그</h3>
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all">
            전체 보기 →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">시간</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">액션</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">상태</th>
                {truthMode && (
                  <>
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">토큰</th>
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">지연</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {logs.map((log, index) => {
                  const actionConfig = ACTION_CONFIG[log.action] || { icon: '🔧', label: log.action };
                  
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-gray-800/50 ${
                        log.status === 'error' ? 'bg-red-900/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="text-gray-400 font-mono text-sm">{log.time}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{actionConfig.icon}</span>
                          <span className="text-sm">{actionConfig.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'success' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {log.status === 'success' ? '✓ 성공' : '✗ 실패'}
                        </span>
                      </td>
                      {truthMode && (
                        <>
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm text-cyan-400">
                              {log.tokens.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm text-gray-400">
                              {log.latency > 0 ? `${log.latency}s` : '-'}
                            </span>
                          </td>
                        </>
                      )}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Error Alert */}
      {logs.some(l => l.status === 'error') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-red-400">최근 에러 감지</p>
              <p className="text-sm text-gray-400">
                {logs.find(l => l.status === 'error')?.error || '알 수 없는 에러'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
