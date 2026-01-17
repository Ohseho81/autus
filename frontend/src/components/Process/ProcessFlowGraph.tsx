/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Process Flow Graph
 * BPMN + Force-Directed Graph 하이브리드 UI
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 2026 글로벌 트렌드:
 * - BPMN 플로우 위에 노드 그래프 오버레이
 * - 노드 색상 = automation-level
 * - 삭제 시 블랙홀로 흡수되는 애니메이션
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ProcessNode {
  id: string;
  name: string;
  code: string;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  automationLevel: number;  // 0-1
  kValue: number;
  iValue: number;
  status: 'active' | 'deletion_candidate' | 'high_risk' | 'deleted';
  x?: number;
  y?: number;
  parentId?: string;
}

interface ProcessEdge {
  source: string;
  target: string;
  type: 'hierarchy' | 'impact' | 'dependency';
  weight: number;
}

interface BlackHoleState {
  active: boolean;
  absorbingNodes: string[];
  centerX: number;
  centerY: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data (실제로는 API에서 가져옴)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_NODES: ProcessNode[] = [
  // L1 (도메인)
  { id: 'FIN', name: '재무/회계', code: 'FIN', level: 'L1', automationLevel: 0.3, kValue: 1.0, iValue: 0, status: 'active' },
  { id: 'HR', name: '인사/노무', code: 'HR', level: 'L1', automationLevel: 0.25, kValue: 0.95, iValue: 0.1, status: 'active' },
  { id: 'SALES', name: '영업/고객', code: 'SALES', level: 'L1', automationLevel: 0.4, kValue: 1.1, iValue: 0.2, status: 'active' },
  
  // L2 (카테고리)
  { id: 'FIN.AR', name: '매출채권', code: 'FIN.AR', level: 'L2', automationLevel: 0.6, kValue: 0.95, iValue: 0, status: 'active', parentId: 'FIN' },
  { id: 'FIN.AP', name: '매입채무', code: 'FIN.AP', level: 'L2', automationLevel: 0.7, kValue: 0.9, iValue: 0, status: 'active', parentId: 'FIN' },
  { id: 'HR.REC', name: '채용', code: 'HR.REC', level: 'L2', automationLevel: 0.5, kValue: 0.85, iValue: 0.15, status: 'active', parentId: 'HR' },
  
  // L3 (세부) - 일부는 삭제 대상
  { id: 'FIN.AR.INV', name: '송장 자동생성', code: 'FIN.AR.INV', level: 'L3', automationLevel: 0.99, kValue: 1.2, iValue: 0, status: 'deletion_candidate', parentId: 'FIN.AR' },
  { id: 'FIN.AR.REC', name: '정기 송장', code: 'FIN.AR.REC', level: 'L3', automationLevel: 0.98, kValue: 1.15, iValue: 0, status: 'deletion_candidate', parentId: 'FIN.AR' },
  { id: 'FIN.AP.PAY', name: '자동 결제', code: 'FIN.AP.PAY', level: 'L3', automationLevel: 0.95, kValue: 1.1, iValue: 0, status: 'active', parentId: 'FIN.AP' },
  
  // 고위험 업무
  { id: 'HR.REC.MAN', name: '수동 계약검토', code: 'HR.REC.MAN', level: 'L3', automationLevel: 0.2, kValue: 0.7, iValue: -0.1, status: 'high_risk', parentId: 'HR.REC' },
];

const MOCK_EDGES: ProcessEdge[] = [
  { source: 'FIN', target: 'FIN.AR', type: 'hierarchy', weight: 1 },
  { source: 'FIN', target: 'FIN.AP', type: 'hierarchy', weight: 1 },
  { source: 'HR', target: 'HR.REC', type: 'hierarchy', weight: 1 },
  { source: 'FIN.AR', target: 'FIN.AR.INV', type: 'hierarchy', weight: 1 },
  { source: 'FIN.AR', target: 'FIN.AR.REC', type: 'hierarchy', weight: 1 },
  { source: 'FIN.AP', target: 'FIN.AP.PAY', type: 'hierarchy', weight: 1 },
  { source: 'HR.REC', target: 'HR.REC.MAN', type: 'hierarchy', weight: 1 },
  // 영향 관계
  { source: 'FIN.AR.INV', target: 'FIN.AP.PAY', type: 'impact', weight: 0.3 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Color Utilities
// ═══════════════════════════════════════════════════════════════════════════════

const getNodeColor = (node: ProcessNode): string => {
  if (node.status === 'deleted') return '#1f2937';
  if (node.status === 'deletion_candidate') return '#10b981'; // 녹색 (삭제 예정)
  if (node.status === 'high_risk') return '#ef4444'; // 빨간색 (고위험)
  
  // automation level 기반 색상
  const automation = node.automationLevel;
  if (automation >= 0.8) return '#22c55e';
  if (automation >= 0.6) return '#84cc16';
  if (automation >= 0.4) return '#eab308';
  if (automation >= 0.2) return '#f97316';
  return '#ef4444';
};

const getNodeSize = (node: ProcessNode): number => {
  const baseSizes = { L1: 60, L2: 45, L3: 35, L4: 28, L5: 22 };
  return baseSizes[node.level] || 30;
};

const getLevelY = (level: string): number => {
  const positions = { L1: 80, L2: 180, L3: 280, L4: 380, L5: 480 };
  return positions[level as keyof typeof positions] || 280;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Force Graph Component
// ═══════════════════════════════════════════════════════════════════════════════

export function ProcessFlowGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<ProcessNode[]>(MOCK_NODES);
  const [edges] = useState<ProcessEdge[]>(MOCK_EDGES);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [blackHole, setBlackHole] = useState<BlackHoleState>({
    active: false,
    absorbingNodes: [],
    centerX: 400,
    centerY: 300,
  });

  // 노드 위치 초기화
  useEffect(() => {
    const positionedNodes = nodes.map((node, idx) => {
      const levelNodes = nodes.filter(n => n.level === node.level);
      const levelIdx = levelNodes.indexOf(node);
      const totalInLevel = levelNodes.length;
      
      return {
        ...node,
        x: 100 + (levelIdx * (700 / Math.max(totalInLevel, 1))),
        y: getLevelY(node.level) + (Math.random() - 0.5) * 30,
      };
    });
    setNodes(positionedNodes);
  }, []);

  // 블랙홀 삭제 애니메이션
  const triggerBlackHoleAbsorb = useCallback((nodeIds: string[]) => {
    setBlackHole({
      active: true,
      absorbingNodes: nodeIds,
      centerX: 400,
      centerY: 300,
    });

    // 3초 후 노드 완전 삭제
    setTimeout(() => {
      setNodes(prev => prev.map(n => 
        nodeIds.includes(n.id) ? { ...n, status: 'deleted' as const } : n
      ));
      setBlackHole(prev => ({ ...prev, active: false, absorbingNodes: [] }));
    }, 2000);
  }, []);

  // 삭제 대상 일괄 흡수
  const absorbDeletionCandidates = () => {
    const candidates = nodes.filter(n => n.status === 'deletion_candidate').map(n => n.id);
    if (candidates.length > 0) {
      triggerBlackHoleAbsorb(candidates);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Process Flow Graph</h2>
          <p className="text-sm text-slate-400">BPMN + Force Graph 하이브리드</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={absorbDeletionCandidates}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          >
            🌀 블랙홀 흡수 실행
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-400">삭제 예정 (98%+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">고위험 (K&lt;1.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-400">일반</span>
        </div>
      </div>

      {/* Graph SVG */}
      <div className="relative bg-slate-800/50 rounded-xl overflow-hidden" style={{ height: 'calc(100% - 120px)' }}>
        <svg ref={svgRef} className="w-full h-full">
          {/* Level Labels */}
          {['L1', 'L2', 'L3', 'L4', 'L5'].map((level, idx) => (
            <text
              key={level}
              x={20}
              y={getLevelY(level)}
              fill="#64748b"
              fontSize={12}
              fontWeight="bold"
            >
              {level}
            </text>
          ))}

          {/* Edges */}
          {edges.map((edge, idx) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode?.x || !targetNode?.x) return null;

            return (
              <line
                key={idx}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={edge.type === 'impact' ? '#8b5cf6' : '#475569'}
                strokeWidth={edge.type === 'impact' ? 2 : 1}
                strokeDasharray={edge.type === 'impact' ? '4,4' : '0'}
                opacity={0.6}
              />
            );
          })}

          {/* Black Hole */}
          <AnimatePresence>
            {blackHole.active && (
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                {/* Outer glow */}
                <motion.circle
                  cx={blackHole.centerX}
                  cy={blackHole.centerY}
                  r={80}
                  fill="url(#blackHoleGradient)"
                  animate={{ r: [80, 100, 80] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                {/* Inner core */}
                <circle
                  cx={blackHole.centerX}
                  cy={blackHole.centerY}
                  r={30}
                  fill="#0f0f0f"
                />
                {/* Event horizon */}
                <motion.circle
                  cx={blackHole.centerX}
                  cy={blackHole.centerY}
                  r={40}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Gradient Definition */}
          <defs>
            <radialGradient id="blackHoleGradient">
              <stop offset="0%" stopColor="#1f1f1f" />
              <stop offset="50%" stopColor="#4c1d95" stopOpacity={0.5} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Nodes */}
          <AnimatePresence>
            {nodes.filter(n => n.status !== 'deleted').map(node => {
              const isAbsorbing = blackHole.absorbingNodes.includes(node.id);
              const size = getNodeSize(node);

              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 1 }}
                  animate={isAbsorbing ? {
                    x: blackHole.centerX - (node.x || 0),
                    y: blackHole.centerY - (node.y || 0),
                    scale: 0,
                    opacity: 0,
                  } : { scale: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeIn' }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={size / 2}
                    fill={getNodeColor(node)}
                    stroke={selectedNode?.id === node.id ? '#fff' : 'transparent'}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={(node.y || 0) + size / 2 + 14}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={10}
                  >
                    {node.name}
                  </text>
                  {/* Automation level */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {Math.round(node.automationLevel * 100)}%
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Particles (블랙홀 흡수 시 파티클 효과) */}
        <AnimatePresence>
          {blackHole.active && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-purple-500"
                  initial={{
                    x: Math.random() * 800,
                    y: Math.random() * 600,
                    opacity: 1,
                  }}
                  animate={{
                    x: blackHole.centerX,
                    y: blackHole.centerY,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{
                    duration: 1.5 + Math.random(),
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Node Info */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: getNodeColor(selectedNode) }}
              >
                <span className="text-white font-bold">{selectedNode.level}</span>
              </div>
              <div>
                <h3 className="text-white font-bold">{selectedNode.name}</h3>
                <p className="text-slate-400 text-sm">{selectedNode.code}</p>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-mono">K: {selectedNode.kValue.toFixed(2)}</div>
                <div className="text-blue-400 font-mono">Auto: {Math.round(selectedNode.automationLevel * 100)}%</div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="ml-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProcessFlowGraph;
