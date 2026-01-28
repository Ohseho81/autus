/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Real-Time Data Overlay System
 * Socket.io 기반 실시간 데이터 오버레이
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 기능:
 * - WebSocket 실시간 연결
 * - 자동화 레벨 업데이트
 * - 삭제 이벤트 수신
 * - 학습 루프 진척도
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface RealtimeMetric {
  elementId: string;
  automationLevel?: number;
  kValue?: number;
  iValue?: number;
  avgDuration?: number;
  successRate?: number;
  status?: string;
  timestamp: number;
}

export interface LoopProgress {
  loopId: string;
  loopName: string;
  progress: number;  // 0-100
  currentStep: string;
  estimatedCompletion?: number;
}

export interface SystemStats {
  totalTasks: number;
  activeTasks: number;
  deletionCandidates: number;
  highRiskTasks: number;
  avgAutomation: number;
  avgKValue: number;
  requestsPerMinute: number;
  successRate: number;
  errorRate: number;
}

export interface RealtimeEvent {
  type: 'metric_update' | 'delete_triggered' | 'loop_progress' | 'system_stats' | 'alert';
  payload: RealtimeMetric | LoopProgress | SystemStats | string[];
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useRealtimeOverlay(wsUrl: string = 'ws://localhost:8000/ws/bpmn') {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, RealtimeMetric>>({});
  const [loopProgress, setLoopProgress] = useState<LoopProgress[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ BPMN Realtime WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'metric_update': {
              const metric = data.payload as RealtimeMetric;
              setMetrics(prev => ({
                ...prev,
                [metric.elementId]: metric,
              }));
              break;
            }
              
            case 'delete_triggered': {
              const ids = data.payload as string[];
              setDeletedIds(prev => [...prev, ...ids]);
              break;
            }
              
            case 'loop_progress': {
              const progress = data.payload as LoopProgress;
              setLoopProgress(prev => {
                const idx = prev.findIndex(p => p.loopId === progress.loopId);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = progress;
                  return updated;
                }
                return [...prev, progress];
              });
              break;
            }
              
            case 'system_stats':
              setSystemStats(data.payload as SystemStats);
              break;
              
            case 'alert':
              setAlerts(prev => [...prev.slice(-9), data.payload as unknown as string]);
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('❌ BPMN Realtime WebSocket disconnected');
        setIsConnected(false);
        
        // 자동 재연결
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
      reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), 3000);
    }
  }, [wsUrl]);

  // 연결 시작
  useEffect(() => {
    connectRef.current = connect;
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  // 메트릭 요청
  const requestMetrics = useCallback((elementIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request_metrics',
        elementIds,
      }));
    }
  }, []);

  // 삭제 트리거
  const triggerDelete = useCallback((elementIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'trigger_delete',
        elementIds,
      }));
    }
  }, []);

  return {
    isConnected,
    metrics,
    loopProgress,
    systemStats,
    deletedIds,
    alerts,
    requestMetrics,
    triggerDelete,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Realtime Data Generator (개발용)
// ═══════════════════════════════════════════════════════════════════════════════

export function useMockRealtimeData() {
  const [metrics, setMetrics] = useState<Record<string, RealtimeMetric>>({});
  const [loopProgress, setLoopProgress] = useState<LoopProgress[]>([
    { loopId: 'learning', loopName: 'Learning Loop', progress: 65, currentStep: 'AI Feedback Analysis' },
    { loopId: 'evolution', loopName: 'Evolution Loop', progress: 42, currentStep: 'K/I Optimization' },
    { loopId: 'deletion', loopName: 'Deletion Loop', progress: 88, currentStep: 'Validation' },
  ]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalTasks: 570,
    activeTasks: 485,
    deletionCandidates: 12,
    highRiskTasks: 8,
    avgAutomation: 0.67,
    avgKValue: 0.95,
    requestsPerMinute: 1234,
    successRate: 0.999,
    errorRate: 0.001,
  });

  // 주기적 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      // 랜덤 메트릭 업데이트
      const elementIds = ['task-1', 'task-2', 'task-3', 'gateway-1'];
      const randomId = elementIds[Math.floor(Math.random() * elementIds.length)];
      
      setMetrics(prev => ({
        ...prev,
        [randomId]: {
          elementId: randomId,
          automationLevel: Math.random() * 0.3 + 0.7,  // 70-100%
          kValue: Math.random() * 0.5 + 0.7,  // 0.7-1.2
          avgDuration: Math.random() * 50000 + 5000,  // 5-55초
          successRate: Math.random() * 0.1 + 0.9,  // 90-100%
          timestamp: Date.now(),
        },
      }));

      // 루프 진척도 업데이트
      setLoopProgress(prev => prev.map(loop => ({
        ...loop,
        progress: Math.min(100, loop.progress + Math.random() * 2),
      })));

      // 시스템 통계 업데이트
      setSystemStats(prev => ({
        ...prev,
        requestsPerMinute: Math.round(prev.requestsPerMinute + (Math.random() - 0.5) * 100),
        avgAutomation: Math.min(1, prev.avgAutomation + (Math.random() - 0.5) * 0.01),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected: true,
    metrics,
    loopProgress,
    systemStats,
    deletedIds: [],
    alerts: [],
    requestMetrics: () => {},
    triggerDelete: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Overlay Components
// ═══════════════════════════════════════════════════════════════════════════════

interface LoopProgressGaugeProps {
  loops: LoopProgress[];
}

export function LoopProgressGauge({ loops }: LoopProgressGaugeProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-bold text-sm">Learning Loop Progress</h3>
      {loops.map(loop => (
        <div key={loop.loopId} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{loop.loopName}</span>
            <span className="text-cyan-400">{Math.round(loop.progress)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
              style={{ width: `${loop.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{loop.currentStep}</p>
        </div>
      ))}
    </div>
  );
}

interface SystemStatsBarProps {
  stats: SystemStats | null;
}

export function SystemStatsBar({ stats }: SystemStatsBarProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-6 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-slate-400">Success</span>
        <span className="text-green-400 font-mono">{(stats.successRate * 100).toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-slate-400">Error</span>
        <span className="text-red-400 font-mono">{(stats.errorRate * 100).toFixed(2)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Req/min</span>
        <span className="text-cyan-400 font-mono">{stats.requestsPerMinute.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Tasks</span>
        <span className="text-white font-mono">{stats.activeTasks}/{stats.totalTasks}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">삭제대기</span>
        <span className="text-orange-400 font-mono">{stats.deletionCandidates}</span>
      </div>
    </div>
  );
}

export default useRealtimeOverlay;
