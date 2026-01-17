// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════════════
//
//                     AUTUS UI 컴포넌트 연동 예제
//                     
//                     React Query 훅을 실제 컴포넌트에 연결
//
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useEntityState,
  useNodes48,
  useSlots144,
  usePrediction,
  useAutomationTasks,
  useAlerts,
  useRealtimeKI,
  useDashboardData,
  useApproveTask,
  useAcknowledgeAlert,
  KIState,
  Node48Value,
  Alert,
  AutomationTask,
} from '../hooks/useKI';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. K/I 게이지 컴포넌트 (실시간 연동)
// ═══════════════════════════════════════════════════════════════════════════════

interface KIGaugeProps {
  entityId: string;
  showRealtime?: boolean;
}

export function KIGauge({ entityId, showRealtime = true }: KIGaugeProps) {
  // API에서 상태 가져오기
  const { data: state, isLoading, isError, error } = useEntityState(entityId);
  
  // 실시간 업데이트 (SSE)
  const { data: realtimeData, isConnected } = useRealtimeKI(entityId, showRealtime);
  
  // 실시간 데이터가 있으면 사용, 없으면 API 데이터 사용
  const displayK = realtimeData?.k_index ?? state?.k_index ?? 0;
  const displayI = realtimeData?.i_index ?? state?.i_index ?? 0;

  if (isLoading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-xl h-48 flex items-center justify-center">
        <span className="text-white/40">Loading K/I...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-400">Error: {(error as Error)?.message}</p>
      </div>
    );
  }

  // K 값에 따른 색상
  const kColor = displayK >= 0.3 
    ? 'text-emerald-400' 
    : displayK >= -0.3 
      ? 'text-amber-400' 
      : 'text-red-400';
  
  // I 값에 따른 색상
  const iColor = displayI >= 0.5 
    ? 'text-blue-400' 
    : displayI >= 0.2 
      ? 'text-purple-400' 
      : 'text-pink-400';

  return (
    <motion.div 
      className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/60 text-sm font-medium">K/I Index</h3>
        <div className="flex items-center gap-2">
          {showRealtime && (
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
          <span className="text-white/40 text-xs">
            {state?.phase}
          </span>
        </div>
      </div>

      {/* K 게이지 */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-white/40 text-xs">K-Index</span>
          <motion.span 
            className={`text-3xl font-bold tabular-nums ${kColor}`}
            key={displayK}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {displayK >= 0 ? '+' : ''}{displayK.toFixed(3)}
          </motion.span>
        </div>
        
        {/* 프로그레스 바 */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${displayK >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${((displayK + 1) / 2) * 100}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
        
        {/* 변화율 */}
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${state?.dk_dt && state.dk_dt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {state?.dk_dt && state.dk_dt >= 0 ? '↑' : '↓'} {Math.abs(state?.dk_dt || 0).toFixed(4)}/day
          </span>
        </div>
      </div>

      {/* I 게이지 */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-white/40 text-xs">I-Index</span>
          <motion.span 
            className={`text-3xl font-bold tabular-nums ${iColor}`}
            key={displayI}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {displayI >= 0 ? '+' : ''}{displayI.toFixed(3)}
          </motion.span>
        </div>
        
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((displayI + 1) / 2) * 100}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
        
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${state?.di_dt && state.di_dt >= 0 ? 'text-blue-400' : 'text-pink-400'}`}>
            {state?.di_dt && state.di_dt >= 0 ? '↑' : '↓'} {Math.abs(state?.di_dt || 0).toFixed(4)}/day
          </span>
        </div>
      </div>

      {/* 신뢰도 */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex justify-between text-xs text-white/40">
          <span>Confidence</span>
          <span>{((state?.confidence || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. 48노드 그리드 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface Nodes48GridProps {
  entityId: string;
  onNodeClick?: (node: Node48Value) => void;
}

export function Nodes48Grid({ entityId, onNodeClick }: Nodes48GridProps) {
  const { data, isLoading, isError } = useNodes48(entityId);

  // 도메인별 그룹화
  const groupedNodes = useMemo(() => {
    if (!data?.nodes) return {};
    
    return data.nodes.reduce((acc, node) => {
      if (!acc[node.domain]) acc[node.domain] = [];
      acc[node.domain].push(node);
      return acc;
    }, {} as Record<string, Node48Value[]>);
  }, [data?.nodes]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-xl h-32" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-400">Failed to load nodes</div>;
  }

  const domainColors: Record<string, string> = {
    SURVIVE: 'from-red-500/20 to-red-600/10 border-red-500/30',
    GROW: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    RELATE: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    EXPRESS: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  };

  return (
    <div className="space-y-6">
      {/* 도메인 스코어 요약 */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(data?.domain_scores || {}).map(([domain, score]) => (
          <div 
            key={domain}
            className={`bg-gradient-to-br ${domainColors[domain]} border rounded-xl p-4`}
          >
            <div className="text-white/60 text-xs mb-1">{domain}</div>
            <div className="text-2xl font-bold text-white">
              {((score as number) * 100).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      {/* 48노드 그리드 */}
      <div className="grid grid-cols-4 gap-6">
        {(['SURVIVE', 'GROW', 'RELATE', 'EXPRESS'] as const).map((domain) => (
          <div key={domain} className="space-y-2">
            <h4 className="text-white/40 text-xs font-medium px-2">{domain}</h4>
            <div className="space-y-2">
              {groupedNodes[domain]?.map((node) => (
                <motion.button
                  key={node.node_id}
                  onClick={() => onNodeClick?.(node)}
                  className={`w-full bg-gradient-to-br ${domainColors[domain]} border rounded-lg p-3 text-left
                    hover:scale-[1.02] transition-transform`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/80 text-sm">{node.node_id}</span>
                    <span className={`text-xs ${
                      node.trend === 'UP' ? 'text-emerald-400' :
                      node.trend === 'DOWN' ? 'text-red-400' : 'text-white/40'
                    }`}>
                      {node.trend === 'UP' ? '↑' : node.trend === 'DOWN' ? '↓' : '→'}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {(node.value * 100).toFixed(0)}
                  </div>
                  <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-white/40"
                      style={{ width: `${((node.value + 1) / 2) * 100}%` }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. 144슬롯 시각화 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface Slots144ViewProps {
  entityId: string;
  viewMode?: 'grid' | 'orbit';
}

export function Slots144View({ entityId, viewMode = 'grid' }: Slots144ViewProps) {
  const { data, isLoading } = useSlots144(entityId);

  if (isLoading) {
    return <div className="animate-pulse bg-white/5 rounded-xl h-96" />;
  }

  // 유형별 그룹화
  const groupedSlots = useMemo(() => {
    if (!data?.slots) return {};
    
    return data.slots.reduce((acc, slot) => {
      if (!acc[slot.relation_type]) acc[slot.relation_type] = [];
      acc[slot.relation_type].push(slot);
      return acc;
    }, {} as Record<string, typeof data.slots>);
  }, [data?.slots]);

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-medium">144 Slots</h3>
          <p className="text-white/40 text-sm">
            Fill Rate: {((data?.fill_rate || 0) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="text-2xl font-bold text-blue-400">
          I: {data?.i_index?.toFixed(3)}
        </div>
      </div>

      {/* 유형별 링 */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(groupedSlots).map(([type, slots]) => {
          const filledCount = slots.filter(s => s.fill_status === 'FILLED').length;
          
          return (
            <div 
              key={type}
              className="bg-white/5 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">{type}</span>
                <span className="text-white/40 text-xs">{filledCount}/12</span>
              </div>
              
              {/* 12개 슬롯 (원형 배치 or 그리드) */}
              <div className="grid grid-cols-4 gap-1">
                {slots.map((slot) => (
                  <div
                    key={slot.slot_id}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                      ${slot.fill_status === 'FILLED' 
                        ? 'bg-blue-500/50 text-white' 
                        : 'bg-white/10 text-white/20'}`}
                    title={slot.entity_name || 'Empty'}
                  >
                    {slot.slot_number}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. 궤적 예측 차트 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface TrajectoryChartProps {
  entityId: string;
  horizonDays?: number;
}

export function TrajectoryChart({ entityId, horizonDays = 30 }: TrajectoryChartProps) {
  const { data, isLoading, isError } = usePrediction(entityId, horizonDays);

  if (isLoading) {
    return <div className="animate-pulse bg-white/5 rounded-xl h-64" />;
  }

  if (isError) {
    return <div className="text-red-400">Failed to load prediction</div>;
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-medium">Trajectory Prediction</h3>
          <p className="text-white/40 text-sm">{horizonDays} days forecast</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          data?.risk_level === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' :
          data?.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
          data?.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          Risk: {data?.risk_level}
        </div>
      </div>

      {/* SVG 차트 (간단한 라인 차트) */}
      <div className="h-48 relative">
        <svg viewBox="0 0 400 150" className="w-full h-full">
          {/* 그리드 라인 */}
          <line x1="0" y1="75" x2="400" y2="75" stroke="white" strokeOpacity="0.1" />
          <line x1="0" y1="37.5" x2="400" y2="37.5" stroke="white" strokeOpacity="0.05" />
          <line x1="0" y1="112.5" x2="400" y2="112.5" stroke="white" strokeOpacity="0.05" />
          
          {/* 신뢰구간 영역 */}
          <path
            d={`
              M ${data?.trajectory.map((p, i) => 
                `${(i / (data.trajectory.length - 1)) * 400},${75 - p.k_upper * 75}`
              ).join(' L ')}
              L ${400},${75 - (data?.trajectory[data.trajectory.length - 1]?.k_lower || 0) * 75}
              ${data?.trajectory.slice().reverse().map((p, i) => 
                `L ${(1 - i / (data.trajectory.length - 1)) * 400},${75 - p.k_lower * 75}`
              ).join(' ')}
              Z
            `}
            fill="url(#confidenceGradient)"
            opacity="0.3"
          />
          
          {/* K 예측 라인 */}
          <path
            d={`M ${data?.trajectory.map((p, i) => 
              `${(i / (data.trajectory.length - 1)) * 400},${75 - p.k_predicted * 75}`
            ).join(' L ')}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />
          
          {/* I 예측 라인 */}
          <path
            d={`M ${data?.trajectory.map((p, i) => 
              `${(i / (data.trajectory.length - 1)) * 400},${75 - p.i_predicted * 75}`
            ).join(' L ')}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          
          {/* 그라데이션 정의 */}
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* 레전드 */}
        <div className="absolute bottom-0 right-0 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500" />
            <span className="text-white/40">K</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500 border-dashed" />
            <span className="text-white/40">I</span>
          </div>
        </div>
      </div>

      {/* 주요 요인 */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <p className="text-white/40 text-xs mb-2">Key Factors:</p>
        <div className="flex flex-wrap gap-2">
          {data?.key_factors.map((factor, i) => (
            <span 
              key={i}
              className="px-2 py-1 bg-white/5 rounded text-xs text-white/60"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. 자동화 태스크 목록 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface AutomationTasksProps {
  entityId: string;
}

export function AutomationTasks({ entityId }: AutomationTasksProps) {
  const { data: tasks, isLoading } = useAutomationTasks(entityId);
  const approveMutation = useApproveTask();

  const handleApprove = (taskId: string, approved: boolean) => {
    approveMutation.mutate({ taskId, approved });
  };

  if (isLoading) {
    return <div className="animate-pulse bg-white/5 rounded-xl h-48" />;
  }

  const stageColors: Record<string, string> = {
    DISCOVERY: 'bg-purple-500/20 text-purple-400',
    ANALYSIS: 'bg-blue-500/20 text-blue-400',
    REDESIGN: 'bg-amber-500/20 text-amber-400',
    OPTIMIZATION: 'bg-emerald-500/20 text-emerald-400',
    ELIMINATION: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-medium mb-4">Automation Tasks (DAROE)</h3>
      
      <div className="space-y-3">
        <AnimatePresence>
          {tasks?.map((task) => (
            <motion.div
              key={task.task_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/5 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-white font-medium">{task.title}</h4>
                  <p className="text-white/40 text-sm">{task.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${stageColors[task.stage]}`}>
                  {task.stage}
                </span>
              </div>
              
              {/* 영향도 */}
              <div className="flex gap-4 text-xs text-white/40 mb-3">
                <span>K Impact: <span className="text-emerald-400">+{task.impact_k.toFixed(2)}</span></span>
                <span>I Impact: <span className="text-blue-400">+{task.impact_i.toFixed(2)}</span></span>
                <span>Confidence: {(task.confidence * 100).toFixed(0)}%</span>
              </div>
              
              {/* 액션 버튼 */}
              {task.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(task.task_id, true)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 
                      text-emerald-400 rounded-lg text-sm transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApprove(task.task_id, false)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 
                      text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. 경고 목록 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface AlertsListProps {
  entityId: string;
}

export function AlertsList({ entityId }: AlertsListProps) {
  const { data: alerts, isLoading } = useAlerts(entityId, { acknowledged: false });
  const acknowledgeMutation = useAcknowledgeAlert();

  const severityConfig: Record<string, { bg: string; text: string; icon: string }> = {
    INFO: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: 'ℹ️' },
    WARNING: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '⚠️' },
    CRITICAL: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🔶' },
    EMERGENCY: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🚨' },
  };

  if (isLoading) {
    return <div className="animate-pulse bg-white/5 rounded-xl h-32" />;
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {alerts?.map((alert) => {
          const config = severityConfig[alert.severity];
          
          return (
            <motion.div
              key={alert.alert_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`${config.bg} rounded-xl p-4 border border-white/5`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{config.icon}</span>
                <div className="flex-1">
                  <h4 className={`font-medium ${config.text}`}>{alert.title}</h4>
                  <p className="text-white/60 text-sm mt-1">{alert.message}</p>
                  <div className="flex gap-2 mt-2">
                    {alert.related_nodes.map((node) => (
                      <span 
                        key={node}
                        className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/40"
                      >
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeMutation.mutate(alert.alert_id)}
                  className="text-white/40 hover:text-white/60 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {alerts?.length === 0 && (
        <div className="text-center text-white/40 py-8">
          No active alerts
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 7. 통합 대시보드 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface DashboardProps {
  entityId: string;
}

export function Dashboard({ entityId }: DashboardProps) {
  const dashboard = useDashboardData(entityId);

  if (dashboard.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/5 rounded-xl w-48" />
            <div className="grid grid-cols-3 gap-6">
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AUTUS Dashboard</h1>
            <p className="text-white/40">Entity: {entityId}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dashboard.isRealtimeConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/40 text-sm">
              {dashboard.isRealtimeConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-3 gap-6">
          {/* K/I 게이지 */}
          <KIGauge entityId={entityId} />
          
          {/* 궤적 예측 */}
          <div className="col-span-2">
            <TrajectoryChart entityId={entityId} />
          </div>
        </div>

        {/* 48노드 */}
        <Nodes48Grid entityId={entityId} />

        {/* 하단 그리드 */}
        <div className="grid grid-cols-2 gap-6">
          {/* 144슬롯 */}
          <Slots144View entityId={entityId} />
          
          {/* 자동화 + 경고 */}
          <div className="space-y-6">
            <AutomationTasks entityId={entityId} />
            <AlertsList entityId={entityId} />
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default Dashboard;
