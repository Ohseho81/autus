/**
 * AUTUS Hexagon Equilibrium UI
 * =============================
 * 
 * 6개 노드가 정육각형의 평형 상태를 유지하려 노력
 * 충격 시 진동/수축/이완 애니메이션
 * 
 * "AUTUS는 세상을 설명하지 않는다. 세상이 스스로 드러나게 만든다."
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// CONSTANTS
// ============================================================

const NODE_NAMES = ['BIO', 'CAPITAL', 'COGNITION', 'RELATION', 'ENVIRONMENT', 'SECURITY'];
const NODE_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
const NODE_ICONS = ['❤️', '💰', '🧠', '🤝', '🌍', '🛡️'];

const BASE_ANGLES = [
  Math.PI / 2,
  Math.PI / 6,
  -Math.PI / 6,
  -Math.PI / 2,
  -5 * Math.PI / 6,
  5 * Math.PI / 6,
];

const SHOCK_TEMPLATES: Record<string, { label: string; impacts: Record<number, number>; magnitude: number }> = {
  interest_rate_up: { label: '금리 인상', impacts: { 1: -0.03, 4: 0.02 }, magnitude: 0.6 },
  interest_rate_down: { label: '금리 인하', impacts: { 1: 0.02, 4: -0.01 }, magnitude: 0.4 },
  market_crash: { label: '시장 폭락', impacts: { 1: -0.05, 5: -0.03, 4: 0.04 }, magnitude: 0.9 },
  health_decline: { label: '건강 악화', impacts: { 0: -0.04, 2: -0.02 }, magnitude: 0.7 },
  recovery: { label: '회복', impacts: { 0: 0.03, 2: 0.01 }, magnitude: 0.5 },
  relationship_break: { label: '관계 단절', impacts: { 3: -0.04, 0: -0.02 }, magnitude: 0.7 },
  new_connection: { label: '새로운 연결', impacts: { 3: 0.03, 2: 0.01 }, magnitude: 0.5 },
  external_pressure: { label: '외부 압력', impacts: { 4: 0.04, 5: -0.02 }, magnitude: 0.6 },
};

const API_BASE = 'http://localhost:8000';

// ============================================================
// HEXAGON PHYSICS ENGINE (Client-side)
// ============================================================

interface NodeCoordinate {
  x: number;
  y: number;
  value: number;
  radius: number;
  velocity: number;
  shockVelocity: number;
}

class HexagonPhysics {
  baseRadius: number;
  state: number[];
  target: number[];
  velocities: number[];
  shockVelocities: number[];
  springK: number;
  damping: number;
  shockDamping: number;

  constructor(baseRadius = 150) {
    this.baseRadius = baseRadius;
    this.state = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    this.target = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    this.velocities = [0, 0, 0, 0, 0, 0];
    this.shockVelocities = [0, 0, 0, 0, 0, 0];
    this.springK = 0.15;
    this.damping = 0.85;
    this.shockDamping = 0.92;
  }

  setTarget(newTarget: number[]) {
    this.target = newTarget.map(v => Math.max(0.1, Math.min(1.0, v)));
  }

  applyShock(nodeIndex: number, magnitude: number) {
    this.shockVelocities[nodeIndex] += magnitude * 0.5;
  }

  step(dt = 0.016): NodeCoordinate[] {
    for (let i = 0; i < 6; i++) {
      const displacement = this.state[i] - this.target[i];
      const springForce = -this.springK * displacement;
      const dampingForce = -this.damping * this.velocities[i];
      const acceleration = springForce + dampingForce;
      
      this.velocities[i] += acceleration * dt * 60;
      this.shockVelocities[i] *= this.shockDamping;
      this.state[i] += (this.velocities[i] + this.shockVelocities[i]) * dt;
      this.state[i] = Math.max(0.1, Math.min(1.0, this.state[i]));
    }
    
    return this.getCoordinates();
  }

  getCoordinates(): NodeCoordinate[] {
    return this.state.map((value, i) => {
      const radius = this.baseRadius * (0.3 + 0.7 * value);
      const angle = BASE_ANGLES[i];
      return {
        x: Math.cos(angle) * radius,
        y: -Math.sin(angle) * radius,
        value,
        radius,
        velocity: this.velocities[i],
        shockVelocity: this.shockVelocities[i],
      };
    });
  }

  getEquilibriumError(): number {
    return this.state.reduce((sum, s, i) => sum + Math.abs(s - this.target[i]), 0);
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface ActiveShock {
  id: number;
  type: string;
  label: string;
  magnitude: number;
  timestamp: number;
}

interface MotionRecord {
  time: number;
  type: string;
  delta: number;
}

export default function AUTUSHexagonUI() {
  const [state, setState] = useState<number[]>([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const [coordinates, setCoordinates] = useState<NodeCoordinate[]>([]);
  const [activeShocks, setActiveShocks] = useState<ActiveShock[]>([]);
  const [gate, setGate] = useState<string>('ENABLED');
  const [motionStream, setMotionStream] = useState<MotionRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const physicsRef = useRef<HexagonPhysics | null>(null);
  const animationRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 물리 엔진 초기화
  useEffect(() => {
    physicsRef.current = new HexagonPhysics(150);
    setCoordinates(physicsRef.current.getCoordinates());
    
    // WebSocket 연결 시도
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/api/efficiency/ws`);
      
      ws.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.nodes && physicsRef.current) {
          const newTarget = data.nodes.map((n: any) => n.target);
          physicsRef.current.setTarget(newTarget);
        }
        if (data.gate) {
          setGate(data.gate);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected');
      };
      
      ws.onerror = () => {
        setConnected(false);
      };
      
      wsRef.current = ws;
    } catch (e) {
      console.log('WebSocket connection failed');
    }
  };

  // 애니메이션 루프
  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      if (physicsRef.current) {
        const coords = physicsRef.current.step(Math.min(dt, 0.05));
        setCoordinates(coords);
        setState(coords.map(c => c.value));
        updateGate(coords);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const updateGate = (coords: NodeCoordinate[]) => {
    const security = coords[5]?.value || 0.5;
    const bio = coords[0]?.value || 0.5;
    const env = coords[4]?.value || 0.5;
    
    if (security < 0.2 || bio < 0.2) {
      setGate('LOCK');
    } else if (env > 0.7) {
      setGate('WARNING');
    } else {
      setGate('ENABLED');
    }
  };

  // 충격 발생
  const triggerShock = useCallback(async (shockType: string) => {
    const template = SHOCK_TEMPLATES[shockType];
    if (!template || !physicsRef.current) return;

    // API 호출
    try {
      await fetch(`${API_BASE}/api/efficiency/shock/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: shockType }),
      });
    } catch (e) {
      console.log('API call failed, using local simulation');
    }

    // 로컬 시뮬레이션
    const newTarget = [...physicsRef.current.target];
    Object.entries(template.impacts).forEach(([nodeIdx, delta]) => {
      const i = parseInt(nodeIdx);
      newTarget[i] = Math.max(0.1, Math.min(1.0, newTarget[i] + delta));
      physicsRef.current!.applyShock(i, delta * template.magnitude * 10);
    });
    physicsRef.current.setTarget(newTarget);

    const shock: ActiveShock = {
      id: Date.now(),
      type: shockType,
      label: template.label,
      magnitude: template.magnitude,
      timestamp: Date.now(),
    };
    setActiveShocks(prev => [...prev, shock]);

    setMotionStream(prev => [
      { time: Date.now(), type: shockType, delta: template.magnitude },
      ...prev.slice(0, 19)
    ]);

    setTimeout(() => {
      setActiveShocks(prev => prev.filter(s => s.id !== shock.id));
    }, 3000);
  }, []);

  // 노드 직접 조작
  const adjustNode = useCallback((nodeIndex: number, delta: number) => {
    if (!physicsRef.current) return;
    
    const newTarget = [...physicsRef.current.target];
    newTarget[nodeIndex] = Math.max(0.1, Math.min(1.0, newTarget[nodeIndex] + delta));
    physicsRef.current.setTarget(newTarget);
    physicsRef.current.applyShock(nodeIndex, delta * 5);
  }, []);

  // SVG 경로 생성
  const getHexagonPath = () => {
    if (coordinates.length < 6) return '';
    return coordinates.map((c, i) => 
      `${i === 0 ? 'M' : 'L'} ${200 + c.x} ${200 + c.y}`
    ).join(' ') + ' Z';
  };

  // 진동 강도 계산
  const getVibrationIntensity = (nodeIndex: number) => {
    const coord = coordinates[nodeIndex];
    if (!coord) return 0;
    return Math.abs(coord.shockVelocity) * 50;
  };

  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AUTUS Hexagon Equilibrium</h1>
          <p className="text-gray-400">
            "세상이 스스로 드러나게 만든다"
          </p>
          <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${
            connected ? 'bg-green-600' : 'bg-gray-600'
          }`}>
            {connected ? '● Connected' : '○ Local Mode'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 헥사곤 */}
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">State Overview</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                gate === 'ENABLED' ? 'bg-green-600' :
                gate === 'WARNING' ? 'bg-yellow-600' :
                'bg-red-600'
              }`}>
                {gate}
              </div>
            </div>

            <svg viewBox="0 0 400 400" className="w-full max-w-lg mx-auto">
              <defs>
                <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="100%" stopColor="#111827" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <circle cx="200" cy="200" r="195" fill="url(#bgGradient)" />
              
              {[50, 100, 150].map(r => (
                <circle
                  key={r}
                  cx="200"
                  cy="200"
                  r={r}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              <path
                d={getHexagonPath()}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="#3b82f6"
                strokeWidth="2"
                filter="url(#glow)"
              />

              {coordinates.map((coord, i) => (
                <line
                  key={`line-${i}`}
                  x1="200"
                  y1="200"
                  x2={200 + coord.x}
                  y2={200 + coord.y}
                  stroke={NODE_COLORS[i]}
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              ))}

              {coordinates.map((coord, i) => {
                const vibration = getVibrationIntensity(i);
                const scale = 1 + vibration * 0.01;
                
                return (
                  <g key={`node-${i}`} transform={`translate(${200 + coord.x}, ${200 + coord.y})`}>
                    {vibration > 0.1 && (
                      <circle
                        r={25 + vibration}
                        fill="none"
                        stroke={NODE_COLORS[i]}
                        strokeWidth="2"
                        strokeOpacity={Math.min(0.5, vibration * 0.1)}
                        className="animate-pulse"
                      />
                    )}
                    
                    <circle
                      r={20 * scale}
                      fill={NODE_COLORS[i]}
                      fillOpacity={0.8}
                      stroke="white"
                      strokeWidth="2"
                      style={{
                        filter: vibration > 0.5 ? 'url(#glow)' : 'none',
                        transition: 'r 0.1s',
                      }}
                    />
                    
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      style={{ transform: `scale(${scale})` }}
                    >
                      {NODE_ICONS[i]}
                    </text>
                  </g>
                );
              })}

              {coordinates.map((coord, i) => {
                const labelRadius = 180;
                const angle = BASE_ANGLES[i];
                const lx = 200 + Math.cos(angle) * labelRadius;
                const ly = 200 - Math.sin(angle) * labelRadius;
                
                return (
                  <g key={`label-${i}`}>
                    <text
                      x={lx}
                      y={ly - 10}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {NODE_NAMES[i]}
                    </text>
                    <text
                      x={lx}
                      y={ly + 8}
                      textAnchor="middle"
                      fill={NODE_COLORS[i]}
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {(coord.value * 100).toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              <text
                x="200"
                y="200"
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="10"
              >
                ε = {physicsRef.current?.getEquilibriumError().toFixed(3) || '0.000'}
              </text>
            </svg>

            {/* 노드 조절 슬라이더 */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {NODE_NAMES.map((name, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: NODE_COLORS[i] }}>
                    {NODE_ICONS[i]}
                  </span>
                  <button
                    onClick={() => adjustNode(i, -0.1)}
                    className="w-6 h-6 bg-gray-700 rounded text-sm hover:bg-gray-600"
                  >
                    -
                  </button>
                  <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(state[i] || 0.5) * 100}%`,
                        backgroundColor: NODE_COLORS[i],
                      }}
                    />
                  </div>
                  <button
                    onClick={() => adjustNode(i, 0.1)}
                    className="w-6 h-6 bg-gray-700 rounded text-sm hover:bg-gray-600"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 사이드 패널 */}
          <div className="space-y-6">
            {/* 충격 버튼 */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-4">⚡ Shock Events</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SHOCK_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => triggerShock(key)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 활성 충격 */}
            {activeShocks.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-3">🔴 Active Shocks</h3>
                <div className="space-y-2">
                  {activeShocks.map(shock => (
                    <div
                      key={shock.id}
                      className="flex items-center gap-2 text-sm bg-red-900/30 px-3 py-2 rounded-lg animate-pulse"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>{shock.label}</span>
                      <span className="text-gray-400 text-xs ml-auto">
                        mag: {shock.magnitude.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motion Stream */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">📊 Motion Stream</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {motionStream.length === 0 ? (
                  <p className="text-gray-500 text-sm">No motions yet</p>
                ) : (
                  motionStream.map((motion, idx) => (
                    <div
                      key={motion.time}
                      className="flex items-center gap-2 text-xs"
                      style={{ opacity: 1 - idx * 0.05 }}
                    >
                      <span className="text-gray-500 w-16">
                        {new Date(motion.time).toLocaleTimeString()}
                      </span>
                      <span className={motion.delta > 0 ? 'text-green-400' : 'text-red-400'}>
                        {SHOCK_TEMPLATES[motion.type]?.label || motion.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gate Indicator */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">🚦 Evidence Gate</h3>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                  gate === 'ENABLED' ? 'bg-green-600' :
                  gate === 'WARNING' ? 'bg-yellow-600 animate-pulse' :
                  'bg-red-600 animate-pulse'
                }`}>
                  {gate === 'ENABLED' ? '✓' : gate === 'WARNING' ? '⚠' : '🔒'}
                </div>
                <div>
                  <div className="font-semibold">{gate}</div>
                  <div className="text-sm text-gray-400">
                    {gate === 'ENABLED' && 'All systems normal'}
                    {gate === 'WARNING' && 'High environmental pressure'}
                    {gate === 'LOCK' && 'Critical state detected'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>AUTUS 통합 명세 v1.0 | 6 Nodes × 12 Motions × 6 Collectors × 5 UI</p>
        </div>
      </div>
    </div>
  );
}

