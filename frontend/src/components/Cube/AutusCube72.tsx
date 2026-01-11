/**
 * AUTUS 72³ 3D Cube Renderer
 * ===========================
 * 
 * Three.js 없이 CSS 3D Transform으로 구현
 * - X축: WHO (T/B/L 72종)
 * - Y축: WHAT (Motion 72종)  
 * - Z축: HOW (Work 72종)
 * 
 * 기존 72 타입 데이터 및 Physics Engine 연동
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ALL_72_TYPES } from '../Trinity/data/node72Types';
import { ALL_72_FORCES, PHYSICS_NODES } from '../Trinity/data/forceTypes';
import { ALL_72_WORKS, WORK_DOMAINS } from '../Trinity/data/workTypes';
import { cubeInterpreter, DOMAIN_PHYSICS } from '../../engine/CubeInterpreter';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type NodeState = 'NORMAL' | 'TENSION' | 'CRITICAL';

interface Node72 {
  x: number;  // WHO (Node Type)
  y: number;  // WHAT (Motion Type)
  z: number;  // HOW (Work Type)
}

interface HRState {
  workload: number;
  relation_density: number;
  exit_risk: number;
}

interface Motion {
  velocity: number;
  acceleration: number;
  inertia: number;
  cpd: boolean;  // Critical Phase Detected
}

interface Phenomenon {
  node: Node72;
  state: NodeState;
  motion: Motion;
  hr: HRState;
  attention_score: number;
  // 72³ 해석
  interpretation: {
    nodeId: string;
    nodeName: string;
    nodeCategory: 'T' | 'B' | 'L';
    motionId: string;
    motionName: string;
    motionDomain: string;
    workId: string;
    workName: string;
    workDomain: string;
    resonance: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Codebook (우리 시스템에 맞춤)
// ═══════════════════════════════════════════════════════════════════════════

const CODEBOOK = {
  WHO: {
    T: { range: [0, 23], label: '투자자', color: '#ffd700' },
    B: { range: [24, 47], label: '사업가', color: '#00d4ff' },
    L: { range: [48, 71], label: '근로자', color: '#00ff87' },
  },
  WHAT: {
    BIO: { range: [0, 11], label: '생체', color: '#ef4444' },
    CAPITAL: { range: [12, 23], label: '자본', color: '#f59e0b' },
    NETWORK: { range: [24, 35], label: '네트워크', color: '#3b82f6' },
    KNOWLEDGE: { range: [36, 47], label: '지식', color: '#8b5cf6' },
    TIME: { range: [48, 59], label: '시간', color: '#10b981' },
    EMOTION: { range: [60, 71], label: '감정', color: '#ec4899' },
  },
  HOW: {
    BIO: { range: [0, 11], label: '생체 업무', color: '#ef4444' },
    CAPITAL: { range: [12, 23], label: '자본 업무', color: '#f59e0b' },
    NETWORK: { range: [24, 35], label: '네트워크 업무', color: '#3b82f6' },
    KNOWLEDGE: { range: [36, 47], label: '지식 업무', color: '#8b5cf6' },
    TIME: { range: [48, 59], label: '시간 업무', color: '#10b981' },
    EMOTION: { range: [60, 71], label: '감정 업무', color: '#ec4899' },
  },
  ACTION_FORCE: {
    BLOCK: { workload: -0.3, exit_risk: -0.2, label: '차단' },
    MITIGATE: { workload: -0.2, exit_risk: -0.15, label: '완화' },
    REDIRECT: { workload: -0.1, exit_risk: -0.1, label: '유도' },
    AMPLIFY: { workload: 0.1, exit_risk: -0.25, label: '증폭' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Axis Interpreters
// ═══════════════════════════════════════════════════════════════════════════

function getWhoCategory(x: number) {
  if (x < 24) return { ...CODEBOOK.WHO.T, key: 'T' };
  if (x < 48) return { ...CODEBOOK.WHO.B, key: 'B' };
  return { ...CODEBOOK.WHO.L, key: 'L' };
}

function getWhatCategory(y: number) {
  const domains = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
  const idx = Math.floor(y / 12);
  const key = domains[idx] || 'BIO';
  return { ...(CODEBOOK.WHAT as any)[key], key };
}

function getHowCategory(z: number) {
  const domains = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
  const idx = Math.floor(z / 12);
  const key = domains[idx] || 'BIO';
  return { ...(CODEBOOK.HOW as any)[key], key };
}

// ═══════════════════════════════════════════════════════════════════════════
// Virtual Data Generator (72³ 통합)
// ═══════════════════════════════════════════════════════════════════════════

class VirtualDataGenerator {
  private phenomena: Map<string, Phenomenon> = new Map();
  
  private key(node: Node72): string {
    return `${node.x}-${node.y}-${node.z}`;
  }
  
  private getInterpretation(node: Node72) {
    const interpreted = cubeInterpreter.interpret([node.x, node.y, node.z]);
    const resonance = cubeInterpreter.calculateResonance([node.x, node.y, node.z]);
    
    return {
      nodeId: interpreted.node.id,
      nodeName: interpreted.node.name,
      nodeCategory: interpreted.node.category,
      motionId: interpreted.motion.id,
      motionName: interpreted.motion.name,
      motionDomain: interpreted.motion.node,
      workId: interpreted.work.id,
      workName: interpreted.work.name,
      workDomain: interpreted.work.domain,
      resonance,
    };
  }

  generate(count: number = 500): Phenomenon[] {
    for (let i = 0; i < count; i++) {
      const node: Node72 = {
        x: Math.floor(Math.random() * 72),
        y: Math.floor(Math.random() * 72),
        z: Math.floor(Math.random() * 72),
      };
      
      const k = this.key(node);
      const existing = this.phenomena.get(k);
      
      // 도메인별 물리 상수 적용
      const whatDomain = getWhatCategory(node.y).key;
      const physics = DOMAIN_PHYSICS[whatDomain] || DOMAIN_PHYSICS.CAPITAL;
      
      // Motion 계산 (도메인별 특성 반영)
      const velocity = Math.random() * 0.8 * physics.acceleration;
      const acceleration = (Math.random() - 0.5) * 0.4 * physics.acceleration;
      const inertia = existing 
        ? Math.min(1, existing.motion.inertia + Math.random() * 0.1 * physics.inertia)
        : Math.random() * 0.5 * physics.inertia;
      const cpd = acceleration > 0.2 || velocity > 0.7;
      
      const motion: Motion = { velocity, acceleration, inertia, cpd };
      
      // HR State 계산
      const workload = 0.3 + velocity * 0.4 + inertia * 0.3;
      const relation_density = whatDomain === 'NETWORK' ? 0.8 : 
                               whatDomain === 'EMOTION' ? 0.6 : 0.3;
      const exit_risk = workload * 0.4 + (1 - relation_density) * 0.3 + inertia * 0.3;
      
      const hr: HRState = { 
        workload: Math.min(1, workload), 
        relation_density, 
        exit_risk: Math.min(1, exit_risk) 
      };
      
      // State 분류
      const criticalScore = motion.inertia * hr.exit_risk;
      const state: NodeState = criticalScore > 0.4 ? 'CRITICAL' : 
                               (cpd || criticalScore > 0.25) ? 'TENSION' : 'NORMAL';
      
      // Attention Score
      const stateValue = state === 'CRITICAL' ? 1 : state === 'TENSION' ? 0.5 : 0;
      const attention_score = stateValue * 0.4 + inertia * 0.3 + exit_risk * 0.3;
      
      // 72³ 해석
      const interpretation = this.getInterpretation(node);
      
      this.phenomena.set(k, { 
        node, state, motion, hr, attention_score, interpretation 
      });
    }
    
    // 일부 노드를 강제로 CRITICAL로
    const keys = Array.from(this.phenomena.keys());
    for (let i = 0; i < Math.min(10, keys.length * 0.05); i++) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const p = this.phenomena.get(randomKey)!;
      p.state = 'CRITICAL';
      p.motion.inertia = 0.8 + Math.random() * 0.2;
      p.hr.exit_risk = 0.7 + Math.random() * 0.3;
      p.attention_score = 0.8 + Math.random() * 0.2;
    }
    
    return Array.from(this.phenomena.values());
  }

  applyAction(node: Node72, actionType: keyof typeof CODEBOOK.ACTION_FORCE): Phenomenon | null {
    const k = this.key(node);
    const p = this.phenomena.get(k);
    if (!p) return null;
    
    const force = CODEBOOK.ACTION_FORCE[actionType];
    p.hr.workload = Math.max(0, p.hr.workload + force.workload);
    p.hr.exit_risk = Math.max(0, p.hr.exit_risk + force.exit_risk);
    
    // 재분류
    const criticalScore = p.motion.inertia * p.hr.exit_risk;
    p.state = criticalScore > 0.4 ? 'CRITICAL' : 
              (p.motion.cpd || criticalScore > 0.25) ? 'TENSION' : 'NORMAL';
    
    const stateValue = p.state === 'CRITICAL' ? 1 : p.state === 'TENSION' ? 0.5 : 0;
    p.attention_score = stateValue * 0.4 + p.motion.inertia * 0.3 + p.hr.exit_risk * 0.3;
    
    return p;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// State Colors
// ═══════════════════════════════════════════════════════════════════════════

const STATE_COLORS: Record<NodeState, string> = {
  NORMAL: '#00d4ff',
  TENSION: '#ff9500',
  CRITICAL: '#ff2d55',
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const AutusCube72: React.FC = () => {
  const generator = useRef(new VirtualDataGenerator());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
  const [selectedNode, setSelectedNode] = useState<Phenomenon | null>(null);
  const [rotation, setRotation] = useState({ x: -25, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'3D' | 'X' | 'Y' | 'Z'>('3D');
  const [sliceLevel, setSliceLevel] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);

  // Animation loop
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setPhenomena(generator.current.generate(50));
      setTime(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Mouse handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - dy * 0.3)),
      y: prev.y + dx * 0.3,
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);
  
  const handleWheel = (e: React.WheelEvent) => {
    setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
  };

  // Categorized phenomena
  const categorized = useMemo(() => ({
    critical: phenomena.filter(p => p.state === 'CRITICAL'),
    tension: phenomena.filter(p => p.state === 'TENSION'),
    normal: phenomena.filter(p => p.state === 'NORMAL'),
  }), [phenomena]);

  // Filter phenomena by slice and domain
  const visiblePhenomena = useMemo(() => {
    let result = phenomena;
    
    // Domain filter
    if (filterDomain) {
      result = result.filter(p => p.interpretation.motionDomain === filterDomain);
    }
    
    // Slice filter
    if (sliceLevel !== null && viewMode !== '3D') {
      result = result.filter(p => {
        if (viewMode === 'X') return p.node.x === sliceLevel;
        if (viewMode === 'Y') return p.node.y === sliceLevel;
        if (viewMode === 'Z') return p.node.z === sliceLevel;
        return true;
      });
    }
    
    return result;
  }, [phenomena, viewMode, sliceLevel, filterDomain]);

  // Top attention
  const topAttention = useMemo(() => {
    if (categorized.critical.length === 0) return null;
    return categorized.critical.reduce((top, curr) => 
      curr.attention_score > top.attention_score ? curr : top
    );
  }, [categorized.critical]);

  // Action handler
  const handleAction = useCallback((actionType: keyof typeof CODEBOOK.ACTION_FORCE) => {
    if (!selectedNode) return;
    const updated = generator.current.applyAction(selectedNode.node, actionType);
    if (updated && updated.state !== 'CRITICAL') {
      setSelectedNode(null);
    } else if (updated) {
      setSelectedNode(updated);
    }
    setPhenomena(generator.current.generate(0));
  }, [selectedNode]);

  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      backgroundColor: '#030308',
      color: '#fff',
      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: '60px', // 좌측 네비게이션 공간 확보
        right: 0,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100, // 네비게이션보다 낮게
        background: 'linear-gradient(180deg, rgba(3,3,8,0.95) 0%, transparent 100%)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>◎</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '2px' }}>AUTUS 72³ CUBE</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              {phenomena.length.toLocaleString()} nodes · {72*72*72} 조합
            </div>
          </div>
        </div>

        {/* Domain Filter */}
        <select
          value={filterDomain || ''}
          onChange={e => setFilterDomain(e.target.value || null)}
          style={{
            padding: '6px 12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '11px',
          }}
        >
          <option value="">All Domains</option>
          {Object.entries(PHYSICS_NODES).map(([key, node]) => (
            <option key={key} value={key}>{node.icon} {node.name}</option>
          ))}
        </select>

        {/* View Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['3D', 'X', 'Y', 'Z'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                setSliceLevel(mode === '3D' ? null : 36);
                if (mode === '3D') setRotation({ x: -25, y: 45 });
                else if (mode === 'X') setRotation({ x: 0, y: 90 });
                else if (mode === 'Y') setRotation({ x: 90, y: 0 });
                else if (mode === 'Z') setRotation({ x: 0, y: 0 });
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: viewMode === mode ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${viewMode === mode ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '6px',
                color: viewMode === mode ? '#00d4ff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {mode === '3D' ? '3D' : `${mode}축`}
            </button>
          ))}
        </div>

        {/* State Summary */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {(['CRITICAL', 'TENSION', 'NORMAL'] as NodeState[]).map(state => (
            <div key={state} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: STATE_COLORS[state],
                boxShadow: `0 0 8px ${STATE_COLORS[state]}`,
                animation: state === 'CRITICAL' && categorized.critical.length > 0 
                  ? 'pulse 0.5s infinite' : 'none',
              }} />
              <span style={{ 
                fontSize: '11px', 
                color: STATE_COLORS[state],
                fontWeight: 600,
              }}>
                {categorized[state.toLowerCase() as keyof typeof categorized].length}
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '6px 12px',
              backgroundColor: isPaused ? 'rgba(0,255,135,0.2)' : 'rgba(255,45,85,0.2)',
              border: `1px solid ${isPaused ? '#00ff87' : '#ff2d55'}`,
              borderRadius: '6px',
              color: isPaused ? '#00ff87' : '#ff2d55',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <div style={{
            padding: '6px 10px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}>
            t={time}
          </div>
        </div>
      </header>

      {/* Slice Control */}
      {viewMode !== '3D' && (
        <div style={{
          position: 'fixed',
          left: '70px', // 좌측 네비게이션 뒤에 위치
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(10,10,20,0.9)',
          padding: '12px 8px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{viewMode} = {sliceLevel}</div>
          <input
            type="range"
            min="0"
            max="71"
            value={sliceLevel || 0}
            onChange={(e) => setSliceLevel(parseInt(e.target.value))}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              height: '200px',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>0-71</div>
        </div>
      )}

      {/* 3D Cube Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          position: 'fixed',
          top: 0,
          left: '60px', // 좌측 네비게이션 공간 확보
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1500px',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Cube */}
        <div style={{
          position: 'relative',
          width: '400px',
          height: '400px',
          transformStyle: 'preserve-3d',
          transform: `
            scale(${zoom})
            rotateX(${rotation.x}deg)
            rotateY(${rotation.y}deg)
          `,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}>
          {/* Cube wireframe */}
          <CubeWireframe />
          
          {/* Axis labels */}
          <AxisLabels />

          {/* Nodes */}
          {visiblePhenomena.map((p) => {
            const x = (p.node.x / 71) * 380 - 190;
            const y = (p.node.y / 71) * 380 - 190;
            const z = (p.node.z / 71) * 380 - 190;
            const size = p.state === 'CRITICAL' ? 8 : p.state === 'TENSION' ? 5 : 3;
            const isSelected = selectedNode?.node.x === p.node.x && 
                              selectedNode?.node.y === p.node.y && 
                              selectedNode?.node.z === p.node.z;
            const isTop = topAttention?.node.x === p.node.x && 
                         topAttention?.node.y === p.node.y && 
                         topAttention?.node.z === p.node.z;

            return (
              <div
                key={`${p.node.x}-${p.node.y}-${p.node.z}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(p);
                }}
                title={`[${p.interpretation.nodeId}] ${p.interpretation.nodeName}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: '50%',
                  backgroundColor: STATE_COLORS[p.state],
                  boxShadow: `0 0 ${size * 2}px ${STATE_COLORS[p.state]}`,
                  transform: `translate3d(${x}px, ${-y}px, ${z}px) translate(-50%, -50%)`,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #fff' : isTop ? '1px solid #fff' : 'none',
                  opacity: p.state === 'NORMAL' ? 0.4 : 0.9,
                  animation: p.state === 'CRITICAL' ? 'pulse3d 0.5s infinite' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Top Attention Alert */}
      {topAttention && !selectedNode && (
        <div 
          onClick={() => setSelectedNode(topAttention)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: 'calc(50% + 30px)', // 네비게이션 고려 중앙
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            backgroundColor: 'rgba(255,45,85,0.2)',
            border: '1px solid #ff2d55',
            borderRadius: '12px',
            cursor: 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ff2d55',
            animation: 'pulse 0.5s infinite',
          }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ff2d55' }}>
              CRITICAL [{topAttention.interpretation.nodeId}]
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
              {topAttention.interpretation.nodeName} · 클릭하여 개입
            </div>
          </div>
        </div>
      )}

      {/* Specialist Card */}
      {selectedNode && (
        <SpecialistCard
          phenomenon={selectedNode}
          onAction={handleAction}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Legend */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: selectedNode ? '384px' : '24px', // 사이드 패널과 겹치지 않게
        padding: '14px',
        backgroundColor: 'rgba(10,10,20,0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        zIndex: 100,
        transition: 'right 0.3s ease',
      }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>72³ 축</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '2px', backgroundColor: '#ff4444' }} />
            <span style={{ fontSize: '10px', color: '#ff4444' }}>X: WHO (Node)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '2px', backgroundColor: '#44ff44' }} />
            <span style={{ fontSize: '10px', color: '#44ff44' }}>Y: WHAT (Motion)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '2px', backgroundColor: '#4444ff' }} />
            <span style={{ fontSize: '10px', color: '#4444ff' }}>Z: HOW (Work)</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes pulse3d {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.5; }
        }
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #00d4ff;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Cube Wireframe
// ═══════════════════════════════════════════════════════════════════════════

const CubeWireframe: React.FC = () => {
  const size = 400;
  const half = size / 2;
  
  const edges = [
    // Bottom
    { from: [-half, -half, -half], to: [half, -half, -half] },
    { from: [half, -half, -half], to: [half, -half, half] },
    { from: [half, -half, half], to: [-half, -half, half] },
    { from: [-half, -half, half], to: [-half, -half, -half] },
    // Top
    { from: [-half, half, -half], to: [half, half, -half] },
    { from: [half, half, -half], to: [half, half, half] },
    { from: [half, half, half], to: [-half, half, half] },
    { from: [-half, half, half], to: [-half, half, -half] },
    // Verticals
    { from: [-half, -half, -half], to: [-half, half, -half] },
    { from: [half, -half, -half], to: [half, half, -half] },
    { from: [half, -half, half], to: [half, half, half] },
    { from: [-half, -half, half], to: [-half, half, half] },
  ];

  return (
    <>
      {edges.map((edge, i) => {
        const [x1, y1, z1] = edge.from;
        const [x2, y2, z2] = edge.to;
        const length = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${length}px`,
              height: '1px',
              backgroundColor: 'rgba(0, 212, 255, 0.15)',
              transformOrigin: '0 50%',
              transform: `
                translate3d(${x1}px, ${-y1}px, ${z1}px)
                rotateY(${Math.atan2(dz, dx) * 180 / Math.PI}deg)
                rotateZ(${-Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * 180 / Math.PI}deg)
              `,
            }}
          />
        );
      })}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Axis Labels
// ═══════════════════════════════════════════════════════════════════════════

const AxisLabels: React.FC = () => {
  return (
    <>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(220px, 0, 0)',
        color: '#ff4444',
        fontSize: '11px',
        fontWeight: 600,
      }}>X (WHO)</div>
      
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(0, -220px, 0)',
        color: '#44ff44',
        fontSize: '11px',
        fontWeight: 600,
      }}>Y (WHAT)</div>
      
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(0, 0, 220px)',
        color: '#4444ff',
        fontSize: '11px',
        fontWeight: 600,
      }}>Z (HOW)</div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Specialist Card
// ═══════════════════════════════════════════════════════════════════════════

const SpecialistCard: React.FC<{
  phenomenon: Phenomenon;
  onAction: (type: keyof typeof CODEBOOK.ACTION_FORCE) => void;
  onClose: () => void;
}> = ({ phenomenon, onAction, onClose }) => {
  const { node, state, motion, hr, interpretation } = phenomenon;
  
  const categoryColors = {
    T: '#ffd700',
    B: '#00d4ff',
    L: '#00ff87',
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '360px',
      backgroundColor: 'rgba(10,10,20,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: `linear-gradient(90deg, ${STATE_COLORS[state]}20, transparent)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: STATE_COLORS[state],
                boxShadow: `0 0 12px ${STATE_COLORS[state]}`,
              }} />
              <span style={{ fontSize: '18px', fontWeight: 600, color: STATE_COLORS[state] }}>{state}</span>
            </div>
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              fontFamily: 'monospace',
            }}>
              <div style={{ fontSize: '13px', color: '#fff', marginBottom: '6px' }}>
                [{node.x}, {node.y}, {node.z}]
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '22px',
            cursor: 'pointer',
          }}>×</button>
        </div>
      </div>

      {/* 72³ Interpretation */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          72³ 해석
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px',
            borderLeft: `3px solid ${categoryColors[interpretation.nodeCategory]}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>WHO (Node)</div>
            <div style={{ fontSize: '13px', color: categoryColors[interpretation.nodeCategory], fontWeight: 600 }}>
              [{interpretation.nodeId}] {interpretation.nodeName}
            </div>
          </div>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px',
            borderLeft: `3px solid ${(CODEBOOK.WHAT as any)[interpretation.motionDomain]?.color || '#00d4ff'}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>WHAT (Motion)</div>
            <div style={{ fontSize: '13px', color: (CODEBOOK.WHAT as any)[interpretation.motionDomain]?.color || '#00d4ff', fontWeight: 600 }}>
              [{interpretation.motionId}] {interpretation.motionName}
            </div>
          </div>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px',
            borderLeft: `3px solid ${(CODEBOOK.HOW as any)[interpretation.workDomain]?.color || '#3b82f6'}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>HOW (Work)</div>
            <div style={{ fontSize: '13px', color: (CODEBOOK.HOW as any)[interpretation.workDomain]?.color || '#3b82f6', fontWeight: 600 }}>
              [{interpretation.workId}] {interpretation.workName}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          공명 점수: <span style={{ color: '#a855f7', fontWeight: 600 }}>{interpretation.resonance.toFixed(0)}%</span>
        </div>
      </div>

      {/* HR State */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          HR STATE
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatBar label="업무 부하" value={hr.workload} color="#ff9500" />
          <StatBar label="관계 밀도" value={hr.relation_density} color="#00d4ff" />
          <StatBar label="이탈 위험" value={hr.exit_risk} color="#ff2d55" />
        </div>
      </div>

      {/* Motion */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          MOTION
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#00d4ff' }}>{motion.velocity.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>속도</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#a855f7' }}>{motion.inertia.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>관성</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: motion.cpd ? '#ff2d55' : '#00ff87' }}>
              {motion.cpd ? 'YES' : 'NO'}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>CPD</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 20px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          개입 액션
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(CODEBOOK.ACTION_FORCE).map(([type, force]) => (
            <button
              key={type}
              onClick={() => onAction(type as keyof typeof CODEBOOK.ACTION_FORCE)}
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{force.label}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                  부하 {(force.workload * 100).toFixed(0)}%, 위험 {(force.exit_risk * 100).toFixed(0)}%
                </div>
              </div>
              <span style={{ color: '#00ff87', fontSize: '16px' }}>→</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
      }}>
        Attention: {phenomenon.attention_score.toFixed(4)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Stat Bar
// ═══════════════════════════════════════════════════════════════════════════

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{label}</div>
    <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
    </div>
    <div style={{ fontSize: '11px', color, fontWeight: 600, marginTop: '4px' }}>{(value * 100).toFixed(0)}%</div>
  </div>
);

export default AutusCube72;
