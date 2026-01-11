/**
 * AUTUS Dashboard v1.0
 * ====================
 * 
 * AuditBoard 벤치마킹 레이아웃:
 * - 좌측: 내비게이션 (w-16 → w-64 확장)
 * - 중앙: 물리 엔진 (헥사곤 + 모션 파형)
 * - 우측: 인사이트 (KPI + AI 브리핑)
 * 
 * 동적 헥사곤: P_i = C + (v_i × s_i × MaxRadius)
 * G/Y/R 시각적 피드백
 * 
 * "AUTUS는 세상을 설명하지 않는다. 세상이 스스로 드러나게 만든다."
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================
// CONSTANTS & TYPES
// ============================================================

const NODE_CONFIG = [
  { id: 0, name: 'BIO', icon: '❤️', label: '생체 에너지', color: '#22c55e' },
  { id: 1, name: 'CAPITAL', icon: '💰', label: '자본/자산', color: '#3b82f6' },
  { id: 2, name: 'COGNITION', icon: '🧠', label: '인지/판단', color: '#8b5cf6' },
  { id: 3, name: 'RELATION', icon: '🤝', label: '관계/협력', color: '#ec4899' },
  { id: 4, name: 'ENVIRONMENT', icon: '🌍', label: '외부 환경', color: '#f59e0b' },
  { id: 5, name: 'SECURITY', icon: '🛡️', label: '안전/리스크', color: '#ef4444' },
];

const KPI_INDICATORS = [
  { id: 'health_score', node: 0, name: '건강 점수', unit: 'pt' },
  { id: 'fatigue_level', node: 0, name: '피로도', unit: '%' },
  { id: 'cash_flow', node: 1, name: '현금 흐름', unit: '만원' },
  { id: 'runway', node: 1, name: '런웨이', unit: '개월' },
  { id: 'productivity', node: 2, name: '생산성', unit: '%' },
  { id: 'focus_time', node: 2, name: '집중 시간', unit: 'h' },
  { id: 'network_strength', node: 3, name: '네트워크', unit: 'pt' },
  { id: 'trust_index', node: 3, name: '신뢰 지수', unit: '%' },
  { id: 'friction', node: 4, name: '외부 마찰', unit: '%' },
  { id: 'volatility', node: 4, name: '변동성', unit: '%' },
  { id: 'risk_buffer', node: 5, name: '리스크 버퍼', unit: '%' },
  { id: 'safety_margin', node: 5, name: '안전 마진', unit: '%' },
];

const DIRECTION_VECTORS = [
  { angle: Math.PI / 2, label: 'top' },
  { angle: Math.PI / 6, label: 'top-right' },
  { angle: -Math.PI / 6, label: 'bottom-right' },
  { angle: -Math.PI / 2, label: 'bottom' },
  { angle: -5 * Math.PI / 6, label: 'bottom-left' },
  { angle: 5 * Math.PI / 6, label: 'top-left' },
];

const API_BASE = 'http://localhost:8000';

// ============================================================
// PHYSICS ENGINE
// ============================================================

interface Vertex {
  x: number;
  y: number;
  radius: number;
  value: number;
}

class PhysicsEngine {
  state: number[];
  target: number[];
  velocities: number[];
  shockWaves: number[];
  springK: number;
  damping: number;
  shockDecay: number;
  maxRadius: number;
  minRadius: number;

  constructor() {
    this.state = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    this.target = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    this.velocities = [0, 0, 0, 0, 0, 0];
    this.shockWaves = [0, 0, 0, 0, 0, 0];
    this.springK = 0.12;
    this.damping = 0.88;
    this.shockDecay = 0.93;
    this.maxRadius = 140;
    this.minRadius = 30;
  }

  calculateVertex(index: number, centerX: number, centerY: number): Vertex {
    const { angle } = DIRECTION_VECTORS[index];
    const s = this.state[index];
    const radius = this.minRadius + (this.maxRadius - this.minRadius) * s;
    const vibration = this.shockWaves[index] * Math.sin(Date.now() * 0.02) * 5;

    return {
      x: centerX + Math.cos(angle) * (radius + vibration),
      y: centerY - Math.sin(angle) * (radius + vibration),
      radius,
      value: s,
    };
  }

  applyMotion(nodeIndex: number, delta: number, friction = 0.1) {
    const effectiveDelta = delta * (1 - friction);
    this.target[nodeIndex] = Math.max(0.1, Math.min(1.0, this.target[nodeIndex] + effectiveDelta));
    this.shockWaves[nodeIndex] = Math.abs(delta) * 2;

    return { node: nodeIndex, delta: effectiveDelta, timestamp: Date.now() };
  }

  step(dt = 0.016): number[] {
    for (let i = 0; i < 6; i++) {
      const displacement = this.state[i] - this.target[i];
      const springForce = -this.springK * displacement;
      const dampingForce = -this.damping * this.velocities[i];
      const acceleration = springForce + dampingForce;

      this.velocities[i] += acceleration * dt * 60;
      this.state[i] += this.velocities[i] * dt;
      this.state[i] = Math.max(0.1, Math.min(1.0, this.state[i]));
      this.shockWaves[i] *= this.shockDecay;
    }
    return this.state;
  }

  getGate(): string {
    if (this.state[5] < 0.2 || this.state[0] < 0.2) return 'LOCK';
    if (this.state[4] > 0.7) return 'WARNING';
    return 'ENABLED';
  }

  async syncWithAPI() {
    try {
      const res = await fetch(`${API_BASE}/api/autus/state`);
      const data = await res.json();
      if (data.nodes) {
        const nodeNames = ['BIO', 'CAPITAL', 'COGNITION', 'RELATION', 'ENVIRONMENT', 'SECURITY'];
        nodeNames.forEach((name, i) => {
          if (data.nodes[name] !== undefined) {
            this.target[i] = data.nodes[name];
          }
        });
      }
    } catch (e) {
      console.log('API sync failed, using local state');
    }
  }
}

// ============================================================
// DELTA ENCODER
// ============================================================

interface MotionLogEntry {
  timestamp: number;
  deltas: { node: number; delta: number; significant: boolean }[];
}

interface CompactedSnapshot {
  timestamp: number;
  aggregated: { node: number; totalDelta: number; count: number }[];
}

class DeltaEncoder {
  lastState: number[];
  motionLog: MotionLogEntry[];
  compactedHistory: CompactedSnapshot[];

  constructor() {
    this.lastState = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    this.motionLog = [];
    this.compactedHistory = [];
  }

  encode(currentState: number[]) {
    const deltas = currentState.map((s, i) => s - this.lastState[i]);
    this.lastState = [...currentState];

    const significantDeltas = deltas
      .map((d, i) => ({ node: i, delta: d, significant: Math.abs(d) > 0.001 }))
      .filter((d) => d.significant);

    if (significantDeltas.length > 0) {
      this.motionLog.push({ timestamp: Date.now(), deltas: significantDeltas });
      if (this.motionLog.length > 100) {
        this.compact();
      }
    }

    return significantDeltas;
  }

  compact() {
    const oldLogs = this.motionLog.splice(0, 50);
    const snapshot: CompactedSnapshot = {
      timestamp: oldLogs[0]?.timestamp || Date.now(),
      aggregated: [0, 0, 0, 0, 0, 0].map((_, i) => ({
        node: i,
        totalDelta: oldLogs.reduce((sum, log) => {
          const d = log.deltas.find((d) => d.node === i);
          return sum + (d?.delta || 0);
        }, 0),
        count: oldLogs.filter((log) => log.deltas.some((d) => d.node === i)).length,
      })),
    };
    this.compactedHistory.push(snapshot);
  }

  getRecentMotions(count = 20): MotionLogEntry[] {
    return this.motionLog.slice(-count);
  }

  getCompactedHistory(): CompactedSnapshot[] {
    return this.compactedHistory;
  }
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

interface SidebarProps {
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  activeNode: number | null;
  onNodeSelect: (node: number | null) => void;
}

function Sidebar({ expanded, onToggle, activeNode, onNodeSelect }: SidebarProps) {
  return (
    <div
      className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 
                  transition-all duration-300 z-50 flex flex-col
                  ${expanded ? 'w-64' : 'w-16'}`}
      onMouseEnter={() => onToggle(true)}
      onMouseLeave={() => onToggle(false)}
    >
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <span className="text-2xl">⬢</span>
        {expanded && <span className="ml-2 font-bold text-lg">AUTUS</span>}
      </div>

      <nav className="flex-1 py-4">
        {NODE_CONFIG.map((node) => (
          <button
            key={node.id}
            onClick={() => onNodeSelect(activeNode === node.id ? null : node.id)}
            className={`w-full flex items-center px-4 py-3 transition-all
                       hover:bg-gray-800 ${activeNode === node.id ? 'bg-gray-800 border-l-2' : ''}`}
            style={{ borderColor: activeNode === node.id ? node.color : 'transparent' }}
          >
            <span className="text-xl w-8 flex justify-center">{node.icon}</span>
            {expanded && (
              <div className="ml-3 text-left">
                <div className="font-medium text-sm">{node.name}</div>
                <div className="text-xs text-gray-500">{node.label}</div>
              </div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button className="w-full flex items-center px-2 py-2 text-gray-400 hover:text-white">
          <span className="text-lg w-8 flex justify-center">⚙️</span>
          {expanded && <span className="ml-3 text-sm">Settings</span>}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC HEXAGON COMPONENT
// ============================================================

interface DynamicHexagonProps {
  engine: PhysicsEngine;
  centerX?: number;
  centerY?: number;
}

function DynamicHexagon({ engine, centerX = 200, centerY = 200 }: DynamicHexagonProps) {
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [gate, setGate] = useState('ENABLED');

  useEffect(() => {
    const updateVertices = () => {
      const newVertices = Array.from({ length: 6 }, (_, i) =>
        engine.calculateVertex(i, centerX, centerY)
      );
      setVertices(newVertices);
      setGate(engine.getGate());
    };

    updateVertices();
    const interval = setInterval(updateVertices, 16);
    return () => clearInterval(interval);
  }, [engine, centerX, centerY]);

  const getStatusColor = (value: number) => {
    if (value > 0.7) return { fill: '#22c55e', glow: true, status: 'good' };
    if (value > 0.4) return { fill: '#eab308', glow: false, status: 'warning' };
    return { fill: '#ef4444', glow: false, vibrate: true, status: 'danger' };
  };

  const hexPath = useMemo(() => {
    if (vertices.length < 6) return '';
    return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z';
  }, [vertices]);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#22c55e" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#ef4444" floodOpacity="0.6" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hexGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </radialGradient>
      </defs>

      <circle cx={centerX} cy={centerY} r="195" fill="#0f172a" />

      {[40, 80, 120, 160].map((r) => (
        <circle key={r} cx={centerX} cy={centerY} r={r} fill="none" stroke="#1e293b" strokeWidth="1" />
      ))}

      {DIRECTION_VECTORS.map((v, i) => (
        <line
          key={`guide-${i}`}
          x1={centerX}
          y1={centerY}
          x2={centerX + Math.cos(v.angle) * 180}
          y2={centerY - Math.sin(v.angle) * 180}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}

      <path
        d={hexPath}
        fill="url(#hexGradient)"
        stroke={gate === 'LOCK' ? '#ef4444' : gate === 'WARNING' ? '#eab308' : '#3b82f6'}
        strokeWidth="2"
        filter={gate === 'LOCK' ? 'url(#glow-red)' : undefined}
      />

      {vertices.map((v, i) => (
        <line
          key={`line-${i}`}
          x1={centerX}
          y1={centerY}
          x2={v.x}
          y2={v.y}
          stroke={NODE_CONFIG[i].color}
          strokeWidth="2"
          strokeOpacity="0.5"
        />
      ))}

      {vertices.map((v, i) => {
        const status = getStatusColor(v.value);
        const nodeConfig = NODE_CONFIG[i];

        return (
          <g key={`node-${i}`} className={status.vibrate ? 'animate-pulse' : ''}>
            <circle
              cx={v.x}
              cy={v.y}
              r={28}
              fill="none"
              stroke={status.fill}
              strokeWidth="3"
              strokeOpacity="0.3"
              filter={status.glow ? 'url(#glow-green)' : undefined}
            />
            <circle
              cx={v.x}
              cy={v.y}
              r={22}
              fill={nodeConfig.color}
              fillOpacity={0.9}
              stroke="white"
              strokeWidth="2"
            />
            <text x={v.x} y={v.y} textAnchor="middle" dominantBaseline="central" fontSize="16">
              {nodeConfig.icon}
            </text>
          </g>
        );
      })}

      {vertices.map((v, i) => {
        const labelRadius = 175;
        const angle = DIRECTION_VECTORS[i].angle;
        const lx = centerX + Math.cos(angle) * labelRadius;
        const ly = centerY - Math.sin(angle) * labelRadius;
        const status = getStatusColor(v.value);

        return (
          <g key={`label-${i}`}>
            <text x={lx} y={ly - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
              {NODE_CONFIG[i].name}
            </text>
            <text x={lx} y={ly + 10} textAnchor="middle" fill={status.fill} fontSize="14" fontWeight="bold">
              {(v.value * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      <g>
        <circle
          cx={centerX}
          cy={centerY}
          r={25}
          fill={gate === 'ENABLED' ? '#22c55e' : gate === 'WARNING' ? '#eab308' : '#ef4444'}
          fillOpacity="0.2"
        />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="10"
          fontWeight="bold"
        >
          {gate}
        </text>
      </g>
    </svg>
  );
}

// ============================================================
// WAVEFORM COMPONENT
// ============================================================

interface MotionWaveformProps {
  motions: MotionLogEntry[];
  compactedHistory: CompactedSnapshot[];
}

function MotionWaveform({ motions, compactedHistory }: MotionWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (compactedHistory.length > 0) {
      ctx.globalAlpha = 0.2;
      compactedHistory.slice(-5).forEach((snapshot, si) => {
        snapshot.aggregated.forEach((agg) => {
          const x = (si / 5) * width * 0.3;
          const y = height / 2 - agg.totalDelta * 500;

          ctx.fillStyle = NODE_CONFIG[agg.node].color;
          ctx.beginPath();
          ctx.arc(x + 20, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1;
    }

    const recentMotions = motions.slice(-50);
    recentMotions.forEach((motion, mi) => {
      const x = width * 0.3 + (mi / 50) * width * 0.7;

      motion.deltas.forEach((d) => {
        const y = height / 2;
        const amplitude = d.delta * 200;

        ctx.strokeStyle = NODE_CONFIG[d.node].color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - amplitude);
        ctx.stroke();

        ctx.fillStyle = NODE_CONFIG[d.node].color;
        ctx.beginPath();
        ctx.arc(x, y - amplitude, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [motions, compactedHistory]);

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">Motion Stream</span>
        <span className="text-xs text-gray-500">{motions.length} events</span>
      </div>
      <canvas ref={canvasRef} width={600} height={100} className="w-full rounded" />
    </div>
  );
}

// ============================================================
// KPI CARD COMPONENT
// ============================================================

interface KPICardProps {
  indicator: (typeof KPI_INDICATORS)[0];
  value: number;
  trend: number;
}

function KPICard({ indicator, value, trend }: KPICardProps) {
  const node = NODE_CONFIG[indicator.node];

  return (
    <div className="bg-gray-800 rounded-lg p-3 border-l-4" style={{ borderColor: node.color }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-500">{indicator.name}</div>
          <div className="text-xl font-bold mt-1">
            {value.toFixed(1)}
            {indicator.unit}
          </div>
        </div>
        <span className="text-lg">{node.icon}</span>
      </div>
      <div
        className={`text-xs mt-2 ${
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-500'
        }`}
      >
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
      </div>
    </div>
  );
}

// ============================================================
// AI BRIEFING COMPONENT
// ============================================================

interface AIBriefingProps {
  state: number[];
  gate: string;
}

function AIBriefing({ state, gate }: AIBriefingProps) {
  const [messages, setMessages] = useState<{ type: string; icon: string; text: string }[]>([]);

  useEffect(() => {
    const newMessages: { type: string; icon: string; text: string }[] = [];

    state.forEach((s, i) => {
      if (s < 0.3) {
        newMessages.push({
          type: 'danger',
          icon: '🚨',
          text: `${NODE_CONFIG[i].name} 임계치 접근 (${(s * 100).toFixed(0)}%)`,
        });
      } else if (s < 0.5) {
        newMessages.push({
          type: 'warning',
          icon: '⚠️',
          text: `${NODE_CONFIG[i].name} 주의 필요`,
        });
      }
    });

    if (gate === 'LOCK') {
      newMessages.unshift({
        type: 'critical',
        icon: '🔒',
        text: '시스템 잠금 상태 - 즉시 조치 필요',
      });
    }

    const avg = state.reduce((a, b) => a + b, 0) / 6;
    const variance = state.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / 6;

    if (variance > 0.04) {
      newMessages.push({
        type: 'info',
        icon: '📊',
        text: `불균형 감지 (σ²=${variance.toFixed(3)})`,
      });
    }

    if (newMessages.length === 0) {
      newMessages.push({
        type: 'success',
        icon: '✅',
        text: '모든 시스템 정상 작동 중',
      });
    }

    setMessages(newMessages);
  }, [state, gate]);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="font-medium">AI Agent Briefing</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-sm p-2 rounded ${
              msg.type === 'critical'
                ? 'bg-red-900/30 text-red-300'
                : msg.type === 'danger'
                ? 'bg-red-900/20 text-red-400'
                : msg.type === 'warning'
                ? 'bg-yellow-900/20 text-yellow-400'
                : msg.type === 'info'
                ? 'bg-blue-900/20 text-blue-400'
                : 'bg-green-900/20 text-green-400'
            }`}
          >
            <span>{msg.icon}</span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function AUTUSDashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [state, setState] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const [gate, setGate] = useState('ENABLED');
  const [motions, setMotions] = useState<MotionLogEntry[]>([]);
  const [compactedHistory, setCompactedHistory] = useState<CompactedSnapshot[]>([]);
  const [kpiValues, setKpiValues] = useState<Record<string, { value: number; trend: number }>>({});

  const engineRef = useRef<PhysicsEngine | null>(null);
  const encoderRef = useRef<DeltaEncoder | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    engineRef.current = new PhysicsEngine();
    encoderRef.current = new DeltaEncoder();

    const initialKpi: Record<string, { value: number; trend: number }> = {};
    KPI_INDICATORS.forEach((ind) => {
      initialKpi[ind.id] = { value: 50 + Math.random() * 30, trend: 0 };
    });
    setKpiValues(initialKpi);

    // API 동기화
    engineRef.current.syncWithAPI();
  }, []);

  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (engineRef.current) {
        const newState = engineRef.current.step(Math.min(dt, 0.05));
        setState([...newState]);
        setGate(engineRef.current.getGate());

        if (encoderRef.current) {
          encoderRef.current.encode(newState);
          setMotions(encoderRef.current.getRecentMotions());
          setCompactedHistory(encoderRef.current.getCompactedHistory());
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const triggerShock = useCallback(async (shockType: string) => {
    if (!engineRef.current) return;

    const shocks: Record<string, { node: number; delta: number }[]> = {
      health_decline: [
        { node: 0, delta: -0.15 },
        { node: 2, delta: -0.05 },
      ],
      income: [{ node: 1, delta: 0.12 }],
      expense: [{ node: 1, delta: -0.08 }],
      productivity_up: [{ node: 2, delta: 0.1 }],
      external_pressure: [
        { node: 4, delta: 0.15 },
        { node: 5, delta: -0.08 },
      ],
      relationship_break: [{ node: 3, delta: -0.12 }],
      recovery: [
        { node: 0, delta: 0.1 },
        { node: 5, delta: 0.05 },
      ],
    };

    const motionSet = shocks[shockType] || [];
    
    // API 호출
    for (const m of motionSet) {
      try {
        await fetch(`${API_BASE}/api/autus/motion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node: m.node,
            motion: m.delta > 0 ? 1 : 2,
            delta: Math.abs(m.delta),
            friction: 0.1,
          }),
        });
      } catch (e) {
        // API 실패 시 로컬로 처리
      }
      engineRef.current!.applyMotion(m.node, m.delta);
    }

    setKpiValues((prev) => {
      const updated = { ...prev };
      motionSet.forEach((m) => {
        KPI_INDICATORS.filter((ind) => ind.node === m.node).forEach((ind) => {
          if (updated[ind.id]) {
            const change = m.delta * 50;
            updated[ind.id] = {
              value: Math.max(0, Math.min(100, updated[ind.id].value + change)),
              trend: change,
            };
          }
        });
      });
      return updated;
    });
  }, []);

  const dangerKPIs = useMemo(() => {
    return KPI_INDICATORS.filter((ind) => {
      const kpi = kpiValues[ind.id];
      return kpi && kpi.value < 50;
    }).slice(0, 6);
  }, [kpiValues]);

  return (
    <div className="min-h-full h-full bg-slate-900 text-white">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={setSidebarExpanded}
        activeNode={activeNode}
        onNodeSelect={setActiveNode}
      />

      <div className={`transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        <div className="flex">
          <main className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">AUTUS Dashboard</h1>
                <p className="text-gray-500 text-sm">6-12-6-5 Physics Engine</p>
              </div>
              <div
                className={`px-4 py-2 rounded-full font-medium ${
                  gate === 'ENABLED'
                    ? 'bg-green-600/20 text-green-400'
                    : gate === 'WARNING'
                    ? 'bg-yellow-600/20 text-yellow-400'
                    : 'bg-red-600/20 text-red-400 animate-pulse'
                }`}
              >
                {gate === 'ENABLED' ? '✓' : gate === 'WARNING' ? '⚠' : '🔒'} {gate}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-4 mb-6">
              <div className="max-w-md mx-auto">
                {engineRef.current && <DynamicHexagon engine={engineRef.current} />}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { key: 'income', label: '💰 수입', color: 'bg-green-600' },
                { key: 'expense', label: '💸 지출', color: 'bg-red-600' },
                { key: 'health_decline', label: '🤒 건강↓', color: 'bg-red-600' },
                { key: 'recovery', label: '💪 회복', color: 'bg-green-600' },
                { key: 'productivity_up', label: '📈 생산성↑', color: 'bg-blue-600' },
                { key: 'external_pressure', label: '🌪️ 외부압력', color: 'bg-orange-600' },
                { key: 'relationship_break', label: '💔 관계↓', color: 'bg-pink-600' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => triggerShock(btn.key)}
                  className={`${btn.color} hover:opacity-80 px-3 py-2 rounded-lg text-sm font-medium transition-opacity`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <MotionWaveform motions={motions} compactedHistory={compactedHistory} />
          </main>

          <aside className="w-80 border-l border-gray-800 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">⚠️ Risk Indicators</h3>
              <div className="grid grid-cols-1 gap-2">
                {dangerKPIs.map((ind) => (
                  <KPICard
                    key={ind.id}
                    indicator={ind}
                    value={kpiValues[ind.id]?.value || 50}
                    trend={kpiValues[ind.id]?.trend || 0}
                  />
                ))}
                {dangerKPIs.length === 0 && (
                  <div className="text-center text-gray-500 py-4">✅ 위험 지표 없음</div>
                )}
              </div>
            </div>

            <AIBriefing state={state} gate={gate} />

            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">📊 All KPIs</h3>
              <div className="grid grid-cols-2 gap-2">
                {KPI_INDICATORS.slice(0, 8).map((ind) => (
                  <div key={ind.id} className="bg-gray-800/50 rounded p-2">
                    <div className="text-xs text-gray-500">{ind.name}</div>
                    <div className="font-medium">
                      {(kpiValues[ind.id]?.value || 50).toFixed(0)}
                      {ind.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

