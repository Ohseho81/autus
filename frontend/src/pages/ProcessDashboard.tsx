/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Process Dashboard (Full Page Layout)
 * BPMN 70% + Trinity Summary 30%
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 레이아웃:
 * - 상단: 시스템 상태 바
 * - 왼쪽 70%: BPMN Viewer + 실시간 오버레이
 * - 오른쪽 30%: Trinity Summary Panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BPMNViewer, BPMNElement } from '../components/BPMN/BPMNViewer';
import {
  useMockRealtimeData,
  LoopProgressGauge,
  SystemStatsBar,
  LoopProgress,
  SystemStats,
} from '../components/BPMN/RealTimeOverlay';
import { BlackHoleAnimation } from '../components/Process/BlackHoleAnimation';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock BPMN Data (실제로는 API에서 로드)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_BPMN_ELEMENTS: BPMNElement[] = [
  // Start Event
  { id: 'start', type: 'event', name: 'Start', x: 50, y: 250, width: 40, height: 40 },
  
  // L1 Tasks
  { id: 'task-fin', type: 'task', name: '재무/회계', x: 130, y: 100, width: 140, height: 70, automationLevel: 0.65, kValue: 1.05, avgDuration: 15000 },
  { id: 'task-hr', type: 'task', name: '인사/노무', x: 130, y: 230, width: 140, height: 70, automationLevel: 0.45, kValue: 0.92, avgDuration: 25000 },
  { id: 'task-sales', type: 'task', name: '영업/고객', x: 130, y: 360, width: 140, height: 70, automationLevel: 0.72, kValue: 1.12, avgDuration: 12000 },
  
  // Gateway
  { id: 'gateway-1', type: 'gateway', name: 'Auto?', x: 320, y: 235, width: 50, height: 50, successRate: 0.78 },
  
  // L2 Tasks (자동화율 높음)
  { id: 'task-ar', type: 'task', name: '송장 자동생성', x: 420, y: 100, width: 140, height: 70, automationLevel: 0.99, kValue: 1.15, status: 'pending_delete', avgDuration: 3000 },
  { id: 'task-ap', type: 'task', name: '결제 자동처리', x: 420, y: 230, width: 140, height: 70, automationLevel: 0.98, kValue: 1.08, status: 'pending_delete', avgDuration: 5000 },
  
  // L2 Task (위험)
  { id: 'task-manual', type: 'task', name: '수동 검토', x: 420, y: 360, width: 140, height: 70, automationLevel: 0.25, kValue: 0.72, status: 'high_risk', avgDuration: 120000 },
  
  // Gateway 2
  { id: 'gateway-2', type: 'gateway', name: 'Complete?', x: 610, y: 235, width: 50, height: 50, successRate: 0.92 },
  
  // End Events
  { id: 'end-success', type: 'event', name: 'End Success', x: 720, y: 180, width: 40, height: 40 },
  { id: 'end-delete', type: 'event', name: 'End Delete', x: 720, y: 300, width: 40, height: 40, status: 'completed' },
  
  // Flows
  { id: 'flow-1', type: 'flow', name: '', x: 0, y: 0, sourceId: 'start', targetId: 'task-fin' },
  { id: 'flow-2', type: 'flow', name: '', x: 0, y: 0, sourceId: 'start', targetId: 'task-hr' },
  { id: 'flow-3', type: 'flow', name: '', x: 0, y: 0, sourceId: 'start', targetId: 'task-sales' },
  { id: 'flow-4', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-fin', targetId: 'gateway-1', avgDuration: 2000 },
  { id: 'flow-5', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-hr', targetId: 'gateway-1', avgDuration: 3500 },
  { id: 'flow-6', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-sales', targetId: 'gateway-1', avgDuration: 1500 },
  { id: 'flow-7', type: 'flow', name: '', x: 0, y: 0, sourceId: 'gateway-1', targetId: 'task-ar' },
  { id: 'flow-8', type: 'flow', name: '', x: 0, y: 0, sourceId: 'gateway-1', targetId: 'task-ap' },
  { id: 'flow-9', type: 'flow', name: '', x: 0, y: 0, sourceId: 'gateway-1', targetId: 'task-manual' },
  { id: 'flow-10', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-ar', targetId: 'gateway-2' },
  { id: 'flow-11', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-ap', targetId: 'gateway-2' },
  { id: 'flow-12', type: 'flow', name: '', x: 0, y: 0, sourceId: 'task-manual', targetId: 'gateway-2' },
  { id: 'flow-13', type: 'flow', name: '', x: 0, y: 0, sourceId: 'gateway-2', targetId: 'end-success' },
  { id: 'flow-14', type: 'flow', name: '', x: 0, y: 0, sourceId: 'gateway-2', targetId: 'end-delete' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Trinity Summary Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface TrinitySummaryProps {
  loopProgress: LoopProgress[];
  stats: SystemStats | null;
  deletionCandidates: number;
  onTriggerBlackHole: () => void;
}

function TrinitySummary({ loopProgress, stats, deletionCandidates, onTriggerBlackHole }: TrinitySummaryProps) {
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: string }>>([
    { time: '12:45:32', message: '송장 자동생성 → 삭제 대기열 추가', type: 'delete' },
    { time: '12:44:18', message: 'K-Value 최적화 완료 (FIN.AR)', type: 'success' },
    { time: '12:43:55', message: '학습 루프 진척도 65% 도달', type: 'info' },
    { time: '12:42:30', message: '고위험 업무 감지: 수동 검토', type: 'warning' },
  ]);

  // 로그 주기적 추가 (데모)
  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        { message: 'AI 피드백 분석 완료', type: 'success' },
        { message: '자동화 레벨 업데이트', type: 'info' },
        { message: 'K/I 계수 재계산', type: 'info' },
      ];
      const random = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [
        { time: new Date().toLocaleTimeString('ko-KR', { hour12: false }), ...random },
        ...prev.slice(0, 9),
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold">Trinity Summary</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>

      {/* Loop Progress */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <LoopProgressGauge loops={loopProgress} />
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <h3 className="text-white font-bold text-sm mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats?.activeTasks || 485}</div>
            <div className="text-xs text-slate-400">Active Tasks</div>
          </div>
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-2xl font-bold text-orange-400">{deletionCandidates}</div>
            <div className="text-xs text-slate-400">Pending Delete</div>
          </div>
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-2xl font-bold text-green-400">{((stats?.avgAutomation || 0.67) * 100).toFixed(0)}%</div>
            <div className="text-xs text-slate-400">Avg Automation</div>
          </div>
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-2xl font-bold text-purple-400">{(stats?.avgKValue || 0.95).toFixed(2)}</div>
            <div className="text-xs text-slate-400">Avg K-Value</div>
          </div>
        </div>
      </div>

      {/* Efficiency Heatmap (간단한 버전) */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <h3 className="text-white font-bold text-sm mb-2">Efficiency Heatmap</h3>
        <div className="grid grid-cols-6 gap-1">
          {[...Array(18)].map((_, i) => {
            const intensity = Math.random();
            return (
              <div
                key={i}
                className="aspect-square rounded"
                style={{
                  backgroundColor: `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`,
                }}
                title={`Efficiency: ${Math.round(intensity * 100)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Black Hole Trigger */}
      {deletionCandidates > 0 && (
        <motion.button
          onClick={onTriggerBlackHole}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-xl">🌀</span>
          <span>블랙홀 흡수 ({deletionCandidates}개)</span>
        </motion.button>
      )}

      {/* Evolution Log */}
      <div className="flex-1 bg-slate-900/50 rounded-lg p-3 overflow-hidden">
        <h3 className="text-white font-bold text-sm mb-2">Evolution Log</h3>
        <div className="space-y-2 overflow-y-auto max-h-40">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="text-slate-500 font-mono shrink-0">{log.time}</span>
              <span className={`
                ${log.type === 'success' ? 'text-green-400' : ''}
                ${log.type === 'warning' ? 'text-orange-400' : ''}
                ${log.type === 'delete' ? 'text-red-400' : ''}
                ${log.type === 'info' ? 'text-slate-300' : ''}
              `}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Process Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export function ProcessDashboard() {
  const [elements, setElements] = useState<BPMNElement[]>(MOCK_BPMN_ELEMENTS);
  const [showBlackHole, setShowBlackHole] = useState(false);
  const [selectedElement, setSelectedElement] = useState<BPMNElement | null>(null);
  
  // 실시간 데이터 (Mock)
  const { metrics, loopProgress, systemStats } = useMockRealtimeData();
  
  // 삭제 대상 계산
  const deletionCandidates = elements.filter(
    el => el.type === 'task' && (el.status === 'pending_delete' || (el.automationLevel && el.automationLevel >= 0.98))
  );

  // 실시간 데이터 병합
  const realTimeData = Object.fromEntries(
    Object.entries(metrics).map(([id, metric]) => [
      id,
      {
        automationLevel: metric.automationLevel,
        kValue: metric.kValue,
        avgDuration: metric.avgDuration,
      },
    ])
  );

  // 블랙홀 삭제 트리거
  const handleBlackHoleTrigger = useCallback(() => {
    setShowBlackHole(true);
  }, []);

  // 블랙홀 흡수 완료
  const handleBlackHoleComplete = useCallback(() => {
    setElements(prev =>
      prev.map(el =>
        deletionCandidates.some(d => d.id === el.id)
          ? { ...el, status: 'completed' as const }
          : el
      )
    );
    setShowBlackHole(false);
  }, [deletionCandidates]);

  // 요소 클릭
  const handleElementClick = useCallback((element: BPMNElement) => {
    setSelectedElement(element);
  }, []);

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col overflow-hidden">
      {/* Top Status Bar */}
      <header className="h-14 bg-slate-800/80 border-b border-slate-700 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-lg">AUTUS Process Dashboard</h1>
          <div className="w-px h-6 bg-slate-600" />
          <span className="text-slate-400 text-sm">BPMN + Real-time Overlay</span>
        </div>
        <SystemStatsBar stats={systemStats} />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* BPMN Viewer (70%) */}
        <div className="w-[70%] h-full p-4">
          <BPMNViewer
            elements={elements}
            onElementClick={handleElementClick}
            onDeleteTrigger={(ids) => console.log('Delete triggered:', ids)}
            realTimeData={realTimeData}
            overlayConfig={{
              showAutomationBadge: true,
              showDurationOverlay: true,
              showStatusIndicator: true,
              showHeatmap: true,
              pulseOnHighAutomation: true,
            }}
          />
        </div>

        {/* Trinity Summary (30%) */}
        <div className="w-[30%] h-full p-4 pl-0">
          <TrinitySummary
            loopProgress={loopProgress}
            stats={systemStats}
            deletionCandidates={deletionCandidates.length}
            onTriggerBlackHole={handleBlackHoleTrigger}
          />
        </div>
      </div>

      {/* Black Hole Animation Overlay */}
      <BlackHoleAnimation
        isActive={showBlackHole}
        centerX={window.innerWidth * 0.35}
        centerY={window.innerHeight * 0.5}
        absorbingItems={deletionCandidates.map(el => ({
          id: el.id,
          name: el.name,
          x: (el.x || 0) + 70,
          y: (el.y || 0) + 35,
          color: '#10b981',
        }))}
        onAbsorbComplete={handleBlackHoleComplete}
      />

      {/* Selected Element Modal */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedElement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-6 w-96 shadow-2xl border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">{selectedElement.name}</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white capitalize">{selectedElement.type}</span>
                </div>
                {selectedElement.automationLevel !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Automation</span>
                    <span className="text-green-400 font-mono">
                      {Math.round(selectedElement.automationLevel * 100)}%
                    </span>
                  </div>
                )}
                {selectedElement.kValue !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">K-Value</span>
                    <span className={`font-mono ${selectedElement.kValue >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedElement.kValue.toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedElement.avgDuration !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Duration</span>
                    <span className="text-blue-400 font-mono">
                      {selectedElement.avgDuration < 1000
                        ? `${selectedElement.avgDuration}ms`
                        : `${(selectedElement.avgDuration / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-medium ${
                    selectedElement.status === 'pending_delete' ? 'text-red-400' :
                    selectedElement.status === 'high_risk' ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {selectedElement.status || 'active'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedElement(null)}
                className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProcessDashboard;
