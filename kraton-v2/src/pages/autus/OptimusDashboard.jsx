/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ OPTIMUS DASHBOARD - Execution Operator
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 자동화율: 98%
 * 
 * 흡수된 모듈:
 * - Opinion Shaper → Public Opinion & Crisis Response
 * - Indirect Affected Party → CSR & Social Impact Response
 * - Capital & Pressure Enabler (실행) → Investor Relations Execution
 */

import React, { useState, memo, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load Crisis Response Module
const CrisisResponseModule = lazy(() => import('../../components/optimus/CrisisResponseModule'));

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    h3: 'text-lg font-medium',
  },
  colors: {
    optimus: '#00CC66',
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    warning: '#F59E0B',
  },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_OPINION_DATA = {
  status: 'monitoring',
  realtimeSentiment: 0.68,
  mentions24h: 3420,
  channels: [
    { id: 'x', name: 'X/Twitter', mentions: 1890, sentiment: 0.72, alerts: 2 },
    { id: 'news', name: 'News', mentions: 234, sentiment: 0.58, alerts: 1 },
    { id: 'community', name: 'Community', mentions: 856, sentiment: 0.75, alerts: 0 },
    { id: 'review', name: 'Reviews', mentions: 440, sentiment: 0.62, alerts: 0 },
  ],
  pendingResponses: [
    { id: 1, type: 'negative', platform: 'X', content: '@회사명 서비스 장애 4시간째...', reach: 12400, status: 'draft_ready', draftResponse: '불편을 드려 죄송합니다. 현재 복구 작업 중이며...' },
    { id: 2, type: 'inquiry', platform: 'News', content: '업계 리더 인터뷰 요청', reach: 0, status: 'awaiting_approval', draftResponse: '감사합니다. 일정 조율 후 연락드리겠습니다.' },
  ],
  generatedContent: [
    { id: 1, type: 'pr', title: 'Q1 성과 보도자료', status: 'approved', publishDate: '2024-01-15' },
    { id: 2, type: 'meme', title: 'AI 자동화 밈 시리즈', status: 'pending', publishDate: null },
  ],
};

const MOCK_CSR_DATA = {
  impactScore: 78,
  activeInitiatives: [
    { id: 1, name: '지역 교육 지원 프로그램', status: 'active', impact: 'high', beneficiaries: 450, nextMilestone: '2월 졸업식' },
    { id: 2, name: '친환경 오피스 전환', status: 'active', impact: 'medium', beneficiaries: 0, nextMilestone: 'LED 전환 완료' },
    { id: 3, name: '장학금 펀드', status: 'planning', impact: 'high', beneficiaries: 0, nextMilestone: '재단 설립' },
  ],
  communityAlerts: [
    { id: 1, source: '지역 뉴스', issue: '교통 혼잡 민원', sentiment: -0.3, autoResponse: 'CSR 보고서 업데이트 예정' },
  ],
  reports: [
    { id: 1, title: '2023 CSR 연간 보고서', status: 'published', downloads: 234 },
    { id: 2, title: 'Q4 지역사회 영향 보고서', status: 'generating', downloads: 0 },
  ],
};

const MOCK_IR_DATA = {
  nextReport: { type: '월간 IR', dueDate: '2024-01-20', status: 'generating' },
  communications: [
    { id: 1, investor: 'VC Fund Alpha', type: 'update', status: 'sent', date: '2024-01-10', response: 'positive' },
    { id: 2, investor: 'Strategic Partner B', type: 'meeting_request', status: 'pending', date: null, response: null },
  ],
  autoReports: [
    { id: 1, title: '주간 KPI 대시보드', recipients: 5, lastSent: '2024-01-08' },
    { id: 2, title: '월간 재무 요약', recipients: 3, lastSent: '2024-01-01' },
  ],
};

const MOCK_EXECUTION_QUEUE = [
  { id: 1, type: 'customer', task: '김OO 학생 케어 콜', priority: 'high', eta: '10분', status: 'executing' },
  { id: 2, type: 'attendance', task: '오전 출결 알림 발송', priority: 'medium', eta: '완료', status: 'completed' },
  { id: 3, type: 'report', task: '주간 보고서 생성', priority: 'low', eta: '15분', status: 'queued' },
  { id: 4, type: 'billing', task: '미납 알림 발송 (3건)', priority: 'medium', eta: '30분', status: 'queued' },
  { id: 5, type: 'feedback', task: '설문 결과 분석', priority: 'low', eta: '1시간', status: 'queued' },
];

const MOCK_KRATON_TEAMS = [
  { id: 'attendance', name: 'Attendance & Workflow', tasks: 12, completed: 10, automation: 98 },
  { id: 'customer', name: 'Customer Obsession', tasks: 8, completed: 5, automation: 95 },
  { id: 'regulatory', name: 'Regulatory Execution', tasks: 3, completed: 3, automation: 100 },
  { id: 'supply', name: 'Supply Chain', tasks: 5, completed: 4, automation: 92 },
];

// ============================================
// PUBLIC OPINION MODULE
// ============================================
const PublicOpinionModule = memo(function PublicOpinionModule({ data }) {
  const [expandedResponse, setExpandedResponse] = useState(null);
  
  const getSentimentColor = (sentiment) => {
    if (sentiment >= 0.7) return 'text-emerald-400';
    if (sentiment >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white flex items-center gap-2`}>
            📢 Public Opinion & Crisis Response
          </h2>
          <p className="text-gray-400 text-sm mt-1">흡수: Opinion Shaper</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm ${
            data.status === 'monitoring' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {data.status === 'monitoring' ? '🟢 모니터링 중' : '🔴 위기 대응'}
          </span>
        </div>
      </div>
      
      {/* Real-time Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-900/50 rounded-xl">
        <div className="text-center">
          <p className="text-xs text-gray-500">실시간 감성</p>
          <p className={`text-2xl font-bold ${getSentimentColor(data.realtimeSentiment)}`}>
            {(data.realtimeSentiment * 100).toFixed(0)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">24h 언급</p>
          <p className="text-2xl font-bold text-white">{data.mentions24h.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">대응 대기</p>
          <p className="text-2xl font-bold text-orange-400">{data.pendingResponses.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">자동 생성</p>
          <p className="text-2xl font-bold text-cyan-400">{data.generatedContent.length}</p>
        </div>
      </div>
      
      {/* Channel Monitoring */}
      <div className="mb-6">
        <h3 className="text-gray-300 font-medium mb-3">📡 채널별 모니터링</h3>
        <div className="grid grid-cols-4 gap-2">
          {data.channels.map((ch) => (
            <div key={ch.id} className="p-3 bg-gray-900/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">{ch.name}</span>
                {ch.alerts > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                    {ch.alerts}
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-gray-300">{ch.mentions.toLocaleString()}</p>
              <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${ch.sentiment >= 0.6 ? 'bg-emerald-500' : ch.sentiment >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${ch.sentiment * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Pending Responses */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">✍️ 자동 생성 응답 (Owner 승인 대기)</h3>
        <div className="space-y-2">
          {data.pendingResponses.map((resp) => (
            <div key={resp.id} className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      resp.type === 'negative' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {resp.platform}
                    </span>
                    {resp.reach > 0 && (
                      <span className="text-xs text-gray-500">도달: {resp.reach.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-white text-sm">{resp.content}</p>
                  <p className="text-emerald-400 text-xs mt-2 p-2 bg-emerald-500/10 rounded">
                    → {resp.draftResponse}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30">
                    ✓ 승인
                  </button>
                  <button className="px-3 py-1 bg-gray-700 text-gray-400 rounded text-xs hover:bg-gray-600">
                    수정
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// CSR MODULE
// ============================================
const CSRModule = memo(function CSRModule({ data }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white flex items-center gap-2`}>
            🌍 CSR & Social Impact Response
          </h2>
          <p className="text-gray-400 text-sm mt-1">흡수: Indirect Affected Party</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Impact Score</p>
          <p className="text-2xl font-bold text-emerald-400">{data.impactScore}</p>
        </div>
      </div>
      
      {/* Active Initiatives */}
      <div className="mb-6">
        <h3 className="text-gray-300 font-medium mb-3">🎯 활성 이니셔티브</h3>
        <div className="space-y-2">
          {data.activeInitiatives.map((init) => (
            <div key={init.id} className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    init.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {init.status}
                  </span>
                  <span className="text-white">{init.name}</span>
                </div>
                <span className={`text-xs ${
                  init.impact === 'high' ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {init.impact} impact
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                {init.beneficiaries > 0 && (
                  <span className="text-gray-500">{init.beneficiaries}명 수혜</span>
                )}
                <span className="text-cyan-400">→ {init.nextMilestone}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Community Alerts */}
      {data.communityAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-300 font-medium mb-3">🚨 커뮤니티 알림</h3>
          {data.communityAlerts.map((alert) => (
            <div key={alert.id} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-yellow-400">{alert.source}</span>
                <span className="text-xs text-gray-500">감성: {(alert.sentiment * 100).toFixed(0)}%</span>
              </div>
              <p className="text-white text-sm">{alert.issue}</p>
              <p className="text-emerald-400 text-xs mt-2">→ {alert.autoResponse}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Reports */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">📄 자동 생성 보고서</h3>
        <div className="space-y-2">
          {data.reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-xl">
              <div>
                <p className="text-white text-sm">{report.title}</p>
                <span className={`text-xs ${
                  report.status === 'published' ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {report.status === 'published' ? '✓ 발행됨' : '⏳ 생성 중'}
                </span>
              </div>
              {report.downloads > 0 && (
                <span className="text-gray-500 text-sm">{report.downloads} 다운로드</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// IR EXECUTION MODULE
// ============================================
const IRExecutionModule = memo(function IRExecutionModule({ data }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white flex items-center gap-2`}>
            📊 Investor Relations Execution
          </h2>
          <p className="text-gray-400 text-sm mt-1">흡수: Capital & Pressure (실행)</p>
        </div>
      </div>
      
      {/* Next Report */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">다음 리포트</p>
            <p className="text-white font-medium">{data.nextReport.type}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">마감</p>
            <p className="text-cyan-400">{data.nextReport.dueDate}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            data.nextReport.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {data.nextReport.status === 'generating' ? '⏳ 생성 중' : '✓ 완료'}
          </span>
        </div>
      </div>
      
      {/* Communications */}
      <div className="mb-6">
        <h3 className="text-gray-300 font-medium mb-3">💬 투자자 커뮤니케이션</h3>
        <div className="space-y-2">
          {data.communications.map((comm) => (
            <div key={comm.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
              <div>
                <p className="text-white text-sm">{comm.investor}</p>
                <span className="text-xs text-gray-500">{comm.type}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                comm.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {comm.status === 'sent' ? `✓ ${comm.response}` : '⏳ pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Auto Reports */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">📤 자동 발송 리포트</h3>
        <div className="space-y-2">
          {data.autoReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-xl">
              <div>
                <p className="text-white text-sm">{report.title}</p>
                <span className="text-xs text-gray-500">{report.recipients}명 수신</span>
              </div>
              <span className="text-gray-500 text-xs">최근: {report.lastSent}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// EXECUTION QUEUE
// ============================================
const ExecutionQueue = memo(function ExecutionQueue({ tasks }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'executing': return 'bg-cyan-500/20 text-cyan-400';
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-gray-700 text-gray-400';
    }
  };
  
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${TOKENS.type.h2} text-white`}>⚡ Execution Queue</h2>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
          {tasks.filter(t => t.status === 'executing').length} 실행 중
        </span>
      </div>
      
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(task.status)}`}>
                {task.status === 'executing' ? '▶' : task.status === 'completed' ? '✓' : '○'}
              </span>
              <div>
                <p className="text-white text-sm">{task.task}</p>
                <span className={`text-xs ${getPriorityStyle(task.priority)}`}>
                  {task.priority} priority
                </span>
              </div>
            </div>
            <span className="text-gray-400 text-sm">{task.eta}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// KRATON TEAMS STATUS
// ============================================
const KratonTeamsStatus = memo(function KratonTeamsStatus({ teams }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h2 className={`${TOKENS.type.h2} text-white mb-4`}>🍕 KRATON Teams</h2>
      
      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="p-3 bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">{team.name}</span>
              <span className="text-emerald-400 text-sm">{team.automation}% auto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(team.completed / team.tasks) * 100}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs">{team.completed}/{team.tasks}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN OPTIMUS DASHBOARD
// ============================================
export default function OptimusDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: '전체 현황', icon: '📊' },
    { id: 'opinion', label: 'Opinion Response', icon: '📢' },
    { id: 'csr', label: 'CSR Response', icon: '🌍' },
    { id: 'ir', label: 'IR Execution', icon: '📊' },
  ];
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white flex items-center gap-3`}>
            <span className="text-4xl">⚡</span>
            Optimus Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Execution Operator · 98% 자동화</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-medium">
            ⚡ Auto-Execution Active
          </span>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <PublicOpinionModule data={MOCK_OPINION_DATA} />
            <div className="grid grid-cols-2 gap-6">
              <CSRModule data={MOCK_CSR_DATA} />
              <IRExecutionModule data={MOCK_IR_DATA} />
            </div>
          </div>
          <div className="space-y-6">
            <ExecutionQueue tasks={MOCK_EXECUTION_QUEUE} />
            <KratonTeamsStatus teams={MOCK_KRATON_TEAMS} />
          </div>
        </div>
      )}
      
      {activeTab === 'opinion' && (
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">Loading Crisis Module...</div>
          </div>
        }>
          <CrisisResponseModule />
        </Suspense>
      )}
      
      {activeTab === 'csr' && (
        <div className="max-w-4xl">
          <CSRModule data={MOCK_CSR_DATA} />
        </div>
      )}
      
      {activeTab === 'ir' && (
        <div className="max-w-4xl">
          <IRExecutionModule data={MOCK_IR_DATA} />
        </div>
      )}
      
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">실행 대기</p>
            <p className="text-lg font-bold text-orange-400">
              {MOCK_EXECUTION_QUEUE.filter(t => t.status === 'queued').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">오늘 완료</p>
            <p className="text-lg font-bold text-emerald-400">127</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">자동화율</p>
            <p className="text-lg font-bold text-emerald-400">98%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">V 피드백</p>
            <p className="text-lg font-bold text-cyan-400">+234</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
            🎯 FSD 보고
          </button>
          <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
            👑 C-Level 에스컬레이션
          </button>
        </div>
      </div>
    </div>
  );
}
