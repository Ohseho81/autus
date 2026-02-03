import React, { useState } from 'react';

/**
 * ProcessMapV7 - 비가역 노드 투입 타임테이블
 *
 * Lv.1 → Lv.3 달성을 위한 단계별 로드맵
 * 각 단계에서 AUTUS가 투입해야 할 비가역 노드와 마일스톤 정의
 */

const PHASES = [
  {
    id: 'phase0',
    phase: 0,
    name: '현재',
    nameEn: 'NOW',
    period: '현재',
    level: 1.0,
    levelName: 'Lv.1 도구',
    color: '#6b7280',
    status: 'current',
    description: '내부관리 + 통제관리만',
    autusInvestment: [],
    ownerBenefit: '기본 운영 편의',
    milestone: '올댓바스켓 시스템 운영 중',
    risk: '대체 가능 - 언제든 다른 솔루션으로 교체 가능',
    lockIn: '0%',
  },
  {
    id: 'phase1',
    phase: 1,
    name: '자동화 강화',
    nameEn: 'AUTOMATION',
    period: '0-3개월',
    level: 1.5,
    levelName: 'Lv.1.5',
    color: '#8b5cf6',
    status: 'next',
    description: '24/7 자동 운영 체계 구축',
    autusInvestment: [
      { node: '시간', detail: 'AI 자동화 개발 투자 (100시간+)', icon: '⏰' },
      { node: '서버비용', detail: '24/7 운영 인프라', icon: '💻' },
    ],
    ownerBenefit: '원장 시간 30% 회수, 야간/주말 자동 응대',
    milestone: '학부모 문의 자동 응답, 출결 자동 알림',
    risk: 'AUTUS 개발 비용 선투입',
    lockIn: '20%',
    deliverables: [
      '카카오톡 자동 응답 봇',
      '출결 자동 알림 시스템',
      '수강료 자동 청구/리마인드',
    ],
  },
  {
    id: 'phase2',
    phase: 2,
    name: '학부모 접점',
    nameEn: 'PARENT TOUCH',
    period: '3-6개월',
    level: 2.0,
    levelName: 'Lv.2 인프라',
    color: '#3b82f6',
    status: 'future',
    description: '학부모 앱/포털 제공',
    autusInvestment: [
      { node: '시간', detail: '학부모 앱 개발 (200시간+)', icon: '⏰' },
      { node: '데이터', detail: '학생 성장 데이터 축적/분석', icon: '📊' },
    ],
    ownerBenefit: '학부모 만족도 ↑, 재등록률 ↑',
    milestone: '학부모 전용 앱 출시, 성장 리포트 자동화',
    risk: 'AUTUS 데이터 책임 시작',
    lockIn: '40%',
    deliverables: [
      '학부모 전용 앱 (iOS/Android)',
      '월간 성장 리포트 자동 생성',
      '실시간 수업 피드백',
      '결제 내역 조회',
    ],
  },
  {
    id: 'phase3',
    phase: 3,
    name: '브랜드 공유',
    nameEn: 'BRAND SHARE',
    period: '6-12개월',
    level: 2.5,
    levelName: 'Lv.2.5',
    color: '#f59e0b',
    status: 'future',
    description: '"올댓바스켓 인증" 브랜드 론칭',
    autusInvestment: [
      { node: '신용/브랜드', detail: '올댓바스켓 인증 마크 부여', icon: '⭐' },
      { node: '마케팅 비용', detail: '공동 마케팅 투자', icon: '📢' },
    ],
    ownerBenefit: '브랜드 신뢰도 상승, 신규 학생 유입',
    milestone: '올댓바스켓 인증 학원 1호점',
    risk: 'AUTUS 브랜드 리스크 공유 시작',
    lockIn: '60%',
    deliverables: [
      '올댓바스켓 인증 마크',
      '공동 마케팅 캠페인',
      '인증 학원 네트워크 구축',
      '학부모 리뷰/평점 시스템',
    ],
  },
  {
    id: 'phase4',
    phase: 4,
    name: '운명 공동체',
    nameEn: 'PARTNERSHIP',
    period: '12-18개월',
    level: 3.0,
    levelName: 'Lv.3 파트너',
    color: '#22c55e',
    status: 'future',
    description: '수익 공유 + 책임 분담',
    autusInvestment: [
      { node: '법적책임', detail: '데이터/시스템 사고 책임 분담', icon: '⚖️' },
      { node: '수익', detail: '성과 기반 수익 공유 (Revenue Share)', icon: '💰' },
    ],
    ownerBenefit: '리스크 분산, 성장 파트너',
    milestone: '수익 공유 계약 체결, 공동 성장',
    risk: 'AUTUS 사업 리스크 본격화',
    lockIn: '90%',
    deliverables: [
      '수익 공유 계약',
      '책임 분담 협약',
      '공동 사업 계획',
      '전용 CS 지원',
    ],
  },
];

const NODE_ICONS = {
  '시간': '⏰',
  '서버비용': '💻',
  '데이터': '📊',
  '신용/브랜드': '⭐',
  '마케팅 비용': '📢',
  '법적책임': '⚖️',
  '수익': '💰',
};

const ProcessMapV7 = () => {
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [viewMode, setViewMode] = useState('timeline'); // timeline | detail

  const currentPhase = PHASES.find(p => p.phase === selectedPhase);

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
            onClick={() => window.location.hash = '#processv6'}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← 진화맵
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            📅 비가역 노드 투입 타임테이블
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('timeline')}
            style={{
              background: viewMode === 'timeline' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            타임라인
          </button>
          <button
            onClick={() => setViewMode('detail')}
            style={{
              background: viewMode === 'detail' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            상세보기
          </button>
        </div>
      </div>

      {/* Core Message */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '16px', color: '#93c5fd' }}>
          🎯 목표: <strong style={{ color: '#3b82f6' }}>18개월 내 Lv.3 파트너</strong> 달성
          {' | '}AUTUS가 먼저 투입해야 원장이 따라온다
        </p>
      </div>

      {viewMode === 'timeline' ? (
        <>
          {/* Timeline View */}
          <div style={{
            position: 'relative',
            padding: '40px 0',
          }}>
            {/* Timeline Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              right: '5%',
              height: '4px',
              background: 'rgba(255,255,255,0.1)',
              transform: 'translateY(-50%)',
              borderRadius: '2px',
            }}>
              {/* Progress */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(selectedPhase / 4) * 100}%`,
                background: 'linear-gradient(90deg, #6b7280, #22c55e)',
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Phase Nodes */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              padding: '0 5%',
            }}>
              {PHASES.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase.phase)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Node Circle */}
                  <div style={{
                    width: selectedPhase === phase.phase ? '64px' : '48px',
                    height: selectedPhase === phase.phase ? '64px' : '48px',
                    borderRadius: '50%',
                    background: phase.status === 'current'
                      ? phase.color
                      : selectedPhase >= phase.phase
                        ? phase.color
                        : 'rgba(255,255,255,0.1)',
                    border: selectedPhase === phase.phase
                      ? `4px solid ${phase.color}`
                      : '2px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: selectedPhase === phase.phase ? '24px' : '18px',
                    fontWeight: 'bold',
                    color: '#fff',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedPhase === phase.phase
                      ? `0 0 20px ${phase.color}50`
                      : 'none',
                  }}>
                    {phase.phase === 0 ? '📍' : phase.phase}
                  </div>

                  {/* Period Label (Top) */}
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    fontSize: '11px',
                    color: phase.color,
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {phase.period}
                  </div>

                  {/* Phase Name (Bottom) */}
                  <div style={{
                    marginTop: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: selectedPhase === phase.phase ? '#fff' : '#94a3b8',
                    }}>
                      {phase.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: phase.color,
                      marginTop: '2px',
                    }}>
                      {phase.levelName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Phase Detail */}
          {currentPhase && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `2px solid ${currentPhase.color}`,
              borderRadius: '16px',
              padding: '24px',
              marginTop: '32px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
              }}>
                {/* Left: Phase Info */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: currentPhase.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                    }}>
                      {currentPhase.phase === 0 ? '📍' : currentPhase.phase}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: currentPhase.color }}>{currentPhase.period}</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{currentPhase.name}</div>
                      <div style={{ fontSize: '14px', color: '#94a3b8' }}>{currentPhase.description}</div>
                    </div>
                  </div>

                  {/* AUTUS Investment */}
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: '#22c55e', marginBottom: '12px', fontWeight: '600' }}>
                      🎯 AUTUS 투입 노드
                    </div>
                    {currentPhase.autusInvestment.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {currentPhase.autusInvestment.map((inv, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                          }}>
                            <span style={{ fontSize: '20px' }}>{inv.icon}</span>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px' }}>{inv.node}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{inv.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '14px' }}>
                        현재 투입 노드 없음 (도구 상태)
                      </div>
                    )}
                  </div>

                  {/* Owner Benefit */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '8px', fontWeight: '600' }}>
                      👔 원장 혜택
                    </div>
                    <div style={{ fontSize: '14px' }}>{currentPhase.ownerBenefit}</div>
                  </div>
                </div>

                {/* Right: Milestone & Lock-in */}
                <div>
                  {/* Milestone */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>🏁 마일스톤</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: currentPhase.color }}>
                      {currentPhase.milestone}
                    </div>
                  </div>

                  {/* Deliverables */}
                  {currentPhase.deliverables && (
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>📦 산출물</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentPhase.deliverables.map((item, idx) => (
                          <div key={idx} style={{
                            fontSize: '13px',
                            padding: '6px 10px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '6px',
                          }}>
                            ✓ {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lock-in Meter */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>🔒 Lock-in 수준</span>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: currentPhase.color,
                      }}>
                        {currentPhase.lockIn}
                      </span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: currentPhase.lockIn,
                        background: `linear-gradient(90deg, ${currentPhase.color}, ${currentPhase.color}80)`,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Risk */}
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px', fontWeight: '600' }}>
                      ⚠️ AUTUS 리스크
                    </div>
                    <div style={{ fontSize: '14px', color: '#fca5a5' }}>{currentPhase.risk}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Detail View - All Phases Table */
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>단계</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>기간</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>AUTUS 투입</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>원장 혜택</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>Lock-in</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase, idx) => (
                <tr
                  key={phase.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: selectedPhase === phase.phase ? `${phase.color}10` : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedPhase(phase.phase)}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: phase.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}>
                        {phase.phase === 0 ? '📍' : phase.phase}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{phase.name}</div>
                        <div style={{ fontSize: '11px', color: phase.color }}>{phase.levelName}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#94a3b8' }}>
                    {phase.period}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {phase.autusInvestment.length > 0 ? (
                        phase.autusInvestment.map((inv, i) => (
                          <span key={i} style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}>
                            {inv.icon} {inv.node}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>-</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#e2e8f0' }}>
                    {phase.ownerBenefit}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      background: `${phase.color}30`,
                      color: phase.color,
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}>
                      {phase.lockIn}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginTop: '32px',
      }}>
        <div style={{
          background: 'rgba(107, 114, 128, 0.2)',
          border: '1px solid #6b7280',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>현재</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6b7280' }}>Lv.1 도구</div>
        </div>
        <div style={{
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid #3b82f6',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏰</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>6개월 후</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>Lv.2 인프라</div>
        </div>
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>12개월 후</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>Lv.2.5 브랜드</div>
        </div>
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid #22c55e',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤝</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>18개월 후</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e' }}>Lv.3 파트너</div>
        </div>
      </div>

      {/* Key Insight */}
      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '16px' }}>
          💡 <strong style={{ color: '#22c55e' }}>핵심</strong>: AUTUS가 <strong>먼저</strong> 비가역 노드를 투입해야
          원장의 Lock-in이 발생한다.
          <br />
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
            "줄 것을 먼저 줘야, 받을 것을 받는다"
          </span>
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
          onClick={() => window.location.hash = '#processv5'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          고객 맵 (V5)
        </button>
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
      </div>
    </div>
  );
};

export default ProcessMapV7;
