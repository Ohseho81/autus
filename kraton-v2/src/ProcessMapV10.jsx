/**
 * 🎯 ProcessMapV10 - 고객 중심 World Map
 *
 * 핵심 개념:
 * 1. 고객이 제일 위
 * 2. 고객 로그(OutcomeFact)가 모든 것의 시작
 * 3. 로그 → 프로세스 발생
 * 4. 생산자는 내부 노드만 조정 가능
 * 5. 목표: 재등록률 (측정 가능한 단일 지표)
 */

import React, { useState } from 'react';

// ============================================
// 데이터 정의
// ============================================

// 고객 노드
const CUSTOMER = {
  id: 'customer',
  label: '고객',
  emoji: '👨‍👩‍👧',
  types: [
    { id: 'parent', label: '학부모', emoji: '👨‍👩‍👧' },
    { id: 'student', label: '학생', emoji: '🏃' },
  ],
  goal: {
    metric: '재등록률',
    target: '80%',
    current: '72%',
  },
};

// 고객 로그 (OutcomeFact 10개)
const CUSTOMER_LOGS = [
  { id: 'OF01', label: '문의', emoji: '❓', type: 'inquiry.created' },
  { id: 'OF02', label: '이탈', emoji: '🚨', type: 'renewal.failed' },
  { id: 'OF03', label: '재등록', emoji: '✅', type: 'renewal.succeeded' },
  { id: 'OF04', label: '결석', emoji: '📉', type: 'attendance.drop' },
  { id: 'OF05', label: '결제이슈', emoji: '💳', type: 'payment.friction' },
  { id: 'OF06', label: '보충요청', emoji: '🔄', type: 'makeup.requested' },
  { id: 'OF07', label: '할인요청', emoji: '💰', type: 'discount.requested' },
  { id: 'OF08', label: '강사변경', emoji: '👨‍🏫', type: 'teacher.change_requested' },
  { id: 'OF09', label: '불만', emoji: '😤', type: 'complaint.mismatch' },
  { id: 'OF10', label: '무응답', emoji: '📵', type: 'notification.ignored' },
];

// 생산자 노드 (내부 - 조정 가능)
const PRODUCER_NODES = [
  { id: 'owner', label: '원장', emoji: '👔', actions: ['승인', 'Kill'], color: '#1F2937' },
  { id: 'admin', label: '관리자', emoji: '💼', actions: ['모니터', '에스컬레이션'], color: '#3B82F6' },
  { id: 'coach', label: '코치', emoji: '🏃', actions: ['수업', '출석'], color: '#F97316' },
];

// 외부 환경 (영향만 받음 - 조정 불가)
const ENVIRONMENT = [
  { id: 'E1', label: '경쟁사', emoji: '🏢', influence: '가격/서비스 압박' },
  { id: 'E2', label: '산업환경', emoji: '📊', influence: '시장 트렌드' },
  { id: 'E3', label: '기술', emoji: '💻', influence: '도구 변화' },
  { id: 'E4', label: '행정', emoji: '📋', influence: '규제 준수' },
];

// ============================================
// 메인 컴포넌트
// ============================================

export default function ProcessMapV10() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <h1 style={styles.title}>🎯 고객 중심 World Map</h1>
        <p style={styles.subtitle}>고객 로그 → 프로세스 → 재등록</p>
      </header>

      <div style={styles.worldMap}>
        {/* ===== 최상단: 고객 ===== */}
        <div style={styles.customerLayer}>
          <div style={styles.customerCard}>
            <div style={styles.customerEmoji}>{CUSTOMER.emoji}</div>
            <div style={styles.customerLabel}>{CUSTOMER.label}</div>
            <div style={styles.customerTypes}>
              {CUSTOMER.types.map(t => (
                <span key={t.id} style={styles.customerType}>
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>

            {/* 목표 지표 */}
            <div style={styles.goalBox}>
              <div style={styles.goalLabel}>목표: {CUSTOMER.goal.metric}</div>
              <div style={styles.goalBar}>
                <div
                  style={{
                    ...styles.goalProgress,
                    width: CUSTOMER.goal.current,
                  }}
                />
              </div>
              <div style={styles.goalNumbers}>
                <span>현재: {CUSTOMER.goal.current}</span>
                <span>목표: {CUSTOMER.goal.target}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 화살표: 고객 → 로그 */}
        <div style={styles.arrowSection}>
          <div style={styles.arrowDown}>↓</div>
          <div style={styles.arrowLabel}>행위 발생</div>
        </div>

        {/* ===== 고객 로그 (OutcomeFact 10개) ===== */}
        <div style={styles.logLayer}>
          <div style={styles.layerTitle}>
            <span>📋</span>
            <span>고객 로그 (OutcomeFact 10개 - LOCKED)</span>
          </div>
          <div style={styles.logGrid}>
            {CUSTOMER_LOGS.map(log => (
              <div
                key={log.id}
                style={{
                  ...styles.logCard,
                  backgroundColor: selectedLog?.id === log.id ? '#DBEAFE' : 'white',
                  borderColor: selectedLog?.id === log.id ? '#3B82F6' : '#E5E7EB',
                }}
                onClick={() => setSelectedLog(log)}
              >
                <span style={styles.logEmoji}>{log.emoji}</span>
                <span style={styles.logLabel}>{log.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 화살표: 로그 → 프로세스 */}
        <div style={styles.arrowSection}>
          <div style={styles.arrowDown}>↓</div>
          <div style={styles.arrowLabel}>프로세스 트리거</div>
        </div>

        {/* ===== 생산자 (내부 노드) ===== */}
        <div style={styles.producerLayer}>
          <div style={styles.layerTitle}>
            <span>🏀</span>
            <span>생산자 (내부 노드 - 조정 가능)</span>
          </div>

          <div style={styles.producerGrid}>
            {PRODUCER_NODES.map(node => (
              <div
                key={node.id}
                style={{
                  ...styles.producerCard,
                  borderColor: node.color,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div style={styles.producerEmoji}>{node.emoji}</div>
                <div style={styles.producerLabel}>{node.label}</div>
                <div style={styles.producerActions}>
                  {node.actions.map(action => (
                    <span
                      key={action}
                      style={{
                        ...styles.actionBadge,
                        backgroundColor: `${node.color}20`,
                        color: node.color,
                      }}
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 조정 관계 */}
          <div style={styles.adjustmentBox}>
            <div style={styles.adjustmentTitle}>조정 방향</div>
            <div style={styles.adjustmentFlow}>
              <span style={styles.flowItem}>원장</span>
              <span style={styles.flowArrow}>→</span>
              <span style={styles.flowItem}>관리자</span>
              <span style={styles.flowArrow}>→</span>
              <span style={styles.flowItem}>코치</span>
              <span style={styles.flowArrow}>→</span>
              <span style={styles.flowItem}>수업</span>
              <span style={styles.flowArrow}>→</span>
              <span style={styles.flowItemHighlight}>고객 만족</span>
            </div>
          </div>
        </div>

        {/* ===== 외부 환경 (영향만 받음) ===== */}
        <div style={styles.environmentLayer}>
          <div style={styles.layerTitle}>
            <span>🌍</span>
            <span>외부 환경 (영향만 받음 - 조정 불가)</span>
          </div>

          <div style={styles.envGrid}>
            {ENVIRONMENT.map(env => (
              <div key={env.id} style={styles.envCard}>
                <span style={styles.envEmoji}>{env.emoji}</span>
                <div>
                  <div style={styles.envLabel}>{env.label}</div>
                  <div style={styles.envInfluence}>{env.influence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 핵심 규칙 ===== */}
        <div style={styles.rulesBox}>
          <div style={styles.rulesTitle}>📜 핵심 규칙</div>
          <div style={styles.rulesList}>
            <div style={styles.ruleItem}>
              <span style={styles.ruleNumber}>1</span>
              <span>고객이 제일 위 (Customer First)</span>
            </div>
            <div style={styles.ruleItem}>
              <span style={styles.ruleNumber}>2</span>
              <span>고객 로그만 프로세스 트리거 (OutcomeFact Only)</span>
            </div>
            <div style={styles.ruleItem}>
              <span style={styles.ruleNumber}>3</span>
              <span>생산자는 내부만 조정 (Internal Control)</span>
            </div>
            <div style={styles.ruleItem}>
              <span style={styles.ruleNumber}>4</span>
              <span>외부는 영향만 (Environment = Read-Only)</span>
            </div>
            <div style={styles.ruleItem}>
              <span style={styles.ruleNumber}>5</span>
              <span>단일 목표: 재등록률 (Single Metric)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    padding: '24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
  },
  worldMap: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // 고객 레이어
  customerLayer: {
    display: 'flex',
    justifyContent: 'center',
  },
  customerCard: {
    backgroundColor: '#ECFDF5',
    border: '3px solid #10B981',
    borderRadius: '16px',
    padding: '24px 48px',
    textAlign: 'center',
    minWidth: '300px',
  },
  customerEmoji: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  customerLabel: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#065F46',
    marginBottom: '8px',
  },
  customerTypes: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  customerType: {
    padding: '4px 12px',
    backgroundColor: 'white',
    borderRadius: '9999px',
    fontSize: '14px',
  },
  goalBox: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '8px',
  },
  goalLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#065F46',
    marginBottom: '8px',
  },
  goalBar: {
    height: '8px',
    backgroundColor: '#D1FAE5',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  goalProgress: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: '4px',
  },
  goalNumbers: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  },

  // 화살표
  arrowSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
  },
  arrowDown: {
    fontSize: '24px',
    color: '#9CA3AF',
  },
  arrowLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    padding: '2px 12px',
    borderRadius: '9999px',
  },

  // 로그 레이어
  logLayer: {
    backgroundColor: '#FEF3C7',
    border: '2px solid #F59E0B',
    borderRadius: '12px',
    padding: '20px',
  },
  layerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  logGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  logCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  logEmoji: {
    fontSize: '20px',
  },
  logLabel: {
    fontSize: '14px',
    fontWeight: 500,
  },

  // 생산자 레이어
  producerLayer: {
    backgroundColor: '#EFF6FF',
    border: '2px solid #3B82F6',
    borderRadius: '12px',
    padding: '20px',
  },
  producerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  producerCard: {
    backgroundColor: 'white',
    border: '2px solid',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  producerEmoji: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  producerLabel: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  producerActions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBadge: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
  },
  adjustmentBox: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px 16px',
  },
  adjustmentTitle: {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '8px',
  },
  adjustmentFlow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  flowItem: {
    padding: '4px 12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    fontSize: '14px',
  },
  flowArrow: {
    color: '#9CA3AF',
  },
  flowItemHighlight: {
    padding: '4px 12px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
  },

  // 환경 레이어
  environmentLayer: {
    backgroundColor: '#F3F4F6',
    border: '2px dashed #9CA3AF',
    borderRadius: '12px',
    padding: '20px',
  },
  envGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  envCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
  },
  envEmoji: {
    fontSize: '24px',
  },
  envLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  envInfluence: {
    fontSize: '12px',
    color: '#9CA3AF',
  },

  // 규칙 박스
  rulesBox: {
    backgroundColor: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
  },
  rulesTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  ruleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    fontSize: '14px',
  },
  ruleNumber: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    color: 'white',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
  },
};
