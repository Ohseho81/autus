'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle, Zap, RotateCcw, 
  Activity, Sparkles, MessageSquare, X, Send,
  AlertOctagon, MousePointerClick, ChevronRight
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type Mode = 'manual' | 'assisted' | 'auto';
type State = 'idle' | 'watch' | 'alert' | 'plan_ready' | 'await_approval' | 'executing' | 'verifying' | 'learning' | 'failsafe';
type RiskBand = 'critical' | 'high' | 'medium' | 'low';
type Safety = 'normal' | 'warning' | 'critical';

interface Signal {
  label: string;
  value: string;
  delta: 'up' | 'down' | 'stable';
  color: 'red' | 'yellow' | 'green' | 'blue';
}

interface NodeData {
  id: string;
  name: string;
  type: 'student' | 'teacher' | 'parent';
  risk_score: number;
  risk_band: RiskBand;
  confidence: number;
  velocity: { x: number; y: number };
  x: number;
  y: number;
  signals: Signal[];
  last_action?: string;
}

interface TemplateOption {
  id: string;
  name: string;
  success_rate: number;
  tone: 'calm' | 'premium' | 'firm';
  preview: string;
}

interface PredictionPoint {
  time: number;
  risk: number;
}

interface Stats {
  successRate: number;
  monthlyTrend: number[];
  interventionsThisMonth: number;
  savedValue: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const STATE_CONFIG: Record<State, { color: string; textClass: string; bgClass: string }> = {
  idle: { color: '#6b7280', textClass: 'text-gray-500', bgClass: 'bg-gray-900/20 border-gray-600' },
  watch: { color: '#eab308', textClass: 'text-yellow-500 state-watch', bgClass: 'bg-yellow-900/20 border-yellow-600' },
  alert: { color: '#dc2626', textClass: 'text-red-500 state-alert', bgClass: 'bg-red-900/20 border-red-600' },
  plan_ready: { color: '#3b82f6', textClass: 'text-blue-500 state-ready', bgClass: 'bg-blue-900/20 border-blue-600' },
  await_approval: { color: '#3b82f6', textClass: 'text-blue-500 state-ready', bgClass: 'bg-blue-900/20 border-blue-600' },
  executing: { color: '#22c55e', textClass: 'text-green-500 state-executing', bgClass: 'bg-green-900/20 border-green-600' },
  verifying: { color: '#9ca3af', textClass: 'text-gray-400', bgClass: 'bg-gray-900/20 border-gray-600' },
  learning: { color: '#a855f7', textClass: 'text-purple-500', bgClass: 'bg-purple-900/20 border-purple-600' },
  failsafe: { color: '#7f1d1d', textClass: 'text-red-900 animate-pulse', bgClass: 'bg-red-900/40 border-red-500 animate-pulse' },
};

const RISK_COLORS: Record<RiskBand, { fill: string; stroke: string; bg: string; text: string }> = {
  critical: { fill: '#dc2626', stroke: '#b91c1c', bg: 'bg-red-600', text: 'text-red-500' },
  high: { fill: '#eab308', stroke: '#ca8a04', bg: 'bg-yellow-600', text: 'text-yellow-500' },
  medium: { fill: '#3b82f6', stroke: '#2563eb', bg: 'bg-blue-600', text: 'text-blue-500' },
  low: { fill: '#22c55e', stroke: '#16a34a', bg: 'bg-green-600', text: 'text-green-500' },
};

const getRiskBand = (score: number): RiskBand => {
  if (score >= 200) return 'critical';
  if (score >= 150) return 'high';
  if (score >= 100) return 'medium';
  return 'low';
};

const getNodeIcon = (type: 'student' | 'teacher' | 'parent'): string => {
  switch (type) {
    case 'student': return '👤';
    case 'teacher': return '👨‍🏫';
    case 'parent': return '👪';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_NODES: NodeData[] = [
  {
    id: 's1',
    name: '김OO',
    type: 'student',
    risk_score: 212,
    risk_band: 'critical',
    confidence: 87,
    velocity: { x: 0.4, y: 0.6 },
    x: 380,
    y: 280,
    signals: [
      { label: '출석률', value: '82% → 60%', delta: 'down', color: 'red' },
      { label: '숙제 미제출', value: '+2회', delta: 'up', color: 'yellow' },
      { label: '성적 변화', value: '-5점', delta: 'down', color: 'yellow' },
    ],
    last_action: 'SMS 발송 (5분 전)',
  },
  {
    id: 's2',
    name: '이OO',
    type: 'student',
    risk_score: 176,
    risk_band: 'high',
    confidence: 72,
    velocity: { x: 0.2, y: 0.3 },
    x: 580,
    y: 220,
    signals: [
      { label: '출석률', value: '95%', delta: 'stable', color: 'green' },
      { label: '숙제 미제출', value: '+1회', delta: 'up', color: 'yellow' },
      { label: '학부모 응답', value: '없음 3일', delta: 'down', color: 'red' },
    ],
  },
  {
    id: 's3',
    name: '박OO',
    type: 'student',
    risk_score: 45,
    risk_band: 'low',
    confidence: 95,
    velocity: { x: -0.1, y: -0.1 },
    x: 720,
    y: 360,
    signals: [
      { label: '출석률', value: '100%', delta: 'stable', color: 'green' },
      { label: '성적', value: '+15점', delta: 'up', color: 'green' },
      { label: '학부모 만족도', value: '5점', delta: 'up', color: 'green' },
    ],
  },
  {
    id: 'p1',
    name: '학부모A',
    type: 'parent',
    risk_score: 88,
    risk_band: 'medium',
    confidence: 78,
    velocity: { x: 0.15, y: 0.2 },
    x: 280,
    y: 180,
    signals: [
      { label: '상담 응답률', value: '60%', delta: 'down', color: 'yellow' },
      { label: '수납 상태', value: '정상', delta: 'stable', color: 'green' },
    ],
  },
  {
    id: 't1',
    name: '강사B',
    type: 'teacher',
    risk_score: 32,
    risk_band: 'low',
    confidence: 92,
    velocity: { x: 0, y: 0 },
    x: 520,
    y: 420,
    signals: [
      { label: '담당 학생 만족도', value: '4.5/5', delta: 'stable', color: 'green' },
      { label: '수업 완료율', value: '98%', delta: 'stable', color: 'green' },
    ],
  },
];

const TEMPLATES: TemplateOption[] = [
  { 
    id: 't1', 
    name: 'A. 공감형 (Calm)', 
    success_rate: 71, 
    tone: 'calm',
    preview: '"요즘 학원 오기 힘드시죠? 저희가 도와드릴게요..."'
  },
  { 
    id: 't2', 
    name: 'B. 데이터형 (Premium)', 
    success_rate: 68, 
    tone: 'premium',
    preview: '"OO 학생 출석률 60%, 상위 30% 대비 20%p 낮습니다..."'
  },
  { 
    id: 't3', 
    name: 'C. 액션형 (Firm)', 
    success_rate: 65, 
    tone: 'firm',
    preview: '"이번 주 토요일 상담 가능하신가요? 30분이면..."'
  },
];

const INITIAL_PREDICTIONS: PredictionPoint[] = [
  { time: -3, risk: 185 },
  { time: -2, risk: 195 },
  { time: -1, risk: 205 },
  { time: 0, risk: 212 },
  { time: 1, risk: 220 },
  { time: 2, risk: 228 },
  { time: 3, risk: 235 },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AUTUS_FSD() {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('manual');
  const [state, setState] = useState<State>('watch');
  const [confidence, setConfidence] = useState(87);
  const [nextAction, setNextAction] = useState('신호 감지 중...');
  const [safety, setSafety] = useState<Safety>('normal');

  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(TEMPLATES[0]);
  const [predictions, setPredictions] = useState<PredictionPoint[]>(INITIAL_PREDICTIONS);

  const [stats, setStats] = useState<Stats>({
    successRate: 71,
    monthlyTrend: [65, 67, 68, 69, 71],
    interventionsThisMonth: 23,
    savedValue: 3200000,
  });

  const [actionLog, setActionLog] = useState('SMS 발송 (5분 전)');
  const [currentTime, setCurrentTime] = useState(new Date());

  const canvasRef = useRef<SVGSVGElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Real-time data simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        const riskDelta = (Math.random() - 0.5) * 6;
        const newRiskScore = Math.max(0, Math.min(300, node.risk_score + riskDelta));
        return {
          ...node,
          risk_score: Math.round(newRiskScore),
          risk_band: getRiskBand(newRiskScore),
          confidence: Math.max(30, Math.min(99, node.confidence + (Math.random() - 0.5) * 3)),
        };
      }));
      setCurrentTime(new Date());
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Update state based on selected node
  useEffect(() => {
    if (!selectedNode) {
      setState('watch');
      setNextAction('노드를 선택하세요');
      return;
    }

    const node = nodes.find(n => n.id === selectedNode.id);
    if (!node) return;

    setConfidence(node.confidence);

    if (node.risk_score >= 200) {
      setState('alert');
      setNextAction(`카드 생성: ${node.name} (EMERGENCY)`);
    } else if (node.risk_score >= 150) {
      setState('watch');
      setNextAction(`카드 생성: ${node.name} (ATTENTION)`);
    } else {
      setState('plan_ready');
      setNextAction(`${node.name} 정상 모니터링 중`);
    }
  }, [selectedNode, nodes]);

  // Update state based on mode
  useEffect(() => {
    if (!selectedNode) return;
    if (selectedNode.risk_score < 150) return;

    if (mode === 'manual') {
      setState('await_approval');
      setNextAction('카드 승인 또는 거절');
    } else if (mode === 'assisted') {
      setState('plan_ready');
      setNextAction('1-클릭 빠른 승인');
    } else if (mode === 'auto') {
      if (confidence > 85) {
        setState('executing');
        setNextAction('자동 발송 중 (Disengagement 가능)');
      } else {
        setState('plan_ready');
        setNextAction('Confidence < 85%, 승인 대기 중');
      }
    }
  }, [mode, selectedNode, confidence]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleNodeSelect = useCallback((node: NodeData) => {
    setSelectedNode(node);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedNode) return;

    setState('executing');
    setNextAction(`${selectedNode.name}에게 카드 발송 중...`);

    setTimeout(() => {
      setState('verifying');
      setNextAction('발송 완료! 결과 검증 중...');
      setActionLog(`카드 발송: ${selectedNode.name} (${new Date().toLocaleTimeString()})`);
    }, 1500);

    setTimeout(() => {
      setState('learning');
      setNextAction('가중치 업데이트 중...');
    }, 3000);

    setTimeout(() => {
      setState('watch');
      setNextAction('다음 신호 대기 중...');
      setSelectedNode(null);
      setStats(prev => ({
        ...prev,
        interventionsThisMonth: prev.interventionsThisMonth + 1,
        savedValue: prev.savedValue + 147000,
      }));
    }, 4500);
  }, [selectedNode]);

  const handleDisengage = useCallback(() => {
    setState('failsafe');
    setNextAction('⛔ 모든 자동 발송 중단됨');
    setSafety('critical');

    setTimeout(() => {
      setState('idle');
      setNextAction('재시작 대기 중...');
      setSafety('warning');
    }, 3000);
  }, []);

  const handleReset = useCallback(() => {
    setState('watch');
    setNextAction('신호 감지 중...');
    setSafety('normal');
    setSelectedNode(null);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNode(null);
    setState('watch');
    setNextAction('노드를 선택하세요');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: HUD (Head-Up Display)
  // ─────────────────────────────────────────────────────────────────────────

  const renderHUD = () => (
    <header className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black via-black/95 to-transparent z-50 flex items-center px-6 border-b border-gray-800/50">
      {/* MODE Selector */}
      <div className="flex gap-1 mr-8">
        {(['manual', 'assisted', 'auto'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded text-xs font-bold transition-all uppercase ${
              mode === m 
                ? 'mode-active text-white' 
                : 'bg-gray-800/50 hover:bg-gray-700 text-gray-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* CONFIDENCE Gauge */}
      <div className="flex items-center gap-3 mr-8">
        <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 relative ${
              confidence > 70 ? 'bg-green-500' : confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidence}%` }}
          >
            <div className="confidence-shimmer absolute inset-0" />
          </div>
        </div>
        <span className={`text-sm font-bold ${
          confidence > 70 ? 'text-green-400' : confidence > 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {Math.round(confidence)}%
        </span>
      </div>

      {/* NEXT ACTION */}
      <div className="flex-1 text-center">
        <p className="text-sm text-gray-300 truncate">
          <span className="text-blue-400 mr-2">▶</span>
          {nextAction}
        </p>
      </div>

      {/* SAFETY Indicator */}
      <div className="ml-8 flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          safety === 'normal' ? 'bg-green-500/20' : 
          safety === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'
        }`}>
          {safety === 'normal' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {safety === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
          {safety === 'critical' && <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />}
        </div>
        <span className={`text-xs font-bold uppercase ${
          safety === 'normal' ? 'text-green-400' : 
          safety === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {safety === 'normal' ? 'SAFE' : safety === 'warning' ? 'PAUSED' : 'STOPPED'}
        </span>
      </div>
    </header>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: State Indicator
  // ─────────────────────────────────────────────────────────────────────────

  const renderStateIndicator = () => (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 text-center">
      <p className={`text-4xl font-black tracking-widest ${STATE_CONFIG[state].textClass}`}>
        {state.toUpperCase().replace('_', ' ')}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {state === 'watch' && `신호 감지 중 • ${nodes.length}개 노드 모니터링`}
        {state === 'alert' && '⚠️ 위험 감지! 즉시 확인 필요'}
        {state === 'plan_ready' && '플랜 생성 완료 • 승인 대기'}
        {state === 'await_approval' && '카드 승인 대기 중'}
        {state === 'executing' && '🚀 자동 실행 중...'}
        {state === 'verifying' && '결과 검증 중...'}
        {state === 'learning' && '모델 업데이트 중...'}
        {state === 'failsafe' && '⛔ 긴급 정지'}
        {state === 'idle' && '대기 중'}
      </p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Canvas (Main Map)
  // ─────────────────────────────────────────────────────────────────────────

  const renderCanvas = () => (
    <main className="absolute top-16 left-0 right-80 bottom-20 bg-gray-950 grid-bg overflow-hidden">
      {/* Scanline */}
      <div className="scanline" />

      {/* SVG Layer */}
      <svg ref={canvasRef} className="absolute inset-0 w-full h-full">
        {/* Definitions */}
        <defs>
          <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#dc2626" />
          </marker>
          <marker id="arrow-yellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#eab308" />
          </marker>
          <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lane Lines (Normal Path) */}
        <g opacity="0.2">
          <line x1="100" y1="500" x2="400" y2="200" stroke="#22c55e" strokeWidth="2" strokeDasharray="10,5" />
          <line x1="400" y1="200" x2="700" y2="300" stroke="#22c55e" strokeWidth="2" strokeDasharray="10,5" />
          <line x1="700" y1="300" x2="1000" y2="150" stroke="#22c55e" strokeWidth="2" strokeDasharray="10,5" />
        </g>

        {/* Connection Lines */}
        <g opacity="0.15">
          <line x1="380" y1="280" x2="280" y2="180" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="580" y1="220" x2="520" y2="420" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" />
        </g>

        {/* Velocity Vectors */}
        {nodes.map(node => {
          if (Math.abs(node.velocity.x) < 0.05 && Math.abs(node.velocity.y) < 0.05) return null;
          const endX = node.x + node.velocity.x * 80;
          const endY = node.y + node.velocity.y * 80;
          const markerId = node.risk_band === 'critical' ? 'arrow-red' : 
                          node.risk_band === 'high' ? 'arrow-yellow' : 'arrow-green';
          return (
            <line
              key={`vel-${node.id}`}
              x1={node.x}
              y1={node.y}
              x2={endX}
              y2={endY}
              stroke={RISK_COLORS[node.risk_band].fill}
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd={`url(#${markerId})`}
              filter="url(#glow)"
              className="velocity-line"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const colors = RISK_COLORS[node.risk_band];
          const isSelected = selectedNode?.id === node.id;
          const haloSize = 80 + (node.confidence / 100) * 40;

          return (
            <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeSelect(node)}>
              {/* Halo */}
              <circle
                cx={node.x}
                cy={node.y}
                r={haloSize / 2}
                fill="none"
                stroke={colors.fill}
                strokeWidth="2"
                opacity={0.15 + (node.confidence / 300)}
                className="halo-pulse"
              />

              {/* Node Background */}
              <rect
                x={node.x - 28}
                y={node.y - 28}
                width="56"
                height="56"
                rx="8"
                fill={`${colors.fill}30`}
                stroke={colors.stroke}
                strokeWidth={isSelected ? 3 : 2}
                filter={isSelected ? 'url(#glow)' : undefined}
              />

              {/* Node Icon */}
              <text
                x={node.x}
                y={node.y - 4}
                textAnchor="middle"
                fontSize="20"
                fill="white"
              >
                {getNodeIcon(node.type)}
              </text>

              {/* Risk Score */}
              <text
                x={node.x}
                y={node.y + 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="white"
              >
                {node.risk_score}
              </text>

              {/* Label */}
              <text
                x={node.x}
                y={node.y + 48}
                textAnchor="middle"
                fontSize="11"
                fill="#d1d5db"
                fontWeight="500"
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 72h Prediction Panel */}
      <div className="absolute top-4 right-4 w-56 bg-gray-900/90 border border-gray-700 rounded-lg p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-bold">72h PREDICTION</span>
          <span className="text-xs text-red-400">▲ 23%</span>
        </div>
        <svg className="w-full h-16" viewBox="0 0 200 60">
          <g opacity="0.1">
            <line x1="0" y1="15" x2="200" y2="15" stroke="white" />
            <line x1="0" y1="30" x2="200" y2="30" stroke="white" />
            <line x1="0" y1="45" x2="200" y2="45" stroke="white" />
          </g>
          <polyline
            className="prediction-line"
            points={predictions.map((p, i) => `${(i / (predictions.length - 1)) * 200},${60 - (p.risk / 300) * 60}`).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            filter="url(#glow)"
          />
          <circle 
            cx={(3 / 6) * 200} 
            cy={60 - (predictions[3].risk / 300) * 60} 
            r="4" 
            fill="#ef4444"
          >
            <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>-72h</span>
          <span>NOW</span>
          <span>+72h</span>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="absolute bottom-4 left-4 w-48 bg-gray-900/90 border border-gray-700 rounded-lg p-3 backdrop-blur-sm">
        <span className="text-xs text-gray-400 font-bold">RISK DISTRIBUTION</span>
        <div className="mt-2 space-y-1">
          {[
            { color: 'red', label: 'Critical', count: nodes.filter(n => n.risk_band === 'critical').length },
            { color: 'yellow', label: 'High', count: nodes.filter(n => n.risk_band === 'high').length },
            { color: 'green', label: 'Low', count: nodes.filter(n => n.risk_band === 'low' || n.risk_band === 'medium').length },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${item.color}-500`} 
                  style={{ width: `${(item.count / nodes.length) * 100}%` }} 
                />
              </div>
              <span className={`text-xs text-${item.color}-400`}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Data Ticker */}
      <div className="absolute bottom-4 left-56 right-4 bg-gray-900/80 border border-gray-700 rounded px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-xs overflow-hidden">
          <span className="text-gray-500 shrink-0">LIVE</span>
          <div className="flex-1 whitespace-nowrap overflow-hidden">
            <span className="text-red-400">🔴 김OO 출석률 60% 감지</span>
            <span className="text-yellow-400 ml-8">🟡 이OO 숙제 미제출</span>
            <span className="text-green-400 ml-8">🟢 박OO 성적 +15점</span>
            <span className="text-blue-400 ml-8">📊 {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </main>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Right Panel (Node Details)
  // ─────────────────────────────────────────────────────────────────────────

  const renderRightPanel = () => (
    <aside className="absolute top-16 right-0 w-80 bottom-20 bg-gray-900/95 border-l border-gray-700 backdrop-blur-sm overflow-y-auto transition-all">
      {!selectedNode ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
          <MousePointerClick className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm text-center">노드를 클릭하여<br />상세 정보를 확인하세요</p>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-blue-400 font-bold uppercase">{selectedNode.type}</span>
              <h2 className="text-2xl font-black mt-1">{selectedNode.name}</h2>
            </div>
            <button onClick={closePanel} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Risk Score */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase">Risk Score</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[selectedNode.risk_band].bg}/20 ${RISK_COLORS[selectedNode.risk_band].text}`}>
                {selectedNode.risk_band.toUpperCase()}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-black ${RISK_COLORS[selectedNode.risk_band].text}`}>
                {selectedNode.risk_score}
              </span>
              <span className="text-sm text-gray-500 mb-2">/ 300</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${RISK_COLORS[selectedNode.risk_band].bg} transition-all`}
                style={{ width: `${(selectedNode.risk_score / 300) * 100}%` }}
              />
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase">Confidence</span>
              <span className="text-sm font-bold text-green-400">{selectedNode.confidence}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                style={{ width: `${selectedNode.confidence}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">AI 예측 신뢰도</p>
          </div>

          {/* Signals */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-xs text-gray-400 uppercase mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Signals
            </h3>
            <ul className="space-y-2">
              {selectedNode.signals.map((signal, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full bg-${signal.color}-500`} />
                  <span className="text-gray-300">{signal.label}</span>
                  <span className={`text-${signal.color}-400 ml-auto`}>{signal.value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Recommendation */}
          {selectedNode.risk_score >= 100 && (
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-xs text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Recommended Action
              </h3>
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-blue-300">
                    Card: {selectedNode.risk_score >= 200 ? 'EMERGENCY' : 'ATTENTION'}
                  </span>
                </div>
                <p className="text-sm text-blue-200/80 mb-3">
                  "학부모님, 최근 {selectedNode.name} 학생의 상태 변화가 감지되었습니다. 상담을 권장드립니다."
                </p>
                <div className="flex items-center justify-between text-xs text-blue-300/60">
                  <span>예상 ROI: <strong className="text-blue-300">₩147,000</strong></span>
                  <span>성공률: <strong className="text-blue-300">{selectedTemplate.success_rate}%</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          {selectedNode.risk_score >= 100 && (
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-xs text-gray-400 uppercase mb-3">Message Template</h3>
              <div className="space-y-2">
                {TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded border text-xs transition-all ${
                      selectedTemplate.id === template.id
                        ? 'bg-blue-900/30 border-blue-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${
                        template.tone === 'calm' ? 'text-blue-400' :
                        template.tone === 'premium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {template.name}
                      </span>
                      <span className="text-green-400">{template.success_rate}%</span>
                    </div>
                    <p className="text-gray-400 truncate">{template.preview}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApprove}
              disabled={state === 'executing' || state === 'verifying' || state === 'learning'}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-500 px-4 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {mode === 'manual' ? 'Approve & Send' : 'Quick Approve'}
            </button>
            <button
              onClick={closePanel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>

          {/* Last Action */}
          {selectedNode.last_action && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              Last: {selectedNode.last_action}
            </div>
          )}
        </div>
      )}
    </aside>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Control Panel (Bottom)
  // ─────────────────────────────────────────────────────────────────────────

  const renderControlPanel = () => (
    <footer className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-gray-800/50 flex items-center justify-between px-6 z-40">
      {/* Last Action */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
          <Send className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Last Action</p>
          <p className="text-sm font-bold">{actionLog}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className="text-2xl font-black text-green-400">{stats.successRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">This Month</p>
          <p className="text-2xl font-black text-blue-400">{stats.interventionsThisMonth}<span className="text-sm">건</span></p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Saved Value</p>
          <p className="text-2xl font-black text-yellow-400">₩{(stats.savedValue / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {state === 'failsafe' ? (
          <button
            onClick={handleReset}
            className="bg-yellow-600 hover:bg-yellow-500 px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 animate-pulse"
          >
            <RotateCcw className="w-5 h-5" />
            RESET
          </button>
        ) : (
          <button
            onClick={handleDisengage}
            className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 group"
          >
            <AlertOctagon className="w-5 h-5 group-hover:animate-pulse" />
            DISENGAGEMENT
          </button>
        )}
      </div>
    </footer>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Failsafe Overlay
  // ─────────────────────────────────────────────────────────────────────────

  const renderFailsafeOverlay = () => {
    if (state !== 'failsafe') return null;

    return (
      <div className="fixed inset-0 failsafe-overlay z-50 flex items-center justify-center">
        <div className="bg-red-950 border-4 border-red-600 rounded-xl p-8 text-center max-w-md animate-pulse">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-red-400 mb-2">FAILSAFE ACTIVATED</h3>
          <p className="text-sm text-red-300 mb-6">
            시스템이 안전모드로 진입했습니다.<br />
            관리자 조치가 필요합니다.
          </p>
          <p className="text-xs text-red-400">모든 자동 발송이 중단되었습니다.</p>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden relative">
      {renderHUD()}
      {renderStateIndicator()}
      {renderCanvas()}
      {renderRightPanel()}
      {renderControlPanel()}
      {renderFailsafeOverlay()}
    </div>
  );
}
