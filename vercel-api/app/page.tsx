'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '';

// ═══════════════════════════════════════════════════════════════════════════════
// 온리쌤 Dashboard - Tesla Grade Business Intelligence
// V = (T × M × s)^t
// ═══════════════════════════════════════════════════════════════════════════════

interface CockpitData {
  status: { level: string; label: string };
  internal: {
    customerCount: number;
    avgTemperature: number;
    riskCount: number;
    warningCount: number;
    healthyCount: number;
    pendingTasks: number;
  };
  external: {
    sigma: number;
    weatherLabel: string;
    competitionScore: string;
    marketTrend: number;
  };
}

interface AutomationGauge {
  role: string;
  label: string;
  icon: string;
  target: number;
  current: number;
  color: string;
  tasks: { auto: number; manual: number };
}

interface RiskAlert {
  id: string;
  customerId: string;
  customerName: string;
  temperature: number;
  churnProbability: number;
  riskLevel: 'critical' | 'high' | 'medium';
  factors: string[];
  recommendedAction: string;
  detectedAt: string;
}

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const percentage = Math.min((value / target) * 100, 100);
  return (
    <div style={{ 
      width: '100%', 
      height: '8px', 
      background: 'rgba(255,255,255,0.1)', 
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: '4px',
        transition: 'width 0.5s ease'
      }} />
    </div>
  );
}

function AutomationCard({ gauge }: { gauge: AutomationGauge }) {
  const percentage = Math.round((gauge.current / gauge.target) * 100);
  const isAchieved = percentage >= 100;
  
  return (
    <div style={{
      background: 'rgba(26, 26, 40, 0.8)',
      borderRadius: '16px',
      padding: '1.25rem',
      border: `1px solid ${isAchieved ? gauge.color + '44' : 'rgba(80, 80, 100, 0.3)'}`,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{gauge.icon}</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{gauge.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>{gauge.role}</div>
          </div>
        </div>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: isAchieved ? gauge.color : '#fff'
        }}>
          {percentage}%
        </div>
      </div>
      
      <ProgressBar value={gauge.current} target={gauge.target} color={gauge.color} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#666' }}>
        <span>🤖 자동: {gauge.tasks.auto}건</span>
        <span>👤 수동: {gauge.tasks.manual}건</span>
        <span>목표: {gauge.target}%</span>
      </div>
    </div>
  );
}

function VIndexSimulator({ onSimulate }: { onSimulate: (v: number) => void }) {
  const [T, setT] = useState(80); // Trust
  const [M, setM] = useState(70); // Relation (Mint)
  const [s, setS] = useState(0.1); // Satisfaction
  const [t, setTime] = useState(12); // Time (months)
  
  const V = Math.pow((T * M * s), t / 100);
  const normalizedV = Math.min(V, 100).toFixed(1);
  
  useEffect(() => {
    onSimulate(parseFloat(normalizedV));
  }, [V, normalizedV, onSimulate]);
  
  const Slider = ({ label, value, setValue, min, max, step, unit, color }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number; unit: string; color: string }) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>{label}</span>
        <span style={{ color, fontWeight: 'bold' }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          height: '6px',
          cursor: 'pointer'
        }}
      />
    </div>
  );
  
  return (
    <div style={{
      background: 'rgba(26, 26, 40, 0.9)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(180, 74, 255, 0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>V-Index Simulator</div>
        <div style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #00f0ff, #b44aff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {normalizedV}
        </div>
        <div style={{ color: '#666', fontSize: '0.75rem', fontFamily: 'monospace' }}>
          V = (T × M × s)^t
        </div>
      </div>
      
      <Slider label="T (신뢰)" value={T} setValue={setT} min={0} max={100} step={1} unit="%" color="#00f0ff" />
      <Slider label="M (관계)" value={M} setValue={setM} min={0} max={100} step={1} unit="%" color="#b44aff" />
      <Slider label="s (만족도)" value={s} setValue={setS} min={0} max={1} step={0.01} unit="" color="#00ff88" />
      <Slider label="t (기간)" value={t} setValue={setTime} min={1} max={36} step={1} unit="개월" color="#ffaa00" />
      
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem', 
        background: 'rgba(0,240,255,0.1)', 
        borderRadius: '8px',
        fontSize: '0.8rem',
        color: '#00f0ff'
      }}>
        💡 신뢰(T) +10% → V-Index +{((Math.pow(((T+10) * M * s), t / 100) - V) || 0).toFixed(1)} 증가 예상
      </div>
    </div>
  );
}

function RoleCard({ role, onClick, isActive }: { role: { name: string; icon: string; color: string; description: string }; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(40, 40, 55, 0.8)',
        border: isActive ? '1px solid #00f0ff' : '1px solid rgba(80, 80, 100, 0.3)',
        borderRadius: '16px',
        padding: '1.25rem',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        color: '#e0e0e0',
        width: '100%'
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{role.icon}</div>
      <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>{role.label}</div>
      <div style={{ fontSize: '0.75rem', color: '#888' }}>{role.description}</div>
      <div style={{ 
        marginTop: '0.5rem', 
        fontSize: '0.7rem', 
        color: role.color,
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <span style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: role.color,
          animation: 'pulse 2s infinite'
        }} />
        {role.status}
      </div>
    </button>
  );
}

function RadarAlertPanel({ alerts, onRefresh }: { alerts: RiskAlert[]; onRefresh: () => void }) {
  const criticalAlerts = alerts.filter(a => a.riskLevel === 'critical');
  const highAlerts = alerts.filter(a => a.riskLevel === 'high');
  
  if (alerts.length === 0) {
    return (
      <div style={{
        background: 'rgba(0, 255, 136, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
        <div style={{ color: '#00ff88', fontWeight: 'bold' }}>모든 고객 안전</div>
        <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>위험 신호 없음</div>
      </div>
    );
  }

  return (
    <div style={{
      background: criticalAlerts.length > 0 
        ? 'rgba(255, 68, 68, 0.1)' 
        : 'rgba(255, 170, 0, 0.1)',
      borderRadius: '16px',
      padding: '1.25rem',
      border: `1px solid ${criticalAlerts.length > 0 ? 'rgba(255, 68, 68, 0.4)' : 'rgba(255, 170, 0, 0.4)'}`,
      animation: criticalAlerts.length > 0 ? 'pulse-border 2s infinite' : 'none'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🚨</span>
          <span style={{ fontWeight: 'bold', color: '#fff' }}>실시간 레이더</span>
          <span style={{ 
            background: criticalAlerts.length > 0 ? '#ff4444' : '#ffaa00',
            color: '#fff',
            padding: '0.15rem 0.5rem',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            {alerts.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            color: '#888',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          🔄 스캔
        </button>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            background: 'rgba(255, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '0.75rem',
            borderLeft: '4px solid #ff4444'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                🔴 {alert.customerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#ff8888' }}>
                🌡️ {alert.temperature}° | 이탈 {(alert.churnProbability * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ 
              background: '#ff4444', 
              color: '#fff', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              CRITICAL
            </div>
          </div>
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.75rem', 
            color: '#ccc',
            background: 'rgba(0,0,0,0.2)',
            padding: '0.5rem',
            borderRadius: '6px'
          }}>
            💡 {alert.recommendedAction}
          </div>
        </div>
      ))}

      {/* High Alerts (축약) */}
      {highAlerts.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#ffaa00', marginBottom: '0.5rem' }}>
            🟠 주의 관찰 ({highAlerts.length}명)
          </div>
          {highAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.4rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.8rem'
              }}
            >
              <span style={{ color: '#ccc' }}>{alert.customerName}</span>
              <span style={{ color: '#ffaa00' }}>{alert.temperature}° ({(alert.churnProbability * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FloatingChatWidget({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: '안녕하세요! 온리쌤 크라톤입니다. 무엇을 도와드릴까요?' }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    
    const userMessage = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    
    try {
      const res = await fetch('/api/moltbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', prompt: userMessage, role: 'owner' })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.data?.response || data.message || '응답을 처리할 수 없습니다.' 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '연결 오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00f0ff, #b44aff)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)',
          fontSize: '1.5rem',
          zIndex: 1000,
          transition: 'transform 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      height: '500px',
      background: 'rgba(20, 20, 30, 0.98)',
      borderRadius: '20px',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(180, 74, 255, 0.1))',
        borderBottom: '1px solid rgba(80, 80, 100, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>크라톤 (Kraton)</div>
            <div style={{ fontSize: '0.7rem', color: '#00f0ff' }}>● 온라인</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '1.25rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      
      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #00f0ff, #0088ff)'
                : 'rgba(60, 60, 80, 0.8)',
              color: '#fff',
              fontSize: '0.85rem',
              lineHeight: '1.4'
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ 
            alignSelf: 'flex-start', 
            padding: '0.75rem 1rem',
            background: 'rgba(60, 60, 80, 0.8)',
            borderRadius: '16px',
            color: '#888'
          }}>
            입력 중...
          </div>
        )}
      </div>
      
      {/* Input */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid rgba(80, 80, 100, 0.3)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="메시지 입력..."
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: '1px solid rgba(80, 80, 100, 0.5)',
            background: 'rgba(40, 40, 55, 0.8)',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #00f0ff, #b44aff)',
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '1rem'
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [cockpit, setCockpit] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [simulatedV, setSimulatedV] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [radarAlerts, setRadarAlerts] = useState<RiskAlert[]>([]);

  // 역할별 자동화 게이지 (실시간 데이터 + Mock)
  const [automationGauges, setAutomationGauges] = useState<AutomationGauge[]>([
    { role: 'C-Level', label: 'Owner', icon: '👑', target: 90, current: 85, color: '#FFD700', tasks: { auto: 42, manual: 8 } },
    { role: 'FSD', label: 'Manager', icon: '📊', target: 80, current: 72, color: '#00f0ff', tasks: { auto: 36, manual: 14 } },
    { role: 'Optimus', label: 'Teacher', icon: '👨‍🏫', target: 70, current: 65, color: '#00ff88', tasks: { auto: 28, manual: 15 } },
    { role: 'Active', label: 'Parent', icon: '👪', target: 30, current: 25, color: '#ff8800', tasks: { auto: 12, manual: 28 } },
  ]);

  // 역할 카드 데이터
  const roles = [
    { id: 'owner', icon: '👑', label: 'Owner', description: 'C-Level Vision Director', color: '#FFD700', status: 'V-Index: 68.1' },
    { id: 'manager', icon: '📊', label: 'Manager', description: 'FSD Judgment Lead', color: '#00f0ff', status: '위험 3명 모니터링' },
    { id: 'teacher', icon: '👨‍🏫', label: 'Teacher', description: 'Optimus Executor', color: '#00ff88', status: '오늘 상담 4건' },
    { id: 'parent', icon: '👪', label: 'Parent', description: 'Payer & Supporter', color: '#ff8800', status: '앱 활성 78%' },
    { id: 'student', icon: '🎓', label: 'Student', description: 'Consumer', color: '#b44aff', status: '출석률 92%' },
  ];

  // Radar 데이터 fetch
  const fetchRadar = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/radar/monitor?org_id=${DEFAULT_ORG_ID}&notify=false`);
      const data = await res.json();
      if (data.success && data.data?.alerts) {
        setRadarAlerts(data.data.alerts);
      }
    } catch (error) {
      logger.error('Radar fetch failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  // Cockpit + Automation + Radar 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 병렬 요청
        const [cockpitRes, automationRes, radarRes] = await Promise.all([
          fetch(`/api/v1/cockpit?org_id=${DEFAULT_ORG_ID}`),
          fetch(`/api/v1/automation?org_id=${DEFAULT_ORG_ID}&period=today`),
          fetch(`/api/v1/radar/monitor?org_id=${DEFAULT_ORG_ID}&notify=false`)
        ]);
        
        const cockpitData = await cockpitRes.json();
        const automationData = await automationRes.json();
        const radarData = await radarRes.json();
        
        if (cockpitData.success) {
          setCockpit(cockpitData.data);
        }
        
        if (automationData.success && automationData.data) {
          setAutomationGauges(automationData.data.slice(0, 4));
        }
        
        if (radarData.success && radarData.data?.alerts) {
          setRadarAlerts(radarData.data.alerts);
        }
      } catch (error) {
        logger.error('Data fetch failed', { error: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // 15초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = useCallback((v: number) => {
    setSimulatedV(v);
  }, []);

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a30 50%, #0a0a12 100%)',
      color: '#e0e0e0',
      fontFamily: 'SF Pro Display, -apple-system, system-ui, sans-serif',
      padding: '2rem',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '2.5rem',
        paddingTop: '1rem'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          background: 'linear-gradient(135deg, #00f0ff, #b44aff, #ff6b6b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem',
          fontWeight: '700'
        }}>
          온리쌤
        </h1>
        <p style={{ fontSize: '1rem', color: '#888', letterSpacing: '0.1em' }}>
          Tesla Grade Business Intelligence
        </p>
        <p style={{ 
          fontSize: '0.85rem', 
          color: '#666', 
          fontFamily: 'monospace',
          marginTop: '0.5rem'
        }}>
          V = (T × M × s)^t | Build on the Rock
        </p>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Status Bar */}
        {cockpit && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'rgba(26, 26, 40, 0.6)',
            borderRadius: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>상태</div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold',
                color: cockpit.status.level === 'red' ? '#ff4444' : cockpit.status.level === 'yellow' ? '#ffaa00' : '#00ff88'
              }}>
                {cockpit.status.label}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>평균 온도</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#00f0ff' }}>
                {cockpit.internal.avgTemperature.toFixed(1)}°
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>전체 고객</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>
                {cockpit.internal.customerCount}명
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>위험</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ff4444' }}>
                {cockpit.internal.riskCount}명
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>외부 환경</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffaa00' }}>
                σ {cockpit.external.sigma.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* 0. Radar Alerts (실시간 위험 신호) */}
          <section style={{
            background: 'rgba(20, 20, 32, 0.8)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 68, 68, 0.2)',
            gridColumn: 'span 2'
          }}>
            <RadarAlertPanel alerts={radarAlerts} onRefresh={fetchRadar} />
          </section>

          {/* 1. Automation Gauges */}
          <section style={{
            background: 'rgba(20, 20, 32, 0.8)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }}>
            <h2 style={{ 
              fontSize: '1.1rem', 
              color: '#FFD700', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚡ 역할별 자동화 현황
              <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'normal' }}>실시간</span>
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {automationGauges.map((gauge) => (
                <AutomationCard key={gauge.role} gauge={gauge} />
              ))}
            </div>
          </section>

          {/* 2. V-Index Simulator */}
          <section>
            <VIndexSimulator onSimulate={handleSimulate} />
          </section>

          {/* 3. Role Cards (Cockpit Control) */}
          <section style={{
            background: 'rgba(20, 20, 32, 0.8)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            gridColumn: 'span 2'
          }}>
            <h2 style={{ 
              fontSize: '1.1rem', 
              color: '#00f0ff', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🎛️ 조종석 (Cockpit)
              <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'normal' }}>역할 클릭 시 상세 데이터</span>
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}>
              {roles.map((role) => (
                <RoleCard 
                  key={role.id} 
                  role={role} 
                  onClick={() => setActiveRole(activeRole === role.id ? null : role.id)}
                  isActive={activeRole === role.id}
                />
              ))}
            </div>
            
            {/* Active Role Details */}
            {activeRole && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'rgba(0, 240, 255, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <h3 style={{ color: '#00f0ff', marginBottom: '1rem', fontSize: '1rem' }}>
                  {roles.find(r => r.id === activeRole)?.icon} {roles.find(r => r.id === activeRole)?.label} 상세
                </h3>
                
                {activeRole === 'owner' && cockpit && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ color: '#888', fontSize: '0.75rem' }}>V-Index 추이</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00f0ff' }}>
                        {cockpit.internal.avgTemperature.toFixed(1)}
                      </div>
                      <div style={{ color: '#00ff88', fontSize: '0.75rem' }}>▲ +2.3% (7일)</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ color: '#888', fontSize: '0.75rem' }}>승인 대기</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffaa00' }}>
                        {cockpit.internal.pendingTasks}건
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ color: '#888', fontSize: '0.75rem' }}>시장 트렌드</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: cockpit.external.marketTrend >= 0 ? '#00ff88' : '#ff4444' }}>
                        {(cockpit.external.marketTrend * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}
                
                {activeRole === 'teacher' && (
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    <p>📅 오늘 상담: 김민수 학부모 14:00, 이서연 학부모 16:00</p>
                    <p style={{ marginTop: '0.5rem' }}>📝 Quick Tag 입력 대기: 3건</p>
                    <p style={{ marginTop: '0.5rem' }}>🎯 담당 학생 V-Index 평균: 72.5</p>
                  </div>
                )}
                
                {activeRole === 'student' && (
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    <p>📊 이번 주 출석률: 92%</p>
                    <p style={{ marginTop: '0.5rem' }}>📈 학습 진도: Level 3 (78% 완료)</p>
                    <p style={{ marginTop: '0.5rem' }}>🏆 획득 배지: 12개</p>
                  </div>
                )}

                {(activeRole === 'manager' || activeRole === 'parent') && (
                  <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    🚧 상세 데이터 연동 준비 중...
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer style={{ 
          marginTop: '3rem', 
          textAlign: 'center', 
          color: '#555',
          fontSize: '0.85rem'
        }}>
          <p>Edge Runtime • Supabase • Kraton AI</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <a href="https://t.me/autus_kraton_bot" target="_blank" style={{ color: '#00f0ff', textDecoration: 'none' }}>
              🤖 Telegram Bot
            </a>
            <a href="/api/health" target="_blank" style={{ color: '#888', textDecoration: 'none' }}>
              📡 API Health
            </a>
          </div>
        </footer>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChatWidget isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255, 68, 68, 0); }
        }
      `}</style>
    </main>
  );
}
