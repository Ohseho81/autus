// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Command Center V2 (이미지 레퍼런스 기반)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 핵심 비주얼 요소:
// 1. 곡면 디스플레이 느낌의 레이아웃
// 2. 네트워크 그래프 (금색/시안/마젠타/파랑 노드)
// 3. Glassmorphism 패널
// 4. K-Scale 표시 게이지
// 5. Irreversibility 경고
// 6. 입자/성운 배경
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  cluster: 'finance' | 'hr' | 'sales' | 'ops' | 'legal' | 'it' | 'strategy' | 'service';
  size: number;
  k: number;
  label?: string;
}

interface Connection {
  source: string;
  target: string;
  strength: number;
  isConflict: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════════════════

const CLUSTER_COLORS = {
  finance: { primary: '#FFD700', glow: 'rgba(255, 215, 0, 0.6)' },
  hr: { primary: '#00D4FF', glow: 'rgba(0, 212, 255, 0.6)' },
  sales: { primary: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.6)' },
  ops: { primary: '#10B981', glow: 'rgba(16, 185, 129, 0.6)' },
  legal: { primary: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.6)' },
  it: { primary: '#06B6D4', glow: 'rgba(6, 182, 212, 0.6)' },
  strategy: { primary: '#EC4899', glow: 'rgba(236, 72, 153, 0.6)' },
  service: { primary: '#F59E0B', glow: 'rgba(245, 158, 11, 0.6)' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 네트워크 그래프 (SVG 기반)
// ═══════════════════════════════════════════════════════════════════════════════

function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  
  // 노드 생성
  const nodes = useMemo<NetworkNode[]>(() => {
    const result: NetworkNode[] = [];
    const clusters = Object.keys(CLUSTER_COLORS) as (keyof typeof CLUSTER_COLORS)[];
    
    // 각 클러스터별 노드 생성
    clusters.forEach((cluster, ci) => {
      const centerAngle = (ci / clusters.length) * Math.PI * 2;
      const centerX = dimensions.width / 2 + Math.cos(centerAngle) * 250;
      const centerY = dimensions.height / 2 + Math.sin(centerAngle) * 180;
      
      // 클러스터당 15~25개 노드
      const nodeCount = 15 + Math.floor(Math.random() * 10);
      
      for (let i = 0; i < nodeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 30 + Math.random() * 80;
        
        result.push({
          id: `${cluster}-${i}`,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          cluster,
          size: 2 + Math.random() * 6,
          k: 0.5 + Math.random() * 2.5,
          label: i === 0 ? cluster.toUpperCase() : undefined,
        });
      }
    });
    
    return result;
  }, [dimensions]);
  
  // 연결선 생성
  const connections = useMemo<Connection[]>(() => {
    const result: Connection[] = [];
    
    // 클러스터 내 연결
    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach((target) => {
        if (node.cluster === target.cluster && Math.random() < 0.15) {
          result.push({
            source: node.id,
            target: target.id,
            strength: Math.random(),
            isConflict: false,
          });
        }
      });
    });
    
    // 클러스터 간 연결 (희소)
    nodes.forEach((node) => {
      nodes.forEach((target) => {
        if (node.cluster !== target.cluster && Math.random() < 0.005) {
          result.push({
            source: node.id,
            target: target.id,
            strength: Math.random() * 0.5,
            isConflict: Math.random() < 0.3,
          });
        }
      });
    });
    
    return result;
  }, [nodes]);
  
  // 노드 맵
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);
  
  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* 배경 그라데이션 */}
      <defs>
        <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0a0a0f" />
        </radialGradient>
        
        {/* 글로우 필터 */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* 연결선 */}
      <g className="connections">
        {connections.map((conn, i) => {
          const source = nodeMap.get(conn.source);
          const target = nodeMap.get(conn.target);
          if (!source || !target) return null;
          
          const color = conn.isConflict 
            ? '#ff4444' 
            : CLUSTER_COLORS[source.cluster].primary;
          
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={color}
              strokeWidth={conn.isConflict ? 1.5 : 0.5}
              strokeOpacity={conn.isConflict ? 0.8 : 0.3}
              filter={conn.isConflict ? "url(#glow)" : undefined}
            />
          );
        })}
      </g>
      
      {/* 노드 */}
      <g className="nodes">
        {nodes.map((node) => {
          const colors = CLUSTER_COLORS[node.cluster];
          
          return (
            <g key={node.id}>
              {/* 글로우 */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size * 2}
                fill={colors.glow}
                opacity={0.3}
                filter="url(#glow)"
              />
              
              {/* 메인 노드 */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size}
                fill={colors.primary}
                filter="url(#glow)"
              />
              
              {/* 레이블 */}
              {node.label && (
                <text
                  x={node.x}
                  y={node.y - 15}
                  fill="white"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Glassmorphism 패널
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClose?: () => void;
}

function GlassPanel({ children, className = '', title, onClose }: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        backdrop-blur-xl bg-white/5 
        border border-white/10 
        rounded-2xl shadow-2xl
        ${className}
      `}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white/80">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// K-Scale 게이지
// ═══════════════════════════════════════════════════════════════════════════════

interface KScaleGaugeProps {
  scale: number;
  label: string;
  sublabel: string;
}

function KScaleGauge({ scale, label, sublabel }: KScaleGaugeProps) {
  const scaleColors = [
    '#10B981', '#22D3EE', '#3B82F6', '#8B5CF6', '#F59E0B',
    '#EF4444', '#6366F1', '#EC4899', '#FFD700', '#FFFFFF',
  ];
  
  const color = scaleColors[Math.min(scale - 1, 9)];
  const percentage = (scale / 10) * 100;
  
  return (
    <div className="flex flex-col items-center">
      {/* 반원 게이지 */}
      <div className="relative w-48 h-24 overflow-hidden">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* 배경 호 */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* 진행 호 */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.83} 283`}
            filter="url(#glow)"
            style={{
              filter: `drop-shadow(0 0 10px ${color})`,
            }}
          />
          
          {/* 눈금 */}
          {[...Array(11)].map((_, i) => {
            const angle = (Math.PI * i) / 10;
            const x1 = 100 - Math.cos(angle) * 75;
            const y1 = 100 - Math.sin(angle) * 75;
            const x2 = 100 - Math.cos(angle) * 85;
            const y2 = 100 - Math.sin(angle) * 85;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* 중앙 텍스트 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div 
            className="text-4xl font-bold font-mono"
            style={{ color, textShadow: `0 0 20px ${color}` }}
          >
            K-{scale}
          </div>
        </div>
      </div>
      
      {/* 레이블 */}
      <div className="text-center mt-2">
        <div className="text-sm font-semibold text-white/80">{label}</div>
        <div className="text-xs text-white/50">{sublabel}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Irreversibility 경고
// ═══════════════════════════════════════════════════════════════════════════════

interface IrreversibilityAlertProps {
  percentage: number;
  undoCost: string;
}

function IrreversibilityAlert({ percentage, undoCost }: IrreversibilityAlertProps) {
  const isHigh = percentage >= 60;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        ${isHigh ? 'bg-red-500/20 border border-red-500/40' : 'bg-amber-500/20 border border-amber-500/40'}
      `}
    >
      <div className={`text-2xl ${isHigh ? 'animate-pulse' : ''}`}>
        ⚠️
      </div>
      <div>
        <div className={`text-sm font-bold ${isHigh ? 'text-red-400' : 'text-amber-400'}`}>
          IRREVERSIBILITY {percentage}%
        </div>
        <div className="text-xs text-white/50">
          Undo Cost: {undoCost}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 좌측 패널: 작업 컨텍스트
// ═══════════════════════════════════════════════════════════════════════════════

function LeftPanel() {
  return (
    <GlassPanel title="📋 Active Decision" className="w-80">
      <div className="space-y-4">
        {/* 현재 작업 */}
        <div>
          <div className="text-xs text-white/40 mb-1">Next: Priority Q3 Launch Strategy (K-4)</div>
          <div className="text-sm text-white/80">
            신규 제품 라인 출시 전략 검토 및 승인
          </div>
        </div>
        
        {/* 요약 */}
        <div className="p-3 bg-black/30 rounded-lg">
          <div className="text-xs text-white/40 mb-2">Summary</div>
          <ul className="text-xs text-white/60 space-y-1">
            <li>• 예상 투자: ₩2.3B</li>
            <li>• 예상 ROI: 180% (18개월)</li>
            <li>• 영향 부서: 5개</li>
            <li>• 필요 승인: 경영진</li>
          </ul>
        </div>
        
        {/* 버튼 */}
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white/70 transition-colors">
            CMD+G to Override
          </button>
          <button className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-xs text-amber-400 transition-colors">
            CMD+N to Next Queue
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 우측 패널: 시스템 상태
// ═══════════════════════════════════════════════════════════════════════════════

function RightPanel() {
  const alerts = [
    { type: 'warning', message: 'Legal Review Pending', time: '2h ago' },
    { type: 'info', message: 'New Collaboration Initiatives', count: 3 },
    { type: 'success', message: 'Q2 Targets Achieved', time: '1d ago' },
  ];
  
  const stakeholders = [
    { name: 'Finance', status: 'approved', avatar: '💰' },
    { name: 'Legal', status: 'pending', avatar: '⚖️' },
    { name: 'Operations', status: 'approved', avatar: '⚙️' },
    { name: 'HR', status: 'waiting', avatar: '👥' },
  ];
  
  return (
    <div className="w-80 space-y-4">
      {/* 알림 */}
      <GlassPanel title="🔔 Impact Intensity Tracking">
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div 
              key={i}
              className={`
                flex items-center gap-2 p-2 rounded-lg text-xs
                ${alert.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : ''}
                ${alert.type === 'info' ? 'bg-blue-500/10 text-blue-400' : ''}
                ${alert.type === 'success' ? 'bg-green-500/10 text-green-400' : ''}
              `}
            >
              <span>
                {alert.type === 'warning' && '⚠️'}
                {alert.type === 'info' && 'ℹ️'}
                {alert.type === 'success' && '✅'}
              </span>
              <span className="flex-1">{alert.message}</span>
              {alert.time && <span className="text-white/30">{alert.time}</span>}
              {alert.count && <span className="px-1.5 bg-white/10 rounded">{alert.count}</span>}
            </div>
          ))}
        </div>
      </GlassPanel>
      
      {/* 이해관계자 */}
      <GlassPanel title="👥 Stakeholder Consensus Visibility">
        <div className="space-y-2">
          {stakeholders.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
              <span className="text-lg">{s.avatar}</span>
              <span className="flex-1 text-sm text-white/70">{s.name}</span>
              <span className={`
                px-2 py-0.5 rounded text-xs
                ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
                ${s.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : ''}
                ${s.status === 'waiting' ? 'bg-white/10 text-white/40' : ''}
              `}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>
      
      {/* 권한 매트릭스 */}
      <GlassPanel title="🔐 Authority Legibility Matrix">
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="col-span-4 grid grid-cols-4 text-white/40 pb-1 border-b border-white/10">
            <span>Dept</span>
            <span>View</span>
            <span>Edit</span>
            <span>Approve</span>
          </div>
          {['Finance', 'Legal', 'Ops', 'HR', 'IT'].map((dept, i) => (
            <React.Fragment key={i}>
              <span className="text-white/60 py-1">{dept}</span>
              <span className="text-green-400 py-1">✓</span>
              <span className={i < 3 ? 'text-green-400 py-1' : 'text-white/20 py-1'}>{i < 3 ? '✓' : '—'}</span>
              <span className={i < 2 ? 'text-green-400 py-1' : 'text-white/20 py-1'}>{i < 2 ? '✓' : '—'}</span>
            </React.Fragment>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 Command Center
// ═══════════════════════════════════════════════════════════════════════════════

export function CommandCenterV2() {
  const [currentScale, setCurrentScale] = useState(5);
  
  return (
    <div className="relative w-full h-screen bg-[#0a0a0f] overflow-hidden">
      {/* 배경 그라데이션 */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
        }}
      />
      
      {/* 네트워크 그래프 */}
      <NetworkGraph />
      
      {/* UI 오버레이 */}
      <div className="absolute inset-0 flex">
        {/* 좌측 */}
        <div className="flex-shrink-0 p-6">
          <LeftPanel />
        </div>
        
        {/* 중앙 - K Scale 게이지 */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12">
          <KScaleGauge
            scale={currentScale}
            label="Business Industry Select"
            sublabel="Mutual Gravity Override: CMD+G"
          />
        </div>
        
        {/* 우측 */}
        <div className="flex-shrink-0 p-6">
          <RightPanel />
        </div>
      </div>
      
      {/* 하단 경고 */}
      <div className="absolute bottom-6 right-6">
        <IrreversibilityAlert percentage={65} undoCost="₩120M" />
      </div>
      
      {/* 상단 헤더 */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center text-lg"
          >
            🏛️
          </motion.div>
          <div>
            <h1 className="text-sm font-bold text-white">AUTUS v4.0</h1>
            <p className="text-xs text-white/40">Decision Safety Interface</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">System Online</span>
          </div>
          <div className="text-xs text-white/40 font-mono">
            {new Date().toLocaleTimeString('ko-KR')}
          </div>
        </div>
      </header>
    </div>
  );
}

export default CommandCenterV2;
