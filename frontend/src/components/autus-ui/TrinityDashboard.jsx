import React, { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// AUTUS Trinity Dashboard
// 570개 업무 실시간 K/I/Ω 물리 엔진 시각화
// =============================================================================

const API_BASE = 'http://localhost:8000';

// 색상 팔레트
const COLORS = {
  bg: {
    primary: '#0a0a0f',
    secondary: '#12121a',
    tertiary: '#1a1a24',
    card: 'rgba(20, 20, 30, 0.8)',
  },
  accent: {
    k: '#00ff88',      // K: 효율 - 녹색
    i: '#00d4ff',      // I: 상호작용 - 시안
    omega: '#ff6b35',  // Ω: 엔트로피 - 오렌지
    purple: '#8b5cf6',
    pink: '#ec4899',
  },
  status: {
    active: '#00ff88',
    optimizing: '#fbbf24',
    declining: '#f97316',
    eliminated: '#ef4444',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
  },
  glass: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.1)',
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

const formatNumber = (num, decimals = 2) => {
  if (num === undefined || num === null) return '—';
  return Number(num).toFixed(decimals);
};

const getHealthColor = (score) => {
  if (score >= 70) return COLORS.status.active;
  if (score >= 40) return COLORS.status.optimizing;
  return COLORS.status.eliminated;
};

const getStatusColor = (status) => COLORS.status[status] || COLORS.text.muted;

// =============================================================================
// 글래스모피즘 카드 컴포넌트
// =============================================================================

const GlassCard = ({ children, className = '', glow = null, onClick = null }) => (
  <div
    onClick={onClick}
    style={{
      background: COLORS.card,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '16px',
      boxShadow: glow ? `0 0 30px ${glow}30` : '0 4px 30px rgba(0,0,0,0.3)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
    }}
    className={className}
  >
    {children}
  </div>
);

// =============================================================================
// K/I/Ω 게이지 컴포넌트
// =============================================================================

const PhysicsGauge = ({ label, value, min, max, color, unit = '', icon }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <span style={{ color: COLORS.text.secondary, fontSize: '14px', fontWeight: 500 }}>
          {label}
        </span>
      </div>
      
      <div style={{ 
        fontSize: '36px', 
        fontWeight: 700, 
        color: color,
        fontFamily: 'monospace',
        marginBottom: '12px'
      }}>
        {formatNumber(value, 3)}{unit}
      </div>
      
      {/* 게이지 바 */}
      <div style={{
        height: '8px',
        background: COLORS.glass,
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: `${clampedPercentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}40, ${color})`,
          borderRadius: '4px',
          transition: 'width 0.5s ease',
          boxShadow: `0 0 10px ${color}50`
        }} />
      </div>
      
      {/* 범위 표시 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: '6px',
        fontSize: '11px',
        color: COLORS.text.muted
      }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

// =============================================================================
// 원형 진행률 컴포넌트
// =============================================================================

const CircularProgress = ({ value, size = 120, strokeWidth = 8, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* 배경 원 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={COLORS.glass}
        strokeWidth={strokeWidth}
      />
      {/* 진행 원 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ 
          transition: 'stroke-dashoffset 0.5s ease',
          filter: `drop-shadow(0 0 6px ${color})`
        }}
      />
    </svg>
  );
};

// =============================================================================
// 건강 점수 카드
// =============================================================================

const HealthScoreCard = ({ score, status }) => {
  const color = getHealthColor(score);
  
  return (
    <GlassCard glow={color} style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <CircularProgress value={score} size={140} strokeWidth={10} color={color} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(0deg)',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: color,
            fontFamily: 'monospace'
          }}>
            {Math.round(score)}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.text.muted }}>HEALTH</div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '16px',
        padding: '8px 16px',
        background: `${color}20`,
        borderRadius: '20px',
        display: 'inline-block'
      }}>
        <span style={{ 
          color: color, 
          fontWeight: 600,
          fontSize: '13px',
          textTransform: 'uppercase'
        }}>
          {status || 'Active'}
        </span>
      </div>
    </GlassCard>
  );
};

// =============================================================================
// 업무 카드 컴포넌트
// =============================================================================

const TaskCard = ({ task, onClick }) => {
  const metrics = task.metrics || {};
  const health = useMemo(() => {
    const k = metrics.k_efficiency || 1;
    const i = metrics.i_interaction || 0;
    const omega = metrics.omega_entropy || 0.5;
    return Math.min(k / 2, 1) * 40 + (i + 1) / 2 * 30 + (1 - omega) * 30;
  }, [metrics]);
  
  const statusColor = getStatusColor(metrics.status);
  
  return (
    <GlassCard onClick={onClick} style={{ padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '11px', 
            color: COLORS.text.muted,
            marginBottom: '4px'
          }}>
            {task.task_id}
          </div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: COLORS.text.primary,
            marginBottom: '8px'
          }}>
            {task.task_name}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: COLORS.text.secondary 
          }}>
            {task.group}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700,
            color: getHealthColor(health),
            fontFamily: 'monospace'
          }}>
            {Math.round(health)}
          </div>
          <div style={{
            fontSize: '10px',
            padding: '3px 8px',
            background: `${statusColor}20`,
            color: statusColor,
            borderRadius: '10px',
            marginTop: '4px'
          }}>
            {metrics.status || 'active'}
          </div>
        </div>
      </div>
      
      {/* 미니 메트릭 바 */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: `1px solid ${COLORS.border}`
      }}>
        <MiniMetric label="K" value={metrics.k_efficiency} color={COLORS.accent.k} />
        <MiniMetric label="I" value={metrics.i_interaction} color={COLORS.accent.i} />
        <MiniMetric label="Ω" value={metrics.omega_entropy} color={COLORS.accent.omega} />
      </div>
    </GlassCard>
  );
};

const MiniMetric = ({ label, value, color }) => (
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: '10px', color: COLORS.text.muted, marginBottom: '2px' }}>
      {label}
    </div>
    <div style={{ 
      fontSize: '14px', 
      fontWeight: 600, 
      color: color,
      fontFamily: 'monospace'
    }}>
      {formatNumber(value, 2)}
    </div>
  </div>
);

// =============================================================================
// 그룹별 분포 차트
// =============================================================================

const GroupDistribution = ({ data }) => {
  const groups = Object.entries(data || {});
  const maxCount = Math.max(...groups.map(([, v]) => v), 1);
  
  const groupColors = {
    '고반복_정형': COLORS.accent.k,
    '반구조화_문서': COLORS.accent.i,
    '승인_워크플로': COLORS.accent.omega,
    '고객_영업': COLORS.accent.purple,
    '재무_회계': '#22d3ee',
    'HR_인사': COLORS.accent.pink,
    'IT_운영': '#a78bfa',
    '전략_판단': '#f472b6',
  };
  
  return (
    <GlassCard style={{ padding: '20px' }}>
      <h3 style={{ 
        color: COLORS.text.primary, 
        fontSize: '14px', 
        fontWeight: 600,
        marginBottom: '16px' 
      }}>
        그룹별 업무 분포
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {groups.map(([group, count]) => (
          <div key={group}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '12px'
            }}>
              <span style={{ color: COLORS.text.secondary }}>{group}</span>
              <span style={{ color: groupColors[group] || COLORS.text.primary, fontWeight: 600 }}>
                {count}
              </span>
            </div>
            <div style={{
              height: '6px',
              background: COLORS.glass,
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(count / maxCount) * 100}%`,
                height: '100%',
                background: groupColors[group] || COLORS.accent.purple,
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// =============================================================================
// 상태 분포 도넛 차트
// =============================================================================

const StatusDonut = ({ data }) => {
  const total = Object.values(data || {}).reduce((a, b) => a + b, 0) || 1;
  const entries = Object.entries(data || {});
  
  let currentAngle = 0;
  
  return (
    <GlassCard style={{ padding: '20px' }}>
      <h3 style={{ 
        color: COLORS.text.primary, 
        fontSize: '14px', 
        fontWeight: 600,
        marginBottom: '16px' 
      }}>
        상태별 분포
      </h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {entries.map(([status, count]) => {
            const percentage = count / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
            const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            return (
              <path
                key={status}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={getStatusColor(status)}
                opacity={0.8}
              />
            );
          })}
          <circle cx="50" cy="50" r="25" fill={COLORS.bg.secondary} />
          <text x="50" y="50" textAnchor="middle" dy="5" fill={COLORS.text.primary} fontSize="14" fontWeight="bold">
            {total}
          </text>
        </svg>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map(([status, count]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: getStatusColor(status)
              }} />
              <span style={{ fontSize: '12px', color: COLORS.text.secondary }}>
                {status}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

// =============================================================================
// 실시간 알림 컴포넌트
// =============================================================================

const AlertsPanel = ({ alerts }) => (
  <GlassCard style={{ padding: '20px', maxHeight: '300px', overflow: 'auto' }}>
    <h3 style={{ 
      color: COLORS.text.primary, 
      fontSize: '14px', 
      fontWeight: 600,
      marginBottom: '16px' 
    }}>
      🔔 실시간 알림
    </h3>
    
    {(alerts || []).length === 0 ? (
      <div style={{ color: COLORS.text.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
        알림 없음
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alert, idx) => (
          <div key={idx} style={{
            padding: '10px 12px',
            background: `${COLORS.status.declining}15`,
            borderLeft: `3px solid ${COLORS.status.declining}`,
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '12px', color: COLORS.text.primary, marginBottom: '4px' }}>
              {alert.message}
            </div>
            <div style={{ fontSize: '10px', color: COLORS.text.muted }}>
              {alert.task_id} • {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    )}
  </GlassCard>
);

// =============================================================================
// 최근 실행 컴포넌트
// =============================================================================

const RecentExecutions = ({ executions }) => (
  <GlassCard style={{ padding: '20px' }}>
    <h3 style={{ 
      color: COLORS.text.primary, 
      fontSize: '14px', 
      fontWeight: 600,
      marginBottom: '16px' 
    }}>
      ⚡ 최근 실행
    </h3>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(executions || []).map((exec, idx) => (
        <div key={idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px',
          background: COLORS.glass,
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: COLORS.text.primary }}>
              {exec.task_id}
            </div>
            <div style={{ fontSize: '10px', color: COLORS.text.muted }}>
              {exec.execution_id?.slice(0, 8)}
            </div>
          </div>
          <div style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: exec.success ? `${COLORS.status.active}20` : `${COLORS.status.eliminated}20`,
            color: exec.success ? COLORS.status.active : COLORS.status.eliminated
          }}>
            {exec.success ? '성공' : '실패'}
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

// =============================================================================
// 메인 대시보드 컴포넌트
// =============================================================================

export default function TrinityDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const [dashRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/tasks?limit=100`)
      ]);
      
      if (!dashRes.ok || !tasksRes.ok) throw new Error('API Error');
      
      const dashData = await dashRes.json();
      const tasksData = await tasksRes.json();
      
      setDashboard(dashData);
      setTasks(tasksData.tasks || []);
      setError(null);
    } catch (err) {
      setError('데이터 로드 실패. API 서버를 확인하세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // SSE 연결
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/dashboard/realtime`);
    
    eventSource.onopen = () => setSseConnected(true);
    eventSource.onerror = () => setSseConnected(false);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.event === 'metrics_updated') {
        // 메트릭 업데이트 시 해당 태스크 갱신
        setTasks(prev => prev.map(t => 
          t.task_id === data.data.task_id 
            ? { ...t, metrics: data.data.metrics }
            : t
        ));
      } else if (data.event === 'task_executed') {
        // 실행 완료 시 대시보드 새로고침
        loadData();
      }
    };
    
    return () => eventSource.close();
  }, [loadData]);
  
  // 초기 로드
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [loadData]);
  
  // 평균 메트릭
  const avgMetrics = dashboard?.avg_metrics || { k: 1, i: 0, omega: 0.5 };
  const healthScore = useMemo(() => {
    const k = avgMetrics.k || 1;
    const i = avgMetrics.i || 0;
    const omega = avgMetrics.omega || 0.5;
    return Math.min(k / 2, 1) * 40 + (i + 1) / 2 * 30 + (1 - omega) * 30;
  }, [avgMetrics]);
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bg.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: COLORS.accent.k, fontSize: '18px' }}>
          ⚡ AUTUS Loading...
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${COLORS.bg.primary} 0%, ${COLORS.bg.secondary} 100%)`,
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ 
            color: COLORS.text.primary, 
            fontSize: '28px', 
            fontWeight: 700,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            ⚡ AUTUS Trinity Dashboard
          </h1>
          <p style={{ color: COLORS.text.muted, fontSize: '14px', margin: '4px 0 0 0' }}>
            570개 업무 물리 엔진 실시간 모니터링
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: sseConnected ? `${COLORS.status.active}20` : `${COLORS.status.eliminated}20`,
            borderRadius: '20px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: sseConnected ? COLORS.status.active : COLORS.status.eliminated,
              animation: sseConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ 
              fontSize: '12px', 
              color: sseConnected ? COLORS.status.active : COLORS.status.eliminated 
            }}>
              {sseConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <button
            onClick={loadData}
            style={{
              padding: '8px 16px',
              background: `${COLORS.accent.purple}30`,
              border: `1px solid ${COLORS.accent.purple}`,
              borderRadius: '8px',
              color: COLORS.accent.purple,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            🔄 새로고침
          </button>
        </div>
      </div>
      
      {error && (
        <div style={{
          padding: '12px 16px',
          background: `${COLORS.status.eliminated}20`,
          border: `1px solid ${COLORS.status.eliminated}`,
          borderRadius: '8px',
          color: COLORS.status.eliminated,
          marginBottom: '24px'
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {/* 메인 그리드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr 300px',
        gap: '20px'
      }}>
        {/* K 게이지 */}
        <GlassCard glow={COLORS.accent.k}>
          <PhysicsGauge 
            label="K (효율)"
            value={avgMetrics.k}
            min={0}
            max={2}
            color={COLORS.accent.k}
            icon="⚡"
          />
        </GlassCard>
        
        {/* I 게이지 */}
        <GlassCard glow={COLORS.accent.i}>
          <PhysicsGauge 
            label="I (상호작용)"
            value={avgMetrics.i}
            min={-1}
            max={1}
            color={COLORS.accent.i}
            icon="🔄"
          />
        </GlassCard>
        
        {/* Ω 게이지 */}
        <GlassCard glow={COLORS.accent.omega}>
          <PhysicsGauge 
            label="Ω (엔트로피)"
            value={avgMetrics.omega}
            min={0}
            max={1}
            color={COLORS.accent.omega}
            icon="🌀"
          />
        </GlassCard>
        
        {/* 건강 점수 */}
        <HealthScoreCard score={healthScore} status="System Health" />
      </div>
      
      {/* 통계 행 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '20px',
        marginTop: '20px'
      }}>
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.accent.purple }}>
            {dashboard?.total_tasks || 0}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text.muted }}>전체 업무</div>
        </GlassCard>
        
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.status.active }}>
            {dashboard?.by_status?.active || 0}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text.muted }}>활성 업무</div>
        </GlassCard>
        
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.status.declining }}>
            {dashboard?.by_status?.declining || 0}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text.muted }}>감소 중</div>
        </GlassCard>
        
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.status.eliminated }}>
            {dashboard?.health_distribution?.critical || 0}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text.muted }}>위험 업무</div>
        </GlassCard>
      </div>
      
      {/* 하단 그리드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 350px',
        gap: '20px',
        marginTop: '20px'
      }}>
        {/* 그룹별 분포 */}
        <GroupDistribution data={dashboard?.by_group} />
        
        {/* 상태별 분포 */}
        <StatusDonut data={dashboard?.by_status} />
        
        {/* 알림 패널 */}
        <AlertsPanel alerts={dashboard?.alerts} />
      </div>
      
      {/* 업무 목록 */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ color: COLORS.text.primary, fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          📋 업무 현황 ({tasks.length}개)
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px'
        }}>
          {tasks.slice(0, 12).map(task => (
            <TaskCard 
              key={task.task_id} 
              task={task} 
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      </div>
      
      {/* 최근 실행 */}
      <div style={{ marginTop: '20px' }}>
        <RecentExecutions executions={dashboard?.recent_executions} />
      </div>
      
      {/* 스타일 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: ${COLORS.glass};
        }
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.border};
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
