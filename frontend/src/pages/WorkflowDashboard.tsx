/**
 * AUTUS Workflow Dashboard
 * BPMN + Force Graph 하이브리드 UI
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, Settings, ChevronRight, 
  Zap, Target, GitBranch, Trash2, 
  RotateCcw, Filter, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'gateway' | 'subprocess';
  label: string;
  labelKo: string;
  x: number;
  y: number;
  automation: number;
  status: 'active' | 'pending' | 'completed' | 'deleting';
  kValue: number;
  connections: string[];
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  cluster: number;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_WORKFLOW_NODES: WorkflowNode[] = [
  { id: 'start', type: 'start', label: 'Start', labelKo: '시작', x: 80, y: 40, automation: 100, status: 'completed', kValue: 1.0, connections: ['process-1'] },
  { id: 'process-1', type: 'task', label: 'Process A', labelKo: '계약 검토', x: 60, y: 120, automation: 84, status: 'active', kValue: 0.92, connections: ['gateway-1'] },
  { id: 'process-2', type: 'task', label: 'Sub-Process', labelKo: '승인 요청', x: 220, y: 120, automation: 72, status: 'pending', kValue: 0.85, connections: ['gateway-1'] },
  { id: 'gateway-1', type: 'gateway', label: 'Decision', labelKo: '분기', x: 95, y: 230, automation: 100, status: 'active', kValue: 0.95, connections: ['process-3', 'process-4'] },
  { id: 'process-3', type: 'task', label: 'Process B', labelKo: '문서 생성', x: 60, y: 320, automation: 95, status: 'pending', kValue: 0.98, connections: ['gateway-2'] },
  { id: 'process-4', type: 'subprocess', label: 'Decision A', labelKo: '결재', x: 220, y: 320, automation: 68, status: 'pending', kValue: 0.78, connections: ['gateway-2'] },
  { id: 'gateway-2', type: 'gateway', label: 'Merge', labelKo: '병합', x: 95, y: 420, automation: 100, status: 'pending', kValue: 1.0, connections: ['end'] },
  { id: 'end', type: 'end', label: 'End', labelKo: '종료', x: 80, y: 510, automation: 100, status: 'pending', kValue: 1.0, connections: [] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Graph Data Generator
// ═══════════════════════════════════════════════════════════════════════════════

const generateGraphData = () => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  
  // 5개 클러스터 생성
  for (let c = 0; c < 5; c++) {
    const centerX = 250 + Math.cos((c / 5) * Math.PI * 2) * 120;
    const centerY = 250 + Math.sin((c / 5) * Math.PI * 2) * 120;
    const nodesInCluster = 6 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < nodesInCluster; i++) {
      const angle = (i / nodesInCluster) * Math.PI * 2;
      const radius = 25 + Math.random() * 35;
      const nodeId = `n-${c}-${i}`;
      
      nodes.push({
        id: nodeId,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        size: 3 + Math.random() * 4,
        color: c % 2 === 0 ? '#00d4ff' : '#ff00ff',
        cluster: c,
      });
    }
  }
  
  // 클러스터 내부 연결
  nodes.forEach((node) => {
    const sameCluster = nodes.filter(n => n.cluster === node.cluster && n.id !== node.id);
    const numConnections = Math.min(2, sameCluster.length);
    for (let j = 0; j < numConnections; j++) {
      const target = sameCluster[Math.floor(Math.random() * sameCluster.length)];
      if (!links.find(l => 
        (l.source === node.id && l.target === target.id) || 
        (l.source === target.id && l.target === node.id)
      )) {
        links.push({ source: node.id, target: target.id, strength: 0.3 + Math.random() * 0.3 });
      }
    }
  });
  
  // 클러스터 간 연결
  for (let c = 0; c < 5; c++) {
    const cluster1 = nodes.filter(n => n.cluster === c);
    const cluster2 = nodes.filter(n => n.cluster === (c + 1) % 5);
    if (cluster1.length && cluster2.length) {
      links.push({
        source: cluster1[0].id,
        target: cluster2[0].id,
        strength: 0.5,
      });
    }
  }
  
  return { nodes, links };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BPMN Node Component
// ═══════════════════════════════════════════════════════════════════════════════

const BPMNNode: React.FC<{
  node: WorkflowNode;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ node, selected, onSelect, onDelete }) => {
  
  const getNodeStyle = () => {
    switch (node.type) {
      case 'start': return 'rounded-full bg-cyan-500/20 border-cyan-500';
      case 'end': return 'rounded-full bg-gray-500/20 border-gray-500';
      case 'gateway': return 'rotate-45 bg-emerald-500/10 border-emerald-500';
      case 'subprocess': return 'rounded-lg bg-purple-500/10 border-purple-500 border-dashed';
      default: return 'rounded-lg bg-slate-800/80 border-slate-600';
    }
  };

  const getAutomationColor = () => {
    if (node.automation >= 95) return 'text-emerald-400';
    if (node.automation >= 80) return 'text-cyan-400';
    if (node.automation >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isSmallNode = node.type === 'gateway' || node.type === 'start' || node.type === 'end';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: node.status === 'deleting' ? 0 : 1, 
        scale: node.status === 'deleting' ? 0 : 1,
      }}
      transition={{ duration: 0.3 }}
      className="absolute cursor-pointer"
      style={{ left: node.x, top: node.y }}
      onClick={() => onSelect(node.id)}
    >
      <div className={`
        relative border-2 ${isSmallNode ? 'p-2' : 'p-3'}
        ${getNodeStyle()}
        ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black' : ''}
        ${node.status === 'active' ? 'shadow-lg shadow-cyan-500/30' : ''}
        ${isSmallNode ? 'w-10 h-10 flex items-center justify-center' : 'min-w-[130px]'}
      `}>
        {node.type === 'gateway' ? (
          <div className="-rotate-45">
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
        ) : node.type === 'start' ? (
          <Zap className="w-4 h-4 text-cyan-400" />
        ) : node.type === 'end' ? (
          <Target className="w-4 h-4 text-gray-400" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                {node.label}
              </span>
              {node.status === 'active' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <div className="text-xs font-medium text-white mb-1.5">{node.labelKo}</div>
            <div className="flex items-center justify-between text-[9px]">
              <span className={getAutomationColor()}>{node.automation}%</span>
              <span className="text-slate-500">K={node.kValue.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${node.automation}%` }}
                className={`h-full ${
                  node.automation >= 95 ? 'bg-emerald-500' :
                  node.automation >= 80 ? 'bg-cyan-500' :
                  node.automation >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            </div>
          </>
        )}

        {selected && node.type === 'task' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          >
            <Trash2 className="w-2.5 h-2.5 text-white" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Lines (SVG)
// ═══════════════════════════════════════════════════════════════════════════════

const ConnectionLines: React.FC<{ nodes: WorkflowNode[] }> = ({ nodes }) => {
  const getCenter = (node: WorkflowNode) => {
    const size = node.type === 'gateway' || node.type === 'start' || node.type === 'end' ? 40 : 130;
    const height = node.type === 'gateway' || node.type === 'start' || node.type === 'end' ? 40 : 85;
    return { x: node.x + size / 2, y: node.y + height / 2 };
  };

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#475569" />
        </marker>
      </defs>
      {nodes.flatMap(node =>
        node.connections.map(targetId => {
          const target = nodes.find(n => n.id === targetId);
          if (!target) return null;
          const start = getCenter(node);
          const end = getCenter(target);
          return (
            <g key={`${node.id}-${targetId}`}>
              <line
                x1={start.x} y1={start.y}
                x2={end.x} y2={end.y}
                stroke="#334155"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <circle r="2" fill="#00d4ff">
                <animate
                  attributeName="cx"
                  from={start.x} to={end.x}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  from={start.y} to={end.y}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })
      )}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Force Graph (Canvas)
// ═══════════════════════════════════════════════════════════════════════════════

const ForceGraph: React.FC<{ nodes: GraphNode[]; links: GraphLink[] }> = ({ nodes, links }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, 500, 500);
      
      // Links
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = `rgba(100, 116, 139, ${link.strength})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      
      // Nodes
      nodes.forEach(node => {
        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
        gradient.addColorStop(0, node.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    
    draw();
  }, [nodes, links]);

  return <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Circular Progress
// ═══════════════════════════════════════════════════════════════════════════════

const CircularProgress: React.FC<{ value: number; size?: number }> = ({ value, size = 60 }) => {
  const r = (size - 6) / 2;
  const circ = r * 2 * Math.PI;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? '#00d4ff' : value >= 60 ? '#fbbf24' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{value}%</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Black Hole Animation
// ═══════════════════════════════════════════════════════════════════════════════

const BlackHole: React.FC<{ active: boolean; onComplete: () => void }> = ({ active, onComplete }) => {
  useEffect(() => {
    if (active) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute w-48 h-48 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent, #ff00ff, #00d4ff, transparent)',
          filter: 'blur(15px)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.3, 0] }}
        transition={{ duration: 1.5 }}
        className="w-20 h-20 rounded-full bg-black border-2 border-purple-500"
        style={{ boxShadow: '0 0 40px 10px rgba(168, 85, 247, 0.4)' }}
      />
      <div className="absolute bottom-1/4 text-center text-white">
        <div className="text-lg font-bold">업무 흡수 중...</div>
        <div className="text-sm text-slate-400">자동화 완료</div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkflowDashboard() {
  const [workflowNodes, setWorkflowNodes] = useState(INITIAL_WORKFLOW_NODES);
  const [graphData] = useState(() => generateGraphData());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [blackHoleActive, setBlackHoleActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback((nodeId: string) => {
    setDeletingId(nodeId);
    setWorkflowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'deleting' as const } : n));
    setTimeout(() => setBlackHoleActive(true), 300);
  }, []);

  const handleBlackHoleComplete = useCallback(() => {
    setBlackHoleActive(false);
    setWorkflowNodes(prev => prev.filter(n => n.id !== deletingId));
    setDeletingId(null);
    setSelectedNode(null);
  }, [deletingId]);

  const stats = useMemo(() => {
    const tasks = workflowNodes.filter(n => n.type === 'task' || n.type === 'subprocess');
    const avg = tasks.reduce((s, n) => s + n.automation, 0) / (tasks.length || 1);
    return { total: tasks.length, automated: tasks.filter(t => t.automation >= 95).length, avg: Math.round(avg) };
  }, [workflowNodes]);

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col">
      {/* Header */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AUTUS Workflow
          </h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="검색..."
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm w-48 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-slate-800 rounded"><Filter className="w-4 h-4 text-slate-400" /></button>
          <button className="p-1.5 hover:bg-slate-800 rounded"><RotateCcw className="w-4 h-4 text-slate-400" /></button>
          <button className="p-1.5 hover:bg-slate-800 rounded relative">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button className="p-1.5 hover:bg-slate-800 rounded"><Settings className="w-4 h-4 text-slate-400" /></button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* BPMN Panel */}
        <div className="w-[380px] border-r border-slate-800 relative overflow-auto p-4 flex-shrink-0">
          <div className="text-xs text-slate-500 uppercase mb-1">BPMN Flow</div>
          <div className="text-sm font-semibold text-white mb-4">업무 프로세스</div>
          <div className="relative" style={{ minHeight: 580 }}>
            <ConnectionLines nodes={workflowNodes} />
            {workflowNodes.map(node => (
              <BPMNNode
                key={node.id}
                node={node}
                selected={selectedNode === node.id}
                onSelect={setSelectedNode}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-800 relative flex-shrink-0">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 bg-slate-900 border border-slate-700 rounded-full p-1.5">
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Force Graph Panel */}
        <div className="flex-1 relative bg-slate-950/50 min-w-[300px]">
          <div className="absolute top-3 right-3 text-right z-10">
            <div className="text-xs text-slate-500 uppercase mb-1">Network View</div>
            <div className="text-sm font-semibold text-white">관계 그래프</div>
          </div>
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            <CircularProgress value={84} size={48} />
            <CircularProgress value={72} size={48} />
            <CircularProgress value={95} size={48} />
          </div>
          <div className="w-full h-full flex items-center justify-center">
            <ForceGraph nodes={graphData.nodes} links={graphData.links} />
          </div>
          {/* Center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 rounded-full border border-purple-500/50"
              style={{ boxShadow: '0 0 30px 8px rgba(168, 85, 247, 0.25)' }}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-56 bg-slate-900/50 border-l border-slate-800 p-3 flex-shrink-0 overflow-auto">
          <div className="text-center mb-4">
            <CircularProgress value={stats.avg} size={80} />
            <div className="text-xs text-slate-400 mt-1">자동화율</div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/50 rounded p-2 text-center">
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-slate-400">전체</div>
            </div>
            <div className="bg-slate-800/50 rounded p-2 text-center">
              <div className="text-xl font-bold text-emerald-400">{stats.automated}</div>
              <div className="text-[10px] text-slate-400">완전자동화</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 uppercase mb-2">상태 범례</div>
          <div className="space-y-1 mb-4">
            {[
              { c: 'bg-emerald-500', l: '95%+ 자동화' },
              { c: 'bg-cyan-500', l: '80-94%' },
              { c: 'bg-yellow-500', l: '60-79%' },
              { c: 'bg-red-500', l: '60% 미만' },
            ].map(i => (
              <div key={i.l} className="flex items-center gap-2 text-[10px] text-slate-300">
                <div className={`w-2 h-2 rounded-full ${i.c}`} />
                {i.l}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-500 uppercase mb-2">최근 활동</div>
          <div className="space-y-2">
            {[
              { icon: TrendingUp, text: '계약검토 84%→92%', time: '2분 전' },
              { icon: Activity, text: '승인요청 자동화', time: '5분 전' },
              { icon: AlertTriangle, text: '결재 프로세스 지연', time: '10분 전' },
            ].map((item, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <item.icon className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-300">{item.text}</div>
                  <div className="text-slate-500">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900/50 flex items-center px-4 text-[10px] text-slate-500 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          시스템 정상
        </span>
        <span className="mx-3">|</span>
        <span>노드: {workflowNodes.length}</span>
        <span className="ml-auto">업데이트: 방금 전</span>
      </footer>

      {/* Black Hole */}
      <AnimatePresence>
        {blackHoleActive && <BlackHole active={blackHoleActive} onComplete={handleBlackHoleComplete} />}
      </AnimatePresence>
    </div>
  );
}
