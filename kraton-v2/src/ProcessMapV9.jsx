/**
 * 🌍 ProcessMapV9 - AUTUS Master World Map v1
 *
 * "헌법" - AUTUS 시스템의 최상위 아키텍처 다이어그램
 *
 * 구조:
 * [상단] Consumer Outcome Layer + Outcome Fact Ledger (append-only)
 * [중단] 11 Force Interaction Layer
 * [하단] Contract State Machine (S0-S9) + Process Synthesis + Brand UI
 *
 * 규칙:
 * - 화살표는 아래 방향만 허용
 * - OutcomeFact만이 상태 전이와 프로세스 합성을 트리거할 수 있음
 * - Force는 Outcome에만 영향 (측면 화살표), 프로세스에 직접 연결 불가
 */

import React, { useState } from 'react';

// ============================================
// Design tokens (inline)
// ============================================
const SPACING = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' };
const RADIUS = { sm: '4px', md: '8px', lg: '12px', full: '9999px' };
const FONT_SIZE = { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '24px', '3xl': '32px' };
const FONT_WEIGHT = { normal: 400, semibold: 600, bold: 700 };
const COLORS = {
  bg: { primary: '#ffffff', secondary: '#f9fafb' },
  text: { primary: '#111827', secondary: '#6b7280', tertiary: '#9ca3af' },
  border: '#e5e7eb',
  accent: '#3b82f6',
};

// ============================================
// AUTUS World Map 데이터 정의
// ============================================

// 상단: Consumer Outcome Layer
const CONSUMER_OUTCOMES = [
  { id: 'CO1', label: '실력 향상', emoji: '🏀', description: '드리블, 슛, 패스 등 기술 향상' },
  { id: 'CO2', label: '체력 증진', emoji: '💪', description: '심폐지구력, 근력, 유연성' },
  { id: 'CO3', label: '사회성 발달', emoji: '🤝', description: '팀워크, 리더십, 협동심' },
  { id: 'CO4', label: '즐거움', emoji: '😊', description: '운동의 재미, 성취감' },
  { id: 'CO5', label: '안전', emoji: '🛡️', description: '부상 없이 운동 지속' },
];

// Outcome Fact Ledger (append-only 기록)
const OUTCOME_FACT_TYPES = [
  { id: 'OF1', label: '출석', icon: '📋', example: '2024-01-15 김민수 출석 완료' },
  { id: 'OF2', label: '평가', icon: '📊', example: '드리블 테스트 B+ 획득' },
  { id: 'OF3', label: '결제', icon: '💳', example: '1월 수강료 500,000원 결제' },
  { id: 'OF4', label: '부상', icon: '🚑', example: '발목 염좌 발생 (경미)' },
  { id: 'OF5', label: '피드백', icon: '💬', example: '학부모 만족도 평가 4.5/5' },
];

// 중단: 11 Force Interaction Layer
const FORCES = [
  // 내부 힘 (Internal Forces)
  { id: 'F1', label: '코치 역량', type: 'internal', color: '#3B82F6' },
  { id: 'F2', label: '커리큘럼', type: 'internal', color: '#3B82F6' },
  { id: 'F3', label: '시설/장비', type: 'internal', color: '#3B82F6' },
  { id: 'F4', label: '운영 효율', type: 'internal', color: '#3B82F6' },

  // 외부 힘 (External Forces)
  { id: 'F5', label: '학부모 기대', type: 'external', color: '#F59E0B' },
  { id: 'F6', label: '경쟁 학원', type: 'external', color: '#F59E0B' },
  { id: 'F7', label: '시장 트렌드', type: 'external', color: '#F59E0B' },

  // 조건 힘 (Conditional Forces)
  { id: 'F8', label: '날씨/계절', type: 'condition', color: '#8B5CF6' },
  { id: 'F9', label: '학사 일정', type: 'condition', color: '#8B5CF6' },
  { id: 'F10', label: '경제 상황', type: 'condition', color: '#8B5CF6' },
  { id: 'F11', label: '규제/정책', type: 'condition', color: '#8B5CF6' },
];

// 하단: Contract State Machine (S0-S9)
const CONTRACT_STATES = [
  { id: 'S0', label: '미등록', description: '잠재 고객' },
  { id: 'S1', label: '상담', description: '문의/상담 진행' },
  { id: 'S2', label: '체험', description: '체험 수업 참여' },
  { id: 'S3', label: '등록', description: '정식 등록 완료' },
  { id: 'S4', label: '수강중', description: '정상 수강' },
  { id: 'S5', label: '휴강', description: '일시 휴강' },
  { id: 'S6', label: '연장', description: '재등록/연장' },
  { id: 'S7', label: '퇴원', description: '수강 종료' },
  { id: 'S8', label: 'VIP', description: '장기 우수 고객' },
  { id: 'S9', label: '졸업', description: '정상 수료' },
];

// Process Synthesis Engine 동작
const PROCESS_SYNTHESIS = [
  { id: 'PS1', trigger: 'OF1', output: '출석 알림 발송' },
  { id: 'PS2', trigger: 'OF2', output: '성적표 생성' },
  { id: 'PS3', trigger: 'OF3', output: '영수증 발급' },
  { id: 'PS4', trigger: 'OF4', output: '보험 청구 시작' },
  { id: 'PS5', trigger: 'OF5', output: '개선 액션 도출' },
];

// Brand UI Execution (AllThatBasket 화면)
const BRAND_UI_SCREENS = [
  { id: 'UI1', label: '대시보드', path: '/', icon: '📊' },
  { id: 'UI2', label: '학생관리', path: '/students', icon: '👥' },
  { id: 'UI3', label: '수업관리', path: '/classes', icon: '📅' },
  { id: 'UI4', label: '결제관리', path: '/payments', icon: '💳' },
  { id: 'UI5', label: '보고서', path: '/reports', icon: '📈' },
];

// ============================================
// 컴포넌트 정의
// ============================================

export default function ProcessMapV9() {
  const [selectedItem, setSelectedItem] = useState(null);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: COLORS.bg.primary,
      padding: SPACING.lg,
    },
    header: {
      textAlign: 'center',
      marginBottom: SPACING.xl,
    },
    title: {
      fontSize: FONT_SIZE['3xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: COLORS.text.primary,
      marginBottom: SPACING.xs,
    },
    subtitle: {
      fontSize: FONT_SIZE.lg,
      color: COLORS.text.secondary,
    },
    worldMap: {
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.md,
      maxWidth: '1400px',
      margin: '0 auto',
    },
    layer: {
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      border: `2px solid ${COLORS.border}`,
    },
    layerHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    layerTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    layerBadge: {
      fontSize: FONT_SIZE.xs,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.accent,
      color: 'white',
    },
    arrow: {
      display: 'flex',
      justifyContent: 'center',
      padding: SPACING.sm,
    },
    grid: {
      display: 'grid',
      gap: SPACING.sm,
    },
    card: {
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.bg.primary,
      border: `1px solid ${COLORS.border}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    ruleBox: {
      marginTop: SPACING.xl,
      padding: SPACING.lg,
      backgroundColor: '#FEF3C7',
      borderRadius: RADIUS.lg,
      border: '2px dashed #F59E0B',
    },
    ruleTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: '#B45309',
      marginBottom: SPACING.md,
    },
    ruleList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    ruleItem: {
      padding: SPACING.sm,
      marginBottom: SPACING.xs,
      backgroundColor: 'white',
      borderRadius: RADIUS.sm,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
    },
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <h1 style={styles.title}>🌍 AUTUS Master World Map v1</h1>
        <p style={styles.subtitle}>시스템 = 계약 | 최상위 아키텍처 다이어그램</p>
      </header>

      <div style={styles.worldMap}>
        {/* ===== 상단: Consumer Outcome Layer ===== */}
        <div style={{
          ...styles.layer,
          backgroundColor: '#ECFDF5',
          borderColor: '#10B981',
        }}>
          <div style={styles.layerHeader}>
            <div style={styles.layerTitle}>
              <span>🎯</span>
              <span>Consumer Outcome Layer</span>
            </div>
            <span style={{...styles.layerBadge, backgroundColor: '#10B981'}}>
              최상위
            </span>
          </div>

          <div style={{...styles.grid, gridTemplateColumns: 'repeat(5, 1fr)'}}>
            {CONSUMER_OUTCOMES.map(outcome => (
              <div
                key={outcome.id}
                style={{
                  ...styles.card,
                  textAlign: 'center',
                  backgroundColor: selectedItem?.id === outcome.id ? '#D1FAE5' : 'white',
                }}
                onClick={() => setSelectedItem(outcome)}
              >
                <div style={{fontSize: '32px', marginBottom: SPACING.xs}}>
                  {outcome.emoji}
                </div>
                <div style={{
                  fontSize: FONT_SIZE.sm,
                  fontWeight: FONT_WEIGHT.semibold,
                }}>
                  {outcome.label}
                </div>
                <div style={{
                  fontSize: FONT_SIZE.xs,
                  color: COLORS.text.tertiary,
                  marginTop: SPACING.xs,
                }}>
                  {outcome.id}
                </div>
              </div>
            ))}
          </div>

          {/* Outcome Fact Ledger */}
          <div style={{
            marginTop: SPACING.lg,
            padding: SPACING.md,
            backgroundColor: '#F0FDF4',
            borderRadius: RADIUS.md,
            border: '1px dashed #10B981',
          }}>
            <div style={{
              fontSize: FONT_SIZE.sm,
              fontWeight: FONT_WEIGHT.semibold,
              marginBottom: SPACING.sm,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
            }}>
              📒 Outcome Fact Ledger <span style={{color: '#059669'}}>(append-only)</span>
            </div>
            <div style={{display: 'flex', gap: SPACING.sm, flexWrap: 'wrap'}}>
              {OUTCOME_FACT_TYPES.map(fact => (
                <div
                  key={fact.id}
                  style={{
                    padding: `${SPACING.xs} ${SPACING.sm}`,
                    backgroundColor: 'white',
                    borderRadius: RADIUS.sm,
                    fontSize: FONT_SIZE.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <span>{fact.icon}</span>
                  <span>{fact.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 화살표: Outcome → Force (측면 영향) */}
        <div style={styles.arrow}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.md,
            color: COLORS.text.tertiary,
            fontSize: FONT_SIZE.sm,
          }}>
            <span>←</span>
            <span>Force가 Outcome에 영향 (측면)</span>
            <span>→</span>
          </div>
        </div>

        {/* ===== 중단: 11 Force Interaction Layer ===== */}
        <div style={{
          ...styles.layer,
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
        }}>
          <div style={styles.layerHeader}>
            <div style={styles.layerTitle}>
              <span>⚡</span>
              <span>11 Force Interaction Layer</span>
            </div>
            <span style={{...styles.layerBadge, backgroundColor: '#F59E0B'}}>
              영향력
            </span>
          </div>

          <div style={{display: 'flex', gap: SPACING.lg}}>
            {/* Internal Forces */}
            <div style={{flex: 1}}>
              <div style={{
                fontSize: FONT_SIZE.xs,
                color: '#1E40AF',
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
              }}>
                🔵 내부 힘 (Internal)
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
                {FORCES.filter(f => f.type === 'internal').map(force => (
                  <div
                    key={force.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      borderLeft: `3px solid ${force.color}`,
                    }}
                  >
                    <span style={{
                      fontSize: FONT_SIZE.xs,
                      color: force.color,
                      fontWeight: FONT_WEIGHT.bold,
                    }}>{force.id}</span>
                    <span style={{fontSize: FONT_SIZE.sm}}>{force.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* External Forces */}
            <div style={{flex: 1}}>
              <div style={{
                fontSize: FONT_SIZE.xs,
                color: '#B45309',
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
              }}>
                🟠 외부 힘 (External)
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
                {FORCES.filter(f => f.type === 'external').map(force => (
                  <div
                    key={force.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      borderLeft: `3px solid ${force.color}`,
                    }}
                  >
                    <span style={{
                      fontSize: FONT_SIZE.xs,
                      color: force.color,
                      fontWeight: FONT_WEIGHT.bold,
                    }}>{force.id}</span>
                    <span style={{fontSize: FONT_SIZE.sm}}>{force.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditional Forces */}
            <div style={{flex: 1}}>
              <div style={{
                fontSize: FONT_SIZE.xs,
                color: '#6D28D9',
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
              }}>
                🟣 조건 힘 (Conditional)
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
                {FORCES.filter(f => f.type === 'condition').map(force => (
                  <div
                    key={force.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      borderLeft: `3px solid ${force.color}`,
                    }}
                  >
                    <span style={{
                      fontSize: FONT_SIZE.xs,
                      color: force.color,
                      fontWeight: FONT_WEIGHT.bold,
                    }}>{force.id}</span>
                    <span style={{fontSize: FONT_SIZE.sm}}>{force.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 화살표: OutcomeFact → 하단 트리거 */}
        <div style={styles.arrow}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: SPACING.xs,
          }}>
            <div style={{fontSize: '28px'}}>⬇️</div>
            <div style={{
              padding: `${SPACING.xs} ${SPACING.md}`,
              backgroundColor: '#10B981',
              color: 'white',
              borderRadius: RADIUS.full,
              fontSize: FONT_SIZE.sm,
              fontWeight: FONT_WEIGHT.semibold,
            }}>
              OutcomeFact만 트리거 가능
            </div>
          </div>
        </div>

        {/* ===== 하단: Contract State Machine + Process Synthesis + Brand UI ===== */}
        <div style={{
          ...styles.layer,
          backgroundColor: '#EFF6FF',
          borderColor: '#3B82F6',
        }}>
          <div style={styles.layerHeader}>
            <div style={styles.layerTitle}>
              <span>⚙️</span>
              <span>Contract Execution Layer</span>
            </div>
            <span style={{...styles.layerBadge, backgroundColor: '#3B82F6'}}>
              실행
            </span>
          </div>

          <div style={{display: 'flex', gap: SPACING.lg}}>
            {/* Contract State Machine */}
            <div style={{flex: 2}}>
              <div style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
                color: '#1E40AF',
              }}>
                🔄 Contract State Machine (S0-S9)
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: SPACING.xs,
              }}>
                {CONTRACT_STATES.map((state, idx) => (
                  <div
                    key={state.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      textAlign: 'center',
                      backgroundColor: idx === 4 ? '#DBEAFE' : 'white',
                      border: idx === 4 ? '2px solid #3B82F6' : `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{
                      fontSize: FONT_SIZE.xs,
                      color: '#3B82F6',
                      fontWeight: FONT_WEIGHT.bold,
                    }}>
                      {state.id}
                    </div>
                    <div style={{
                      fontSize: FONT_SIZE.sm,
                      fontWeight: FONT_WEIGHT.semibold,
                    }}>
                      {state.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* 상태 전이 규칙 요약 */}
              <div style={{
                marginTop: SPACING.md,
                padding: SPACING.sm,
                backgroundColor: '#F0F9FF',
                borderRadius: RADIUS.sm,
                fontSize: FONT_SIZE.xs,
                color: COLORS.text.secondary,
              }}>
                💡 C1: 허용된 전이만 UI에 표시 | C3: 게이트 승인 필수 | C4: 되돌림 비용 명시
              </div>
            </div>

            {/* Process Synthesis Engine */}
            <div style={{flex: 1}}>
              <div style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
                color: '#7C3AED',
              }}>
                🧬 Process Synthesis
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
                {PROCESS_SYNTHESIS.map(ps => (
                  <div
                    key={ps.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      fontSize: FONT_SIZE.xs,
                    }}
                  >
                    <div style={{color: '#059669', fontWeight: FONT_WEIGHT.semibold}}>
                      {ps.trigger} →
                    </div>
                    <div>{ps.output}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand UI Execution */}
            <div style={{flex: 1}}>
              <div style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: FONT_WEIGHT.semibold,
                marginBottom: SPACING.sm,
                color: '#DC2626',
              }}>
                🏀 AllThatBasket UI
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
                {BRAND_UI_SCREENS.map(screen => (
                  <div
                    key={screen.id}
                    style={{
                      ...styles.card,
                      padding: SPACING.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                    }}
                  >
                    <span>{screen.icon}</span>
                    <span style={{fontSize: FONT_SIZE.sm}}>{screen.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== 규칙 박스 ===== */}
        <div style={styles.ruleBox}>
          <div style={styles.ruleTitle}>📜 World Map 불변 규칙</div>
          <ul style={styles.ruleList}>
            <li style={styles.ruleItem}>
              <span style={{fontSize: '20px'}}>⬇️</span>
              <strong>Rule 1:</strong> 화살표는 아래 방향만 허용 (Downward Only)
            </li>
            <li style={styles.ruleItem}>
              <span style={{fontSize: '20px'}}>📒</span>
              <strong>Rule 2:</strong> OutcomeFact만이 상태 전이와 프로세스 합성을 트리거할 수 있음
            </li>
            <li style={styles.ruleItem}>
              <span style={{fontSize: '20px'}}>⚡</span>
              <strong>Rule 3:</strong> Force는 Outcome에만 영향 (측면 화살표), 프로세스에 직접 연결 불가
            </li>
            <li style={styles.ruleItem}>
              <span style={{fontSize: '20px'}}>🔒</span>
              <strong>Rule 4:</strong> Contract State Machine의 C1-C6 규칙 자동 적용
            </li>
            <li style={styles.ruleItem}>
              <span style={{fontSize: '20px'}}>📝</span>
              <strong>Rule 5:</strong> 모든 Fact는 append-only (수정/삭제 불가)
            </li>
          </ul>
        </div>

        {/* ===== 범례 ===== */}
        <div style={{
          marginTop: SPACING.lg,
          padding: SPACING.lg,
          backgroundColor: COLORS.bg.secondary,
          borderRadius: RADIUS.lg,
          display: 'flex',
          justifyContent: 'space-around',
        }}>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.md,
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              margin: '0 auto',
              marginBottom: SPACING.xs,
            }} />
            <div style={{fontSize: FONT_SIZE.xs}}>Outcome Layer</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.md,
              backgroundColor: '#FEF3C7',
              border: '2px solid #F59E0B',
              margin: '0 auto',
              marginBottom: SPACING.xs,
            }} />
            <div style={{fontSize: FONT_SIZE.xs}}>Force Layer</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.md,
              backgroundColor: '#EFF6FF',
              border: '2px solid #3B82F6',
              margin: '0 auto',
              marginBottom: SPACING.xs,
            }} />
            <div style={{fontSize: FONT_SIZE.xs}}>Execution Layer</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: 40,
              height: 6,
              backgroundColor: '#10B981',
              margin: '17px auto 21px',
            }} />
            <div style={{fontSize: FONT_SIZE.xs}}>Downward Flow</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: 40,
              height: 0,
              margin: '17px auto 21px',
              borderTop: '2px dashed #F59E0B',
            }} />
            <div style={{fontSize: FONT_SIZE.xs}}>Side Influence</div>
          </div>
        </div>
      </div>
    </div>
  );
}
