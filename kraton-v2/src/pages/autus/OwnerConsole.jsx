/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👑 OWNER CONSOLE - C-Level Vision & Resource Director
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * V = (M - T) × (1 + s)^t
 * 
 * - 전체 V-나선 그래프 실시간 감독
 * - External Impact Score 모니터링
 * - Fight/Absorb/Ignore 최종 결정
 * - 자원 배분 및 Bureaucracy Killer
 */

import React, { useState, memo, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVEngine } from '../../hooks/useVEngine';
import { VSpiral, VMetricsPanel, VFlowActivity, VTopNodes } from '../../components/v-engine/VSpiral';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    h3: 'text-lg font-medium',
  },
  tier: {
    c_level: { color: '#FFD700', bg: 'from-yellow-500/20 to-amber-500/20' },
    fsd: { color: '#00AAFF', bg: 'from-cyan-500/20 to-blue-500/20' },
    optimus: { color: '#00CC66', bg: 'from-emerald-500/20 to-green-500/20' },
  },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_V_DATA = {
  totalV: 12847,
  change24h: +342,
  changePercent: 2.73,
  tiers: {
    c_level: { v: 4521, automation: 18 },
    fsd: { v: 5234, automation: 82 },
    optimus: { v: 3092, automation: 97 },
  },
};

const MOCK_EXTERNAL_IMPACTS = [
  { id: 1, source: 'Opinion Shaper', type: 'negative', score: -23, description: 'X에서 부정적 언급 급증 (+340%)', status: 'pending', urgency: 'high' },
  { id: 2, source: 'Ecosystem Observer', type: 'neutral', score: 0, description: '경쟁사 신규 서비스 출시 예정', status: 'pending', urgency: 'medium' },
  { id: 3, source: 'Capital Pressure', type: 'positive', score: +15, description: '투자자 추가 투자 의향 표명', status: 'pending', urgency: 'low' },
  { id: 4, source: 'Indirect Affected', type: 'negative', score: -8, description: '지역 환경 단체 우려 표명', status: 'absorbed', urgency: 'medium' },
];

const MOCK_RESOURCES = [
  { id: 'budget', name: '예산', allocated: 78, total: 100, unit: 'M₩' },
  { id: 'headcount', name: '인력', allocated: 42, total: 50, unit: '명' },
  { id: 'ai_agents', name: 'AI 에이전트', allocated: 156, total: 200, unit: '개' },
  { id: 'compute', name: '컴퓨팅', allocated: 89, total: 100, unit: '%' },
];

const MOCK_WORKFLOWS = [
  { id: 1, name: '주간 보고서 3단계 승인', steps: 3, avgTime: '4.2일', status: 'active', impact: 'low' },
  { id: 2, name: '비용 처리 5단계 검토', steps: 5, avgTime: '7.1일', status: 'active', impact: 'high' },
  { id: 3, name: '휴가 신청 2단계 승인', steps: 2, avgTime: '1.5일', status: 'killed', impact: 'low' },
];

// ============================================
// V-SPIRAL OVERVIEW
// ============================================
const VSpiralOverview = memo(function VSpiralOverview({ data }) {
  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-blue-500/10 rounded-3xl p-6 border border-purple-500/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white`}>🌀 V-나선 전체 현황</h2>
          <p className="text-gray-400 text-sm mt-1">실시간 조직 가치 지표</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-white">{data.totalV.toLocaleString()}</p>
          <p className={`text-sm ${data.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.change24h >= 0 ? '↑' : '↓'} {Math.abs(data.change24h)} ({data.changePercent}%)
          </p>
        </div>
      </div>
      
      {/* Tier Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(data.tiers).map(([tier, values]) => {
          const config = TOKENS.tier[tier];
          const tierNames = { c_level: 'C-Level', fsd: 'FSD', optimus: 'Optimus' };
          return (
            <div 
              key={tier}
              className={`p-4 rounded-xl bg-gradient-to-br ${config.bg} border border-white/10`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: config.color }}>
                  {tierNames[tier]}
                </span>
                <span className="text-xs text-gray-400">{values.automation}% 자동화</span>
              </div>
              <p className="text-2xl font-bold text-white">{values.v.toLocaleString()}</p>
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${values.automation}%`, backgroundColor: config.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// EXTERNAL IMPACT CONTROL
// ============================================
const ExternalImpactControl = memo(function ExternalImpactControl({ impacts, onDecision }) {
  const totalScore = impacts.reduce((sum, i) => sum + i.score, 0);
  const pendingCount = impacts.filter(i => i.status === 'pending').length;
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white`}>🎯 External Impact Control</h2>
          <p className="text-gray-400 text-sm mt-1">외부 영향 분석 및 대응 결정</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 bg-gray-900/50 rounded-xl">
            <p className="text-xs text-gray-400">Total Score</p>
            <p className={`text-xl font-bold ${totalScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalScore >= 0 ? '+' : ''}{totalScore}
            </p>
          </div>
          <div className="text-center px-4 py-2 bg-orange-500/20 rounded-xl">
            <p className="text-xs text-orange-400">Pending</p>
            <p className="text-xl font-bold text-orange-400">{pendingCount}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {impacts.map((impact) => (
          <motion.div
            key={impact.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              impact.status === 'pending' 
                ? 'bg-gray-900/50 border-gray-700/50' 
                : 'bg-gray-900/30 border-gray-800/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    impact.type === 'negative' ? 'bg-red-500/20 text-red-400' :
                    impact.type === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {impact.source}
                  </span>
                  <span className={`text-xs ${
                    impact.urgency === 'high' ? 'text-red-400' :
                    impact.urgency === 'medium' ? 'text-yellow-400' :
                    'text-gray-500'
                  }`}>
                    {impact.urgency === 'high' ? '🔴 긴급' : impact.urgency === 'medium' ? '🟡 중간' : '🟢 낮음'}
                  </span>
                </div>
                <p className="text-white">{impact.description}</p>
                <p className={`text-sm mt-1 ${
                  impact.score >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Impact Score: {impact.score >= 0 ? '+' : ''}{impact.score}
                </p>
              </div>
              
              {impact.status === 'pending' && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onDecision(impact.id, 'fight')}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    ⚔️ Fight
                  </button>
                  <button
                    onClick={() => onDecision(impact.id, 'absorb')}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                  >
                    🔄 Absorb
                  </button>
                  <button
                    onClick={() => onDecision(impact.id, 'ignore')}
                    className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    ➖ Ignore
                  </button>
                </div>
              )}
              
              {impact.status !== 'pending' && (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                  ✓ {impact.status}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// RESOURCE ALLOCATION
// ============================================
const ResourceAllocation = memo(function ResourceAllocation({ resources }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h2 className={`${TOKENS.type.h2} text-white mb-4`}>💰 자원 배분 현황</h2>
      
      <div className="space-y-4">
        {resources.map((res) => {
          const percent = (res.allocated / res.total) * 100;
          return (
            <div key={res.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300">{res.name}</span>
                <span className="text-white font-medium">
                  {res.allocated}/{res.total} {res.unit}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-colors">
        자원 재배분 →
      </button>
    </div>
  );
});

// ============================================
// BUREAUCRACY KILLER
// ============================================
const BureaucracyKiller = memo(function BureaucracyKiller({ workflows, onKill }) {
  const inefficientCount = workflows.filter(w => w.status === 'active' && w.impact === 'high').length;
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white`}>🔪 Bureaucracy Killer</h2>
          <p className="text-gray-400 text-sm mt-1">비효율적 워크플로우 제거</p>
        </div>
        {inefficientCount > 0 && (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
            {inefficientCount}개 비효율 감지
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {workflows.map((wf) => (
          <div 
            key={wf.id}
            className={`p-4 rounded-xl border ${
              wf.status === 'killed' 
                ? 'bg-gray-900/30 border-gray-800/50 opacity-50' 
                : 'bg-gray-900/50 border-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${wf.status === 'killed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {wf.name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                  <span>{wf.steps}단계</span>
                  <span>평균 {wf.avgTime}</span>
                  <span className={wf.impact === 'high' ? 'text-red-400' : 'text-gray-500'}>
                    {wf.impact === 'high' ? '⚠️ 고영향' : '저영향'}
                  </span>
                </div>
              </div>
              
              {wf.status === 'active' ? (
                <button
                  onClick={() => onKill(wf.id)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  🔪 Kill
                </button>
              ) : (
                <span className="text-emerald-400 text-sm">✓ Killed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// TIER STATUS CARDS
// ============================================
const TierStatusCards = memo(function TierStatusCards() {
  const tiers = [
    { 
      name: 'FSD', 
      role: 'Judgment & Allocation', 
      status: 'active', 
      tasks: 12, 
      automation: 82,
      color: '#00AAFF',
      icon: '🎯',
    },
    { 
      name: 'Optimus', 
      role: 'Execution Operator', 
      status: 'active', 
      tasks: 47, 
      automation: 97,
      color: '#00CC66',
      icon: '⚡',
    },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {tiers.map((tier) => (
        <div 
          key={tier.name}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tier.icon}</span>
              <div>
                <p className="font-medium" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-xs text-gray-500">{tier.role}</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
              {tier.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">활성 태스크</span>
            <span className="text-white font-medium">{tier.tasks}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-400">자동화율</span>
            <span style={{ color: tier.color }}>{tier.automation}%</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ============================================
// MAIN OWNER CONSOLE
// ============================================
export default function OwnerConsole() {
  // V-Engine 실시간 연동
  const { 
    nodes, 
    flows, 
    metrics, 
    topNodes, 
    recentActivity,
    isLoading, 
    isConnected,
    refresh 
  } = useVEngine('org-1', true); // useMock = true

  const [impacts, setImpacts] = useState(MOCK_EXTERNAL_IMPACTS);
  const [resources, setResources] = useState(MOCK_RESOURCES);
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS);
  const [showVEngineDetail, setShowVEngineDetail] = useState(false);

  // V-Engine 데이터를 기존 형식으로 변환
  const vData = useMemo(() => ({
    totalV: Math.round(metrics.totalVIndex || 0),
    change24h: Math.round(metrics.sqValue * 100) || 0,
    changePercent: ((metrics.sqValue || 0) * 10).toFixed(2),
    tiers: {
      c_level: { v: Math.round((metrics.totalVIndex || 0) * 0.35), automation: 20 },
      fsd: { v: Math.round((metrics.totalVIndex || 0) * 0.40), automation: 80 },
      optimus: { v: Math.round((metrics.totalVIndex || 0) * 0.25), automation: 98 },
    },
  }), [metrics]);
  
  const handleImpactDecision = (id, decision) => {
    setImpacts(impacts.map(i => 
      i.id === id ? { ...i, status: decision } : i
    ));
  };
  
  const handleKillWorkflow = (id) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, status: 'killed' } : w
    ));
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white flex items-center gap-3`}>
            <span className="text-4xl">👑</span>
            Owner Console
          </h1>
          <p className="text-gray-400 mt-1">C-Level · Vision & Resource Director · 20% 자동화</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-medium">{isConnected ? 'V-Engine Live' : 'Disconnected'}</span>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            🔄 Refresh
          </button>
          <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl font-medium">
            🏛️ AUTUS Control Center
          </span>
        </div>
      </div>
      
      {/* V-Engine Real-time Dashboard */}
      <div className="grid grid-cols-4 gap-4">
        {/* V-Spiral Visualization */}
        <div className="col-span-2 row-span-2">
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-cyan-400">🌀</span>
                V-Spiral Live
              </h2>
              <button
                onClick={() => setShowVEngineDetail(!showVEngineDetail)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showVEngineDetail ? '간략히' : '상세보기'} →
              </button>
            </div>
            <VSpiral 
              nodes={nodes} 
              metrics={metrics}
              size={360}
              showLabels={true}
            />
          </div>
        </div>
        
        {/* V-Metrics Panel */}
        <div className="col-span-2">
          <VMetricsPanel metrics={metrics} />
        </div>
        
        {/* Top Nodes + Recent Activity */}
        <div className="col-span-1">
          <VTopNodes nodes={topNodes} maxItems={4} />
        </div>
        <div className="col-span-1">
          <VFlowActivity flows={recentActivity} maxItems={6} />
        </div>
      </div>

      {/* V-Spiral Overview (기존 - 티어별 요약) */}
      <VSpiralOverview data={vData} />
      
      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: External Impact Control */}
        <div className="col-span-2">
          <ExternalImpactControl 
            impacts={impacts} 
            onDecision={handleImpactDecision}
          />
        </div>
        
        {/* Right: Resource + Tier Status */}
        <div className="space-y-6">
          <ResourceAllocation resources={resources} />
          <TierStatusCards />
        </div>
      </div>
      
      {/* Bureaucracy Killer */}
      <BureaucracyKiller 
        workflows={workflows}
        onKill={handleKillWorkflow}
      />
      
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: '📊', label: 'V-Engine 상세', color: 'purple' },
          { icon: '🎁', label: '리워드 설정', color: 'cyan' },
          { icon: '👥', label: 'FSD 지시', color: 'blue' },
          { icon: '⚡', label: 'Optimus 모니터링', color: 'emerald' },
        ].map((action, idx) => (
          <button
            key={idx}
            className={`p-4 rounded-xl bg-${action.color}-500/10 border border-${action.color}-500/20 text-${action.color}-400 hover:bg-${action.color}-500/20 transition-colors flex items-center justify-center gap-2`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
