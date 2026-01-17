/**
 * AUTUS K/I Physics Dashboard
 * 
 * K-지수 (Karma): 개인/집단 고유 특성
 * I-지수 (Interaction): 노드 간 상호작용
 * 
 * 실시간 WebSocket 모니터링 + 시각화
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeData {
  id: string;
  k_index: number;
  phase: string;
  action_count: number;
  last_action?: string;
  trend: number;
}

interface InteractionData {
  node_a: string;
  node_b: string;
  i_index: number;
  phase: string;
  interaction_count: number;
}

interface Anomaly {
  type: 'explosive' | 'dangerous' | 'synergy' | 'destructive';
  target: string | string[];
  value: number;
  timestamp: Date;
}

interface WSMessage {
  type: 'k_update' | 'i_update' | 'phase_change' | 'anomaly' | 'heartbeat' | 'snapshot';
  data: Record<string, unknown>;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

const getKColor = (k: number): string => {
  if (k > 0.7) return '#22c55e';  // green
  if (k > 0.3) return '#84cc16';  // lime
  if (k > -0.3) return '#eab308'; // yellow
  if (k > -0.7) return '#f97316'; // orange
  return '#ef4444';               // red
};

const getIColor = (i: number): string => {
  if (i > 0.7) return '#06b6d4';  // cyan (synergy)
  if (i > 0.3) return '#3b82f6';  // blue
  if (i > -0.3) return '#8b5cf6'; // purple
  if (i > -0.7) return '#f97316'; // orange
  return '#ef4444';               // red (destructive)
};

const getPhaseIcon = (phase: string): string => {
  switch (phase) {
    case '폭발 성장': return '🚀';
    case '위험 상태': return '⚠️';
    case '시너지 폭발': return '✨';
    case '자멸 궤도': return '💀';
    case '임계점 접근': return '⚡';
    default: return '●';
  }
};

const formatValue = (v: number): string => {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(3)}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Hook
// ═══════════════════════════════════════════════════════════════════════════════

const useKIWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [events, setEvents] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('K/I WebSocket Connected');
      };

      wsRef.current.onmessage = (event) => {
        const msg: WSMessage = JSON.parse(event.data);
        setLastMessage(msg);
        
        if (msg.type !== 'heartbeat') {
          setEvents(prev => [msg, ...prev].slice(0, 100)); // 최근 100개만
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // 재연결 시도
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { isConnected, lastMessage, events };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: K-지수 게이지
// ═══════════════════════════════════════════════════════════════════════════════

const KGauge: React.FC<{ value: number; size?: number }> = ({ value, size = 120 }) => {
  const normalized = (value + 1) / 2; // -1~1 → 0~1
  const angle = normalized * 180 - 90; // -90 ~ 90도
  const color = getKColor(value);
  
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 120 72">
      {/* 배경 호 */}
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="#1f2937"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* 값 호 */}
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${normalized * 157} 157`}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {/* 바늘 */}
      <line
        x1="60"
        y1="60"
        x2={60 + 35 * Math.cos((angle * Math.PI) / 180)}
        y2={60 - 35 * Math.sin((angle * Math.PI) / 180)}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* 중심점 */}
      <circle cx="60" cy="60" r="4" fill={color} />
      {/* 값 표시 */}
      <text x="60" y="50" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
        {formatValue(value)}
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 노드 카드
// ═══════════════════════════════════════════════════════════════════════════════

const NodeCard: React.FC<{ node: NodeData; onClick?: () => void }> = ({ node, onClick }) => {
  const kColor = getKColor(node.k_index);
  const trendIcon = node.trend > 0 ? '↗' : node.trend < 0 ? '↘' : '→';
  
  return (
    <div
      onClick={onClick}
      className="relative p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105"
      style={{
        background: `linear-gradient(135deg, ${kColor}15, ${kColor}05)`,
        border: `1px solid ${kColor}40`,
        boxShadow: `0 4px 20px ${kColor}20`
      }}
    >
      {/* 상태 아이콘 */}
      <div className="absolute top-2 right-2 text-lg">
        {getPhaseIcon(node.phase)}
      </div>
      
      {/* 노드 ID */}
      <div className="text-sm text-gray-400 mb-1">{node.id}</div>
      
      {/* K 게이지 */}
      <div className="flex justify-center">
        <KGauge value={node.k_index} size={100} />
      </div>
      
      {/* 정보 */}
      <div className="mt-2 text-xs text-gray-500 flex justify-between">
        <span>행동: {node.action_count}</span>
        <span style={{ color: node.trend > 0 ? '#22c55e' : node.trend < 0 ? '#ef4444' : '#6b7280' }}>
          {trendIcon} {Math.abs(node.trend).toFixed(4)}
        </span>
      </div>
      
      {/* 최근 행동 */}
      {node.last_action && (
        <div className="mt-1 text-xs text-gray-600 truncate">
          최근: {node.last_action}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: I-지수 연결선
// ═══════════════════════════════════════════════════════════════════════════════

const InteractionLine: React.FC<{ interaction: InteractionData }> = ({ interaction }) => {
  const color = getIColor(interaction.i_index);
  
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg mb-1"
      style={{
        background: `${color}10`,
        borderLeft: `3px solid ${color}`
      }}
    >
      <span className="text-sm font-mono">{interaction.node_a}</span>
      <span className="flex-1 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent, ${color})` }} />
      <span
        className="px-2 py-0.5 rounded text-xs font-bold"
        style={{ background: color, color: '#000' }}
      >
        {formatValue(interaction.i_index)}
      </span>
      <span className="flex-1 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent, ${color})` }} />
      <span className="text-sm font-mono">{interaction.node_b}</span>
      <span className="text-sm">{getPhaseIcon(interaction.phase)}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 이벤트 로그
// ═══════════════════════════════════════════════════════════════════════════════

const EventLog: React.FC<{ events: WSMessage[] }> = ({ events }) => {
  const getEventStyle = (type: string) => {
    switch (type) {
      case 'phase_change': return { bg: '#fef3c7', border: '#f59e0b' };
      case 'anomaly': return { bg: '#fee2e2', border: '#ef4444' };
      case 'k_update': return { bg: '#dbeafe', border: '#3b82f6' };
      case 'i_update': return { bg: '#e0e7ff', border: '#6366f1' };
      default: return { bg: '#f3f4f6', border: '#9ca3af' };
    }
  };

  return (
    <div className="h-64 overflow-y-auto space-y-1 p-2 bg-gray-900 rounded-lg">
      {events.length === 0 ? (
        <div className="text-gray-500 text-center py-8">이벤트 대기 중...</div>
      ) : (
        events.map((event, i) => {
          const style = getEventStyle(event.type);
          return (
            <div
              key={i}
              className="text-xs p-2 rounded"
              style={{
                background: style.bg + '20',
                borderLeft: `2px solid ${style.border}`
              }}
            >
              <div className="flex justify-between text-gray-400">
                <span className="uppercase font-bold" style={{ color: style.border }}>
                  {event.type}
                </span>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-gray-300 mt-1">
                {JSON.stringify(event.data).slice(0, 100)}...
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 네트워크 그래프 (Canvas)
// ═══════════════════════════════════════════════════════════════════════════════

const NetworkGraph: React.FC<{
  nodes: NodeData[];
  interactions: InteractionData[];
}> = ({ nodes, interactions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // 클리어
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 노드 위치 계산 (원형 배치)
    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      nodePositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // 연결선 그리기
    interactions.forEach(inter => {
      const posA = nodePositions[inter.node_a];
      const posB = nodePositions[inter.node_b];
      if (!posA || !posB) return;

      const color = getIColor(inter.i_index);
      const lineWidth = Math.abs(inter.i_index) * 3 + 1;

      ctx.beginPath();
      ctx.moveTo(posA.x, posA.y);
      ctx.lineTo(posB.x, posB.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // I 값 표시
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      ctx.fillStyle = color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatValue(inter.i_index), midX, midY);
    });

    // 노드 그리기
    nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const color = getKColor(node.k_index);
      const nodeRadius = 25 + node.k_index * 10;

      // Glow
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius + 5, 0, Math.PI * 2);
      ctx.fillStyle = color + '30';
      ctx.fill();

      // 노드
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 라벨
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, pos.x, pos.y - 5);
      ctx.font = '10px monospace';
      ctx.fillText(formatValue(node.k_index), pos.x, pos.y + 10);
    });

  }, [nodes, interactions]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="rounded-xl border border-gray-700"
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 이상 징후 알림
// ═══════════════════════════════════════════════════════════════════════════════

const AnomalyAlert: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  if (anomalies.length === 0) return null;

  const getAnomalyStyle = (type: string) => {
    switch (type) {
      case 'explosive': return { icon: '🚀', bg: '#22c55e', label: '폭발 성장' };
      case 'dangerous': return { icon: '⚠️', bg: '#ef4444', label: '위험 상태' };
      case 'synergy': return { icon: '✨', bg: '#06b6d4', label: '시너지' };
      case 'destructive': return { icon: '💀', bg: '#ef4444', label: '자멸 궤도' };
      default: return { icon: '●', bg: '#6b7280', label: '알 수 없음' };
    }
  };

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly, i) => {
        const style = getAnomalyStyle(anomaly.type);
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg animate-pulse"
            style={{ background: style.bg + '20', border: `1px solid ${style.bg}` }}
          >
            <span className="text-2xl">{style.icon}</span>
            <div className="flex-1">
              <div className="font-bold" style={{ color: style.bg }}>{style.label}</div>
              <div className="text-sm text-gray-400">
                {Array.isArray(anomaly.target) ? anomaly.target.join(' ↔ ') : anomaly.target}
                : {formatValue(anomaly.value)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 대시보드
// ═══════════════════════════════════════════════════════════════════════════════

const KIDashboard: React.FC = () => {
  // 상태
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [interactions, setInteractions] = useState<InteractionData[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // WebSocket URL (환경변수 또는 기본값)
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/ki';
  const { isConnected, lastMessage, events } = useKIWebSocket(wsUrl);

  // 데모 데이터 (WebSocket 연결 전)
  useEffect(() => {
    // 데모 노드
    setNodes([
      { id: 'User_A', k_index: 0.72, phase: '임계점 접근', action_count: 15, trend: 0.02, last_action: '약속 이행' },
      { id: 'User_B', k_index: -0.45, phase: '정상', action_count: 8, trend: -0.01, last_action: '책임 회피' },
      { id: 'Corp_X', k_index: -0.82, phase: '위험 상태', action_count: 12, trend: -0.03, last_action: '배신' },
      { id: 'Team_Alpha', k_index: 0.91, phase: '폭발 성장', action_count: 25, trend: 0.01, last_action: '자발적 도움' },
      { id: 'Partner_Y', k_index: 0.33, phase: '정상', action_count: 5, trend: 0.005, last_action: '투명한 소통' },
    ]);

    // 데모 상호작용
    setInteractions([
      { node_a: 'User_A', node_b: 'User_B', i_index: 0.45, phase: '정상', interaction_count: 10 },
      { node_a: 'User_A', node_b: 'Corp_X', i_index: -0.72, phase: '자멸 궤도', interaction_count: 8 },
      { node_a: 'User_B', node_b: 'Corp_X', i_index: -0.38, phase: '정상', interaction_count: 5 },
      { node_a: 'Team_Alpha', node_b: 'Partner_Y', i_index: 0.78, phase: '시너지 폭발', interaction_count: 15 },
      { node_a: 'User_A', node_b: 'Team_Alpha', i_index: 0.55, phase: '임계점 접근', interaction_count: 7 },
    ]);

    // 데모 이상 징후
    setAnomalies([
      { type: 'explosive', target: 'Team_Alpha', value: 0.91, timestamp: new Date() },
      { type: 'dangerous', target: 'Corp_X', value: -0.82, timestamp: new Date() },
      { type: 'destructive', target: ['User_A', 'Corp_X'], value: -0.72, timestamp: new Date() },
      { type: 'synergy', target: ['Team_Alpha', 'Partner_Y'], value: 0.78, timestamp: new Date() },
    ]);
  }, []);

  // WebSocket 메시지 처리
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'k_update':
        setNodes(prev => prev.map(n =>
          n.id === (lastMessage.data as { node_id: string }).node_id
            ? { ...n, k_index: (lastMessage.data as { k_after: number }).k_after, phase: (lastMessage.data as { phase: string }).phase }
            : n
        ));
        break;

      case 'i_update':
        setInteractions(prev => prev.map(i =>
          (i.node_a === (lastMessage.data as { node_a: string }).node_a && i.node_b === (lastMessage.data as { node_b: string }).node_b) ||
          (i.node_a === (lastMessage.data as { node_b: string }).node_b && i.node_b === (lastMessage.data as { node_a: string }).node_a)
            ? { ...i, i_index: (lastMessage.data as { i_after: number }).i_after, phase: (lastMessage.data as { phase: string }).phase }
            : i
        ));
        break;

      case 'anomaly':
        setAnomalies(prev => [lastMessage.data as unknown as Anomaly, ...prev].slice(0, 10));
        break;
    }
  }, [lastMessage]);

  // selectedNode 사용 (lint 경고 방지)
  console.debug('Selected node:', selectedNode);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            K/I Physics Dashboard
          </h1>
          <p className="text-gray-500 text-sm">실시간 카르마 & 상호작용 모니터링</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Live Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 노드 그리드 */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3 text-cyan-400">K-Index Nodes</h2>
          <div className="grid grid-cols-2 gap-3">
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                onClick={() => setSelectedNode(node.id)}
              />
            ))}
          </div>
        </div>

        {/* 중앙: 네트워크 그래프 */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3 text-purple-400">Network Graph</h2>
          <NetworkGraph nodes={nodes} interactions={interactions} />
          
          {/* I-지수 목록 */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-400">I-Index Interactions</h3>
            {interactions.map((inter, i) => (
              <InteractionLine key={i} interaction={inter} />
            ))}
          </div>
        </div>

        {/* 오른쪽: 알림 & 로그 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 이상 징후 */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-orange-400">⚠️ Anomalies</h2>
            <AnomalyAlert anomalies={anomalies} />
          </div>

          {/* 이벤트 로그 */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-400">Event Log</h2>
            <EventLog events={events} />
          </div>
        </div>
      </div>

      {/* 하단: 물리법칙 요약 */}
      <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <h3 className="text-sm font-bold text-gray-400 mb-2">Physics Laws</h3>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-500">
          <div>
            <span className="text-cyan-400">ΔK</span> = α × (score × weight × mag) × (1 - |K|)
          </div>
          <div>
            <span className="text-purple-400">ΔI</span> = β × (score × mag) × (K_a + K_b)/2 × (1 - |I|)
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-xs">
          <span className="text-green-400">K &gt; 0.9 → 폭발</span>
          <span className="text-red-400">K &lt; -0.7 → 위험</span>
          <span className="text-cyan-400">I &gt; 0.7 → 시너지</span>
          <span className="text-red-400">I &lt; -0.7 → 자멸</span>
        </div>
      </div>
    </div>
  );
};

export default KIDashboard;

// 타입 내보내기
export type { NodeData, InteractionData, Anomaly, WSMessage };
