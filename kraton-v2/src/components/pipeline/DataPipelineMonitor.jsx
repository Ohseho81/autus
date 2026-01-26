/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🩸 KRATON Data Pipeline Monitor
 * 데이터 파이프라인 실시간 모니터링 대시보드
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA
// ============================================

const generateMockPipelineData = () => ({
  status: 'healthy',
  uptime: '99.97%',
  lastSync: new Date().toISOString(),
  
  // 데이터 수집 (Perception)
  collection: {
    teacherConsole: { events: 234, tags: 189, voice: 12, status: 'active' },
    safetyMirror: { sessions: 456, clicks: 1234, dwellTime: '4.2분', status: 'active' },
    internalERP: { syncs: 89, records: 12340, status: 'active' },
  },
  
  // 처리 (FSD/Engine)
  processing: {
    n8nWorkflows: {
      churnDetection: { executions: 96, risksFound: 7, avgTime: '1.2s', status: 'running' },
      relationalIncentive: { executions: 1, bonusAwarded: 15, avgTime: '3.4s', status: 'idle' },
      globalConsolidation: { executions: 1, lastV: 89495, avgTime: '5.1s', status: 'idle' },
    },
    llmAgent: { requests: 45, sentiment: 38, confidence: 0.92, status: 'active' },
    physicsCalc: { calculations: 1234, avgLatency: '12ms', status: 'active' },
  },
  
  // 저장소 (Supabase)
  storage: {
    interactionLogs: { total: 45678, today: 234, growth: '+2.3%' },
    physicsMetrics: { total: 12340, updated: 189, coverage: '98%' },
    riskQueue: { open: 7, critical: 2, resolved: 156 },
    assetValuation: { nodes: 165, totalV: 89495, compound: '+5.2%' },
  },
  
  // 실행 (Actuation)
  actuation: {
    notifications: { sent: 45, pending: 3, failed: 0 },
    autoActions: { triggered: 12, success: 11, pending: 1 },
    smsAlerts: { sent: 5, delivered: 5 },
  },
  
  // 최근 이벤트
  recentEvents: [
    { time: '방금', type: 'tag', source: 'Teacher Console', message: '김선생님 - 불안 태그 입력', severity: 'warning' },
    { time: '2분 전', type: 'risk', source: 'Churn Detection', message: '오연우 학생 이탈 위험 HIGH', severity: 'critical' },
    { time: '5분 전', type: 'action', source: 'Auto-Actuation', message: 'Principal 알림 발송 완료', severity: 'success' },
    { time: '12분 전', type: 'sync', source: 'ERP Sync', message: '성적 데이터 89건 동기화', severity: 'info' },
    { time: '23분 전', type: 'calc', source: 'Physics Engine', message: 's_index 재계산 완료 (165 nodes)', severity: 'info' },
  ],
});

// ============================================
// COMPONENTS
// ============================================

// 파이프라인 스테이지 카드
const PipelineStage = memo(function PipelineStage({ title, icon, status, children }) {
  const statusColors = {
    active: 'border-emerald-500/50 bg-emerald-500/10',
    running: 'border-cyan-500/50 bg-cyan-500/10',
    idle: 'border-gray-600 bg-gray-800/50',
    error: 'border-red-500/50 bg-red-500/10',
  };
  
  return (
    <div className={`rounded-xl border p-4 ${statusColors[status] || statusColors.idle}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          status === 'active' || status === 'running' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : status === 'error'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {status === 'active' ? '● Active' : 
           status === 'running' ? '⚡ Running' :
           status === 'error' ? '⚠ Error' : '○ Idle'}
        </span>
      </div>
      {children}
    </div>
  );
});

// 메트릭 아이템
const MetricItem = memo(function MetricItem({ label, value, subValue, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-700/30 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">
        <span className={`font-medium ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</span>
        {subValue && <span className="text-gray-500 text-xs ml-1">{subValue}</span>}
      </div>
    </div>
  );
});

// 파이프라인 플로우 시각화
const PipelineFlow = memo(function PipelineFlow({ data }) {
  return (
    <div className="flex items-center justify-between gap-2 p-4 bg-gray-900/50 rounded-xl border border-gray-800 overflow-x-auto">
      {/* Collection */}
      <div className="flex flex-col items-center min-w-24">
        <div className="w-16 h-16 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
          <span className="text-2xl">📥</span>
        </div>
        <span className="text-xs text-gray-400 mt-2">Collection</span>
        <span className="text-emerald-400 text-xs font-mono">{data.collection.teacherConsole.events + data.collection.safetyMirror.sessions}/h</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/50 to-cyan-500/50 relative">
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
      
      {/* Processing */}
      <div className="flex flex-col items-center min-w-24">
        <div className="w-16 h-16 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
          <span className="text-2xl">⚙️</span>
        </div>
        <span className="text-xs text-gray-400 mt-2">Processing</span>
        <span className="text-cyan-400 text-xs font-mono">{data.processing.physicsCalc.avgLatency}</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-emerald-500/50 relative">
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 0.5 }}
          />
        </div>
      </div>
      
      {/* Storage */}
      <div className="flex flex-col items-center min-w-24">
        <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
          <span className="text-2xl">🗄️</span>
        </div>
        <span className="text-xs text-gray-400 mt-2">Supabase</span>
        <span className="text-emerald-400 text-xs font-mono">{data.storage.interactionLogs.total.toLocaleString()}</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-orange-500/50 relative">
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-400 rounded-full"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
          />
        </div>
      </div>
      
      {/* Actuation */}
      <div className="flex flex-col items-center min-w-24">
        <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
          <span className="text-2xl">🎯</span>
        </div>
        <span className="text-xs text-gray-400 mt-2">Actuation</span>
        <span className="text-orange-400 text-xs font-mono">{data.actuation.autoActions.triggered} actions</span>
      </div>
    </div>
  );
});

// n8n 워크플로우 상태
const WorkflowStatus = memo(function WorkflowStatus({ name, data }) {
  const statusIcon = {
    running: '🔄',
    idle: '💤',
    error: '❌',
  };
  
  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">{name}</span>
        <span className="text-xs">{statusIcon[data.status]} {data.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-500">실행</span>
          <p className="text-white font-mono">{data.executions}</p>
        </div>
        <div>
          <span className="text-gray-500">{name.includes('Churn') ? '위험 감지' : name.includes('Incentive') ? '보너스' : 'V값'}</span>
          <p className="text-cyan-400 font-mono">
            {name.includes('Churn') ? data.risksFound : 
             name.includes('Incentive') ? data.bonusAwarded :
             data.lastV?.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gray-500">평균 시간</span>
          <p className="text-emerald-400 font-mono">{data.avgTime}</p>
        </div>
      </div>
    </div>
  );
});

// 이벤트 로그
const EventLog = memo(function EventLog({ events }) {
  const severityColors = {
    critical: 'border-l-red-500 bg-red-500/5',
    warning: 'border-l-yellow-500 bg-yellow-500/5',
    success: 'border-l-emerald-500 bg-emerald-500/5',
    info: 'border-l-gray-500 bg-gray-800/30',
  };
  
  const severityIcons = {
    critical: '🔴',
    warning: '🟡',
    success: '✅',
    info: 'ℹ️',
  };
  
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((event, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={`p-2 rounded-lg border-l-2 ${severityColors[event.severity]}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{severityIcons[event.severity]}</span>
            <span className="text-gray-500 text-xs">{event.time}</span>
            <span className="text-gray-600">•</span>
            <span className="text-cyan-400 text-xs">{event.source}</span>
          </div>
          <p className="text-white text-sm mt-1">{event.message}</p>
        </motion.div>
      ))}
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function DataPipelineMonitor() {
  const [data, setData] = useState(generateMockPipelineData);
  const [isLive, setIsLive] = useState(true);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        collection: {
          ...prev.collection,
          teacherConsole: {
            ...prev.collection.teacherConsole,
            events: prev.collection.teacherConsole.events + Math.floor(Math.random() * 3),
          },
        },
        processing: {
          ...prev.processing,
          physicsCalc: {
            ...prev.processing.physicsCalc,
            calculations: prev.processing.physicsCalc.calculations + Math.floor(Math.random() * 10),
          },
        },
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🩸</span>
            KRATON Data Pipeline
          </h1>
          <p className="text-gray-400 mt-1">
            실시간 데이터 흐름 모니터링 · Uptime: {data.uptime}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              isLive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {isLive ? '● Live' : '○ Paused'}
          </button>
          <div className="px-4 py-2 bg-gray-800 rounded-xl text-gray-400 text-sm">
            Last Sync: {new Date(data.lastSync).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Pipeline Flow Visualization */}
      <PipelineFlow data={data} />

      {/* Main Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* 1. Data Collection */}
        <PipelineStage title="Data Collection" icon="📥" status="active">
          <div className="space-y-1">
            <MetricItem label="Teacher Console" value={data.collection.teacherConsole.events} subValue="events" highlight />
            <MetricItem label="Quick Tags" value={data.collection.teacherConsole.tags} />
            <MetricItem label="Voice Input" value={data.collection.teacherConsole.voice} />
            <MetricItem label="Safety Mirror" value={data.collection.safetyMirror.sessions} subValue="sessions" />
            <MetricItem label="ERP Syncs" value={data.collection.internalERP.syncs} />
          </div>
        </PipelineStage>

        {/* 2. Processing */}
        <PipelineStage title="Processing (FSD)" icon="⚙️" status="running">
          <div className="space-y-1">
            <MetricItem label="LLM Requests" value={data.processing.llmAgent.requests} />
            <MetricItem label="Sentiment Analysis" value={data.processing.llmAgent.sentiment} />
            <MetricItem label="AI Confidence" value={(data.processing.llmAgent.confidence * 100).toFixed(0) + '%'} highlight />
            <MetricItem label="Physics Calc" value={data.processing.physicsCalc.calculations} />
            <MetricItem label="Avg Latency" value={data.processing.physicsCalc.avgLatency} />
          </div>
        </PipelineStage>

        {/* 3. Storage */}
        <PipelineStage title="Supabase Storage" icon="🗄️" status="active">
          <div className="space-y-1">
            <MetricItem label="Interaction Logs" value={data.storage.interactionLogs.total.toLocaleString()} subValue={data.storage.interactionLogs.growth} highlight />
            <MetricItem label="Physics Metrics" value={data.storage.physicsMetrics.total.toLocaleString()} subValue={data.storage.physicsMetrics.coverage} />
            <MetricItem label="Risk Queue (Open)" value={data.storage.riskQueue.open} subValue={`${data.storage.riskQueue.critical} critical`} />
            <MetricItem label="Asset Nodes" value={data.storage.assetValuation.nodes} />
            <MetricItem label="Total V" value={data.storage.assetValuation.totalV.toLocaleString()} subValue={data.storage.assetValuation.compound} />
          </div>
        </PipelineStage>

        {/* 4. Actuation */}
        <PipelineStage title="Actuation" icon="🎯" status="active">
          <div className="space-y-1">
            <MetricItem label="Notifications Sent" value={data.actuation.notifications.sent} />
            <MetricItem label="Pending" value={data.actuation.notifications.pending} />
            <MetricItem label="Auto Actions" value={data.actuation.autoActions.triggered} highlight />
            <MetricItem label="Success Rate" value={((data.actuation.autoActions.success / data.actuation.autoActions.triggered) * 100).toFixed(0) + '%'} />
            <MetricItem label="SMS Alerts" value={data.actuation.smsAlerts.sent} />
          </div>
        </PipelineStage>
      </div>

      {/* n8n Workflows & Event Log */}
      <div className="grid grid-cols-3 gap-4">
        {/* n8n Workflows */}
        <div className="col-span-2 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-orange-400">⚡</span>
            n8n Workflows
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <WorkflowStatus name="Churn Detection" data={data.processing.n8nWorkflows.churnDetection} />
            <WorkflowStatus name="Relational Incentive" data={data.processing.n8nWorkflows.relationalIncentive} />
            <WorkflowStatus name="Global V-Consolidation" data={data.processing.n8nWorkflows.globalConsolidation} />
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-400">📋</span>
            Recent Events
          </h3>
          <EventLog events={data.recentEvents} />
        </div>
      </div>

      {/* Formula Display */}
      <div className="bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-emerald-500/10 rounded-xl p-4 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">KRATON Physics Engine</h3>
            <p className="text-gray-400 text-sm mt-1">
              R = M × s × e<sup>(-t/τ)</sup> · V = (M - T) × (1 + s)<sup>t</sup> · Churn = f(M, s, t)
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Active Relations</p>
              <p className="text-2xl font-bold text-purple-400">{data.storage.assetValuation.nodes}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Global V-Index</p>
              <p className="text-2xl font-bold text-cyan-400">{data.storage.assetValuation.totalV.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Compound Growth</p>
              <p className="text-2xl font-bold text-emerald-400">{data.storage.assetValuation.compound}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
