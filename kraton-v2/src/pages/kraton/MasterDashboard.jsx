/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ KRATON MASTER DASHBOARD: THE GROUND TRUTH
 * 관계성 데이터 독점을 위한 전략 통제실
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA
// ============================================

const generateRelationalNodes = () => {
  const nodes = [
    // Teachers
    { id: 't1', name: '김선생', type: 'teacher', mass: 85, x: 0.5, y: 0.3, style: 'strict' },
    { id: 't2', name: '이선생', type: 'teacher', mass: 72, x: 0.3, y: 0.5, style: 'caring' },
    { id: 't3', name: '박선생', type: 'teacher', mass: 68, x: 0.7, y: 0.6, style: 'analytical' },
    // Students
    { id: 's1', name: '오연우', type: 'student', mass: 45, x: 0.4, y: 0.4, personality: 'anxious', risk: true },
    { id: 's2', name: '김철수', type: 'student', mass: 78, x: 0.6, y: 0.35, personality: 'confident' },
    { id: 's3', name: '이영희', type: 'student', mass: 82, x: 0.55, y: 0.55, personality: 'diligent' },
    { id: 's4', name: '박민수', type: 'student', mass: 38, x: 0.25, y: 0.65, personality: 'passive', risk: true },
    // Parents
    { id: 'p1', name: '오연우 어머니', type: 'parent', mass: 55, x: 0.35, y: 0.7, trust: 0.42 },
    { id: 'p2', name: '김철수 어머니', type: 'parent', mass: 70, x: 0.65, y: 0.25, trust: 0.78 },
    { id: 'p3', name: '이영희 아버지', type: 'parent', mass: 65, x: 0.75, y: 0.45, trust: 0.85 },
  ];

  const edges = [
    // Teacher-Student relations
    { source: 't1', target: 's1', strength: 0.35, chemistry: -0.2 },
    { source: 't1', target: 's2', strength: 0.82, chemistry: 0.7 },
    { source: 't2', target: 's3', strength: 0.88, chemistry: 0.85 },
    { source: 't2', target: 's4', strength: 0.45, chemistry: 0.1 },
    { source: 't3', target: 's1', strength: 0.55, chemistry: 0.3 },
    // Student-Parent relations
    { source: 's1', target: 'p1', strength: 0.6, type: 'family' },
    { source: 's2', target: 'p2', strength: 0.85, type: 'family' },
    { source: 's3', target: 'p3', strength: 0.9, type: 'family' },
    // Teacher-Parent relations
    { source: 't1', target: 'p1', strength: 0.38, chemistry: -0.3 },
    { source: 't1', target: 'p2', strength: 0.75, chemistry: 0.5 },
  ];

  return { nodes, edges };
};

const generateVCurveData = () => {
  const data = [];
  let v = 3500000000; // 35억 시작
  for (let i = 0; i < 30; i++) {
    const growth = 1 + (Math.random() * 0.02 - 0.005); // -0.5% ~ +1.5%
    v *= growth;
    data.push({
      day: i,
      value: v,
      kr: v * 0.65,
      ph: v * 0.35,
    });
  }
  return data;
};

const generateRiskQueue = () => [
  {
    id: 'r1',
    priority: 'CRITICAL',
    nodeId: 's1',
    nodeName: '오연우',
    type: 'churn_imminent',
    sIndex: 0.32,
    sIndexDelta: -0.25,
    mScore: 45,
    daysToChurn: 14,
    trigger: '성취도 하락 + 학부모 불안 지수 급증',
    recommendation: '48시간 내 긴급 상담 및 맞춤 케어 플랜 수립',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'r2',
    priority: 'HIGH',
    nodeId: 's4',
    nodeName: '박민수',
    type: 'satisfaction_drop',
    sIndex: 0.41,
    sIndexDelta: -0.15,
    mScore: 52,
    daysToChurn: 45,
    trigger: '최근 3회 상담 태그 모두 "불안"',
    recommendation: '담당 선생님 Chemistry 재검토 필요',
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'r3',
    priority: 'MEDIUM',
    nodeId: 'p1',
    nodeName: '오연우 어머니',
    type: 'trust_decline',
    sIndex: 0.42,
    sIndexDelta: -0.08,
    trigger: 'Trust Score 임계치 근접',
    recommendation: '원장 직접 통화 권장',
    createdAt: Date.now() - 14400000,
  },
];

const generateChemistryData = () => [
  { teacher: '김선생 (엄격형)', student: '김철수 (자기주도)', chemistry: 0.85, v_created: 2450000, success: true },
  { teacher: '이선생 (칭찬형)', student: '이영희 (성실형)', chemistry: 0.92, v_created: 3120000, success: true },
  { teacher: '김선생 (엄격형)', student: '오연우 (불안형)', chemistry: -0.35, v_created: -180000, success: false },
  { teacher: '박선생 (분석형)', student: '박민수 (소극형)', chemistry: 0.28, v_created: 450000, success: null },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e9) return `₩${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  return `₩${value.toLocaleString()}`;
};

const formatTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

// ============================================
// SUB COMPONENTS
// ============================================

// 시스템 상태 HUD
const SystemHUD = memo(function SystemHUD({ confidence, stability, mode }) {
  return (
    <div className="bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-3">
      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider">
        <div className="flex items-center gap-6">
          <span className="text-white font-bold">KRATON ENGINE v1.0</span>
          <span className="text-gray-500">|</span>
          <span>MODE: <span className="text-cyan-400">[{mode}]</span></span>
          <span className="text-gray-500">|</span>
          <span>CONFIDENCE: <span className="text-emerald-400">{confidence}%</span></span>
          <span className="text-gray-500">|</span>
          <span>STABILITY: <span className="text-emerald-400">{stability}</span></span>
        </div>
        <div className="flex items-center gap-6">
          <span>NEXT_ACTION: <span className="text-purple-400">[GLOBAL V-CONSOLIDATION]</span></span>
          <span className="text-gray-500">|</span>
          <span>SAFETY: <span className="text-emerald-400">[GREEN]</span></span>
          <span className="text-gray-500">|</span>
          <span>STATE: <span className="text-cyan-400 animate-pulse">LEARNING</span></span>
        </div>
      </div>
    </div>
  );
});

// Relational Perception Map (Canvas)
const PerceptionMap = memo(function PerceptionMap({ nodes, edges, onNodeClick }) {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    setDimensions({ width, height });

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      const x1 = source.x * width;
      const y1 = source.y * height;
      const x2 = target.x * width;
      const y2 = target.y * height;

      // Edge color based on chemistry
      const chemistry = edge.chemistry || 0;
      const r = chemistry < 0 ? 239 : 16;
      const g = chemistry < 0 ? 68 : 185;
      const b = chemistry < 0 ? 68 : 129;
      const alpha = Math.abs(edge.strength) * 0.6;

      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = Math.max(1, edge.strength * 4);

      // Dashed for weak relations
      if (edge.strength < 0.5) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw nodes
    nodes.forEach(node => {
      const x = node.x * width;
      const y = node.y * height;
      const radius = Math.max(8, node.mass / 5);

      // Node glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      
      let color;
      if (node.risk) {
        color = { r: 239, g: 68, b: 68 };
      } else if (node.type === 'teacher') {
        color = { r: 59, g: 130, b: 246 };
      } else if (node.type === 'student') {
        color = { r: 16, g: 185, b: 129 };
      } else {
        color = { r: 168, g: 85, b: 247 };
      }

      gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.8)`);
      gradient.addColorStop(0.5, `rgba(${color.r},${color.g},${color.b},0.2)`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Risk pulse
      if (node.risk) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 10 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, x, y + radius + 15);
    });
  }, [nodes, edges]);

  return (
    <div className="relative w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="rounded-2xl"
      />
      <div className="absolute top-4 left-4 space-y-1 text-[9px] font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-400">Teacher</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-400">Student</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-gray-400">Parent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-gray-400">Risk Node</span>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 text-[9px] text-gray-600">
        Drag to explore relational vectors
      </div>
    </div>
  );
});

// V-Curve Chart
const VCurveChart = memo(function VCurveChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const maxV = Math.max(...data.map(d => d.value));
    const minV = Math.min(...data.map(d => d.value));
    const padding = 40;

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + ((height - padding * 2) * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw V-Curve (total)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.value - minV) / (maxV - minV)) * (height - padding * 2);
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.value - minV) / (maxV - minV)) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest value label
    const lastData = data[data.length - 1];
    const lastX = width - padding;
    const lastY = height - padding - ((lastData.value - minV) / (maxV - minV)) * (height - padding * 2);
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(lastData.value), lastX - 10, lastY - 10);
  }, [data]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={160}
      className="w-full"
    />
  );
});

// Risk Card
const RiskCard = memo(function RiskCard({ risk, onExecute }) {
  const priorityColors = {
    CRITICAL: 'border-red-500/50 bg-red-500/10',
    HIGH: 'border-orange-500/50 bg-orange-500/10',
    MEDIUM: 'border-yellow-500/50 bg-yellow-500/10',
    LOW: 'border-gray-500/50 bg-gray-500/10',
  };

  const priorityTextColors = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-gray-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${priorityColors[risk.priority]}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-mono ${priorityTextColors[risk.priority]}`}>
          {risk.priority} RISK
        </span>
        <span className="text-[10px] text-gray-500">{formatTime(risk.createdAt)}</span>
      </div>
      
      <h4 className="text-white font-bold mb-1">{risk.nodeName}</h4>
      <p className="text-gray-400 text-sm mb-3">{risk.trigger}</p>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 bg-black/30 rounded-lg">
          <p className={`font-mono text-sm ${risk.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {(risk.sIndex * 100).toFixed(0)}%
          </p>
          <p className="text-[9px] text-gray-500">s-Index</p>
        </div>
        <div className="p-2 bg-black/30 rounded-lg">
          <p className="font-mono text-sm text-red-400">
            {risk.sIndexDelta > 0 ? '+' : ''}{(risk.sIndexDelta * 100).toFixed(0)}%
          </p>
          <p className="text-[9px] text-gray-500">Δ Change</p>
        </div>
        {risk.daysToChurn && (
          <div className="p-2 bg-black/30 rounded-lg">
            <p className="font-mono text-sm text-orange-400">{risk.daysToChurn}일</p>
            <p className="text-[9px] text-gray-500">예상 이탈</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-cyan-400 mb-3">💡 {risk.recommendation}</p>

      <button
        onClick={() => onExecute(risk)}
        className={`w-full py-2 rounded-lg text-xs font-bold transition-all border ${
          risk.priority === 'CRITICAL'
            ? 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border-red-600/30'
            : 'bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border-orange-600/30'
        }`}
      >
        개입 승인 (Execute Rescue Ops)
      </button>
    </motion.div>
  );
});

// Chemistry Table
const ChemistryTable = memo(function ChemistryTable({ data }) {
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div 
          key={idx}
          className={`p-3 rounded-lg border ${
            item.success === true ? 'bg-emerald-500/10 border-emerald-500/30' :
            item.success === false ? 'bg-red-500/10 border-red-500/30' :
            'bg-gray-800/50 border-gray-700/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm">{item.teacher}</span>
              <span className="text-gray-600">↔</span>
              <span className="text-emerald-400 text-sm">{item.student}</span>
            </div>
            <span className={`text-xs font-mono ${
              item.chemistry > 0.5 ? 'text-emerald-400' :
              item.chemistry < 0 ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              Chemistry: {item.chemistry > 0 ? '+' : ''}{(item.chemistry * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">V Created:</span>
            <span className={item.v_created > 0 ? 'text-emerald-400' : 'text-red-400'}>
              {item.v_created > 0 ? '+' : ''}{formatCurrency(item.v_created)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

// Global Telemetry
const GlobalTelemetry = memo(function GlobalTelemetry({ krValue, phValue }) {
  const total = krValue + phValue;
  const krPercent = (krValue / total * 100).toFixed(1);
  const phPercent = (phValue / total * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🇰🇷</span>
          <span className="text-white text-sm">Korea HQ</span>
        </div>
        <div className="text-right">
          <p className="text-cyan-400 font-mono">{formatCurrency(krValue)}</p>
          <p className="text-[9px] text-gray-500">{krPercent}%</p>
        </div>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-cyan-500 h-full" style={{ width: `${krPercent}%` }} />
        <div className="bg-purple-500 h-full" style={{ width: `${phPercent}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🇵🇭</span>
          <span className="text-white text-sm">Clark PEZA Hub</span>
        </div>
        <div className="text-right">
          <p className="text-purple-400 font-mono">{formatCurrency(phValue)}</p>
          <p className="text-[9px] text-gray-500">{phPercent}%</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[9px] text-emerald-400">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        PEZA Tax Credit Active: -25% Corporate Tax
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function MasterDashboard() {
  const [relationalData] = useState(generateRelationalNodes);
  const [vCurveData] = useState(generateVCurveData);
  const [riskQueue, setRiskQueue] = useState(generateRiskQueue);
  const [chemistryData] = useState(generateChemistryData);
  const [systemStats, setSystemStats] = useState({
    confidence: 98.4,
    stability: 'OPTIMAL',
    mode: 'AUTO-PILOT',
    tSaved: 847,
  });

  // Latest V values
  const latestV = vCurveData[vCurveData.length - 1];

  // Execute rescue ops
  const handleExecuteRescue = useCallback((risk) => {
    setRiskQueue(prev => prev.filter(r => r.id !== risk.id));
    // In real app, this would trigger n8n workflow
    console.log('🚨 Rescue Ops Executed:', risk);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300">
      {/* System HUD */}
      <SystemHUD 
        confidence={systemStats.confidence}
        stability={systemStats.stability}
        mode={systemStats.mode}
      />

      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter text-white">
            KRATON <span className="text-blue-500 font-light">MASTER</span>
          </h1>
          <span className="text-[10px] font-mono text-emerald-400 animate-pulse">● SYSTEM_ACTIVE</span>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-mono">
          <div>V-ASSET: <span className="text-blue-400">{formatCurrency(latestV.value)}</span></div>
          <div>T-SAVED: <span className="text-emerald-400">{systemStats.tSaved}h</span></div>
          <div>NODES: <span className="text-purple-400">{relationalData.nodes.length}</span></div>
          <div>CLARK_HUB: <span className="text-emerald-400">CONNECTED</span></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-120px)]">
        {/* Left: Perception Map */}
        <section className="w-2/3 p-6 border-r border-white/5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-cyan-400">◉</span>
            Relational Perception Map
          </h2>
          <div className="h-[calc(100%-2rem)] bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden"
            style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.1)' }}
          >
            <PerceptionMap 
              nodes={relationalData.nodes}
              edges={relationalData.edges}
            />
          </div>
        </section>

        {/* Right: Dashboard Panels */}
        <section className="w-1/3 p-6 space-y-6 overflow-y-auto">
          {/* V-Curve */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-blue-400">📈</span>
              Global V-Curve (30D)
            </h2>
            <div className="bg-[#0a0a0a] rounded-xl border border-white/5 p-4">
              <VCurveChart data={vCurveData} />
              <div className="mt-4 pt-4 border-t border-white/5">
                <GlobalTelemetry krValue={latestV.kr} phValue={latestV.ph} />
              </div>
            </div>
          </div>

          {/* Risk Queue */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              Risk Actuation Queue
              {riskQueue.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px]">
                  {riskQueue.length}
                </span>
              )}
            </h2>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {riskQueue.map(risk => (
                <RiskCard 
                  key={risk.id}
                  risk={risk}
                  onExecute={handleExecuteRescue}
                />
              ))}
              {riskQueue.length === 0 && (
                <div className="p-8 text-center text-gray-600">
                  <span className="text-2xl">✅</span>
                  <p className="mt-2 text-sm">No active risks</p>
                </div>
              )}
            </div>
          </div>

          {/* Chemistry Matching */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-purple-400">⚗️</span>
              Chemistry Matching (Top 4)
            </h2>
            <ChemistryTable data={chemistryData} />
          </div>
        </section>
      </main>
    </div>
  );
}
