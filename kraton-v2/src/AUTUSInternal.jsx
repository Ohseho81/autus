/**
 * 🔒 AUTUS Internal Dashboard
 *
 * 내부 전용 - 고객 노출 금지
 *
 * 표시 항목:
 * 1. OutcomeFact Ledger (실시간 기록)
 * 2. VV Dashboard (Velocity 현황)
 * 3. Shadow Queue (요청 대기열)
 * 4. Closed Loop Status (닫힌 순환 상태)
 */

import React, { useState, useEffect, useMemo } from 'react';

// ============================================
// Mock Data & Constants (실제로는 autus-core에서 import)
// ============================================

const OUTCOME_WEIGHTS = {
  'renewal.succeeded': +1.0,
  'renewal.failed': -1.0,
  'attendance.normal': +0.3,
  'attendance.drop': -0.5,
  'notification.read': +0.2,
  'notification.ignored': -0.3,
  'churn.finalized': -2.0,
  'teacher.changed': 0,
};

const OUTCOME_TIERS = {
  'renewal.failed': 'S',
  'attendance.drop': 'S',
  'notification.ignored': 'S',
  'renewal.succeeded': 'A',
  'attendance.normal': 'A',
  'notification.read': 'A',
  'churn.finalized': 'TERMINAL',
  'teacher.changed': 'TERMINAL',
};

const SHADOW_CATEGORIES = {
  'makeup.requested': { label: '보강 요청', rate: 70, authority: 'admin' },
  'schedule.change': { label: '시간 변경', rate: 50, authority: 'admin' },
  'teacher.change.requested': { label: '강사 변경', rate: 30, authority: 'owner' },
  'discount.requested': { label: '할인 요청', rate: 15, authority: 'owner' },
  'complaint': { label: '불만 기반', rate: 5, authority: 'owner' },
};

const CLOSED_LOOPS = [
  { id: 'attendance', name: '출석 순환', icon: '📅' },
  { id: 'recovery', name: '결석 복귀 순환', icon: '🔄' },
  { id: 'notification', name: '알림 반응 순환', icon: '🔔' },
  { id: 'renewal', name: '재등록 순환', icon: '💳' },
];

// ============================================
// Initial State
// ============================================

const generateInitialFacts = () => [
  { id: 1, type: 'renewal.succeeded', consumer: 'P001', subject: 'S001', time: '09:15', processed: true },
  { id: 2, type: 'attendance.normal', consumer: 'P002', subject: 'S002', time: '10:30', processed: true },
  { id: 3, type: 'attendance.drop', consumer: 'P003', subject: 'S003', time: '11:00', processed: false },
  { id: 4, type: 'notification.ignored', consumer: 'P004', subject: 'S004', time: '14:20', processed: false },
  { id: 5, type: 'renewal.failed', consumer: 'P005', subject: 'S005', time: '15:45', processed: false },
];

const generateInitialShadows = () => [
  { id: 1, category: 'makeup.requested', consumer: 'P006', status: 'pending', created: '어제' },
  { id: 2, category: 'discount.requested', consumer: 'P007', status: 'pending', created: '2일 전' },
  { id: 3, category: 'teacher.change.requested', consumer: 'P008', status: 'approved', created: '3일 전' },
  { id: 4, category: 'makeup.requested', consumer: 'P009', status: 'rejected', created: '5일 전' },
];

const generateInitialLoops = () => ({
  attendance: { open: 45, closed: 120, timeout: 0 },
  recovery: { open: 8, closed: 32, timeout: 2 },
  notification: { open: 12, closed: 89, timeout: 5 },
  renewal: { open: 3, closed: 47, timeout: 1 },
});

// ============================================
// Main Component
// ============================================

export default function AUTUSInternal() {
  const [activeTab, setActiveTab] = useState('ledger');
  const [facts, setFacts] = useState(generateInitialFacts);
  const [shadows, setShadows] = useState(generateInitialShadows);
  const [loops, setLoops] = useState(generateInitialLoops);
  const [showAddFact, setShowAddFact] = useState(false);

  // VV 계산
  const vvData = useMemo(() => {
    const recentFacts = facts.slice(-10);
    let weightedSum = 0;
    recentFacts.forEach(f => {
      weightedSum += OUTCOME_WEIGHTS[f.type] || 0;
    });
    const vv = weightedSum / (recentFacts.length || 1);

    let status = 'yellow';
    if (vv >= 0.5) status = 'green';
    else if (vv < -0.2) status = 'red';

    return { value: vv.toFixed(2), status, weightedSum };
  }, [facts]);

  // 자동 이벤트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      const types = Object.keys(OUTCOME_WEIGHTS);
      const randomType = types[Math.floor(Math.random() * types.length)];
      const newFact = {
        id: Date.now(),
        type: randomType,
        consumer: `P${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        subject: `S${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        processed: false,
      };
      setFacts(prev => [...prev.slice(-19), newFact]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fact 처리
  const processFact = (factId) => {
    setFacts(prev => prev.map(f =>
      f.id === factId ? { ...f, processed: true } : f
    ));
  };

  // Shadow 결정
  const decideShadow = (shadowId, decision) => {
    setShadows(prev => prev.map(s =>
      s.id === shadowId ? { ...s, status: decision } : s
    ));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🔒</span>
          <div>
            <h1 style={styles.title}>AUTUS Internal</h1>
            <p style={styles.subtitle}>Brand OS Factory - 내부 전용</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{
            ...styles.vvBadge,
            backgroundColor: vvData.status === 'green' ? '#10B981' :
                            vvData.status === 'red' ? '#EF4444' : '#F59E0B'
          }}>
            VV: {vvData.value}
          </div>
          <button
            onClick={() => window.location.hash = '#hub'}
            style={styles.backButton}
          >
            ← Hub
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={styles.tabs}>
        {[
          { key: 'ledger', label: 'Fact Ledger', icon: '📋' },
          { key: 'velocity', label: 'Velocity', icon: '⚡' },
          { key: 'shadow', label: 'Shadow Queue', icon: '👤' },
          { key: 'loops', label: 'Closed Loops', icon: '🔄' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === tab.key ? '#1F2937' : 'transparent',
              color: activeTab === tab.key ? '#10B981' : '#9CA3AF',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {/* Fact Ledger Tab */}
        {activeTab === 'ledger' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📋 OutcomeFact Ledger</h2>
              <span style={styles.badge}>Append-only</span>
            </div>

            {/* Tier Legend */}
            <div style={styles.tierLegend}>
              <span style={{ ...styles.tierBadge, backgroundColor: '#EF4444' }}>S-Tier: 트리거</span>
              <span style={{ ...styles.tierBadge, backgroundColor: '#3B82F6' }}>A-Tier: 로그</span>
              <span style={{ ...styles.tierBadge, backgroundColor: '#6B7280' }}>Terminal: 종료</span>
            </div>

            {/* Facts Table */}
            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <span style={{ width: '60px' }}>Tier</span>
                <span style={{ flex: 1 }}>Type</span>
                <span style={{ width: '80px' }}>Consumer</span>
                <span style={{ width: '60px' }}>Time</span>
                <span style={{ width: '80px' }}>Weight</span>
                <span style={{ width: '100px' }}>Status</span>
              </div>
              {[...facts].reverse().map(fact => {
                const tier = OUTCOME_TIERS[fact.type];
                const weight = OUTCOME_WEIGHTS[fact.type];
                return (
                  <div key={fact.id} style={{
                    ...styles.tableRow,
                    backgroundColor: !fact.processed && tier === 'S' ? '#1F1F1F' : '#111',
                    borderLeft: tier === 'S' ? '3px solid #EF4444' :
                               tier === 'A' ? '3px solid #3B82F6' : '3px solid #6B7280',
                  }}>
                    <span style={{
                      width: '60px',
                      color: tier === 'S' ? '#EF4444' : tier === 'A' ? '#3B82F6' : '#6B7280',
                      fontWeight: 600,
                    }}>{tier}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace' }}>{fact.type}</span>
                    <span style={{ width: '80px', color: '#9CA3AF' }}>{fact.consumer}</span>
                    <span style={{ width: '60px', color: '#6B7280' }}>{fact.time}</span>
                    <span style={{
                      width: '80px',
                      color: weight > 0 ? '#10B981' : weight < 0 ? '#EF4444' : '#6B7280',
                      fontWeight: 600,
                    }}>{weight > 0 ? '+' : ''}{weight}</span>
                    <span style={{ width: '100px' }}>
                      {fact.processed ? (
                        <span style={{ color: '#10B981' }}>✓ 처리됨</span>
                      ) : tier === 'S' ? (
                        <button
                          onClick={() => processFact(fact.id)}
                          style={styles.processButton}
                        >
                          처리
                        </button>
                      ) : (
                        <span style={{ color: '#6B7280' }}>-</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Velocity Tab */}
        {activeTab === 'velocity' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>⚡ Value Velocity</h2>
              <span style={styles.badge}>V = Σ(outcome × weight) / time</span>
            </div>

            {/* VV Gauge */}
            <div style={styles.vvGauge}>
              <div style={styles.vvValue}>
                <span style={{
                  fontSize: '72px',
                  fontWeight: 700,
                  color: vvData.status === 'green' ? '#10B981' :
                         vvData.status === 'red' ? '#EF4444' : '#F59E0B',
                }}>
                  {vvData.value}
                </span>
                <span style={{ fontSize: '24px', color: '#6B7280', marginLeft: '8px' }}>VV</span>
              </div>
              <div style={styles.vvStatus}>
                {vvData.status === 'green' && '🟢 확장 가능'}
                {vvData.status === 'yellow' && '🟡 유지'}
                {vvData.status === 'red' && '🔴 개선 필요'}
              </div>
            </div>

            {/* Threshold Guide */}
            <div style={styles.thresholdGuide}>
              <div style={styles.thresholdBar}>
                <div style={{ ...styles.thresholdZone, backgroundColor: '#EF4444', width: '30%' }}>
                  <span>Red</span>
                  <span>&lt; -0.2</span>
                </div>
                <div style={{ ...styles.thresholdZone, backgroundColor: '#F59E0B', width: '40%' }}>
                  <span>Yellow</span>
                  <span>-0.2 ~ +0.5</span>
                </div>
                <div style={{ ...styles.thresholdZone, backgroundColor: '#10B981', width: '30%' }}>
                  <span>Green</span>
                  <span>≥ +0.5</span>
                </div>
              </div>
            </div>

            {/* Weight Table */}
            <div style={styles.weightTable}>
              <h3 style={{ color: '#9CA3AF', marginBottom: '12px' }}>가중치 테이블</h3>
              <div style={styles.weightGrid}>
                {Object.entries(OUTCOME_WEIGHTS).map(([type, weight]) => (
                  <div key={type} style={styles.weightItem}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{type}</span>
                    <span style={{
                      fontWeight: 700,
                      color: weight > 0 ? '#10B981' : weight < 0 ? '#EF4444' : '#6B7280',
                    }}>{weight > 0 ? '+' : ''}{weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shadow Tab */}
        {activeTab === 'shadow' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>👤 Shadow Queue</h2>
              <span style={styles.badge}>요청 즉시 반영 금지</span>
            </div>

            {/* Approval Rates */}
            <div style={styles.ratesGrid}>
              {Object.entries(SHADOW_CATEGORIES).map(([key, cat]) => (
                <div key={key} style={styles.rateCard}>
                  <div style={styles.rateHeader}>
                    <span>{cat.label}</span>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: cat.authority === 'owner' ? '#7C3AED' : '#3B82F6',
                      color: 'white',
                    }}>{cat.authority}</span>
                  </div>
                  <div style={styles.rateValue}>{cat.rate}%</div>
                  <div style={styles.rateBar}>
                    <div style={{
                      width: `${cat.rate}%`,
                      height: '100%',
                      backgroundColor: cat.rate >= 50 ? '#10B981' : cat.rate >= 20 ? '#F59E0B' : '#EF4444',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Shadow List */}
            <div style={styles.shadowList}>
              <h3 style={{ color: '#9CA3AF', marginBottom: '12px' }}>대기열</h3>
              {shadows.map(shadow => {
                const cat = SHADOW_CATEGORIES[shadow.category];
                return (
                  <div key={shadow.id} style={{
                    ...styles.shadowItem,
                    borderLeft: shadow.status === 'pending' ? '3px solid #F59E0B' :
                               shadow.status === 'approved' ? '3px solid #10B981' : '3px solid #EF4444',
                  }}>
                    <div style={styles.shadowInfo}>
                      <span style={{ fontWeight: 600 }}>{cat?.label || shadow.category}</span>
                      <span style={{ color: '#6B7280', fontSize: '12px' }}>
                        {shadow.consumer} · {shadow.created}
                      </span>
                    </div>
                    <div style={styles.shadowActions}>
                      {shadow.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => decideShadow(shadow.id, 'approved')}
                            style={{ ...styles.shadowButton, backgroundColor: '#10B981' }}
                          >
                            승인
                          </button>
                          <button
                            onClick={() => decideShadow(shadow.id, 'rejected')}
                            style={{ ...styles.shadowButton, backgroundColor: '#EF4444' }}
                          >
                            거절
                          </button>
                        </>
                      ) : (
                        <span style={{
                          color: shadow.status === 'approved' ? '#10B981' : '#EF4444',
                          fontWeight: 600,
                        }}>
                          {shadow.status === 'approved' ? '✓ 승인됨' : '✗ 거절됨'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Closed Loops Tab */}
        {activeTab === 'loops' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🔄 Closed Loops</h2>
              <span style={styles.badge}>닫히지 않으면 가치 = 0</span>
            </div>

            <div style={styles.loopsGrid}>
              {CLOSED_LOOPS.map(loop => {
                const data = loops[loop.id];
                const total = data.open + data.closed;
                const closeRate = total > 0 ? Math.round((data.closed / total) * 100) : 0;

                return (
                  <div key={loop.id} style={styles.loopCard}>
                    <div style={styles.loopHeader}>
                      <span style={{ fontSize: '32px' }}>{loop.icon}</span>
                      <span style={{ fontWeight: 600 }}>{loop.name}</span>
                    </div>

                    <div style={styles.loopStats}>
                      <div style={styles.loopStat}>
                        <span style={{ color: '#F59E0B', fontSize: '24px', fontWeight: 700 }}>
                          {data.open}
                        </span>
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>열림</span>
                      </div>
                      <div style={styles.loopStat}>
                        <span style={{ color: '#10B981', fontSize: '24px', fontWeight: 700 }}>
                          {data.closed}
                        </span>
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>닫힘</span>
                      </div>
                      <div style={styles.loopStat}>
                        <span style={{ color: '#EF4444', fontSize: '24px', fontWeight: 700 }}>
                          {data.timeout}
                        </span>
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>타임아웃</span>
                      </div>
                    </div>

                    <div style={styles.loopProgress}>
                      <div style={styles.loopProgressBar}>
                        <div style={{
                          width: `${closeRate}%`,
                          height: '100%',
                          backgroundColor: closeRate >= 80 ? '#10B981' : closeRate >= 60 ? '#F59E0B' : '#EF4444',
                          borderRadius: '4px',
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <span style={{
                        color: closeRate >= 80 ? '#10B981' : closeRate >= 60 ? '#F59E0B' : '#EF4444',
                        fontWeight: 600,
                      }}>
                        {closeRate}% 닫힘
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loop Formula */}
            <div style={styles.formulaBox}>
              <h3 style={{ color: '#9CA3AF', marginBottom: '8px' }}>순환 조건</h3>
              <div style={styles.formulaList}>
                <div>📅 출석 순환: [수업예정] → [출석] → [다음수업예정]</div>
                <div>🔄 결석 복귀: [결석] → [알림] → [복귀출석] (14일 제한)</div>
                <div>🔔 알림 반응: [알림발송] → [확인] → [반응] (7일 제한)</div>
                <div>💳 재등록: [만료예정] → [안내] → [결제] (30일 제한)</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>AUTUS Core V2 · AllThatBasket Brand Instance</span>
        <span style={{ color: '#6B7280' }}>고객 노출 금지</span>
      </footer>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#E5E7EB',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #1F1F1F',
    backgroundColor: '#111',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: '#10B981',
  },
  subtitle: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  vvBadge: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '14px',
    color: 'white',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#1F2937',
    border: 'none',
    borderRadius: '8px',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '12px 24px',
    borderBottom: '1px solid #1F1F1F',
    backgroundColor: '#0F0F0F',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  main: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
  },
  badge: {
    padding: '4px 12px',
    backgroundColor: '#1F2937',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#9CA3AF',
  },
  tierLegend: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tierBadge: {
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
  },
  table: {
    backgroundColor: '#111',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #1F1F1F',
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 16px',
    backgroundColor: '#1F1F1F',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1F1F1F',
    fontSize: '14px',
  },
  processButton: {
    padding: '4px 12px',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  vvGauge: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#111',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '1px solid #1F1F1F',
  },
  vvValue: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  vvStatus: {
    fontSize: '20px',
    marginTop: '12px',
    color: '#9CA3AF',
  },
  thresholdGuide: {
    marginBottom: '24px',
  },
  thresholdBar: {
    display: 'flex',
    height: '40px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  thresholdZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
  },
  weightTable: {
    backgroundColor: '#111',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #1F1F1F',
  },
  weightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
  },
  weightItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#1F1F1F',
    borderRadius: '4px',
  },
  ratesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  rateCard: {
    backgroundColor: '#111',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #1F1F1F',
  },
  rateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  rateValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#E5E7EB',
    marginBottom: '8px',
  },
  rateBar: {
    height: '8px',
    backgroundColor: '#1F1F1F',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  shadowList: {
    backgroundColor: '#111',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #1F1F1F',
  },
  shadowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#0A0A0A',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  shadowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  shadowActions: {
    display: 'flex',
    gap: '8px',
  },
  shadowButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  loopsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  loopCard: {
    backgroundColor: '#111',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #1F1F1F',
  },
  loopHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  loopStats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '16px',
  },
  loopStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  loopProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loopProgressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#1F1F1F',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  formulaBox: {
    backgroundColor: '#111',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #1F1F1F',
  },
  formulaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid #1F1F1F',
    fontSize: '12px',
    color: '#9CA3AF',
  },
};
