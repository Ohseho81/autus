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
import { PHYSICS_NODES } from '../../Trinity/data/forceTypes';
import type { NodeState, Phenomenon } from './types';
import { CODEBOOK, STATE_COLORS } from './types';
import { VirtualDataGenerator } from './dataGenerator';
import CubeWireframe from './CubeWireframe';
import AxisLabels from './AxisLabels';
import SpecialistCard from './SpecialistCard';

// ===================================================================
// Main Component
// ===================================================================

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
            {isPaused ? '\u25B6' : '\u23F8'}
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

export default AutusCube72;
