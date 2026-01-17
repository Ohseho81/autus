/**
 * AUTUS Semantic Zoom / Altitude Lock Demo
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ω → K → LOD / Altitude Lock / Ritual
 * 
 * - Ω (Omega) = M × I × R / T
 * - K (고도) = 1~10 (Ω 임계값 기반)
 * - LOD = K가 높을수록 정보 밀도 감소
 * - Altitude Lock = K6+ 실행 차단
 * - K10 Ritual = 2-step 최종 승인
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Unlock, AlertTriangle, Shield, Zap, 
  Eye, EyeOff, Activity, Target, CheckCircle2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Logic
// ═══════════════════════════════════════════════════════════════════════════════

type K = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface Inputs {
  M: number; // Mass (규모)
  I: number; // Impact (영향)
  R: number; // Irreversibility (비가역성)
  T: number; // Time (시간)
}

interface AltitudeState {
  k: K;
  locked: boolean;
  ritualRequired: boolean;
}

interface LODParams {
  labelDensity: number;
  edgeOpacity: number;
  nodeCount: number;
  blur: number;
}

interface GraphNode {
  id: string;
  type: 'task' | 'contract' | 'risk' | 'cluster';
  x: number;
  y: number;
  label: string;
  visibleToKMin: number;
}

interface GraphEdge {
  a: string;
  b: string;
}

// Omega 계산
function computeOmega(M: number, I: number, R: number, T: number): number {
  const omega = (M * I * R) / Math.max(T, 0.0001);
  return Math.round(omega * 100) / 100;
}

// Omega → K 변환
const THRESHOLDS: Array<[number, K]> = [
  [5, 1], [20, 2], [50, 3], [120, 4], [250, 5],
  [500, 6], [800, 7], [1200, 8], [2000, 9], [Infinity, 10],
];

function omegaToK(omega: number): K {
  for (const [threshold, k] of THRESHOLDS) {
    if (omega < threshold) return k;
  }
  return 10;
}

// 고도 상태 도출
function deriveAltitudeState(k: K): AltitudeState {
  return {
    k,
    locked: k >= 6,
    ritualRequired: k === 10,
  };
}

// K별 LOD 파라미터
function lodForK(k: K): LODParams {
  if (k <= 2) return { labelDensity: 1.0, edgeOpacity: 0.8, nodeCount: 50, blur: 0 };
  if (k <= 4) return { labelDensity: 0.7, edgeOpacity: 0.6, nodeCount: 35, blur: 1 };
  if (k <= 6) return { labelDensity: 0.4, edgeOpacity: 0.4, nodeCount: 24, blur: 2 };
  if (k <= 8) return { labelDensity: 0.2, edgeOpacity: 0.25, nodeCount: 16, blur: 3 };
  return { labelDensity: 0.1, edgeOpacity: 0.15, nodeCount: 10, blur: 4 };
}

// K별 색상
function getKColor(k: K): string {
  if (k <= 2) return '#22c55e'; // green
  if (k <= 4) return '#3b82f6'; // blue
  if (k <= 6) return '#f59e0b'; // amber
  if (k <= 8) return '#f97316'; // orange
  return '#ef4444'; // red
}

// 노드 타입별 색상
function nodeColor(type: string): string {
  if (type === 'contract') return '#2dd4bf';
  if (type === 'risk') return '#fb7185';
  if (type === 'cluster') return '#60a5fa';
  return '#a3a3a3';
}

// 그래프 데이터 생성
function makeDemoGraph(count: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < count; i++) {
    const type: GraphNode['type'] =
      i % 13 === 0 ? 'contract' :
      i % 11 === 0 ? 'risk' :
      i % 7 === 0 ? 'cluster' : 'task';

    const visibleToKMin =
      type === 'contract' ? 6 :
      type === 'risk' ? 5 :
      type === 'cluster' ? 3 : 1;

    const angle = (i / count) * Math.PI * 2;
    const radius = 120 + Math.random() * 80;

    nodes.push({
      id: `N${i}`,
      type,
      x: 250 + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
      y: 250 + Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
      label: `${type.toUpperCase().slice(0, 3)}-${i}`,
      visibleToKMin,
    });
  }

  // 연결 생성
  for (let i = 0; i < Math.floor(count * 1.2); i++) {
    const a = nodes[Math.floor(Math.random() * nodes.length)].id;
    const b = nodes[Math.floor(Math.random() * nodes.length)].id;
    if (a !== b) edges.push({ a, b });
  }

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slider Component
// ═══════════════════════════════════════════════════════════════════════════════

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color?: string;
}> = ({ label, value, min, max, step, onChange, color = '#3b82f6' }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
      }}
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Graph Canvas Component
// ═══════════════════════════════════════════════════════════════════════════════

const GraphCanvas: React.FC<{
  k: K;
  lod: LODParams;
  fogIntensity: number;
}> = ({ k, lod, fogIntensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphData = useMemo(() => makeDemoGraph(lod.nodeCount), [lod.nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));

    // Clear
    ctx.clearRect(0, 0, 500, 500);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(250, 250, 0, 250, 250, 300);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 500, 500);

    // Draw edges
    graphData.edges.forEach(edge => {
      const nodeA = nodeMap.get(edge.a);
      const nodeB = nodeMap.get(edge.b);
      if (!nodeA || !nodeB) return;

      const hidden = k < nodeA.visibleToKMin || k < nodeB.visibleToKMin;
      const opacity = hidden ? 0.05 : lod.edgeOpacity * (1 - fogIntensity * 0.5);

      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.strokeStyle = `rgba(100, 116, 139, ${opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const hidden = k < node.visibleToKMin;
      const opacity = hidden ? 0.1 * (1 - fogIntensity) : 1;
      const size = node.type === 'cluster' ? 8 : node.type === 'contract' ? 6 : 5;
      const color = nodeColor(node.type);

      // Glow
      if (!hidden && opacity > 0.5) {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2.5);
        glow.addColorStop(0, color + '40');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = hidden ? `rgba(100, 100, 100, ${opacity})` : color;
      ctx.fill();

      // Label
      if (!hidden && Math.random() < lod.labelDensity) {
        ctx.fillStyle = `rgba(229, 231, 235, ${opacity * 0.8})`;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(node.label, node.x + size + 3, node.y + 3);
      }
    });

    // Center indicator
    ctx.beginPath();
    ctx.arc(250, 250, 4, 0, Math.PI * 2);
    ctx.fillStyle = getKColor(k);
    ctx.fill();

  }, [graphData, k, lod, fogIntensity]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      className="w-full h-full rounded-lg"
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SemanticZoomDemo() {
  const [inputs, setInputs] = useState<Inputs>({ M: 3, I: 3, R: 3, T: 5 });
  const [fogIntensity, setFogIntensity] = useState(0.5);
  const [ritualEntered, setRitualEntered] = useState(false);

  const omega = useMemo(() => computeOmega(inputs.M, inputs.I, inputs.R, inputs.T), [inputs]);
  const k = useMemo(() => omegaToK(omega), [omega]);
  const altitude = useMemo(() => deriveAltitudeState(k), [k]);
  const lod = useMemo(() => lodForK(k), [k]);

  const update = <Key extends keyof Inputs>(key: Key, val: number) => {
    setInputs(prev => ({ ...prev, [key]: val }));
    setRitualEntered(false);
  };

  const canExecute = !altitude.locked;

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex">
      {/* Left Panel - Controls */}
      <div className="w-80 bg-slate-900/80 border-r border-slate-800 p-4 flex flex-col overflow-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Semantic Zoom Demo
          </h1>
          <p className="text-xs text-slate-400 mt-1">Ω → K → LOD / Altitude Lock / Ritual</p>
        </div>

        {/* Input Sliders */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 uppercase mb-3">Ω Input Parameters</div>
          <Slider label="M (Mass / 규모)" value={inputs.M} min={0} max={10} step={0.5} onChange={(v) => update('M', v)} color="#22c55e" />
          <Slider label="I (Impact / 영향)" value={inputs.I} min={0} max={10} step={0.5} onChange={(v) => update('I', v)} color="#3b82f6" />
          <Slider label="R (Irreversibility / 비가역성)" value={inputs.R} min={0} max={10} step={0.5} onChange={(v) => update('R', v)} color="#f59e0b" />
          <Slider label="T (Time / 시간)" value={inputs.T} min={1} max={10} step={0.5} onChange={(v) => update('T', v)} color="#a855f7" />
        </div>

        {/* Fog Control */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <Slider label="Fog of War Intensity" value={fogIntensity} min={0} max={1} step={0.05} onChange={setFogIntensity} color="#64748b" />
        </div>

        {/* Computed Values */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 uppercase mb-3">Computed State</div>
          
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Ω (Omega)</span>
            <span className="font-mono font-bold text-lg">{omega}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">K (Altitude)</span>
            <span className="font-mono font-bold text-lg" style={{ color: getKColor(k) }}>K{k}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Altitude Lock</span>
            <span className={`flex items-center gap-1 ${altitude.locked ? 'text-red-400' : 'text-emerald-400'}`}>
              {altitude.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {altitude.locked ? 'ON (K≥6)' : 'OFF'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Ritual Required</span>
            <span className={altitude.ritualRequired ? 'text-red-400' : 'text-slate-500'}>
              {altitude.ritualRequired ? 'YES (K=10)' : 'NO'}
            </span>
          </div>
        </div>

        {/* LOD Info */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 uppercase mb-2">LOD Parameters</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-500">Nodes</div>
              <div className="font-mono">{lod.nodeCount}</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-500">Labels</div>
              <div className="font-mono">{Math.round(lod.labelDensity * 100)}%</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-500">Edges</div>
              <div className="font-mono">{Math.round(lod.edgeOpacity * 100)}%</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-500">Blur</div>
              <div className="font-mono">{lod.blur}px</div>
            </div>
          </div>
        </div>

        {/* Action Console */}
        <div className="bg-slate-800/50 rounded-lg p-3 flex-1">
          <div className="text-xs text-slate-500 uppercase mb-3">Action Console</div>
          
          <div className={`text-xs p-2 rounded mb-3 ${altitude.locked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {altitude.locked
              ? '⚠️ K6+ : 실행(Execute) 차단. 승인/검토만 허용.'
              : '✓ K1~K5 : 실행 허용.'}
          </div>

          <button
            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
              canExecute
                ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            disabled={!canExecute}
            onClick={() => alert('✓ EXECUTED (demo)')}
          >
            {canExecute ? '▶ Execute' : '🔒 Execute (Locked)'}
          </button>

          {altitude.locked && !altitude.ritualRequired && (
            <button
              className="w-full py-2 rounded-lg font-medium text-sm mt-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              onClick={() => alert('승인 요청 전송됨 (demo)')}
            >
              📤 Request Approval
            </button>
          )}

          {/* K10 Ritual */}
          <AnimatePresence>
            {altitude.ritualRequired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 border border-red-500/30 rounded-lg bg-red-500/5"
              >
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
                  <Shield className="w-4 h-4" />
                  K10 Ritual Required
                </div>
                
                {!ritualEntered ? (
                  <>
                    <p className="text-xs text-slate-400 mb-2">
                      K10은 최고 고도입니다. 의식 진입 후에만 변경 가능합니다.
                    </p>
                    <button
                      className="w-full py-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm"
                      onClick={() => setRitualEntered(true)}
                    >
                      ⚡ Enter Ritual
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-300 mb-2 italic">
                      "이 결정의 책임은 인간에게 있습니다."
                    </p>
                    <button
                      className="w-full py-2 rounded bg-red-500 text-white hover:bg-red-600 text-sm font-semibold"
                      onClick={() => alert('✓ FINALIZED - Human Final Approval (demo)')}
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Finalize (Human Approval)
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Panel - Graph */}
      <div className="flex-1 relative">
        {/* K Indicator */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-lg font-mono font-bold text-lg"
            style={{ 
              backgroundColor: getKColor(k) + '20',
              color: getKColor(k),
              border: `1px solid ${getKColor(k)}40`
            }}
          >
            K{k}
          </div>
          <div className="text-xs text-slate-400">
            Ω={omega}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/80 rounded-lg p-3 text-xs">
          <div className="text-slate-500 uppercase mb-2">Node Types</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#a3a3a3]" />
              <span className="text-slate-400">Task (K1+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="text-slate-400">Cluster (K3+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#fb7185]" />
              <span className="text-slate-400">Risk (K5+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2dd4bf]" />
              <span className="text-slate-400">Contract (K6+)</span>
            </div>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="w-full h-full flex items-center justify-center p-8">
          <div 
            className="relative"
            style={{ filter: `blur(${lod.blur}px)` }}
          >
            <GraphCanvas k={k} lod={lod} fogIntensity={fogIntensity} />
          </div>
        </div>

        {/* Altitude Lock Overlay */}
        <AnimatePresence>
          {altitude.locked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(2px)',
              }}
            >
              <div className="absolute top-20 left-4 bg-slate-900/90 rounded-lg px-3 py-2 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <Lock className="w-4 h-4" />
                  Altitude Lock Engaged (K≥6)
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
