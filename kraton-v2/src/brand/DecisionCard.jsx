/**
 * 📋 DecisionCard - OutcomeFact 기반 결정 카드
 *
 * 모든 OutcomeFact는 이 카드로 렌더링됨
 * 역할별로 다른 액션 버튼 표시
 */

import React, { useState } from 'react';
import { getLabel, getCardStyle, BRAND } from './allthatbasket.adapter.js';

// ============================================
// DecisionCard 컴포넌트
// ============================================

export default function DecisionCard({
  decisionCard,
  role = 'admin',
  onApprove,
  onReject,
  onKill,
  onEscalate,
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    outcome_type,
    severity,
    gate_required,
    gate_level,
    synthesis_loops,
    decision,
    rule,
    created_at,
  } = decisionCard;

  const label = getLabel(outcome_type);
  const style = getCardStyle(outcome_type, severity === 'CRITICAL' ? 'high' : 'normal');

  // 역할별 액션 버튼
  const actions = getActionsForRole(role, gate_required, gate_level);

  return (
    <div
      style={{
        border: `2px solid ${style.borderColor}`,
        borderRadius: '12px',
        backgroundColor: style.backgroundColor,
        padding: '16px',
        marginBottom: '12px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{style.emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{style.label}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              {new Date(created_at).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 심각도 배지 */}
        <SeverityBadge severity={severity} />
      </div>

      {/* Synthesis 루프 */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {synthesis_loops.map(loop => (
          <LoopBadge key={loop} loop={loop} />
        ))}
      </div>

      {/* 게이트 정보 */}
      {gate_required && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#FEF3C7',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        >
          <span style={{ fontWeight: 600 }}>🔒 승인 필요</span>
          <span style={{ marginLeft: '8px', color: '#92400E' }}>
            Level: {gate_level}
          </span>
        </div>
      )}

      {/* 규칙 (확장 시) */}
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#374151',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>📜 규칙</div>
          {rule}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        {actions.includes('approve') && (
          <ActionButton
            label="승인"
            color={BRAND.colors.success}
            onClick={() => onApprove?.(decisionCard)}
          />
        )}
        {actions.includes('reject') && (
          <ActionButton
            label="반려"
            color={BRAND.colors.danger}
            onClick={() => onReject?.(decisionCard)}
          />
        )}
        {actions.includes('escalate') && (
          <ActionButton
            label="상위 보고"
            color={BRAND.colors.warning}
            onClick={() => onEscalate?.(decisionCard)}
          />
        )}
        {actions.includes('kill') && (
          <ActionButton
            label="Kill"
            color="#000"
            onClick={() => onKill?.(decisionCard)}
          />
        )}

        {/* 더보기 */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            backgroundColor: 'white',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {expanded ? '접기' : '상세'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// 서브 컴포넌트
// ============================================

function SeverityBadge({ severity }) {
  const config = {
    CRITICAL: { bg: '#FEE2E2', color: '#991B1B', label: '긴급' },
    HIGH: { bg: '#FEF3C7', color: '#92400E', label: '높음' },
    MEDIUM: { bg: '#DBEAFE', color: '#1E40AF', label: '보통' },
    LOW: { bg: '#F3F4F6', color: '#374151', label: '낮음' },
    POSITIVE: { bg: '#D1FAE5', color: '#065F46', label: '긍정' },
  };

  const c = config[severity] || config.LOW;

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '9999px',
        backgroundColor: c.bg,
        color: c.color,
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {c.label}
    </span>
  );
}

function LoopBadge({ loop }) {
  const config = {
    A: { label: '출석', color: '#3B82F6' },
    P: { label: '결제', color: '#10B981' },
    Ap: { label: '승인', color: '#F59E0B' },
    N: { label: '알림', color: '#8B5CF6' },
    F: { label: '피드백', color: '#EC4899' },
  };

  const c = config[loop] || { label: loop, color: '#6B7280' };

  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: `${c.color}20`,
        color: c.color,
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {c.label}
    </span>
  );
}

function ActionButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: color,
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
      }}
      onMouseOver={(e) => e.target.style.opacity = 0.9}
      onMouseOut={(e) => e.target.style.opacity = 1}
    >
      {label}
    </button>
  );
}

// ============================================
// 유틸리티
// ============================================

function getActionsForRole(role, gateRequired, gateLevel) {
  if (role === 'owner') {
    return gateRequired ? ['approve', 'reject', 'kill'] : ['kill'];
  }
  if (role === 'admin') {
    if (gateLevel === 'HIGH' || gateLevel === 'FINANCIAL' || gateLevel === 'RELATION') {
      return ['escalate']; // 원장에게 보고
    }
    return gateRequired ? ['approve', 'reject'] : [];
  }
  if (role === 'coach') {
    return []; // 코치는 결정 권한 없음
  }
  return [];
}

// ============================================
// DecisionCardList - 리스트 컴포넌트
// ============================================

export function DecisionCardList({ cards, role, onApprove, onReject, onKill, onEscalate }) {
  if (!cards || cards.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#9CA3AF',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
        <div>처리할 항목이 없습니다</div>
      </div>
    );
  }

  return (
    <div>
      {cards.map(card => (
        <DecisionCard
          key={card.id}
          decisionCard={card}
          role={role}
          onApprove={onApprove}
          onReject={onReject}
          onKill={onKill}
          onEscalate={onEscalate}
        />
      ))}
    </div>
  );
}
