import React, { useState, useEffect } from 'react';
import FSDHUD from '../../components/ui/FSDHUD';
import VSpiralGraph from '../../components/ui/VSpiralGraph';
import LightFlowEffect from '../../components/ui/LightFlowEffect';
import GlassCard from '../../components/ui/GlassCard';

// ============================================
// KRATON LIVE DASHBOARD
// FSD 스타일 HUD + V 나선 그래프 + Truth Mode
// ============================================

const TOKENS = {
  type: {
    h2: 'text-xl font-bold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums tracking-wide',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-150 ease-out',
  },
  state: {
    1: { color: '#22c55e', label: 'OPTIMAL' },
    2: { color: '#3b82f6', label: 'STABLE' },
    3: { color: '#eab308', label: 'WATCH' },
    4: { color: '#f97316', label: 'ALERT' },
    5: { color: '#ef4444', label: 'RISK' },
    6: { color: '#b91c1c', label: 'CRITICAL' },
  },
};

// ============================================
// RISK QUEUE CARD
// ============================================
const RiskQueueCard = ({ risks, truthMode }) => {
  return (
    <GlassCard>
      <div className="flex justify-between items-center mb-4">
        <h3 className={TOKENS.type.h2}>🚨 Risk Queue</h3>
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
          risks.length > 3 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {risks.length}건
        </span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {risks.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">✨</span>
            <p className={`${TOKENS.type.body} text-gray-500 mt-2`}>현재 위험 학생 없음</p>
          </div>
        ) : (
          risks.map((risk, idx) => {
            const stateConfig = TOKENS.state[risk.state] || TOKENS.state[4];
            
            return (
              <div
                key={risk.id || idx}
                className={`p-4 rounded-xl border-l-4 ${TOKENS.motion.fast} bg-gray-900/50 hover:bg-gray-800/50`}
                style={{ borderLeftColor: stateConfig.color }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={TOKENS.type.body}>{risk.student_name}</p>
                    <p className={TOKENS.type.meta}>{risk.signals?.join(' · ') || '위험 신호 감지'}</p>
                  </div>
                  <div className="text-right">
                    <span 
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: `${stateConfig.color}20`, color: stateConfig.color }}
                    >
                      {truthMode ? `S${risk.state}` : stateConfig.label}
                    </span>
                    {truthMode && (
                      <p className={`${TOKENS.type.meta} mt-1`}>{risk.probability}%</p>
                    )}
                  </div>
                </div>
                
                <button className={`mt-3 w-full py-2 rounded-lg text-sm font-medium ${TOKENS.motion.fast} bg-white/5 hover:bg-white/10 text-gray-300`}>
                  {risk.suggested_action || '개입 실행'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
};

// ============================================
// ACTIVITY FEED
// ============================================
const ActivityFeed = ({ activities, truthMode }) => {
  const typeConfig = {
    alert: { icon: '🚨', color: 'text-red-400', bg: 'bg-red-900/20' },
    success: { icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
    payment: { icon: '💳', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    info: { icon: 'ℹ️', color: 'text-blue-400', bg: 'bg-blue-900/20' },
    standard: { icon: '⭐', color: 'text-purple-400', bg: 'bg-purple-900/20' },
  };

  return (
    <GlassCard>
      <h3 className={`${TOKENS.type.h2} mb-4`}>🕐 실시간 활동</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activities.map((activity, idx) => {
          const config = typeConfig[activity.type] || typeConfig.info;
          
          return (
            <div
              key={activity.id || idx}
              className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} ${TOKENS.motion.fast}`}
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`${TOKENS.type.body} ${config.color} truncate`}>{activity.message}</p>
                <p className={TOKENS.type.meta}>{activity.time}</p>
              </div>
              {truthMode && activity.delta_v && (
                <span className={`${TOKENS.type.number} text-xs ${activity.delta_v > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {activity.delta_v > 0 ? '+' : ''}{activity.delta_v}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

// ============================================
// QUICK ACTIONS
// ============================================
const QuickActions = ({ truthMode, onAction }) => {
  const actions = [
    { icon: '📊', label: '주간 리포트 생성', color: 'blue', effect: '+0.3 V' },
    { icon: '🎴', label: '보상 카드 발송', color: 'purple', effect: '+0.5 V' },
    { icon: '📱', label: '일괄 알림톡 발송', color: 'emerald', effect: '+0.2 V' },
    { icon: '🔍', label: '위험 분석 실행', color: 'orange', effect: '+0.4 V' },
  ];

  return (
    <GlassCard>
      <h3 className={`${TOKENS.type.h2} mb-4`}>⚡ Quick Actions</h3>
      
      <div className="space-y-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onAction?.(action.label)}
            className={`w-full py-3 px-4 rounded-xl ${TOKENS.type.body} ${TOKENS.motion.fast}
              bg-${action.color}-600/10 text-${action.color}-400 
              border border-${action.color}-500/20
              hover:bg-${action.color}-600/20 hover:border-${action.color}-500/40
              flex items-center justify-between`}
          >
            <span>{action.icon} {action.label}</span>
            {truthMode && (
              <span className={`${TOKENS.type.meta} text-${action.color}-400/70`}>{action.effect}</span>
            )}
          </button>
        ))}
      </div>
    </GlassCard>
  );
};

// ============================================
// V SPIRAL CARD
// ============================================
const VSpiralCard = ({ vHistory, currentV, truthMode }) => {
  return (
    <GlassCard>
      <div className="flex justify-between items-center mb-4">
        <h3 className={TOKENS.type.h2}>🌀 V Trajectory</h3>
        <span className={TOKENS.type.meta}>복리 성장 시각화</span>
      </div>
      
      <div className="flex justify-center">
        <VSpiralGraph vHistory={vHistory} currentV={currentV} truthMode={truthMode} />
      </div>
      
      {/* Sub metrics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { label: '24h', value: '+2.4%', feeling: '📈 상승' },
          { label: '7일', value: '+12.8%', feeling: '🔥 가속' },
          { label: '30일', value: '+28.5%', feeling: '🚀 폭발' },
        ].map((item, idx) => (
          <div key={idx} className="text-center">
            <p className={TOKENS.type.meta}>{item.label} 변화</p>
            <p className={`${TOKENS.type.number} text-emerald-400 mt-1`}>
              {truthMode ? item.value : item.feeling}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// ============================================
// MAIN LIVE DASHBOARD
// ============================================
const LiveDashboard = () => {
  // State
  const [truthMode, setTruthMode] = useState(false);
  const [systemState, setSystemState] = useState(2);
  const [confidence, setConfidence] = useState(94.2);
  const [vIndex, setVIndex] = useState(847.3);
  const [automationRate, setAutomationRate] = useState(78.5);
  const [nextAction, setNextAction] = useState('김민수 1:1 상담 (10:30)');
  const [vHistory, setVHistory] = useState([720, 745, 780, 795, 820, 835, 847]);
  const [lightFlowActive, setLightFlowActive] = useState(false);
  
  const [risks, setRisks] = useState([
    { id: 1, student_name: '김민수', state: 6, probability: 94, signals: ['연속 결석 3회', '성적 하락'], suggested_action: '긴급 1:1 상담' },
    { id: 2, student_name: '이지은', state: 5, probability: 78, signals: ['학부모 민원'], suggested_action: '학부모 연락' },
  ]);
  
  const [activities, setActivities] = useState([
    { id: 1, type: 'alert', message: '김민수 State 6 진입', time: '10:32', delta_v: -0.5 },
    { id: 2, type: 'success', message: '주간 리포트 자동 발송 완료', time: '10:15', delta_v: 0.3 },
    { id: 3, type: 'payment', message: '박서연 결제 완료 (₩450,000)', time: '10:08', delta_v: 0.2 },
    { id: 4, type: 'standard', message: '출석 알림 표준화 승인', time: '09:45', delta_v: 1.0 },
  ]);

  // Realtime simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setConfidence(prev => Math.min(99.9, Math.max(80, prev + (Math.random() - 0.5) * 2)));
      setVIndex(prev => {
        const newV = prev + (Math.random() - 0.3) * 2;
        setVHistory(h => [...h.slice(-19), newV]);
        
        // Light flow on significant increase
        if (newV - prev > 1) {
          setLightFlowActive(true);
          setTimeout(() => setLightFlowActive(false), 2000);
        }
        
        return newV;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = (actionLabel) => {
    setNextAction(`${actionLabel} 실행 중...`);
    setLightFlowActive(true);
    setTimeout(() => {
      setLightFlowActive(false);
      setNextAction('Monitoring...');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Light Flow Effect */}
      <LightFlowEffect active={lightFlowActive} color="#22c55e" />
      
      {/* FSD HUD */}
      <FSDHUD
        systemState={systemState}
        confidence={confidence}
        vIndex={vIndex}
        automationRate={automationRate}
        nextAction={nextAction}
        truthMode={truthMode}
        onTruthModeToggle={() => setTruthMode(!truthMode)}
      />

      {/* Main Content */}
      <main className="pt-20 p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: V Spiral */}
          <div className="lg:col-span-1">
            <VSpiralCard vHistory={vHistory} currentV={vIndex} truthMode={truthMode} />
          </div>

          {/* Center: Risk Queue + Activity */}
          <div className="lg:col-span-1 space-y-6">
            <RiskQueueCard risks={risks} truthMode={truthMode} />
            <ActivityFeed activities={activities} truthMode={truthMode} />
          </div>

          {/* Right: Quick Actions */}
          <div className="lg:col-span-1">
            <QuickActions truthMode={truthMode} onAction={handleAction} />
          </div>
        </div>
      </main>

      {/* Footer Quote */}
      <div className="text-center py-6">
        <p className="text-gray-600 text-sm italic">
          "V = (M - T) × (1 + s)^t" — Build on the Rock. 🏛️
        </p>
      </div>
    </div>
  );
};

export default LiveDashboard;
