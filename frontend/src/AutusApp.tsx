// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS App v3.0 - 통합 진입점
// 핵심: 미래예측 + 자동화
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useAutusCore, TaskState, PredictionResult, AutomationLog } from './core/autus-core';

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 앱
// ═══════════════════════════════════════════════════════════════════════════════

export default function AutusApp() {
  const { predict, predictSystem, evaluate, getLogs, getStats } = useAutusCore();
  
  // 현재 뷰 상태
  const [currentView, setCurrentView] = useState<'prediction' | 'automation' | 'tasks'>('prediction');
  
  // 샘플 태스크 데이터
  const [tasks] = useState<Map<number, TaskState>>(() => {
    const map = new Map<number, TaskState>();
    
    // 샘플 데이터 생성
    const samples: TaskState[] = [
      { mass: 9.5, psi: 9.2, omega: 0.85, velocity: 2, createdAt: Date.now() - 86400000, deadline: Date.now() + 86400000, dependencies: [], dependents: [2, 3], lat: 37.5665, lng: 126.9780 },
      { mass: 7.0, psi: 6.5, omega: 0.45, velocity: 5, createdAt: Date.now() - 172800000, dependencies: [1], dependents: [4], lat: 37.5660, lng: 126.9785 },
      { mass: 8.5, psi: 8.0, omega: 0.72, velocity: 3, createdAt: Date.now() - 259200000, deadline: Date.now() + 172800000, dependencies: [1], dependents: [], lat: 37.5670, lng: 126.9775 },
      { mass: 5.5, psi: 4.0, omega: 0.30, velocity: 7, createdAt: Date.now() - 43200000, dependencies: [2], dependents: [], lat: 37.5655, lng: 126.9790 },
      { mass: 6.0, psi: 5.5, omega: 0.55, velocity: 4, createdAt: Date.now() - 129600000, dependencies: [], dependents: [6], lat: 37.5675, lng: 126.9770 },
    ];
    
    samples.forEach((task, i) => map.set(i + 1, task));
    return map;
  });
  
  // 예측 결과
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [systemPrediction, setSystemPrediction] = useState<ReturnType<typeof predictSystem> | null>(null);
  
  // 자동화 로그
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  
  // 초기 예측 실행
  useEffect(() => {
    const taskArray = Array.from(tasks.values());
    const sysPred = predictSystem(taskArray, 24);
    setSystemPrediction(sysPred);
    
    // 개별 예측
    const preds: PredictionResult[] = [];
    tasks.forEach((state, id) => {
      const pred = predict({ taskId: id, currentState: state, horizonHours: 24 });
      preds.push(pred);
    });
    setPredictions(preds);
    
    // 자동화 평가
    const logs: AutomationLog[] = [];
    tasks.forEach((state, id) => {
      const newLogs = evaluate(id, state);
      logs.push(...newLogs);
    });
    setAutomationLogs(logs);
  }, [tasks, predict, predictSystem, evaluate]);
  
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              AUTUS
            </h1>
            <span className="text-slate-500 text-sm">v3.0</span>
          </div>
          
          {/* 시스템 상태 */}
          <div className="flex items-center gap-6">
            <SystemHealthIndicator health={systemPrediction?.systemHealth ?? 1} />
            <CriticalAlerts count={systemPrediction?.criticalTasks.length ?? 0} />
            <AutomationStatus count={automationLogs.length} />
          </div>
        </div>
      </header>
      
      {/* 네비게이션 */}
      <nav className="border-b border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex gap-1">
          {(['prediction', 'automation', 'tasks'] as const).map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                currentView === view
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {view === 'prediction' && '🔮 미래예측'}
              {view === 'automation' && '⚡ 자동화'}
              {view === 'tasks' && '📋 업무'}
            </button>
          ))}
        </div>
      </nav>
      
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto p-4">
        {currentView === 'prediction' && (
          <PredictionView 
            predictions={predictions} 
            systemPrediction={systemPrediction}
            tasks={tasks}
          />
        )}
        {currentView === 'automation' && (
          <AutomationView 
            logs={automationLogs}
            stats={getStats()}
          />
        )}
        {currentView === 'tasks' && (
          <TasksView tasks={tasks} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 서브 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

function SystemHealthIndicator({ health }: { health: number }) {
  const percentage = Math.round(health * 100);
  const color = health > 0.7 ? 'text-green-400' : health > 0.4 ? 'text-amber-400' : 'text-red-400';
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 text-sm">시스템 상태</span>
      <span className={`font-mono font-bold ${color}`}>{percentage}%</span>
    </div>
  );
}

function CriticalAlerts({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-red-400 text-sm font-medium">{count} 위험</span>
    </div>
  );
}

function AutomationStatus({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 text-sm">자동 실행</span>
      <span className="font-mono text-amber-400">{count}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 미래예측 뷰
// ═══════════════════════════════════════════════════════════════════════════════

function PredictionView({ 
  predictions, 
  systemPrediction,
  tasks 
}: { 
  predictions: PredictionResult[];
  systemPrediction: ReturnType<ReturnType<typeof useAutusCore>['predictSystem']> | null;
  tasks: Map<number, TaskState>;
}) {
  return (
    <div className="space-y-6">
      {/* 시스템 전체 예측 */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🔮 24시간 후 시스템 예측
        </h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard 
            label="시스템 건강도" 
            value={`${Math.round((systemPrediction?.systemHealth ?? 1) * 100)}%`}
            trend={systemPrediction?.systemHealth ?? 1 > 0.7 ? 'up' : 'down'}
          />
          <MetricCard 
            label="위험 업무" 
            value={`${systemPrediction?.criticalTasks.length ?? 0}개`}
            trend="neutral"
          />
          <MetricCard 
            label="연쇄 영향" 
            value={`${systemPrediction?.totalCascadeEffects.length ?? 0}건`}
            trend="neutral"
          />
        </div>
        
        {/* 권장 우선순위 */}
        {systemPrediction?.recommendedPriority && systemPrediction.recommendedPriority.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">권장 조치 우선순위</h3>
            <div className="space-y-2">
              {systemPrediction.recommendedPriority.slice(0, 5).map((action, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    action.priority === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/50' :
                    action.priority === 'HIGH' ? 'bg-amber-500/20 border border-amber-500/50' :
                    'bg-slate-800'
                  }`}
                >
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    action.priority === 'CRITICAL' ? 'bg-red-500 text-white' :
                    action.priority === 'HIGH' ? 'bg-amber-500 text-black' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {action.priority}
                  </span>
                  <span className="text-sm">{action.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 개별 업무 예측 */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold mb-4">업무별 예측</h2>
        
        <div className="space-y-4">
          {predictions.map((pred, i) => (
            <TaskPredictionCard 
              key={i} 
              taskId={i + 1}
              currentState={tasks.get(i + 1)!}
              prediction={pred} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend === 'up' && <span className="text-green-400">↑</span>}
        {trend === 'down' && <span className="text-red-400">↓</span>}
      </div>
    </div>
  );
}

function TaskPredictionCard({ 
  taskId, 
  currentState,
  prediction 
}: { 
  taskId: number;
  currentState: TaskState;
  prediction: PredictionResult;
}) {
  const hasCritical = prediction.triggeredGates.length > 0;
  
  return (
    <div className={`p-4 rounded-lg border ${
      hasCritical ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-400">#{taskId}</span>
          <span className="text-sm text-slate-300">
            질량 {currentState.mass.toFixed(1)} | ψ {currentState.psi.toFixed(1)} | Ω {(currentState.omega * 100).toFixed(0)}%
          </span>
        </div>
        <span className="text-sm text-slate-500">
          신뢰도 {(prediction.confidence * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* 상태 변화 */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <StateChange label="Ω (엔트로피)" from={currentState.omega} to={prediction.futureState.omega} />
        <StateChange label="v (속도)" from={currentState.velocity} to={prediction.futureState.velocity} />
        <StateChange label="ψ (비가역성)" from={currentState.psi} to={prediction.futureState.psi} />
      </div>
      
      {/* 트리거된 Gate */}
      {prediction.triggeredGates.length > 0 && (
        <div className="flex gap-2 mt-2">
          {prediction.triggeredGates.map(gate => (
            <span key={gate} className="text-xs px-2 py-1 bg-red-500/30 text-red-300 rounded">
              {gate}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StateChange({ label, from, to }: { label: string; from: number; to: number }) {
  const diff = to - from;
  const isIncrease = diff > 0;
  
  return (
    <div className="text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-mono">{from.toFixed(2)}</span>
        <span className="text-slate-600">→</span>
        <span className={`font-mono ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
          {to.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 자동화 뷰
// ═══════════════════════════════════════════════════════════════════════════════

function AutomationView({ 
  logs, 
  stats 
}: { 
  logs: AutomationLog[];
  stats: { ruleId: string; name: string; count: number }[];
}) {
  return (
    <div className="space-y-6">
      {/* 자동화 통계 */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold mb-4">⚡ 자동화 규칙</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <div key={stat.ruleId} className="bg-slate-800 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">{stat.name}</div>
              <div className="text-2xl font-bold text-amber-400">{stat.count}회</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 실행 로그 */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold mb-4">실행 로그</h2>
        
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-8">자동 실행된 항목이 없습니다</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    log.action.priority === 'CRITICAL' ? 'bg-red-500' :
                    log.action.priority === 'HIGH' ? 'bg-amber-500 text-black' :
                    'bg-slate-700'
                  }`}>
                    {log.action.type}
                  </span>
                  <span className="text-sm">{log.action.message}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Task #{log.taskId}</span>
                  <span className={`text-xs ${
                    log.result === 'SUCCESS' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {log.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 뷰
// ═══════════════════════════════════════════════════════════════════════════════

function TasksView({ tasks }: { tasks: Map<number, TaskState> }) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <h2 className="text-lg font-semibold mb-4">📋 업무 목록</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-3 px-4">ID</th>
              <th className="text-left py-3 px-4">질량 (K)</th>
              <th className="text-left py-3 px-4">비가역성 (ψ)</th>
              <th className="text-left py-3 px-4">엔트로피 (Ω)</th>
              <th className="text-left py-3 px-4">속도 (v)</th>
              <th className="text-left py-3 px-4">좌표</th>
              <th className="text-left py-3 px-4">마감</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(tasks.entries()).map(([id, task]) => (
              <tr key={id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-3 px-4 font-mono">#{id}</td>
                <td className="py-3 px-4">
                  <span className={task.mass >= 8 ? 'text-amber-400 font-bold' : ''}>
                    {task.mass.toFixed(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={task.psi >= 9 ? 'text-red-400 font-bold' : ''}>
                    {task.psi.toFixed(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={task.omega >= 0.8 ? 'text-red-400 font-bold' : ''}>
                    {(task.omega * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={task.velocity < 1 ? 'text-slate-500' : ''}>
                    {task.velocity.toFixed(1)}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-500">
                  {task.lat.toFixed(4)}, {task.lng.toFixed(4)}
                </td>
                <td className="py-3 px-4">
                  {task.deadline ? (
                    <span className={
                      task.deadline - Date.now() < 86400000 ? 'text-red-400' : 'text-slate-400'
                    }>
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
