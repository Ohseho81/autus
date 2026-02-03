import React, { useState } from 'react';

/**
 * ProcessMapV8 - 시스템 = 계약 UI 상태 머신
 *
 * 핵심: "계약을 필요 없게 만드는 시스템"의 구체적 명세
 *
 * C1. 행동 불가능성 - UI에 없으면 못 함
 * C2. 자동 책임 분기 - Fact → 책임자 자동
 * C3. 사전 승인 게이트 - 승인 없이 실행 불가
 * C4. 되돌림 비용 내장 - 해지 비용 명확
 * C5. 자동 증빙 - 모든 행위 기록
 * C6. 보험/보증 트리거 - 조건 충족 시 자동
 */

// 시스템 상태 정의
const STATES = {
  // 학생 상태
  STUDENT_REGISTERED: { id: 'student_registered', name: '등록완료', category: 'student', color: '#22c55e' },
  STUDENT_ACTIVE: { id: 'student_active', name: '수강중', category: 'student', color: '#3b82f6' },
  STUDENT_PAUSED: { id: 'student_paused', name: '휴강', category: 'student', color: '#f59e0b' },
  STUDENT_QUIT: { id: 'student_quit', name: '퇴원', category: 'student', color: '#ef4444' },

  // 결제 상태
  PAYMENT_PENDING: { id: 'payment_pending', name: '결제대기', category: 'payment', color: '#f59e0b' },
  PAYMENT_APPROVED: { id: 'payment_approved', name: '결제승인', category: 'payment', color: '#22c55e' },
  PAYMENT_FAILED: { id: 'payment_failed', name: '결제실패', category: 'payment', color: '#ef4444' },
  PAYMENT_REFUND: { id: 'payment_refund', name: '환불처리', category: 'payment', color: '#8b5cf6' },

  // 수업 상태
  CLASS_SCHEDULED: { id: 'class_scheduled', name: '수업예정', category: 'class', color: '#3b82f6' },
  CLASS_ONGOING: { id: 'class_ongoing', name: '수업중', category: 'class', color: '#22c55e' },
  CLASS_COMPLETED: { id: 'class_completed', name: '수업완료', category: 'class', color: '#6b7280' },
  CLASS_CANCELLED: { id: 'class_cancelled', name: '수업취소', category: 'class', color: '#ef4444' },
};

// 상태 전이 규칙 (계약 조항을 코드로)
const TRANSITIONS = [
  // C1: 행동 불가능성 - 허용된 전이만 존재
  {
    from: 'student_registered',
    to: 'student_active',
    action: '수강시작',
    mechanism: 'C3', // 사전 승인 필요
    gate: '결제완료 필수',
    evidence: true,
  },
  {
    from: 'student_active',
    to: 'student_paused',
    action: '휴강신청',
    mechanism: 'C3',
    gate: '원장승인 필요',
    evidence: true,
  },
  {
    from: 'student_active',
    to: 'student_quit',
    action: '퇴원',
    mechanism: 'C4', // 되돌림 비용
    cost: '환불 수수료 10%',
    evidence: true,
  },
  {
    from: 'student_paused',
    to: 'student_active',
    action: '복귀',
    mechanism: 'C1', // 직접 가능
    evidence: true,
  },
  {
    from: 'student_paused',
    to: 'student_quit',
    action: '퇴원',
    mechanism: 'C4',
    cost: '잔여금 환불',
    evidence: true,
  },

  // 결제 흐름
  {
    from: 'payment_pending',
    to: 'payment_approved',
    action: '결제승인',
    mechanism: 'C3',
    gate: '원장승인',
    evidence: true,
  },
  {
    from: 'payment_pending',
    to: 'payment_failed',
    action: '결제실패',
    mechanism: 'C2', // 자동 분기
    autoTrigger: '카드사 거절',
    evidence: true,
  },
  {
    from: 'payment_approved',
    to: 'payment_refund',
    action: '환불요청',
    mechanism: 'C6', // 보험/보증 트리거
    trigger: '7일 이내',
    evidence: true,
  },

  // 수업 흐름
  {
    from: 'class_scheduled',
    to: 'class_ongoing',
    action: '수업시작',
    mechanism: 'C1',
    evidence: true,
  },
  {
    from: 'class_ongoing',
    to: 'class_completed',
    action: '수업종료',
    mechanism: 'C5', // 자동 증빙
    autoRecord: '출석/영상 기록',
    evidence: true,
  },
  {
    from: 'class_scheduled',
    to: 'class_cancelled',
    action: '수업취소',
    mechanism: 'C2',
    autoTrigger: '코치 결석',
    liabilityTo: '코치',
    evidence: true,
  },
];

// 불가능한 전이 (C1: 행동 불가능성)
const BLOCKED_TRANSITIONS = [
  { from: 'student_registered', to: 'student_quit', reason: '수강 전 퇴원 불가 - 취소만 가능' },
  { from: 'student_quit', to: 'student_active', reason: '퇴원 후 재등록 필요 - 직접 복귀 불가' },
  { from: 'payment_approved', to: 'payment_pending', reason: '승인 후 대기 전환 불가 - 환불만 가능' },
  { from: 'payment_refund', to: 'payment_approved', reason: '환불 후 재승인 불가 - 새 결제 필요' },
  { from: 'class_completed', to: 'class_ongoing', reason: '완료된 수업 재개 불가' },
  { from: 'class_cancelled', to: 'class_scheduled', reason: '취소된 수업 복구 불가 - 새 일정 필요' },
];

// 메커니즘 정의
const MECHANISMS = {
  C1: { id: 'C1', name: '행동 불가능', nameEn: 'Inoperability', icon: '🚫', color: '#ef4444', description: 'UI에 없으면 실행 불가' },
  C2: { id: 'C2', name: '자동 책임 분기', nameEn: 'Auto Liability', icon: '⚡', color: '#f59e0b', description: 'Fact → 책임자 자동 지정' },
  C3: { id: 'C3', name: '사전 승인', nameEn: 'Ex-Ante Gate', icon: '🔐', color: '#3b82f6', description: '승인 없이 실행 불가' },
  C4: { id: 'C4', name: '되돌림 비용', nameEn: 'Lock-in Cost', icon: '💸', color: '#8b5cf6', description: '해지 시 비용 발생' },
  C5: { id: 'C5', name: '자동 증빙', nameEn: 'Auto Evidence', icon: '📝', color: '#22c55e', description: '모든 행위 불변 기록' },
  C6: { id: 'C6', name: '보험 트리거', nameEn: 'Insurance Trigger', icon: '🛡️', color: '#06b6d4', description: '조건 충족 시 자동 실행' },
};

const ProcessMapV8 = () => {
  const [selectedCategory, setSelectedCategory] = useState('student');
  const [selectedState, setSelectedState] = useState(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const categories = [
    { id: 'student', name: '학생', icon: '👤' },
    { id: 'payment', name: '결제', icon: '💳' },
    { id: 'class', name: '수업', icon: '🏀' },
  ];

  const categoryStates = Object.values(STATES).filter(s => s.category === selectedCategory);
  const categoryTransitions = TRANSITIONS.filter(t => {
    const fromState = STATES[Object.keys(STATES).find(k => STATES[k].id === t.from)];
    return fromState?.category === selectedCategory;
  });

  const getTransitionsFrom = (stateId) => TRANSITIONS.filter(t => t.from === stateId);
  const getBlockedFrom = (stateId) => BLOCKED_TRANSITIONS.filter(t => t.from === stateId);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => window.location.hash = '#processv7'}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← 타임테이블
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            ⚙️ 시스템 = 계약 (상태 머신)
          </h1>
        </div>
        <button
          onClick={() => setShowBlocked(!showBlocked)}
          style={{
            background: showBlocked ? '#ef4444' : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {showBlocked ? '🚫 불가능 표시 ON' : '🚫 불가능 표시 OFF'}
        </button>
      </div>

      {/* Core Principle */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '16px', color: '#fca5a5' }}>
          🔒 <strong style={{ color: '#ef4444' }}>시스템 상태 = 계약 상태</strong>
          {' | '}UI에 없는 행동은 존재하지 않는다
        </p>
      </div>

      {/* Mechanism Legend */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {Object.values(MECHANISMS).map(m => (
          <div key={m.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: `${m.color}20`,
            border: `1px solid ${m.color}40`,
            borderRadius: '8px',
            fontSize: '12px',
          }}>
            <span>{m.icon}</span>
            <span style={{ color: m.color, fontWeight: '600' }}>{m.id}</span>
            <span style={{ color: '#94a3b8' }}>{m.name}</span>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        justifyContent: 'center',
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSelectedState(null); }}
            style={{
              padding: '12px 24px',
              background: selectedCategory === cat.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
              border: selectedCategory === cat.id ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            {cat.icon} {cat.name} 상태 머신
          </button>
        ))}
      </div>

      {/* State Machine Diagram */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        {/* Left: State Diagram */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#94a3b8' }}>
            📊 상태 다이어그램
          </h3>

          <svg viewBox="0 0 400 300" style={{ width: '100%', height: 'auto' }}>
            {/* States */}
            {categoryStates.map((state, idx) => {
              const positions = {
                student: [
                  { x: 80, y: 50 },   // registered
                  { x: 200, y: 150 }, // active
                  { x: 320, y: 50 },  // paused
                  { x: 320, y: 250 }, // quit
                ],
                payment: [
                  { x: 80, y: 150 },  // pending
                  { x: 200, y: 50 },  // approved
                  { x: 320, y: 150 }, // failed
                  { x: 200, y: 250 }, // refund
                ],
                class: [
                  { x: 80, y: 150 },  // scheduled
                  { x: 200, y: 50 },  // ongoing
                  { x: 320, y: 50 },  // completed
                  { x: 320, y: 250 }, // cancelled
                ],
              };
              const pos = positions[selectedCategory][idx] || { x: 100, y: 100 };
              const isSelected = selectedState === state.id;

              return (
                <g key={state.id} onClick={() => setSelectedState(state.id)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 35 : 30}
                    fill={`${state.color}30`}
                    stroke={state.color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {state.name}
                  </text>
                </g>
              );
            })}

            {/* Transitions (arrows) */}
            {categoryTransitions.map((t, idx) => {
              const fromState = categoryStates.find(s => s.id === t.from);
              const toState = categoryStates.find(s => s.id === t.to);
              if (!fromState || !toState) return null;

              const fromIdx = categoryStates.indexOf(fromState);
              const toIdx = categoryStates.indexOf(toState);

              const positions = {
                student: [
                  { x: 80, y: 50 },
                  { x: 200, y: 150 },
                  { x: 320, y: 50 },
                  { x: 320, y: 250 },
                ],
                payment: [
                  { x: 80, y: 150 },
                  { x: 200, y: 50 },
                  { x: 320, y: 150 },
                  { x: 200, y: 250 },
                ],
                class: [
                  { x: 80, y: 150 },
                  { x: 200, y: 50 },
                  { x: 320, y: 50 },
                  { x: 320, y: 250 },
                ],
              };

              const from = positions[selectedCategory][fromIdx];
              const to = positions[selectedCategory][toIdx];
              if (!from || !to) return null;

              const mechanism = MECHANISMS[t.mechanism];
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              // Calculate arrow direction
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const nx = dx / len;
              const ny = dy / len;

              const startX = from.x + nx * 35;
              const startY = from.y + ny * 35;
              const endX = to.x - nx * 35;
              const endY = to.y - ny * 35;

              return (
                <g key={idx}>
                  <defs>
                    <marker
                      id={`arrow-${idx}`}
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L9,3 z" fill={mechanism?.color || '#94a3b8'} />
                    </marker>
                  </defs>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={mechanism?.color || '#94a3b8'}
                    strokeWidth="2"
                    markerEnd={`url(#arrow-${idx})`}
                  />
                  <circle cx={midX} cy={midY} r="10" fill={mechanism?.color || '#94a3b8'} />
                  <text x={midX} y={midY + 4} textAnchor="middle" fill="#fff" fontSize="8">
                    {mechanism?.icon}
                  </text>
                </g>
              );
            })}

            {/* Blocked Transitions (red X) */}
            {showBlocked && BLOCKED_TRANSITIONS.filter(t => {
              const fromState = categoryStates.find(s => s.id === t.from);
              return fromState?.category === selectedCategory;
            }).map((t, idx) => {
              const fromState = categoryStates.find(s => s.id === t.from);
              const toState = Object.values(STATES).find(s => s.id === t.to);
              if (!fromState || !toState) return null;

              const fromIdx = categoryStates.indexOf(fromState);
              const toIdx = categoryStates.indexOf(toState);

              const positions = {
                student: [
                  { x: 80, y: 50 },
                  { x: 200, y: 150 },
                  { x: 320, y: 50 },
                  { x: 320, y: 250 },
                ],
                payment: [
                  { x: 80, y: 150 },
                  { x: 200, y: 50 },
                  { x: 320, y: 150 },
                  { x: 200, y: 250 },
                ],
                class: [
                  { x: 80, y: 150 },
                  { x: 200, y: 50 },
                  { x: 320, y: 50 },
                  { x: 320, y: 250 },
                ],
              };

              const from = positions[selectedCategory][fromIdx];
              const to = positions[selectedCategory][toIdx];
              if (!from || !to) return null;

              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={`blocked-${idx}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                  <circle cx={midX} cy={midY} r="12" fill="#ef4444" />
                  <text x={midX} y={midY + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                    ✕
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Transition Details */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#94a3b8' }}>
            {selectedState ? `📋 "${STATES[Object.keys(STATES).find(k => STATES[k].id === selectedState)]?.name}" 전이 규칙` : '📋 상태를 선택하세요'}
          </h3>

          {selectedState ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Allowed Transitions */}
              <div>
                <div style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px' }}>✅ 가능한 행동</div>
                {getTransitionsFrom(selectedState).length > 0 ? (
                  getTransitionsFrom(selectedState).map((t, idx) => {
                    const mechanism = MECHANISMS[t.mechanism];
                    const toState = STATES[Object.keys(STATES).find(k => STATES[k].id === t.to)];
                    return (
                      <div key={idx} style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                        borderLeft: `3px solid ${mechanism?.color}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600' }}>{t.action}</span>
                          <span style={{
                            background: `${mechanism?.color}30`,
                            color: mechanism?.color,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}>
                            {mechanism?.icon} {mechanism?.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          → {toState?.name}
                        </div>
                        {t.gate && (
                          <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>
                            🔐 게이트: {t.gate}
                          </div>
                        )}
                        {t.cost && (
                          <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '4px' }}>
                            💸 비용: {t.cost}
                          </div>
                        )}
                        {t.autoTrigger && (
                          <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                            ⚡ 자동: {t.autoTrigger}
                          </div>
                        )}
                        {t.evidence && (
                          <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>
                            📝 증빙 자동 생성
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>가능한 전이 없음 (종료 상태)</div>
                )}
              </div>

              {/* Blocked Transitions */}
              {showBlocked && (
                <div>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>🚫 불가능한 행동 (UI에 없음)</div>
                  {getBlockedFrom(selectedState).length > 0 ? (
                    getBlockedFrom(selectedState).map((t, idx) => {
                      const toState = STATES[Object.keys(STATES).find(k => STATES[k].id === t.to)];
                      return (
                        <div key={idx} style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '8px',
                          borderLeft: '3px solid #ef4444',
                        }}>
                          <div style={{ fontWeight: '600', color: '#fca5a5', marginBottom: '4px' }}>
                            ✕ → {toState?.name || t.to}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {t.reason}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '13px' }}>명시된 제한 없음</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              왼쪽 다이어그램에서 상태를 클릭하세요
            </div>
          )}
        </div>
      </div>

      {/* Contract vs System Comparison */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginTop: '24px',
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#ef4444' }}>📄 전통 계약</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#fca5a5', lineHeight: '1.8' }}>
            <li>텍스트 합의 → 해석 필요</li>
            <li>위반 후 분쟁</li>
            <li>사후 집행 (소송)</li>
            <li>증빙 수동 수집</li>
          </ul>
        </div>
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>⚙️ AUTUS 시스템</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#86efac', lineHeight: '1.8' }}>
            <li>구조적 제약 → 해석 불필요</li>
            <li>위반 불가능</li>
            <li>사전 집행 (게이트)</li>
            <li>증빙 자동 생성</li>
          </ul>
        </div>
      </div>

      {/* Bottom Summary */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '16px' }}>
          💡 <strong style={{ color: '#3b82f6' }}>핵심</strong>:
          계약 조항 = 상태 전이 규칙 | 계약 위반 = 불가능한 전이 | 계약 집행 = 게이트 통과
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
          "문서로 쓰지 않고, 시스템으로 강제한다"
        </p>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '32px',
      }}>
        <button
          onClick={() => window.location.hash = '#processv6'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          진화 맵 (V6)
        </button>
        <button
          onClick={() => window.location.hash = '#processv7'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          타임테이블 (V7)
        </button>
      </div>
    </div>
  );
};

export default ProcessMapV8;
