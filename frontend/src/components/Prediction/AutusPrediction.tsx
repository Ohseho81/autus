/**
 * AUTUS 72³ Prediction Engine UI
 * ================================
 * 
 * 물리 기반 미래 예측 시뮬레이션
 * - 72³ 좌표계 (Node × Motion × Work)
 * - 도메인별 물리 법칙
 * - 개입 시나리오 비교
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  physicsEngine72, 
  PhysicsEngine72, 
  NodeEntity, 
  Scenario, 
  NodeState,
  PhysicsState 
} from '../../engine/PhysicsEngine72';
import { cubeInterpreter, NodeID } from '../../engine/CubeInterpreter';
import { PHYSICS_NODES } from '../Trinity/data/forceTypes';

// ═══════════════════════════════════════════════════════════════════════════
// State Colors
// ═══════════════════════════════════════════════════════════════════════════

const STATE_COLORS: Record<NodeState, string> = {
  NORMAL: '#00d4ff',
  TENSION: '#ff9500',
  CRITICAL: '#ff2d55',
  COLLAPSED: '#8b0000',
};

const DOMAIN_COLORS: Record<string, string> = {
  BIO: '#ef4444',
  CAPITAL: '#f59e0b',
  NETWORK: '#3b82f6',
  KNOWLEDGE: '#8b5cf6',
  TIME: '#10b981',
  EMOTION: '#ec4899',
};

const CATEGORY_COLORS: Record<string, string> = {
  T: '#ffd700',  // 투자자: 금색
  B: '#00d4ff',  // 사업가: 시안
  L: '#00ff87',  // 근로자: 초록
};

// ═══════════════════════════════════════════════════════════════════════════
// Data Generator
// ═══════════════════════════════════════════════════════════════════════════

class DataGenerator {
  private engine = physicsEngine72;
  
  createSample(count: number = 100): NodeEntity[] {
    const nodes: NodeEntity[] = [];
    
    for (let i = 0; i < count; i++) {
      const coords = cubeInterpreter.generateRandomCoords();
      nodes.push(this.engine.createNodeEntity(coords));
    }
    
    // 10% 노드를 위험 상태로
    for (let i = 0; i < Math.floor(count * 0.1); i++) {
      const idx = Math.floor(Math.random() * nodes.length);
      nodes[idx].physics.position = {
        x: 0.7 + Math.random() * 0.3,
        y: 0.7 + Math.random() * 0.3,
        z: 0.7 + Math.random() * 0.3,
      };
      nodes[idx].physics.entropy = 0.6 + Math.random() * 0.3;
      nodes[idx].physics.energy = 0.2 + Math.random() * 0.3;
      nodes[idx].state = this.engine.classifyState(nodes[idx].physics);
    }
    
    return nodes;
  }
  
  evolve(nodes: NodeEntity[]): NodeEntity[] {
    return nodes.map(node => this.engine.evolveNode(node));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub Components
// ═══════════════════════════════════════════════════════════════════════════

const PhysicsStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{label}</div>
    <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '4px' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', backgroundColor: color, borderRadius: '2px' }} />
    </div>
    <div style={{ fontSize: '12px', color, fontWeight: 600 }}>{(value * 100).toFixed(0)}%</div>
  </div>
);

const ScenarioCard: React.FC<{
  scenario: Scenario;
  isBaseline: boolean;
}> = ({ scenario, isBaseline }) => {
  const { name, description, prediction } = scenario;
  const { finalState, collapseStep, confidence, timeline, explanation } = prediction;
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: isBaseline ? 'rgba(255,45,85,0.1)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isBaseline ? 'rgba(255,45,85,0.3)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>
          {isBaseline ? '⚠️' : '💡'} {name}
        </div>
        <div style={{
          padding: '4px 10px',
          backgroundColor: `${STATE_COLORS[finalState]}20`,
          borderRadius: '4px',
          fontSize: '11px',
          color: STATE_COLORS[finalState],
          fontWeight: 600,
        }}>
          → {finalState}
        </div>
      </div>
      
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
        {description}
      </div>
      
      {/* Mini trajectory */}
      <div style={{
        height: '40px',
        position: 'relative',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '10px',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path
            d={`M 0 ${40 - timeline[0].energy * 35} ` + 
              timeline.map((t, i) => `L ${(i / timeline.length) * 100} ${40 - t.energy * 35}`).join(' ')}
            fill="none"
            stroke="#00ff87"
            strokeWidth="1.5"
          />
          <path
            d={`M 0 ${5 + timeline[0].entropy * 30} ` + 
              timeline.map((t, i) => `L ${(i / timeline.length) * 100} ${5 + t.entropy * 30}`).join(' ')}
            fill="none"
            stroke="#ff2d55"
            strokeWidth="1.5"
          />
        </svg>
        <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '8px', color: '#00ff87' }}>에너지</div>
        <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '8px', color: '#ff2d55' }}>엔트로피</div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {collapseStep ? `붕괴: t+${collapseStep}` : '붕괴 없음'}
        </span>
        <span style={{ color: confidence > 0.7 ? '#00ff87' : '#ff9500' }}>
          신뢰도 {(confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const AutusPrediction: React.FC = () => {
  const generator = useRef(new DataGenerator());
  
  const [nodes, setNodes] = useState<NodeEntity[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeEntity | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFuture, setShowFuture] = useState(true);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // 초기화
  useEffect(() => {
    setNodes(generator.current.createSample(150));
  }, []);

  // 시뮬레이션 루프
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setNodes(prev => generator.current.evolve(prev));
      setTime(t => t + 1);
    }, 200);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  // 노드 선택 시 시나리오 계산
  useEffect(() => {
    if (selectedNode) {
      const newScenarios = physicsEngine72.compareScenarios(
        selectedNode.physics, 
        selectedNode.coords
      );
      setScenarios(newScenarios);
    }
  }, [selectedNode]);

  // 상태별 분류
  const categorized = useMemo(() => ({
    collapsed: nodes.filter(n => n.state === 'COLLAPSED'),
    critical: nodes.filter(n => n.state === 'CRITICAL'),
    tension: nodes.filter(n => n.state === 'TENSION'),
    normal: nodes.filter(n => n.state === 'NORMAL'),
  }), [nodes]);

  // 필터링된 노드
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (filterDomain) {
      result = result.filter(n => n.meta.motionDomain === filterDomain);
    }
    if (filterCategory) {
      result = result.filter(n => n.meta.nodeCategory === filterCategory);
    }
    return result;
  }, [nodes, filterDomain, filterCategory]);

  // 예측 요약
  const predictionSummary = useMemo(() => {
    let willCollapse = 0;
    let willCritical = 0;
    
    nodes.forEach(node => {
      if (node.future.length > 0) {
        const finalState = physicsEngine72.classifyState(node.future[node.future.length - 1]);
        if (finalState === 'COLLAPSED') willCollapse++;
        else if (finalState === 'CRITICAL') willCritical++;
      }
    });
    
    return { willCollapse, willCritical };
  }, [nodes]);

  // 도메인별 통계
  const domainStats = useMemo(() => {
    const stats: Record<string, { count: number; critical: number; avgResonance: number }> = {};
    Object.keys(PHYSICS_NODES).forEach(domain => {
      const domainNodes = nodes.filter(n => n.meta.motionDomain === domain);
      stats[domain] = {
        count: domainNodes.length,
        critical: domainNodes.filter(n => n.state === 'CRITICAL' || n.state === 'COLLAPSED').length,
        avgResonance: domainNodes.length > 0 
          ? domainNodes.reduce((s, n) => s + n.meta.resonance, 0) / domainNodes.length 
          : 0,
      };
    });
    return stats;
  }, [nodes]);

  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      backgroundColor: '#030308',
      color: '#fff',
      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '2px' }}>AUTUS 72³ PREDICTION</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              Node × Motion × Work = {72 * 72 * 72} 조합
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
          
          {/* Category Filter */}
          <select
            value={filterCategory || ''}
            onChange={e => setFilterCategory(e.target.value || null)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '11px',
            }}
          >
            <option value="">All Categories</option>
            <option value="T">T: 투자자</option>
            <option value="B">B: 사업가</option>
            <option value="L">L: 근로자</option>
          </select>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '6px 14px',
              backgroundColor: isPaused ? 'rgba(0,255,135,0.2)' : 'rgba(255,45,85,0.2)',
              border: `1px solid ${isPaused ? '#00ff87' : '#ff2d55'}`,
              borderRadius: '6px',
              color: isPaused ? '#00ff87' : '#ff2d55',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {isPaused ? '▶ 재개' : '⏸ 정지'}
          </button>
          
          <button
            onClick={() => setShowFuture(!showFuture)}
            style={{
              padding: '6px 14px',
              backgroundColor: showFuture ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showFuture ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              color: showFuture ? '#a855f7' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {showFuture ? '◉ 예측' : '○ 예측'}
          </button>
          
          <div style={{
            padding: '6px 14px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}>
            t = {time}
          </div>
        </div>

        {/* Prediction Alert */}
        {predictionSummary.willCollapse > 0 && (
          <div style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(139,0,0,0.3)',
            border: '1px solid #8b0000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '11px', color: '#ff6b6b', fontWeight: 600 }}>
                {predictionSummary.willCollapse}개 붕괴 예측
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                20 스텝 내
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main - 좌측: 맵, 우측: 설명 */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT: Full Map Area */}
        <div 
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onClick={() => setSelectedNode(null)}
        >
          {/* State Legend - 상단 좌측 */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            gap: '16px',
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '8px 12px',
            borderRadius: '8px',
          }}>
            {(['NORMAL', 'TENSION', 'CRITICAL', 'COLLAPSED'] as NodeState[]).map(state => (
              <div key={state} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: categorized[state.toLowerCase() as keyof typeof categorized].length > 0 ? 1 : 0.3,
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: STATE_COLORS[state],
                  boxShadow: `0 0 8px ${STATE_COLORS[state]}`,
                }} />
                <span style={{ fontSize: '10px', color: STATE_COLORS[state] }}>
                  {state} ({categorized[state.toLowerCase() as keyof typeof categorized].length})
                </span>
              </div>
            ))}
          </div>

          {/* Render Nodes */}
          {filteredNodes.map(node => {
            const { physics: p, state, future, meta } = node;
            const isSelected = selectedNode?.id === node.id;
            
            const x = 5 + p.position.x * 90;
            const y = 5 + p.position.y * 90;
            const size = 6 + (1 - p.energy) * 10;
            
            return (
              <React.Fragment key={node.id}>
                {/* Future trajectory */}
                {showFuture && future.length > 0 && state !== 'NORMAL' && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    <path
                      d={`M ${x}% ${y}% ` + future.map((f, i) => {
                        const fx = 5 + f.position.x * 90;
                        const fy = 5 + f.position.y * 90;
                        return `L ${fx}% ${fy}%`;
                      }).join(' ')}
                      fill="none"
                      stroke={STATE_COLORS[state]}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.3"
                    />
                  </svg>
                )}
                
                {/* Node */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  title={node.interpretation}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    backgroundColor: STATE_COLORS[state],
                    boxShadow: `0 0 ${size}px ${STATE_COLORS[state]}`,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #fff' : `1px solid ${CATEGORY_COLORS[meta.nodeCategory]}`,
                    zIndex: state === 'COLLAPSED' ? 100 : state === 'CRITICAL' ? 80 : 10,
                    opacity: 0.6 + p.entropy * 0.4,
                    animation: state === 'CRITICAL' ? 'pulse 0.5s infinite' : 
                               state === 'COLLAPSED' ? 'flicker 0.1s infinite' : 'none',
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* RIGHT: Info Panel (항상 표시) */}
        <aside style={{
          width: '320px',
          minWidth: '320px',
          backgroundColor: 'rgba(10,10,20,0.95)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* 선택된 노드 정보 */}
          {selectedNode ? (
            <>
              {/* Node Info Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: `linear-gradient(90deg, ${STATE_COLORS[selectedNode.state]}20, transparent)`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                    선택된 노드
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                  >×</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: STATE_COLORS[selectedNode.state],
                    boxShadow: `0 0 12px ${STATE_COLORS[selectedNode.state]}`,
                  }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: STATE_COLORS[selectedNode.state] }}>
                      {selectedNode.state}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      [{selectedNode.coords.join(', ')}]
                    </div>
                  </div>
                </div>
                
                {/* 72³ 해석 */}
                <div style={{
                  padding: '10px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  lineHeight: 1.6,
                }}>
                  <div style={{ color: CATEGORY_COLORS[selectedNode.meta.nodeCategory], fontWeight: 600 }}>
                    [{selectedNode.meta.nodeId}] {selectedNode.meta.nodeName}
                  </div>
                  <div style={{ color: DOMAIN_COLORS[selectedNode.meta.motionDomain] }}>
                    + [{selectedNode.meta.motionId}] {selectedNode.meta.motionName}
                  </div>
                  <div style={{ color: DOMAIN_COLORS[selectedNode.meta.workDomain] }}>
                    + [{selectedNode.meta.workId}] {selectedNode.meta.workName}
                  </div>
                  <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.6)' }}>
                    → {selectedNode.interpretation}
                  </div>
                </div>
                
                {/* Physics Stats */}
                <div style={{
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  <PhysicsStat label="에너지" value={selectedNode.physics.energy} color="#00ff87" />
                  <PhysicsStat label="엔트로피" value={selectedNode.physics.entropy} color="#ff2d55" />
                  <PhysicsStat label="공명" value={selectedNode.meta.resonance / 100} color="#a855f7" />
                </div>
              </div>

              {/* Scenarios */}
              <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', letterSpacing: '2px' }}>
                  미래 시나리오 (20 스텝)
                </div>
                
                {scenarios.map((scenario, i) => (
                  <ScenarioCard
                    key={i}
                    scenario={scenario}
                    isBaseline={i === 0}
                  />
                ))}
                
                {/* Explanation */}
                {scenarios.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '2px' }}>
                      물리 법칙 설명
                    </div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {scenarios[0].prediction.explanation}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Default: Domain & Category Stats */}
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '4px' }}>
                  DOMAIN STATS
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  노드를 클릭하면 상세 정보가 표시됩니다
                </div>
              </div>
              
              <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                {/* Domain Filter Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {Object.entries(PHYSICS_NODES).map(([key, node]) => {
                    const stats = domainStats[key];
                    const isSelected = filterDomain === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setFilterDomain(isSelected ? null : key)}
                        style={{
                          padding: '10px',
                          backgroundColor: isSelected ? `${DOMAIN_COLORS[key]}20` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? DOMAIN_COLORS[key] : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px' }}>{node.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: DOMAIN_COLORS[key] }}>
                            {node.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                          <span>{stats.count}개</span>
                          <span style={{ color: stats.critical > 0 ? '#ff2d55' : 'inherit' }}>
                            ⚠️ {stats.critical}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Category Filter */}
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '10px' }}>
                  NODE CATEGORY
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['T', 'B', 'L'] as const).map(cat => {
                    const catNodes = nodes.filter(n => n.meta.nodeCategory === cat);
                    const isSelected = filterCategory === cat;
                    const label = { T: '투자자', B: '사업가', L: '근로자' }[cat];
                    return (
                      <div
                        key={cat}
                        onClick={() => setFilterCategory(isSelected ? null : cat)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: isSelected ? `${CATEGORY_COLORS[cat]}20` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '14px', color: CATEGORY_COLORS[cat], fontWeight: 600 }}>{cat}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: CATEGORY_COLORS[cat], marginTop: '4px' }}>{catNodes.length}</div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick Summary */}
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '10px' }}>
                    SUMMARY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#00d4ff' }}>{nodes.length}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Total Nodes</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#ff2d55' }}>
                        {categorized.critical.length + categorized.collapsed.length}
                      </div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>At Risk</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#ff9500' }}>{categorized.tension.length}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Tension</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#00ff87' }}>{categorized.normal.length}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Normal</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default AutusPrediction;
