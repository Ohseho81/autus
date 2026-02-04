/**
 * 🌟 ProcessMapV13 - AUTUS Unified World Map
 *
 * V8~V12 통합 버전:
 * 
 * [V8]  상태 머신: State → Transition → Gate → Evidence
 * [V9]  World Map: Consumer Outcome + 11 Force + Contract
 * [V10] 고객 중심: 고객 로그(OutcomeFact) → 프로세스 트리거
 * [V11] Interactive: 드래그, 역할 설정, 실시간 V 흐름
 * [V12] Living Flow: Sankey + AI 오버레이 + 펄스 애니메이션
 *
 * 구조:
 * ┌─────────────────────────────────────────────────────────┐
 * │  [상단] 고객 + Outcome Fact Ledger                       │
 * ├─────────────────────────────────────────────────────────┤
 * │  [중단] 생산자 노드 (드래그 가능) + 11 Force              │
 * │         - Living Flow (Sankey 두께 = 가치량)             │
 * │         - 펄스 애니메이션 (실시간 이벤트)                  │
 * ├─────────────────────────────────────────────────────────┤
 * │  [하단] 상태 머신 + AI 제안 패널                          │
 * └─────────────────────────────────────────────────────────┘
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// 🎨 Design Tokens
// ============================================
const COLORS = {
  bg: { 
    dark: '#0a0a0a', 
    panel: '#1a1a2e', 
    card: '#16213e',
    hover: '#0f3460',
  },
  text: { 
    primary: '#ffffff', 
    secondary: '#94a3b8', 
    muted: '#64748b' 
  },
  accent: {
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
  },
  state: {
    active: '#22c55e',
    pending: '#f59e0b',
    blocked: '#ef4444',
    completed: '#6b7280',
  },
};

// ============================================
// 📊 [V10] 고객 로그 (OutcomeFact) - 10개
// ============================================
const OUTCOME_FACTS = [
  { id: 'OF01', label: '문의', emoji: '❓', type: 'inquiry', color: COLORS.accent.blue },
  { id: 'OF02', label: '등록', emoji: '✅', type: 'registration', color: COLORS.accent.green },
  { id: 'OF03', label: '출석', emoji: '📋', type: 'attendance', color: COLORS.accent.cyan },
  { id: 'OF04', label: '결석', emoji: '📉', type: 'absence', color: COLORS.accent.yellow },
  { id: 'OF05', label: '결제', emoji: '💳', type: 'payment', color: COLORS.accent.green },
  { id: 'OF06', label: '미납', emoji: '🚨', type: 'overdue', color: COLORS.accent.red },
  { id: 'OF07', label: '불만', emoji: '😤', type: 'complaint', color: COLORS.accent.red },
  { id: 'OF08', label: '칭찬', emoji: '😊', type: 'praise', color: COLORS.accent.green },
  { id: 'OF09', label: '이탈', emoji: '🚪', type: 'churn', color: COLORS.accent.red },
  { id: 'OF10', label: '재등록', emoji: '🔄', type: 'renewal', color: COLORS.accent.green },
];

// ============================================
// 🏗️ [V8] 상태 머신 (State Machine)
// ============================================
const STATES = {
  S0: { id: 'S0', name: '리드', color: COLORS.accent.blue },
  S1: { id: 'S1', name: '상담중', color: COLORS.accent.cyan },
  S2: { id: 'S2', name: '등록완료', color: COLORS.accent.green },
  S3: { id: 'S3', name: '수강중', color: COLORS.accent.green },
  S4: { id: 'S4', name: '휴강', color: COLORS.accent.yellow },
  S5: { id: 'S5', name: '위험', color: COLORS.accent.red },
  S6: { id: 'S6', name: '퇴원', color: COLORS.state.completed },
  S7: { id: 'S7', name: '재등록', color: COLORS.accent.purple },
};

const TRANSITIONS = [
  { from: 'S0', to: 'S1', trigger: 'OF01', action: '상담 시작', gate: null },
  { from: 'S1', to: 'S2', trigger: 'OF02', action: '등록', gate: '결제 완료' },
  { from: 'S2', to: 'S3', trigger: 'OF03', action: '수강 시작', gate: null },
  { from: 'S3', to: 'S4', trigger: null, action: '휴강', gate: '원장 승인' },
  { from: 'S3', to: 'S5', trigger: 'OF04', action: '위험 감지', gate: '연속 3회 결석' },
  { from: 'S5', to: 'S6', trigger: 'OF09', action: '퇴원', gate: '환불 처리' },
  { from: 'S5', to: 'S3', trigger: null, action: '복귀', gate: '상담 완료' },
  { from: 'S3', to: 'S7', trigger: 'OF10', action: '재등록', gate: '결제 완료' },
  { from: 'S4', to: 'S3', trigger: null, action: '복귀', gate: null },
];

// ============================================
// 🌍 [V9] 11 Force (환경 변수)
// ============================================
const FORCES = [
  // Internal (조정 가능)
  { id: 'F1', label: '코치 역량', type: 'internal', emoji: '🏃', value: 75 },
  { id: 'F2', label: '커리큘럼', type: 'internal', emoji: '📚', value: 80 },
  { id: 'F3', label: '시설', type: 'internal', emoji: '🏟️', value: 70 },
  { id: 'F4', label: '관리 시스템', type: 'internal', emoji: '💻', value: 85 },
  // Voice (부분 조정)
  { id: 'F5', label: '학부모 의견', type: 'voice', emoji: '👨‍👩‍👧', value: 72 },
  { id: 'F6', label: '학생 만족도', type: 'voice', emoji: '😊', value: 78 },
  { id: 'F7', label: '코치 피드백', type: 'voice', emoji: '📝', value: 80 },
  // External (조정 불가)
  { id: 'F8', label: '경쟁사', type: 'external', emoji: '🏢', value: 60 },
  { id: 'F9', label: '시장 트렌드', type: 'external', emoji: '📈', value: 65 },
  { id: 'F10', label: '규제', type: 'external', emoji: '📋', value: 50 },
  { id: 'F11', label: '경제 상황', type: 'external', emoji: '💰', value: 55 },
];

// ============================================
// 👥 [V11] 생산자 노드 (Interactive)
// ============================================
const INITIAL_NODES = [
  {
    id: 'customer',
    type: 'customer',
    label: '고객',
    emoji: '👨‍👩‍👧',
    x: 400,
    y: 80,
    fixed: true,
    value: 100,
    roles: [],
  },
  {
    id: 'owner',
    type: 'producer',
    label: '원장',
    emoji: '👔',
    x: 150,
    y: 280,
    fixed: false,
    value: 0,
    roles: [
      { id: 'approve', label: '승인', mode: 'manual', enabled: true },
      { id: 'kill', label: 'Kill', mode: 'manual', enabled: true },
      { id: 'strategy', label: '전략', mode: 'manual', enabled: true },
    ],
  },
  {
    id: 'admin',
    type: 'producer',
    label: '관리자',
    emoji: '💼',
    x: 400,
    y: 280,
    fixed: false,
    value: 0,
    roles: [
      { id: 'monitor', label: '모니터링', mode: 'auto', enabled: true },
      { id: 'escalate', label: '에스컬레이션', mode: 'auto', enabled: true },
      { id: 'schedule', label: '스케줄', mode: 'manual', enabled: true },
    ],
  },
  {
    id: 'coach',
    type: 'producer',
    label: '코치',
    emoji: '🏃',
    x: 650,
    y: 280,
    fixed: false,
    value: 0,
    roles: [
      { id: 'teach', label: '수업', mode: 'manual', enabled: true },
      { id: 'feedback', label: '피드백', mode: 'manual', enabled: true },
      { id: 'attendance', label: '출석', mode: 'auto', enabled: true },
    ],
  },
  {
    id: 'outcome',
    type: 'outcome',
    label: '재등록',
    emoji: '🎯',
    x: 400,
    y: 480,
    fixed: true,
    value: 0,
    roles: [],
  },
];

const INITIAL_CONNECTIONS = [
  { from: 'customer', to: 'owner', value: 20, active: true },
  { from: 'customer', to: 'admin', value: 50, active: true },
  { from: 'customer', to: 'coach', value: 30, active: true },
  { from: 'owner', to: 'outcome', value: 15, active: true },
  { from: 'admin', to: 'outcome', value: 40, active: true },
  { from: 'coach', to: 'outcome', value: 25, active: true },
];

// ============================================
// 🤖 [V12] AI 제안
// ============================================
const AI_SUGGESTIONS = [
  { id: 1, type: 'warning', message: '위험 학생 3명 감지', impact: '이탈 위험 +15%', action: '상담 필요', urgent: true },
  { id: 2, type: 'optimize', message: '관리자 → 코치 연결 강화', impact: '효율 +12%', action: '역할 조정', urgent: false },
  { id: 3, type: 'insight', message: '월요일 출석률 낮음', impact: '패턴 발견', action: '스케줄 조정', urgent: false },
  { id: 4, type: 'automate', message: '반복 승인 자동화 가능', impact: '시간 -30%', action: '자동화 적용', urgent: false },
];

// ============================================
// 🔮 펄스 애니메이션 컴포넌트 [V12]
// ============================================
function Pulse({ from, to, color }) {
  const [position, setPosition] = useState(Math.random() * 100);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => (prev + 2) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const x = from.x + (to.x - from.x) * (position / 100);
  const y = from.y + (to.y - from.y) * (position / 100);

  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill={color}
      opacity={0.9}
      style={{ filter: 'blur(1px)' }}
    />
  );
}

// ============================================
// 🎯 메인 컴포넌트
// ============================================
export default function ProcessMapV13() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedFact, setSelectedFact] = useState(null);
  const [currentState, setCurrentState] = useState('S3'); // 현재 상태
  const [recentFacts, setRecentFacts] = useState([]);
  const [viewMode, setViewMode] = useState('flow'); // flow | state | force
  const [showAI, setShowAI] = useState(true);
  const svgRef = useRef(null);
  const dragRef = useRef({ isDragging: false, nodeId: null, offset: { x: 0, y: 0 } });

  // 노드 위치로 연결 찾기
  const getNodeById = useCallback((id) => nodes.find(n => n.id === id), [nodes]);

  // Fact 발생 시뮬레이션
  const triggerFact = useCallback((fact) => {
    setRecentFacts(prev => [{ ...fact, timestamp: Date.now() }, ...prev].slice(0, 5));
    
    // 상태 전이 체크
    const transition = TRANSITIONS.find(t => t.trigger === fact.id && t.from === currentState);
    if (transition) {
      setTimeout(() => {
        setCurrentState(transition.to);
      }, 500);
    }

    // 노드 값 업데이트
    setNodes(prev => prev.map(node => {
      if (node.type === 'producer') {
        return { ...node, value: node.value + Math.floor(Math.random() * 10) };
      }
      return node;
    }));
  }, [currentState]);

  // 드래그 핸들러 [V11]
  const handleMouseDown = useCallback((e, nodeId) => {
    const node = getNodeById(nodeId);
    if (node?.fixed) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      nodeId,
      offset: {
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      },
    };
  }, [getNodeById]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.isDragging) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragRef.current.offset.x;
    const y = e.clientY - rect.top - dragRef.current.offset.y;
    
    setNodes(prev => prev.map(node => 
      node.id === dragRef.current.nodeId 
        ? { ...node, x: Math.max(50, Math.min(750, x)), y: Math.max(50, Math.min(550, y)) }
        : node
    ));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDragging = false;
  }, []);

  // KPI 계산
  const totalValue = nodes.reduce((sum, n) => sum + n.value, 0);
  const conversionRate = Math.round((nodes.find(n => n.id === 'outcome')?.value || 0) / 100 * 100);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.bg.dark,
      color: COLORS.text.primary,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
            🌟 AUTUS World Map
          </h1>
          <p style={{ color: COLORS.text.secondary, margin: '4px 0 0' }}>
            V8~V12 통합 · Living Flow + State Machine + Interactive
          </p>
        </div>
        
        {/* 뷰 모드 토글 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['flow', 'state', 'force'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === mode ? COLORS.accent.blue : COLORS.bg.panel,
                color: COLORS.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {mode === 'flow' ? '🌊 Flow' : mode === 'state' ? '🔄 State' : '💪 Force'}
            </button>
          ))}
          <button
            onClick={() => setShowAI(!showAI)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: showAI ? COLORS.accent.purple : COLORS.bg.panel,
              color: COLORS.text.primary,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            🤖 AI
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* 메인 캔버스 */}
        <div style={{ flex: 1 }}>
          {/* KPI 바 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: COLORS.bg.panel,
            borderRadius: '12px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text.muted, fontSize: '12px' }}>현재 상태</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: STATES[currentState].color }}>
                {STATES[currentState].name}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text.muted, fontSize: '12px' }}>전환율</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.accent.green }}>
                {conversionRate}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text.muted, fontSize: '12px' }}>총 가치 흐름</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>
                {totalValue}
              </div>
            </div>
          </div>

          {/* SVG 캔버스 */}
          <svg
            ref={svgRef}
            width="100%"
            height="560"
            viewBox="0 0 800 560"
            style={{
              backgroundColor: COLORS.bg.panel,
              borderRadius: '12px',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* 그리드 */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.bg.card} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* 연결선 (Sankey 스타일) [V12] */}
            {connections.map((conn, i) => {
              const from = getNodeById(conn.from);
              const to = getNodeById(conn.to);
              if (!from || !to) return null;
              
              const thickness = Math.max(2, conn.value / 5);
              
              return (
                <g key={i}>
                  <path
                    d={`M ${from.x} ${from.y + 30} 
                        C ${from.x} ${(from.y + to.y) / 2}, 
                          ${to.x} ${(from.y + to.y) / 2}, 
                          ${to.x} ${to.y - 30}`}
                    stroke={conn.active ? COLORS.accent.cyan : COLORS.state.completed}
                    strokeWidth={thickness}
                    fill="none"
                    opacity={0.6}
                  />
                  {conn.active && <Pulse from={from} to={to} color={COLORS.accent.cyan} />}
                </g>
              );
            })}

            {/* 노드 */}
            {nodes.map(node => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: node.fixed ? 'default' : 'grab' }}
              >
                {/* 노드 배경 */}
                <circle
                  r={35}
                  fill={selectedNode?.id === node.id ? COLORS.bg.hover : COLORS.bg.card}
                  stroke={node.type === 'customer' ? COLORS.accent.blue : 
                          node.type === 'outcome' ? COLORS.accent.green : COLORS.accent.purple}
                  strokeWidth={2}
                />
                {/* 이모지 */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="24"
                  y={-5}
                >
                  {node.emoji}
                </text>
                {/* 라벨 */}
                <text
                  textAnchor="middle"
                  y={45}
                  fill={COLORS.text.primary}
                  fontSize="12"
                  fontWeight={600}
                >
                  {node.label}
                </text>
                {/* 값 */}
                {node.value > 0 && (
                  <text
                    textAnchor="middle"
                    y={-25}
                    fill={COLORS.accent.green}
                    fontSize="10"
                    fontWeight={700}
                  >
                    +{node.value}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* 사이드 패널 */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Outcome Fact 버튼 [V10] */}
          <div style={{
            padding: '16px',
            backgroundColor: COLORS.bg.panel,
            borderRadius: '12px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
              📊 Outcome Fact (클릭하여 발생)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {OUTCOME_FACTS.map(fact => (
                <button
                  key={fact.id}
                  onClick={() => triggerFact(fact)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedFact?.id === fact.id ? fact.color : COLORS.bg.card,
                    color: COLORS.text.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                  }}
                  title={fact.label}
                >
                  <span style={{ fontSize: '18px' }}>{fact.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 최근 이벤트 */}
          <div style={{
            padding: '16px',
            backgroundColor: COLORS.bg.panel,
            borderRadius: '12px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
              ⚡ 최근 이벤트
            </h3>
            {recentFacts.length === 0 ? (
              <p style={{ color: COLORS.text.muted, fontSize: '12px' }}>
                Fact를 클릭하여 이벤트를 발생시키세요
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentFacts.map((fact, i) => (
                  <div
                    key={fact.timestamp}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: COLORS.bg.card,
                      borderRadius: '8px',
                      borderLeft: `3px solid ${fact.color}`,
                      opacity: 1 - i * 0.15,
                    }}
                  >
                    <span>{fact.emoji}</span>
                    <span style={{ fontSize: '12px' }}>{fact.label}</span>
                    <span style={{ fontSize: '10px', color: COLORS.text.muted, marginLeft: 'auto' }}>
                      방금
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 상태 머신 [V8] */}
          {viewMode === 'state' && (
            <div style={{
              padding: '16px',
              backgroundColor: COLORS.bg.panel,
              borderRadius: '12px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
                🔄 상태 머신
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.values(STATES).map(state => (
                  <button
                    key={state.id}
                    onClick={() => setCurrentState(state.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: currentState === state.id ? `2px solid ${state.color}` : 'none',
                      backgroundColor: currentState === state.id ? state.color + '33' : COLORS.bg.card,
                      color: state.color,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {state.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 11 Force [V9] */}
          {viewMode === 'force' && (
            <div style={{
              padding: '16px',
              backgroundColor: COLORS.bg.panel,
              borderRadius: '12px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
                💪 11 Force
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {FORCES.map(force => (
                  <div
                    key={force.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: COLORS.bg.card,
                      borderRadius: '8px',
                    }}
                  >
                    <span>{force.emoji}</span>
                    <span style={{ fontSize: '12px', flex: 1 }}>{force.label}</span>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      backgroundColor: COLORS.bg.dark,
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${force.value}%`,
                        height: '100%',
                        backgroundColor: force.type === 'internal' ? COLORS.accent.blue :
                                         force.type === 'voice' ? COLORS.accent.yellow : COLORS.accent.red,
                      }} />
                    </div>
                    <span style={{ fontSize: '10px', color: COLORS.text.muted, width: '30px' }}>
                      {force.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 제안 [V12] */}
          {showAI && (
            <div style={{
              padding: '16px',
              backgroundColor: COLORS.bg.panel,
              borderRadius: '12px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
                🤖 AI 제안
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AI_SUGGESTIONS.map(suggestion => (
                  <div
                    key={suggestion.id}
                    style={{
                      padding: '10px',
                      backgroundColor: suggestion.urgent ? COLORS.accent.red + '22' : COLORS.bg.card,
                      borderRadius: '8px',
                      borderLeft: `3px solid ${
                        suggestion.type === 'warning' ? COLORS.accent.red :
                        suggestion.type === 'optimize' ? COLORS.accent.blue :
                        suggestion.type === 'insight' ? COLORS.accent.yellow : COLORS.accent.green
                      }`,
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      {suggestion.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: COLORS.text.muted }}>
                        {suggestion.impact}
                      </span>
                      <button style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: COLORS.accent.blue,
                        color: 'white',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}>
                        {suggestion.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 선택된 노드 정보 [V11] */}
          {selectedNode && selectedNode.roles?.length > 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: COLORS.bg.panel,
              borderRadius: '12px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: COLORS.text.secondary }}>
                {selectedNode.emoji} {selectedNode.label} 역할
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedNode.roles.map(role => (
                  <div
                    key={role.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      backgroundColor: COLORS.bg.card,
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{role.label}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      backgroundColor: role.mode === 'auto' ? COLORS.accent.green + '33' : COLORS.accent.yellow + '33',
                      color: role.mode === 'auto' ? COLORS.accent.green : COLORS.accent.yellow,
                    }}>
                      {role.mode === 'auto' ? '자동' : '수동'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
