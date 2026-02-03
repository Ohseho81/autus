/**
 * 📊 DecisionDashboard - 결정 카드 대시보드
 *
 * OutcomeFact → DecisionCard → 역할별 필터링
 *
 * 전체 흐름 데모:
 * 1. 고객 로그 발생 (테스트 데이터)
 * 2. DecisionCard 자동 생성
 * 3. 역할별 화면에 표시
 */

import React, { useState, useMemo } from 'react';
import { DecisionCard, DecisionCardList, getRouting, getOutcomeTypesForRole, BRAND, ROLES } from '../../brand';
import { createOutcomeFact, generateDecisionCard, OUTCOME_TYPES } from '../../contract';

// ============================================
// 테스트 데이터 생성
// ============================================

function generateTestData() {
  const testFacts = [
    {
      type: 'payment.friction',
      data: {
        consumer_id: 'parent_001',
        subject_id: 'student_001',
        channel: 'app',
        value: { type: 'overdue', amount: 500000, overdue_days: 7 }
      }
    },
    {
      type: 'renewal.failed',
      data: {
        consumer_id: 'parent_002',
        subject_id: 'student_002',
        channel: 'call',
        value: { reason: 'price', retention_attempted: true }
      }
    },
    {
      type: 'attendance.drop',
      data: {
        consumer_id: 'parent_003',
        subject_id: 'student_003',
        channel: 'system',
        value: { drop_rate: 30, consecutive_absences: 3, period_days: 14 }
      }
    },
    {
      type: 'complaint.mismatch',
      data: {
        consumer_id: 'parent_004',
        subject_id: 'student_004',
        channel: 'kakao',
        value: { category: 'teacher', intensity: 'moderate', expressed_via: '카카오톡' }
      }
    },
    {
      type: 'discount.requested',
      data: {
        consumer_id: 'parent_005',
        subject_id: 'student_005',
        channel: 'visit',
        value: { type: 'discount', amount: 50000, reason: '형제 할인 요청' }
      }
    },
    {
      type: 'makeup.requested',
      data: {
        consumer_id: 'parent_006',
        subject_id: 'student_006',
        channel: 'app',
        value: { reason: 'absence', preferred_times: ['토요일 오후'] }
      }
    },
  ];

  return testFacts.map(({ type, data }) => {
    const fact = createOutcomeFact(type, data);
    return generateDecisionCard(fact);
  });
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function DecisionDashboard() {
  const [currentRole, setCurrentRole] = useState('owner');
  const [cards] = useState(() => generateTestData());

  // 역할별 필터링
  const filteredCards = useMemo(() => {
    const roleOutcomeTypes = getOutcomeTypesForRole(currentRole);

    return cards.filter(card => {
      const routing = getRouting(card.outcome_type);

      // 해당 역할이 처리해야 하는 카드인지
      if (routing.role === currentRole) return true;

      // owner는 모든 HIGH 레벨 볼 수 있음
      if (currentRole === 'owner' && card.gate_level === 'HIGH') return true;

      return false;
    });
  }, [cards, currentRole]);

  // 통계
  const stats = useMemo(() => ({
    total: filteredCards.length,
    critical: filteredCards.filter(c => c.severity === 'CRITICAL').length,
    needsApproval: filteredCards.filter(c => c.gate_required).length,
  }), [filteredCards]);

  // 핸들러
  const handleApprove = (card) => {
    console.log('승인:', card.outcome_type);
    alert(`✅ 승인 완료: ${card.outcome_type}`);
  };

  const handleReject = (card) => {
    console.log('반려:', card.outcome_type);
    alert(`❌ 반려: ${card.outcome_type}`);
  };

  const handleKill = (card) => {
    console.log('Kill:', card.outcome_type);
    alert(`🗑️ Kill: ${card.outcome_type}`);
  };

  const handleEscalate = (card) => {
    console.log('상위보고:', card.outcome_type);
    alert(`⬆️ 원장님께 보고: ${card.outcome_type}`);
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Decision Dashboard</h1>
          <p style={styles.subtitle}>OutcomeFact → DecisionCard 통합 데모</p>
        </div>

        {/* 역할 선택 */}
        <div style={styles.roleSelector}>
          {Object.values(ROLES).map(role => (
            <button
              key={role.id}
              onClick={() => setCurrentRole(role.id)}
              style={{
                ...styles.roleButton,
                backgroundColor: currentRole === role.id ? BRAND.colors.primary : 'white',
                color: currentRole === role.id ? 'white' : '#374151',
                borderColor: currentRole === role.id ? BRAND.colors.primary : '#E5E7EB',
              }}
            >
              <span>{role.emoji}</span>
              <span>{role.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 통계 */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>처리 대기</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: BRAND.colors.danger }}>
          <div style={{ ...styles.statValue, color: BRAND.colors.danger }}>{stats.critical}</div>
          <div style={styles.statLabel}>긴급</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: BRAND.colors.warning }}>
          <div style={{ ...styles.statValue, color: BRAND.colors.warning }}>{stats.needsApproval}</div>
          <div style={styles.statLabel}>승인 필요</div>
        </div>
      </div>

      {/* 현재 역할 정보 */}
      <div style={styles.roleInfo}>
        <span style={styles.roleInfoEmoji}>{ROLES[currentRole]?.emoji}</span>
        <span style={styles.roleInfoLabel}>
          {ROLES[currentRole]?.label} 화면
        </span>
        <span style={styles.roleInfoPermissions}>
          권한: {ROLES[currentRole]?.permissions.join(', ')}
        </span>
      </div>

      {/* 카드 리스트 */}
      <div style={styles.cardList}>
        <DecisionCardList
          cards={filteredCards}
          role={currentRole}
          onApprove={handleApprove}
          onReject={handleReject}
          onKill={handleKill}
          onEscalate={handleEscalate}
        />
      </div>

      {/* 플로우 설명 */}
      <div style={styles.flowBox}>
        <div style={styles.flowTitle}>🔄 데이터 플로우</div>
        <div style={styles.flowSteps}>
          <div style={styles.flowStep}>
            <span style={styles.flowStepNumber}>1</span>
            <span>고객 행위 발생</span>
          </div>
          <span style={styles.flowArrow}>→</span>
          <div style={styles.flowStep}>
            <span style={styles.flowStepNumber}>2</span>
            <span>OutcomeFact 생성</span>
          </div>
          <span style={styles.flowArrow}>→</span>
          <div style={styles.flowStep}>
            <span style={styles.flowStepNumber}>3</span>
            <span>DecisionCard 생성</span>
          </div>
          <span style={styles.flowArrow}>→</span>
          <div style={styles.flowStep}>
            <span style={styles.flowStepNumber}>4</span>
            <span>역할별 라우팅</span>
          </div>
          <span style={styles.flowArrow}>→</span>
          <div style={styles.flowStep}>
            <span style={styles.flowStepNumber}>5</span>
            <span>승인/Kill/Shadow</span>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
  },
  roleSelector: {
    display: 'flex',
    gap: '8px',
  },
  roleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '4px',
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #E5E7EB',
  },
  roleInfoEmoji: {
    fontSize: '24px',
  },
  roleInfoLabel: {
    fontSize: '16px',
    fontWeight: 600,
  },
  roleInfoPermissions: {
    fontSize: '13px',
    color: '#6B7280',
    marginLeft: 'auto',
  },
  cardList: {
    marginBottom: '24px',
  },
  flowBox: {
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
  },
  flowTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  flowSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  flowStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    fontSize: '13px',
  },
  flowStepNumber: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    color: 'white',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: 600,
  },
  flowArrow: {
    color: '#9CA3AF',
    fontSize: '16px',
  },
};
