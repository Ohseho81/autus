/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KIDashboard - K/I 대시보드 (API 연동)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 기존 UI 컴포넌트 + API 훅 연동
 * 실시간 K/I 상태, 예측, 자동화, 경고 표시
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useEntityState, 
  usePrediction, 
  useAutomationTasks, 
  useAlerts,
  useRealtimeKI,
  useDashboard
} from '../../hooks/useKI';
import { GlassCard } from './GlassCard';
import { KIGaugeCluster } from './KIGaugeCluster';
import { automationPhases, cn } from '../../styles/autus-design-system';
import { springs } from '../../lib/animations/framer-presets';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Bell, 
  Check,
  Loader2 
} from 'lucide-react';

interface KIDashboardProps {
  entityId: string;
  showPrediction?: boolean;
  showAutomation?: boolean;
  showAlerts?: boolean;
}

export function KIDashboard({ 
  entityId,
  showPrediction = true,
  showAutomation = true,
  showAlerts = true,
}: KIDashboardProps) {
  // API 훅 사용
  const { state, prediction, tasks, alerts, isLoading, isError, refetch } = useDashboard(entityId);
  
  // 실시간 연결
  const { connected } = useRealtimeKI(entityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-white/60">데이터 로딩 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-rose-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
          <p>데이터를 불러올 수 없습니다</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* 연결 상태 표시 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AUTUS Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connected ? "bg-emerald-400" : "bg-rose-400"
          )} />
          <span className="text-sm text-white/60">
            {connected ? "실시간 연결됨" : "오프라인"}
          </span>
        </div>
      </div>

      {/* K/I 게이지 클러스터 */}
      {state && (
        <GlassCard title="K/I 상태" subtitle={`Phase: ${state.phase}`} k={state.k}>
          <KIGaugeCluster
            k={state.k}
            i={state.i}
            dk={state.dk_dt}
            di={state.di_dt}
            omega={state.omega}
            entityType={state.entity_type}
          />
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 예측 카드 */}
        {showPrediction && prediction && (
          <PredictionCard prediction={prediction} />
        )}

        {/* 자동화 카드 */}
        {showAutomation && tasks && (
          <AutomationCard tasks={tasks} entityId={entityId} />
        )}
      </div>

      {/* 경고 섹션 */}
      {showAlerts && alerts && alerts.unacknowledged > 0 && (
        <AlertsSection alerts={alerts} entityId={entityId} />
      )}
    </div>
  );
}

// 예측 카드
function PredictionCard({ prediction }: { prediction: any }) {
  const isPositive = prediction.dk_dt >= 0;
  
  return (
    <GlassCard title="궤적 예측" subtitle={`${prediction.predictions?.length || 0}일 예측`}>
      <div className="space-y-4">
        {/* 현재 추세 */}
        <div className="flex items-center justify-between">
          <span className="text-white/60">현재 추세</span>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
            <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
              {(prediction.dk_dt * 100).toFixed(2)}%/day
            </span>
          </div>
        </div>

        {/* 미니 차트 */}
        <div className="h-24 flex items-end gap-1">
          {prediction.predictions?.slice(0, 30).map((p: any, i: number) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t"
              style={{
                backgroundColor: p.k >= 0 ? 'rgba(34, 211, 238, 0.6)' : 'rgba(168, 85, 247, 0.6)',
              }}
              initial={{ height: 0 }}
              animate={{ height: `${(p.k + 1) * 50}%` }}
              transition={{ delay: i * 0.02 }}
            />
          ))}
        </div>

        {/* 경고 */}
        {prediction.warning && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-rose-300">{prediction.warning}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// 자동화 카드
function AutomationCard({ tasks, entityId }: { tasks: any; entityId: string }) {
  const suggestedTasks = tasks.tasks?.filter((t: any) => t.status === 'SUGGESTED') || [];
  
  return (
    <GlassCard title="자동화 제안" subtitle={`${tasks.total_savings || 0}분/주 절감 가능`}>
      <div className="space-y-3">
        {suggestedTasks.length === 0 ? (
          <div className="text-center text-white/40 py-4">
            자동화 제안이 없습니다
          </div>
        ) : (
          suggestedTasks.slice(0, 3).map((task: any) => (
            <TaskItem key={task.id} task={task} entityId={entityId} />
          ))
        )}
        
        {suggestedTasks.length > 3 && (
          <button className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            +{suggestedTasks.length - 3}개 더 보기
          </button>
        )}
      </div>
    </GlassCard>
  );
}

// 태스크 아이템
function TaskItem({ task, entityId }: { task: any; entityId: string }) {
  const phase = automationPhases[task.phase as keyof typeof automationPhases] || automationPhases[1];
  
  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
      whileHover={{ x: 4 }}
    >
      <span className="text-xl">{phase.emoji}</span>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{task.name}</div>
        <div className="text-xs text-white/50">
          {task.savings}분/주 절감 · {(task.automation_score * 100).toFixed(0)}% 자동화 가능
        </div>
      </div>
      
      <div className="flex gap-2">
        <button className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          <Check className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// 경고 섹션
function AlertsSection({ alerts, entityId }: { alerts: any; entityId: string }) {
  const unacknowledgedAlerts = alerts.alerts?.filter((a: any) => !a.acknowledged) || [];
  
  return (
    <GlassCard title="경고" subtitle={`${alerts.unacknowledged}개 미확인`}>
      <div className="space-y-3">
        <AnimatePresence>
          {unacknowledgedAlerts.slice(0, 5).map((alert: any, i: number) => (
            <motion.div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border",
                alert.severity === 'CRITICAL' && "bg-rose-500/10 border-rose-500/30",
                alert.severity === 'HIGH' && "bg-amber-500/10 border-amber-500/30",
                alert.severity === 'MEDIUM' && "bg-yellow-500/10 border-yellow-500/30",
                alert.severity === 'LOW' && "bg-white/5 border-white/10",
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
            >
              <Bell className={cn(
                "w-5 h-5 mt-0.5",
                alert.severity === 'CRITICAL' && "text-rose-400",
                alert.severity === 'HIGH' && "text-amber-400",
                alert.severity === 'MEDIUM' && "text-yellow-400",
                alert.severity === 'LOW' && "text-white/40",
              )} />
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{alert.title}</div>
                <div className="text-sm text-white/60 mt-1">{alert.message}</div>
              </div>
              
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Check className="w-4 h-4 text-white/40" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

export default KIDashboard;
