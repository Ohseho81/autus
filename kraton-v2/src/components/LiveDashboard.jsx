import React, { useState, useEffect, useRef } from 'react';

// ============================================
// KRATON LIVE DASHBOARD
// FSD 스타일 HUD + V 나선 그래프 + 실시간 연동
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums tracking-wide',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-150 ease-out',
    slow: 'transition-all duration-500 ease-out',
  },
  state: {
    1: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'OPTIMAL', color: '#22c55e' },
    2: { bg: 'bg-blue-500', text: 'text-blue-400', label: 'STABLE', color: '#3b82f6' },
    3: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'WATCH', color: '#eab308' },
    4: { bg: 'bg-orange-500', text: 'text-orange-400', label: 'ALERT', color: '#f97316' },
    5: { bg: 'bg-red-500', text: 'text-red-400', label: 'RISK', color: '#ef4444' },
    6: { bg: 'bg-red-700', text: 'text-red-300', label: 'CRITICAL', color: '#b91c1c' },
  },
};

// V Spiral Graph
const VSpiralGraph = ({ vHistory, currentV }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for (let r = 30; r <= 150; r += 30) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (vHistory.length > 1) {
      const maxV = Math.max(...vHistory, currentV);
      const minV = Math.min(...vHistory, currentV);
      const range = maxV - minV || 1;

      ctx.beginPath();
      ctx.lineWidth = 2;

      vHistory.forEach((v, i) => {
        const angle = (i / vHistory.length) * Math.PI * 4;
        const normalizedV = (v - minV) / range;
        const radius = 30 + normalizedV * 120;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#22c55e');
      ctx.strokeStyle = gradient;
      ctx.stroke();

      const lastAngle = (vHistory.length / vHistory.length) * Math.PI * 4;
      const lastNormalized = (currentV - minV) / range;
      const lastRadius = 30 + lastNormalized * 120;
      const lastX = centerX + Math.cos(lastAngle) * lastRadius;
      const lastY = centerY + Math.sin(lastAngle) * lastRadius;

      const glowGradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 20);
      glowGradient.addColorStop(0, '#22c55e');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentV.toFixed(1), centerX, centerY - 10);

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('V-INDEX', centerX, centerY + 15);

  }, [vHistory, currentV]);

  return <canvas ref={canvasRef} width={300} height={300} className="rounded-xl" />;
};

// State Transition Diagram
const StateTransitionDiagram = ({ currentState, stateHistory }) => {
  const states = [
    { id: 1, label: 'IDLE', x: 50, y: 50 },
    { id: 2, label: 'WATCH', x: 150, y: 50 },
    { id: 3, label: 'ALERT', x: 250, y: 50 },
    { id: 4, label: 'EXEC', x: 50, y: 120 },
    { id: 5, label: 'PEND', x: 150, y: 120 },
    { id: 6, label: 'FAIL', x: 250, y: 120 },
    { id: 7, label: 'RECV', x: 100, y: 190 },
    { id: 8, label: 'LEARN', x: 200, y: 190 },
  ];

  return (
    <div className="relative w-full h-56 bg-gray-900 rounded-xl p-4">
      <svg className="w-full h-full" viewBox="0 0 300 220">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#4b5563" />
          </marker>
        </defs>

        {[[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1]].map(([from, to], idx) => {
          const fromState = states.find(s => s.id === from);
          const toState = states.find(s => s.id === to);
          if (!fromState || !toState) return null;
          return (
            <line key={idx} x1={fromState.x} y1={fromState.y} x2={toState.x} y2={toState.y}
              stroke="#374151" strokeWidth="1" markerEnd="url(#arrow)" />
          );
        })}

        {states.map(state => {
          const isActive = state.id === currentState;
          const wasRecent = stateHistory.slice(-3).includes(state.id);

          return (
            <g key={state.id}>
              {isActive && (
                <circle cx={state.x} cy={state.y} r={28} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.5" className="animate-pulse" />
              )}
              <circle cx={state.x} cy={state.y} r={22}
                fill={isActive ? '#3b82f6' : wasRecent ? '#1e3a5f' : '#1f2937'}
                stroke={isActive ? '#60a5fa' : '#374151'} strokeWidth="2" />
              <text x={state.x} y={state.y + 4} textAnchor="middle" fill={isActive ? '#ffffff' : '#9ca3af'}
                fontSize="8" fontWeight={isActive ? 'bold' : 'normal'}>{state.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Live Metric Card
const LiveMetricCard = ({ label, value, unit, trend, color = 'blue' }) => {
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-gray-500';

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border border-gray-800 ${TOKENS.motion.base} hover:border-gray-700`}>
      <p className={TOKENS.type.meta}>{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`${TOKENS.type.number} text-2xl text-${color}-400`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className={TOKENS.type.meta}>{unit}</span>}
      </div>
      {trend !== undefined && (
        <p className={`${TOKENS.type.meta} ${trendColor} mt-1`}>
          {trend > 0 ? '+' : ''}{trend}% vs 전주
        </p>
      )}
    </div>
  );
};

// Risk Queue
const RiskQueueLive = ({ risks }) => (
  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
    <div className="flex justify-between items-center mb-4">
      <h3 className={TOKENS.type.h2}>🚨 Risk Queue</h3>
      <span className={`${TOKENS.type.number} px-2 py-1 bg-red-900/50 text-red-400 rounded`}>{risks.length}건</span>
    </div>

    <div className="space-y-2 max-h-64 overflow-y-auto">
      {risks.length === 0 ? (
        <p className={`${TOKENS.type.body} text-gray-500 text-center py-8`}>✨ 현재 위험 학생 없음</p>
      ) : (
        risks.map((risk, idx) => (
          <div key={risk.id || idx} className={`p-3 rounded-lg border-l-4 ${TOKENS.motion.fast} ${risk.severity === 'high' || risk.state >= 5 ? 'bg-red-900/20 border-red-500' : 'bg-yellow-900/20 border-yellow-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={TOKENS.type.body}>{risk.student_name || `학생 #${risk.student_id}`}</p>
                <p className={TOKENS.type.meta}>{Array.isArray(risk.signals) ? risk.signals.join(' · ') : risk.signals}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-bold ${TOKENS.state[risk.state]?.bg || 'bg-gray-600'}`}>S{risk.state}</span>
                <p className={`${TOKENS.type.meta} mt-1`}>{risk.probability}%</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

// Activity Feed
const ActivityFeed = ({ activities }) => (
  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
    <h3 className={`${TOKENS.type.h2} mb-4`}>🕐 실시간 활동</h3>
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {activities.map((activity, idx) => (
        <div key={activity.id || idx} className={`flex items-center gap-3 p-2 rounded-lg ${TOKENS.motion.fast} ${activity.type === 'alert' ? 'bg-red-900/20' : activity.type === 'success' ? 'bg-emerald-900/20' : 'bg-gray-800'}`}>
          <span className="text-lg">{activity.type === 'alert' ? '🚨' : activity.type === 'success' ? '✅' : activity.type === 'payment' ? '💳' : 'ℹ️'}</span>
          <div className="flex-1">
            <p className={TOKENS.type.body}>{activity.message}</p>
            <p className={TOKENS.type.meta}>{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// FSD HUD
const FSDHUD = ({ systemState, confidence, vIndex, automationRate, nextAction }) => {
  const stateConfig = TOKENS.state[systemState] || TOKENS.state[2];

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <span className={`${TOKENS.type.body} text-lg`}>KRATON</span>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className={TOKENS.type.meta}>STATE</span>
            <div className={`${TOKENS.motion.base} px-4 py-1.5 rounded-full ${TOKENS.type.body} ${stateConfig.bg}/20 ${stateConfig.text} border border-current/30`}>
              <span className="animate-pulse mr-2">●</span>
              {stateConfig.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className={TOKENS.type.meta}>CONFIDENCE</p>
            <p className={`${TOKENS.type.number} text-lg ${confidence >= 90 ? 'text-emerald-400' : confidence >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{confidence.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className={TOKENS.type.meta}>V-INDEX</p>
            <p className={`${TOKENS.type.number} text-lg text-purple-400`}>{vIndex.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className={TOKENS.type.meta}>AUTOMATION</p>
            <p className={`${TOKENS.type.number} text-lg text-blue-400`}>{automationRate.toFixed(1)}%</p>
          </div>
          <div className="max-w-48">
            <p className={TOKENS.type.meta}>NEXT ACTION</p>
            <p className={`${TOKENS.type.body} text-gray-300 truncate`}>{nextAction || 'Monitoring...'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className={`px-4 py-2 rounded-lg ${TOKENS.type.body} ${TOKENS.motion.fast} bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30`}>▶ AUTO</button>
          <button className={`px-4 py-2 rounded-lg ${TOKENS.type.body} ${TOKENS.motion.fast} bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30`}>⏹ STOP</button>
          <span className={TOKENS.type.meta}>{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard
const LiveDashboard = () => {
  const [systemState, setSystemState] = useState(2);
  const [confidence, setConfidence] = useState(94.2);
  const [vIndex, setVIndex] = useState(847.3);
  const [automationRate, setAutomationRate] = useState(78.5);
  const [nextAction, setNextAction] = useState('김민수 1:1 상담 (10:30)');

  const [vHistory, setVHistory] = useState([720, 745, 780, 795, 820, 835, 847]);
  const [stateHistory, setStateHistory] = useState([1, 2, 2, 3, 2, 2]);
  const [risks, setRisks] = useState([
    { id: 1, student_name: '김민수', state: 6, severity: 'high', probability: 94, signals: ['연속 결석 3회', '성적 하락'] },
    { id: 2, student_name: '이지은', state: 5, severity: 'high', probability: 78, signals: ['학부모 민원'] },
  ]);
  const [activities, setActivities] = useState([
    { id: 1, type: 'alert', message: '김민수 State 6 진입', time: '10:32' },
    { id: 2, type: 'success', message: '주간 리포트 자동 발송 완료', time: '10:15' },
    { id: 3, type: 'payment', message: '박서연 결제 완료 (₩450,000)', time: '10:08' },
    { id: 4, type: 'info', message: '신규 학생 2명 등록', time: '09:45' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setConfidence(prev => Math.min(99.9, Math.max(80, prev + (Math.random() - 0.5) * 2)));
      setVIndex(prev => {
        const newV = prev + (Math.random() - 0.3) * 2;
        setVHistory(h => [...h.slice(-19), newV]);
        return newV;
      });
      setAutomationRate(prev => Math.min(99, Math.max(70, prev + (Math.random() - 0.5) * 0.5)));
      if (Math.random() > 0.95) {
        const newState = Math.floor(Math.random() * 4) + 1;
        setSystemState(newState);
        setStateHistory(h => [...h.slice(-9), newState]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <FSDHUD systemState={systemState} confidence={confidence} vIndex={vIndex} automationRate={automationRate} nextAction={nextAction} />

      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className={`${TOKENS.type.h2} mb-4`}>🌀 V Trajectory</h3>
              <div className="flex justify-center">
                <VSpiralGraph vHistory={vHistory} currentV={vIndex} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div><p className={TOKENS.type.meta}>24h</p><p className={`${TOKENS.type.number} text-emerald-400`}>+2.4%</p></div>
                <div><p className={TOKENS.type.meta}>7일</p><p className={`${TOKENS.type.number} text-emerald-400`}>+12.8%</p></div>
                <div><p className={TOKENS.type.meta}>30일</p><p className={`${TOKENS.type.number} text-emerald-400`}>+18.5%</p></div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className={`${TOKENS.type.h2} mb-4`}>🔄 State Machine</h3>
              <StateTransitionDiagram currentState={systemState} stateHistory={stateHistory} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <LiveMetricCard label="총 학생" value={156} unit="명" trend={8} color="blue" />
              <LiveMetricCard label="위험 학생" value={risks.length} unit="명" trend={-25} color="red" />
              <LiveMetricCard label="오늘 출석" value={142} unit="명" trend={3} color="emerald" />
              <LiveMetricCard label="미납 금액" value="₩2.4M" trend={-15} color="yellow" />
            </div>
            <RiskQueueLive risks={risks} />
          </div>

          <div className="space-y-6">
            <ActivityFeed activities={activities} />

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className={`${TOKENS.type.h2} mb-4`}>⚡ Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: '📊 주간 리포트 생성', color: 'blue' },
                  { label: '🎴 보상 카드 발송', color: 'purple' },
                  { label: '📱 일괄 알림톡 발송', color: 'emerald' },
                  { label: '🔍 위험 분석 실행', color: 'orange' },
                ].map((action, idx) => (
                  <button key={idx} className={`w-full py-3 rounded-lg ${TOKENS.type.body} ${TOKENS.motion.base} bg-${action.color}-600/20 text-${action.color}-400 border border-${action.color}-500/30 hover:bg-${action.color}-600/30`}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className={`${TOKENS.type.h2} mb-4`}>🖥️ System Status</h3>
              <div className="space-y-3">
                {[
                  { name: '클래스팅 API', latency: '45ms' },
                  { name: '토스페이먼츠', latency: '32ms' },
                  { name: 'Supabase', latency: '12ms' },
                  { name: 'Claude API', latency: '280ms' },
                  { name: '카카오 알림톡', latency: '89ms' },
                ].map(service => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className={TOKENS.type.body}>{service.name}</span>
                    </div>
                    <span className={TOKENS.type.meta}>{service.latency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveDashboard;
