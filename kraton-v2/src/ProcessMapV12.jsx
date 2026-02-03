/**
 * 🌊 ProcessMapV12 - Living Flow Graph
 *
 * AI 시대 최적 그래픽:
 * 1. 흐름 두께 = 가치량 (Sankey)
 * 2. 펄스 애니메이션 = 실시간 이벤트
 * 3. AI 오버레이 = 제안/예측
 * 4. 클릭 = 설정
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// 초기 데이터
// ============================================

const INITIAL_NODES = [
  { id: 'customer', label: '고객', emoji: '👨‍👩‍👧', x: 400, y: 60, type: 'source', value: 100 },
  { id: 'owner', label: '원장', emoji: '👔', x: 150, y: 280, type: 'node', value: 0 },
  { id: 'admin', label: '관리자', emoji: '💼', x: 400, y: 280, type: 'node', value: 0 },
  { id: 'coach', label: '코치', emoji: '🏃', x: 650, y: 280, type: 'node', value: 0 },
  { id: 'outcome', label: '재등록', emoji: '✅', x: 400, y: 480, type: 'target', value: 0 },
];

const INITIAL_CONNECTIONS = [
  { from: 'customer', to: 'owner', value: 20, active: true },
  { from: 'customer', to: 'admin', value: 50, active: true },
  { from: 'customer', to: 'coach', value: 30, active: true },
  { from: 'owner', to: 'outcome', value: 15, active: true },
  { from: 'admin', to: 'outcome', value: 40, active: true },
  { from: 'coach', to: 'outcome', value: 25, active: true },
];

// AI 제안 템플릿
const AI_SUGGESTIONS = [
  { id: 1, type: 'optimize', message: '관리자 → 코치 연결 강화 필요', impact: '+12% 효율', action: 'connect' },
  { id: 2, type: 'warning', message: '원장 노드 병목 감지', impact: '-8% 처리량', action: 'expand' },
  { id: 3, type: 'insight', message: '출석 로그 패턴 발견: 월요일 집중', impact: '예측 정확도 +15%', action: 'apply' },
  { id: 4, type: 'automate', message: '반복 승인 자동화 가능', impact: '시간 -30%', action: 'automate' },
];

// ============================================
// 펄스 파티클 컴포넌트
// ============================================

function Pulse({ from, to, delay, color }) {
  const [position, setPosition] = useState(0);

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
      r={6}
      fill={color}
      opacity={0.8}
      style={{
        filter: 'blur(1px)',
        animation: 'pulse 1s infinite',
      }}
    />
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function ProcessMapV12() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(AI_SUGGESTIONS[0]);
  const [pulses, setPulses] = useState([]);
  const [events, setEvents] = useState([]);
  const [totalFlow, setTotalFlow] = useState(0);
  const svgRef = useRef(null);

  // 실시간 가치 흐름 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      // 연결 가치 변동
      setConnections(prev => prev.map(conn => ({
        ...conn,
        value: Math.max(5, Math.min(80, conn.value + (Math.random() - 0.5) * 10)),
      })));

      // 노드 가치 업데이트
      setNodes(prev => {
        const newNodes = [...prev];
        const customer = newNodes.find(n => n.id === 'customer');

        connections.forEach(conn => {
          const toNode = newNodes.find(n => n.id === conn.to);
          if (toNode && toNode.type === 'node') {
            toNode.value = Math.min(100, toNode.value + conn.value * 0.1);
          }
        });

        // 결과 노드 계산
        const outcome = newNodes.find(n => n.id === 'outcome');
        if (outcome) {
          const inflow = connections
            .filter(c => c.to === 'outcome')
            .reduce((sum, c) => sum + c.value, 0);
          outcome.value = Math.min(100, inflow);
        }

        return newNodes;
      });

      // 총 흐름 계산
      setTotalFlow(connections.reduce((sum, c) => sum + c.value, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [connections]);

  // 펄스 생성
  useEffect(() => {
    const interval = setInterval(() => {
      const randomConn = connections[Math.floor(Math.random() * connections.length)];
      const fromNode = nodes.find(n => n.id === randomConn.from);
      const toNode = nodes.find(n => n.id === randomConn.to);

      if (fromNode && toNode) {
        const newPulse = {
          id: Date.now(),
          from: { x: fromNode.x, y: fromNode.y },
          to: { x: toNode.x, y: toNode.y },
          color: randomConn.value > 40 ? '#10B981' : randomConn.value > 20 ? '#F59E0B' : '#EF4444',
        };
        setPulses(prev => [...prev.slice(-10), newPulse]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [connections, nodes]);

  // AI 제안 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setAiSuggestion(prev => {
        const currentIdx = AI_SUGGESTIONS.findIndex(s => s.id === prev.id);
        return AI_SUGGESTIONS[(currentIdx + 1) % AI_SUGGESTIONS.length];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 이벤트 추가
  const addEvent = useCallback((type, message) => {
    setEvents(prev => [...prev.slice(-4), {
      id: Date.now(),
      type,
      message,
      time: new Date().toLocaleTimeString('ko-KR'),
    }]);
  }, []);

  // 실시간 이벤트 시뮬레이션
  useEffect(() => {
    const eventTypes = [
      { type: 'log', message: '출석 로그 수신' },
      { type: 'log', message: '결제 완료' },
      { type: 'alert', message: '이탈 위험 감지' },
      { type: 'success', message: '재등록 완료' },
      { type: 'log', message: '문의 접수' },
    ];

    const interval = setInterval(() => {
      const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      addEvent(event.type, event.message);
    }, 3000);

    return () => clearInterval(interval);
  }, [addEvent]);

  // AI 제안 적용
  const applyAiSuggestion = () => {
    addEvent('success', `AI 제안 적용: ${aiSuggestion.message}`);
    setAiSuggestion(AI_SUGGESTIONS[(AI_SUGGESTIONS.findIndex(s => s.id === aiSuggestion.id) + 1) % AI_SUGGESTIONS.length]);
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🌊 Living Flow Graph</h1>
          <p style={styles.subtitle}>실시간 가치 흐름 | AI 제안 | 펄스 애니메이션</p>
        </div>
        <div style={styles.flowMeter}>
          <div style={styles.flowLabel}>Total Flow</div>
          <div style={styles.flowValue}>{Math.round(totalFlow)}</div>
          <div style={styles.flowBar}>
            <div style={{ ...styles.flowBarFill, width: `${Math.min(100, totalFlow / 3)}%` }} />
          </div>
        </div>
      </header>

      <div style={styles.mainArea}>
        {/* 캔버스 */}
        <div style={styles.canvas}>
          <svg ref={svgRef} style={styles.svg}>
            <defs>
              {/* 그라디언트 정의 */}
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>

              {/* 글로우 필터 */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* 연결선 (Sankey 스타일) */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const thickness = Math.max(2, conn.value / 5);
              const opacity = 0.3 + (conn.value / 100) * 0.5;

              return (
                <g key={idx}>
                  {/* 메인 흐름선 */}
                  <path
                    d={`M ${fromNode.x} ${fromNode.y + 30}
                        C ${fromNode.x} ${(fromNode.y + toNode.y) / 2},
                          ${toNode.x} ${(fromNode.y + toNode.y) / 2},
                          ${toNode.x} ${toNode.y - 30}`}
                    fill="none"
                    stroke="url(#flowGradient)"
                    strokeWidth={thickness}
                    opacity={opacity}
                    filter="url(#glow)"
                  />

                  {/* 가치 라벨 */}
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {Math.round(conn.value)}
                  </text>
                </g>
              );
            })}

            {/* 펄스 파티클 */}
            {pulses.map(pulse => (
              <Pulse
                key={pulse.id}
                from={pulse.from}
                to={pulse.to}
                color={pulse.color}
              />
            ))}
          </svg>

          {/* 노드들 */}
          {nodes.map(node => (
            <div
              key={node.id}
              style={{
                ...styles.node,
                left: node.x - 45,
                top: node.y - 35,
                borderColor: node.type === 'source' ? '#10B981' :
                             node.type === 'target' ? '#8B5CF6' : '#3B82F6',
                backgroundColor: selectedNode?.id === node.id ? '#EFF6FF' : 'white',
              }}
              onClick={() => setSelectedNode(node)}
            >
              <div style={styles.nodeEmoji}>{node.emoji}</div>
              <div style={styles.nodeLabel}>{node.label}</div>

              {/* 가치 인디케이터 */}
              {node.type !== 'source' && (
                <div style={styles.nodeValueRing}>
                  <svg width="90" height="90" style={{ position: 'absolute', top: -20, left: -20 }}>
                    <circle
                      cx="45"
                      cy="45"
                      r="40"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="3"
                    />
                    <circle
                      cx="45"
                      cy="45"
                      r="40"
                      fill="none"
                      stroke={node.value > 70 ? '#10B981' : node.value > 30 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="3"
                      strokeDasharray={`${node.value * 2.51} 251`}
                      strokeLinecap="round"
                      transform="rotate(-90 45 45)"
                      style={{ transition: 'stroke-dasharray 0.5s' }}
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 사이드 패널 */}
        <div style={styles.sidePanel}>
          {/* AI 제안 */}
          <div style={styles.aiPanel}>
            <div style={styles.aiHeader}>
              <span style={styles.aiIcon}>🤖</span>
              <span style={styles.aiTitle}>AI 제안</span>
              <span style={{
                ...styles.aiType,
                backgroundColor: aiSuggestion.type === 'warning' ? '#FEE2E2' :
                                aiSuggestion.type === 'optimize' ? '#DBEAFE' :
                                aiSuggestion.type === 'automate' ? '#D1FAE5' : '#FEF3C7',
                color: aiSuggestion.type === 'warning' ? '#DC2626' :
                       aiSuggestion.type === 'optimize' ? '#2563EB' :
                       aiSuggestion.type === 'automate' ? '#059669' : '#D97706',
              }}>
                {aiSuggestion.type}
              </span>
            </div>
            <div style={styles.aiMessage}>{aiSuggestion.message}</div>
            <div style={styles.aiImpact}>예상 영향: {aiSuggestion.impact}</div>
            <div style={styles.aiActions}>
              <button style={styles.aiApply} onClick={applyAiSuggestion}>적용</button>
              <button style={styles.aiIgnore}>무시</button>
              <button style={styles.aiMore}>더보기</button>
            </div>
          </div>

          {/* 실시간 이벤트 */}
          <div style={styles.eventPanel}>
            <div style={styles.eventHeader}>
              <span>⚡</span>
              <span>실시간 이벤트</span>
            </div>
            <div style={styles.eventList}>
              {events.map(event => (
                <div
                  key={event.id}
                  style={{
                    ...styles.eventItem,
                    borderLeftColor: event.type === 'alert' ? '#EF4444' :
                                    event.type === 'success' ? '#10B981' : '#3B82F6',
                  }}
                >
                  <span style={styles.eventTime}>{event.time}</span>
                  <span style={styles.eventMessage}>{event.message}</span>
                </div>
              ))}
              {events.length === 0 && (
                <div style={styles.eventEmpty}>이벤트 대기 중...</div>
              )}
            </div>
          </div>

          {/* 선택된 노드 정보 */}
          {selectedNode && (
            <div style={styles.nodePanel}>
              <div style={styles.nodePanelHeader}>
                <span style={{ fontSize: '24px' }}>{selectedNode.emoji}</span>
                <span style={styles.nodePanelTitle}>{selectedNode.label}</span>
              </div>
              <div style={styles.nodePanelStats}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>현재 가치</span>
                  <span style={styles.statValue}>{Math.round(selectedNode.value)}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>연결 수</span>
                  <span style={styles.statValue}>
                    {connections.filter(c => c.from === selectedNode.id || c.to === selectedNode.id).length}
                  </span>
                </div>
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedNode(null)}
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 범례 */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#10B981' }} />
          <span>높은 흐름 (&gt;40)</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#F59E0B' }} />
          <span>중간 흐름 (20-40)</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#EF4444' }} />
          <span>낮은 흐름 (&lt;20)</span>
        </div>
        <div style={styles.legendItem}>
          <div style={styles.legendPulse} />
          <span>펄스 = 실시간 이벤트</span>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    padding: '24px',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#94A3B8',
    marginTop: '4px',
  },
  flowMeter: {
    textAlign: 'right',
  },
  flowLabel: {
    fontSize: '12px',
    color: '#64748B',
  },
  flowValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#10B981',
  },
  flowBar: {
    width: '120px',
    height: '4px',
    backgroundColor: '#1E293B',
    borderRadius: '2px',
    marginTop: '4px',
  },
  flowBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: '2px',
    transition: 'width 0.5s',
  },
  mainArea: {
    display: 'flex',
    gap: '24px',
  },
  canvas: {
    flex: 1,
    height: 'calc(100vh - 200px)',
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  node: {
    position: 'absolute',
    width: '90px',
    height: '70px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  nodeEmoji: {
    fontSize: '28px',
  },
  nodeLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1E293B',
    marginTop: '2px',
  },
  nodeValueRing: {
    position: 'absolute',
    width: '90px',
    height: '90px',
    pointerEvents: 'none',
  },
  sidePanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  aiPanel: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  aiIcon: {
    fontSize: '20px',
  },
  aiTitle: {
    fontSize: '14px',
    fontWeight: 600,
    flex: 1,
  },
  aiType: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  aiMessage: {
    fontSize: '14px',
    color: '#E2E8F0',
    marginBottom: '8px',
    lineHeight: 1.4,
  },
  aiImpact: {
    fontSize: '12px',
    color: '#10B981',
    marginBottom: '12px',
  },
  aiActions: {
    display: 'flex',
    gap: '8px',
  },
  aiApply: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  aiIgnore: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  aiMore: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  eventPanel: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  eventItem: {
    padding: '8px 12px',
    backgroundColor: '#0F172A',
    borderRadius: '6px',
    borderLeft: '3px solid',
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
  },
  eventTime: {
    color: '#64748B',
    flexShrink: 0,
  },
  eventMessage: {
    color: '#E2E8F0',
  },
  eventEmpty: {
    color: '#64748B',
    fontSize: '12px',
    textAlign: 'center',
    padding: '12px',
  },
  nodePanel: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  nodePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  nodePanelTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  nodePanelStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  statItem: {
    backgroundColor: '#0F172A',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#10B981',
  },
  closeButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#334155',
    color: '#94A3B8',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  legend: {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    display: 'flex',
    gap: '20px',
    backgroundColor: '#1E293B',
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#94A3B8',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendPulse: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    animation: 'pulse 1s infinite',
  },
};
