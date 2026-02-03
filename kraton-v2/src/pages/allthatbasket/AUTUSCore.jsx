import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS CORE ENGINE
 *
 * Amazon + Tesla FSD + Palantir 본질 통합
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ AMAZON                                                                       │
 * │ • Customer Log → Process 자동 생성 (모든 것은 고객 로그에서 시작)            │
 * │ • Working Backwards: 결과(OutcomeFact)에서 역으로 프로세스 설계              │
 * │ • Kill Culture: 안 되는 건 빨리 죽인다 (Kill Switch)                         │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ TESLA FSD                                                                    │
 * │ • Shadow Mode: 바로 실행 안 함, 관찰하고 기록만                              │
 * │ • Confidence Accumulation: 신뢰도 누적                                       │
 * │ • Promotion: 임계값 도달 시 자동화 승격                                      │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ PALANTIR                                                                     │
 * │ • Ontology: 객체 관계 그래프                                                 │
 * │ • State Machine: 계약 상태 전이                                              │
 * │ • Decision Cards: 의사결정 카드                                              │
 * │ • Blast Radius: 영향 범위 시각화                                             │
 * │ • Immutable Logs: 불변 감사 로그                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AMAZON: Customer Logs → Process Generation
// ═══════════════════════════════════════════════════════════════════════════════

const CUSTOMER_LOGS = {
  browse: { icon: '👁️', label: '탐색', color: '#3B82F6' },
  purchase: { icon: '💳', label: '구매', color: '#10B981' },
  feedback: { icon: '💬', label: '피드백', color: '#F59E0B' },
  inquiry: { icon: '❓', label: '문의', color: '#8B5CF6' },
  usage: { icon: '📊', label: '이용', color: '#06B6D4' },
  churn: { icon: '🚪', label: '이탈', color: '#EF4444' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TESLA FSD: Shadow → Promotion Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

const POLICY_MODES = {
  shadow: {
    label: '섀도우',
    color: '#6B7280',
    icon: '👁️',
    desc: '관찰만, 실행 안 함',
  },
  candidate: {
    label: '후보',
    color: '#F59E0B',
    icon: '🎯',
    desc: '신뢰도 축적 중',
  },
  promoted: {
    label: '승격',
    color: '#10B981',
    icon: '✅',
    desc: '자동 실행',
  },
  killed: {
    label: '폐기',
    color: '#EF4444',
    icon: '💀',
    desc: 'Kill Switch 발동',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PALANTIR: State Machine
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_MACHINE = {
  S0: { name: '대기', color: '#6B7280', next: ['S1'], x: 50, y: 50 },
  S1: { name: '접수', color: '#3B82F6', next: ['S2'], x: 150, y: 50 },
  S2: { name: '적격', color: '#8B5CF6', next: ['S3', 'S4'], x: 250, y: 50 },
  S3: { name: '승인', color: '#F59E0B', next: ['S4', 'S1'], x: 350, y: 20 },
  S4: { name: '개입', color: '#EF4444', next: ['S5'], x: 350, y: 80 },
  S5: { name: '모니터', color: '#10B981', next: ['S6', 'S7'], x: 450, y: 50 },
  S6: { name: '안정', color: '#06B6D4', next: ['S0', 'S1'], x: 550, y: 20 },
  S7: { name: '섀도우', color: '#EC4899', next: ['S5'], x: 550, y: 80 },
  S9: { name: '종료', color: '#64748B', next: [], x: 650, y: 50 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSCore() {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('amazon');
  const [logs, setLogs] = useState([]);
  const [policies, setPolicies] = useState([
    { id: 'POL001', name: '출석급락 → 강사교체', trigger: 'attendance.drop', mode: 'shadow', confidence: 0.45, observations: 23 },
    { id: 'POL002', name: '갱신실패 → 할인제안', trigger: 'renewal.failed', mode: 'shadow', confidence: 0.72, observations: 45 },
    { id: 'POL003', name: '알림무시 → 채널변경', trigger: 'notification.ignored', mode: 'candidate', confidence: 0.88, observations: 67 },
    { id: 'POL004', name: '장기결석 → 학부모연락', trigger: 'absence.prolonged', mode: 'promoted', confidence: 0.95, observations: 120 },
    { id: 'POL005', name: '불만접수 → 즉시보상', trigger: 'complaint.received', mode: 'killed', confidence: 0.23, observations: 15 },
  ]);
  const [contractState, setContractState] = useState('S0');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [blastRadius, setBlastRadius] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Amazon: Log Simulation
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const logTypes = Object.keys(CUSTOMER_LOGS);
      const type = logTypes[Math.floor(Math.random() * logTypes.length)];
      const newLog = {
        id: Date.now(),
        type,
        ts: new Date().toLocaleTimeString(),
        customerId: `C${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        generatedProcess: getGeneratedProcess(type),
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getGeneratedProcess = (logType) => {
    const processes = {
      browse: ['추천 알고리즘', '검색 최적화', '콘텐츠 배치'],
      purchase: ['결제 처리', '영수증 발송', '포인트 적립'],
      feedback: ['감정 분석', '개선점 추출', '담당자 알림'],
      inquiry: ['자동 분류', '담당자 배정', '응답 생성'],
      usage: ['사용 패턴 분석', '이상 탐지', '개인화'],
      churn: ['이탈 예측', '방어 정책', '윈백 캠페인'],
    };
    return processes[logType][Math.floor(Math.random() * 3)];
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Tesla: Shadow → Promotion
  // ─────────────────────────────────────────────────────────────────────────────
  const promotePolicy = useCallback((policyId) => {
    setPolicies(prev => prev.map(p => {
      if (p.id === policyId) {
        if (p.mode === 'shadow' && p.confidence >= 0.7) {
          return { ...p, mode: 'candidate' };
        } else if (p.mode === 'candidate' && p.confidence >= 0.9) {
          return { ...p, mode: 'promoted' };
        }
      }
      return p;
    }));
    addLog('POLICY_PROMOTED', policyId);
  }, []);

  const killPolicy = useCallback((policyId) => {
    setPolicies(prev => prev.map(p =>
      p.id === policyId ? { ...p, mode: 'killed' } : p
    ));
    addLog('POLICY_KILLED', policyId);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Palantir: State Transition & Blast Radius
  // ─────────────────────────────────────────────────────────────────────────────
  const transitionState = useCallback((newState) => {
    const current = STATE_MACHINE[contractState];
    if (current.next.includes(newState)) {
      // Calculate blast radius
      const radius = {
        from: contractState,
        to: newState,
        affectedContracts: Math.floor(Math.random() * 20) + 5,
        affectedCustomers: Math.floor(Math.random() * 15) + 3,
        revenueImpact: (Math.random() * 500000 - 250000).toFixed(0),
        policies: policies.filter(p => p.mode === 'promoted').length,
      };
      setBlastRadius(radius);
    }
  }, [contractState, policies]);

  const confirmTransition = useCallback(() => {
    if (blastRadius) {
      setContractState(blastRadius.to);
      addLog('STATE_TRANSITION', `${blastRadius.from} → ${blastRadius.to}`);
      setBlastRadius(null);
    }
  }, [blastRadius]);

  const addLog = (action, detail) => {
    const logEntry = {
      id: Date.now(),
      ts: new Date().toISOString(),
      action,
      detail,
      actor: 'owner',
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 100));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      color: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #F97316, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>AUTUS Core Engine</h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Amazon + Tesla FSD + Palantir</p>
          </div>
        </div>

        {/* Current State Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 20,
          background: STATE_MACHINE[contractState].color + '30',
          border: `2px solid ${STATE_MACHINE[contractState].color}`,
        }}>
          <span style={{ color: STATE_MACHINE[contractState].color, fontWeight: 600 }}>
            {contractState}
          </span>
          <span style={{ opacity: 0.7 }}>{STATE_MACHINE[contractState].name}</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        display: 'flex', gap: 4, padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {[
          { id: 'amazon', label: 'Amazon', icon: '📦', desc: 'Customer Logs → Process' },
          { id: 'tesla', label: 'Tesla FSD', icon: '🚗', desc: 'Shadow → Promotion' },
          { id: 'palantir', label: 'Palantir', icon: '🔮', desc: 'Decision OS + Blast Radius' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              background: activeTab === tab.id ? 'rgba(249,115,22,0.2)' : 'transparent',
              border: activeTab === tab.id ? '2px solid #F97316' : '2px solid transparent',
              color: activeTab === tab.id ? '#F97316' : '#94A3B8',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 24 }}>{tab.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{tab.label}</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{tab.desc}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ padding: 24 }}>
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* AMAZON TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'amazon' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #FF9900 0%, #FF6600 100%)',
              borderRadius: 16, padding: 20, marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  📦 Amazon: Customer Obsession
                </h2>
                <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                  모든 프로세스는 고객 로그에서 시작된다
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{logs.length}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>실시간 로그</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Log Types */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.6 }}>
                  고객 로그 유형 → 생성되는 프로세스
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {Object.entries(CUSTOMER_LOGS).map(([key, log]) => (
                    <div key={key} style={{
                      padding: 16, borderRadius: 12,
                      background: log.color + '15',
                      border: `1px solid ${log.color}40`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{log.icon}</span>
                        <span style={{ fontWeight: 600, color: log.color }}>{log.label}</span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        → {getGeneratedProcess(key)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Log Stream */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                maxHeight: 400, overflow: 'auto',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 16,
                }}>
                  <h3 style={{ margin: 0, fontSize: 14, opacity: 0.6 }}>실시간 로그 스트림</h3>
                  <span style={{
                    padding: '4px 8px', borderRadius: 10,
                    background: '#10B981', fontSize: 10, fontWeight: 600,
                    animation: 'pulse 2s infinite',
                  }}>● LIVE</span>
                </div>
                {logs.slice(0, 15).map(log => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', marginBottom: 8, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: 12,
                  }}>
                    <span>{CUSTOMER_LOGS[log.type]?.icon || '📋'}</span>
                    <span style={{ opacity: 0.5, fontFamily: 'monospace' }}>{log.ts}</span>
                    <span style={{ color: CUSTOMER_LOGS[log.type]?.color }}>
                      {CUSTOMER_LOGS[log.type]?.label}
                    </span>
                    <span style={{ opacity: 0.5 }}>→</span>
                    <span style={{ color: '#10B981' }}>{log.generatedProcess}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TESLA FSD TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tesla' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #1E1E1E 0%, #2D2D2D 100%)',
              borderRadius: 16, padding: 20, marginBottom: 24,
              border: '1px solid #E31937',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  🚗 Tesla FSD: Shadow Learning
                </h2>
                <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                  바로 실행하지 않는다. 관찰하고, 신뢰를 쌓고, 승격한다.
                </p>
              </div>
            </div>

            {/* Policy Pipeline */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 24, padding: 16,
              background: 'rgba(255,255,255,0.03)', borderRadius: 12,
            }}>
              {Object.entries(POLICY_MODES).map(([mode, info], i) => (
                <React.Fragment key={mode}>
                  <div style={{
                    flex: 1, padding: 16, borderRadius: 12, textAlign: 'center',
                    background: info.color + '20',
                    border: `2px solid ${info.color}`,
                  }}>
                    <div style={{ fontSize: 24 }}>{info.icon}</div>
                    <div style={{ fontWeight: 600, color: info.color, marginTop: 8 }}>{info.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{info.desc}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                      {policies.filter(p => p.mode === mode).length}
                    </div>
                  </div>
                  {i < 3 && <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, opacity: 0.3 }}>→</div>}
                </React.Fragment>
              ))}
            </div>

            {/* Policies */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, padding: 20,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.6 }}>정책 파이프라인</h3>
              {policies.map(policy => {
                const modeInfo = POLICY_MODES[policy.mode];
                const canPromote = (policy.mode === 'shadow' && policy.confidence >= 0.7) ||
                                   (policy.mode === 'candidate' && policy.confidence >= 0.9);
                const canKill = policy.mode !== 'killed' && policy.mode !== 'promoted';

                return (
                  <div key={policy.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: 16, marginBottom: 12, borderRadius: 12,
                    background: modeInfo.color + '10',
                    border: `1px solid ${modeInfo.color}40`,
                  }}>
                    {/* Mode Badge */}
                    <div style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: modeInfo.color + '30',
                      color: modeInfo.color, fontWeight: 600, fontSize: 12,
                      minWidth: 80, textAlign: 'center',
                    }}>
                      {modeInfo.icon} {modeInfo.label}
                    </div>

                    {/* Policy Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{policy.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                        트리거: {policy.trigger}
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div style={{ width: 120 }}>
                      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
                        신뢰도: {(policy.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{
                        height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${policy.confidence * 100}%`,
                          height: '100%',
                          background: policy.confidence >= 0.9 ? '#10B981' :
                                     policy.confidence >= 0.7 ? '#F59E0B' : '#6B7280',
                          borderRadius: 3,
                        }} />
                      </div>
                    </div>

                    {/* Observations */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{policy.observations}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>관찰</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {canPromote && (
                        <button
                          onClick={() => promotePolicy(policy.id)}
                          style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: '#10B981', border: 'none',
                            color: 'white', fontWeight: 600, fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          ⬆️ 승격
                        </button>
                      )}
                      {canKill && (
                        <button
                          onClick={() => killPolicy(policy.id)}
                          style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: '#EF4444', border: 'none',
                            color: 'white', fontWeight: 600, fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          💀 Kill
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Threshold Explanation */}
            <div style={{
              marginTop: 24, padding: 16, borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.1)',
              fontSize: 13, opacity: 0.7,
            }}>
              <strong>승격 임계값:</strong> Shadow → Candidate (신뢰도 ≥70%) → Promoted (신뢰도 ≥90%, 관찰 ≥50회)
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PALANTIR TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'palantir' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
              borderRadius: 16, padding: 20, marginBottom: 24,
              border: '1px solid #0F3460',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  🔮 Palantir: Decision OS
                </h2>
                <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                  상태 전이 + 영향 범위(Blast Radius) 시각화
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* State Machine Visualization */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.6 }}>
                  Contract State Machine
                </h3>
                <svg viewBox="0 0 700 120" style={{ width: '100%', height: 180 }}>
                  {/* Connections */}
                  {Object.entries(STATE_MACHINE).map(([fromKey, from]) =>
                    from.next.map(toKey => {
                      const to = STATE_MACHINE[toKey];
                      if (!to) return null;
                      return (
                        <line
                          key={`${fromKey}-${toKey}`}
                          x1={from.x + 30} y1={from.y}
                          x2={to.x - 30} y2={to.y}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="2"
                          markerEnd="url(#arrow)"
                        />
                      );
                    })
                  )}
                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.3)" />
                    </marker>
                  </defs>

                  {/* State Nodes */}
                  {Object.entries(STATE_MACHINE).map(([key, state]) => (
                    <g key={key} style={{ cursor: 'pointer' }} onClick={() => transitionState(key)}>
                      <circle
                        cx={state.x} cy={state.y} r="25"
                        fill={contractState === key ? state.color : state.color + '40'}
                        stroke={state.color}
                        strokeWidth={contractState === key ? 4 : 2}
                      />
                      <text
                        x={state.x} y={state.y - 5}
                        textAnchor="middle" fill="white" fontSize="12" fontWeight="bold"
                      >{key}</text>
                      <text
                        x={state.x} y={state.y + 10}
                        textAnchor="middle" fill="white" fontSize="9" opacity="0.8"
                      >{state.name}</text>
                    </g>
                  ))}
                </svg>

                <div style={{
                  marginTop: 16, padding: 12, borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: 12, opacity: 0.6,
                }}>
                  클릭하여 상태 전이 시도 → Blast Radius 계산 → 확인 후 전이
                </div>
              </div>

              {/* Blast Radius Modal */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.6 }}>
                  💥 Blast Radius
                </h3>

                {blastRadius ? (
                  <div>
                    <div style={{
                      padding: 16, borderRadius: 12, marginBottom: 16,
                      background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                        {blastRadius.from} → {blastRadius.to}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        상태 전이 영향 분석
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>
                          {blastRadius.affectedContracts}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>영향 계약</div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(245,158,11,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
                          {blastRadius.affectedCustomers}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>영향 고객</div>
                      </div>
                    </div>

                    <div style={{
                      padding: 12, borderRadius: 8, marginBottom: 16,
                      background: Number(blastRadius.revenueImpact) >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 20, fontWeight: 700,
                        color: Number(blastRadius.revenueImpact) >= 0 ? '#10B981' : '#EF4444',
                      }}>
                        {Number(blastRadius.revenueImpact) >= 0 ? '+' : ''}{Number(blastRadius.revenueImpact).toLocaleString()}원
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>예상 매출 영향</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={confirmTransition}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 8,
                          background: '#10B981', border: 'none',
                          color: 'white', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✅ 전이 확정
                      </button>
                      <button
                        onClick={() => setBlastRadius(null)}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.1)', border: 'none',
                          color: 'white', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ❌ 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: 40, textAlign: 'center', opacity: 0.4,
                    border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💥</div>
                    <div>상태 노드를 클릭하면<br/>영향 범위가 표시됩니다</div>
                  </div>
                )}
              </div>
            </div>

            {/* Immutable Log */}
            <div style={{
              marginTop: 24,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, padding: 20,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.6 }}>
                📜 Immutable Decision Log (Append-Only)
              </h3>
              <div style={{
                fontFamily: 'monospace', fontSize: 11,
                background: '#0D1117', borderRadius: 8, padding: 12,
                maxHeight: 150, overflow: 'auto',
              }}>
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} style={{ marginBottom: 4 }}>
                    <span style={{ color: '#6B7280' }}>[{typeof log.ts === 'string' && log.ts.includes('T') ? log.ts.split('T')[1].split('.')[0] : log.ts}]</span>
                    {' '}
                    <span style={{ color: '#F59E0B' }}>{log.action || log.type}</span>
                    {' '}
                    <span style={{ color: '#10B981' }}>{log.detail || log.generatedProcess}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
